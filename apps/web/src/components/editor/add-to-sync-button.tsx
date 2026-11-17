import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatBytes } from "@/lib/format-bytes";
import { guildsQueryOptions } from "@/lib/guilds";
import { DISCORD_EMOTE_LIMIT } from "@/lib/media/edit";
import { useUploadQueueEntry } from "@/lib/stv-sync-mutations";

import type { MediaEditorState } from "./media-editor";

export type SyncTarget = { guildId: string; entryId: number };

function useTargetGuild({ guildId }: SyncTarget) {
  const guilds = useQuery(guildsQueryOptions);
  const name =
    guilds.data?.guildsWithUserPermissions.find(({ id }) => id === guildId)?.name ??
    "the server";
  return { id: guildId, name };
}

const blockedBy = ({ result, pending, fits, nameValid }: MediaEditorState) => {
  if (!result || pending) return "wait for the result to finish";
  if (!fits) return `get it under ${formatBytes(DISCORD_EMOTE_LIMIT)} first`;
  if (!nameValid) return "fix the emote name first";
  return undefined;
};

/**
 * Replaces "add to server ▾" when the file came from a 7TV sync queue: the result goes to
 * that queue entry, so tetra links it to the 7TV emote.
 */
export function AddToSyncButton({
  state,
  target,
}: {
  state: MediaEditorState;
  target: SyncTarget;
}) {
  const guild = useTargetGuild(target);
  const { upload, pending } = useUploadQueueEntry(guild, target.entryId);
  const blocked = blockedBy(state);
  const { result, name } = state;

  return (
    <Button
      variant="primary"
      size="sm"
      glow
      className="min-w-0"
      disabled={Boolean(blocked) || pending}
      focusableWhenDisabled
      title={blocked}
      onClick={() => result && upload({ blob: result.blob, name })}
    >
      <span className="truncate">{pending ? "adding" : `add to ${guild.name}`}</span>
    </Button>
  );
}

export function SyncTargetNotice({ target }: { target: SyncTarget }) {
  const guild = useTargetGuild(target);
  return (
    <Notice
      title={`from the 7TV sync queue of ${guild.name}`}
      className="shrink-0 border-x-0 border-t-0"
    >
      add it from here and tetra links it to the 7TV emote, so it&apos;s removed when the
      streamer removes it
    </Notice>
  );
}
