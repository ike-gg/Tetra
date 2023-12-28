import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const here = {
  data: new SlashCommandBuilder()
    .setName("entitlement")
    .setDescription("internal tetra tooling for testing entitlements")
    .addBooleanOption((option) =>
      option
        .setName("deletemode")
        .setDescription("false- add entitlement, true- remove entitlement")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("guildid")
        .setDescription(
          "id of guild to enable test entitlement on it, if not provided, test will be applied on current guild"
        )
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const feedback = new FeedbackManager(interaction);
    try {
      const guildId =
        interaction.options.getString("guildid") ?? interaction.guildId;

      const deleteMode = interaction.options.getBoolean("deletemode")!;

      if (!guildId) {
        await feedback.error("No guild id provided");
        return;
      }

      if (deleteMode) {
        const testEntitlement = interaction.entitlements.find(
          (e) => e.startsTimestamp === null && e.endsTimestamp === null
        );

        if (!testEntitlement) {
          await feedback.error("No test entitlement found");
          return;
        }

        await interaction.client.application.entitlements.deleteTest(
          testEntitlement
        );

        await feedback.success(`Test entitlement deleted successfully.`);

        return;
      }

      const skus = await interaction.client.application.fetchSKUs();
      const sku = skus.find((sku) => sku.type === 5);

      if (!sku) {
        await feedback.error("No premium sku found");
        return;
      }

      const testEntitlement =
        await interaction.client.application.entitlements.createTest({
          guild: guildId,
          sku: sku.id,
        });

      console.log("Created entitlement:", testEntitlement);

      await feedback.success(
        `Test entitlement created successfully, more details in the console.`
      );
    } catch (error) {
      if (error instanceof Error) {
        await feedback.error(error.message);
      } else {
        await feedback.unhandledError(error);
      }
    }
  },
};

export default here;
