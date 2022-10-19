import { EmbedBuilder } from "@discordjs/builders";
import { InteractionReplyOptions } from "discord.js";

const infoEmbed = (
  title: string,
  description: string
): InteractionReplyOptions => {
  const embed = new EmbedBuilder().setTitle(title).setDescription(description);
  // return { embeds: [embed] };
  return {
    embeds: [embed],
  };
};

export default infoEmbed;
