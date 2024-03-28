import { ModalBuilder, TextInputBuilder } from "@discordjs/builders";
import { randomBytes } from "crypto";
import {
  ActionRowBuilder,
  ButtonInteraction,
  Client,
  InteractionCollector,
  TextInputStyle,
} from "discord.js";
import * as TaskTypes from "../types/TaskTypes";
import editEmoteByUser from "../emotes/editEmoteByUser";
import TaskManager from "../utils/managers/TaskManager";
import { client } from "..";
import parseDiscordRegexName from "../utils/discord/parseDiscordRegexName";
import gifsicle from "../utils/gifsicle";
import sharp from "sharp";
import { extend } from "lodash";

const split = async (
  buttonInteraction: ButtonInteraction,
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

  const newWidth = height * splitInto;

  const extendedEmote = await sharp(emote.data)
    .resize({ width: newWidth, height, fit: "fill" })
    .toBuffer();

  const emoteSlots = Array.from({ length: splitInto });

  const emotesSliced = await Promise.all(
    emoteSlots.map(async (_, i) => {
      return sharp(extendedEmote)
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

  const emotePreviewSliced = await sharp(emotesSliced[0])
    .extend({
      right: newWidth - height + padding * (splitInto - 1),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .composite(
      emotesSliced.slice(1).map((e, i) => {
        return {
          input: e,
          left: (i + 1) * height + padding * (i + 1),
          top: 0,
        };
      })
    )
    .toBuffer();

  client.tasks.updateTask<TaskTypes.PostProcessEmote>(taskId, {
    ...taskDetails,
    emote: {
      ...taskDetails.emote,
      finalData: emotePreviewSliced,
      slices: emotesSliced,
    },
  });

  editEmoteByUser(taskId);
};

export default split;
