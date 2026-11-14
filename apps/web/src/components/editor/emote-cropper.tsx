import {
  ImageCropper,
  ImageCropperGrid,
  ImageCropperHandle,
  ImageCropperImage,
  ImageCropperSelection,
  ImageCropperViewport,
} from "@ui-sdk/react/image-cropper";

import type { EmoteFile } from "@/lib/gif/emote-file";
import type { Crop } from "@/lib/gif/emote-pipeline";

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

type EmoteCropperProps = {
  source: EmoteFile;
  crop: Crop | null;
  square: boolean;
  onCropChange: (crop: Crop | null) => void;
};

export function EmoteCropper({ source, crop, square, onCropChange }: EmoteCropperProps) {
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
      // matches what's shown; rendering coalesces the steps of a drag
      onCropChange={(next) =>
        onCropChange(
          next.x === 0 && next.y === 0 && next.width === width && next.height === height
            ? null
            : { x: next.x, y: next.y, width: next.width, height: next.height }
        )
      }
      className="w-full max-w-md"
    >
      <ImageCropperViewport className="relative aspect-(--image-cropper-aspect-ratio) w-full overflow-hidden border border-border bg-checker">
        {/* Emotes are small, so scaled up they stay crisp pixels instead of blurring */}
        <ImageCropperImage alt={source.name} className="[image-rendering:pixelated]" />
        <ImageCropperSelection className="cursor-move outline outline-primary focus-visible:outline-2 focus-visible:outline-brand-300">
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
