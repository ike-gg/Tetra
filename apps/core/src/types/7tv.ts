export interface STVEmoteFile {
  name: "1x" | "2x" | "3x" | "4x";
  static_name: "1x" | "2x" | "3x" | "4x";
  width: number;
  height: number;
  size: number;
  format: "AVIF" | "WEBP";
}

export interface STVEmote {
  id: string;
  name: string;
  animated: boolean;
  owner?: {
    display_name: string;
  };
  host: {
    url: string;
    files?: STVEmoteFile[];
  };
}

export interface STVSetEmotes {
  id: string;
  username: string;
  emote_set: {
    id: string;
    name: string;
    emotes: {
      id: string;
      data: STVEmote;
    }[];
  };
  emote_count: number;
  status_code?: number;
}

export interface STVResponseGQL {
  data: {
    emotes: {
      count: number;
      items: STVEmote[];
    };
  } | null;
  errors?: {
    message: string;
    // Syntax and validation errors only have `locations`; errors from the backend also
    // have `path` and/or `extensions`.
    locations?: unknown[];
    path?: unknown[];
    extensions?: unknown;
  }[];
}
