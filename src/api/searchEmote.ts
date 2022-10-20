import {
  EmoteGQL,
  EmoteResponseGQL,
  EmptyEmoteResponseGQL,
} from "./apiResponseType";

const searchEmote = async (emote: string): Promise<EmoteGQL[]> => {
  return await fetch("https://7tv.io/v3/gql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `{
        emotes(query: "${emote}", page: 1, limit: 5, filter: {case_sensitive: true, exact_match: false, ignore_tags: true}) {
          items {
            id
            name
            animated
            owner {
              display_name
            }
            host {
              url
            }
          }
        }
      }`,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.data?.emotes.items) {
        return data.data.emotes.items;
      } else {
        return [];
      }
    })
    .catch((error) => {
      console.error(error);
      throw new Error("Emotes not found");
    });
};

export default searchEmote;
