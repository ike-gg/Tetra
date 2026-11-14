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

export const FITTING_LABELS: Record<Fitting, string> = {
  contain: "Contain",
  cover: "Cover",
  fill: "Fill",
};

const OPTIONS = (Object.keys(FITTING_LABELS) as Fitting[]).map((value) => ({
  value,
  label: FITTING_LABELS[value],
}));

type FittingPickerProps = {
  value: Fitting;
  onValueChange: (value: Fitting) => void;
};

// Lives in the Crop view's toolbar only: fitting and crop are one decision, made where
// the crop is visible. The sidebar shows a summary.
export function FittingPicker({ value, onValueChange }: FittingPickerProps) {
  return (
    <SegmentedControl
      aria-label="Fitting"
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
            className="size-4 shrink-0"
          >
            {ICONS[option.value]}
          </svg>
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
