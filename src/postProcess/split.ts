import { ButtonInteraction, SelectMenuInteraction } from "discord.js";
import sharp, { SharpOptions } from "sharp";

import { internalClient } from "../bot";
import { MAX_EMOTE_SIZE } from "../constants";
import editEmoteByUser from "../emotes/editEmoteByUser";
import emoteOptimise from "../emotes/emoteOptimise";
import * as TaskTypes from "../types/TaskTypes";
import TaskManager from "../utils/managers/TaskManager";

const split = async (
  buttonInteraction: ButtonInteraction | SelectMenuInteraction,
  taskId: string,
  splitInto: number
) => {
  await buttonInteraction.deferUpdate();

  const taskDetails =
    TaskManager.getInstance().getTask<TaskTypes.PostProcessEmote>(taskId);

  const { emote, feedback } = taskDetails;
  const { interaction } = feedback;

  await feedback.removeComponents();
  await feedback.working();

  if (!interaction) {
    await feedback.error(
      "Something went wrong. Please try again. `INTERACTION_OBJECT_MISSING`"
    );
    return;
  }

  const { height } = await sharp(emote.data).metadata();

  if (!height) throw new Error("Height of the image is not defined.");

  const sharpOptions: SharpOptions = {
    animated: emote.animated,
  };

  const newWidth = height * splitInto;

  const emoteBuffer = emote.optimizedBuffer ? emote.optimizedBuffer : emote.data;

  const extendedEmote = await sharp(emoteBuffer, sharpOptions)
    .gif()
    .resize({
      width: newWidth,
      height,
      fit: "fill",
    })
    .toBuffer();

  const emoteSlots = Array.from({
    length: splitInto,
  });

  const emotesSliced = await Promise.all(
    emoteSlots.map(async (_, i) => {
      return sharp(extendedEmote, sharpOptions)
        .gif()
        .extract({
          height: height,
          left: i * height,
          top: 0,
          width: height,
        })
        .toBuffer();
    })
  );

  const padding = 12;

  const emotePreviewSliced = await sharp(emotesSliced[0], sharpOptions)
    .gif()
    .extend({
      right: newWidth - height + padding * (splitInto - 1),
      background: {
        r: 0,
        g: 0,
        b: 0,
        alpha: 0,
      },
    })
    .composite(
      emotesSliced.slice(1).map((e, i) => {
        return {
          input: e,
          animated: true,
          left: (i + 1) * height + padding * (i + 1),
          top: 0,
        };
      })
    )
    .toBuffer();

  const emoteSlicesOptimized = await Promise.all(
    emotesSliced.map(async (emoteSlice) => {
      if (emoteSlice.byteLength < MAX_EMOTE_SIZE) return emoteSlice;
      return await emoteOptimise(emoteSlice, {
        animated: emote.animated,
      });
    })
  );

  internalClient.tasks.updateTask<TaskTypes.PostProcessEmote>(taskId, {
    ...taskDetails,
    emote: {
      ...taskDetails.emote,
      finalData: emotePreviewSliced,
      slices: emoteSlicesOptimized,
    },
  });

  editEmoteByUser(taskId);
};

export default split;
