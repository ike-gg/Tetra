import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

export function PanelLoading({ children }: { children: ReactNode }) {
  return (
    <Text size="sm" tone="muted" className="flex items-center gap-2 font-mono">
      <Spinner />
      {children}
    </Text>
  );
}

type PanelErrorProps = {
  children: ReactNode;
  retrying: boolean;
  onRetry: () => void;
};

export function PanelError({ children, retrying, onRetry }: PanelErrorProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p role="alert" className="text-danger text-sm">
        {children}
      </p>
      <Button size="sm" disabled={retrying} onClick={onRetry}>
        {retrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}
