import { EmbedBuilder } from "discord.js";

const successfulEmbed = (
  title: string,
  description: string,
  image?: string
): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setColor(0x3acf38)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
  image ? embed.setImage(image) : null;
  return embed;
};

export default successfulEmbed;
