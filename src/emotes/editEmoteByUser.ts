import TaskManager from "../utils/managers/TaskManager";
import * as TaskTypes from "../types/TaskTypes";
import getPostProcessRow from "../utils/elements/getPostProcessRow";
import getSubmitEmoteRow from "../utils/elements/getSubmitEmoteRow";
import getManualAdjustmentRow from "../utils/elements/getManualAdjustmentRow";
import sharp from "sharp";
import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

const editEmoteByUser = async (taskId: string) => {
  // let origin: "postProcess" | undefined;

  // if (options.origin === "postProcess") origin = "postProcess";

  const { emote, feedback, guild, interaction } =
    TaskManager.getInstance().getTask<TaskTypes.PostProcessEmote>(taskId);

  let isRateLimited: NodeJS.Timeout | undefined;

  try {
    const messageComponents: ActionRowBuilder<
      ButtonBuilder | StringSelectMenuBuilder
    >[] = [];

    const postProcessRow = getPostProcessRow(taskId, {
      isEmoteAnimated: emote.animated,
    });
    messageComponents.push(postProcessRow);

    if (emote.animated) {
      const manualRow = getManualAdjustmentRow(taskId);
      messageComponents.push(manualRow);
    }

    const submitRow = getSubmitEmoteRow(taskId, emote.name);
    messageComponents.push(submitRow);

    let aspectRatio: number = 1;

    const emoteSharp = await sharp(emote.finalData, {
      animated: emote.animated,
    });

    const { width, height, format, pages } = await emoteSharp.metadata();

    if (format === "gif") {
      const gifHeight = (height || 1) / (pages || 1);
      aspectRatio = (width || 1) / gifHeight;
    } else {
      aspectRatio = (width || 1) / (height || 1);
    }

    const emoteBufferPreview = await emoteSharp
      .gif()
      .resize({
        width: 64,
        height: 64,
        fit: "contain",
        background: { alpha: 0.05, r: 0, g: 0, b: 0 },
      })
      .toBuffer();

    await feedback.updateFiles([
      { attachment: emoteBufferPreview, name: "preview.gif" },
    ]);

    await feedback.attention({
      title: "Edit emote",
      description: `Rescale or rename your emote now.${
        aspectRatio >= 1.5 || aspectRatio <= 0.5
          ? "\n\n> It seems like your emote is a bit too wide, consider using scaling options to get best results."
          : ""
      }`,
      image: {
        url: "attachment://preview.gif",
      },
    });

    await feedback.updateComponents(messageComponents);
  } catch (error) {
    if (isRateLimited) clearTimeout(isRateLimited);
    await feedback.handleError(error);
  }
};

export default editEmoteByUser;
