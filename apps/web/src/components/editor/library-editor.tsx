import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { downloadBlob } from "@/lib/download-blob";
import { formatBytes } from "@/lib/format-bytes";
import { DISCORD_EMOTE_LIMIT } from "@/lib/media/edit";
import { libraryFileQueryOptions } from "@/lib/media/library-file";
import { saveEdit } from "@/lib/media/local-library";

import { EDITOR_HOSTS, type EditorHost } from "./editor-host";
import { type EditorWork, MediaEditor } from "./media-editor";
import { useCanAddToServer } from "./use-can-add-to-server";
import { useMediaFile } from "./use-media-file";

const SAVE_DELAY_MS = 400;

// Only for a session with servers: the public editor doesn't load the panel's add flow
const AddToServerMenu = lazy(() =>
  import("./add-to-server-menu").then((module) => ({ default: module.AddToServerMenu }))
);
// The panel mounts its own; the public editor needs one only for adding
const Toaster = lazy(() =>
  import("@/components/ui/toaster").then((module) => ({ default: module.Toaster }))
);

type LibraryEditorProps = {
  fileKey: string;
  host: EditorHost;
};

/**
 * A file from the local library in the editor, on the public site or in the panel. Its
 * settings are saved back to the library as they change.
 */
export function LibraryEditor({ fileKey, host }: LibraryEditorProps) {
  const config = EDITOR_HOSTS[host];
  const navigate = useNavigate();
  const stored = useQuery(libraryFileQueryOptions(fileKey));
  const canAdd = useCanAddToServer();
  const media = useMediaFile(stored.data?.blob, stored.data?.entry.fileName ?? "");

  // Settings are saved shortly after the last change, not on every slider step
  const save = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (work: EditorWork) => {
      clearTimeout(timer);
      timer = setTimeout(() => void saveEdit(fileKey, work), SAVE_DELAY_MS);
    };
  }, [fileKey]);

  if (stored.status === "pending" || (stored.data && media.status === "loading")) {
    return (
      <StateLayout host={host}>
        <Text size="sm" tone="muted" className="flex items-center gap-2 font-mono">
          <Spinner />
          opening the file
        </Text>
      </StateLayout>
    );
  }

  if (!stored.data || media.status !== "ready") {
    return (
      <StateLayout host={host}>
        <Heading level={1} size="md">
          this file isn&apos;t in this browser
        </Heading>
        <Text tone="muted">
          files are kept only in the browser you edited them in, and only the last few.
          open it again to keep editing
        </Text>
        <Button variant="primary" render={<Link to={config.start} />}>
          open a file
        </Button>
      </StateLayout>
    );
  }

  const { file } = media;
  const { saved } = stored.data;
  const newFile = (
    <Button
      variant="ghost"
      size="sm"
      // On a phone the public toolbar's "editor" crumb does the same
      className={host === "public" ? "max-sm:hidden" : undefined}
      onClick={() => void navigate({ to: config.start })}
    >
      new file
    </Button>
  );

  return (
    <>
      {host === "public" && canAdd && (
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      )}
      <MediaEditor
        key={file.url}
        source={file}
        // The panel's header has the breadcrumb already
        section={host === "public" ? { label: "editor", to: "/editor" } : undefined}
        toolbarStart={host === "panel" ? newFile : undefined}
        // Fills the panel's content area under its 48px header
        className={
          host === "panel"
            ? "min-h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-3rem)]"
            : undefined
        }
        initialEdit={saved?.edit}
        initialName={saved?.name}
        initialDiscord={saved?.discord ?? config.discordByDefault}
        onWorkChange={save}
        actions={(state) => {
          const { result, name, nameValid } = state;
          // Emote mode with servers to add to: adding is the main action, Download steps back
          const adding = canAdd && state.discord;
          return (
            <>
              {host === "public" && newFile}
              {adding && (
                <Suspense fallback={null}>
                  <AddToServerMenu state={state} animated={file.info.frames > 1} />
                </Suspense>
              )}
              <Button
                variant={adding ? "secondary" : "primary"}
                size="sm"
                glow={!adding}
                disabled={!result}
                onClick={() =>
                  result &&
                  downloadBlob(
                    result.blob,
                    `${nameValid ? name : file.name}.${result.extension}`
                  )
                }
              >
                download
              </Button>
            </>
          );
        }}
        sizeNote={({ fits, result }) => (
          <Text size="xs" tone="muted">
            {fits || !result
              ? `Discord accepts emotes up to ${formatBytes(DISCORD_EMOTE_LIMIT)}`
              : `Discord won't take emotes over ${formatBytes(DISCORD_EMOTE_LIMIT)}. you can still download it`}
          </Text>
        )}
      />
    </>
  );
}

// Loading and missing file: inline at the top, never centered
function StateLayout({ host, children }: { host: EditorHost; children: ReactNode }) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-col items-start gap-4 px-4",
        host === "panel" ? "max-w-5xl pt-8 pb-16 sm:px-8 sm:pt-12" : "max-w-xl pt-16"
      )}
    >
      {children}
    </main>
  );
}
