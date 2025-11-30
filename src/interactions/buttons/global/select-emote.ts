import { ButtonInteraction } from "discord.js";
import { z } from "zod";

import { prepareEmote } from "@/emotes/prepare-emote";
import {
  BaseContinuity,
  ContinuityHandler,
} from "@/interactions/continuity/base-continuity";
import { EmoteSchema } from "@/types";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

export const SelectEmoteContinuitySchema = z.object({
  emote: EmoteSchema,
});

type SelectEmoteContinuityDataType = z.infer<typeof SelectEmoteContinuitySchema>;

export class SelectEmoteButtonInteraction extends BaseContinuity<SelectEmoteContinuityDataType> {
  constructor(
    handler: ContinuityHandler<SelectEmoteContinuityDataType, ButtonInteraction>
  ) {
    super(SelectEmoteContinuitySchema, { name: "select-emote" });
    this.handler = handler;
  }
}

const SelectEmoteContinuity = new SelectEmoteButtonInteraction(
  async ({ interaction, data }) => {
    const feedback = new FeedbackManager(interaction);

    try {
      await feedback.working();

      const { emote } = data;

      await feedback.removeComponents();

      await prepareEmote({ emote, feedback });
    } catch (error) {
      await feedback.handleError(error);
    }
  }
);

export default SelectEmoteContinuity;
