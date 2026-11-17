import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from "@ui-sdk/react/meter";

import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format-bytes";

type SizeMeterProps = {
  label?: string;
  // Current size in bytes
  value: number;
  // The size that must not be exceeded, in bytes
  limit: number;
  // Where the bar ends, usually the original size, so the overflow reads as a distance to cover
  max?: number;
  className?: string;
};

export function SizeMeter({
  label = "file size",
  value,
  limit,
  max,
  className,
}: SizeMeterProps) {
  const scale = Math.max(max ?? 0, value, limit * 1.15);
  const over = value > limit;
  const limitAt = (limit / scale) * 100;
  const valueAt = (Math.min(value, scale) / scale) * 100;
  const percentOfLimit = Math.round((value / limit) * 100);
  const reduceBy = Math.ceil(((value - limit) / value) * 100);

  return (
    <Meter
      value={value}
      min={0}
      max={scale}
      getValueLabel={() =>
        over
          ? `${formatBytes(value)}, ${formatBytes(value - limit)} over the ${formatBytes(limit)} limit`
          : `${formatBytes(value)} of ${formatBytes(limit)}`
      }
      className={cn("grid min-w-0 grid-cols-[1fr_auto] gap-x-3 gap-y-2", className)}
    >
      <MeterLabel className="font-medium text-foreground text-sm">{label}</MeterLabel>
      <MeterValue className="font-mono text-muted text-xs tabular-nums">
        <span className={over ? "text-primary" : "text-foreground"}>
          {formatBytes(value)}
        </span>{" "}
        / {formatBytes(limit)}
      </MeterValue>

      <MeterTrack className="relative col-span-2 h-2 overflow-visible bg-neutral-800">
        <MeterIndicator
          className={cn(
            "absolute inset-y-0 left-0",
            over ? "bg-neutral-500" : "bg-foreground"
          )}
        />
        {over && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 bg-primary"
            style={{ left: `${limitAt}%`, width: `${valueAt - limitAt}%` }}
          />
        )}
        <div
          aria-hidden="true"
          className="absolute -inset-y-1 w-px bg-foreground"
          style={{ left: `${limitAt}%` }}
        />
      </MeterTrack>

      <p aria-hidden="true" className="text-xs">
        {over ? (
          <span className="text-primary">
            {formatBytes(value - limit)} over · reduce by {reduceBy}%
          </span>
        ) : (
          <span className="text-muted">Fits · {formatBytes(limit - value)} to spare</span>
        )}
      </p>
      <p aria-hidden="true" className="font-mono text-muted text-xs tabular-nums">
        {percentOfLimit}%
      </p>
    </Meter>
  );
}
