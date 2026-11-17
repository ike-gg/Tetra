import { listQueue } from "@/stv-sync/queue";
import { readStoredSettings } from "@/stv-sync/settings";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "../guilds/guilds.shared";
import { getSyncConfig, serializeQueueEntry } from "./stv-sync.shared";

/** Emotes the sync couldn't add, newest first. */
export const stvSyncGetQueue = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  async (c) => {
    const { guildId } = c.req.valid("param");
    await getManageableGuild(guildId, c.var);

    const [config, rows] = await Promise.all([
      getSyncConfig(guildId),
      listQueue(guildId),
    ]);
    const settings = readStoredSettings(config?.settings);

    return c.json(
      { entries: rows.map((row) => serializeQueueEntry(row, settings)) },
      200
    );
  }
);
