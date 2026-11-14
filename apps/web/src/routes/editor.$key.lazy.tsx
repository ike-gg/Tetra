// Lives in the lazy route file so ui-sdk's stylesheet only loads with the editor
import "@/styles/ui-sdk.css";

import { createLazyFileRoute } from "@tanstack/react-router";

import { LibraryEditor } from "@/components/editor/library-editor";

export const Route = createLazyFileRoute("/editor/$key")({
  component: EditorFilePage,
});

function EditorFilePage() {
  const { key } = Route.useParams();
  return <LibraryEditor fileKey={key} host="public" />;
}
