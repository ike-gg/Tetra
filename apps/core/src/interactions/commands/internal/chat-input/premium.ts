import { SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";

const command = new SlashCommandBuilder()
  .setName("premium")
  .setDescription("Check premium status.");

export default new ChatInputCommandHandler(command, async (interaction) => {
  interaction.reply("TODO :)");
  // const feedback = new FeedbackManager(interaction);
  // const { hasPremium, purchasedEntitlement, testEntitlement } =
  //   parseEntitlementsData(interaction);
  // if (!hasPremium) {
  //   return feedback.info("You don't have access to premium features.");
  // }
  // const premiumDetails = new EmbedBuilder();
  // if (purchasedEntitlement) {
  //   premiumDetails.addFields({
  //     name: "Premium",
  //     value: `You are eligible to use premium features on this server.
  //       Renewal date: <t:${Math.floor(purchasedEntitlement.endsTimestamp! / 1000)}>
  //       Purchased by: <@${purchasedEntitlement.userId}>`,
  //     inline: true,
  //   });
  // }
  // if (testEntitlement) {
  //   premiumDetails.addFields({
  //     name: "Temporary Premium",
  //     value: "You have limited access to premium features on this server.",
  //     inline: true,
  //   });
  // }
  // return feedback.premium(premiumDetails.toJSON() as EmbedData);
});
