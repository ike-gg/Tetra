import type { ReactNode } from "react";

import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import type { Fitting } from "@/lib/media/edit";

// Each icon is the same wide frame (the crop) and what happens to it
const ICONS: Record<Fitting, ReactNode> = {
  contain: <rect x="1.5" y="4.5" width="13" height="7" />,
  cover: (
    <>
      <rect
        x="1.5"
        y="4.5"
        width="13"
        height="7"
        strokeDasharray="1.5 1.5"
        opacity="0.5"
      />
      <rect x="4.5" y="4.5" width="7" height="7" fill="currentColor" />
    </>
  ),
  fill: (
    <>
      <rect x="4.5" y="4.5" width="7" height="7" />
      <path d="M1 8h2.5M12.5 8H15" />
    </>
  ),
};

// Plain words for what happens to the shape; the stored values stay the CSS-like ones
// because saved edits use them
const FITTING_LABELS: Record<Fitting, string> = {
  contain: "keep shape",
  cover: "square",
  fill: "stretch",
};

// What the result does with the crop, under the result
export const FITTING_HINTS: Record<Fitting, string> = {
  contain: "keeps the crop's shape",
  cover: "the square crop, nothing stretched",
  fill: "the crop squeezed into a square",
};

const OPTIONS = (Object.keys(FITTING_LABELS) as Fitting[]).map((value) => ({
  value,
  label: FITTING_LABELS[value],
}));

type FittingPickerProps = {
  value: Fitting;
  onValueChange: (value: Fitting) => void;
};

// Sits under the original image, next to the crop it shapes: fitting and crop are one
// decision, made where the crop is visible
export function FittingPicker({ value, onValueChange }: FittingPickerProps) {
  return (
    <SegmentedControl
      aria-label="shape"
      size="sm"
      value={value}
      onValueChange={(next) => next && onValueChange(next as Fitting)}
    >
      {OPTIONS.map((option) => (
        <SegmentedControlItem key={option.value} value={option.value} className="gap-1.5">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="size-3.5 shrink-0"
          >
            {ICONS[option.value]}
          </svg>
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
