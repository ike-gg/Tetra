import { ButtonInteraction } from "discord.js";
import { z } from "zod";

import { addEmoteToGuild } from "@/emotes/add-emote-to-guild";
import { addSlicesToGuild } from "@/emotes/add-slices-to-guild";
import {
  BaseContinuity,
  ContinuityHandler,
} from "@/interactions/continuity/base-continuity";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

export const SubmitEmoteContinuitySchema = z.object({
  processingEmoteKey: z.string(),
});

type SubmitEmoteContinuityDataType = z.infer<typeof SubmitEmoteContinuitySchema>;

export class SubmitEmoteButtonInteraction extends BaseContinuity<SubmitEmoteContinuityDataType> {
  constructor(
    handler: ContinuityHandler<SubmitEmoteContinuityDataType, ButtonInteraction>
  ) {
    super(SubmitEmoteContinuitySchema, { name: "submit-emote" });
    this.handler = handler;
  }
}

const SubmitEmoteContinuity = new SubmitEmoteButtonInteraction(
  async ({ interaction, data }) => {
    const feedback = new FeedbackManager(interaction);

    try {
      const { processingEmoteKey } = data;

      await feedback.removeComponents();
      await feedback.working();

      const emoteTask = await ProcessingEmoteService.get(processingEmoteKey);

      if (emoteTask.slices) {
        await addSlicesToGuild({ feedback, processingEmoteKey });
      } else {
        await addEmoteToGuild({ feedback, processingEmoteKey });
      }
    } catch (error) {
      await feedback.handleError(error);
    }
  }
);

export default SubmitEmoteContinuity;
