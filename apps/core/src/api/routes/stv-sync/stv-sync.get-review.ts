import { listReview } from "@/stv-sync/review";
import { readStoredSettings } from "@/stv-sync/settings";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "../guilds/guilds.shared";
import { getSyncConfig, serializeReviewEntry } from "./stv-sync.shared";

/** Emotes that need review (the sync didn't add them), newest first. */
export const stvSyncGetReview = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  async (c) => {
    const { guildId } = c.req.valid("param");
    await getManageableGuild(guildId, c.var);

    const [config, rows] = await Promise.all([
      getSyncConfig(guildId),
      listReview(guildId),
    ]);
    const settings = readStoredSettings(config?.settings);

    return c.json(
      { entries: rows.map((row) => serializeReviewEntry(row, settings)) },
      200
    );
  }
);
