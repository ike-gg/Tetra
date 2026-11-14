// Lives in the lazy route file so ui-sdk's stylesheet only loads with the editor
import "@/styles/ui-sdk.css";

import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EmoteEditor } from "@/components/editor/emote-editor";
import { GifDropzone } from "@/components/editor/gif-dropzone";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { downloadBlob } from "@/lib/download-blob";
import { formatBytes } from "@/lib/format-bytes";
import { type EmoteFile, loadEmoteFile, releaseEmoteFile } from "@/lib/gif/emote-file";
import { DISCORD_EMOTE_LIMIT } from "@/lib/gif/emote-pipeline";

export const Route = createLazyFileRoute("/editor")({
  component: EditorPage,
});

// Public and account-free: the file is processed locally and never uploaded
function EditorPage() {
  const [file, setFile] = useState<EmoteFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(
    () => () => {
      if (file) releaseEmoteFile(file);
    },
    [file]
  );

  const open = async (blob: File) => {
    setBusy(true);
    setError(null);
    try {
      setFile(await loadEmoteFile(blob, blob.name));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That file didn't work.");
    } finally {
      setBusy(false);
    }
  };

  if (file) {
    return (
      <EmoteEditor
        key={file.url}
        source={file}
        section="Editor"
        actions={({ result, name, nameValid }) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
              New file
            </Button>
            <Button
              variant="primary"
              size="sm"
              glow
              disabled={!result}
              onClick={() =>
                result && downloadBlob(result.blob, `${nameValid ? name : file.name}.gif`)
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

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-12 shrink-0 select-none items-center gap-2 border-border border-b px-4 text-sm">
        <Link
          to="/"
          className="cursor-default font-mono text-primary hover:text-primary-hover"
        >
          tetra
        </Link>
        <span className="text-neutral-600">/</span>
        <span className="font-medium">Editor</span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-4 py-12">
        <div className="flex flex-col gap-4">
          <Eyebrow>emote editor</Eyebrow>
          <Heading level={1} size="lg">
            Make any GIF fit <Accent>Discord</Accent>.
          </Heading>
          <Text tone="muted">
            Crop, trim and shrink a GIF under Discord&apos;s{" "}
            {formatBytes(DISCORD_EMOTE_LIMIT)} emote limit. It all runs in your browser,
            so the file never leaves your device and you don&apos;t need an account.
          </Text>
        </div>

        <GifDropzone onFile={(blob) => void open(blob)} onError={setError} busy={busy} />

        {error && (
          <p role="alert" className="-mt-4 text-danger text-sm">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
