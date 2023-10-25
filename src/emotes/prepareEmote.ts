import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  CommandInteraction,
  Guild,
  SelectMenuInteraction,
} from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { Emote } from "../types";
import getBufferFromUrl from "./source/getBufferFromUrl";
import TaskManager from "../utils/managers/TaskManager";
import * as TaskTypes from "../types/TaskTypes";
import { maxEmoteSize, maxSupportedSize } from "../constants";
import editEmoteByUser from "./editEmoteByUser";
import getChoiceOptimizeRow from "../utils/elements/getChoiceOptimizeRow";
import parseDiscordRegexName from "../utils/parseDiscordRegexName";
import prettyBytes from "pretty-bytes";
import { Messages } from "../constants/messages";

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
  const emoteBuffer = await getBufferFromUrl(emote.file.url);

  if (emoteBuffer.byteLength >= maxSupportedSize) {
    await feedback.error(
      `Emote exceeded maximum size supported currently with custom files (${prettyBytes(
        maxSupportedSize
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

  if (emoteBuffer.byteLength > maxEmoteSize) {
    await feedback.attention(
      Messages.EXCEEDED_EMOTE_SIZE(emoteBuffer.byteLength)
    );
    const optimizeChoiceRow = getChoiceOptimizeRow(taskId, emote.animated);
    await feedback.updateComponents([optimizeChoiceRow]);
    return;
  }

  editEmoteByUser(taskId);
};

export default prepareEmote;
