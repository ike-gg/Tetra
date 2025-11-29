import { ButtonInteraction } from "discord.js";
import { z } from "zod";

import { editEmoteByUser } from "@/emotes/edit-emote-by-user";
import { emoteOptimize } from "@/emotes/emote-optimize";
import {
  BaseContinuity,
  ContinuityHandler,
} from "@/interactions/continuity/base-continuity";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

export const PPStretchToFitContinuitySchema = z.object({
  processingEmoteKey: z.string(),
});

type PPStretchToFitContinuityDataType = z.infer<typeof PPStretchToFitContinuitySchema>;

export class PPStretchToFitButtonInteraction extends BaseContinuity<PPStretchToFitContinuityDataType> {
  constructor(
    handler: ContinuityHandler<PPStretchToFitContinuityDataType, ButtonInteraction>
  ) {
    super(PPStretchToFitContinuitySchema, { name: "pp-stretch-to-fit" });
    this.handler = handler;
  }
}

const PPStretchToFitContinuity = new PPStretchToFitButtonInteraction(
  async ({ interaction, data }) => {
    const feedback = new FeedbackManager(interaction);

    try {
      const { processingEmoteKey } = data;

      await feedback.removeComponents();
      await feedback.working();

      await ProcessingEmoteService.deleteSlices(processingEmoteKey);

      const emote = await ProcessingEmoteService.getEmote(processingEmoteKey);
      const emoteBuffer =
        await ProcessingEmoteService.getOriginalBuffer(processingEmoteKey);

      const processedEmoteBuffer = await emoteOptimize(emoteBuffer, {
        animated: emote.animated,
        transform: "square",
      });

      await ProcessingEmoteService.updateBuffer(processingEmoteKey, processedEmoteBuffer);

      await editEmoteByUser({ feedback, processingEmoteKey });
    } catch (error) {
      await feedback.handleError(error);
    }
  }
);

export default PPStretchToFitContinuity;
