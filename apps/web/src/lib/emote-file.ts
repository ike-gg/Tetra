import { useMatchRoute, useNavigate } from "@tanstack/react-router";

import { EDITOR_HOSTS, type EditorHost } from "@/components/editor/editor-host";
import { toast } from "@/components/ui/toaster";
import { downloadBlob } from "@/lib/download-blob";
import { type PanelEmote, SOURCE_LABELS } from "@/lib/emote";

const EXTENSIONS: Record<string, string> = {
  "image/gif": "gif",
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/avif": "avif",
};

const extensionOf = (type: string, url: string) =>
  EXTENSIONS[type] ??
  url.match(/\.(gif|png|webp|jpe?g|avif)(?:[?#]|$)/i)?.[1]?.toLowerCase() ??
  "png";

// Characters file systems reject in a name
const fileNameOf = (name: string, extension: string) =>
  `${name.replace(/[/\\:*?"<>|]+/g, "_") || "emote"}.${extension}`;

/**
 * The source didn't let the browser read the file. A cross-origin fetch without CORS
 * fails the same way as a network error, so the two can't be told apart.
 */
export class EmoteFileUnreadableError extends Error {}

/** The full-size file as a `Blob`, with a file name from its content type. */
export const fetchEmoteFile = async (emote: PanelEmote) => {
  let response: Response;
  try {
    response = await fetch(emote.url);
  } catch {
    throw new EmoteFileUnreadableError(
      `${SOURCE_LABELS[emote.source]} doesn't let the browser read this file.`
    );
  }
  if (!response.ok) throw new Error(`The source answered ${response.status}.`);
  const blob = await response.blob();
  return { blob, fileName: fileNameOf(emote.name, extensionOf(blob.type, emote.url)) };
};

const openInNewTab = (url: string) => {
  const opened = window.open(url, "_blank");
  if (opened) opened.opener = null;
  return Boolean(opened);
};

/**
 * Saves the full-size file. A source without CORS (BTTV) can't be read, so the file
 * opens in a new tab instead, where it can be saved by hand.
 */
export const downloadEmote = (emote: PanelEmote) => {
  const request = fetchEmoteFile(emote).then(
    ({ blob, fileName }) => {
      downloadBlob(blob, fileName);
      return { saved: fileName } as const;
    },
    (error: unknown) => {
      if (!(error instanceof EmoteFileUnreadableError)) throw error;
      return { opened: openInNewTab(emote.url), reason: error.message } as const;
    }
  );
  toast.promise(request, {
    loading: `Downloading ${emote.name}…`,
    success: (result) =>
      "saved" in result
        ? { title: `Downloaded ${result.saved}` }
        : result.opened
          ? {
              title: `Opened ${emote.name} in a new tab`,
              description: `${result.reason} Save it from there.`,
            }
          : {
              title: `Couldn't download ${emote.name}`,
              description: `${result.reason} Open it and save it from there.`,
              action: { label: "Open", onAction: () => void openInNewTab(emote.url) },
            },
    error: (error) => ({
      title: `Couldn't download ${emote.name}`,
      description: error instanceof Error ? error.message : undefined,
    }),
  });
};

/**
 * Puts the emote's file into the quick editor's local library (this browser's
 * IndexedDB) and opens it in the editor of `host`: by default the panel's
 * (`/panel/editor/$key`) inside the panel, the public one (`/editor/$key`) elsewhere.
 * Resolves to whether it opened; failures are toasted, never thrown.
 */
export function useEditInQuickEditor(host?: EditorHost) {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const inPanel = Boolean(matchRoute({ to: "/panel", fuzzy: true }));
  const fileRoute = EDITOR_HOSTS[host ?? (inPanel ? "panel" : "public")].file;

  return async (emote: PanelEmote) => {
    const request = (async () => {
      // The editor's model loads only when it's used, not with the panel
      const [{ blob, fileName }, mediaFile, library] = await Promise.all([
        fetchEmoteFile(emote),
        import("@/lib/media/media-file"),
        import("@/lib/media/local-library"),
      ]);
      const media = await mediaFile.loadMediaFile(blob, fileName);
      mediaFile.releaseMediaFile(media);
      return library.saveToLibrary(blob, media, fileName);
    })();
    toast.promise(request, {
      loading: `Opening ${emote.name} in the editor…`,
      success: { title: `Opened ${emote.name} in the editor` },
      error: (error) => ({
        title: `Couldn't open ${emote.name} in the editor`,
        description:
          error instanceof EmoteFileUnreadableError
            ? `${error.message} Download it, then drop it into the editor.`
            : error instanceof Error
              ? error.message
              : undefined,
      }),
    });
    try {
      const key = await request;
      await navigate({ to: fileRoute, params: { key } });
      return true;
    } catch {
      // The toast already told the user
      return false;
    }
  };
}

const loadDimensions = (url: string) =>
  new Promise<{ width: number; height: number } | null>((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });

// HEAD first; a CDN without CORS or Content-Length leaves the size unknown
const loadSize = async (url: string) => {
  try {
    const head = await fetch(url, { method: "HEAD" });
    const length = Number(head.headers.get("content-length"));
    if (head.ok && length > 0) return length;
    const response = await fetch(url);
    return response.ok ? (await response.blob()).size : null;
  } catch {
    return null;
  }
};

/** Pixel and byte size of an emote's full-size file, fetched once per URL. */
export const emoteFileQueryOptions = (url: string) => ({
  queryKey: ["emote-file", url],
  queryFn: async () => {
    const [dimensions, size] = await Promise.all([loadDimensions(url), loadSize(url)]);
    return { dimensions, size };
  },
  staleTime: Number.POSITIVE_INFINITY,
  retry: false,
});
