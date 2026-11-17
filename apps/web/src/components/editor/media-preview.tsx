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

// The cropper's viewport padding (p-6), so both panes inset their image the same
const PADDING = 24;
// Below this the panes stack, so each still gets a usable width
const SIDE_BY_SIDE_MIN_WIDTH = 520;

const scaleFor = (width: number, height: number, mode: PreviewScale, box: ElementSize) =>
  mode === "fit"
    ? Math.max(
        0.01,
        Math.min((box.width - PADDING * 2) / width, (box.height - PADDING * 2) / height)
      )
    : 1;

// The result file's real edges against the checker, like the original's in the cropper.
// Inside the box, so it stays visible where an image scrolled at actual size meets the
// pane edge; the live preview gets it too, so the frame doesn't jump on render.
const RESULT_EDGE = "outline outline-neutral-400 -outline-offset-1";

// The result as the shown crop will make it, drawn from the original with CSS while a
// drag, a shape animation or the render for it is still under way
export type LiveResult = {
  // The area that ends up in the result (crop and fitting)
  crop: Crop;
  width: number;
  height: number;
};

type MediaPreviewProps = {
  source: MediaFile;
  name: string;
  // The area that ends up in the result, as shown (the draft, ahead of the edit)
  crop: Crop | null;
  scale: PreviewScale;
  // The original pane's crop editor, used in "fit"; "actual" outlines the crop instead
  cropper: (pixelated: boolean) => ReactNode;
  // Under the original: shape and crop controls; under the result: what the shape does
  cropControls: ReactNode;
  shapeHint: string;
  result: MediaRender | null;
  live: LiveResult | null;
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
  cropper,
  cropControls,
  shapeHint,
  result,
  live,
  pending,
  error,
  discord,
  body,
}: MediaPreviewProps) {
  const { info } = source;
  const cropMeta = crop
    ? ` · crop ${Math.round(crop.width)}×${Math.round(crop.height)}`
    : "";
  const updating = pending || live !== null;

  return (
    <div className="flex size-full flex-col">
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-px bg-border",
          body.width >= SIDE_BY_SIDE_MIN_WIDTH ? "grid-cols-2" : "grid-rows-2"
        )}
      >
        <PreviewPane
          title="original"
          meta={`${info.width}×${info.height}${cropMeta} · ${formatBytes(source.bytes)}`}
          footer={cropControls}
        >
          {(box) => {
            const factor = scaleFor(info.width, info.height, scale, box);
            if (scale === "fit") {
              return <div className="absolute inset-0">{cropper(factor > 1)}</div>;
            }
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
          title={updating ? "result · updating" : "result"}
          footer={<span className="truncate text-muted text-xs">{shapeHint}</span>}
          meta={
            live
              ? `${live.width}×${live.height} · …`
              : result
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
            if (live) {
              const factor = scaleFor(live.width, live.height, scale, box);
              return (
                <LivePreview
                  url={source.url}
                  name={name}
                  natural={info}
                  crop={live.crop}
                  width={live.width * factor}
                  height={live.height * factor}
                />
              );
            }
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
                  RESULT_EDGE,
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

// The original clipped to the crop and scaled per axis to the result's box, so "stretch"
// squeezes it like the render will. A positioned <img> in an overflow: hidden box works
// in every browser; object-view-box doesn't (Firefox). Dimmed like a pending render: it's
// the geometry, not the final pixels.
function LivePreview({
  url,
  name,
  natural,
  crop,
  width,
  height,
}: {
  url: string;
  name: string;
  natural: { width: number; height: number };
  crop: Crop;
  width: number;
  height: number;
}) {
  const scaleX = width / crop.width;
  const scaleY = height / crop.height;

  return (
    <div
      className={cn("relative m-auto shrink-0 overflow-hidden opacity-60", RESULT_EDGE)}
      style={{ width, height }}
    >
      <img
        src={url}
        alt={`${name}, result preview`}
        draggable={false}
        className={cn(
          "absolute max-w-none",
          (scaleX > 1 || scaleY > 1) && "[image-rendering:pixelated]"
        )}
        style={{
          left: -crop.x * scaleX,
          top: -crop.y * scaleY,
          width: natural.width * scaleX,
          height: natural.height * scaleY,
        }}
      />
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
      {/* m-auto on the child centers it, and lets it scroll from its edge when larger.
          relative: the cropper fills it absolutely, and ui-sdk's hidden inputs need it */}
      <div ref={boxRef} className="relative flex min-h-0 flex-1 overflow-auto bg-checker">
        {box && children(box)}
      </div>
      {footer && (
        // Same minimum height under both panes, so their images line up
        <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-2 border-border border-t px-3 py-1.5">
          {footer}
        </div>
      )}
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
