import { Button } from "@/components/ui/button";
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
  // Id of the text that says why "Fix in editor" is disabled
  actionHintId: string;
};

export function TaskTile({ task, guildName, actionHintId }: TaskTileProps) {
  const { emote } = task;

  return (
    <li className="flex items-center gap-3 bg-background p-3">
      <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden bg-checker">
        <img
          src={emote.previewUrl}
          alt=""
          loading="lazy"
          draggable={false}
          width={64}
          height={64}
          className="size-full object-contain p-1"
        />
      </span>
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
      {/* The panel editor (/panel/editor/$taskId) doesn't exist yet */}
      <Button
        size="sm"
        disabled
        focusableWhenDisabled
        aria-describedby={actionHintId}
        className="shrink-0"
      >
        Fix in editor<span className="sr-only"> {emote.name}</span>
      </Button>
    </li>
  );
}
