import { z } from "zod";

import { MAX_EMOTE_SIZE } from "@/constants";
import { EmoteTooLargeError } from "@/constants/errors";
import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord/get-emote-url";

import { userFactory } from "../../api-env";
import { EMOTE_NAME_REGEX } from "../../constants/api-constants";
import { requireUser } from "../../middleware/auth";
import { validate } from "../../validate";
import { getManageableGuild } from "../guilds/guilds.shared";
import { deleteUserTask, findUserTask, taskParamsSchema } from "./tasks.shared";

const decodedBase64Size = (dataUrl: string) => {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

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

    // Fails early with the same code as Discord's own size errors (mapped by type)
    if (decodedBase64Size(emote) > MAX_EMOTE_SIZE) {
      throw new EmoteTooLargeError("The emote must be 256 KB or smaller.");
    }
    const guild = await getManageableGuild(task.guildId, c.var);

    // Discord's errors (size, slots, permissions) are mapped in the error handler
    const createdEmote = await discordRestApi.guilds.createEmoji(task.guildId, {
      image: emote,
      name,
    });

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
