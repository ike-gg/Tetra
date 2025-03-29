import { APIEmoji, type BaseImageURLOptions } from "discord.js";

type Emote = APIEmoji | { id: string; isAnimated: boolean };

export const getEmoteUrl = (emote: Emote, options?: BaseImageURLOptions) => {
  if ("isAnimated" in emote) {
    const extension = emote.isAnimated ? "gif" : "webp";
    const size = options?.size ?? 128;
    return `https://cdn.discordapp.com/emojis/${emote.id}.${extension}?size=${size}`;
  }
  const { id, animated } = emote;
  const format = animated ? "gif" : "webp";
  const size = options?.size ?? 128;
  return `https://cdn.discordapp.com/emojis/${id}.${format}?size=${size}`;
};
