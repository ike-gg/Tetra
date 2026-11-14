import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { TaskList } from "@/components/panel/task-list";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { tasksQueryOptions } from "@/lib/tasks";

export const Route = createFileRoute("/panel/tasks")({
  head: () => ({ meta: [{ title: "Tasks · Panel · Tetra" }] }),
  component: PanelTasks,
});

function PanelTasks() {
  const tasks = useQuery(tasksQueryOptions);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Heading level={1} size="lg">
          Pending tasks
        </Heading>
        <Text size="sm" tone="muted">
          Emotes the bot couldn&apos;t fit into Discord&apos;s limit on its own, sent here
          with &ldquo;Open in editor&rdquo;. Newest first.
        </Text>
      </div>

      {tasks.status === "pending" && <PanelLoading>loading your tasks…</PanelLoading>}

      {tasks.status === "error" && (
        <PanelError retrying={tasks.isFetching} onRetry={() => void tasks.refetch()}>
          Couldn&apos;t load your pending tasks.
        </PanelError>
      )}

      {tasks.data &&
        (tasks.data.length === 0 ? (
          <Text size="sm" tone="muted" className="font-mono">
            nothing to fix · every emote fit :NODDERS:
          </Text>
        ) : (
          <TaskList tasks={tasks.data} />
        ))}
    </div>
  );
}
