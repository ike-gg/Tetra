export const bttvGetUrlById = (id: string) => {
  return `https://api.betterttv.net/3/emotes/${id}`;
};

export const bttvGetUrlByQuery = (query: string) => {
  return `https://api.betterttv.net/3/emotes/shared/search?query=${query}&offset=0&limit=100`;
};

export const bttvCdn = "https://cdn.betterttv.net/emote";
