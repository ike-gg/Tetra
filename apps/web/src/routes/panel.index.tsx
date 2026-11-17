import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { GuildTile, TILE } from "@/components/panel/guild-tile";
import { GuildsError } from "@/components/panel/guilds-error";
import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { QuickAdd } from "@/components/panel/quick-add";
import { TaskList } from "@/components/panel/task-list";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { type GuildLists, guildsQueryOptions, sortByName } from "@/lib/guilds";
import { INVITE_URL } from "@/lib/links";
import { meQueryOptions } from "@/lib/session";
import { tasksQueryOptions } from "@/lib/tasks";

const HOME_TASKS = 4;

// Rendered inside the session gate and layout of `/panel` (panel.lazy.tsx)
export const Route = createFileRoute("/panel/")({
  component: PanelHome,
});

function PanelHome() {
  const me = useQuery(meQueryOptions);
  const name = me.data ? (me.data.global_name ?? me.data.username) : undefined;

  return (
    <div className="flex flex-col gap-12">
      <Heading level={1} size="lg">
        welcome back
        {name && (
          <>
            , <Accent>{name}</Accent>
          </>
        )}
      </Heading>
      <QuickAdd className="max-w-xl" />
      <PendingTasks />
      <Servers />
    </div>
  );
}

function PendingTasks() {
  const tasks = useQuery(tasksQueryOptions);

  if (tasks.status === "error") {
    return (
      <PanelError retrying={tasks.isFetching} onRetry={() => void tasks.refetch()}>
        i couldn&apos;t load your pending tasks
      </PanelError>
    );
  }

  // Only shown when there's something to do; no placeholder while it loads
  if (!tasks.data?.length) return null;

  return (
    <section aria-labelledby="home-tasks" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={2} size="sm" id="home-tasks">
            pending tasks{" "}
            <span className="font-mono font-normal text-primary text-sm tabular-nums">
              {tasks.data.length}
            </span>
          </Heading>
          <Text size="sm" tone="muted">
            emotes the bot couldn&apos;t fit into Discord&apos;s limit on its own. they
            wait here until you fix them
          </Text>
        </div>
        {tasks.data.length > HOME_TASKS && (
          <Button variant="ghost" size="sm" render={<Link to="/panel/tasks" />}>
            view all
          </Button>
        )}
      </div>
      <TaskList tasks={tasks.data.slice(0, HOME_TASKS)} />
    </section>
  );
}

function Servers() {
  const guilds = useQuery(guildsQueryOptions);

  return (
    <section aria-labelledby="home-servers" className="flex flex-col gap-4">
      <Heading level={2} size="sm" id="home-servers">
        your servers
      </Heading>

      {guilds.status === "pending" && <PanelLoading>loading your servers</PanelLoading>}

      {guilds.status === "error" && (
        <GuildsError
          error={guilds.error}
          retrying={guilds.isFetching}
          onRetry={() => void guilds.refetch()}
        />
      )}

      {guilds.data &&
        (guilds.data.guildsWithUserPermissions.length === 0 ? (
          <NoServers lists={guilds.data} />
        ) : (
          <>
            {/* Outlines instead of a gap-px background: no filled holes in a short last row */}
            <ul className="grid grid-cols-1 gap-px p-px sm:grid-cols-2 xl:grid-cols-3">
              {sortByName(guilds.data.guildsWithUserPermissions).map((guild) => (
                <li key={guild.id} className="min-w-0 outline outline-border">
                  <GuildTile guild={guild} />
                </li>
              ))}
              <li className="min-w-0 outline outline-border">
                <a href={INVITE_URL} target="_blank" rel="noreferrer" className={TILE}>
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-10 items-center justify-center border border-neutral-700 border-dashed font-mono text-muted"
                    >
                      +
                    </span>
                    <span className="font-medium text-foreground text-sm">
                      add tetra to a server
                    </span>
                  </span>
                  <AddableHint lists={guilds.data} />
                </a>
              </li>
            </ul>
            <ReadOnlyServers lists={guilds.data} />
          </>
        ))}
    </section>
  );
}

function AddableHint({ lists }: { lists: GuildLists }) {
  const count = lists.guildsWithoutBotAvailableToAdd.length;
  return (
    <span className="text-muted text-xs">
      {count > 0
        ? `${count} of your servers ${count === 1 ? "doesn't" : "don't"} have it yet`
        : "opens Discord's invite in a new tab"}
    </span>
  );
}

function NoServers({ lists }: { lists: GuildLists }) {
  return (
    <div className="flex max-w-lg flex-col items-start gap-4 border border-border p-6">
      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm">no servers to manage yet</p>
        <Text size="sm" tone="muted">
          servers show up here once tetra is on them and you have the manage expressions
          permission there
          {lists.guildsWithoutBotAvailableToAdd.length > 0 &&
            `. you can add it to ${lists.guildsWithoutBotAvailableToAdd.length} of yours`}
        </Text>
      </div>
      <Button
        variant="primary"
        render={<a href={INVITE_URL} target="_blank" rel="noreferrer" />}
      >
        add tetra to a server
      </Button>
      <ReadOnlyServers lists={lists} />
    </div>
  );
}

// Tetra is there, but the user can't manage emotes: worth a quiet mention, not a tile
function ReadOnlyServers({ lists }: { lists: GuildLists }) {
  const names = lists.guildsWithBot.map((guild) => guild.name);
  if (names.length === 0) return null;

  return (
    <Text size="xs" tone="muted">
      tetra is also on{" "}
      {names.length === 1 ? "one more server" : `${names.length} more servers`} of yours,
      where you&apos;d need manage expressions to manage emotes:{" "}
      <span className="text-foreground">{names.join(", ")}</span>
    </Text>
  );
}
