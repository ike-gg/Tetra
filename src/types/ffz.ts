export interface FFZEmote {
  id: number;
  name: string;
  owner: {
    display_name: string;
  };
  urls: {
    1: string;
    2?: string;
    4?: string;
  };
  animated?: {
    1: string;
    2?: string;
    4?: string;
  };
}

export interface FFZResponseById {
  emote: FFZEmote;
}

export interface FFZResponseByQuery {
  _pages: number;
  _total: number;
  emoticons: FFZEmote[];
}
