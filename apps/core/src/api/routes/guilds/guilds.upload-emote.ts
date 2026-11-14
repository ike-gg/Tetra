import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord/get-emote-url";

import { authFactory } from "../../api-env";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../validate";
import {
  assertReadyEmoteFits,
  getManageableGuild,
  guildParamsSchema,
  readyEmoteBodySchema,
} from "./guilds.shared";

/** Uploads a file the browser editor already fitted for Discord, without re-optimizing. */
export const guildsUploadEmote = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  validate("json", readyEmoteBodySchema),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const { emote, name } = c.req.valid("json");

    assertReadyEmoteFits(emote);
    const guild = await getManageableGuild(guildId, c.var);

    // Discord's errors (size, slots, permissions, name, file) are mapped in the error handler
    const createdEmote = await discordRestApi.guilds.createEmoji(guildId, {
      image: emote,
      name,
    });

    return c.json(
      {
        message: `Emote ${createdEmote.name} created in ${guild.name}!`,
        preview: getEmoteUrl(createdEmote),
        emote: { id: createdEmote.id, name: createdEmote.name },
      },
      200
    );
  }
);
