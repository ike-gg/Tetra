import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { toast } from "@/components/ui/toaster";
import { track } from "@/lib/analytics";
import { api, unwrap } from "@/lib/api";
import { toEmoteDataUrl } from "@/lib/emote-data-url";
import {
  holdSlotCounts,
  refreshSlotCounts,
  shiftSlotCounts,
  slotTypeOf,
  slotTypeOfPreview,
} from "@/lib/guild-slots";
import {
  type QueueEntry,
  type SyncSettings,
  type SyncState,
  syncErrorMessage,
  syncKey,
  syncQueryOptions,
} from "@/lib/stv-sync";

// Every write answers the new state: show it at once, then refresh the queue and counts
function useApplyState(guildId: string) {
  const queryClient = useQueryClient();
  return (state?: SyncState) => {
    if (state) queryClient.setQueryData(syncQueryOptions(guildId).queryKey, state);
    return queryClient.invalidateQueries({ queryKey: syncKey(guildId) });
  };
}

/** Links a channel by login. Errors stay on the mutation for the form to show. */
export function useLinkChannel(guildId: string) {
  const apply = useApplyState(guildId);
  return useMutation({
    mutationFn: (login: string) =>
      unwrap(api.guilds[":guildId"].sync.$put({ param: { guildId }, json: { login } })),
    onSuccess: (state) => apply(state),
  });
}

/** Pauses or resumes; the switch shows the new value while it runs. */
export function useSetSyncEnabled(guildId: string) {
  const apply = useApplyState(guildId);
  return useMutation({
    mutationFn: (enabled: boolean) =>
      unwrap(
        api.guilds[":guildId"].sync.$patch({ param: { guildId }, json: { enabled } })
      ),
    onSuccess: (state) => apply(state),
    onError: (error, enabled) =>
      toast.error(enabled ? "couldn't resume the sync" : "couldn't pause the sync", {
        description: syncErrorMessage(error),
      }),
  });
}

/** For a confirm dialog's action: throws an `Error` with a sentence on failure. */
export function useUnlinkSync(guildId: string) {
  const apply = useApplyState(guildId);
  return async () => {
    try {
      const state = await unwrap(
        api.guilds[":guildId"].sync.$delete({ param: { guildId } })
      );
      await apply(state);
    } catch (error) {
      throw new Error(syncErrorMessage(error));
    }
  };
}

export function useSaveSyncSettings(guildId: string) {
  const apply = useApplyState(guildId);
  return useMutation({
    mutationFn: (settings: SyncSettings) =>
      unwrap(
        api.guilds[":guildId"].sync.settings.$put({ param: { guildId }, json: settings })
      ),
    onSuccess: (state) => {
      toast.success("saved the sync settings");
      return apply(state);
    },
  });
}

type Guild = { id: string; name: string };

/**
 * Runs the add again for one queued emote, filters skipped. Still failing isn't an error:
 * the toast shows the entry's new reason as tetra wrote it.
 */
export function useRetryQueueEntry(guild: Guild) {
  const queryClient = useQueryClient();
  const apply = useApplyState(guild.id);

  return useMutation({
    mutationFn: (entry: QueueEntry) =>
      unwrap(
        api.guilds[":guildId"].sync.queue[":entryId"].retry.$post({
          param: { guildId: guild.id, entryId: String(entry.id) },
        })
      ),
    onSuccess: async (outcome, entry) => {
      const label = `:${entry.discordName}:`;
      if (outcome.result === "added") {
        track("emote_add", { source: "7tv" });
        toast.success(`added ${label} to ${guild.name}`);
        await holdSlotCounts(queryClient, guild.id);
        shiftSlotCounts(queryClient, guild.id, slotTypeOf(outcome.emote.animated), 1);
        void refreshSlotCounts(queryClient, guild.id);
      } else if (outcome.result === "queued") {
        toast(`${label} is still in the queue`, { description: outcome.entry.message });
      } else {
        toast(`${label} is already synced`, {
          description: "it's on the server, so i took it off the queue",
        });
      }
      await apply();
    },
    onError: (error, entry) => {
      toast.error(`couldn't retry :${entry.discordName}:`, {
        description: syncErrorMessage(error),
      });
      void apply();
    },
  });
}

type DismissVariables = { entry: QueueEntry; exclude: boolean };

export function useDismissQueueEntry(guildId: string) {
  const apply = useApplyState(guildId);

  return useMutation({
    mutationFn: ({ entry, exclude }: DismissVariables) =>
      unwrap(
        api.guilds[":guildId"].sync.queue[":entryId"].$delete({
          param: { guildId, entryId: String(entry.id) },
          query: exclude ? { exclude: "true" } : {},
        })
      ),
    onSuccess: ({ excluded }, { entry }) => {
      toast.success(
        excluded
          ? `dismissed :${entry.discordName}: and excluded it`
          : `dismissed :${entry.discordName}:`,
        excluded ? { description: "the sync skips this emote from now on" } : undefined
      );
      return apply();
    },
    onError: (error, { entry }) => {
      toast.error(`couldn't dismiss :${entry.discordName}:`, {
        description: syncErrorMessage(error),
      });
      void apply();
    },
  });
}

const EXTENSIONS: Record<string, string> = {
  "image/gif": "gif",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Puts the queued emote's 7TV file into the editor's local library and opens it in the
 * panel's editor with the queue entry as its target, so "add" goes back to the sync.
 */
export function useOpenQueueEntryInEditor(guildId: string) {
  const navigate = useNavigate();

  return async (entry: QueueEntry) => {
    const label = `:${entry.discordName}:`;
    const request = (async () => {
      const [response, { importToLibrary }] = await Promise.all([
        fetch(entry.fileUrl),
        import("@/lib/media/import-media"),
      ]);
      if (!response.ok) {
        throw new Error(`7TV answered ${response.status}. try again in a moment`);
      }
      const blob = await response.blob();
      const extension = EXTENSIONS[blob.type] ?? (entry.animated ? "gif" : "png");
      return importToLibrary(blob, `${entry.discordName}.${extension}`);
    })();
    toast.promise(request, {
      loading: `opening ${label} in the editor`,
      success: { title: `opened ${label} in the editor` },
      error: (error) => ({
        title: `couldn't open ${label} in the editor`,
        description:
          error instanceof TypeError
            ? "i couldn't download it from 7TV. check your connection and try again"
            : error instanceof Error
              ? error.message
              : undefined,
      }),
    });
    try {
      const key = await request;
      await navigate({
        to: "/panel/editor/$key",
        params: { key },
        search: { syncGuild: guildId, syncEntry: entry.id },
      });
    } catch {
      // The toast already told the user
    }
  };
}

type UploadVariables = { blob: Blob; name: string };

/**
 * The editor's "add to <server>" for a queue entry: uploads the result as it is, links it
 * to the 7TV emote, then goes back to the sync page.
 */
export function useUploadQueueEntry(guild: Guild, entryId: number) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async ({ blob, name }: UploadVariables) =>
      unwrap(
        api.guilds[":guildId"].sync.queue[":entryId"].upload.$post({
          param: { guildId: guild.id, entryId: String(entryId) },
          json: { emote: await toEmoteDataUrl(blob), name },
        })
      ),
    onSuccess: async ({ preview }) => {
      track("emote_add", { source: "file" });
      await holdSlotCounts(queryClient, guild.id);
      shiftSlotCounts(queryClient, guild.id, slotTypeOfPreview(preview), 1);
      await navigate({
        to: "/panel/servers/$guildId/sync",
        params: { guildId: guild.id },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: syncKey(guild.id) }),
        refreshSlotCounts(queryClient, guild.id),
      ]);
    },
  });

  const upload = (variables: UploadVariables) => {
    const label = `:${variables.name}:`;
    toast.promise(mutation.mutateAsync(variables), {
      loading: `adding ${label} to ${guild.name}`,
      success: { title: `added ${label} to ${guild.name}` },
      error: (error) => ({
        title: `couldn't add ${label} to ${guild.name}`,
        description: syncErrorMessage(error),
      }),
    });
  };

  return { upload, pending: mutation.isPending };
}
