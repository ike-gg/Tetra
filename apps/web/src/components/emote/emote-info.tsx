import { useQuery } from "@tanstack/react-query";

import { MenuItem } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { type PanelEmote, SOURCE_LABELS } from "@/lib/emote";
import { emoteFileQueryOptions } from "@/lib/emote-file";
import { formatBytes } from "@/lib/format-bytes";
import { timeLeft } from "@/lib/retention";

const DISCORD_LIMIT = 256 * 1024;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <MenuItem variant="info" label={label}>
      <span className="w-16 shrink-0 font-mono text-muted text-xs">{label}</span>
      <span className="min-w-0 truncate tabular-nums">{children}</span>
    </MenuItem>
  );
}

function ExpiresRow({ expiresAt }: { expiresAt: string }) {
  const left = timeLeft(expiresAt);
  const date = new Date(expiresAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <Row label="expires">
      {date}
      <span className={left.soon ? "text-primary" : "text-muted"}> · {left.short}</span>
    </Row>
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
      {emote.expiresAt && <ExpiresRow expiresAt={emote.expiresAt} />}
      <Row label="id">
        <span className="font-mono text-xs">{emote.id}</span>
      </Row>
    </>
  );
}
