import { EmbedBuilder } from "@discordjs/builders";

const emotePreviewEmbed = (options: {
  number: string;
  name: string;
  author: string;
  preview: string;
  reference: string;
}): EmbedBuilder => {
  const { number, name, author, preview, reference } = options;
  const embed = new EmbedBuilder()
    // .setTitle(`${number} **${name}** by ${author}`)
    .setFields({ name: `${number} **${name}**`, value: `by ${author}` })
    .setThumbnail(preview)
    // .setFooter({ text: reference })
    .setColor(0x5865f2);
  return embed;
};

export default emotePreviewEmbed;
