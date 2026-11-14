import { discordRestApi } from "@/lib/discord-rest-api";

import { basicGuildParsePremium } from "../../../utils/discord/guild-parse-premium";
import { userFactory } from "../../api-env";
import { requireUser } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";
import { guildParamsSchema } from "./guilds.shared";

export const guildsGetGuild = userFactory.createHandlers(
  requireUser,
  validate("param", guildParamsSchema),
  async (c) => {
    const { guildId } = c.req.valid("param");

    const [guildResult, memberResult, emotesResult] = await Promise.allSettled([
      discordRestApi.guilds.get(guildId),
      discordRestApi.guilds.getMember(guildId, c.get("user").id),
      discordRestApi.guilds.getEmojis(guildId),
    ]);

    if (guildResult.status === "rejected") {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_BOT"
      );
    }

    if (memberResult.status === "rejected") {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_MEMBER"
      );
    }

    if (emotesResult.status === "rejected") {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_EMOTES"
      );
    }

    const guild = guildResult.value;
    const emotes = emotesResult.value;

    const { emoteLimit, level } = basicGuildParsePremium(guild);

    // Managed emojis (e.g. Twitch integration) do not take slots
    const slotEmotes = emotes.filter((e) => !e.managed);
    const emoteAnimated = slotEmotes.filter((e) => e.animated).length;
    const emoteStatic = slotEmotes.filter((e) => !e.animated).length;

    const stats = {
      animated: {
        used: emoteAnimated,
        limit: emoteLimit,
        free: Math.max(emoteLimit - emoteAnimated, 0),
      },
      static: {
        used: emoteStatic,
        limit: emoteLimit,
        free: Math.max(emoteLimit - emoteStatic, 0),
      },
    };

    const mappedEmotes = emotes.map(({ id, animated, name, managed, available }) => ({
      id,
      animated,
      name,
      guildId: guild.id,
      imageURL: `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`,
      managed,
      available,
    }));

    const { name, banner, icon, id } = guild;

    return c.json({ name, banner, icon, id, level, emotes: mappedEmotes, stats }, 200);
  }
);
