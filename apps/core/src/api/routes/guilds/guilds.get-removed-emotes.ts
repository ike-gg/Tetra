import { and, desc, eq } from "drizzle-orm";

import { RETENTION, retentionExpiresAt } from "@/constants/retention";

import { db } from "../../../db";
import { removedEmotes } from "../../../db/schema";
import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import {
  getManageableGuild,
  guildParamsSchema,
  notExpiredRemovedEmote,
} from "./guilds.shared";

export const guildsGetRemovedEmotes = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const guild = await getManageableGuild(guildId, c.var);

    // Same order and cap as the cleanup, so rows it will delete are never listed
    const removedEmotesInGuild = await db.query.removedEmotes.findMany({
      where: and(eq(removedEmotes.guildId, guild.id), notExpiredRemovedEmote()),
      with: { emote: true },
      orderBy: [desc(removedEmotes.removedAt), desc(removedEmotes.id)],
      limit: RETENTION.REMOVED_EMOTES_PER_GUILD,
    });

    const emotesToRestore = removedEmotesInGuild.flatMap(
      ({ emote, deletedWithPanel, id, removedAt }) =>
        emote
          ? [
              {
                emote,
                deletedWithPanel,
                id,
                removedAt,
                expiresAt: retentionExpiresAt(removedAt, RETENTION.REMOVED_EMOTE_MAX_AGE),
              },
            ]
          : []
    );

    return c.json(emotesToRestore, 200);
  }
);
