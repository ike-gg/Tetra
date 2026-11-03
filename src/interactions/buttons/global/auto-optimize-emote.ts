import type { ButtonInteraction } from "discord.js";
import { z } from "zod";

import { editEmoteByUser } from "@/emotes/edit-emote-by-user";
import { emoteOptimize } from "@/emotes/emote-optimize";
import {
  BaseContinuity,
  type ContinuityHandler,
} from "@/interactions/continuity/base-continuity";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import { FeedbackManager } from "@/utils/managers/feedback-manager";

export const AutoOptimizeEmoteContinuitySchema = z.object({
  processingEmoteKey: z.string(),
});

type AutoOptimizeEmoteContinuityDataType = z.infer<
  typeof AutoOptimizeEmoteContinuitySchema
>;

export class AutoOptimizeEmoteButtonInteraction extends BaseContinuity<AutoOptimizeEmoteContinuityDataType> {
  constructor(
    handler: ContinuityHandler<AutoOptimizeEmoteContinuityDataType, ButtonInteraction>
  ) {
    super(AutoOptimizeEmoteContinuitySchema, { name: "auto-optimize-emote" });
    this.handler = handler;
  }
}

const AutoOptimizeEmoteContinuity = new AutoOptimizeEmoteButtonInteraction(
  async ({ interaction, data }) => {
    const feedback = new FeedbackManager(interaction);

    try {
      const { processingEmoteKey } = data;

      await feedback.removeComponents();

      await feedback.working();

      const emoteBuffer = await ProcessingEmoteService.getBuffer(processingEmoteKey);

      const optimizedEmoteBuffer = await emoteOptimize(emoteBuffer);

      await ProcessingEmoteService.updateBuffer(processingEmoteKey, optimizedEmoteBuffer);
      await ProcessingEmoteService.updateOptimizedBuffer(
        processingEmoteKey,
        optimizedEmoteBuffer
      );

      await editEmoteByUser({ feedback, processingEmoteKey });
    } catch (error) {
      await feedback.handleError(error);
    }
  }
);

export default AutoOptimizeEmoteContinuity;
