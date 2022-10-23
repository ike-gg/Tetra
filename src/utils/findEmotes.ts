const emoteRegex = /((?<!\\)<:[^:]+:(\d+)>)/gmu;
const animatedEmoteRegex = /((?<!\\)<a:[^:]+:(\d+)>)/gmu;

interface FoundEmotes {
  name: string;
  animated: boolean;
  link: string;
  id: string;
}

const testRegex = (testing: string, expression: RegExp): string[] => {
  const result = testing.match(expression);
  if (result) return result;
  return [];
};

const findEmotes = (message: string): FoundEmotes[] => {
  const staticEmotes = testRegex(message, emoteRegex);
  const animatedEmotes = testRegex(message, animatedEmoteRegex);

  const foundEmotes = [...staticEmotes, ...animatedEmotes];
  const uniqueFoundEmotes = [...new Set(foundEmotes)];

  const result = uniqueFoundEmotes.map((emote): FoundEmotes => {
    // emotedata structure
    //['a' if emote is animated : emote name : emote id (reference to URL)]
    const emoteData: string[] = emote.slice(1, -1).split(":");

    let name, animated, link, id;

    emoteData[0] === "a" ? (animated = true) : (animated = false);
    name = emoteData[1];
    id = emoteData[2];

    link = `https://cdn.discordapp.com/emojis/${id}`;
    animated ? (link += ".gif") : (link += ".webp");

    return {
      name,
      animated,
      link,
      id,
    };
  });
  return result;
};

export default findEmotes;
