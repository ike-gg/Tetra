import { NextFunction, Request, Response } from "express";
import { TetraAPIError } from "../../TetraAPIError";
import { client } from "../../..";
import { DiscordAPIError, Guild, GuildMember } from "discord.js";
import { z } from "zod";
import getBufferFromUrl from "../../../emotes/source/getBufferFromUrl";
import sharp from "sharp";
import { maxEmoteSize } from "../../../constants";
import { AutoXGifsicle } from "../../../utils/AutoXGifsicle";
import { ApiConsole } from "../../utils/api-console";

const getGuildParams = z.object({
  guildId: z.string(),
});

const bodyPostEmote = z.object({
  name: z.string(),
  file: z.string().url(),
  fitting: z.enum(["fill", "cover", "contain"]).optional(),
});

export const guildsPostEmote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { file, name, fitting } = bodyPostEmote.parse(req.body);
    const { guildId } = getGuildParams.parse(req.params);

    let guild: Guild;
    try {
      guild = await client.guilds.fetch(guildId);
    } catch {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_BOT"
      );
    }

    let member: GuildMember;
    try {
      member = await guild.members.fetch(req.user!.id);
    } catch {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_MEMBER"
      );
    }

    const hasPermissons = member.permissions.has("ManageGuildExpressions");

    if (!hasPermissons) {
      throw new TetraAPIError(403, "Missing permissions", "MISSING_PERMISSIONS");
    }

    let emoteBuffer: Buffer;

    try {
      emoteBuffer = await getBufferFromUrl(file);
    } catch {
      throw new TetraAPIError(
        400,
        "Failed to download data of the provided emote",
        "DOWNLOAD_DATA_FAILED"
      );
    }

    const sharpBuffer = await sharp(emoteBuffer);
    const { format } = await sharpBuffer.metadata();

    const extendedSize = emoteBuffer.length > maxEmoteSize;

    if (format === "gif") {
      const autoxgif = new AutoXGifsicle(emoteBuffer, {
        finalSize: maxEmoteSize,
        lossy: 80,
        skipReducingFrames: false,
      });

      if (fitting) {
        if (fitting === "fill") {
          await autoxgif.stretchToFit();
        } else if (fitting === "cover") {
          await autoxgif.centerCrop();
        }
      }

      extendedSize && (await autoxgif.optimize());
      emoteBuffer = await autoxgif.fileBuffer;
    } else {
      emoteBuffer = await sharpBuffer
        .resize({
          width: 128,
          height: 128,
          fit: fitting,
          background: {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0,
          },
        })
        .toBuffer();
    }

    const createdEmote = await guild.emojis.create({
      attachment: emoteBuffer,
      name,
    });

    res.json({ message: `Emote ${createdEmote.name} created in ${guild.name}!` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA");
    } else if (error instanceof DiscordAPIError) {
      throw new TetraAPIError(400, error.message, "DISCORD_API_ERROR");
    } else {
      throw error;
    }
  }
};
