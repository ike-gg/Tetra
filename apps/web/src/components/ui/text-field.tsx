import { Field, FieldDescription, FieldError, FieldLabel } from "@ui-sdk/react/field";
import { Input, InputGroup } from "@ui-sdk/react/input";
import type { ClipboardEventHandler, KeyboardEventHandler, ReactNode, Ref } from "react";

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
  // For a field whose purpose the layout already shows (a search box); still named for
  // screen readers
  hideLabel?: boolean;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  onPaste?: ClipboardEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  name?: string;
  /** `url` brings the right on-screen keyboard; it doesn't validate (no form submit). */
  type?: "text" | "url" | "search";
  /** A control right of the input (a Search button); stretched to the input's height. */
  action?: ReactNode;
  /** Not editable and out of the tab order; the value stays visible. */
  disabled?: boolean;
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
  hideLabel = false,
  className,
  inputRef,
  onPaste,
  onKeyDown,
  name,
  type = "text",
  action,
  disabled = false,
}: TextFieldProps) {
  const affix = "shrink-0 select-none font-mono text-muted text-sm";

  return (
    <Field
      invalid={Boolean(error)}
      disabled={disabled}
      className={cn("flex flex-col gap-1.5", className)}
    >
      <FieldLabel
        className={cn("font-medium text-foreground text-sm", hideLabel && "sr-only")}
      >
        {label}
      </FieldLabel>
      <div className="flex gap-2">
        <InputGroup
          className={cn(
            "flex h-9 min-w-0 flex-1 items-center gap-1 border border-neutral-700 bg-neutral-900 px-2.5",
            "hover:border-neutral-600 has-focus-visible:border-primary",
            "has-data-invalid:border-danger",
            "data-disabled:cursor-not-allowed data-disabled:border-border data-disabled:bg-transparent data-disabled:hover:border-border"
          )}
        >
          {prefix && <span className={affix}>{prefix}</span>}
          <Input
            ref={inputRef}
            type={type}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            name={name}
            value={value}
            onValueChange={(next) => onValueChange(next)}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-foreground text-sm outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:text-muted"
          />
          {suffix && <span className={affix}>{suffix}</span>}
        </InputGroup>
        {action && <div className="flex h-9 shrink-0 *:h-full">{action}</div>}
      </div>
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
