import { EmbedBuilder } from "@discordjs/builders";

const errorEmbed = (description: string): EmbedBuilder => {
  return new EmbedBuilder()
    .setColor(0xeb3434)
    .setTitle("⚠️ Something went wrong")
    .setDescription(description);
};

export default errorEmbed;
