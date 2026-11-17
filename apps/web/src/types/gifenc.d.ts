// Only the part we use: per-frame palettes in src/lib/gif/gif-writer.ts
declare module "gifenc" {
  type Color = number[];
  type Format = "rgb565" | "rgb444" | "rgba4444";

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: Format }
  ): Color[];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Color[],
    format?: Format
  ): Uint8Array;

  export function GIFEncoder(): {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options: {
        palette: Color[];
        // Milliseconds, rounded to centiseconds
        delay?: number;
        transparent?: boolean;
        transparentIndex?: number;
        // -1 = play once, 0 = forever, n = n extra plays
        repeat?: number;
        dispose?: number;
      }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  };
}
