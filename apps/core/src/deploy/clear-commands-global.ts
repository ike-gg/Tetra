import { REST, Routes } from "discord.js";
import { z } from "zod";

import { env, isProduction } from "@/env";

import { DeployConsole } from "#/loggers";

/**
 * Removes every global command of the app in the current env (PUT of an empty list).
 * `--guild <id>` (repeatable) clears those guilds' commands instead. Refuses in
 * production unless `--force` is passed, so the prod bot isn't wiped by accident.
 */

const args = process.argv.slice(2);
const force = args.includes("--force");

const guildIds: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] !== "--guild") continue;
  const parsed = z
    .string()
    .regex(/^\d{17,20}$/)
    .safeParse(args[i + 1]);
  if (!parsed.success) {
    DeployConsole.error(`--guild needs a guild id, got: ${args[i + 1] ?? "nothing"}`);
    process.exit(1);
  }
  guildIds.push(parsed.data);
  i++;
}

if (isProduction && !force) {
  DeployConsole.error(
    "ENV is production, refusing to clear commands. Pass --force to do it anyway."
  );
  process.exit(1);
}

const commandListSchema = z.array(z.object({ name: z.string() }));

const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

const targets =
  guildIds.length > 0
    ? guildIds.map((guildId) => ({
        label: `guild ${guildId}`,
        route: Routes.applicationGuildCommands(env.DISCORD_BOT_ID, guildId),
      }))
    : [{ label: "global", route: Routes.applicationCommands(env.DISCORD_BOT_ID) }];

let failed = false;

for (const { label, route } of targets) {
  try {
    const commands = commandListSchema.parse(await rest.get(route));
    DeployConsole.info(
      `Found ${commands.length} ${label} commands:`,
      commands.map((command) => command.name).join(", ") || "none"
    );

    await rest.put(route, { body: [] });
    DeployConsole.success(`Cleared ${label} commands`);
  } catch (error) {
    failed = true;
    DeployConsole.error(`Error clearing ${label} commands:`, error);
  }
}

if (failed) process.exit(1);
