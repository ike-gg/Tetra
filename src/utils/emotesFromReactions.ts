import { ReactionManager } from "discord.js";
import { Emote } from "../types";

const emotesFromReactions = (
  reactions: ReactionManager,
  username: string
): Emote[] => {
  const reactionEmotes = reactions.cache.map((reaction) => reaction.emoji);
  const filteredEmotes = reactionEmotes.filter((emote) => emote.id);

  const emotes = filteredEmotes.map((emote): Emote => {
    const { animated, id, name } = emote as {
      id: string;
      name: string;
      animated: boolean;
    };

    let link = `https://cdn.discordapp.com/emojis/${id}`;
    animated ? (link += ".gif") : (link += ".webp");

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

export default emotesFromReactions;
