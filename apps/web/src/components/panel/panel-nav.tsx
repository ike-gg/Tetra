import { useQuery } from "@tanstack/react-query";
import { Link, type LinkComponentProps } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";

import { GuildIcon } from "@/components/panel/guild-icon";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { guildsQueryOptions, sortByName } from "@/lib/guilds";
import { INVITE_URL, inviteUrlFor } from "@/lib/links";
import { tasksQueryOptions } from "@/lib/tasks";

// Servers without tetra shown in the sidebar; the rest stay behind "Add server"
const ADDABLE_LIMIT = 5;

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
  const addableHeadingId = useId();
  const addable = guilds.data
    ? sortByName(guilds.data.guildsWithoutBotAvailableToAdd)
    : [];

  return (
    <nav aria-label="panel" className="flex flex-col gap-6 p-3">
      <ul className="flex flex-col gap-px">
        <li>
          <NavLink to="/panel" activeOptions={{ exact: true }} onClick={onNavigate}>
            <Glyph>⌂</Glyph>
            home
          </NavLink>
        </li>
        <li>
          <NavLink to="/panel/tasks" onClick={onNavigate}>
            <Glyph>✎</Glyph>
            tasks
            {pendingTasks > 0 && (
              <span className="ml-auto font-mono text-primary text-xs tabular-nums">
                {pendingTasks}
                <span className="sr-only"> pending</span>
              </span>
            )}
          </NavLink>
        </li>
        <li>
          <NavLink to="/panel/browse" onClick={onNavigate}>
            <Glyph>◇</Glyph>
            browse
          </NavLink>
        </li>
        <li>
          <NavLink to="/panel/channels" onClick={onNavigate}>
            <Glyph>@</Glyph>
            channels
          </NavLink>
        </li>
        <li>
          <NavLink to="/panel/editor" onClick={onNavigate}>
            <Glyph>◱</Glyph>
            editor
          </NavLink>
        </li>
      </ul>

      <section aria-labelledby={serversHeadingId} className="flex flex-col gap-2">
        <h2
          id={serversHeadingId}
          className="select-none px-2 font-mono font-normal text-muted text-xs uppercase tracking-widest"
        >
          servers
        </h2>

        {guilds.status === "pending" && (
          <p className="flex items-center gap-2 px-2 font-mono text-muted text-xs">
            <Spinner />
            loading servers
          </p>
        )}

        {guilds.status === "error" && (
          <div className="flex items-center gap-2 px-2">
            <p role="alert" className="text-danger text-xs">
              i couldn&apos;t load your servers
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={guilds.isFetching}
              onClick={() => void guilds.refetch()}
            >
              retry
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
          {addable.length === 0 && (
            <li>
              <a href={INVITE_URL} target="_blank" rel="noreferrer" className={ITEM}>
                <Glyph>+</Glyph>
                add server
              </a>
            </li>
          )}
        </ul>
      </section>

      {/* Servers the user can add tetra to, each opening Discord's invite with that server
          picked. Refetching the servers on window focus moves one up once it's added. */}
      {addable.length > 0 && (
        <section aria-labelledby={addableHeadingId} className="flex flex-col gap-2">
          <h2
            id={addableHeadingId}
            className="select-none px-2 font-mono font-normal text-muted text-xs uppercase tracking-widest"
          >
            add tetra
          </h2>
          <ul className="flex flex-col gap-px">
            {addable.slice(0, ADDABLE_LIMIT).map((guild) => (
              <li key={guild.id}>
                <a
                  href={inviteUrlFor(guild.id)}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(ITEM, "group/add")}
                >
                  <GuildIcon
                    guild={guild}
                    size="sm"
                    className="opacity-50 grayscale group-hover/add:opacity-100 group-hover/add:grayscale-0"
                  />
                  <span className="truncate">
                    <span className="sr-only">add tetra to </span>
                    {guild.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-auto font-mono text-muted group-hover/add:text-primary"
                  >
                    +
                  </span>
                </a>
              </li>
            ))}
            <li>
              <a href={INVITE_URL} target="_blank" rel="noreferrer" className={ITEM}>
                <Glyph>+</Glyph>
                {addable.length > ADDABLE_LIMIT
                  ? `${addable.length - ADDABLE_LIMIT} more`
                  : "other server"}
              </a>
            </li>
          </ul>
        </section>
      )}
    </nav>
  );
}
