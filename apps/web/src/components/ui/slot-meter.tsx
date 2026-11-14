import {
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
} from "@ui-sdk/react/meter";

import { cn } from "@/lib/cn";

type SlotMeterProps = {
  label: string;
  used: number;
  limit: number;
  className?: string;
};

// Orange from the last 10% of slots: that's when it starts to matter which emote goes in
const isNearLimit = (used: number, limit: number) =>
  limit - used <= Math.max(1, Math.ceil(limit * 0.1));

export function SlotMeter({ label, used, limit, className }: SlotMeterProps) {
  const full = used >= limit;
  const near = isNearLimit(used, limit);

  return (
    <Meter
      value={used}
      min={0}
      max={limit}
      getValueLabel={() =>
        full ? `${used} of ${limit}, full` : `${used} of ${limit}, ${limit - used} free`
      }
      className={cn("grid min-w-0 grid-cols-[1fr_auto] gap-x-3 gap-y-1.5", className)}
    >
      <MeterLabel className="font-mono text-muted text-xs">{label}</MeterLabel>
      <MeterValue className="font-mono text-muted text-xs tabular-nums">
        <span className={near ? "text-primary" : "text-foreground"}>{used}</span>/{limit}
      </MeterValue>
      <MeterTrack className="relative col-span-2 h-1.5 bg-neutral-800">
        <MeterIndicator
          className={cn(
            "absolute inset-y-0 left-0",
            near ? "bg-primary" : "bg-neutral-300"
          )}
        />
      </MeterTrack>
    </Meter>
  );
}
