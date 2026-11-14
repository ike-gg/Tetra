import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";

import { MediaEditor } from "@/components/editor/media-editor";
import { Emote } from "@/components/emote/emote";
import { EmoteMenu } from "@/components/emote/emote-menu";
import { DiscardTaskDialog } from "@/components/panel/discard-task-dialog";
import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Notice } from "@/components/ui/notice";
import { Text } from "@/components/ui/text";
import { ApiError } from "@/lib/api";
import { fromTask, SOURCE_LABELS } from "@/lib/emote";
import { formatBytes } from "@/lib/format-bytes";
import { findGuild, type GuildLists, guildsQueryOptions } from "@/lib/guilds";
import type { StillFormat } from "@/lib/image/render-image";
import { DISCORD_EMOTE_LIMIT } from "@/lib/media/edit";
import { loadMediaFile, type MediaFile, releaseMediaFile } from "@/lib/media/media-file";
import { useAddTaskEmote } from "@/lib/task-mutations";
import { type Task, taskFileQueryOptions, taskQueryOptions } from "@/lib/tasks";

export const Route = createLazyFileRoute("/panel/editor/$taskId")({
  component: PanelTaskEditor,
});

// Core's task endpoint takes GIF, PNG and WebP data URLs, not JPEG
const TASK_FORMATS: readonly StillFormat[] = ["png", "webp"];

const fetchedFrom = (task: Task) => {
  const { source } = fromTask(task);
  return source === "link" ? "the original link" : SOURCE_LABELS[source];
};

const isGone = (error: unknown) =>
  error instanceof ApiError && error.reference === "TASK_NOT_FOUND";

function PanelTaskEditor() {
  const { taskId } = Route.useParams();
  // Both at once: the file only needs the id
  const task = useQuery(taskQueryOptions(taskId));
  const file = useQuery(taskFileQueryOptions(taskId));

  if (task.status === "pending") {
    return (
      <StateLayout>
        <PanelLoading>loading the task…</PanelLoading>
      </StateLayout>
    );
  }

  if (task.status === "error") {
    return (
      <StateLayout>
        {isGone(task.error) ? (
          <TaskGone />
        ) : (
          <PanelError retrying={task.isFetching} onRetry={() => void task.refetch()}>
            Couldn&apos;t load this task.
          </PanelError>
        )}
      </StateLayout>
    );
  }

  if (file.status === "error" && isGone(file.error)) {
    return (
      <StateLayout>
        <TaskGone />
      </StateLayout>
    );
  }

  return (
    <TaskFile
      task={task.data}
      blob={file.data}
      fileError={file.error}
      retrying={file.isFetching}
      onRetry={() => void file.refetch()}
    />
  );
}

type Media =
  | { status: "loading" }
  | { status: "ready"; file: MediaFile }
  | { status: "error" };

// The proxied blob as an editor source; the object URL lives as long as the page
function useMediaFile(blob: Blob | undefined, name: string): Media {
  const [media, setMedia] = useState<Media>({ status: "loading" });

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    let loaded: MediaFile | null = null;
    setMedia({ status: "loading" });

    // The type suffix only feeds the file-name cleanup; the bytes decide the format
    loadMediaFile(blob, `${name}.${blob.type.split("/")[1] ?? "gif"}`).then(
      (file) => {
        if (cancelled) return releaseMediaFile(file);
        loaded = file;
        setMedia({ status: "ready", file });
      },
      () => {
        if (!cancelled) setMedia({ status: "error" });
      }
    );

    return () => {
      cancelled = true;
      if (loaded) releaseMediaFile(loaded);
    };
  }, [blob, name]);

  return media;
}

type TaskFileProps = {
  task: Task;
  blob: Blob | undefined;
  fileError: Error | null;
  retrying: boolean;
  onRetry: () => void;
};

function TaskFile({ task, blob, fileError, retrying, onRetry }: TaskFileProps) {
  const media = useMediaFile(blob, task.emote.name);

  if (fileError) {
    return (
      <StateLayout task={task}>
        <FileError task={task} error={fileError} retrying={retrying} onRetry={onRetry} />
      </StateLayout>
    );
  }

  if (media.status === "error") {
    return (
      <StateLayout task={task}>
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-danger text-sm">
            The original can&apos;t be opened as an image. It may be broken.
          </p>
          <DiscardTaskDialog task={task} variant="secondary" />
        </div>
      </StateLayout>
    );
  }

  if (!blob || media.status === "loading") {
    return (
      <StateLayout task={task}>
        <div className="flex flex-col gap-2">
          <PanelLoading>
            {blob ? "opening the original…" : "downloading the original…"}
          </PanelLoading>
          {!blob && (
            <Text size="xs" tone="muted">
              Tetra fetches it from {fetchedFrom(task)}. A slow host can take up to half a
              minute.
            </Text>
          )}
        </div>
      </StateLayout>
    );
  }

  return <TaskEditor key={media.file.url} task={task} source={media.file} />;
}

// Why the original didn't arrive. Retry only where trying again can help; Discard where
// the file is gone or will never fit.
function FileError({
  task,
  error,
  retrying,
  onRetry,
}: {
  task: Task;
  error: Error;
  retrying: boolean;
  onRetry: () => void;
}) {
  const reference = error instanceof ApiError ? error.reference : undefined;
  const message =
    {
      DOWNLOAD_DATA_FAILED:
        "Couldn't download the original. The host didn't answer, or the file is gone.",
      URL_NOT_ALLOWED: "Tetra isn't allowed to download from the original's address.",
      FILE_TOO_LARGE: "The original is over 10 MB, too big for Tetra to fetch.",
      UNSUPPORTED_FILE_TYPE: "The original isn't a GIF, PNG, WebP or JPEG image.",
    }[reference ?? ""] ??
    (error instanceof ApiError && error.status < 500
      ? error.message
      : "Couldn't reach Tetra to get the original.");
  const permanent =
    reference === "URL_NOT_ALLOWED" ||
    reference === "FILE_TOO_LARGE" ||
    reference === "UNSUPPORTED_FILE_TYPE";

  return (
    <div className="flex flex-col items-start gap-3">
      <p role="alert" className="text-danger text-sm">
        {message}
      </p>
      <div className="flex gap-2">
        {!permanent && (
          <Button size="sm" disabled={retrying} onClick={onRetry}>
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        )}
        {(permanent || reference === "DOWNLOAD_DATA_FAILED") && (
          <DiscardTaskDialog task={task} variant={permanent ? "secondary" : "ghost"} />
        )}
      </div>
    </div>
  );
}

// Where the emote goes, read from the cached server lists. `canAdd` is false only once
// the lists say the user can't manage that server; while they load the API decides.
function useDestination(task: Task, animated: boolean) {
  const guilds = useQuery(guildsQueryOptions);
  const lists: GuildLists | undefined = guilds.data;
  const managed = lists?.guildsWithUserPermissions.find(({ id }) => id === task.guildId);
  const name = findGuild(lists, task.guildId)?.name;
  const slots = animated ? "animated" : "static";
  const free = managed ? managed.emojis.limit - managed.emojis[slots] : undefined;

  return {
    name,
    slots,
    full: free !== undefined && free <= 0,
    canAdd: !lists || Boolean(managed),
    readOnly: Boolean(lists?.guildsWithBot.some(({ id }) => id === task.guildId)),
  };
}

function TaskEditor({ task, source }: { task: Task; source: MediaFile }) {
  const destination = useDestination(task, source.info.frames > 1);
  const guildName = destination.name ?? "the server";
  const { add, pending: adding } = useAddTaskEmote(task, guildName);

  let notice: ReactNode = null;
  if (!destination.canAdd) {
    notice = (
      <Notice
        title={`You can't add emotes to ${guildName} anymore`}
        className="shrink-0 border-x-0 border-t-0"
      >
        {destination.readOnly
          ? "Tetra is there, but you need the Manage Expressions permission on that server."
          : "Tetra isn't on that server anymore, or you left it. You can still discard the task."}
      </Notice>
    );
  } else if (destination.full) {
    notice = (
      <Notice
        title={`${guildName} has no free ${destination.slots} emote slots`}
        className="shrink-0 border-x-0 border-t-0"
      >
        Discord will refuse it until a slot frees up. Remove{" "}
        {destination.slots === "animated" ? "an animated" : "a static"} emote there first,
        then come back: this task stays until you add or discard it.
      </Notice>
    );
  }

  return (
    <MediaEditor
      source={source}
      initialName={task.emote.name}
      discordOnly
      outputFormats={TASK_FORMATS}
      // Fills the panel's content area under its 48px header
      className="min-h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-3rem)]"
      notice={notice}
      toolbarStart={<DiscardTaskDialog task={task} />}
      actions={({ result, pending, fits, name, nameValid }) => (
        <Button
          variant="primary"
          size="sm"
          glow
          className="min-w-0"
          disabled={
            !result || pending || !fits || !nameValid || adding || !destination.canAdd
          }
          onClick={() => result && add({ blob: result.blob, name })}
        >
          <span className="truncate">
            {adding ? "Adding…" : `Add to ${destination.name ?? "server"}`}
          </span>
        </Button>
      )}
      sizeNote={({ fits, result }) => (
        <Text size="xs" tone="muted">
          {fits || !result
            ? `Discord takes emotes up to ${formatBytes(DISCORD_EMOTE_LIMIT)}.`
            : `Over ${formatBytes(DISCORD_EMOTE_LIMIT)}, Discord won't take it. Fit it automatically or lower the settings, then add it.`}
        </Text>
      )}
    />
  );
}

// Loading and error states: inline at the top of the content area, never centered
function StateLayout({ task, children }: { task?: Task; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-8 sm:pt-12">
      {task && <TaskHeader task={task} />}
      {children}
    </main>
  );
}

function TaskHeader({ task }: { task: Task }) {
  const guilds = useQuery(guildsQueryOptions);
  const guildName = findGuild(guilds.data, task.guildId)?.name;
  const emote = fromTask(task);

  return (
    // The editor is open already; a selection bar would only cover it
    <EmoteMenu kind="task" selectable={false}>
      <div className="flex items-center gap-4">
        <Emote emote={emote} showName={false} className="w-16 shrink-0 p-0" />
        <div className="flex min-w-0 flex-col gap-1">
          <Heading level={1} size="md" className="truncate">
            :{task.emote.name}:
          </Heading>
          <p className="font-mono text-muted text-xs">
            for {guildName ?? "unknown server"} · {SOURCE_LABELS[emote.source]}
          </p>
        </div>
      </div>
    </EmoteMenu>
  );
}

function TaskGone() {
  return (
    <div className="flex max-w-lg flex-col items-start gap-4">
      <Heading level={1} size="lg">
        This task is gone
      </Heading>
      <Text size="sm" tone="muted">
        It was already added or discarded, maybe from another tab. Your other tasks are
        still waiting.
      </Text>
      <Button size="sm" render={<Link to="/panel/tasks" />}>
        Back to tasks
      </Button>
    </div>
  );
}
