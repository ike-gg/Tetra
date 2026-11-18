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
      `${SOURCE_LABELS[emote.source]} doesn't let the browser read this file`
    );
  }
  if (!response.ok)
    throw new Error(`the source answered ${response.status}. try again in a moment`);
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
    loading: `downloading ${emote.name}`,
    success: (result) =>
      "saved" in result
        ? { title: `downloaded ${result.saved}` }
        : result.opened
          ? {
              title: `opened ${emote.name} in a new tab`,
              description: `${result.reason}. save it from there`,
            }
          : {
              title: `couldn't download ${emote.name}`,
              description: `${result.reason}. open it and save it from there`,
              action: { label: "open", onAction: () => void openInNewTab(emote.url) },
            },
    error: (error) => ({
      title: `couldn't download ${emote.name}`,
      description: error instanceof Error ? error.message : undefined,
    }),
  });
};

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
