import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const here = {
  data: new SlashCommandBuilder()
    .setName("entitlementlist")
    .setDescription("internal tetra tooling for testing entitlements"),
  async execute(interaction: ChatInputCommandInteraction) {
    const feedback = new FeedbackManager(interaction);
    try {
      const entitlements =
        await interaction.client.application.entitlements.fetch();

      await feedback.info(`Found ${entitlements.size} entitlements, logged.`);
      console.log(entitlements);
    } catch (error) {
      await feedback.handleError(error);
    }
  },
};

export default here;
