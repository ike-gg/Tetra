import { createFileRoute } from "@tanstack/react-router";

import { PanelPlaceholder } from "@/components/panel/panel-placeholder";

// Rendered inside the session gate of `/panel` (panel.lazy.tsx)
export const Route = createFileRoute("/panel/")({
  component: PanelPlaceholder,
});
