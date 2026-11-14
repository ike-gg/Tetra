import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatBytes } from "@/lib/format-bytes";
import {
  LIBRARY_LIMIT,
  type LibraryEntry,
  listLibrary,
  removeFromLibrary,
} from "@/lib/media/local-library";
import { relativeTime } from "@/lib/relative-time";

import { EDITOR_HOSTS, type EditorHost } from "./editor-host";

type RecentEntry = LibraryEntry & { thumbnailUrl: string | null };

// Files from earlier visits, read from this browser's storage only. Renders nothing until
// it has something to show, so the prerendered page doesn't flash an empty list. Both
// hosts list the same files; each opens them in its own editor.
export function RecentFiles({ host }: { host: EditorHost }) {
  const [entries, setEntries] = useState<RecentEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let urls: string[] = [];

    void listLibrary().then((list) => {
      if (cancelled) return;
      const withUrls = list.map((entry) => ({
        ...entry,
        thumbnailUrl: entry.thumbnail ? URL.createObjectURL(entry.thumbnail) : null,
      }));
      urls = withUrls.flatMap((entry) =>
        entry.thumbnailUrl ? [entry.thumbnailUrl] : []
      );
      setEntries(withUrls);
    });

    return () => {
      cancelled = true;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  if (!entries?.length) return null;

  const remove = (key: string) => {
    setEntries((current) => current?.filter((entry) => entry.key !== key) ?? null);
    void removeFromLibrary(key);
  };

  return (
    <section aria-labelledby="recent-files" className="flex flex-col gap-3">
      <Eyebrow id="recent-files">recently edited</Eyebrow>
      <ul className="flex flex-col gap-px border border-border bg-border">
        {entries.map((entry) => (
          <li key={entry.key} className="flex items-center bg-background">
            <Link
              to={EDITOR_HOSTS[host].file}
              params={{ key: entry.key }}
              // web.css underlines every <a>
              className="flex min-w-0 flex-1 cursor-default select-none items-center gap-3 p-2 text-foreground no-underline hover:bg-surface active:bg-neutral-800"
            >
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden bg-checker">
                {entry.thumbnailUrl && (
                  <img
                    src={entry.thumbnailUrl}
                    alt=""
                    draggable={false}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-sm">{entry.fileName}</span>
                <span className="truncate font-mono text-muted text-xs">
                  {entry.width}×{entry.height} · {formatBytes(entry.bytes)} ·{" "}
                  {relativeTime(entry.openedAt)}
                </span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="mx-2"
              onClick={() => remove(entry.key)}
            >
              Remove<span className="sr-only"> {entry.fileName}</span>
            </Button>
          </li>
        ))}
      </ul>
      <p className="font-mono text-muted text-xs">
        stored only in this browser · last {LIBRARY_LIMIT} files
      </p>
    </section>
  );
}
