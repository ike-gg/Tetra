// Lives in the lazy route file so ui-sdk's stylesheet only loads with the editor
import "@/styles/ui-sdk.css";

import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { type EditorWork, MediaEditor } from "@/components/editor/media-editor";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { downloadBlob } from "@/lib/download-blob";
import { formatBytes } from "@/lib/format-bytes";
import { DISCORD_EMOTE_LIMIT } from "@/lib/media/edit";
import { openFromLibrary, type SavedEdit, saveEdit } from "@/lib/media/local-library";
import { loadMediaFile, type MediaFile, releaseMediaFile } from "@/lib/media/media-file";

export const Route = createLazyFileRoute("/editor/$key")({
  component: EditorFilePage,
});

type Loaded =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; file: MediaFile; saved: SavedEdit | null };

const SAVE_DELAY_MS = 400;

function EditorFilePage() {
  const { key } = Route.useParams();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let file: MediaFile | null = null;
    setLoaded({ status: "loading" });

    void (async () => {
      const stored = await openFromLibrary(key);
      if (!stored) {
        if (!cancelled) setLoaded({ status: "missing" });
        return;
      }
      try {
        const media = await loadMediaFile(stored.blob, stored.entry.fileName);
        if (cancelled) return releaseMediaFile(media);
        file = media;
        setLoaded({ status: "ready", file: media, saved: stored.saved });
      } catch {
        if (!cancelled) setLoaded({ status: "missing" });
      }
    })();

    return () => {
      cancelled = true;
      if (file) releaseMediaFile(file);
    };
  }, [key]);

  // Settings are saved shortly after the last change, not on every slider step
  const save = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (work: EditorWork) => {
      clearTimeout(timer);
      timer = setTimeout(() => void saveEdit(key, work), SAVE_DELAY_MS);
    };
  }, [key]);

  if (loaded.status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Text size="sm" tone="muted" className="font-mono">
          loading…
        </Text>
      </div>
    );
  }

  if (loaded.status === "missing") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 pt-16">
        <Heading level={1} size="md">
          This file isn&apos;t in this browser
        </Heading>
        <Text tone="muted">
          Files are kept only in the browser you edited them in, and only the last few.
          Open it again to keep editing.
        </Text>
        <Button variant="primary" render={<Link to="/editor" />}>
          Open a file
        </Button>
      </main>
    );
  }

  const { file, saved } = loaded;

  return (
    <MediaEditor
      key={file.url}
      source={file}
      section={{ label: "Editor", to: "/editor" }}
      initialEdit={saved?.edit}
      initialName={saved?.name}
      initialDiscord={saved?.discord ?? false}
      onWorkChange={save}
      actions={({ result, name, nameValid }) => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void navigate({ to: "/editor" })}
          >
            New file
          </Button>
          <Button
            variant="primary"
            size="sm"
            glow
            disabled={!result}
            onClick={() =>
              result &&
              downloadBlob(
                result.blob,
                `${nameValid ? name : file.name}.${result.extension}`
              )
            }
          >
            Download
          </Button>
        </>
      )}
      sizeNote={({ fits, result }) => (
        <Text size="xs" tone="muted">
          {fits || !result
            ? `Discord accepts emotes up to ${formatBytes(DISCORD_EMOTE_LIMIT)}.`
            : `Discord won't take emotes over ${formatBytes(DISCORD_EMOTE_LIMIT)}. You can still download it.`}
        </Text>
      )}
    />
  );
}
