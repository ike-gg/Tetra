import {
  EmoteGQL,
  EmoteResponseAPI,
  EmoteResponseGQL,
} from "./apiResponseType";

import fetch from "node-fetch";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    let tries: number = 0;

    const tryFetch = async () => {
      tries++;
      const response = await fetch(
        "https://7tv.io/v3/gql",
        requestOptions(query, ignoreTags)
      );
      const responseEmotesData: EmoteResponseGQL = await response.json();

      return responseEmotesData;
    };

    let emoteData: EmoteResponseGQL = await tryFetch();

    while (emoteData.errors) {
      if (tries > 5) {
        throw new Error(
          "Could not fetch emotes, try to use `bylink` instead or try again in a while"
        );
      }
      await sleep(2000);
      emoteData = await tryFetch();
    }

    const emotes: EmoteGQL[] = emoteData.data.emotes.items.map(
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
    else
      throw new Error(
        `Nothing found with \`${query}\` query\n\n**Some emotes are indexed as unlisted, which means that they can't be searched using this method, use \`/addemote bylink\` instead.** \n\n\n_HINT: If you want to add emote from chat, right click on it and select "Copy image address" and paste it as link value to \`/addemote bylink\` command._`
      );
  } catch (error) {
    console.log("⚠️");
    console.log(error);
    throw new Error(
      "There was an error fetching emotes, try again in a while."
    );
  }
};

export default searchEmote;
