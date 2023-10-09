import prettyBytes from "pretty-bytes";
import sharp from "sharp";

const isGif = require("is-gif");
const xgifsicle = require("gifsicle");
const execBuffer = require("exec-buffer");

type Arguments = (string | number)[];
type FrameDimensions = { width: number; height: number };
type CroppingPoints = { x1: number; y1: number; x2: number; y2: number };

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

  async resizeToFit(width: number, height: number) {
    const args: Arguments = ["--resize", `${width}x${height}`];
    await this.process(args);
    return this;
  }

  async lossy(lossyFactor: number) {
    const args: Arguments = [`--lossy=${lossyFactor}`];
    await this.process(args);
    return this;
  }

  async colors(colorsFactor: number) {
    const args: Arguments = ["--colors", colorsFactor];
    await this.process(args);
    return this;
  }

  async crop(
    croppingFn: (frameDimensions: FrameDimensions) => CroppingPoints
  ): Promise<xGifsicle>;
  async crop(cropping: CroppingPoints): Promise<xGifsicle>;
  async crop(
    croppingOrFn:
      | CroppingPoints
      | ((frameDimensions: FrameDimensions) => CroppingPoints)
  ): Promise<xGifsicle> {
    let croppingString: string;

    if (typeof croppingOrFn === "function") {
      const { width, height } = await this.metadata();
      const { x1, x2, y1, y2 } = croppingOrFn({ width, height });
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
  async cut(
    cutFn: (totalFrames: number) => [number, number]
  ): Promise<xGifsicle>;
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

  async frameRate(delayFactor: number) {
    const { frames, delay } = await this.metadata();

    const args: Arguments = ["-U"];

    const newDelay = Math.floor(delay * delayFactor);
    for (let x = 0; x <= frames; x += delayFactor) {
      args.push(`--delay`);
      args.push(newDelay);
      args.push(`#${Math.floor(x)}`);
    }

    await this.process(args, ["-U"]);
    return this;
  }

  async metadata() {
    const metadata = await sharp(this.fileBuffer, {
      animated: true,
    }).metadata();

    const delay = metadata.delay![0] / 10;
    const frames = metadata.pages!;
    const height = metadata.height! / frames;
    const width = metadata.width!;

    return { delay, frames, height, width };
  }

  private async process(_args: Arguments, _argsBeforeInput: Arguments = []) {
    const args: Arguments = [
      "--no-warnings",
      ..._argsBeforeInput,
      execBuffer.input,
      ..._args,
      "-O3",
      "-o",
      execBuffer.output,
    ];
    try {
      this.fileBuffer = await execBuffer({
        input: this.fileBuffer,
        bin: xgifsicle,
        args,
      });
    } catch (err: any) {
      err.message = err.stderr || err.message;
      throw new Error(err);
    }
  }
}
