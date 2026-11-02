import { MAX_EMOTE_SIZE } from "@/constants";
import { EmbeddedError } from "@/constants/errors";

import { Arguments, buildFrameDropArgs, xGifsicle } from "./xGifsicle";

/** Discord stores and displays emotes at max 128px anyway. */
export const EMOTE_MAX_SIDE = 128;

const MIN_FPS_AFTER_DROP = 10;

interface Preset {
  lossy: number;
  colors?: number;
  /** keep every n-th frame */
  drop?: number;
  scale?: number;
}

/**
 * Ordered from mildest to most aggressive. Each preset is rendered in a single
 * gifsicle call from the same base buffer, so quality loss doesn't stack up.
 * Lossy comes first: biggest size win for the smallest visual cost.
 */
const PRESETS: Preset[] = [
  { lossy: 30 },
  { lossy: 60 },
  { lossy: 90 },
  { lossy: 90, colors: 192 },
  { lossy: 120, colors: 128 },
  { lossy: 120, colors: 128, drop: 2 },
  { lossy: 150, colors: 96, drop: 2 },
  { lossy: 150, colors: 96, drop: 2, scale: 0.85 },
  { lossy: 180, colors: 64, drop: 2, scale: 0.75 },
  { lossy: 200, colors: 64, drop: 3, scale: 0.65 },
  { lossy: 200, colors: 48, drop: 3, scale: 0.5 },
];

interface AutoXGifsicleOptions {
  finalSize: number;
  maxSide: number;
  skipReducingFrames: boolean;
}

const defaultOptions: AutoXGifsicleOptions = {
  finalSize: MAX_EMOTE_SIZE,
  maxSide: EMOTE_MAX_SIDE,
  skipReducingFrames: false,
};

export class AutoXGifsicle extends xGifsicle {
  private finalSize: number;
  private maxSide: number;
  private skipReducingFrames: boolean;

  constructor(gifBuffer: Buffer, options?: Partial<AutoXGifsicleOptions>) {
    const { finalSize, maxSide, skipReducingFrames } = {
      ...defaultOptions,
      ...options,
    };

    super(gifBuffer);
    this.finalSize = finalSize;
    this.maxSide = maxSide;
    this.skipReducingFrames = skipReducingFrames;
  }

  private effectiveDrop(drop: number | undefined, fps: number) {
    if (!drop || drop <= 1 || this.skipReducingFrames) return 1;
    const maxDrop = Math.max(1, Math.floor(fps / MIN_FPS_AFTER_DROP));
    return Math.min(drop, maxDrop);
  }

  private async renderPreset(preset: Preset, delays: number[]) {
    const args: Arguments = [];
    const argsBeforeInput: Arguments = [];

    if (preset.drop && preset.drop > 1) {
      argsBeforeInput.push("-U");
      args.push(...buildFrameDropArgs(delays, preset.drop));
    }
    if (preset.scale) args.push("--scale", preset.scale);
    if (preset.colors) args.push("--colors", preset.colors);
    args.push(`--lossy=${preset.lossy}`);

    return this.process(args, argsBeforeInput, { saveToBuffer: false });
  }

  async optimize() {
    if (this.size <= this.finalSize) return this;

    await this.resizeFit(this.maxSide);
    if (this.size <= this.finalSize) return this;

    // binary search for the mildest preset that fits
    const { delays, fps } = await this.metadata();
    const presets = PRESETS.map((preset) => ({
      ...preset,
      drop: this.effectiveDrop(preset.drop, fps),
    }));

    const rendered = new Map<number, Buffer>();
    let lo = 0;
    let hi = presets.length - 1;
    let best = -1;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const buffer = await this.renderPreset(presets[mid], delays);
      rendered.set(mid, buffer);

      if (buffer.byteLength <= this.finalSize) {
        best = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }

    if (best === -1) {
      throw new EmbeddedError({
        title: "Emote is too large",
        description:
          "Tetra couldn't compress this animation under Discord's 256 KB limit without destroying it. Try a shorter clip or fewer frames.",
      });
    }

    this.fileBuffer = rendered.get(best)!;
    return this;
  }
}
