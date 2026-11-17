import { ServerMenuItems } from "@/components/panel/server-menu-items";
import { buttonClassName } from "@/components/ui/button";
import { Menu, MenuContent, MenuTrigger } from "@/components/ui/menu";
import { useUploadEmote } from "@/lib/emote-mutations";
import { formatBytes } from "@/lib/format-bytes";
import { DISCORD_EMOTE_LIMIT } from "@/lib/media/edit";

import type { MediaEditorState } from "./media-editor";

type AddToServerMenuProps = {
  state: MediaEditorState;
  animated: boolean;
};

// Why the button is off, for its tooltip; the editor shows the same thing in place
const blockedBy = ({ result, pending, fits, nameValid }: MediaEditorState) => {
  if (!result || pending) return "wait for the result to finish";
  if (!fits) return `get it under ${formatBytes(DISCORD_EMOTE_LIMIT)} first`;
  if (!nameValid) return "fix the emote name first";
  return undefined;
};

/**
 * "Add to server ▾" in the editor's toolbar: uploads the finished result to one of the
 * user's servers. Loaded only for a session with servers, so the public editor doesn't
 * ship it to everyone. The editor keeps its state, so it can go to another server too.
 */
export function AddToServerMenu({ state, animated }: AddToServerMenuProps) {
  const { upload, pending: adding } = useUploadEmote();
  const blocked = blockedBy(state);
  const { result, name } = state;

  return (
    <Menu>
      <MenuTrigger
        disabled={Boolean(blocked) || adding}
        // Stays reachable, so the tooltip can say why it's off
        focusableWhenDisabled
        title={blocked}
        className={buttonClassName({
          variant: "primary",
          size: "sm",
          glow: true,
          className: "data-open:bg-primary",
        })}
      >
        {adding ? (
          "adding"
        ) : (
          <>
            <span>
              add<span className="max-sm:sr-only"> to server</span>
            </span>
            <span aria-hidden="true" className="font-mono text-xs opacity-60">
              ▾
            </span>
          </>
        )}
      </MenuTrigger>
      <MenuContent side="bottom" align="end" className="max-w-80">
        <ServerMenuItems
          animated={animated}
          onPick={(guild) => {
            if (result) void upload({ blob: result.blob, name, guild });
          }}
        />
      </MenuContent>
    </Menu>
  );
}
