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

export const PPCenterCropContinuitySchema = z.object({
  processingEmoteKey: z.string(),
});

type PPCenterCropContinuityDataType = z.infer<typeof PPCenterCropContinuitySchema>;

export class PPCenterCropButtonInteraction extends BaseContinuity<PPCenterCropContinuityDataType> {
  constructor(
    handler: ContinuityHandler<PPCenterCropContinuityDataType, ButtonInteraction>
  ) {
    super(PPCenterCropContinuitySchema, { name: "pp-center-crop" });
    this.handler = handler;
  }
}

const PPCenterCropContinuity = new PPCenterCropButtonInteraction(
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
        transform: "center",
      });

      await ProcessingEmoteService.updateBuffer(processingEmoteKey, processedEmoteBuffer);

      await editEmoteByUser({ feedback, processingEmoteKey });
    } catch (error) {
      await feedback.handleError(error);
    }
  }
);

export default PPCenterCropContinuity;
