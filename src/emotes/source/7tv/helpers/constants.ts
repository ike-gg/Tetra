export const stvGetUrlById = (id: string) => {
  return `https://7tv.io/v3/emotes/${id}`;
};

export const stvGetUrlByChannel = (channelId: string) => {
  return `https://7tv.io/v3/users/twitch/${channelId}`;
};

export const stvGetGraphqlUrl = "https://7tv.io/v3/gql";
