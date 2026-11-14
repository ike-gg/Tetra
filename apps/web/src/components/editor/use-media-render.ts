import { useEffect, useRef, useState } from "react";

import type { StillFormat } from "@/lib/image/render-image";
import { createLatestTask } from "@/lib/latest-task";
import type { Edit } from "@/lib/media/edit";
import type { MediaFile } from "@/lib/media/media-file";
import { type MediaRender, renderMedia } from "@/lib/media/render";

type RenderState = {
  result: MediaRender | null;
  pending: boolean;
  error: string | null;
};

// Every edit aborts the render in flight (terminating its worker) and starts over, so the
// result on screen always belongs to the latest settings
export function useMediaRender(
  source: MediaFile,
  edit: Edit,
  formats: readonly StillFormat[]
) {
  const [state, setState] = useState<RenderState>({
    result: null,
    pending: true,
    error: null,
  });
  const task = useRef<{ request: (edit: Edit) => void } | null>(null);
  const latest = useRef(edit);
  latest.current = edit;
  // Read by each run, so a change (Discord mode drops JPEG) doesn't restart the task
  const allowedFormats = useRef(formats);
  allowedFormats.current = formats;
  // GIFs stay GIFs: only a still image renders again when the formats change
  const requestKey = JSON.stringify([edit, source.kind === "image" ? formats : null]);
  const latestKey = useRef(requestKey);
  latestKey.current = requestKey;
  const requestedKey = useRef<string | null>(null);

  useEffect(() => {
    let shown: string | null = null;
    setState({ result: null, pending: true, error: null });

    const current = createLatestTask(
      (next: Edit, signal) => renderMedia(source, next, signal, allowedFormats.current),
      {
        onStart: () => setState((previous) => ({ ...previous, pending: true })),
        onResult: (result) => {
          if (shown) URL.revokeObjectURL(shown);
          shown = result.url;
          setState({ result, pending: false, error: null });
        },
        onError: (error) =>
          setState((previous) => ({
            ...previous,
            pending: false,
            error: error instanceof Error ? error.message : String(error),
          })),
        onDiscard: (result) => URL.revokeObjectURL(result.url),
      }
    );
    task.current = current;
    requestedKey.current = latestKey.current;
    current.request(latest.current);

    return () => {
      current.dispose();
      task.current = null;
      if (shown) URL.revokeObjectURL(shown);
    };
  }, [source]);

  useEffect(() => {
    // On mount the source effect above has already requested this edit
    if (requestedKey.current === requestKey) return;
    requestedKey.current = requestKey;
    task.current?.request(latest.current);
  }, [requestKey]);

  return state;
}
