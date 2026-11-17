import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { stvSyncLinks } from "@/db/schema";
import { discordRestApi } from "@/lib/discord-rest-api";
import { linkSyncedEmoji } from "@/stv-sync/add-synced-emote";
import { runForGuild } from "@/stv-sync/job-queue";
import { getEmoteUrl } from "@/utils/discord/get-emote-url";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";
import {
  assertReadyEmoteFits,
  getManageableGuild,
  readyEmoteBodySchema,
} from "../guilds/guilds.shared";
import { queueEntryParamsSchema, requireQueueEntry } from "./stv-sync.shared";

import { StvSyncConsole } from "#/loggers";

/**
 * Adds a queued emote from a file the browser editor fitted (same body as
 * `POST /guilds/:guildId/emote/upload`), links it to the 7TV emote and drops the entry.
 */
export const stvSyncUploadEntry = authFactory.createHandlers(
  requireAuth,
  validate("param", queueEntryParamsSchema),
  validate("json", readyEmoteBodySchema),
  async (c) => {
    const { guildId, entryId } = c.req.valid("param");
    const { emote, name } = c.req.valid("json");

    assertReadyEmoteFits(emote);
    await getManageableGuild(guildId, c.var);
    const entry = await requireQueueEntry(guildId, entryId);

    const created = await runForGuild(guildId, async () => {
      const linked = await db.query.stvSyncLinks.findFirst({
        where: and(
          eq(stvSyncLinks.guildId, guildId),
          eq(stvSyncLinks.stvEmoteId, entry.stvEmoteId)
        ),
      });
      if (linked) {
        throw new TetraAPIError(
          409,
          "this emote is already synced to the server",
          "EMOTE_ALREADY_SYNCED"
        );
      }

      // Discord's errors (size, slots, permissions, name, file) are mapped in the error handler
      const emoji = await discordRestApi.guilds.createEmoji(guildId, {
        image: emote,
        name,
      });
      await linkSyncedEmoji(guildId, entry.stvEmoteId, {
        id: emoji.id ?? "",
        name: emoji.name ?? name,
        animated: emoji.animated ?? false,
      });
      return emoji;
    });

    StvSyncConsole.success(
      `[guild ${guildId}] ${entry.name} (${entry.stvEmoteId}) added from the editor as ${created.id}`
    );

    return c.json(
      {
        message: `added ${created.name}`,
        preview: getEmoteUrl(created),
        emote: { id: created.id, name: created.name },
      },
      200
    );
  }
);
