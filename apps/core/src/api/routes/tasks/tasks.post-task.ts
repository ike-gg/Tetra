import { type APIGuild, DiscordAPIError, PermissionsBitField } from "discord.js";
import type OAuth from "discord-oauth2";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { discordOauth } from "@/lib/discord-oauth";
import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord/get-emote-url";

import { EMOTE_NAME_REGEX } from "../../constants/api-constants";
import { TetraAPIError } from "../../tetra-api-error";
import { deleteUserTask, findUserTask, taskParamsSchema } from "./tasks.shared";

const DISCORD_ERROR_FILE_TOO_LARGE = 50138;

const bodyPostTask = z.object({
  emote: z
    .string()
    .regex(
      /^data:image\/(gif|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
      "Expected a base64 gif/png/webp data URL"
    ),
  name: z.string().regex(EMOTE_NAME_REGEX),
});

export const tasksPostTask = async (req: Request, res: Response, _: NextFunction) => {
  try {
    const { taskId } = taskParamsSchema.parse(req.params);
    const { emote, name } = bodyPostTask.parse(req.body);

    const task = await findUserTask(taskId, req.user!.id);

    const [guildPromise, guildsPromise] = await Promise.allSettled([
      discordRestApi.guilds.get(task.guildId),
      discordOauth.getUserGuilds(req.accessToken!),
    ]);

    if (guildPromise.status === "rejected") {
      throw new TetraAPIError(
        404,
        "Guild not found",
        "GUILD_NOT_FOUND_UNKNOWN_GUILD_BOT"
      );
    }

    if (guildsPromise.status === "rejected") {
      throw new TetraAPIError(404, "Guild not found", "OAUTH_GET_GUILDS_ERROR");
    }

    const guild: APIGuild = guildPromise.value;

    const guildMember = (guildsPromise.value as OAuth.PartialGuild[]).find(
      (g) => g.id === task.guildId
    );

    if (!guildMember) {
      throw new TetraAPIError(404, "Guild not found", "USER_NOT_IN_GUILD");
    }

    const userPermissions = new PermissionsBitField(BigInt(guildMember.permissions!));

    if (!userPermissions.has("ManageGuildExpressions")) {
      throw new TetraAPIError(403, "Missing permissions", "MISSING_PERMISSIONS");
    }

    const createdEmote = await discordRestApi.guilds.createEmoji(task.guildId, {
      image: emote,
      name,
    });

    await deleteUserTask(task.id, task.userId);

    res.json({
      message: `Emote ${createdEmote.name} created in ${guild.name}!`,
      preview: getEmoteUrl(createdEmote),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA");
    }
    if (error instanceof DiscordAPIError) {
      if (error.code === DISCORD_ERROR_FILE_TOO_LARGE) {
        throw new TetraAPIError(
          413,
          "Emote too large, reduce its size below 256 KB",
          "EMOTE_TOO_LARGE"
        );
      }
      throw new TetraAPIError(400, error.message, "DISCORD_API_ERROR");
    }
    throw error;
  }
};
