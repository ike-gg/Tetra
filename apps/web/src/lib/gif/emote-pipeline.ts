import type { GifInfo } from "./parse-gif";

export const DISCORD_EMOTE_LIMIT = 256 * 1024;

export type EmoteSettings = {
  // Longest side in px; never upscales
  size: number;
  fps: number;
  colors: number;
  // 0–100, mapped to gifsicle's --lossy 0–200
  compression: number;
  speed: number;
  // Cut fully transparent borders shared by every frame
  trimEdges: boolean;
};

export type Crop = { x: number; y: number; width: number; height: number };
// First and last kept frame, inclusive
export type Trim = [start: number, end: number];

export type EmoteEdit = { settings: EmoteSettings; crop: Crop | null; trim: Trim };

const MAX_FPS = 50;

export const sourceFps = (info: GifInfo) =>
  Math.min(MAX_FPS, Math.round(info.frames / info.duration));

export const sizeRange = (info: GifInfo) => {
  const longest = Math.max(info.width, info.height);
  return { min: Math.min(16, longest), max: Math.min(longest, 512) };
};

export const defaultSettings = (info: GifInfo): EmoteSettings => ({
  size: Math.min(128, sizeRange(info).max),
  fps: sourceFps(info),
  colors: 256,
  compression: 0,
  speed: 1,
  trimEdges: false,
});

export const defaultEdit = (info: GifInfo): EmoteEdit => ({
  settings: defaultSettings(info),
  crop: null,
  trim: [0, info.frames - 1],
});

export type PlannedFrame = { index: number; delay: number };

// Keeps one frame per 1/fps slot of playback time; each kept frame shows for as long as
// the frames it replaces did, so dropping frames never changes the animation's tempo.
export const planFrames = (info: GifInfo, { settings, trim }: EmoteEdit) => {
  const slot = 1 / Math.max(1, settings.fps);
  const kept: PlannedFrame[] = [];
  let time = 0;
  let nextSlot = 0;

  for (let index = trim[0]; index <= trim[1]; index++) {
    const delay = info.delays[index] / 100;
    if (time + 1e-6 >= nextSlot) {
      kept.push({ index, delay: 0 });
      while (nextSlot <= time + 1e-6) nextSlot += slot;
    }
    kept[kept.length - 1].delay += delay;
    time += delay;
  }

  // Browsers play delays under 2 cs as 10 cs, which would slow the GIF down instead
  return kept.map((frame) => ({
    index: frame.index,
    delay: Math.max(2, Math.round((frame.delay * 100) / settings.speed)),
  }));
};

export const buildCommands = (info: GifInfo, edit: EmoteEdit) => {
  const { settings, crop } = edit;
  const frames = planFrames(info, edit)
    .map(({ index, delay }) => `-d${delay} #${index}`)
    .join(" ");

  const before = [
    "-U",
    crop &&
      `--crop ${Math.round(crop.x)},${Math.round(crop.y)}+${Math.round(crop.width)}x${Math.round(crop.height)}`,
    settings.trimEdges && "--crop-transparency",
  ];
  const after = [
    `--resize-fit ${settings.size}x${settings.size}`,
    settings.colors < 256 && `--colors ${settings.colors}`,
    settings.compression > 0 && `--lossy=${settings.compression * 2}`,
    "-O3",
  ];

  return [
    `-U input.gif ${frames} -o /tem/frames.gif`,
    [...before, "/tem/frames.gif", ...after, "-o /out/emote.gif"]
      .filter(Boolean)
      .join(" "),
  ];
};

export const filmStripCommand = (info: GifInfo, count: number, tile: number) => {
  const picks = Array.from(
    { length: Math.min(count, info.frames) },
    (_, i) => `#${Math.floor(((i + 0.5) * info.frames) / Math.min(count, info.frames))}`
  );
  return `-U --explode input.gif --resize-fit ${tile}x${tile} ${picks.join(" ")} -o /out/frame.gif`;
};

// One step of quality traded for size, in the order people notice least.
// Returns null when there's nothing left to give.
export const reduceStep = (
  info: GifInfo,
  settings: EmoteSettings
): EmoteSettings | null => {
  if (settings.compression < 60) {
    return { ...settings, compression: Math.min(60, settings.compression + 20) };
  }
  const minFps = Math.min(12, sourceFps(info));
  if (settings.fps > minFps) {
    return { ...settings, fps: Math.max(minFps, Math.floor(settings.fps * 0.75)) };
  }
  if (settings.colors > 64) return { ...settings, colors: settings.colors / 2 };
  if (settings.compression < 100) return { ...settings, compression: 100 };
  const minSize = Math.min(48, sizeRange(info).max);
  if (settings.size > minSize) {
    return { ...settings, size: Math.max(minSize, Math.round(settings.size * 0.8)) };
  }
  return null;
};
