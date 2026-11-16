import {
  ImageCropper,
  ImageCropperGrid,
  ImageCropperHandle,
  ImageCropperImage,
  ImageCropperSelection,
  ImageCropperViewport,
} from "@ui-sdk/react/image-cropper";

import type { Crop } from "@/lib/media/edit";
import type { MediaFile } from "@/lib/media/media-file";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

type MediaCropperProps = {
  source: MediaFile;
  crop: Crop | null;
  // "cover" fitting: the selection is a square the person moves around
  square: boolean;
  onCropChange: (crop: Crop | null) => void;
};

export function MediaCropper({ source, crop, square, onCropChange }: MediaCropperProps) {
  const { width, height } = source.info;

  return (
    <ImageCropper
      aria-label="Crop"
      src={source.url}
      aspectRatio={square ? 1 : undefined}
      defaultCrop={crop ?? { x: 0, y: 0, width, height }}
      minWidth={8}
      minHeight={8}
      // Also fires on load and when the ratio refits the selection, so the result always
      // matches what's shown; each step aborts the render of the previous one
      onCropChange={(next) =>
        onCropChange(
          next.x === 0 && next.y === 0 && next.width === width && next.height === height
            ? null
            : { x: next.x, y: next.y, width: next.width, height: next.height }
        )
      }
      className="size-full max-w-none"
    >
      {/* The viewport fills the window, so the checker and the dim outside the selection
          cover all of it, and ui-sdk fits the image inside its padding. The padding leaves
          room for the handles and the outline when the selection covers the whole image;
          overflow: hidden would cut them off at the edge. */}
      <ImageCropperViewport className="relative aspect-auto size-full overflow-hidden bg-checker p-6">
        {/* Emotes are small, so scaled up they stay crisp pixels instead of blurring. The
            outline marks the image's real edges against the checker; it sits under the
            selection (z-10), so a full-size selection draws over it. */}
        <ImageCropperImage
          alt={source.name}
          className="outline outline-neutral-400 [image-rendering:pixelated]"
        />
        <ImageCropperSelection className="z-10 cursor-move outline outline-primary focus-visible:outline-2 focus-visible:outline-brand-300">
          <ImageCropperGrid />
          {HANDLES.map((position) => (
            <ImageCropperHandle
              key={position}
              position={position}
              className="after:bg-primary after:shadow-none"
            />
          ))}
        </ImageCropperSelection>
      </ImageCropperViewport>
    </ImageCropper>
  );
}
