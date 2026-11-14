import sharp from "sharp";

import { UnsupportedEmoteFileError } from "@/constants/errors";

const DISCORD_STATIC_FORMATS = ["png", "jpeg", "gif", "webp"];

export interface NormalizedEmoteBuffer {
  buffer: Buffer;
  animated: boolean;
  format: string;
}

/**
 * Animations -> GIF (gifsicle only handles GIF), unusual static formats -> PNG.
 * Whether an emote is animated is read from the file, not from MIME type or source.
 */
export const normalizeEmoteBuffer = async (
  buffer: Buffer
): Promise<NormalizedEmoteBuffer> => {
  let metadata: sharp.Metadata;

  try {
    metadata = await sharp(buffer, { animated: true }).metadata();
  } catch {
    throw new UnsupportedEmoteFileError();
  }

  const format = metadata.format ?? "unknown";
  const animated = (metadata.pages ?? 1) > 1;

  if (animated) {
    if (format === "gif") return { buffer, animated, format };

    const gif = await sharp(buffer, { animated: true }).gif().toBuffer();
    return { buffer: gif, animated, format: "gif" };
  }

  if (DISCORD_STATIC_FORMATS.includes(format)) {
    return { buffer, animated, format };
  }

  const png = await sharp(buffer).png().toBuffer();
  return { buffer: png, animated, format: "png" };
};
