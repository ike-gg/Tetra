//types for searching VIA ID

export interface EmoteFileAPI {
  name: "1x" | "2x" | "3x" | "4x";
  static_name: "1x" | "2x" | "3x" | "4x";
  width: number;
  height: number;
  size: number;
  format: "AVIF" | "WEBP";
}

export interface EmoteResponseAPI {
  id: string;
  name: string;
  animated: boolean;
  owner?: {
    username: string;
    display_name: string;
  };
  host: {
    url: string;
    files: EmoteFileAPI[];
  };
  error?: string;
}

//types for searching via name

export interface EmoteGQL {
  id: string;
  name: string;
  animated: boolean;
  owner?: {
    display_name: string;
  };
  host: {
    url: string;
  };
}

export interface EmoteResponseGQL {
  data: {
    emotes: {
      count: number;
      items: EmoteGQL[];
    };
  };
}
