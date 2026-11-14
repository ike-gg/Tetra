export type GifInfo = {
  width: number;
  height: number;
  frames: number;
  // Per frame, in centiseconds, as browsers play them
  delays: number[];
  // Seconds
  duration: number;
};

const colorTableSize = (packed: number) =>
  packed & 0x80 ? 3 * 2 ** ((packed & 0x07) + 1) : 0;

// Reads only the block structure (no LZW decoding), so it's instant even for large files
export const parseGif = (buffer: ArrayBuffer): GifInfo => {
  const bytes = new Uint8Array(buffer);
  const signature = String.fromCharCode(...bytes.subarray(0, 6));
  if (signature !== "GIF87a" && signature !== "GIF89a") {
    throw new Error("This file isn't a GIF.");
  }

  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  let offset = 13 + colorTableSize(bytes[10]);

  const skipSubBlocks = () => {
    while (offset < bytes.length) {
      const size = bytes[offset++];
      if (size === 0) return;
      offset += size;
    }
  };

  const delays: number[] = [];
  let pendingDelay = 0;

  while (offset < bytes.length) {
    const introducer = bytes[offset++];

    if (introducer === 0x3b) break;

    if (introducer === 0x21) {
      const label = bytes[offset++];
      if (label === 0xf9) pendingDelay = bytes[offset + 2] | (bytes[offset + 3] << 8);
      skipSubBlocks();
    } else if (introducer === 0x2c) {
      offset += 8;
      offset += 1 + colorTableSize(bytes[offset]);
      offset += 1;
      skipSubBlocks();
      delays.push(pendingDelay);
      pendingDelay = 0;
    } else {
      // Truncated or padded files are common; keep the frames read so far
      break;
    }
  }

  if (delays.length === 0) throw new Error("This GIF has no frames.");

  // Browsers play delays under 2 cs as 10 cs, so that's what the person actually sees
  const played = delays.map((delay) => (delay < 2 ? 10 : delay));

  return {
    width,
    height,
    frames: played.length,
    delays: played,
    duration: played.reduce((sum, delay) => sum + delay, 0) / 100,
  };
};
