import { useQuery } from "@tanstack/react-query";

import { guildsQueryOptions } from "@/lib/guilds";
import { sessionQueryOptions } from "@/lib/session";

/**
 * Whether the editor offers "Add to server": a session with at least one server the user
 * can manage. Checked in the background, also on the public editor, which never waits for
 * it, redirects or asks to log in: no session, a failure or no servers just mean no button.
 */
export function useCanAddToServer() {
  // Long enough that refocusing the public editor doesn't ask again every time
  const session = useQuery({ ...sessionQueryOptions, staleTime: 5 * 60_000 });
  const guilds = useQuery({ ...guildsQueryOptions, enabled: session.data === true });
  return (
    session.data === true && (guilds.data?.guildsWithUserPermissions.length ?? 0) > 0
  );
}
