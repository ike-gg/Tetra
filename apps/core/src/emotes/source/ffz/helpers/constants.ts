export const ffzGetUrlById = (emoteId: string): string => {
  return `https://api.frankerfacez.com/v1/emote/${emoteId}`;
};

export const ffzGetUrlByQuery = (query: string): string => {
  return `https://api.frankerfacez.com/v1/emotes?q=${query}&per_page=200`;
};
