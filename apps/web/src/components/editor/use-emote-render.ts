import { useEffect, useRef, useState } from "react";

import type { EmoteFile } from "@/lib/gif/emote-file";
import { buildCommands, type EmoteEdit } from "@/lib/gif/emote-pipeline";
import { runGifsicle } from "@/lib/gif/gifsicle";
import { type GifInfo, parseGif } from "@/lib/gif/parse-gif";
import { createLatestTask } from "@/lib/latest-task";

export type EmoteRender = { url: string; blob: Blob; bytes: number; info: GifInfo };

type RenderState = {
  result: EmoteRender | null;
  pending: boolean;
  error: string | null;
};

const renderEmote = async (
  source: EmoteFile,
  edit: EmoteEdit,
  signal: AbortSignal
): Promise<EmoteRender> => {
  const [output] = await runGifsicle(
    source.buffer,
    buildCommands(source.info, edit),
    signal
  );
  if (!output) throw new Error("Processing produced no file.");

  const blob = new Blob([output.file], { type: "image/gif" });
  return {
    url: URL.createObjectURL(blob),
    blob,
    bytes: blob.size,
    info: parseGif(await blob.arrayBuffer()),
  };
};

// Every edit aborts the render in flight (terminating its worker) and starts over, so the
// result on screen always belongs to the latest settings
export function useEmoteRender(source: EmoteFile, edit: EmoteEdit) {
  const [state, setState] = useState<RenderState>({
    result: null,
    pending: true,
    error: null,
  });
  const task = useRef<{ request: (edit: EmoteEdit) => void } | null>(null);
  const latest = useRef(edit);
  latest.current = edit;
  const editKey = JSON.stringify(edit);
  const requestedKey = useRef<string | null>(null);

  useEffect(() => {
    let shown: string | null = null;
    setState({ result: null, pending: true, error: null });

    const current = createLatestTask(
      (next: EmoteEdit, signal) => renderEmote(source, next, signal),
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
    requestedKey.current = JSON.stringify(latest.current);
    current.request(latest.current);

    return () => {
      current.dispose();
      task.current = null;
      if (shown) URL.revokeObjectURL(shown);
    };
  }, [source]);

  useEffect(() => {
    // On mount the source effect above has already requested this edit
    if (requestedKey.current === editKey) return;
    requestedKey.current = editKey;
    task.current?.request(latest.current);
  }, [editKey]);

  return state;
}
