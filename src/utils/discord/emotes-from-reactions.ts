import type { ReactionManager } from "discord.js";

import type { Emote } from "../../types";

export const emotesFromReactions = (
  reactions: ReactionManager,
  username: string
): Emote[] => {
  const reactionEmotes = reactions.cache.map((reaction) => reaction.emoji);
  const filteredEmotes = reactionEmotes.filter((emote) => emote.id);

  const emotes = filteredEmotes.map((emote): Emote => {
    const {
      animated: isEmoteAnimated,
      id,
      name,
    } = emote as {
      id: string;
      name: string;
      animated: boolean | null;
    };

    const animated = isEmoteAnimated === true;
    const link = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "webp"}`;

    return {
      name,
      animated,
      author: username,
      file: {
        preview: link,
        url: link,
      },
      origin: "discord",
      id,
    };
  });

  return emotes;
};
