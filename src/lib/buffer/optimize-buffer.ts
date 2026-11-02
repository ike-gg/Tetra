import prettyBytes from "pretty-bytes";
import sharp from "sharp";

import { MAX_EMOTE_SIZE } from "@/constants";
import { EmbeddedError } from "@/constants/errors";
import { AutoXGifsicle, EMOTE_MAX_SIDE } from "@/lib/buffer/AutoXGifsicle";
import { normalizeEmoteBuffer } from "@/lib/buffer/normalize-emote-buffer";
import { FittingOption } from "@/types";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

import { CoreConsole } from "#/loggers";

interface OptimizeBufferOptions {
  targetSize: number;
  feedback?: FeedbackManager;
  fitting?: FittingOption;
  skipReducingFrames?: boolean;
}

const defaultOptions: OptimizeBufferOptions = {
  targetSize: MAX_EMOTE_SIZE,
};

const optimizeAnimated = async (
  buffer: Buffer,
  { fitting, targetSize, skipReducingFrames }: OptimizeBufferOptions
) => {
  const gif = new AutoXGifsicle(buffer, {
    finalSize: targetSize,
    skipReducingFrames,
  });

  if (fitting === "cover") await gif.centerCrop();
  if (fitting === "fill") await gif.stretchToFit();

  await gif.optimize();

  return gif.fileBuffer;
};

const optimizeStatic = async (
  buffer: Buffer,
  { fitting, targetSize }: OptimizeBufferOptions
) => {
  const isSquareFitting = fitting === "cover" || fitting === "fill";

  if (!isSquareFitting && buffer.byteLength <= targetSize) return buffer;

  const { width = 1, height = 1 } = await sharp(buffer).metadata();
  const image = sharp(buffer, { animated: false });

  if (isSquareFitting) {
    const side = Math.min(Math.max(width, height), EMOTE_MAX_SIDE);
    image.resize({ fit: fitting, width: side, height: side });
  } else {
    image.resize({
      fit: "inside",
      width: EMOTE_MAX_SIDE,
      height: EMOTE_MAX_SIDE,
      withoutEnlargement: true,
    });
  }

  const resized = await image.png({ compressionLevel: 9 }).toBuffer();
  if (resized.byteLength <= targetSize) return resized;

  const paletted = await sharp(resized).png({ palette: true, compressionLevel: 9 }).toBuffer();
  if (paletted.byteLength <= targetSize) return paletted;

  throw new EmbeddedError({
    title: "Emote is too large",
    description: "Tetra couldn't compress this image under Discord's 256 KB limit.",
  });
};

export const optimizeBuffer = async (
  entryBuffer: Buffer,
  options?: Partial<OptimizeBufferOptions>
) => {
  const config = { ...defaultOptions, ...options };

  await config.feedback?.warning("Processing your emote ⏳");

  const { buffer, animated } = await normalizeEmoteBuffer(entryBuffer);

  const processedBuffer = animated
    ? await optimizeAnimated(buffer, config)
    : await optimizeStatic(buffer, config);

  CoreConsole.dev.info(
    "Optimized buffer from ",
    prettyBytes(entryBuffer.byteLength),
    " to ",
    prettyBytes(processedBuffer.byteLength)
  );

  const metadata = await sharp(processedBuffer).metadata();

  return { buffer: processedBuffer, metadata };
};
