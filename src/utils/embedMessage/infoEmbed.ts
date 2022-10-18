import { EmbedBuilder } from "@discordjs/builders";

const infoEmbed = (title: string, description: string): EmbedBuilder => {
  return new EmbedBuilder().setTitle(title).setDescription(description);
};

export default infoEmbed;
