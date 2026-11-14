import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from "@ui-sdk/react/slider";

import { cn } from "@/lib/cn";
import type { Trim } from "@/lib/gif/emote-pipeline";
import type { GifInfo } from "@/lib/gif/parse-gif";

import { FILM_STRIP_TILE } from "./use-film-strip";

const seconds = (value: number) => `${value.toFixed(2)}s`;

type TrimTimelineProps = {
  info: GifInfo;
  frames: string[];
  value: Trim;
  onValueChange: (value: Trim) => void;
};

// Works in frame indices, not seconds: GIF frames can have different delays, so only
// indices map exactly onto what gifsicle keeps
export function TrimTimeline({ info, frames, value, onValueChange }: TrimTimelineProps) {
  const [start, end] = value;
  const last = info.frames - 1;
  const startTime =
    info.delays.slice(0, start).reduce((sum, delay) => sum + delay, 0) / 100;
  const endTime =
    info.delays.slice(0, end + 1).reduce((sum, delay) => sum + delay, 0) / 100;
  const trimmed = start > 0 || end < last;
  const at = (index: number) => (index / Math.max(1, last)) * 100;

  return (
    <Slider
      aria-label="Trim"
      value={value}
      onValueChange={(next) => onValueChange([next[0], next[1]])}
      min={0}
      max={last}
      step={1}
      minStepsBetweenThumbs={1}
      format={(index) => `Frame ${index + 1} of ${info.frames}`}
      className="flex select-none flex-col gap-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-sm">Trim</span>
        <span className="font-mono text-muted text-xs tabular-nums">
          {seconds(startTime)} – {seconds(endTime)} ·{" "}
          <span className={trimmed ? "text-foreground" : undefined}>
            {seconds(endTime - startTime)}
          </span>{" "}
          of {seconds(info.duration)}
        </span>
      </div>

      <SliderControl className="flex h-14 w-full cursor-default touch-none items-center px-2.5">
        <SliderTrack className="relative h-14 w-full bg-transparent">
          <FilmStrip frames={frames} />
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-background/75"
            style={{ width: `${at(start)}%` }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 bg-background/75"
            style={{ width: `${100 - at(end)}%` }}
          />
          <SliderIndicator className="absolute inset-y-0 border-primary border-y-2 bg-transparent" />
          <TrimHandle index={0} label="Start" />
          <TrimHandle index={1} label="End" />
        </SliderTrack>
      </SliderControl>
    </Slider>
  );
}

function TrimHandle({ index, label }: { index: 0 | 1; label: string }) {
  return (
    <SliderThumb
      index={index}
      aria-label={label}
      className={cn(
        "flex h-14 w-2.5 items-center justify-center border-0 bg-primary",
        "hover:bg-primary-hover active:bg-brand-600",
        "has-focus-visible:outline-2 has-focus-visible:outline-brand-300 has-focus-visible:outline-offset-2"
      )}
    >
      <span aria-hidden="true" className="h-4 w-px bg-primary-foreground/60" />
    </SliderThumb>
  );
}

function FilmStrip({ frames }: { frames: string[] }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex overflow-hidden bg-neutral-900"
    >
      {frames.map((url) => (
        <div
          key={url}
          className="flex min-w-0 flex-1 items-center justify-center border-neutral-950 border-r last:border-r-0"
        >
          <img
            src={url}
            alt=""
            draggable={false}
            className="max-h-full max-w-none shrink-0 object-contain"
            style={{ width: FILM_STRIP_TILE, height: FILM_STRIP_TILE }}
          />
        </div>
      ))}
    </div>
  );
}
