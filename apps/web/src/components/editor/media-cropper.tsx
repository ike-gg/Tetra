import {
  ImageCropper,
  ImageCropperGrid,
  ImageCropperHandle,
  ImageCropperImage,
  ImageCropperSelection,
  ImageCropperViewport,
} from "@ui-sdk/react/image-cropper";

import { cn } from "@/lib/cn";
import type { Crop } from "@/lib/media/edit";
import type { MediaFile } from "@/lib/media/media-file";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

// Not the person's doing: they only echo or refit the crop passed in, which already is
// what should show. Everything else (a drag, a key, Escape putting a drag back) is.
const ECHO_REASONS = new Set(["image-load", "aspect-ratio-change", "imperative"]);

type MediaCropperProps = {
  source: MediaFile;
  // What the selection shows: the draft, ahead of the committed crop
  crop: Crop | null;
  // "cover" fitting: the selection is a square the person moves around
  square: boolean;
  // Scaled up: crisp pixels instead of a blur (emotes are small)
  pixelated: boolean;
  // Every step of a drag or key press, for the live geometry
  onCropChange: (crop: Crop | null) => void;
  // Once per interaction (pointer up, key press): the crop the render uses
  onCropCommit: (crop: Crop | null) => void;
};

export function MediaCropper({
  source,
  crop,
  square,
  pixelated,
  onCropChange,
  onCropCommit,
}: MediaCropperProps) {
  const { width, height } = source.info;
  // A crop covering the whole image is stored as no crop
  const toCrop = (next: Crop): Crop | null =>
    next.x === 0 && next.y === 0 && next.width === width && next.height === height
      ? null
      : { x: next.x, y: next.y, width: next.width, height: next.height };

  return (
    <ImageCropper
      aria-label="crop"
      src={source.url}
      aspectRatio={square ? 1 : undefined}
      crop={crop ?? { x: 0, y: 0, width, height }}
      minWidth={8}
      minHeight={8}
      onCropChange={(next, details) => {
        if (!ECHO_REASONS.has(details.reason)) onCropChange(toCrop(next));
      }}
      onCropCommit={(next) => onCropCommit(toCrop(next))}
      className="size-full max-w-none gap-0"
    >
      {/* The viewport fills the pane, so the checker and the dim outside the selection
          cover all of it, and ui-sdk fits the image inside its padding. The padding leaves
          room for the handles and the outline when the selection covers the whole image;
          overflow: hidden would cut them off at the edge. */}
      <ImageCropperViewport className="relative aspect-auto size-full overflow-hidden bg-checker p-6">
        {/* The outline marks the image's real edges against the checker; it sits under the
            selection (z-10), so a full-size selection draws over it */}
        <ImageCropperImage
          alt={`${source.name}, original`}
          className={cn(
            "outline outline-neutral-400",
            pixelated && "[image-rendering:pixelated]"
          )}
        />
        <ImageCropperSelection className="z-10 cursor-move outline outline-primary focus-visible:outline-2 focus-visible:outline-brand-300">
          <ImageCropperGrid />
          {HANDLES.map((position) => (
            <ImageCropperHandle
              key={position}
              position={position}
              className="after:bg-primary after:shadow-none focus-visible:after:outline-2 focus-visible:after:outline-brand-300 focus-visible:after:outline-offset-1"
            />
          ))}
        </ImageCropperSelection>
      </ImageCropperViewport>
    </ImageCropper>
  );
}
