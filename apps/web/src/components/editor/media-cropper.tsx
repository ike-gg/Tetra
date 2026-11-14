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
import type { ElementSize } from "@/lib/use-element-size";

const PADDING = 24;

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

type MediaCropperProps = {
  source: MediaFile;
  crop: Crop | null;
  // "cover" fitting: the selection is a square the person moves around
  square: boolean;
  onCropChange: (crop: Crop | null) => void;
  // Size of the window body; the image is fitted into it
  body: ElementSize;
};

export function MediaCropper({
  source,
  crop,
  square,
  onCropChange,
  body,
}: MediaCropperProps) {
  const { width, height } = source.info;
  const shownWidth = Math.max(
    64,
    Math.min(body.width - PADDING * 2, ((body.height - PADDING * 2) * width) / height)
  );

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
      className="m-auto max-w-none shrink-0"
      style={{ width: shownWidth }}
    >
      {/* Padding leaves room for the handles and the outline when the selection covers the
          whole image; overflow: hidden would cut them off at the edge */}
      <ImageCropperViewport className="relative aspect-(--image-cropper-aspect-ratio) w-full overflow-hidden border border-border bg-checker p-3">
        {/* Emotes are small, so scaled up they stay crisp pixels instead of blurring */}
        <ImageCropperImage alt={source.name} className="[image-rendering:pixelated]" />
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
