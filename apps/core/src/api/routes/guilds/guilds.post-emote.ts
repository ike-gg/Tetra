import { z } from "zod";

import { MAX_SUPPORTED_SIZE } from "@/constants";
import { ResourceTooLargeError } from "@/constants/errors";
import { optimizeBuffer } from "@/lib/buffer/optimize-buffer";
import { discordRestApi } from "@/lib/discord-rest-api";
import { assertAllowedEmoteSourceUrl, UrlNotAllowedError } from "@/lib/network/url-guard";
import { getEmoteUrl } from "@/utils/discord/get-emote-url";

import getBufferFromUrl from "../../../emotes/source/get-buffer-from-url";
import { authFactory } from "../../api-env";
import { EMOTE_NAME_REGEX } from "../../constants/api-constants";
import { requireAuth } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";
import { getManageableGuild, guildParamsSchema } from "./guilds.shared";

const bodyPostEmote = z.object({
  name: z.string().regex(EMOTE_NAME_REGEX),
  file: z.string().url(),
  fitting: z.enum(["fill", "cover", "contain"]).optional(),
});

export const guildsPostEmote = authFactory.createHandlers(
  requireAuth,
  validate("param", guildParamsSchema),
  validate("json", bodyPostEmote),
  async (c) => {
    const { guildId } = c.req.valid("param");
    const { file, name, fitting } = c.req.valid("json");

    const guild = await getManageableGuild(guildId, c.var);

    let emoteBuffer: Buffer;

    try {
      await assertAllowedEmoteSourceUrl(file);
      emoteBuffer = await getBufferFromUrl(file, { maxBufferSize: MAX_SUPPORTED_SIZE });
    } catch (error) {
      if (error instanceof UrlNotAllowedError) {
        throw new TetraAPIError(400, error.message, "URL_NOT_ALLOWED");
      }
      if (error instanceof ResourceTooLargeError) throw error;
      throw new TetraAPIError(
        400,
        "Failed to download data of the provided emote",
        "DOWNLOAD_DATA_FAILED"
      );
    }

    const { buffer: optimizedBuffer, metadata } = await optimizeBuffer(emoteBuffer, {
      fitting,
    });

    const createdEmote = await discordRestApi.guilds.createEmoji(guildId, {
      image: `data:image/${metadata.format};base64,${optimizedBuffer.toString("base64")}`,
      name,
    });

    return c.json(
      {
        message: `Emote ${createdEmote.name} created in ${guild.name}!`,
        preview: getEmoteUrl(createdEmote),
      },
      200
    );
  }
);
