import { formatBytes } from "@/lib/format-bytes";
import { isAnimatedWebp } from "@/lib/gif/webp-frames";
import { convertWebpToGif, WebpTooBigError } from "@/lib/gif/webp-to-gif";

import { saveToLibrary } from "./local-library";
import { loadMediaFile, MAX_FILE_BYTES, releaseMediaFile } from "./media-file";

type ImportOptions = {
  signal?: AbortSignal;
  /** What is happening, for a status line; only once it takes noticeable time. */
  onStatus?: (status: string) => void;
};

// A quick conversion opens without a status line flashing by
const STATUS_DELAY_MS = 300;

const toGifName = (fileName: string) =>
  `${fileName.replace(/\.[^.]+$/, "") || "image"}.gif`;

/**
 * An animated WebP becomes a GIF, so the GIF engine (gifsicle) edits every frame, as the
 * bot does when it stores an emote. Anything else, and a WebP the browser can't decode,
 * comes back as it was.
 */
const normalize = async (blob: Blob, fileName: string, options: ImportOptions) => {
  const buffer = await blob.arrayBuffer();
  if (!isAnimatedWebp(buffer)) return { blob, fileName };

  const started = performance.now();
  const gif = await convertWebpToGif(buffer, {
    maxBytes: MAX_FILE_BYTES,
    signal: options.signal,
    onProgress: (done, total) => {
      if (performance.now() - started < STATUS_DELAY_MS) return;
      options.onStatus?.(
        `converting the animated WebP to GIF, frame ${done} of ${total}`
      );
    },
  }).catch((error: unknown) => {
    if (!(error instanceof WebpTooBigError)) throw error;
    throw new Error(
      `as a GIF this animation is over ${formatBytes(MAX_FILE_BYTES)}, more than the editor takes. trim or shrink it first`
    );
  });
  if (!gif) return { blob, fileName };
  return { blob: new Blob([gif], { type: "image/gif" }), fileName: toGifName(fileName) };
};

/**
 * The one way files enter the editor (drop, paste, a link, "Edit in editor"): normalizes
 * the file, checks that the editor can open it and saves it to the local library.
 * Resolves to its library key.
 */
export const importToLibrary = async (
  blob: Blob,
  fileName: string,
  options: ImportOptions = {}
) => {
  const file = await normalize(blob, fileName, options);
  options.signal?.throwIfAborted();
  const media = await loadMediaFile(file.blob, file.fileName);
  releaseMediaFile(media);
  return saveToLibrary(file.blob, media, file.fileName);
};
