// Lives in the lazy route file so ui-sdk's stylesheet only loads with the panel
import "@/styles/ui-sdk.css";

import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EmoteEditor } from "@/components/editor/emote-editor";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { type EmoteFile, loadEmoteFile, releaseEmoteFile } from "@/lib/gif/emote-file";

export const Route = createLazyFileRoute("/panel")({
  component: PanelPage,
});

const SAMPLE_EMOTE = { url: "/panel/sample-emote.gif", name: "catJAM.gif" };

// Mockup: no auth and no API yet, the editor runs on a bundled sample emote
function PanelPage() {
  const [file, setFile] = useState<EmoteFile | null>(null);

  useEffect(() => {
    let loaded: EmoteFile | null = null;
    let cancelled = false;

    void fetch(SAMPLE_EMOTE.url)
      .then((response) => response.blob())
      .then((blob) => loadEmoteFile(blob, SAMPLE_EMOTE.name))
      .then((next) => {
        if (cancelled) return releaseEmoteFile(next);
        loaded = next;
        setFile(next);
      });

    return () => {
      cancelled = true;
      if (loaded) releaseEmoteFile(loaded);
    };
  }, []);

  if (!file) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Text size="sm" tone="muted" className="font-mono">
          loading…
        </Text>
      </div>
    );
  }

  return (
    <EmoteEditor
      source={file}
      section="Emotes"
      actions={({ fits, nameValid }) => (
        <Button
          variant="primary"
          size="sm"
          glow={fits && nameValid}
          disabled={!fits || !nameValid}
        >
          Add to Discord
        </Button>
      )}
    />
  );
}
