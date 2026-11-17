import { applyPalette, GIFEncoder, quantize } from "gifenc";

// GIF has 1-bit transparency; anything at least half opaque keeps its color
const OPAQUE = 128;

// Delays under 2 cs play as 10 cs in browsers (the same rule `parseGif` applies)
export const toGifDelay = (microseconds: number | null) => {
  const centiseconds = Math.round((microseconds ?? 0) / 10_000);
  return centiseconds < 2 ? 10 : centiseconds;
};

// WebCodecs' repetitionCount counts extra plays like the NETSCAPE block; Infinity = forever
export const toGifRepeat = (repetitionCount: number) =>
  Number.isFinite(repetitionCount)
    ? repetitionCount <= 0
      ? -1
      : Math.min(Math.round(repetitionCount), 0xffff)
    : 0;

/**
 * Writes full, already composited RGBA frames as a GIF. Every frame gets its own palette
 * (255 colors from its opaque pixels + one transparent entry) and disposal "restore to
 * background", so transparent pixels never show the previous frame.
 */
export const createGifWriter = (width: number, height: number, repeat: number) => {
  const encoder = GIFEncoder();
  const pixels = width * height;

  return {
    addFrame(rgba: Uint8Array | Uint8ClampedArray, delayCs: number) {
      // Only opaque pixels pick the colors, so transparent ones don't take palette slots
      const opaque = new Uint8Array(pixels * 4);
      let count = 0;
      for (let i = 0; i < pixels; i++) {
        if (rgba[i * 4 + 3] < OPAQUE) continue;
        opaque.set(rgba.subarray(i * 4, i * 4 + 3), count * 4);
        opaque[count * 4 + 3] = 255;
        count++;
      }
      // quantize reads the whole underlying buffer, so it gets an exact copy
      const palette =
        count > 0 ? quantize(opaque.slice(0, count * 4), 255, { format: "rgb565" }) : [];
      const index =
        palette.length > 0
          ? applyPalette(rgba, palette, "rgb565")
          : new Uint8Array(pixels);
      const transparentIndex = palette.length;
      palette.push([0, 0, 0]);
      for (let i = 0; i < pixels; i++) {
        if (rgba[i * 4 + 3] < OPAQUE) index[i] = transparentIndex;
      }

      encoder.writeFrame(index, width, height, {
        palette,
        delay: delayCs * 10,
        transparent: true,
        transparentIndex,
        dispose: 2,
        repeat,
      });
    },
    get bytes() {
      return encoder.bytesView().length;
    },
    finish() {
      encoder.finish();
      return encoder.bytes();
    },
  };
};
