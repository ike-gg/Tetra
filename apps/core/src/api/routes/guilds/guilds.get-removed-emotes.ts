import { eq } from "drizzle-orm";

import { db } from "../../../db";
import { removedEmotes } from "../../../db/schema";
import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "./guilds.shared";

export const guildsGetRemovedEmotes = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const guild = await getManageableGuild(guildId, c.get("accessToken"));

    const removedEmotesInGuild = await db.query.removedEmotes.findMany({
      where: eq(removedEmotes.guildId, guild.id),
      with: { emote: true },
    });

    const emotesToRestore = removedEmotesInGuild.flatMap(
      ({ emote, deletedWithPanel, id }) =>
        emote ? [{ emote, deletedWithPanel, id }] : []
    );

    return c.json(emotesToRestore, 200);
  }
);
