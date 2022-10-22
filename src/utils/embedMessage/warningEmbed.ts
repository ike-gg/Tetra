import { EmbedBuilder } from "@discordjs/builders";
import { BaseMessageOptions } from "discord.js";

const warningEmbed = (description: string): BaseMessageOptions => {
  const embed = new EmbedBuilder()
    .setTitle("⚠️ Warning!")
    .setColor(0xf7e139)
    .setDescription(description);
  return {
    embeds: [embed],
  };
};

export default warningEmbed;
