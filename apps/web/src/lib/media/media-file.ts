import { toDiscordEmoteName } from "@/lib/emote";
import { parseGif } from "@/lib/gif/parse-gif";

export type MediaInfo = {
  width: number;
  height: number;
  frames: number;
  // Per frame, in centiseconds, as browsers play them; [0] for still images
  delays: number[];
  // Seconds; 0 for still images
  duration: number;
};

export type MediaKind = "gif" | "image";

export type MediaFile = {
  kind: MediaKind;
  mime: string;
  name: string;
  buffer: ArrayBuffer;
  info: MediaInfo;
  bytes: number;
  // Object URL of the original; release it with `releaseMediaFile`
  url: string;
};

export const ACCEPTED_TYPES = [
  ".gif",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  "image/gif",
  "image/png",
  "image/jpeg",
  "image/webp",
];

// Past this processing in the browser gets slow and can run out of memory; the editor
// still opens such files but warns that it isn't built for them
export const LARGE_FILE_BYTES = 5 * 1024 * 1024;

// Discord emote names: 2–32 letters, numbers or underscores
export const emoteNameError = (name: string) => {
  if (name.length < 2) return "At least 2 characters.";
  if (name.length > 32) return "At most 32 characters.";
  if (!/^[A-Za-z0-9_]+$/.test(name)) return "Only letters, numbers and _.";
  return undefined;
};

// Characters file systems reject; everything else is fine in a downloaded file's name
export const fileNameError = (name: string) => {
  if (name.trim().length === 0) return "Enter a name.";
  if (/[/\\:*?"<>|]/.test(name)) return 'Leave out / \\ : * ? " < > |';
  return undefined;
};

// Starts as a valid emote name, also when the editor isn't in emote mode: it's a fine
// file name too. A name with no letters or digits left becomes "emote".
const nameFromFile = (fileName: string) => {
  const name = toDiscordEmoteName(fileName.replace(/\.[^.]+$/, ""));
  return /[A-Za-z0-9]/.test(name) ? name : "emote";
};

const isGif = (bytes: Uint8Array) =>
  String.fromCharCode(...bytes.subarray(0, 3)) === "GIF";

const readImageSize = async (blob: Blob) => {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    throw new Error("This file can't be opened as an image.");
  }
};

// Sniffs the content instead of trusting the extension, so a GIF renamed to .png still
// goes through gifsicle and keeps its animation
export const loadMediaFile = async (blob: Blob, fileName: string): Promise<MediaFile> => {
  const buffer = await blob.arrayBuffer();
  const gif = isGif(new Uint8Array(buffer, 0, Math.min(3, buffer.byteLength)));

  const info: MediaInfo = gif
    ? parseGif(buffer)
    : { ...(await readImageSize(blob)), frames: 1, delays: [0], duration: 0 };

  return {
    kind: gif ? "gif" : "image",
    mime: gif ? "image/gif" : blob.type || "image/png",
    name: nameFromFile(fileName),
    buffer,
    info,
    bytes: buffer.byteLength,
    url: URL.createObjectURL(blob),
  };
};

export const releaseMediaFile = (file: MediaFile) => URL.revokeObjectURL(file.url);
