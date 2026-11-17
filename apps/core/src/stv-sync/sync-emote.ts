import {
  ACTIVE_EMOTE_FLAG_ZERO_WIDTH,
  type ActiveEmote,
  EMOTE_FLAG_SENSITIVE,
  EMOTE_FLAG_ZERO_WIDTH,
} from "./event-api/messages";
import type { FilterableEmote } from "./settings";

/** Everything the add flow needs, also stored in review so a retry needs no 7TV call. */
export interface SyncEmoteSource {
  stvEmoteId: string;
  /** The alias in the streamer's set. */
  name: string;
  /** 7TV's flag; the add flow reads the real value from the file. */
  animated: boolean;
  fileUrl: string;
  previewUrl: string;
  width: number | null;
  height: number | null;
  author: string | null;
}

const SIZES = ["4x", "3x", "2x", "1x"];

/** 4x is 128 px high (Discord's maximum); GIF for animations (gifsicle), PNG otherwise. */
const pickFile = (
  animated: boolean,
  files: { name: string; width: number; height: number }[]
) => {
  const formats = animated ? ["gif", "webp"] : ["png", "webp"];
  for (const format of formats) {
    for (const size of SIZES) {
      const file = files.find((candidate) => candidate.name === `${size}.${format}`);
      if (file) return file;
    }
  }
  return { name: `4x.${animated ? "gif" : "png"}`, width: null, height: null };
};

/** Null when 7TV sent the emote without its data (deleted emote). */
export const toSyncEmote = (
  emote: ActiveEmote
): {
  source: SyncEmoteSource;
  filterable: FilterableEmote;
} | null => {
  const { data } = emote;
  if (!data) return null;

  const base = `https:${data.host.url.replace(/^https?:/, "")}`;
  const file = pickFile(data.animated, data.host.files ?? []);
  const owner = data.owner ?? null;

  return {
    source: {
      stvEmoteId: emote.id,
      name: emote.name,
      animated: data.animated,
      fileUrl: `${base}/${file.name}`,
      previewUrl: `${base}/2x.webp`,
      width: file.width,
      height: file.height,
      author: owner?.username ?? null,
    },
    filterable: {
      id: emote.id,
      animated: data.animated,
      zeroWidth:
        ((emote.flags ?? 0) & ACTIVE_EMOTE_FLAG_ZERO_WIDTH) !== 0 ||
        ((data.flags ?? 0) & EMOTE_FLAG_ZERO_WIDTH) !== 0,
      nsfw: ((data.flags ?? 0) & EMOTE_FLAG_SENSITIVE) !== 0,
    },
  };
};
