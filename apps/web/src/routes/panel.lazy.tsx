// Lives in the lazy route file so ui-sdk's stylesheet only loads with the panel
import "@/styles/ui-sdk.css";

import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { MediaEditor } from "@/components/editor/media-editor";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { loadMediaFile, type MediaFile, releaseMediaFile } from "@/lib/media/media-file";

export const Route = createLazyFileRoute("/panel")({
  component: PanelPage,
});

const SAMPLE_EMOTE = { url: "/panel/sample-emote.gif", name: "catJAM.gif" };

// Mockup: no auth and no API yet, the editor runs on a bundled sample emote
function PanelPage() {
  const [file, setFile] = useState<MediaFile | null>(null);

  useEffect(() => {
    let loaded: MediaFile | null = null;
    let cancelled = false;

    void fetch(SAMPLE_EMOTE.url)
      .then((response) => response.blob())
      .then((blob) => loadMediaFile(blob, SAMPLE_EMOTE.name))
      .then((next) => {
        if (cancelled) return releaseMediaFile(next);
        loaded = next;
        setFile(next);
      });

    return () => {
      cancelled = true;
      if (loaded) releaseMediaFile(loaded);
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
    <MediaEditor
      source={file}
      section={{ label: "Emotes", to: "/panel" }}
      initialDiscord
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
