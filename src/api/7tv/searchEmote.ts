import {
  EmoteGQL,
  EmoteResponseAPI,
  EmoteResponseGQL,
} from "./apiResponseType";

import fetch from "node-fetch";

const requestOptions = (query: string, ignoreTags: boolean = false) => {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      //filter: {case_sensitive: false, exact_match: ${exact_match}, ignore_tags: true}
      query: `{
    emotes(query: "${query}", limit: 20000, filter: {ignore_tags: ${ignoreTags}}) {
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
  };
};

const searchEmote = async (query: string, ignoreTags: boolean = false) => {
  try {
    const response = await fetch(
      "https://7tv.io/v3/gql",
      requestOptions(query, ignoreTags)
    );
    const responseData: EmoteResponseGQL = await response.json();
    const emotes = responseData.data.emotes.items;

    if (emotes) return emotes;
    else return [];
  } catch (error) {
    throw new Error(
      `Nothing found with \`${query}\` query\n\n**Some emotes are indexed as unlisted, which means that they can't be searched using this method, use \`/addemote bylink\` instead.** \n\n\n_HINT: If you want to add emote from chat, right click on it and select "Copy image address" and paste it as link value to \`/addemote bylink\` command._`
    );
  }
};

export default searchEmote;
