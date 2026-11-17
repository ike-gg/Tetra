import { Link } from "@tanstack/react-router";

import { Emote } from "@/components/emote/emote";
import { Button } from "@/components/ui/button";
import { fromTask } from "@/lib/emote";
import { relativeTime } from "@/lib/relative-time";
import type { Task } from "@/lib/tasks";

const ORIGINS: Record<Task["emote"]["origin"], string> = {
  DISCORD: "Discord",
  SEVENTV: "7TV",
  BTTV: "BTTV",
  FFZ: "FFZ",
  TWITCH: "Twitch",
  CUSTOM: "link",
};

type TaskTileProps = {
  task: Task;
  // Undefined while the servers load or when the server isn't in the user's lists anymore
  guildName: string | undefined;
};

export function TaskTile({ task, guildName }: TaskTileProps) {
  const { emote } = task;

  return (
    <li className="flex items-center gap-3 bg-background p-3">
      <Emote emote={fromTask(task)} showName={false} className="w-16 shrink-0 p-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-medium text-sm">{emote.name}</p>
        <p className="font-mono text-muted text-xs sm:truncate">
          {guildName ?? "unknown server"} · {ORIGINS[emote.origin]} ·{" "}
          <time
            dateTime={task.createdAt}
            title={new Date(task.createdAt).toLocaleString()}
          >
            {relativeTime(Date.parse(task.createdAt))}
          </time>
        </p>
      </div>
      <Button
        size="sm"
        className="shrink-0"
        render={<Link to="/panel/tasks/$taskId" params={{ taskId: task.id }} />}
      >
        fix in editor<span className="sr-only"> {emote.name}</span>
      </Button>
    </li>
  );
}
