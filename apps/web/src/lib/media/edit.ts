import type { MediaFile, MediaInfo } from "./media-file";

// Discord's emote limit, the same on every server. The editor works for any image, this is
// just the target it measures against.
export const DISCORD_EMOTE_LIMIT = 256 * 1024;

// Output format for still images; GIFs always stay GIFs
export type OutputFormat = "auto" | "png" | "webp" | "jpeg";

export type EditSettings = {
  // Longest side in px; never upscales
  size: number;
  fps: number;
  colors: number;
  // 0–100. GIF: gifsicle --lossy 0–200. Images: 0 is lossless, above that lowers quality.
  compression: number;
  speed: number;
  // Cut fully transparent borders (shared by every frame of a GIF)
  trimEdges: boolean;
  fitting: Fitting;
  format: OutputFormat;
};

// How a non-square image becomes an emote, as in the bot (`optimizeBuffer`): keep its
// shape, crop the middle square, or stretch it into a square
export type Fitting = "contain" | "cover" | "fill";

export type Crop = { x: number; y: number; width: number; height: number };
// First and last kept frame, inclusive
export type Trim = [start: number, end: number];

export type Edit = { settings: EditSettings; crop: Crop | null; trim: Trim };

const MAX_FPS = 50;

export const sourceFps = (info: MediaInfo) =>
  info.frames > 1 ? Math.min(MAX_FPS, Math.round(info.frames / info.duration)) : 1;

export const sizeRange = (info: MediaInfo) => {
  const longest = Math.max(info.width, info.height);
  return { min: Math.min(16, longest), max: longest };
};

// Starts from the original, untouched: the editor isn't only for emotes, and "Fit
// automatically" is one click away when it has to fit Discord
export const defaultSettings = (info: MediaInfo): EditSettings => ({
  size: sizeRange(info).max,
  fps: sourceFps(info),
  colors: 256,
  compression: 0,
  speed: 1,
  trimEdges: false,
  fitting: "contain",
  format: "auto",
});

const fullArea = (info: MediaInfo): Crop => ({
  x: 0,
  y: 0,
  width: info.width,
  height: info.height,
});

// The middle square of an area (or the whole image); null when that's the whole image
export const squareInside = (info: MediaInfo, crop: Crop | null): Crop | null => {
  const area = crop ?? fullArea(info);
  const side = Math.min(area.width, area.height);
  const square = {
    x: area.x + (area.width - side) / 2,
    y: area.y + (area.height - side) / 2,
    width: side,
    height: side,
  };
  const whole =
    square.x === 0 && square.y === 0 && side === info.width && side === info.height;
  return whole ? null : square;
};

// The area that ends up in the result. "cover" keeps its crop square (the editor sets it
// when switching), this only guards against older saved edits with a non-square crop.
export const effectiveCrop = (info: MediaInfo, { crop, settings }: Edit): Crop | null => {
  if (settings.fitting !== "cover") return crop;
  const area = crop ?? fullArea(info);
  return Math.round(area.width) === Math.round(area.height)
    ? crop
    : squareInside(info, crop);
};

// Side of the square "fill" squeezes the area into: the size setting, never larger than
// the area's longer side
export const fillSide = (info: MediaInfo, edit: Edit) => {
  const area = effectiveCrop(info, edit) ?? fullArea(info);
  return Math.max(
    1,
    Math.min(edit.settings.size, Math.round(Math.max(area.width, area.height)))
  );
};

// Dimensions before fitting (the crop) and after (fitting + size), for the Fitting hint.
// The result can still differ slightly with "Trim empty edges".
export const predictDimensions = (info: MediaInfo, edit: Edit) => {
  const crop = edit.crop ?? fullArea(info);
  const area = effectiveCrop(info, edit) ?? fullArea(info);
  if (edit.settings.fitting === "fill") {
    const side = fillSide(info, edit);
    return { from: crop, to: { width: side, height: side } };
  }
  const scale = Math.min(1, edit.settings.size / Math.max(area.width, area.height));
  return {
    from: crop,
    to: {
      width: Math.max(1, Math.round(area.width * scale)),
      height: Math.max(1, Math.round(area.height * scale)),
    },
  };
};

export const defaultEdit = (info: MediaInfo): Edit => ({
  settings: defaultSettings(info),
  crop: null,
  trim: [0, info.frames - 1],
});

// Saved settings come from an older version of the editor at worst: fill in what's
// missing and keep the trim inside the file
export const restoreEdit = (
  info: MediaInfo,
  saved: Partial<Edit> | null | undefined
): Edit => {
  const fallback = defaultEdit(info);
  if (!saved) return fallback;
  const last = info.frames - 1;
  const start = Math.min(Math.max(0, saved.trim?.[0] ?? 0), last);
  const end = Math.min(Math.max(start, saved.trim?.[1] ?? last), last);
  return {
    settings: { ...fallback.settings, ...saved.settings },
    crop: saved.crop ?? null,
    trim: [start, end],
  };
};

// One step of quality traded for size, in the order people notice least.
// Returns null when there's nothing left to give.
export const reduceStep = (
  source: MediaFile,
  settings: EditSettings
): EditSettings | null => {
  const { info } = source;
  const minSize = Math.min(48, sizeRange(info).max);
  const smaller = () =>
    settings.size > minSize
      ? { ...settings, size: Math.max(minSize, Math.round(settings.size * 0.8)) }
      : null;

  if (source.kind === "image") {
    // Lossy WebP/JPEG beats lossless PNG by far; "auto" picks it once compression is on
    if (settings.compression < 60) {
      return { ...settings, compression: Math.min(60, settings.compression + 20) };
    }
    if (settings.format === "png") return { ...settings, format: "auto" };
    return smaller();
  }

  if (settings.compression < 60) {
    return { ...settings, compression: Math.min(60, settings.compression + 20) };
  }
  const minFps = Math.min(12, sourceFps(info));
  if (settings.fps > minFps) {
    return { ...settings, fps: Math.max(minFps, Math.floor(settings.fps * 0.75)) };
  }
  if (settings.colors > 64) return { ...settings, colors: settings.colors / 2 };
  if (settings.compression < 100) return { ...settings, compression: 100 };
  return smaller();
};
