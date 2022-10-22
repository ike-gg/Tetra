import { EmbedBuilder } from "@discordjs/builders";
import { BaseMessageOptions } from "discord.js";

const infoEmbed = (title: string, description: string): BaseMessageOptions => {
  const embed = new EmbedBuilder().setTitle(title).setDescription(description);
  // return { embeds: [embed] };
  return {
    embeds: [embed],
  };
};

export default infoEmbed;
