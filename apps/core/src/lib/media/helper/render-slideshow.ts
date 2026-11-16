import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { EmbeddedError } from "@/constants/errors";

import { runCommand } from "./run-command";

import { TempFileManager } from "#/files/temp-file-manager";
import { BotConsole } from "#/loggers";

const WIDTH = 720;
const HEIGHT = 1280;

const MAX_DURATION = 90;
const MIN_SLIDE = 2;
const MAX_SLIDE = 5;
const CYCLE_SLIDE = 4;
const SILENT_SLIDE = 3;

const RENDER_TIMEOUT_MS = 180_000;

export interface SlideshowPlan {
  /** Image index and seconds on screen, in playback order. */
  slides: { image: number; duration: number }[];
  total: number;
  loopAudio: boolean;
}

const fill = (count: number, perSlide: number, total: number) => {
  const slides: SlideshowPlan["slides"] = [];
  let elapsed = 0;

  for (let i = 0; elapsed < total - 0.01; i++) {
    const duration = Math.min(perSlide, total - elapsed);
    slides.push({ image: i % count, duration });
    elapsed += duration;
  }

  return slides;
};

/**
 * The audio drives the length (capped at 90 s). Slides last `audio / n`, clamped to
 * 2–5 s: shorter means 2 s each with the audio looped, longer means cycling at 4 s.
 */
export const planSlideshow = (count: number, audioDuration?: number): SlideshowPlan => {
  if (!audioDuration) {
    // Shorter than 3 s (not below 2 s) when that keeps every image within 90 s
    const perSlide = Math.max(MIN_SLIDE, Math.min(SILENT_SLIDE, MAX_DURATION / count));
    const total = Math.min(count * perSlide, MAX_DURATION);
    return { slides: fill(count, perSlide, total), total, loopAudio: false };
  }

  const audio = Math.min(audioDuration, MAX_DURATION);

  if (count === 1) {
    return { slides: [{ image: 0, duration: audio }], total: audio, loopAudio: false };
  }

  const perSlide = audio / count;

  if (perSlide < MIN_SLIDE) {
    const total = Math.min(count * MIN_SLIDE, MAX_DURATION);
    return { slides: fill(count, MIN_SLIDE, total), total, loopAudio: total > audio };
  }

  if (perSlide > MAX_SLIDE) {
    return { slides: fill(count, CYCLE_SLIDE, audio), total: audio, loopAudio: false };
  }

  return { slides: fill(count, perSlide, audio), total: audio, loopAudio: false };
};

const probeDuration = async (
  file: string,
  signal?: AbortSignal
): Promise<number | undefined> => {
  const result = await runCommand(
    [
      "ffprobe",
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      file,
    ],
    { timeoutMs: 15_000, signal }
  );

  const duration = Number.parseFloat(result.stdout.trim());
  return result.exitCode === 0 && Number.isFinite(duration) && duration >= 1
    ? duration
    : undefined;
};

/** Renders a 720x1280 H.264/AAC mp4 from images (and the post's audio, if any). */
export const renderSlideshow = async (
  images: Buffer[],
  audio?: Buffer,
  signal?: AbortSignal
) => {
  if (images.length === 0)
    throw new EmbeddedError("i couldn't find any images in this slideshow");

  const dir = TempFileManager.create();

  try {
    // Every frame is padded to the output size here, so ffmpeg only has to encode
    const imageNames = await Promise.all(
      images.map(async (image, index) => {
        const name = `${index}.jpg`;
        await sharp(image)
          .rotate()
          .resize({
            width: WIDTH,
            height: HEIGHT,
            fit: "contain",
            background: { r: 0, g: 0, b: 0 },
          })
          .flatten({ background: { r: 0, g: 0, b: 0 } })
          .jpeg({ quality: 90 })
          .toFile(path.join(dir, name));
        return name;
      })
    );

    const audioPath = path.join(dir, "audio");
    let audioDuration: number | undefined;
    if (audio) {
      fs.writeFileSync(audioPath, audio);
      audioDuration = await probeDuration(audioPath, signal);
    }

    const plan = planSlideshow(images.length, audioDuration);
    const single = plan.slides.length === 1;

    // The concat demuxer ignores the last entry's duration unless the file is repeated
    const last = plan.slides.at(-1);
    const list = [
      "ffconcat version 1.0",
      ...plan.slides.map(
        ({ image, duration }) => `file '${imageNames[image]}'\nduration ${duration}`
      ),
      ...(last ? [`file '${imageNames[last.image]}'`] : []),
    ].join("\n");
    fs.writeFileSync(path.join(dir, "slides.txt"), list);

    // Still images: few frames, sparse keyframes; x264 encodes repeated frames almost free
    const fps = single ? 1 : 10;
    const outputPath = path.join(dir, "slideshow.mp4");

    const result = await runCommand(
      [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "slides.txt",
        ...(audioDuration
          ? [...(plan.loopAudio ? ["-stream_loop", "-1"] : []), "-i", "audio"]
          : []),
        "-map",
        "0:v",
        ...(audioDuration ? ["-map", "1:a"] : []),
        "-vf",
        // JPEGs decode as full-range yuvj420p; players expect limited range
        `fps=${fps},scale=out_range=tv,format=yuv420p`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-tune",
        "stillimage",
        "-crf",
        "23",
        "-maxrate",
        "1000k",
        "-bufsize",
        "2000k",
        "-g",
        String(fps * 10),
        ...(audioDuration ? ["-c:a", "aac", "-b:a", "128k"] : []),
        "-t",
        plan.total.toFixed(3),
        "-movflags",
        "+faststart",
        "slideshow.mp4",
      ],
      { cwd: dir, timeoutMs: RENDER_TIMEOUT_MS, signal }
    );

    if (result.exitCode !== 0 || result.timedOut || !fs.existsSync(outputPath)) {
      BotConsole.warn("[media] slideshow render failed:", result.stderr.slice(-500));
      throw new EmbeddedError(
        "something broke on my side while making the slideshow. try again"
      );
    }

    return fs.readFileSync(outputPath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
