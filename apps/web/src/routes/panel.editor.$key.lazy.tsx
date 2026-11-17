import { createLazyFileRoute } from "@tanstack/react-router";

import { LibraryEditor } from "@/components/editor/library-editor";

export const Route = createLazyFileRoute("/panel/editor/$key")({
  component: PanelEditorFile,
});

function PanelEditorFile() {
  const { key } = Route.useParams();
  const { syncGuild, syncEntry } = Route.useSearch();
  return (
    <LibraryEditor
      fileKey={key}
      host="panel"
      syncTarget={
        syncGuild && syncEntry ? { guildId: syncGuild, entryId: syncEntry } : undefined
      }
    />
  );
}
