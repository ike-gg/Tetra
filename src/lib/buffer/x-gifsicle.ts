import gifsiclebin from "gifsicle";
import isGif from "is-gif";
import prettyBytes from "pretty-bytes";
import sharp from "sharp";

import { execBunBuffer, execBunBufferSymbol } from "./x-gifsicle-support";

export type Arguments = (string | number | symbol)[];
export type FrameDimensions = {
  width: number;
  height: number;
};
export type CroppingPoints = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

interface ProcessOptions {
  saveToBuffer?: boolean;
}

/** Browsers and Discord play frames with delay < 20ms at 100ms. */
export const normalizeFrameDelay = (delayMs: number) => (delayMs < 20 ? 100 : delayMs);

/**
 * Keeps every `dropFactor`-th frame. Each kept frame gets the SUM of the delays
 * it replaces, so total duration and uneven timing are preserved.
 * Requires `-U` before the input.
 */
export const buildFrameDropArgs = (delaysMs: number[], dropFactor: number): Arguments => {
  const frames = delaysMs.length;
  const args: Arguments = [];

  let next = 0;
  for (let i = 0; i < frames; ) {
    next += dropFactor;
    const end = Math.min(frames, Math.max(i + 1, Math.round(next)));
    const groupDelayMs = delaysMs.slice(i, end).reduce((a, b) => a + b, 0);

    // gifsicle expects centiseconds
    args.push("--delay", Math.max(2, Math.round(groupDelayMs / 10)), `#${i}`);
    i = end;
  }

  return args;
};

export class xGifsicle {
  public fileBuffer: Buffer;

  get size() {
    return this.fileBuffer.byteLength;
  }

  get prettySize() {
    return prettyBytes(this.size);
  }

  constructor(gifBuffer: Buffer) {
    if (!Buffer.isBuffer(gifBuffer) || !isGif(gifBuffer)) {
      throw new Error("Invalid input");
    }
    this.fileBuffer = gifBuffer;
  }

  async stretchToFit() {
    const { height } = await this.metadata();
    const args: Arguments = ["--resize", `${height}x${height}`];
    await this.process(args);
    return this;
  }

  async centerCrop() {
    await this.crop(({ height, width }) => {
      const size = Math.min(height, width);
      const x1 = Math.floor((width - size) / 2);
      const y1 = Math.floor((height - size) / 2);
      const x2 = x1 + size;
      const y2 = y1 + size;

      return {
        x1,
        y1,
        x2,
        y2,
      };
    });
  }

  async resizeFit(maxSide: number) {
    const { width, height } = await this.metadata();
    if (width <= maxSide && height <= maxSide) return this;

    await this.process(["--resize-fit", `${maxSide}x${maxSide}`]);
    return this;
  }

  async lossy(lossyFactor: number) {
    const args: Arguments = [`--lossy=${lossyFactor}`];
    await this.process(args);
    return this;
  }

  async colors(colorsFactor: number) {
    await this.process(["--colors", colorsFactor]);
    return this;
  }

  async crop(
    croppingFn: (frameDimensions: FrameDimensions) => CroppingPoints
  ): Promise<xGifsicle>;
  async crop(cropping: CroppingPoints): Promise<xGifsicle>;
  async crop(
    croppingOrFn: CroppingPoints | ((frameDimensions: FrameDimensions) => CroppingPoints)
  ): Promise<xGifsicle> {
    let croppingString: string;

    if (typeof croppingOrFn === "function") {
      const { width, height } = await this.metadata();
      const { x1, x2, y1, y2 } = croppingOrFn({
        width,
        height,
      });
      croppingString = `${x1},${y1}-${x2},${y2}`;
    } else {
      const { x1, x2, y1, y2 } = croppingOrFn;
      croppingString = `${x1},${y1}-${x2},${y2}`;
    }

    const args: Arguments = ["--crop", croppingString];

    await this.process([], args);
    return this;
  }

  async scale(scaleFactor: number) {
    const args: Arguments = ["--scale", scaleFactor];
    await this.process(args);
    return this;
  }

  async cut(cut: [number, number]): Promise<xGifsicle>;
  async cut(cutFn: (totalFrames: number) => [number, number]): Promise<xGifsicle>;
  async cut(
    cutArrayOrFn: [number, number] | ((totalFrames: number) => [number, number])
  ): Promise<xGifsicle> {
    let cutString: string;

    if (typeof cutArrayOrFn === "function") {
      const { frames } = await this.metadata();
      const timestamps = cutArrayOrFn(frames);
      const safeTimestamps = timestamps.map((number) => Math.floor(number));
      cutString = `#${safeTimestamps[0]}-${safeTimestamps[1]}`;
    } else {
      const safeTimestamps = cutArrayOrFn.map((number) => Math.floor(number));
      cutString = `#${safeTimestamps[0]}-${safeTimestamps[1]}`;
    }

    const args: Arguments = ["--delete", cutString, "--done"];

    await this.process(args, ["-U"]);
    return this;
  }

  async frameRate(dropFactor: number) {
    if (dropFactor <= 1) return this;

    const { delays } = await this.metadata();
    await this.process(buildFrameDropArgs(delays, dropFactor), ["-U"]);
    return this;
  }

  async metadata() {
    const metadata = await sharp(this.fileBuffer, {
      animated: true,
    }).metadata();

    const frames = metadata.pages ?? 1;
    const width = metadata.width!;
    const height = metadata.pageHeight ?? metadata.height! / frames;

    const delays = Array.from({ length: frames }, (_, i) =>
      normalizeFrameDelay(metadata.delay?.[i] ?? 100)
    );
    const duration = delays.reduce((a, b) => a + b, 0);
    const fps = frames / (duration / 1000);
    const { size, prettySize } = this;

    return {
      delays,
      frames,
      height,
      width,
      duration,
      fps,
      size,
      prettySize,
    };
  }

  protected async process(
    _args: Arguments,
    _argsBeforeInput: Arguments = [],
    options: ProcessOptions = {
      saveToBuffer: true,
    }
  ): Promise<Buffer> {
    const args: Arguments = [
      "--no-warnings",
      ..._argsBeforeInput,
      execBunBufferSymbol.input,
      ..._args,
      "-O3",
      "-o",
      execBunBufferSymbol.output,
    ];

    const newBuffer = await execBunBuffer({
      input: this.fileBuffer,
      bin: gifsiclebin,
      args,
    });

    if (options.saveToBuffer) {
      this.fileBuffer = newBuffer;
    }

    return newBuffer;
  }
}
