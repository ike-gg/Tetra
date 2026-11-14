import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toaster";
import { ApiError, api, unwrap } from "@/lib/api";
import { type Fitting, type PanelEmote, toDiscordEmoteName } from "@/lib/emote";
import { toEmoteDataUrl } from "@/lib/emote-data-url";
import {
  holdSlotCounts,
  refreshSlotCounts,
  restoreSlotCounts,
  shiftSlotCounts,
  slotTypeOf,
  slotTypeOfPreview,
} from "@/lib/guild-slots";
import {
  type GuildDetails,
  guildQueryOptions,
  type ManagedGuild,
  type RemovedEmote,
  removedEmotesQueryOptions,
} from "@/lib/guilds";

/** A sentence for a toast, from the API's error reference (never from its message text). */
export const emoteErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "Couldn't reach Tetra. Check your connection and try again.";
  }
  switch (error.reference) {
    case "URL_NOT_ALLOWED":
      return "Tetra can't download emotes from that address.";
    case "DOWNLOAD_DATA_FAILED":
      return "Tetra couldn't download the emote file.";
    case "MISSING_PERMISSIONS":
      return "You need the Manage Expressions permission on that server.";
    case "USER_NOT_IN_GUILD":
    case "GUILD_NOT_FOUND_UNKNOWN_GUILD_BOT":
      return "You or Tetra aren't on that server anymore.";
    case "OAUTH_GET_GUILDS_ERROR":
      return "Discord didn't confirm your servers in time. Try again in a moment.";
    case "INVALID_REQUEST_SCHEMA":
      return "Discord won't take that name: 2–32 letters, numbers or _.";
    case "GUILD_EMOTE_NOT_FOUND":
    case "EMOTE_NOT_FOUND":
      return "It's already gone.";
    case "GUILD_EMOTE_DELETE_FAILED":
      return "Discord didn't let Tetra remove it.";
    case "EMOTE_TOO_LARGE":
      return "Too big for Discord's 256 KB limit, even after optimizing.";
    case "GUILD_EMOJI_LIMIT_REACHED":
      return "No free emote slots of that type on the server.";
    case "BOT_MISSING_PERMISSIONS":
      return "Tetra lost the Manage Expressions permission on that server.";
    case "INVALID_EMOTE_NAME":
      return "Discord won't take that name: 2–32 letters, numbers or _.";
    case "INVALID_EMOTE_FILE":
      return "Discord rejected the image file.";
    case "PAYLOAD_TOO_LARGE":
      return "The file is too big to send. Get it under 256 KB first.";
    case "TASK_NOT_FOUND":
      return "This task is gone: it was already fixed or discarded.";
    case "FILE_TOO_LARGE":
      return "The original file is over 10 MB, too big for Tetra to fetch.";
    case "UNSUPPORTED_FILE_TYPE":
      return "The original isn't a GIF, PNG, WebP or JPEG image.";
    case "NO_SESSION":
    case "SESSION_EXPIRED":
      return "Your session ended. Log in again, then add it.";
    case "RATE_LIMITED":
      return "That's a lot at once. Wait a moment and try again.";
    // Any Discord error core doesn't map to its own code
    case "DISCORD_API_ERROR":
      return `Discord said: ${error.message}`;
  }
  if (error.status >= 500) {
    return "Something broke on our side. Try again.";
  }
  return error.message;
};

type AddVariables = { emote: PanelEmote; guild: ManagedGuild; fitting: Fitting };

/** "Add to server": copies an emote to one of the user's servers, with a toast. */
export function useAddEmote() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ emote, guild, fitting }: AddVariables) =>
      unwrap(
        api.guilds[":guildId"].emote.$post({
          param: { guildId: guild.id },
          json: { file: emote.url, name: toDiscordEmoteName(emote.name), fitting },
        })
      ),
    // Counts move at once; Discord may have optimized the file into the other type
    onSuccess: async ({ preview }, { guild }) => {
      await holdSlotCounts(queryClient, guild.id);
      shiftSlotCounts(queryClient, guild.id, slotTypeOfPreview(preview), 1);
    },
    onSettled: (_data, _error, { guild }) => refreshSlotCounts(queryClient, guild.id),
  });

  // Resolves to whether it worked; the toast already told the user either way
  return (variables: AddVariables): Promise<boolean> => {
    const name = toDiscordEmoteName(variables.emote.name);
    const request = mutation.mutateAsync(variables);
    toast.promise(request, {
      loading: `Adding ${name} to ${variables.guild.name}…`,
      success: { title: `Added ${name} to ${variables.guild.name}` },
      error: (error) => ({
        title: `Couldn't add ${name} to ${variables.guild.name}`,
        description: emoteErrorMessage(error),
      }),
    });
    return request.then(
      () => true,
      () => false
    );
  };
}

type UploadVariables = { blob: Blob; name: string; guild: ManagedGuild };

/**
 * "Add to server" from the editor: uploads the finished result as it is, without core
 * optimizing it again. Resolves to whether it worked; the toast already told the user.
 */
export function useUploadEmote() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ blob, name, guild }: UploadVariables) =>
      unwrap(
        api.guilds[":guildId"].emote.upload.$post({
          param: { guildId: guild.id },
          json: { emote: await toEmoteDataUrl(blob), name },
        })
      ),
    onSuccess: async ({ preview }, { guild }) => {
      await holdSlotCounts(queryClient, guild.id);
      shiftSlotCounts(queryClient, guild.id, slotTypeOfPreview(preview), 1);
    },
    onSettled: (_data, _error, { guild }) => refreshSlotCounts(queryClient, guild.id),
  });

  const upload = (variables: UploadVariables): Promise<boolean> => {
    const label = `:${variables.name}:`;
    const request = mutation.mutateAsync(variables);
    toast.promise(request, {
      loading: `Adding ${label} to ${variables.guild.name}…`,
      success: { title: `Added ${label} to ${variables.guild.name}` },
      error: (error) => ({
        title: `Couldn't add ${label} to ${variables.guild.name}`,
        description: emoteErrorMessage(error),
      }),
    });
    return request.then(
      () => true,
      () => false
    );
  };

  return { upload, pending: mutation.isPending };
}

/** Removes an emote from its server: gone from the grid at once, back if it fails. */
export function useRemoveEmote(guildId: string) {
  const queryClient = useQueryClient();
  const guildKey = guildQueryOptions(guildId).queryKey;

  const mutation = useMutation({
    mutationFn: (emote: PanelEmote) =>
      unwrap(
        api.guilds[":guildId"].emote[":emoteId"].$delete({
          param: { guildId, emoteId: emote.id },
        })
      ),
    onMutate: async (emote) => {
      const snapshot = await holdSlotCounts(queryClient, guildId);
      queryClient.setQueryData<GuildDetails>(
        guildKey,
        (guild) =>
          guild && { ...guild, emotes: guild.emotes.filter(({ id }) => id !== emote.id) }
      );
      // Integration emotes don't take slots
      if (!emote.managed) {
        shiftSlotCounts(queryClient, guildId, slotTypeOf(emote.animated), -1);
      }
      return snapshot;
    },
    onError: (_error, _emote, snapshot) => {
      if (snapshot) restoreSlotCounts(queryClient, guildId, snapshot);
    },
    onSettled: () => refreshSlotCounts(queryClient, guildId),
  });

  return (emote: PanelEmote, guildName: string) => {
    toast.promise(mutation.mutateAsync(emote), {
      loading: `Removing ${emote.name}…`,
      success: {
        title: `Removed ${emote.name} from ${guildName}`,
        description: "You can put it back from Removed.",
      },
      error: (error) => ({
        title: `Couldn't remove ${emote.name}`,
        description: emoteErrorMessage(error),
      }),
    });
  };
}

const restoreKey = (guildId: string) => ["restore-emote", guildId];

/** Puts a removed emote back on its server. */
export function useRestoreEmote(guildId: string) {
  const queryClient = useQueryClient();
  const removedKey = removedEmotesQueryOptions(guildId).queryKey;

  const mutation = useMutation({
    mutationKey: restoreKey(guildId),
    mutationFn: (emote: PanelEmote) =>
      unwrap(
        api.guilds[":guildId"].restore[":restoreId"].$post({
          param: { guildId, restoreId: String(emote.restoreId) },
        })
      ),
    onSuccess: async ({ preview }, emote) => {
      queryClient.setQueryData<RemovedEmote[]>(removedKey, (removed) =>
        removed?.filter(({ id }) => id !== emote.restoreId)
      );
      await holdSlotCounts(queryClient, guildId);
      shiftSlotCounts(queryClient, guildId, slotTypeOfPreview(preview), 1);
    },
    onSettled: () => refreshSlotCounts(queryClient, guildId),
  });

  return (emote: PanelEmote, guildName: string) => {
    toast.promise(mutation.mutateAsync(emote), {
      loading: `Restoring ${emote.name}…`,
      success: { title: `Restored ${emote.name} on ${guildName}` },
      error: (error) => ({
        title: `Couldn't restore ${emote.name}`,
        description: emoteErrorMessage(error),
      }),
    });
  };
}

/** Keys of the removed emotes on this server that are being restored right now. */
export function useRestoringKeys(guildId: string) {
  return useMutationState({
    filters: { mutationKey: restoreKey(guildId), status: "pending" },
    select: (mutation) => (mutation.state.variables as PanelEmote | undefined)?.key,
  });
}
