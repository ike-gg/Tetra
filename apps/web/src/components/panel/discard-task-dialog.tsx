import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ui-sdk/react/alert-dialog";

import { buttonClassName } from "@/components/ui/button";
import { useDiscardTask } from "@/lib/task-mutations";
import type { Task } from "@/lib/tasks";

type DiscardTaskDialogProps = {
  task: Task;
  // Ghost in the editor's toolbar, secondary where discarding is the way forward
  variant?: "ghost" | "secondary";
};

// Discarding deletes the stored original too, so it asks first. The dialog stays open
// while the request runs and shows its error inline; success leaves for Tasks.
export function DiscardTaskDialog({ task, variant = "ghost" }: DiscardTaskDialogProps) {
  const discard = useDiscardTask(task);

  return (
    <AlertDialog pendingAnnouncement="Discarding the task">
      <AlertDialogTrigger className={buttonClassName({ variant, size: "sm" })}>
        Discard task
      </AlertDialogTrigger>
      <AlertDialogBackdrop className="bg-black/60" />
      {/* Top third instead of centered, like a sheet (no vertically centered screens) */}
      <AlertDialogContent className="mt-[15vh] mb-auto flex w-[min(26rem,calc(100%-2rem))] flex-col gap-4 border-border bg-background p-6 shadow-none">
        <div className="flex flex-col gap-2">
          <AlertDialogTitle className="font-semibold text-base tracking-tight">
            Discard :{task.emote.name}:?
          </AlertDialogTitle>
          <AlertDialogDescription className="m-0 text-muted text-sm">
            The task and its original file are deleted. Nothing is added to the server.
            You can add the emote again with the bot.
          </AlertDialogDescription>
        </div>
        <AlertDialogClose
          value="confirm"
          action={discard}
          render={(props, state) => (
            <div className="flex flex-col gap-3">
              {state.error instanceof Error && (
                <p role="alert" className="text-danger text-sm">
                  {state.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <AlertDialogClose className={buttonClassName({ size: "sm" })}>
                  Cancel
                </AlertDialogClose>
                <button
                  {...props}
                  className={buttonClassName({ variant: "primary", size: "sm" })}
                >
                  {state.pending ? "Discarding…" : state.error ? "Try again" : "Discard"}
                </button>
              </div>
            </div>
          )}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
