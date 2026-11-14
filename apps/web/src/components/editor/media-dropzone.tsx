import {
  FileInput,
  FileInputDropzone,
  FileInputTrigger,
  type FileRejection,
} from "@ui-sdk/react/file-input";

import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format-bytes";
import { ACCEPTED_TYPES } from "@/lib/media/media-file";

// Everything runs in browser memory; past this, processing gets slow on most machines
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const rejectionMessage = ([rejection]: FileRejection[]) => {
  if (!rejection) return "That file didn't work.";
  if (rejection.reasons.includes("file-type"))
    return "Only GIF, PNG, JPEG and WebP files.";
  if (rejection.reasons.includes("file-too-large")) {
    return `That file is over ${formatBytes(MAX_FILE_BYTES)}.`;
  }
  return "That file didn't work.";
};

type MediaDropzoneProps = {
  onFile: (file: File) => void;
  onError: (message: string) => void;
  busy?: boolean;
};

// Takes an image dropped anywhere on the page, pasted, or picked from disk
export function MediaDropzone({ onFile, onError, busy }: MediaDropzoneProps) {
  return (
    <FileInput
      accept={ACCEPTED_TYPES}
      maxSize={MAX_FILE_BYTES}
      value={[]}
      disabled={busy}
      onValueChange={(_, details) => {
        const [file] = details.added;
        if (file) onFile(file);
      }}
      onReject={(rejected) => onError(rejectionMessage(rejected))}
      // ui-sdk's web.css caps this at 24rem; the zone below also pins every property
      // web.css sets on it (font size, colors, border style, trigger margin)
      className="flex w-full max-w-none flex-col"
    >
      <FileInputDropzone
        target="document"
        pasteTarget="document"
        className="group/drop flex h-64 select-none flex-col items-center justify-center gap-4 border border-border border-solid bg-surface/40 p-6 text-center text-muted text-sm data-dragging:border-primary data-drag-reject:border-danger data-dragging:bg-primary/5"
      >
        <p className="font-medium text-base text-foreground">
          <span className="group-data-dragging/drop:hidden">Drop an image here</span>
          <span className="hidden group-data-dragging/drop:inline">
            Let go to open it
          </span>
        </p>
        <FileInputTrigger
          render={<Button variant="primary" size="lg" glow className="mt-0" />}
        >
          {busy ? "Opening…" : "Choose a file"}
        </FileInputTrigger>
        <p className="font-mono text-muted text-xs">
          GIF, PNG, JPEG or WebP · paste works too · up to {formatBytes(MAX_FILE_BYTES)}
        </p>
      </FileInputDropzone>
    </FileInput>
  );
}
