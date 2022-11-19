import { EmbedBuilder } from "discord.js";

const interactionEmbed = (
  title: string,
  description: string,
  image?: string
): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setColor(0xff8812)
    .setTitle(`🟠 ${title}`)
    .setDescription(description);
  image ? embed.setImage(image) : null;
  return embed;
};

export default interactionEmbed;
