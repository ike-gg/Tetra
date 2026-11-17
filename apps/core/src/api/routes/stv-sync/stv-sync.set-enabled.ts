import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { stvSyncConfigs } from "@/db/schema";
import { stvSync } from "@/stv-sync/sync-service";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "../guilds/guilds.shared";
import { buildSyncState, requireSyncConfig } from "./stv-sync.shared";

import { StvSyncConsole } from "#/loggers";

const bodySetEnabled = z.object({ enabled: z.boolean() });

/** Pauses or resumes the sync. Links and the queue stay; paused time isn't caught up. */
export const stvSyncSetEnabled = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  validate("json", bodySetEnabled),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const { enabled } = c.req.valid("json");

    await getManageableGuild(guildId, c.var);
    await requireSyncConfig(guildId);

    await db
      .update(stvSyncConfigs)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(stvSyncConfigs.guildId, guildId));

    StvSyncConsole.info(`[guild ${guildId}] sync ${enabled ? "enabled" : "paused"}`);
    await stvSync.refresh();

    return c.json(await buildSyncState(guildId), 200);
  }
);
