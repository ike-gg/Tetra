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
      Couldn&apos;t load your servers.
      {starting && " Tetra may still be starting up, try again in a moment."}
    </PanelError>
  );
}
