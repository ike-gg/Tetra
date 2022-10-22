import { EmbedBuilder } from "@discordjs/builders";
import { BaseMessageOptions } from "discord.js";

const errorEmbed = (description: string): BaseMessageOptions => {
  const embed = new EmbedBuilder()
    .setColor(0xeb3434)
    .setTitle("🔴 Something went wrong")
    .setDescription(description);
  return { embeds: [embed] };
};

export default errorEmbed;
