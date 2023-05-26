import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  CommandInteraction,
  SelectMenuInteraction,
} from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { Emote } from "../types";
import getBufferFromUrl from "./source/getBufferFromUrl";
import TaskManager from "../utils/managers/TaskManager";
import * as TaskTypes from "../types/TaskTypes";
import { maxEmoteSize } from "../constants";
import editEmoteByUser from "./editEmoteByUser";
import getChoiceOptimizeRow from "../utils/elements/getChoiceOptimizeRow";
import parseDiscordRegexName from "../utils/parseDiscordRegexName";

const prepareEmote = async (
  emote: Emote,
  details: {
    feedback: FeedbackManager;
    interaction:
      | ChatInputCommandInteraction
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction;
  }
) => {
  const { feedback, interaction } = details;
  const emoteBuffer = await getBufferFromUrl(emote.file.url);

  if (emoteBuffer.byteLength >= maxEmoteSize * 10) {
    await feedback.error(
      "Emote exceeded maximum size supported currently with custom files (2.5MB) by Tetra."
    );
    return;
  }

  const taskId = TaskManager.getInstance().addTask<TaskTypes.PostProcessEmote>({
    action: "postProcess",
    emote: {
      finalData: emoteBuffer,
      data: emoteBuffer,
      ...emote,
      name: parseDiscordRegexName(emote.name),
    },
    feedback,
    guild: interaction.guild!,
    interaction,
  });

  if (emoteBuffer.byteLength > maxEmoteSize) {
    await feedback.exceededEmoteSize(emoteBuffer.byteLength);
    const optimizeChoiceRow = getChoiceOptimizeRow(taskId);
    await feedback.updateComponents([optimizeChoiceRow]);
    return;
  }

  editEmoteByUser(taskId);
};

export default prepareEmote;
