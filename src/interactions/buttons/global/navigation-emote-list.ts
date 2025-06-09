import { ButtonInteraction } from "discord.js";
import { z } from "zod";

import prepareEmote from "@/emotes/prepareEmote";
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
    super(SelectEmoteContinuitySchema, { name: "navigation-emote-list" });
    this.handler = handler;
  }
}

const SelectEmoteContinuity = new SelectEmoteButtonInteraction(
  async ({ interaction, data }) => {
    const feedback = new FeedbackManager(interaction);

    const { emote } = data;

    await feedback.removeComponents();
    await feedback.working();

    prepareEmote(emote, {
      feedback,
      interaction,
    });
  }
);

export default SelectEmoteContinuity;
