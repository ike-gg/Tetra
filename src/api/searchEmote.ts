import { EmoteGQL } from "./apiResponseType";

const searchEmote = async (
  emote: string,
  page = 1,
  exact_match = true
): Promise<EmoteGQL[]> => {
  return await fetch("https://7tv.io/v3/gql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `{
        emotes(query: "${emote}", page: ${page}, limit: 5, filter: {case_sensitive: false, exact_match: ${exact_match}, ignore_tags: true}) {
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
