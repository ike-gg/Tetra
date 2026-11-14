import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { EmoteMenu, useEmoteMenu } from "@/components/emote/emote-menu";
import { TaskTile } from "@/components/panel/task-tile";
import { fromTask } from "@/lib/emote";
import { findGuild, guildsQueryOptions } from "@/lib/guilds";
import type { Task } from "@/lib/tasks";

// Shared by Home (first few) and /panel/tasks (all)
export function TaskList({ tasks }: { tasks: Task[] }) {
  const guilds = useQuery(guildsQueryOptions);

  return (
    <EmoteMenu kind="task">
      <SyncSelection tasks={tasks} />
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

// A fixed or discarded task leaves the selection with its tile
function SyncSelection({ tasks }: { tasks: Task[] }) {
  const { syncSelection } = useEmoteMenu();
  const emotes = useMemo(() => tasks.map(fromTask), [tasks]);
  useEffect(() => syncSelection(emotes), [syncSelection, emotes]);
  return null;
}
