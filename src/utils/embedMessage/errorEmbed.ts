import { EmbedBuilder } from "@discordjs/builders";
import { InteractionReplyOptions } from "discord.js";

const errorEmbed = (description: string): InteractionReplyOptions => {
  const embed = new EmbedBuilder()
    .setColor(0xeb3434)
    .setTitle("🔴 Something went wrong")
    .setDescription(description);
  return { embeds: [embed] };
};

export default errorEmbed;
