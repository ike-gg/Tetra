import { buildCommands } from "@/lib/gif/gif-commands";
import { runGifsicle } from "@/lib/gif/gifsicle";
import { parseGif } from "@/lib/gif/parse-gif";
import { renderImage, type StillFormat } from "@/lib/image/render-image";

import type { Edit } from "./edit";
import type { MediaFile, MediaInfo } from "./media-file";

export type MediaRender = {
  url: string;
  blob: Blob;
  bytes: number;
  info: MediaInfo;
  // Without the dot, for the download's file name
  extension: string;
  // Shown next to the size, like "GIF" or "WebP"
  formatLabel: string;
};

export const STILL_FORMATS: readonly StillFormat[] = ["png", "webp", "jpeg"];

// What Discord emotes may be: core's upload endpoints take GIF, PNG and WebP data URLs
export const EMOTE_FORMATS: readonly StillFormat[] = ["png", "webp"];

const LABELS: Record<string, string> = { png: "PNG", webp: "WebP", jpeg: "JPEG" };
const EXTENSIONS: Record<string, string> = { png: "png", webp: "webp", jpeg: "jpg" };

const finish = (blob: Blob, info: MediaInfo, extension: string, formatLabel: string) => ({
  url: URL.createObjectURL(blob),
  blob,
  bytes: blob.size,
  info,
  extension,
  formatLabel,
});

export const renderMedia = async (
  source: MediaFile,
  edit: Edit,
  signal: AbortSignal,
  // Formats a still image may be encoded to; GIFs always stay GIFs
  formats: readonly StillFormat[] = STILL_FORMATS
): Promise<MediaRender> => {
  if (source.kind === "gif") {
    const [output] = await runGifsicle(
      source.buffer,
      buildCommands(source.info, edit),
      signal
    );
    if (!output) throw new Error("processing produced no file. try again");
    const blob = new Blob([output.file], { type: "image/gif" });
    return finish(blob, parseGif(await blob.arrayBuffer()), "gif", "GIF");
  }

  const result = await renderImage(source, edit, formats, signal);
  const blob = new Blob([result.file], { type: result.mime });
  return finish(
    blob,
    { width: result.width, height: result.height, frames: 1, delays: [0], duration: 0 },
    EXTENSIONS[result.format],
    LABELS[result.format]
  );
};
