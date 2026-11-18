import { Link, useMatchRoute } from "@tanstack/react-router";

import type { EditorHost, SyncSearch } from "./editor-host";

/** The editor links from this page go to: the panel's inside `/panel`, the public one elsewhere. */
export function useEditorHost(): EditorHost {
  const matchRoute = useMatchRoute();
  return matchRoute({ to: "/panel", fuzzy: true }) ? "panel" : "public";
}

const NEW_TAB = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * "Open in editor" for a remote file: a link to the host's start screen in a new tab,
 * which fetches `url` into the local library and opens it there. The page the user came
 * from (a list, a selection, a dialog) stays as it was.
 */
export function editorLink(
  host: EditorHost,
  file: { url: string; name: string },
  sync?: SyncSearch
) {
  return host === "panel" ? (
    <Link
      to="/panel/editor"
      search={{ open: file.url, name: file.name, ...sync }}
      {...NEW_TAB}
    />
  ) : (
    <Link to="/editor" search={{ open: file.url, name: file.name }} {...NEW_TAB} />
  );
}

/** A task's own editor (`/panel/tasks/$taskId`) in a new tab. */
export function taskEditorLink(taskId: string) {
  return <Link to="/panel/tasks/$taskId" params={{ taskId }} {...NEW_TAB} />;
}
