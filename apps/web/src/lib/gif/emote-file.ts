import { type GifInfo, parseGif } from "./parse-gif";

export type EmoteFile = {
  name: string;
  buffer: ArrayBuffer;
  info: GifInfo;
  bytes: number;
  // Object URL of the original; release it with `releaseEmoteFile`
  url: string;
};

// Past this the in-browser gifsicle gets slow and can run out of memory; the editor still
// opens such files but warns that it isn't built for them
export const LARGE_GIF_BYTES = 5 * 1024 * 1024;

const EMOTE_NAME_CHARS = /[^A-Za-z0-9_]/g;

// Discord emote names: 2–32 letters, numbers or underscores
export const emoteNameError = (name: string) => {
  if (name.length < 2) return "At least 2 characters.";
  if (name.length > 32) return "At most 32 characters.";
  if (!/^[A-Za-z0-9_]+$/.test(name)) return "Only letters, numbers and _.";
  return undefined;
};

const nameFromFile = (fileName: string) => {
  const name = fileName
    .replace(/\.[^.]+$/, "")
    .replace(EMOTE_NAME_CHARS, "_")
    .slice(0, 32);
  return name.length >= 2 ? name : "emote";
};

export const loadEmoteFile = async (blob: Blob, fileName: string): Promise<EmoteFile> => {
  const buffer = await blob.arrayBuffer();
  const info = parseGif(buffer);

  return {
    name: nameFromFile(fileName),
    buffer,
    info,
    bytes: buffer.byteLength,
    url: URL.createObjectURL(blob),
  };
};

export const releaseEmoteFile = (file: EmoteFile) => URL.revokeObjectURL(file.url);
