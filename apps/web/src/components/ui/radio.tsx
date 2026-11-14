import { RadioIndicator, Radio as RadioPrimitive } from "@ui-sdk/react/radio";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export { RadioGroup } from "@ui-sdk/react/radio";

type RadioProps = Omit<ComponentProps<typeof RadioPrimitive>, "className"> & {
  className?: string;
};

// The control only; wrap it with its text in a <label>, as ui-sdk documents. Square like
// everything else: the checked one gets an orange square inside, no transition. Radius and
// margin are pinned because web.css rounds radios and nudges them down inside a label.
export function Radio({ className, ...props }: RadioProps) {
  return (
    <RadioPrimitive
      className={cn(
        "my-0 inline-flex size-4 shrink-0 cursor-default items-center justify-center rounded-none border border-neutral-600 bg-neutral-900 p-0",
        "not-data-disabled:hover:border-neutral-500",
        "data-checked:border-primary not-data-disabled:data-checked:hover:border-primary-hover",
        "focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:outline-offset-2",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioIndicator className="block size-2 rounded-none bg-primary" />
    </RadioPrimitive>
  );
}
