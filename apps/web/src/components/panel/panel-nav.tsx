import { useQuery } from "@tanstack/react-query";
import { Link, type LinkComponentProps } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";

import { GuildIcon } from "@/components/panel/guild-icon";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { guildsQueryOptions, sortByName } from "@/lib/guilds";
import { INVITE_URL } from "@/lib/links";
import { tasksQueryOptions } from "@/lib/tasks";

// Native list rows: instant hover/press, an orange edge on the current page
const ITEM =
  "relative flex h-8 min-w-0 cursor-default select-none items-center gap-2.5 px-2 text-muted text-sm no-underline hover:bg-surface hover:text-foreground active:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2 data-[status=active]:bg-surface data-[status=active]:text-foreground data-[status=active]:before:absolute data-[status=active]:before:inset-y-0 data-[status=active]:before:left-0 data-[status=active]:before:w-0.5 data-[status=active]:before:bg-primary";

function Glyph({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="w-5 shrink-0 text-center font-mono">
      {children}
    </span>
  );
}

function NavLink({
  className,
  ...props
}: LinkComponentProps<"a"> & { className?: string }) {
  return <Link {...props} className={cn(ITEM, className)} />;
}

type PanelNavProps = {
  // Closes the mobile drawer once a link is followed
  onNavigate?: () => void;
};

export function PanelNav({ onNavigate }: PanelNavProps) {
  const tasks = useQuery(tasksQueryOptions);
  const guilds = useQuery(guildsQueryOptions);
  const pendingTasks = tasks.data?.length ?? 0;
  // The nav renders twice on narrow screens (hidden sidebar + drawer)
  const serversHeadingId = useId();

  return (
    <nav aria-label="Panel" className="flex flex-col gap-6 p-3">
      <ul className="flex flex-col gap-px">
        <li>
          <NavLink to="/panel" activeOptions={{ exact: true }} onClick={onNavigate}>
            <Glyph>⌂</Glyph>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/panel/tasks" onClick={onNavigate}>
            <Glyph>✎</Glyph>
            Tasks
            {pendingTasks > 0 && (
              <span className="ml-auto font-mono text-primary text-xs tabular-nums">
                {pendingTasks}
                <span className="sr-only"> pending</span>
              </span>
            )}
          </NavLink>
        </li>
        <li>
          <NavLink to="/editor" onClick={onNavigate}>
            <Glyph>◱</Glyph>
            Editor
          </NavLink>
        </li>
      </ul>

      <section aria-labelledby={serversHeadingId} className="flex flex-col gap-2">
        <h2
          id={serversHeadingId}
          className="select-none px-2 font-mono font-normal text-muted text-xs uppercase tracking-widest"
        >
          Servers
        </h2>

        {guilds.status === "pending" && (
          <p className="flex items-center gap-2 px-2 font-mono text-muted text-xs">
            <Spinner />
            loading…
          </p>
        )}

        {guilds.status === "error" && (
          <div className="flex items-center gap-2 px-2">
            <p role="alert" className="text-danger text-xs">
              Couldn&apos;t load servers.
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={guilds.isFetching}
              onClick={() => void guilds.refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        <ul className="flex flex-col gap-px">
          {guilds.data &&
            sortByName(guilds.data.guildsWithUserPermissions).map((guild) => (
              <li key={guild.id}>
                <NavLink
                  to="/panel/servers/$guildId"
                  params={{ guildId: guild.id }}
                  onClick={onNavigate}
                >
                  <GuildIcon guild={guild} size="sm" />
                  <span className="truncate">{guild.name}</span>
                </NavLink>
              </li>
            ))}
          <li>
            <a href={INVITE_URL} target="_blank" rel="noreferrer" className={ITEM}>
              <Glyph>+</Glyph>
              Add server
            </a>
          </li>
        </ul>
      </section>
    </nav>
  );
}
