import { eq } from "drizzle-orm";

import { db } from "@/db";
import { stvSyncConfigs } from "@/db/schema";
import { syncSettingsSchema } from "@/stv-sync/settings";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "../guilds/guilds.shared";
import { buildSyncState, requireSyncConfig } from "./stv-sync.shared";

/** Replaces the sync settings (the full object). They apply to the next event. */
export const stvSyncUpdateSettings = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  validate("json", syncSettingsSchema),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const settings = c.req.valid("json");

    await getManageableGuild(guildId, c.var);
    await requireSyncConfig(guildId);

    await db
      .update(stvSyncConfigs)
      .set({ settings, updatedAt: new Date() })
      .where(eq(stvSyncConfigs.guildId, guildId));

    return c.json(await buildSyncState(guildId), 200);
  }
);
