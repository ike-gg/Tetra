import { Field, FieldLabel } from "@ui-sdk/react/field";
import {
  SliderControl,
  SliderIndicator,
  Slider as SliderPrimitive,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from "@ui-sdk/react/slider";

import { cn } from "@/lib/cn";

type SliderProps = {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  disabled?: boolean;
  className?: string;
};

// onValueChange fires on every step of a drag, so anything derived from the value
// (like a size estimate) follows the thumb 1:1 instead of jumping on release.
export function Slider({ label, onValueChange, className, ...props }: SliderProps) {
  return (
    <Field className={cn("flex flex-col", className)}>
      <SliderPrimitive
        onValueChange={(next) => onValueChange(next)}
        className="flex min-w-0 select-none flex-col gap-1.5 data-disabled:opacity-50"
        {...props}
      >
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel className="font-medium text-foreground text-sm">{label}</FieldLabel>
          <SliderValue className="font-mono text-muted text-xs tabular-nums" />
        </div>
        <SliderControl className="flex h-5 w-full cursor-default touch-none items-center">
          <SliderTrack className="relative h-0.5 w-full bg-neutral-700">
            <SliderIndicator className="h-full bg-primary" />
            <SliderThumb
              className={cn(
                "size-3.5 border border-neutral-950 bg-foreground",
                "hover:bg-white active:bg-neutral-300",
                "has-focus-visible:outline-2 has-focus-visible:outline-brand-300 has-focus-visible:outline-offset-2"
              )}
            />
          </SliderTrack>
        </SliderControl>
      </SliderPrimitive>
    </Field>
  );
}
