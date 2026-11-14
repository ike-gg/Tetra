import { DiscordAPIError } from "discord.js";
import { z } from "zod";

import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord/get-emote-url";

import { userFactory } from "../../api-env";
import { EMOTE_NAME_REGEX } from "../../constants/api-constants";
import { requireUser } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";
import { getManageableGuild } from "../guilds/guilds.shared";
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

export const tasksPostTask = userFactory.createHandlers(
  requireUser,
  validate("param", taskParamsSchema),
  validate("json", bodyPostTask),
  async (c) => {
    const { taskId } = c.req.valid("param");
    const { emote, name } = c.req.valid("json");

    const task = await findUserTask(taskId, c.get("user").id);
    const guild = await getManageableGuild(task.guildId, c.get("accessToken"));

    let createdEmote: Awaited<ReturnType<typeof discordRestApi.guilds.createEmoji>>;

    try {
      createdEmote = await discordRestApi.guilds.createEmoji(task.guildId, {
        image: emote,
        name,
      });
    } catch (error) {
      if (
        error instanceof DiscordAPIError &&
        error.code === DISCORD_ERROR_FILE_TOO_LARGE
      ) {
        throw new TetraAPIError(
          413,
          "Emote too large, reduce its size below 256 KB",
          "EMOTE_TOO_LARGE"
        );
      }
      throw error;
    }

    await deleteUserTask(task.id, task.userId);

    return c.json(
      {
        message: `Emote ${createdEmote.name} created in ${guild.name}!`,
        preview: getEmoteUrl(createdEmote),
      },
      200
    );
  }
);
