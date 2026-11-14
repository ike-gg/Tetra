import { createLazyFileRoute } from "@tanstack/react-router";

import { LibraryEditor } from "@/components/editor/library-editor";

export const Route = createLazyFileRoute("/panel/editor/$key")({
  component: PanelEditorFile,
});

function PanelEditorFile() {
  const { key } = Route.useParams();
  return <LibraryEditor fileKey={key} host="panel" />;
}
