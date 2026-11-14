import { Field, FieldDescription, FieldError, FieldLabel } from "@ui-sdk/react/field";
import { Input, InputGroup } from "@ui-sdk/react/input";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type TextFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  description?: ReactNode;
  // Shown instead of the description while set; validation is inline, never on submit
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  placeholder?: string;
  className?: string;
};

export function TextField({
  label,
  value,
  onValueChange,
  description,
  error,
  prefix,
  suffix,
  placeholder,
  className,
}: TextFieldProps) {
  const affix = "shrink-0 select-none font-mono text-muted text-sm";

  return (
    <Field invalid={Boolean(error)} className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel className="font-medium text-foreground text-sm">{label}</FieldLabel>
      <InputGroup
        className={cn(
          "flex h-9 items-center gap-1 border border-neutral-700 bg-neutral-900 px-2.5",
          "hover:border-neutral-600 has-focus-visible:border-primary",
          "has-data-invalid:border-danger"
        )}
      >
        {prefix && <span className={affix}>{prefix}</span>}
        <Input
          value={value}
          onValueChange={(next) => onValueChange(next)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-foreground text-sm outline-none placeholder:text-neutral-500"
        />
        {suffix && <span className={affix}>{suffix}</span>}
      </InputGroup>
      {error ? (
        <FieldError match className="text-danger text-xs">
          {error}
        </FieldError>
      ) : (
        description && (
          <FieldDescription className="text-muted text-xs">
            {description}
          </FieldDescription>
        )
      )}
    </Field>
  );
}
