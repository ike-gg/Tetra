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

    console.log(responseData);

    const emotes: EmoteGQL[] = responseData.data.emotes.items.map(
      (emote): EmoteGQL => {
        let previewUrl = `${emote.host.url.replace("//", "https://")}/2x.`;
        let url = `${emote.host.url.replace("//", "https://")}/4x.`;

        emote.animated ? (url += "gif") : (url += "webp");
        emote.animated ? (previewUrl += "gif") : (previewUrl += "webp");

        return {
          ...emote,
          origin: "7tv",
          host: {
            url: url,
            preview: previewUrl,
          },
        };
      }
    );

    if (emotes) return emotes;
    else return [];
  } catch (error) {
    console.log("⚠️");
    console.log(error);
    throw new Error(
      `Nothing found with \`${query}\` query\n\n**Some emotes are indexed as unlisted, which means that they can't be searched using this method, use \`/addemote bylink\` instead.** \n\n\n_HINT: If you want to add emote from chat, right click on it and select "Copy image address" and paste it as link value to \`/addemote bylink\` command._`
    );
  }
};

export default searchEmote;
