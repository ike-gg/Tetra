// Lives in the lazy route file so ui-sdk's stylesheet only loads with the panel
import "@/styles/ui-sdk.css";

import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

import { PanelLogin } from "@/components/panel/panel-login";
import { PanelScreen } from "@/components/panel/panel-screen";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { sessionQueryOptions } from "@/lib/session";

export const Route = createLazyFileRoute("/panel")({
  component: PanelGate,
});

// Every /panel/* route renders inside this gate, so children can assume a session
function PanelGate() {
  const session = useQuery(sessionQueryOptions);
  const { error } = Route.useSearch();
  const navigate = Route.useNavigate();
  const loggedIn = session.data === true;

  // A failed re-login keeps the existing session: nothing to report then
  useEffect(() => {
    if (loggedIn && error !== undefined) {
      void navigate({ search: (prev) => ({ ...prev, error: undefined }), replace: true });
    }
  }, [loggedIn, error, navigate]);

  if (session.status === "pending") {
    return (
      <PanelScreen>
        <Text size="sm" tone="muted" className="flex items-center gap-2 font-mono">
          <Spinner />
          checking your session…
        </Text>
      </PanelScreen>
    );
  }

  if (session.status === "error") {
    return (
      <PanelScreen>
        <div className="flex flex-col items-start gap-4">
          <p role="alert" className="text-danger text-sm">
            Couldn&apos;t reach Tetra to check your session. It may be down for a moment.
          </p>
          <Button
            size="sm"
            disabled={session.isFetching}
            onClick={() => void session.refetch()}
          >
            {session.isFetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      </PanelScreen>
    );
  }

  if (!loggedIn) return <PanelLogin error={error} />;

  return <Outlet />;
}
