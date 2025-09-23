import { ButtonInteraction } from "discord.js";
import { z } from "zod";

import { EmoteListComponent } from "@/components/emote-list.component";
import {
  BaseContinuity,
  ContinuityHandler,
} from "@/interactions/continuity/base-continuity";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

export const NavigationEmoteListContinuitySchema = z.object({
  storageKey: z.string(),
  setPage: z.number(),
});

type NavigationEmoteListContinuityDataType = z.infer<
  typeof NavigationEmoteListContinuitySchema
>;

export class NavigationEmoteListButtonInteraction extends BaseContinuity<NavigationEmoteListContinuityDataType> {
  constructor(
    handler: ContinuityHandler<NavigationEmoteListContinuityDataType, ButtonInteraction>
  ) {
    super(NavigationEmoteListContinuitySchema, { name: "navigation-emote-list" });
    this.handler = handler;
  }
}

const NavigationEmoteListContinuity = new NavigationEmoteListButtonInteraction(
  async function ({ interaction, data }) {
    const feedback = new FeedbackManager(interaction);

    await feedback.removeComponents();

    const { setPage, storageKey } = data;

    const content = await EmoteListComponent({ storageKey, currentPage: setPage });

    await feedback.sendMessage(content);
  }
);

export default NavigationEmoteListContinuity;
