import { ButtonInteraction } from "discord.js";

import editEmoteByUser from "../emotes/editEmoteByUser";
import emoteOptimise from "../emotes/emoteOptimise";
import { TetraClient } from "../types";
import * as TaskTypes from "../types/TaskTypes";

const transform = async (
  interaction: ButtonInteraction,
  client: TetraClient,
  taskId: string,
  transform: "square" | "center"
) => {
  try {
    await interaction.deferUpdate();

    const taskDetails = client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

    const { feedback } = taskDetails;

    await feedback.removeComponents();
    await feedback.working();

    const { emote } = taskDetails;

    const editedEmote = await emoteOptimise(emote.data, {
      animated: emote.animated,
      feedback,
      transform,
    });

    client.tasks.updateTask<TaskTypes.PostProcessEmote>(taskId, {
      ...taskDetails,
      emote: {
        ...taskDetails.emote,
        finalData: editedEmote,
        slices: undefined,
      },
    });

    editEmoteByUser(taskId);
  } catch (error) {
    throw new Error(String(error));
  }
};

export default transform;
