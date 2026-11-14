import { useQuery } from "@tanstack/react-query";

import { EmoteMenu } from "@/components/emote/emote-menu";
import { TaskTile } from "@/components/panel/task-tile";
import { findGuild, guildsQueryOptions } from "@/lib/guilds";
import type { Task } from "@/lib/tasks";

// Shared by Home (first few) and /panel/tasks (all)
export function TaskList({ tasks }: { tasks: Task[] }) {
  const guilds = useQuery(guildsQueryOptions);

  return (
    <EmoteMenu kind="task">
      <ul className="flex flex-col gap-px border border-border bg-border">
        {tasks.map((task) => (
          <TaskTile
            key={task.id}
            task={task}
            guildName={findGuild(guilds.data, task.guildId)?.name}
          />
        ))}
      </ul>
    </EmoteMenu>
  );
}
