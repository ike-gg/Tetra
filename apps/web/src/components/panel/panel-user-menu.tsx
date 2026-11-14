import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@ui-sdk/react/avatar";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@ui-sdk/react/menu";

import { logout, meQueryOptions, sessionQueryOptions } from "@/lib/session";

export function PanelUserMenu() {
  const queryClient = useQueryClient();
  const me = useQuery(meQueryOptions);

  const logoutMutation = useMutation({
    mutationFn: logout,
    // The gate shows the login screen right away, and nothing of the previous user stays
    // in the cache. Only the session query survives: the gate observes it.
    onSettled: () => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, false);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== sessionQueryOptions.queryKey[0],
      });
    },
  });

  const user = me.data;
  const name = user ? (user.global_name ?? user.username) : undefined;

  return (
    <Menu
      onAction={(value) => (value === "logout" ? logoutMutation.mutateAsync() : null)}
    >
      <MenuTrigger
        aria-label={name ? `Account: ${name}` : "Account"}
        className="flex h-8 cursor-default select-none items-center gap-2 border-0 bg-transparent px-1.5 font-normal text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2 active:bg-neutral-800 data-open:bg-surface sm:px-2"
      >
        <Avatar className="flex size-6 shrink-0 items-center justify-center overflow-hidden bg-neutral-800 font-medium text-neutral-300 text-xs">
          {user?.avatar && (
            <AvatarImage
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`}
              alt=""
              draggable={false}
              className="size-full object-cover"
            />
          )}
          <AvatarFallback aria-hidden="true">{name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        {name && <span className="hidden max-w-40 truncate sm:inline">{name}</span>}
        <span aria-hidden="true" className="font-mono text-muted text-xs">
          ▾
        </span>
      </MenuTrigger>
      <MenuContent
        side="bottom"
        align="end"
        sideOffset={4}
        className="min-w-52 border border-border bg-background p-1 shadow-none"
      >
        {user && (
          <MenuGroup>
            <MenuGroupLabel className="flex select-none flex-col px-2 pt-1.5 pb-2">
              <span className="truncate font-medium text-foreground text-sm">{name}</span>
              <span className="truncate font-mono text-muted text-xs">
                @{user.username}
              </span>
            </MenuGroupLabel>
          </MenuGroup>
        )}
        {user && <MenuSeparator className="my-1 h-px bg-border" />}
        <MenuItem
          value="logout"
          className="flex h-8 min-h-0 cursor-default select-none items-center px-2 text-sm data-highlighted:bg-surface data-pending:cursor-wait"
        >
          Log out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
