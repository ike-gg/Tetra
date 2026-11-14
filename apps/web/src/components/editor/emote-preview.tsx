import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format-bytes";
import type { EmoteFile } from "@/lib/gif/emote-file";
import type { Crop } from "@/lib/gif/emote-pipeline";

import type { EmoteRender } from "./use-emote-render";

// "fit": both images fill the same box, so lowering the size shows up as lost detail,
// not as a smaller picture. "actual": both at their real pixel size (shrunk only to fit).
export type PreviewScale = "fit" | "actual";

const BOX = 256;

const scaleFor = (width: number, height: number, mode: PreviewScale) => {
  const fit = BOX / Math.max(width, height);
  return mode === "fit" ? fit : Math.min(1, fit);
};

type EmotePreviewProps = {
  source: EmoteFile;
  name: string;
  crop: Crop | null;
  scale: PreviewScale;
  result: EmoteRender | null;
  pending: boolean;
  error: string | null;
};

export function EmotePreview({
  source,
  name,
  crop,
  scale,
  result,
  pending,
  error,
}: EmotePreviewProps) {
  const { info } = source;
  const originalScale = scaleFor(info.width, info.height, scale);
  const resultScale = result ? scaleFor(result.info.width, result.info.height, scale) : 1;
  const cropMeta = crop
    ? ` · crop ${Math.round(crop.width)}×${Math.round(crop.height)}`
    : "";

  return (
    <div className="grid w-full max-w-3xl gap-px border border-border bg-border sm:grid-cols-2">
      <PreviewPane
        title="Original"
        meta={`${info.width}×${info.height}${cropMeta} · ${formatBytes(source.bytes)}`}
      >
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: info.width * originalScale,
            height: info.height * originalScale,
          }}
        >
          <img
            src={source.url}
            alt={`${name}, original`}
            draggable={false}
            className={cn(
              "size-full",
              originalScale > 1 && "[image-rendering:pixelated]"
            )}
          />
          {crop && (
            <div
              aria-hidden="true"
              // The wide spread dims everything outside the crop; the parent clips it
              className="absolute outline outline-primary shadow-[0_0_0_100vmax_color-mix(in_oklch,var(--color-background)_70%,transparent)]"
              style={{
                left: crop.x * originalScale,
                top: crop.y * originalScale,
                width: crop.width * originalScale,
                height: crop.height * originalScale,
              }}
            />
          )}
        </div>
      </PreviewPane>
      <PreviewPane
        title={pending ? "Result · updating" : "Result"}
        meta={
          result
            ? `${result.info.width}×${result.info.height} · ${result.info.frames} fr · ${formatBytes(result.bytes)}`
            : "…"
        }
        footer={result && <ChatPreview url={result.url} name={name} />}
      >
        {error ? (
          <p className="max-w-56 text-center text-danger text-sm">{error}</p>
        ) : (
          result && (
            <img
              src={result.url}
              alt={`${name}, result`}
              draggable={false}
              // Dimmed, not hidden, while a newer version renders: nothing jumps, and the
              // old result stays a reference
              className={cn(
                "shrink-0",
                resultScale > 1 && "[image-rendering:pixelated]",
                pending && "opacity-60"
              )}
              style={{
                width: result.info.width * resultScale,
                height: result.info.height * resultScale,
              }}
            />
          )
        )}
      </PreviewPane>
    </div>
  );
}

function PreviewPane({
  title,
  meta,
  footer,
  children,
}: {
  title: string;
  meta: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="flex min-w-0 flex-col bg-background">
      <figcaption className="flex items-baseline justify-between gap-3 border-border border-b px-3 py-2">
        <span className="shrink-0 font-medium text-sm">{title}</span>
        <span className="truncate font-mono text-muted text-xs tabular-nums">{meta}</span>
      </figcaption>
      <div className="flex h-72 items-center justify-center overflow-hidden bg-checker p-4">
        {children}
      </div>
      <div className="flex min-h-11 items-center border-border border-t px-3">
        {footer}
      </div>
    </figure>
  );
}

// How the result sits in a Discord message: inline next to text, and alone (jumbo)
function ChatPreview({ url, name }: { url: string; name: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="font-mono text-muted text-xs">in chat</span>
      <span className="flex items-center gap-1">
        vibing <img src={url} alt={`:${name}:`} className="size-5.5 object-contain" />
      </span>
      <img src={url} alt={`:${name}: large`} className="size-12 object-contain" />
    </div>
  );
}
