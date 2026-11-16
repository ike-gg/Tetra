import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/ui/text-field";
import { saveToLibrary } from "@/lib/media/local-library";
import { loadMediaFile, releaseMediaFile } from "@/lib/media/media-file";
import { fetchMediaLink, parseMediaLink } from "@/lib/media/media-link";

import { EDITOR_HOSTS, type EditorHost } from "./editor-host";
import { MAX_FILE_BYTES, MediaDropzone } from "./media-dropzone";
import { RecentFiles } from "./recent-files";

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.closest("input, textarea, select") !== null);

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "that file didn't work";

// The start screen below the host's intro: open a file or a link, or pick one edited before
export function EditorStart({ host }: { host: EditorHost }) {
  const navigate = useNavigate();
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const linkRequest = useRef<AbortController | null>(null);

  useEffect(() => () => linkRequest.current?.abort(), []);

  // Loading first validates the file, so only files the editor can open are kept
  const open = async (file: File) => {
    const media = await loadMediaFile(file, file.name);
    releaseMediaFile(media);
    const key = await saveToLibrary(file, media, file.name);
    await navigate({ to: EDITOR_HOSTS[host].file, params: { key } });
  };

  const openFile = async (file: File) => {
    linkRequest.current?.abort();
    setLinkStatus(null);
    setBusy(true);
    setFileError(null);
    try {
      await open(file);
    } catch (cause) {
      setFileError(messageOf(cause));
      setBusy(false);
    }
  };

  const openLink = async (text: string) => {
    linkRequest.current?.abort();
    const request = new AbortController();
    linkRequest.current = request;
    setLinkError(null);
    setFileError(null);
    setBusy(true);
    try {
      const file = await fetchMediaLink(text, {
        maxBytes: MAX_FILE_BYTES,
        signal: request.signal,
        onStatus: setLinkStatus,
      });
      await open(file);
    } catch (cause) {
      if (request.signal.aborted) return;
      setLinkError(messageOf(cause));
      setLinkStatus(null);
      setBusy(false);
    }
  };
  const openLinkRef = useRef(openLink);
  openLinkRef.current = openLink;

  // A link pasted anywhere on the screen opens like one pasted into the field; files go
  // to the drop zone, which listens on the document too
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isEditable(event.target)) return;
      if (event.clipboardData?.files.length) return;
      const text = event.clipboardData?.getData("text/plain").trim() ?? "";
      if (!parseMediaLink(text)) return;
      event.preventDefault();
      setLink(text);
      linkInput.current?.focus();
      void openLinkRef.current(text);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <MediaDropzone
            onFile={(file) => void openFile(file)}
            onError={setFileError}
            busy={busy}
          />
          {fileError && (
            <p role="alert" className="text-danger text-sm">
              {fileError}
            </p>
          )}
        </div>

        <div
          aria-hidden="true"
          className="flex select-none items-center gap-3 font-mono text-muted text-xs"
        >
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <TextField
          label="open a link"
          name="media-link"
          type="url"
          inputRef={linkInput}
          value={link}
          onValueChange={(next) => {
            setLink(next);
            setLinkError(null);
          }}
          // A pasted link is finished: open it once the input holds it
          onPaste={(event) => {
            const input = event.currentTarget;
            setTimeout(() => {
              const pasted = input.value.trim();
              if (pasted) void openLink(pasted);
            });
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (link.trim()) void openLink(link);
          }}
          placeholder="https://7tv.app/emotes/…"
          error={linkError ?? undefined}
          description={
            linkStatus ? (
              <span className="flex items-center gap-2 font-mono">
                <Spinner />
                {linkStatus}
              </span>
            ) : (
              "a 7TV, BTTV or FFZ emote page, or a direct link to an image. paste it anywhere here"
            )
          }
        />
      </div>

      <RecentFiles host={host} />
    </>
  );
}
