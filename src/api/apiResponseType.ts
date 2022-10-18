interface EmoteFileAPI {
  name: "1x" | "2x" | "3x" | "4x";
  static_name: "1x" | "2x" | "3x" | "4x";
  width: number;
  height: number;
  size: number;
  format: "AVIF" | "WEBP";
}

interface EmoteResponseAPI {
  id: string;
  name: string;
  animated: boolean;
  owner: {
    username: string;
    display_name: string;
  };
  host: {
    url: string;
    files: EmoteFileAPI[];
  };
}

export type { EmoteResponseAPI, EmoteFileAPI };
