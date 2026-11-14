// Loaded here too, not only in the editor, so the drop zone looks the same before and
// after a file has been opened (web.css is global once loaded)
import "@/styles/ui-sdk.css";

import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { BrandLink } from "@/components/brand-link";
import { MediaDropzone } from "@/components/editor/media-dropzone";
import { RecentFiles } from "@/components/editor/recent-files";
import { Accent } from "@/components/ui/accent";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { formatBytes } from "@/lib/format-bytes";
import { DISCORD_EMOTE_LIMIT } from "@/lib/media/edit";
import { saveToLibrary } from "@/lib/media/local-library";
import { loadMediaFile, releaseMediaFile } from "@/lib/media/media-file";

export const Route = createLazyFileRoute("/editor/")({
  component: EditorStartPage,
});

// Public and account-free: files are processed locally and never uploaded
function EditorStartPage() {
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
      await navigate({ to: "/editor/$key", params: { key } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That file didn't work.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-12 shrink-0 select-none items-center gap-2 border-border border-b px-4 text-sm">
        <BrandLink />
        <span className="text-neutral-600">/</span>
        <span className="font-medium">Editor</span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pt-16 pb-12">
        <div className="flex flex-col gap-4">
          <Eyebrow>image/gif quick editor</Eyebrow>
          <Heading level={1} size="lg">
            Shrink it, crop it, make it <Accent>fit</Accent>.
          </Heading>
          <Text tone="muted">
            Crop, trim, resize and compress GIFs and images, then download them in the
            format you need. Made to get emotes under Discord&apos;s{" "}
            {formatBytes(DISCORD_EMOTE_LIMIT)} limit, works for anything. It all runs in
            your browser: the file never leaves your device and you don&apos;t need an
            account.
          </Text>
        </div>

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

        <RecentFiles />
      </main>
    </div>
  );
}
