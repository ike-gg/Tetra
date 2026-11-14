import { useQuery } from "@tanstack/react-query";

import { MenuItem } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { type PanelEmote, SOURCE_LABELS } from "@/lib/emote";
import { formatBytes } from "@/lib/format-bytes";

const DISCORD_LIMIT = 256 * 1024;

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

const emoteFileQueryOptions = (url: string) => ({
  queryKey: ["emote-file", url],
  queryFn: async () => {
    const [dimensions, size] = await Promise.all([loadDimensions(url), loadSize(url)]);
    return { dimensions, size };
  },
  staleTime: Number.POSITIVE_INFINITY,
  retry: false,
});

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <MenuItem variant="info" label={label}>
      <span className="w-16 shrink-0 font-mono text-muted text-xs">{label}</span>
      <span className="min-w-0 truncate tabular-nums">{children}</span>
    </MenuItem>
  );
}

// Mounted only while the Info submenu is open, so the file is fetched on demand
export function EmoteInfo({ emote }: { emote: PanelEmote }) {
  const file = useQuery(emoteFileQueryOptions(emote.url));
  const loading = file.status === "pending";
  const size = file.data?.size;
  const dimensions = file.data?.dimensions;

  return (
    <>
      <Row label="name">{emote.name}</Row>
      <Row label="type">
        {emote.animated ? "animated" : "static"}
        {emote.managed && " · managed"}
        {emote.available === false && " · unavailable"}
      </Row>
      <Row label="source">{SOURCE_LABELS[emote.source]}</Row>
      <Row label="size">
        {loading ? (
          <Spinner />
        ) : size ? (
          <>
            {size < 1024 ? `${size} B` : formatBytes(size)}
            {size > DISCORD_LIMIT && <span className="text-primary"> · over 256 KB</span>}
          </>
        ) : (
          <span className="text-muted">unknown</span>
        )}
      </Row>
      <Row label="pixels">
        {loading ? (
          <Spinner />
        ) : dimensions ? (
          `${dimensions.width} × ${dimensions.height}`
        ) : (
          <span className="text-muted">unknown</span>
        )}
      </Row>
      <Row label="id">
        <span className="font-mono text-xs">{emote.id}</span>
      </Row>
    </>
  );
}
