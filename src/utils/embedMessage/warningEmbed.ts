import { EmbedBuilder } from "@discordjs/builders";
import { InteractionReplyOptions } from "discord.js";

const warningEmbed = (description: string): InteractionReplyOptions => {
  const embed = new EmbedBuilder()
    .setTitle("⚠️ Warning!")
    .setColor(0xf7e139)
    .setDescription(description);
  return {
    embeds: [embed],
  };
};

export default warningEmbed;
