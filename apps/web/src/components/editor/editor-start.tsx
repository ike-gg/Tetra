import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { saveToLibrary } from "@/lib/media/local-library";
import { loadMediaFile, releaseMediaFile } from "@/lib/media/media-file";

import { EDITOR_HOSTS, type EditorHost } from "./editor-host";
import { MediaDropzone } from "./media-dropzone";
import { RecentFiles } from "./recent-files";

// The start screen below the host's intro: open a file, or pick one edited before
export function EditorStart({ host }: { host: EditorHost }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      // Loading first validates the file, so only files the editor can open are kept
      const media = await loadMediaFile(file, file.name);
      releaseMediaFile(media);
      const key = await saveToLibrary(file, media, file.name);
      await navigate({ to: EDITOR_HOSTS[host].file, params: { key } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That file didn't work.");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <MediaDropzone
          onFile={(file) => void open(file)}
          onError={setError}
          busy={busy}
        />
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>

      <RecentFiles host={host} />
    </>
  );
}
