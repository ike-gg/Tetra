import { ActionRowBuilder, ButtonBuilder, SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";
import cancelInteractionButton from "@/interactions/buttons/generic/cancel-interaction";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

const command = new SlashCommandBuilder()
  .setName("continuity")
  .setDescription("internal tooling for testing continuity");

export default new ChatInputCommandHandler(command, async (interaction) => {
  const feedback = new FeedbackManager(interaction);

  const button = cancelInteractionButton.metadata.getButton();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents([button!]);

  feedback.sendMessage({ components: [row] });
});
