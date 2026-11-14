import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type NoticeProps = {
  title: string;
  children: ReactNode;
  // Usually a link or a dismiss button, aligned to the right
  action?: ReactNode;
  className?: string;
};

// A heads-up that doesn't block anything. Errors that stop a task use `text-danger` inline
// next to the cause instead.
export function Notice({ title, children, action, className }: NoticeProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border border-border bg-surface px-4 py-3",
        className
      )}
    >
      <span aria-hidden="true" className="select-none font-mono text-primary text-sm">
        [!]
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <p className="font-medium text-foreground">{title}</p>
        <div className="text-muted">{children}</div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
