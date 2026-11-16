const colorTableSize = (packed: number) =>
  packed & 0x80 ? 3 * 2 ** ((packed & 0x07) + 1) : 0;

/**
 * True when a frame has its own color table and a transparent index (gif.ski output,
 * common on 7TV): every frame is a patch over the previous one, and gifsicle can't
 * unoptimize that ("GIF too complex to unoptimize"), so `-U` silently does nothing.
 * Reads only the block structure (no LZW decoding).
 */
export const hasLocalPalettePatches = (bytes: Uint8Array): boolean => {
  if (bytes.length < 13) return false;

  let offset = 13 + colorTableSize(bytes[10]);
  let pendingTransparent = false;

  const skipSubBlocks = () => {
    while (offset < bytes.length) {
      const size = bytes[offset++];
      if (size === 0) return;
      offset += size;
    }
  };

  while (offset < bytes.length) {
    const introducer = bytes[offset++];

    if (introducer === 0x21) {
      const label = bytes[offset++];
      if (label === 0xf9) pendingTransparent = (bytes[offset + 1] & 0x01) === 1;
      skipSubBlocks();
    } else if (introducer === 0x2c) {
      offset += 8;
      const localTable = colorTableSize(bytes[offset]);
      if (localTable > 0 && pendingTransparent) return true;
      offset += 2 + localTable;
      skipSubBlocks();
      pendingTransparent = false;
    } else {
      // trailer, or a truncated/padded file
      return false;
    }
  }

  return false;
};
