import { useEffect, useState } from "react";

import { filmStripCommand } from "@/lib/gif/gif-commands";
import { runGifsicle } from "@/lib/gif/gifsicle";
import type { MediaFile } from "@/lib/media/media-file";

export const FILM_STRIP_FRAMES = 16;
export const FILM_STRIP_TILE = 56;

// Evenly spaced still frames for the trim timeline, extracted once per file
export function useFilmStrip(source: MediaFile) {
  const [frames, setFrames] = useState<string[]>([]);

  useEffect(() => {
    if (source.kind !== "gif") return;
    const controller = new AbortController();
    let urls: string[] = [];

    runGifsicle(
      source.buffer,
      filmStripCommand(source.info, FILM_STRIP_FRAMES, FILM_STRIP_TILE),
      controller.signal
    )
      .then((outputs) => {
        urls = outputs
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
          .map((output) =>
            URL.createObjectURL(new Blob([output.file], { type: "image/gif" }))
          );
        setFrames(urls);
      })
      .catch(() => {
        // The strip is decoration; the timeline works without it
      });

    return () => {
      controller.abort();
      for (const url of urls) URL.revokeObjectURL(url);
      setFrames([]);
    };
  }, [source]);

  return frames;
}
