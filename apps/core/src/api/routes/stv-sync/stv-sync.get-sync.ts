import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "../guilds/guilds.shared";
import { buildSyncState } from "./stv-sync.shared";

/** The guild's 7TV channel sync: linked channel, settings, counts, connection state. */
export const stvSyncGetSync = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  async (c) => {
    const { guildId } = c.req.valid("param");
    await getManageableGuild(guildId, c.var);
    return c.json(await buildSyncState(guildId), 200);
  }
);
