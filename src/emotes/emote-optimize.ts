import { optimizeBuffer } from "@/lib/buffer/optimize-buffer";

/** Bot-side wrapper so the bot and the API share one optimization pipeline. */
export const emoteOptimize = async (
  emoteBuffer: Buffer,
  options: {
    transform?: "square" | "center";
    skipReducingFrames?: boolean;
  } = {}
) => {
  const { transform, skipReducingFrames } = options;

  const fitting =
    transform === "center" ? "cover" : transform === "square" ? "fill" : undefined;

  const { buffer } = await optimizeBuffer(emoteBuffer, { fitting, skipReducingFrames });

  return buffer;
};
