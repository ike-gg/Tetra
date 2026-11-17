import { createFileRoute } from "@tanstack/react-router";

import { EditorStart } from "@/components/editor/editor-start";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { formatBytes } from "@/lib/format-bytes";
import { DISCORD_EMOTE_LIMIT } from "@/lib/media/edit";
import { NOINDEX_META } from "@/lib/seo";

export const Route = createFileRoute("/panel/editor/")({
  head: () => ({ meta: [{ title: "editor · tetra" }, NOINDEX_META] }),
  component: PanelEditorStart,
});

// The same start screen as /editor; files open in the panel's editor
function PanelEditorStart() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Heading level={1} size="lg">
          editor
        </Heading>
        <Text size="sm" tone="muted" className="max-w-2xl">
          crop, trim, resize and compress an image or GIF until it fits Discord&apos;s{" "}
          {formatBytes(DISCORD_EMOTE_LIMIT)}, then add it to one of your servers. it runs
          in your browser, and recent files stay in this browser only
        </Text>
      </div>

      <EditorStart host="panel" />
    </div>
  );
}
