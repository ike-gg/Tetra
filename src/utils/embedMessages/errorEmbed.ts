import { EmbedBuilder } from "@discordjs/builders";

const errorEmbed = (description: string): EmbedBuilder => {
  const embed = new EmbedBuilder()
    .setColor(0xeb3434)
    .setTitle("🔴 Something went wrong")
    .setDescription(description);
  return embed;
};

export default errorEmbed;
