import { type Edit, effectiveCrop, fillSide } from "@/lib/media/edit";
import type { MediaInfo } from "@/lib/media/media-file";

export type PlannedFrame = { index: number; delay: number };

// Keeps one frame per 1/fps slot of playback time; each kept frame shows for as long as
// the frames it replaces did, so dropping frames never changes the animation's tempo.
export const planFrames = (info: MediaInfo, { settings, trim }: Edit) => {
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

export const buildCommands = (info: MediaInfo, edit: Edit) => {
  const { settings } = edit;
  const crop = effectiveCrop(info, edit);
  const fill = fillSide(info, edit);
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
    settings.fitting === "fill"
      ? `--resize ${fill}x${fill}`
      : `--resize-fit ${settings.size}x${settings.size}`,
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

export const filmStripCommand = (info: MediaInfo, count: number, tile: number) => {
  const picks = Array.from(
    { length: Math.min(count, info.frames) },
    (_, i) => `#${Math.floor(((i + 0.5) * info.frames) / Math.min(count, info.frames))}`
  );
  return `-U --explode input.gif --resize-fit ${tile}x${tile} ${picks.join(" ")} -o /out/frame.gif`;
};
