import { PanelError } from "@/components/panel/query-state";
import { ApiError } from "@/lib/api";

type GuildsErrorProps = {
  error: Error;
  retrying: boolean;
  onRetry: () => void;
};

// The API answers 500 while the bot's shards are still starting
export function GuildsError({ error, retrying, onRetry }: GuildsErrorProps) {
  const starting = error instanceof ApiError && error.status >= 500;

  return (
    <PanelError retrying={retrying} onRetry={onRetry}>
      i couldn&apos;t load your servers
      {starting
        ? ". tetra may still be starting up, try again in a moment"
        : ". try again"}
    </PanelError>
  );
}
