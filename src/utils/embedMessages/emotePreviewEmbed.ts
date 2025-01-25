import { EmbedBuilder } from "@discordjs/builders";

const emotePreviewEmbed = (options: {
  number: string;
  name: string;
  author?: string;
  preview: string;
}): EmbedBuilder => {
  const { number, name, author, preview } = options;
  const authorValue = author ? `by ${author}` : `-`;
  const embed = new EmbedBuilder()
    .setFields({
      name: `${number} **${name}**`,
      value: authorValue,
    })
    .setThumbnail(preview)
    .setColor(0x000000);
  return embed;
};

export default emotePreviewEmbed;
