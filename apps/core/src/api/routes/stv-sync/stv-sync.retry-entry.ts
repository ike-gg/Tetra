import { addSyncedEmote } from "@/stv-sync/add-synced-emote";
import { runForGuild } from "@/stv-sync/job-queue";
import { getQueueEntry, removeQueueEntryForEmote, toSyncSource } from "@/stv-sync/queue";
import { readStoredSettings } from "@/stv-sync/settings";
import { getEmoteUrl } from "@/utils/discord/get-emote-url";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild } from "../guilds/guilds.shared";
import {
  queueEntryParamsSchema,
  requireQueueEntry,
  requireSyncConfig,
  serializeQueueEntry,
} from "./stv-sync.shared";

/**
 * Runs the add flow again for a queued emote, without the filters (the admin chose it).
 * Answers 200 either way: `added`, or `queued` with the entry's new reason.
 */
export const stvSyncRetryEntry = authFactory.createHandlers(
  requireAuth,
  validate("param", queueEntryParamsSchema),
  async (c) => {
    const { guildId, entryId } = c.req.valid("param");

    await getManageableGuild(guildId, c.var);
    const config = await requireSyncConfig(guildId);
    const entry = await requireQueueEntry(guildId, entryId);
    const settings = readStoredSettings(config.settings);

    const outcome = await runForGuild(guildId, () =>
      addSyncedEmote(guildId, toSyncSource(entry), settings)
    );

    if (outcome.status === "added") {
      const { emoji } = outcome;
      return c.json(
        {
          result: "added" as const,
          emote: {
            id: emoji.id,
            name: emoji.name,
            animated: emoji.animated,
            preview: getEmoteUrl({ id: emoji.id, isAnimated: emoji.animated }),
          },
        },
        200
      );
    }

    if (outcome.status === "skipped") {
      // Already synced (e.g. added again by an event): the entry is stale
      await removeQueueEntryForEmote(guildId, entry.stvEmoteId);
      return c.json({ result: "already_synced" as const }, 200);
    }

    const updated = (await getQueueEntry(guildId, entryId)) ?? entry;
    return c.json(
      { result: "queued" as const, entry: serializeQueueEntry(updated, settings) },
      200
    );
  }
);
