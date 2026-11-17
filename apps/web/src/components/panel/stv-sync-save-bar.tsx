import { useBlocker } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@ui-sdk/react/alert-dialog";
import { useRef } from "react";

import { Button, buttonClassName } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import { syncErrorMessage } from "@/lib/stv-sync";
import type { SettingsForm } from "@/lib/stv-sync-settings-draft";

// The form checks everything it can; core also rejects patterns its own check flags
const saveErrorMessage = (error: Error) =>
  error instanceof ApiError && error.reference === "INVALID_REQUEST_SCHEMA"
    ? "i can't use one of these rules. a name pattern may repeat inside a repeat, like (a+)+, which could stall the sync. simplify it"
    : syncErrorMessage(error);

/**
 * Fixed to the bottom of the content while the sync page is open: whether the settings
 * are saved, with save and discard. The panel's main has more bottom padding (pb-16) than
 * the bar is tall (h-14), so nothing ends up under it.
 */
export function StvSyncSaveBar({ form }: { form: SettingsForm }) {
  const { dirty, valid, saving, saveError } = form;

  return (
    <section
      aria-label="sync settings"
      data-settings-bar=""
      className="fixed right-0 bottom-0 left-[var(--panel-inset,0px)] z-30 select-none border-border border-t bg-surface px-4 pb-[env(safe-area-inset-bottom)] sm:px-8"
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <p role="status" className="m-0 flex min-w-0 items-center gap-2 text-sm">
            {saving ? (
              <>
                <Spinner />
                <span className="truncate">saving</span>
              </>
            ) : dirty ? (
              <>
                <span aria-hidden="true" className="size-1.5 shrink-0 bg-primary" />
                <span className="truncate text-foreground">unsaved changes</span>
              </>
            ) : (
              <span className="truncate text-muted">all changes saved</span>
            )}
          </p>
          {saveError ? (
            <p
              role="alert"
              className="m-0 truncate text-danger text-xs"
              title={saveErrorMessage(saveError)}
            >
              {saveErrorMessage(saveError)}
            </p>
          ) : (
            dirty &&
            !valid && (
              <p className="m-0 truncate text-danger text-xs">
                fix the marked fields to save
              </p>
            )
          )}
        </div>
        {dirty && (
          <Button size="sm" variant="ghost" disabled={saving} onClick={form.discard}>
            discard
          </Button>
        )}
        <Button
          size="sm"
          variant="primary"
          disabled={!dirty || !valid || saving}
          focusableWhenDisabled
          onClick={form.save}
        >
          {saving ? "saving" : "save"}
        </Button>
      </div>
    </section>
  );
}

/**
 * Asks before leaving the page with unsaved settings. In-app navigation gets our dialog;
 * a reload or closing the tab can only get the browser's own prompt.
 */
export function UnsavedSettingsGuard({ dirty }: { dirty: boolean }) {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current,
    enableBeforeUnload: () => dirtyRef.current,
    withResolver: true,
  });

  return (
    <AlertDialog
      open={blocker.status === "blocked"}
      onOpenChange={(open, details) => {
        if (open) return;
        if (details.returnValue === "leave") blocker.proceed?.();
        else blocker.reset?.();
      }}
    >
      <AlertDialogBackdrop className="bg-black/60" />
      {/* Top third instead of centered, like a sheet (no vertically centered screens) */}
      <AlertDialogContent className="mt-[15vh] mb-auto flex w-[min(26rem,calc(100%-2rem))] flex-col gap-4 border-border bg-background p-6 shadow-none">
        <div className="flex flex-col gap-2">
          <AlertDialogTitle className="font-semibold text-base tracking-tight">
            leave without saving?
          </AlertDialogTitle>
          <AlertDialogDescription className="m-0 text-muted text-sm">
            your changes to the sync settings aren&apos;t saved yet. if you leave,
            they&apos;re gone
          </AlertDialogDescription>
        </div>
        <div className="flex justify-end gap-2">
          <AlertDialogClose className={buttonClassName({ size: "sm" })}>
            keep editing
          </AlertDialogClose>
          <AlertDialogClose
            value="leave"
            className={buttonClassName({ variant: "primary", size: "sm" })}
          >
            leave
          </AlertDialogClose>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
