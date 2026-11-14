import { useEffect, useState } from "react";

import { loadMediaFile, type MediaFile, releaseMediaFile } from "@/lib/media/media-file";

export type MediaFileState =
  | { status: "loading" }
  | { status: "ready"; file: MediaFile }
  | { status: "error" };

// A blob as an editor source; its object URL lives as long as the blob is shown
export function useMediaFile(blob: Blob | undefined, fileName: string): MediaFileState {
  const [media, setMedia] = useState<MediaFileState>({ status: "loading" });

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    let loaded: MediaFile | null = null;
    setMedia({ status: "loading" });

    loadMediaFile(blob, fileName).then(
      (file) => {
        if (cancelled) return releaseMediaFile(file);
        loaded = file;
        setMedia({ status: "ready", file });
      },
      () => {
        if (!cancelled) setMedia({ status: "error" });
      }
    );

    return () => {
      cancelled = true;
      if (loaded) releaseMediaFile(loaded);
    };
  }, [blob, fileName]);

  return media;
}
