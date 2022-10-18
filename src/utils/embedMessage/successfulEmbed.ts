import { EmbedBuilder } from "@discordjs/builders";

const successfulEmbed = (title: string, description: string): EmbedBuilder => {
  return new EmbedBuilder()
    .setColor(0x3acf38)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
};

export default successfulEmbed;
