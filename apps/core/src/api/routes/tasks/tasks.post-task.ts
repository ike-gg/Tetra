import { discordRestApi } from "@/lib/discord-rest-api";
import { getEmoteUrl } from "@/utils/discord/get-emote-url";

import { userFactory } from "../../api-env";
import { requireUser } from "../../middleware/auth";
import { validate } from "../../validate";
import {
  assertReadyEmoteFits,
  getManageableGuild,
  readyEmoteBodySchema,
} from "../guilds/guilds.shared";
import { deleteUserTask, findUserTask, taskParamsSchema } from "./tasks.shared";

export const tasksPostTask = userFactory.createHandlers(
  requireUser,
  validate("param", taskParamsSchema),
  validate("json", readyEmoteBodySchema),
  async (c) => {
    const { taskId } = c.req.valid("param");
    const { emote, name } = c.req.valid("json");

    const task = await findUserTask(taskId, c.get("user").id);

    assertReadyEmoteFits(emote);
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
