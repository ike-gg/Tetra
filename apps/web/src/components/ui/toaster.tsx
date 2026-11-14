import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  type Toaster as ToasterQueue,
  ToastRegion,
  ToastTitle,
} from "@ui-sdk/react/toast";

import { Spinner } from "@/components/ui/spinner";

export { toast } from "@ui-sdk/react/toast";

// Bottom right, always expanded (a short list, newest at the bottom), so nothing hides
// behind a collapsed stack. Mount once per app area; `toast()` from anywhere fills it.
export function Toaster({ toaster }: { toaster?: ToasterQueue }) {
  return (
    <ToastRegion
      toaster={toaster}
      side="bottom"
      align="end"
      expanded
      maxVisible={4}
      aria-label="Notifications"
      className="fixed [--toast-gap:8px] right-4 bottom-4 z-50 m-0 h-[calc(var(--toast-stack-height)+(var(--toast-count)-1)*var(--toast-gap))] w-[min(24rem,calc(100vw-2rem))] list-none p-0"
    >
      {() => (
        <Toast className="group/toast absolute inset-x-0 bottom-0 flex h-(--toast-height) translate-x-(--toast-swipe-x,0px) translate-y-[calc(-1*(var(--toast-offset)+var(--toast-index)*var(--toast-gap))+var(--toast-swipe-y,0px))] select-none items-center gap-2.5 border border-border bg-surface py-2.5 pr-1.5 pl-3 text-sm opacity-100 transition-[translate,opacity] duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:transition-none motion-reduce:transition-opacity">
          <span
            aria-hidden="true"
            className="w-[1em] shrink-0 text-center font-mono text-muted group-data-[type=error]/toast:text-danger group-data-[type=success]/toast:text-primary"
          >
            <span className="hidden group-data-[type=loading]/toast:inline">
              <Spinner />
            </span>
            <span className="hidden group-data-[type=success]/toast:inline">✓</span>
            <span className="hidden group-data-[type=error]/toast:inline">!</span>
            <span className="hidden group-data-[type=default]/toast:inline group-data-[type=info]/toast:inline group-data-[type=warning]/toast:inline">
              ·
            </span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ToastTitle className="font-medium" />
            <ToastDescription className="text-muted text-xs empty:hidden" />
          </div>
          <ToastAction className="h-7 shrink-0 cursor-default border border-border bg-background px-2.5 font-medium text-xs hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2 active:bg-neutral-700 data-pending:cursor-wait" />
          <ToastClose
            aria-label="Dismiss"
            className="flex size-7 shrink-0 cursor-default items-center before:hidden justify-center border-0 bg-transparent p-0 font-mono text-muted hover:bg-neutral-800 hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2"
          >
            <span aria-hidden="true">×</span>
          </ToastClose>
        </Toast>
      )}
    </ToastRegion>
  );
}
