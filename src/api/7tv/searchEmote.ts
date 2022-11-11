import {
  EmoteGQL,
  EmoteResponseAPI,
  EmoteResponseGQL,
} from "./apiResponseType";

import fetch from "node-fetch";

const searchEmote = async (
  emote: string,
  ignoreTags: boolean = false
): Promise<EmoteGQL[]> => {
  return await fetch("https://7tv.io/v3/gql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      //filter: {case_sensitive: false, exact_match: ${exact_match}, ignore_tags: true}
      //filter emotes
      query: `{
        emotes(query: "${emote}", limit: 20000, filter: {ignore_tags: ${ignoreTags}}) {
          count
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
    .then((responseData) => {
      const foundEmotes = responseData as EmoteResponseGQL;
      if (foundEmotes.data?.emotes.items) {
        return foundEmotes.data.emotes.items;
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
