import { EmbedBuilder } from "@discordjs/builders";

const infoEmbed = (title: string, description?: string): EmbedBuilder => {
  const embed = new EmbedBuilder().setTitle(title);
  description && embed.setDescription(description);
  return embed;
};

export default infoEmbed;
