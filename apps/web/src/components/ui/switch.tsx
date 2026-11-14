import { Switch as SwitchPrimitive, SwitchThumb } from "@ui-sdk/react/switch";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type SwitchProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
};

// A labeled row: the label says what the setting is, the switch whether it's on
export function Switch({
  label,
  checked,
  onCheckedChange,
  description,
  disabled,
  className,
}: SwitchProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: SwitchPrimitive renders the control inside the label, as ui-sdk documents
    <label
      className={cn(
        "flex cursor-default select-none items-start justify-between gap-4",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground text-sm">{label}</span>
        {description && <span className="text-muted text-xs">{description}</span>}
      </span>
      <SwitchPrimitive
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next)}
        disabled={disabled}
        className={cn(
          "mt-0.5 inline-flex h-4.5 w-8 shrink-0 cursor-default items-center border border-neutral-700 bg-neutral-800 p-0.5",
          "hover:border-neutral-600 data-checked:border-primary data-checked:bg-primary",
          "data-checked:hover:border-primary-hover data-checked:hover:bg-primary-hover",
          "focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:outline-offset-2"
        )}
      >
        <SwitchThumb className="size-3 bg-muted data-checked:ml-auto data-checked:bg-primary-foreground" />
      </SwitchPrimitive>
    </label>
  );
}
