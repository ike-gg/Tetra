import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  Guild,
  SelectMenuInteraction,
} from "discord.js";
import { DiscordBot, ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import getPostProcessRow from "../utils/elements/getPostProcessRow";
import getSubmitEmoteRow from "../utils/elements/getSubmitEmoteRow";
import parseDiscordRegexName from "../utils/parseDiscordRegexName";
import getManualAdjustmentRow from "../utils/elements/getManualAdjustmentRow";

const editEmoteByUser = async (
  emote: ExtractedEmote,
  guild: Guild,
  options: {
    client: DiscordBot;
    feedback: FeedbackManager;
    interaction:
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
      | ContextMenuCommandInteraction;
    origin?: "postProcess";
  }
) => {
  let origin: "postProcess" | undefined;

  if (options.origin === "postProcess") origin = "postProcess";

  const { feedback, client, interaction } = options;

  emote.name = parseDiscordRegexName(emote.name);

  let isRateLimited: NodeJS.Timeout | undefined;

  try {
    const taskId = client.tasks.addTask<TaskTypes.PostProcessEmote>({
      action: "postProcess",
      emote,
      feedback,
      guild,
      interaction: interaction,
    });

    const postProcessRow = getPostProcessRow(taskId, emote.origin, {
      isEmoteAnimated: emote.animated,
      origin,
    });

    const manualRow = getManualAdjustmentRow(taskId);

    const submitRow = getSubmitEmoteRow(taskId, emote.name);

    await feedback.editEmoteByUser(emote);
    await feedback.updateComponents([postProcessRow, manualRow, submitRow]);
  } catch (error) {
    if (isRateLimited) clearTimeout(isRateLimited);
    await feedback.error(String(error));
  }
};

export default editEmoteByUser;
