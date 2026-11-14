import {
  FileInput,
  FileInputDropzone,
  FileInputTrigger,
  type FileRejection,
} from "@ui-sdk/react/file-input";

import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format-bytes";

// gifsicle runs in browser memory; past this, processing gets slow on most machines
export const MAX_GIF_BYTES = 20 * 1024 * 1024;

const rejectionMessage = ([rejection]: FileRejection[]) => {
  if (!rejection) return "That file didn't work.";
  if (rejection.reasons.includes("file-type")) return "Only .gif files for now.";
  if (rejection.reasons.includes("file-too-large")) {
    return `That GIF is over ${formatBytes(MAX_GIF_BYTES)}.`;
  }
  return "That file didn't work.";
};

type GifDropzoneProps = {
  onFile: (file: File) => void;
  onError: (message: string) => void;
  busy?: boolean;
};

// Takes a GIF dropped anywhere on the page, pasted, or picked from disk
export function GifDropzone({ onFile, onError, busy }: GifDropzoneProps) {
  return (
    <FileInput
      accept={[".gif", "image/gif"]}
      maxSize={MAX_GIF_BYTES}
      value={[]}
      disabled={busy}
      onValueChange={(_, details) => {
        const [file] = details.added;
        if (file) onFile(file);
      }}
      onReject={(rejected) => onError(rejectionMessage(rejected))}
    >
      <FileInputDropzone
        target="document"
        pasteTarget="document"
        className="group/drop flex h-64 select-none flex-col items-center justify-center gap-4 border border-border bg-surface/40 p-6 text-center data-dragging:border-primary data-drag-reject:border-danger data-dragging:bg-primary/5"
      >
        <p className="font-medium text-foreground">
          <span className="group-data-dragging/drop:hidden">Drop a GIF here</span>
          <span className="hidden group-data-dragging/drop:inline">
            Let go to open it
          </span>
        </p>
        <FileInputTrigger render={<Button variant="primary" size="lg" glow />}>
          {busy ? "Opening…" : "Choose a GIF"}
        </FileInputTrigger>
        <p className="font-mono text-muted text-xs">
          or paste it · up to {formatBytes(MAX_GIF_BYTES)}
        </p>
      </FileInputDropzone>
    </FileInput>
  );
}
