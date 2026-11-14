import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PanelScreen } from "@/components/panel/panel-screen";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { logout, meQueryOptions, sessionQueryOptions } from "@/lib/session";

// Placeholder for the logged-in panel until it has real screens: who you are + log out
export function PanelPlaceholder() {
  const queryClient = useQueryClient();
  const me = useQuery(meQueryOptions);

  const logoutMutation = useMutation({
    mutationFn: logout,
    // Dropped instead of invalidated: the gate shows the login screen right away, and
    // nothing of the previous user stays in the cache
    onSettled: () => {
      queryClient.removeQueries({ queryKey: meQueryOptions.queryKey });
      queryClient.setQueryData(sessionQueryOptions.queryKey, false);
    },
  });

  const user = me.data;

  return (
    <PanelScreen
      actions={
        <Button
          variant="ghost"
          size="sm"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          Log out
        </Button>
      }
    >
      {user ? (
        <div className="flex items-center gap-3">
          {user.avatar && (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`}
              alt=""
              width={32}
              height={32}
              className="size-8 bg-surface"
            />
          )}
          <Text size="sm">
            Logged in as{" "}
            <span className="font-medium">{user.global_name ?? user.username}</span>
          </Text>
        </div>
      ) : me.isError ? (
        <p role="alert" className="text-danger text-sm">
          Couldn&apos;t load your Discord profile.
        </p>
      ) : (
        <Text size="sm" tone="muted" className="flex items-center gap-2 font-mono">
          <Spinner />
          loading your profile…
        </Text>
      )}
    </PanelScreen>
  );
}
