import { SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

const command = new SlashCommandBuilder()
  .setName("entitlementlist")
  .setDescription("internal tetra tooling for testing entitlements");

export default new ChatInputCommandHandler(command, async (interaction) => {
  const feedback = new FeedbackManager(interaction);

  const entitlements = await interaction.client.application.entitlements.fetch();

  await feedback.info(`Found ${entitlements.size} entitlements, check console`);

  console.log(entitlements);
});
