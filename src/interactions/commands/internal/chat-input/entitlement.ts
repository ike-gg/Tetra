import { SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

const command = new SlashCommandBuilder()
  .setName("entitlement")
  .setDescription("internal tetra tooling for testing entitlements")
  // subcommand create
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("create a test entitlement")
      .addStringOption((option) =>
        option
          .setName("guildid")
          .setDescription("id of guild to enable test entitlement on it")
      )
  )
  // subcommand delete
  .addSubcommand((subcommand) =>
    subcommand
      .setName("delete")
      .setDescription("delete a test entitlement")
      .addStringOption((option) =>
        option
          .setName("guildid")
          .setDescription("id of guild to enable test entitlement on it")
      )
  );

export default new ChatInputCommandHandler(command, async (interaction) => {
  const feedback = new FeedbackManager(interaction);
  try {
    const guildId = interaction.options.getString("guildid") ?? interaction.guildId;

    const subcommandUsed = interaction.options.getSubcommand() as "create" | "delete";

    if (!guildId) {
      await feedback.error("No guild found");
      return;
    }

    if (subcommandUsed === "delete") {
      const testEntitlement = interaction.entitlements.find(
        (e) => e.startsTimestamp === null && e.endsTimestamp === null
      );

      if (!testEntitlement) {
        await feedback.error("No test entitlement found");
        return;
      }

      await interaction.client.application.entitlements.deleteTest(testEntitlement);

      await feedback.success(`Test entitlement deleted successfully.`);

      return;
    }

    const skus = await interaction.client.application.fetchSKUs();
    const sku = skus.find((sku) => sku.type === 5);

    if (!sku) {
      await feedback.error("No premium sku found");
      return;
    }

    const testEntitlement = await interaction.client.application.entitlements.createTest({
      guild: guildId,
      sku: sku.id,
    });

    console.log("Created entitlement:", testEntitlement);

    await feedback.success(
      `Test entitlement created successfully, more details in the console.`
    );
  } catch (error) {
    await feedback.handleError(error);
  }
});
