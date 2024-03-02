import { ButtonInteraction } from "discord.js";
import { DiscordBot } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import editEmoteByUser from "../emotes/editEmoteByUser";
import { transparentBackground } from "transparent-background";

export default async function removebg(
  interaction: ButtonInteraction,
  client: DiscordBot,
  taskId: string
) {
  try {
    await interaction.deferUpdate();

    const taskDetails =
      client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

    const { feedback } = taskDetails;

    await feedback.removeComponents();
    await feedback.working();

    const { emote } = taskDetails;

    const editedEmote = await transparentBackground(emote.finalData, "png");

    client.tasks.updateTask<TaskTypes.PostProcessEmote>(taskId, {
      ...taskDetails,
      emote: {
        ...taskDetails.emote,
        finalData: editedEmote,
      },
    });

    editEmoteByUser(taskId);
  } catch (error) {
    throw new Error(String(error));
  }
}
