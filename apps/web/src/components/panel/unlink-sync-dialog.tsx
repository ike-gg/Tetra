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
import { useUnlinkSync } from "@/lib/stv-sync-mutations";

type UnlinkSyncDialogProps = { guildId: string; channelName: string };

// Unlinking drops the links and the queue for good, so it asks first. The dialog stays
// open while the request runs and shows its error inline.
export function UnlinkSyncDialog({ guildId, channelName }: UnlinkSyncDialogProps) {
  const unlink = useUnlinkSync(guildId);

  return (
    <AlertDialog pendingAnnouncement="unlinking the channel">
      <AlertDialogTrigger
        className={buttonClassName({ variant: "destructive", size: "sm" })}
      >
        unlink
      </AlertDialogTrigger>
      <AlertDialogBackdrop className="bg-black/60" />
      {/* Top third instead of centered, like a sheet (no vertically centered screens) */}
      <AlertDialogContent className="mt-[15vh] mb-auto flex w-[min(26rem,calc(100%-2rem))] flex-col gap-4 border-border bg-background p-6 shadow-none">
        <div className="flex flex-col gap-2">
          <AlertDialogTitle className="font-semibold text-base tracking-tight">
            unlink {channelName}?
          </AlertDialogTitle>
          <AlertDialogDescription className="m-0 text-muted text-sm">
            the emotes tetra already added stay on the server. the queue is cleared and
            tetra forgets which emotes came from 7TV, so removing them on 7TV won&apos;t
            remove them here anymore
          </AlertDialogDescription>
        </div>
        <AlertDialogClose
          value="confirm"
          action={unlink}
          render={(props, state) => (
            <div className="flex flex-col gap-3">
              {state.error instanceof Error && (
                <p role="alert" className="text-danger text-sm">
                  {state.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <AlertDialogClose className={buttonClassName({ size: "sm" })}>
                  cancel
                </AlertDialogClose>
                <button
                  {...props}
                  className={buttonClassName({ variant: "primary", size: "sm" })}
                >
                  {state.pending ? "unlinking" : state.error ? "try again" : "unlink"}
                </button>
              </div>
            </div>
          )}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
