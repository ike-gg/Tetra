import { CheckboxIndicator, Checkbox as CheckboxPrimitive } from "@ui-sdk/react/checkbox";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export { CheckboxGroup } from "@ui-sdk/react/checkbox";

type CheckboxProps = Omit<ComponentProps<typeof CheckboxPrimitive>, "className"> & {
  className?: string;
};

// The box only; wrap it with its text in a <label>, as ui-sdk documents. Square, orange
// when checked, no transition (native feel).
export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive
      className={cn(
        "inline-flex size-4 shrink-0 cursor-default items-center justify-center border border-neutral-600 bg-neutral-900 p-0",
        "not-data-disabled:hover:border-neutral-500",
        "data-checked:border-primary data-checked:bg-primary not-data-disabled:data-checked:hover:border-primary-hover not-data-disabled:data-checked:hover:bg-primary-hover",
        "focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:outline-offset-2",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxIndicator className="flex text-primary-foreground">
        <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
          <path
            d="M2 6.5 4.75 9 10 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </CheckboxIndicator>
    </CheckboxPrimitive>
  );
}
