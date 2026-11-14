import { useQuery } from "@tanstack/react-query";
import { useId } from "react";

import { EmoteMenu } from "@/components/emote/emote-menu";
import { TaskTile } from "@/components/panel/task-tile";
import { findGuild, guildsQueryOptions } from "@/lib/guilds";
import type { Task } from "@/lib/tasks";

// Shared by Home (first few) and /panel/tasks (all)
export function TaskList({ tasks }: { tasks: Task[] }) {
  const guilds = useQuery(guildsQueryOptions);
  const hintId = useId();

  return (
    <EmoteMenu kind="task">
      <div className="flex flex-col gap-2">
        <ul className="flex flex-col gap-px border border-border bg-border">
          {tasks.map((task) => (
            <TaskTile
              key={task.id}
              task={task}
              guildName={findGuild(guilds.data, task.guildId)?.name}
              actionHintId={hintId}
            />
          ))}
        </ul>
        <p id={hintId} className="font-mono text-muted text-xs">
          fixing them here in the panel lands soon
        </p>
      </div>
    </EmoteMenu>
  );
}
