import { StringSelectMenuInteraction } from "discord.js";
import sharp, { SharpOptions } from "sharp";
import { z } from "zod";

import { MAX_EMOTE_SIZE } from "@/constants";
import { EmbeddedError } from "@/constants/errors";
import { editEmoteByUser } from "@/emotes/edit-emote-by-user";
import { emoteOptimize } from "@/emotes/emote-optimize";
import {
  BaseContinuity,
  ContinuityHandler,
} from "@/interactions/continuity/base-continuity";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

export const PPSplitContinuitySchema = z.object({
  processingEmoteKey: z.string(),
});

type PPSplitContinuityDataType = z.infer<typeof PPSplitContinuitySchema>;

export class PPSplitSelectMenuInteraction extends BaseContinuity<PPSplitContinuityDataType> {
  constructor(
    handler: ContinuityHandler<PPSplitContinuityDataType, StringSelectMenuInteraction>
  ) {
    super(PPSplitContinuitySchema, { name: "pp-split" });
    this.handler = handler;
  }
}

const PPSplitContinuity = new PPSplitSelectMenuInteraction(
  async ({ interaction, data }) => {
    const { processingEmoteKey } = data;
    const feedback = new FeedbackManager(interaction);

    try {
      const splitInto = Number(interaction.values.at(0) as string);

      await feedback.removeComponents();
      await feedback.working();

      const emote = await ProcessingEmoteService.getEmote(processingEmoteKey);
      const entity = await ProcessingEmoteService.get(processingEmoteKey);

      const bufferSplitFrom = entity.optimizedBuffer
        ? await ProcessingEmoteService.getOptimizedBuffer(processingEmoteKey)
        : await ProcessingEmoteService.getBuffer(processingEmoteKey);

      if (!bufferSplitFrom) {
        throw new EmbeddedError({
          title: "Failed to get emote buffer.",
        });
      }

      const sharpOptions: SharpOptions = {
        animated: emote.animated,
      };

      const metadata = await sharp(bufferSplitFrom, sharpOptions).metadata();

      const { height: originalHeight, pageHeight } = metadata;

      const height = pageHeight || originalHeight;

      if (!height) {
        throw new EmbeddedError({
          title: "Failed to get emote height.",
        });
      }

      const newWidth = height * splitInto;

      const extendedEmote = await sharp(bufferSplitFrom, sharpOptions)
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
        emotesSliced.map(async (emoteSlice, _) => {
          if (emoteSlice.byteLength < MAX_EMOTE_SIZE) {
            return emoteSlice;
          }
          return await emoteOptimize(emoteSlice, {
            animated: emote.animated,
          });
        })
      );

      await ProcessingEmoteService.updateSlices(
        processingEmoteKey,
        emoteSlicesOptimized,
        emotePreviewSliced
      );

      await editEmoteByUser({ feedback, processingEmoteKey });
    } catch (error) {
      await feedback.handleError(error);
    }
  }
);

export default PPSplitContinuity;
