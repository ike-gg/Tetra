import { GuildEmoji, ReactionEmoji, ReactionManager } from "discord.js";
import { FoundEmotesDiscord } from "../types";

const emotesFromReactions = (
  reactions: ReactionManager
): FoundEmotesDiscord[] => {
  const reactionEmotes = reactions.cache.map((reaction) => reaction.emoji);
  const filteredEmotes = reactionEmotes.filter((emote) => emote.id);
  const emotes = filteredEmotes.map((emote) => {
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
      link,
      id,
    };
  });

  return emotes;
};

export default emotesFromReactions;
