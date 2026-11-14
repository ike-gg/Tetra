import { useEffect, useState } from "react";

import type { EmoteFile } from "@/lib/gif/emote-file";
import { filmStripCommand } from "@/lib/gif/emote-pipeline";
import { runGifsicle } from "@/lib/gif/gifsicle";

export const FILM_STRIP_FRAMES = 16;
export const FILM_STRIP_TILE = 56;

// Evenly spaced still frames for the trim timeline, extracted once per file
export function useFilmStrip(source: EmoteFile) {
  const [frames, setFrames] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    let urls: string[] = [];

    runGifsicle(
      source.buffer,
      [filmStripCommand(source.info, FILM_STRIP_FRAMES, FILM_STRIP_TILE)],
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
