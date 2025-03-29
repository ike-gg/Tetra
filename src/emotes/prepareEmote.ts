import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  CommandInteraction,
  Guild,
  SelectMenuInteraction,
} from "discord.js";
import prettyBytes from "pretty-bytes";

import { MAX_EMOTE_SIZE, MAX_SUPPORTED_SIZE } from "../constants";
import { Messages } from "../constants/messages";
import { Emote } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import parseDiscordRegexName from "../utils/discord/parseDiscordRegexName";
import getChoiceOptimizeRow from "../utils/elements/getChoiceOptimizeRow";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import TaskManager from "../utils/managers/TaskManager";
import editEmoteByUser from "./editEmoteByUser";
import getBufferFromUrl from "./source/getBufferFromUrl";

const prepareEmote = async (
  emote: Emote,
  details: {
    feedback: FeedbackManager;
    interaction:
      | ChatInputCommandInteraction
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction;
    guild?: Guild;
  }
) => {
  const { feedback, interaction, guild } = details;

  try {
    const emoteBuffer = await getBufferFromUrl(emote.file.url, {
      maxRetries: 3,
      msBetweenRetries: 1000,
    });

    if (emoteBuffer.byteLength >= MAX_SUPPORTED_SIZE) {
      await feedback.error(
        `Emote exceeded maximum size supported currently with custom files (${prettyBytes(
          MAX_SUPPORTED_SIZE
        )}) by Tetra.`
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
      guild: guild || interaction.guild!,
      interaction,
    });

    if (emoteBuffer.byteLength > MAX_EMOTE_SIZE) {
      await feedback.attention(Messages.EXCEEDED_EMOTE_SIZE(emoteBuffer.byteLength));
      const optimizeChoiceRow = getChoiceOptimizeRow(taskId, emote.animated);
      await feedback.updateComponents([optimizeChoiceRow]);
      return;
    }

    editEmoteByUser(taskId);
  } catch (error) {
    await feedback.handleError(error);
    return;
  }
};

export default prepareEmote;
