const fourCc = (bytes: Uint8Array, at: number) =>
  String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);

const ANIMATION_FLAG = 0x02;

/**
 * Frames of a WebP, read from its RIFF chunks without decoding: the number of `ANMF`
 * chunks when the file is animated (`VP8X` animation flag or `ANMF` chunks), else 1.
 * 0 when the bytes aren't a WebP. Only the chunk headers are read, so it's cheap.
 */
export const webpFrameCount = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12 || fourCc(bytes, 0) !== "RIFF" || fourCc(bytes, 8) !== "WEBP") {
    return 0;
  }
  const view = new DataView(buffer);
  let flagged = false;
  let frames = 0;
  // Chunks: FourCC, little-endian size, data padded to an even length
  for (let at = 12; at + 8 <= bytes.length; ) {
    const type = fourCc(bytes, at);
    const size = view.getUint32(at + 4, true);
    if (type === "VP8X" && at + 8 < bytes.length) {
      flagged = (bytes[at + 8] & ANIMATION_FLAG) !== 0;
    } else if (type === "ANMF") {
      frames++;
    }
    at += 8 + size + (size % 2);
  }
  return flagged || frames > 0 ? Math.max(frames, 1) : 1;
};

/** Whether the bytes are a WebP with more than one frame. */
export const isAnimatedWebp = (buffer: ArrayBuffer) => webpFrameCount(buffer) > 1;
