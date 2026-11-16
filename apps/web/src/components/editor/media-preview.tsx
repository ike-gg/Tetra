import { type ReactNode, useRef } from "react";

import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format-bytes";
import type { Crop } from "@/lib/media/edit";
import type { MediaFile } from "@/lib/media/media-file";
import type { MediaRender } from "@/lib/media/render";
import { type ElementSize, useElementSize } from "@/lib/use-element-size";

// "fit": both images fill their (equal) panes, so lowering the size shows up as lost
// detail, not as a smaller picture. "actual": 1:1 CSS pixels; larger images scroll.
export type PreviewScale = "fit" | "actual";

const PADDING = 16;
// Below this the panes stack, so each still gets a usable width
const SIDE_BY_SIDE_MIN_WIDTH = 520;

const scaleFor = (width: number, height: number, mode: PreviewScale, box: ElementSize) =>
  mode === "fit"
    ? Math.max(
        0.01,
        Math.min((box.width - PADDING * 2) / width, (box.height - PADDING * 2) / height)
      )
    : 1;

type MediaPreviewProps = {
  source: MediaFile;
  name: string;
  // The area that ends up in the result (crop and fitting), outlined on the original
  crop: Crop | null;
  scale: PreviewScale;
  result: MediaRender | null;
  pending: boolean;
  error: string | null;
  // Shows how the result sits in a Discord message
  discord: boolean;
  // Size of the window body the preview fills
  body: ElementSize;
};

export function MediaPreview({
  source,
  name,
  crop,
  scale,
  result,
  pending,
  error,
  discord,
  body,
}: MediaPreviewProps) {
  const { info } = source;
  const cropMeta = crop
    ? ` · crop ${Math.round(crop.width)}×${Math.round(crop.height)}`
    : "";

  return (
    <div className="flex size-full flex-col">
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-px bg-border",
          body.width >= SIDE_BY_SIDE_MIN_WIDTH ? "grid-cols-2" : "grid-rows-2"
        )}
      >
        <PreviewPane
          title="Original"
          meta={`${info.width}×${info.height}${cropMeta} · ${formatBytes(source.bytes)}`}
        >
          {(box) => {
            const factor = scaleFor(info.width, info.height, scale, box);
            return (
              <div
                className="relative m-auto shrink-0 overflow-hidden"
                style={{ width: info.width * factor, height: info.height * factor }}
              >
                <img
                  src={source.url}
                  alt={`${name}, original`}
                  draggable={false}
                  className={cn(
                    "size-full max-w-none",
                    factor > 1 && "[image-rendering:pixelated]"
                  )}
                />
                {crop && (
                  <div
                    aria-hidden="true"
                    // The wide spread dims everything outside the crop; the parent clips it, so the
                    // outline sits inside the edge to stay visible for a full-size crop
                    className="absolute z-10 outline outline-primary -outline-offset-1 shadow-[0_0_0_100vmax_color-mix(in_oklch,var(--color-background)_70%,transparent)]"
                    style={{
                      left: crop.x * factor,
                      top: crop.y * factor,
                      width: crop.width * factor,
                      height: crop.height * factor,
                    }}
                  />
                )}
              </div>
            );
          }}
        </PreviewPane>
        <PreviewPane
          title={pending ? "Result · updating" : "Result"}
          meta={
            result
              ? [
                  `${result.info.width}×${result.info.height}`,
                  result.info.frames > 1
                    ? `${result.info.frames} fr`
                    : result.formatLabel,
                  formatBytes(result.bytes),
                ].join(" · ")
              : "…"
          }
        >
          {(box) => {
            if (error) {
              return (
                <p className="m-auto max-w-56 text-center text-danger text-sm">{error}</p>
              );
            }
            if (!result) return null;
            const factor = scaleFor(result.info.width, result.info.height, scale, box);
            return (
              <img
                src={result.url}
                alt={`${name}, result`}
                draggable={false}
                // Dimmed, not hidden, while a newer version renders: nothing jumps, and the
                // old result stays a reference. max-w-none: preflight's max-width: 100%
                // would squash it.
                className={cn(
                  "m-auto max-w-none shrink-0",
                  factor > 1 && "[image-rendering:pixelated]",
                  pending && "opacity-60"
                )}
                style={{
                  width: result.info.width * factor,
                  height: result.info.height * factor,
                }}
              />
            );
          }}
        </PreviewPane>
      </div>
      {/* Spans the whole window, so the two panes above stay the same size */}
      {discord && result && (
        <div className="flex min-h-11 shrink-0 items-center border-border border-t bg-background px-3">
          <ChatPreview url={result.url} name={name} />
        </div>
      )}
    </div>
  );
}

function PreviewPane({
  title,
  meta,
  children,
}: {
  title: string;
  meta: string;
  children: (box: ElementSize) => ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const box = useElementSize(boxRef);

  return (
    <figure className="flex min-h-0 min-w-0 flex-col bg-background">
      <figcaption className="flex shrink-0 items-baseline justify-between gap-3 border-border border-b px-3 py-2">
        <span className="shrink-0 font-medium text-sm">{title}</span>
        <span className="truncate font-mono text-muted text-xs tabular-nums">{meta}</span>
      </figcaption>
      {/* m-auto on the child centers it, and lets it scroll from its edge when larger */}
      <div ref={boxRef} className="flex min-h-0 flex-1 overflow-auto bg-checker">
        {box && children(box)}
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
