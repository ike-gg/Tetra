import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { REST, Routes } from "discord.js";
import { z } from "zod";

import { env } from "@/env";
import { FEEDBACK_EMOJIS } from "@/utils/discord/feedback-emojis";

import { DeployConsole } from "#/loggers";

/**
 * Uploads the feedback emotes (`assets/emotes/feedback/`) as application emojis of the app
 * in the current env (dev and prod are separate apps). Idempotent by name; `--force`
 * replaces emojis whose image differs from the local file.
 */

const ASSETS_DIR = path.resolve(import.meta.dir, "../../../../assets/emotes/feedback");
const force = process.argv.includes("--force");

const emojiListSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string(), animated: z.boolean() })),
});

const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);
const appId = env.DISCORD_BOT_ID;

const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

const { items } = emojiListSchema.parse(await rest.get(Routes.applicationEmojis(appId)));
const existing = new Map(items.map((emoji) => [emoji.name, emoji]));

let created = 0;
let replaced = 0;
let kept = 0;

for (const { name, file } of Object.values(FEEDBACK_EMOJIS)) {
  const filePath = path.join(ASSETS_DIR, file);
  if (!fs.existsSync(filePath)) {
    DeployConsole.warn(`${file} not found in ${ASSETS_DIR}, skipping ${name}`);
    continue;
  }

  const data = fs.readFileSync(filePath);
  const mime = file.endsWith(".gif") ? "image/gif" : "image/png";
  const current = existing.get(name);

  if (current) {
    if (!force) {
      kept++;
      continue;
    }

    const ext = current.animated ? "gif" : "png";
    const response = await fetch(
      `https://cdn.discordapp.com/emojis/${current.id}.${ext}`
    );
    const remote = response.ok ? new Uint8Array(await response.arrayBuffer()) : undefined;

    if (remote && sha256(remote) === sha256(data)) {
      kept++;
      continue;
    }

    await rest.delete(Routes.applicationEmoji(appId, current.id));
    replaced++;
  } else {
    created++;
  }

  await rest.post(Routes.applicationEmojis(appId), {
    body: { name, image: `data:${mime};base64,${data.toString("base64")}` },
  });
  DeployConsole.success(`${current ? "Replaced" : "Uploaded"} ${name}`);
}

DeployConsole.info(
  `Application emojis: ${created} uploaded, ${replaced} replaced, ${kept} unchanged`
);
