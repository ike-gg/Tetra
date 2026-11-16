import { randomUUIDv7 } from "bun";
import {
  ActionRowBuilder,
  type ButtonInteraction,
  type Client,
  type Interaction,
  InteractionCollector,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { z } from "zod";

import { internalClient } from "@/bot";
import { editEmoteByUser } from "@/emotes/edit-emote-by-user";
import {
  BaseContinuity,
  type ContinuityHandler,
} from "@/interactions/continuity/base-continuity";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import parseDiscordRegexName from "@/utils/discord/parse-discord-regex-name";
import { FeedbackManager } from "@/utils/managers/feedback-manager";

export const PPRenameContinuitySchema = z.object({
  processingEmoteKey: z.string(),
});

type PPRenameContinuityDataType = z.infer<typeof PPRenameContinuitySchema>;

export class PPRenameButtonInteraction extends BaseContinuity<PPRenameContinuityDataType> {
  constructor(handler: ContinuityHandler<PPRenameContinuityDataType, ButtonInteraction>) {
    super(PPRenameContinuitySchema, { name: "pp-rename" });
    this.handler = handler;
  }
}

const PPRenameContinuity = new PPRenameButtonInteraction(
  async ({ interaction, data }) => {
    const { processingEmoteKey } = data;
    const feedback = new FeedbackManager(interaction);

    try {
      const modalId = randomUUIDv7();

      const { emote, customName } = await ProcessingEmoteService.get(processingEmoteKey);

      const { interaction } = feedback;

      if (!interaction) {
        await feedback.error(
          "something broke on my side. try again, and if it keeps happening, report it with code `INTERACTION_OBJECT_MISSING`"
        );
        return;
      }

      const modal = new ModalBuilder().setCustomId(modalId).setTitle("rename emote");

      const newNameField = new TextInputBuilder()
        .setCustomId("newname")
        .setLabel("new name")
        .setStyle(TextInputStyle.Short)
        .setMaxLength(28)
        .setMinLength(2)
        .setRequired(true)
        .setValue(customName ?? emote.name);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(newNameField)
      );

      await interaction.showModal(modal);

      const collector = new InteractionCollector(internalClient as Client<true>, {
        time: 1000 * 60 * 10,
        filter: (i) => i.user.id === interaction.user.id,
      });

      const onCollect = async (collectedInteraction: Interaction) => {
        if (!collectedInteraction.isModalSubmit()) return;
        if (!(collectedInteraction.customId === modalId)) return;

        try {
          await collectedInteraction.deferUpdate();

          await feedback.removeComponents();
          await feedback.working();

          const newNameRaw =
            await collectedInteraction.fields.getTextInputValue("newname");
          const newName = parseDiscordRegexName(newNameRaw);

          await ProcessingEmoteService.setCustomName(processingEmoteKey, newName);

          await editEmoteByUser({ feedback, processingEmoteKey });
        } catch (error) {
          await feedback.handleError(error);
        }

        collector.stop();
      };

      collector.on("collect", (collectedInteraction) => {
        void onCollect(collectedInteraction);
      });
    } catch (error) {
      await feedback.handleError(error);
    }
  }
);

export default PPRenameContinuity;
