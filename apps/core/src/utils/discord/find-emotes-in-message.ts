import type { Emote } from "../../types";

const emoteRegex = /((?<!\\)<:[^:]+:(\d+)>)/gmu;
const animatedEmoteRegex = /((?<!\\)<a:[^:]+:(\d+)>)/gmu;

const testRegex = (testing: string, expression: RegExp): string[] => {
  const result = testing.match(expression);
  if (result) return result;
  return [];
};

const findEmotesInMessage = (message: string, username: string): Emote[] => {
  const staticEmotes = testRegex(message, emoteRegex);
  const animatedEmotes = testRegex(message, animatedEmoteRegex);

  const foundEmotes = [...staticEmotes, ...animatedEmotes];
  const uniqueFoundEmotes = [...new Set(foundEmotes)];

  const result = uniqueFoundEmotes.map((emote): Emote => {
    // emotedata structure
    //['a' if emote is animated : emote name : emote id (reference to URL)]
    const emoteData: string[] = emote.slice(1, -1).split(":");

    const [prefix, name, id] = emoteData;
    const animated = prefix === "a";
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
  return result;
};

export default findEmotesInMessage;
