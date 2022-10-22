import { BaseMessageOptions, EmbedBuilder } from "discord.js";

const successfulEmbed = (
  title: string,
  description: string,
  image?: string
): BaseMessageOptions => {
  const embed = new EmbedBuilder()
    .setColor(0x3acf38)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
  if (image) {
    embed.setImage(image);
  }
  return { embeds: [embed] };
};

export default successfulEmbed;
