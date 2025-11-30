import { EmbedBuilder } from "@discordjs/builders";

import { Emote } from "@/types";

interface EmotePreviewEmbedOptions {
  prefixName?: string;
}

export const EmotePreviewEmbed = (
  emote: Emote,
  options?: EmotePreviewEmbedOptions
): EmbedBuilder => {
  const { prefixName } = options || {};

  const { name, author, file } = emote;

  const authorValue = author ? `by ${author}` : `-`;
  const nameValue = prefixName ? `${prefixName} **${name}**` : `**${name}**`;

  const { preview } = file;

  const embed = new EmbedBuilder()
    .setFields({
      name: nameValue,
      value: authorValue,
    })
    .setThumbnail(preview)
    .setColor(0x000000);

  return embed;
};
