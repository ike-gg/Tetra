import { EmbedBuilder } from "@discordjs/builders";

const warningEmbed = (description: string): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setTitle("⚠️ Warning!")
    .setColor(0xf7e139)
    .setDescription(description);
  return embed;
};

export default warningEmbed;
