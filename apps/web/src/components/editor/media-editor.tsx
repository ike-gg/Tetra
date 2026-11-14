import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { BrandLink } from "@/components/brand-link";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { SizeMeter } from "@/components/ui/size-meter";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format-bytes";
import type { StillFormat } from "@/lib/image/render-image";
import {
  type Crop,
  DISCORD_EMOTE_LIMIT,
  defaultEdit,
  defaultSettings,
  type Edit,
  type EditSettings,
  effectiveCrop,
  type Fitting,
  type OutputFormat,
  predictDimensions,
  reduceStep,
  restoreEdit,
  sizeRange,
  sourceFps,
  squareInside,
  type Trim,
} from "@/lib/media/edit";
import {
  emoteNameError,
  fileNameError,
  LARGE_FILE_BYTES,
  type MediaFile,
} from "@/lib/media/media-file";
import {
  EMOTE_FORMATS,
  type MediaRender,
  renderMedia,
  STILL_FORMATS,
} from "@/lib/media/render";

import { CanvasWindow } from "./canvas-window";
import { FITTING_LABELS, FittingPicker } from "./fitting-picker";
import { MediaCropper } from "./media-cropper";
import { MediaPreview, type PreviewScale } from "./media-preview";
import { TrimTimeline } from "./trim-timeline";
import { useFilmStrip } from "./use-film-strip";
import { useMediaRender } from "./use-media-render";

type View = "preview" | "crop";

export type MediaEditorState = {
  // Discord emote mode: the name is an emote name and the result fits Discord's rules
  discord: boolean;
  name: string;
  nameValid: boolean;
  result: MediaRender | null;
  pending: boolean;
  fits: boolean;
};

type MediaEditorProps = {
  source: MediaFile;
  // Breadcrumb segment between the wordmark and the file name. Left out when the host
  // has its own header (the panel): the editor then fills the host's content area, and
  // `toolbarStart` takes the breadcrumb's place.
  section?: { label: string; to: "/editor" | "/panel" };
  toolbarStart?: ReactNode;
  actions: (state: MediaEditorState) => ReactNode;
  // Bars under the toolbar, like a warning about the destination
  notice?: ReactNode;
  sizeNote?: (state: MediaEditorState) => ReactNode;
  // Restores earlier work; the editor starts from these instead of the defaults
  initialEdit?: Edit | null;
  initialName?: string;
  // Whether the Discord emote checks are on at first (name rules, 256 KB limit, auto-fit)
  initialDiscord?: boolean;
  // Always an emote: the checks are on and the switch is hidden
  discordOnly?: boolean;
  // What a still image may become; Discord emote mode keeps only EMOTE_FORMATS of these
  outputFormats?: readonly StillFormat[];
  // Height and layout; the editor takes the full viewport by default
  className?: string;
  // Called after every change of the settings, name or Discord toggle, for saving them
  onWorkChange?: (work: EditorWork) => void;
};

export type EditorWork = { edit: Edit; name: string; discord: boolean };

export function MediaEditor({
  source,
  section,
  toolbarStart,
  actions,
  notice,
  sizeNote,
  initialEdit,
  initialName,
  initialDiscord = false,
  discordOnly = false,
  outputFormats = STILL_FORMATS,
  className,
  onWorkChange,
}: MediaEditorProps) {
  const { info } = source;
  const animated = info.frames > 1;
  const still = source.kind === "image";

  const [name, setName] = useState(initialName ?? source.name);
  const [discord, setDiscord] = useState(discordOnly || initialDiscord);
  const [view, setView] = useState<View>("preview");
  const [previewScale, setPreviewScale] = useState<PreviewScale>("fit");
  const [edit, setEdit] = useState<Edit>(() => restoreEdit(info, initialEdit));
  // The crop before switching to "cover", so switching back gives the old shape again
  const cropBeforeCover = useRef<Crop | null>(null);
  const [largeNotice, setLargeNotice] = useState(source.bytes > LARGE_FILE_BYTES);
  const [autoFitting, setAutoFitting] = useState(false);
  const fitController = useRef<AbortController | null>(null);

  // Core rejects JPEG emotes, so emote mode never renders one
  const formats = useMemo(
    () =>
      discord
        ? outputFormats.filter((format) => EMOTE_FORMATS.includes(format))
        : outputFormats,
    [discord, outputFormats]
  );
  const { result, pending, error } = useMediaRender(source, edit, formats);
  const frames = useFilmStrip(source);

  const nameError = discord ? emoteNameError(name) : fileNameError(name);
  const bytes = result?.bytes ?? source.bytes;
  const state: MediaEditorState = {
    discord,
    name,
    nameValid: !nameError,
    result,
    pending,
    fits: Boolean(result) && bytes <= DISCORD_EMOTE_LIMIT,
  };

  useEffect(() => () => fitController.current?.abort(), []);

  const onWorkChangeRef = useRef(onWorkChange);
  onWorkChangeRef.current = onWorkChange;
  const workKey = JSON.stringify({ edit, name, discord });
  const savedKey = useRef(workKey);
  // biome-ignore lint/correctness/useExhaustiveDependencies: workKey stands in for edit, name and discord
  useEffect(() => {
    if (savedKey.current === workKey) return;
    savedKey.current = workKey;
    onWorkChangeRef.current?.({ edit, name, discord });
  }, [workKey]);

  // Any manual change wins over a running auto-fit
  const change = (next: (edit: Edit) => Edit) => {
    fitController.current?.abort();
    setEdit(next);
  };
  const setSetting =
    <Key extends keyof EditSettings>(key: Key) =>
    (value: EditSettings[Key]) =>
      change((current) => ({
        ...current,
        settings: { ...current.settings, [key]: value },
      }));
  const setCrop = (crop: Crop | null) => change((current) => ({ ...current, crop }));
  // Fitting and crop are one decision: "cover" turns the crop into a square (its middle
  // square, which the person can then move in Crop), leaving "cover" restores the crop
  const setFitting = (fitting: Fitting) => {
    if (fitting === edit.settings.fitting) return;
    let crop = edit.crop;
    if (fitting === "cover") {
      cropBeforeCover.current = edit.crop;
      crop = squareInside(info, edit.crop);
    } else if (edit.settings.fitting === "cover") {
      crop = cropBeforeCover.current;
    }
    change((current) => ({
      ...current,
      crop,
      settings: { ...current.settings, fitting },
    }));
  };
  const removeCrop = () => {
    cropBeforeCover.current = null;
    setCrop(null);
  };
  const setTrim = (trim: Trim) => change((current) => ({ ...current, trim }));

  const fit = async () => {
    fitController.current?.abort();
    const controller = new AbortController();
    fitController.current = controller;
    setAutoFitting(true);

    let settings = edit.settings;
    try {
      for (;;) {
        const render = await renderMedia(
          source,
          { ...edit, settings },
          controller.signal,
          formats
        );
        URL.revokeObjectURL(render.url);
        if (render.bytes <= DISCORD_EMOTE_LIMIT) break;
        const next = reduceStep(source, settings);
        if (!next) break;
        settings = next;
      }
      setEdit((current) => ({ ...current, settings }));
    } catch {
      // Aborted by a manual change, or a failed run; the current edit stays as it is
    } finally {
      if (fitController.current === controller) {
        fitController.current = null;
        setAutoFitting(false);
      }
    }
  };

  const reset = () => {
    fitController.current?.abort();
    setName(source.name);
    setEdit(defaultEdit(info));
  };

  const { settings } = edit;
  const dimensionsPreview = predictDimensions(info, edit);
  const size = sizeRange(info);
  const maxFps = sourceFps(info);

  // The first render blocks the editor: until then there's nothing to compare against,
  // and settings changed meanwhile would only restart it
  const firstRender = !result && !error;

  return (
    // relative: ui-sdk hides its form inputs with position: absolute; without a positioned
    // ancestor they're placed against the page and stretch it below a scrolled sidebar
    <div
      className={cn(
        "relative flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden",
        className
      )}
    >
      {firstRender && (
        <ProcessingOverlay
          fileName={source.name}
          bytes={source.bytes}
          contained={!section}
        />
      )}
      <div inert={firstRender} className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 select-none items-center gap-3 border-border border-b px-4">
          {section ? (
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-2 text-sm"
            >
              <BrandLink />
              <span className="text-neutral-600">/</span>
              <Link
                to={section.to}
                className="cursor-default text-muted no-underline hover:text-foreground active:text-neutral-300"
              >
                {section.label}
              </Link>
              {/* On a phone the name field shows it; the toolbar needs the room */}
              <span className="text-neutral-600 max-sm:hidden">/</span>
              <span className="truncate font-medium max-sm:hidden">
                {nameError ? source.name : name}
              </span>
            </nav>
          ) : (
            toolbarStart
          )}
          <div className="ml-auto flex min-w-0 items-center gap-2">
            {/* Next to a breadcrumb a phone has room for the page's actions only */}
            <Button
              variant="ghost"
              size="sm"
              className={section ? "max-sm:hidden" : undefined}
              onClick={reset}
            >
              Reset
            </Button>
            {actions(state)}
          </div>
        </header>

        {largeNotice && (
          <Notice
            title={`This file is ${formatBytes(source.bytes)}, our editor is made for smaller ones`}
            action={
              <Button variant="ghost" size="sm" onClick={() => setLargeNotice(false)}>
                Continue anyway
              </Button>
            }
            className="shrink-0 border-x-0 border-t-0"
          >
            It runs in your browser and is built for files up to{" "}
            {formatBytes(LARGE_FILE_BYTES)}. You can keep going, but processing may be
            slow or fail. For big files a dedicated tool will do better; once it&apos;s
            smaller, bring it back here.
          </Notice>
        )}
        {notice}

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="flex min-h-0 min-w-0 flex-col">
            <div className="flex h-12 shrink-0 items-center gap-3 border-border border-b px-4">
              <SegmentedControl
                aria-label="View"
                value={view}
                onValueChange={(next) => next && setView(next as View)}
              >
                <SegmentedControlItem value="preview">Preview</SegmentedControlItem>
                <SegmentedControlItem value="crop">Crop</SegmentedControlItem>
              </SegmentedControl>
              {view === "preview" && (
                <SegmentedControl
                  aria-label="Preview scale"
                  value={previewScale}
                  onValueChange={(next) => next && setPreviewScale(next as PreviewScale)}
                  className="ml-auto"
                >
                  <SegmentedControlItem value="fit">Fit</SegmentedControlItem>
                  <SegmentedControlItem value="actual">Actual size</SegmentedControlItem>
                </SegmentedControl>
              )}
              {view === "crop" && (
                <>
                  <FittingPicker value={settings.fitting} onValueChange={setFitting} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    disabled={!edit.crop}
                    onClick={removeCrop}
                  >
                    Remove crop
                  </Button>
                </>
              )}
            </div>

            <CanvasWindow
              className="max-lg:h-[60vh] lg:flex-1"
              title={
                view === "preview" ? (
                  <span className="font-medium">Preview</span>
                ) : (
                  <>
                    <span className="shrink-0 font-medium">Crop</span>
                    <span className="truncate text-muted text-xs">
                      {CROP_HINTS[settings.fitting]}
                    </span>
                  </>
                )
              }
            >
              {(body) =>
                view === "preview" ? (
                  <MediaPreview
                    source={source}
                    name={nameError ? source.name : name}
                    crop={effectiveCrop(info, edit)}
                    scale={previewScale}
                    result={result}
                    pending={pending}
                    error={error}
                    discord={discord}
                    body={body}
                  />
                ) : (
                  <div className="flex size-full">
                    <MediaCropper
                      // Remount on shape change so the selection refits to the new ratio
                      key={settings.fitting === "cover" ? "square" : "free"}
                      source={source}
                      crop={effectiveCrop(info, edit)}
                      square={settings.fitting === "cover"}
                      onCropChange={setCrop}
                      body={body}
                    />
                  </div>
                )
              }
            </CanvasWindow>

            {animated && (
              <div className="shrink-0 border-border border-t px-4 py-3">
                <TrimTimeline
                  info={info}
                  frames={frames}
                  value={edit.trim}
                  onValueCommit={setTrim}
                />
              </div>
            )}
          </main>

          <aside
            aria-label="Settings"
            className="flex min-h-0 flex-col border-border border-t lg:border-t-0 lg:border-l"
          >
            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <InspectorSection title="output">
                <div className="flex flex-col gap-4">
                  {!discordOnly && (
                    <Switch
                      label="Discord emote"
                      description={`Checks the name and the ${formatBytes(DISCORD_EMOTE_LIMIT)} limit.`}
                      checked={discord}
                      onCheckedChange={setDiscord}
                    />
                  )}
                  {discord ? (
                    <TextField
                      key="emote-name"
                      label="Emote name"
                      value={name}
                      onValueChange={setName}
                      prefix=":"
                      suffix=":"
                      error={nameError}
                      description={
                        discordOnly
                          ? "How people type it in chat."
                          : "How people type it in chat, and the file name."
                      }
                    />
                  ) : (
                    <TextField
                      key="file-name"
                      label="File name"
                      value={name}
                      onValueChange={setName}
                      suffix={`.${result?.extension ?? "gif"}`}
                      error={nameError}
                    />
                  )}
                </div>
              </InspectorSection>

              <InspectorSection title="size">
                {discord ? (
                  <>
                    <SizeMeter
                      label={pending ? "Result size · updating" : "Result size"}
                      value={bytes}
                      limit={DISCORD_EMOTE_LIMIT}
                      max={source.bytes}
                    />
                    <Button
                      className="mt-4 w-full"
                      disabled={state.fits || autoFitting}
                      onClick={() => void fit()}
                    >
                      {autoFitting ? "Fitting…" : "Fit automatically"}
                    </Button>
                    {sizeNote && <div className="mt-3">{sizeNote(state)}</div>}
                  </>
                ) : (
                  <SizeSummary original={source.bytes} result={bytes} pending={pending} />
                )}
              </InspectorSection>

              <InspectorSection title="frame">
                <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted">Crop</dt>
                  <dd className="font-mono text-xs tabular-nums">
                    {edit.crop
                      ? `${Math.round(edit.crop.width)}×${Math.round(edit.crop.height)}`
                      : "None"}
                  </dd>
                  <dt className="text-muted">Fitting</dt>
                  <dd>{FITTING_LABELS[settings.fitting]}</dd>
                  <dt className="text-muted">Result</dt>
                  <dd className="font-mono text-xs tabular-nums">
                    {Math.round(dimensionsPreview.to.width)}×
                    {Math.round(dimensionsPreview.to.height)}
                  </dd>
                </dl>
                <p className="mt-3 text-muted text-xs">
                  Crop and fitting are set in the Crop view.
                </p>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setView(view === "crop" ? "preview" : "crop")}
                >
                  {view === "crop" ? "Exit Crop mode" : "Edit in Crop"}
                </Button>
              </InspectorSection>

              <InspectorSection
                title="adjust"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-my-1 h-6 px-2 text-xs"
                    onClick={() =>
                      change((current) => ({
                        ...current,
                        settings: defaultSettings(info),
                      }))
                    }
                  >
                    Reset
                  </Button>
                }
              >
                <div className="flex flex-col gap-5">
                  {still && (
                    <FormatPicker
                      formats={formats}
                      value={settings.format}
                      onValueChange={setSetting("format")}
                      result={result}
                    />
                  )}
                  <Slider
                    label="Size"
                    value={settings.size}
                    onValueChange={setSetting("size")}
                    min={size.min}
                    max={size.max}
                    step={4}
                    format={(value) => `${value} px`}
                  />
                  {animated && (
                    <Slider
                      label="Frame rate"
                      value={settings.fps}
                      onValueChange={setSetting("fps")}
                      min={Math.min(5, maxFps)}
                      max={maxFps}
                      format={(value) => `${value} fps`}
                      disabled={maxFps <= 5}
                    />
                  )}
                  {!still && (
                    <Slider
                      label="Colors"
                      value={settings.colors}
                      onValueChange={setSetting("colors")}
                      min={16}
                      max={256}
                      step={16}
                    />
                  )}
                  <Slider
                    label="Compression"
                    value={settings.compression}
                    onValueChange={setSetting("compression")}
                    min={0}
                    max={100}
                    step={5}
                    format={(value) => (still && value === 0 ? "lossless" : `${value}%`)}
                    disabled={still && settings.format === "png"}
                  />
                  {animated && (
                    <Slider
                      label="Speed"
                      value={settings.speed}
                      onValueChange={setSetting("speed")}
                      min={0.5}
                      max={2}
                      step={0.25}
                      format={(value) => `${value}×`}
                    />
                  )}
                  <Switch
                    label="Trim empty edges"
                    description="Cut transparent borders around the image."
                    checked={settings.trimEdges}
                    onCheckedChange={setSetting("trimEdges")}
                  />
                </div>
              </InspectorSection>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const FORMATS: { value: OutputFormat; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "jpeg", label: "JPEG" },
];

function FormatPicker({
  formats,
  value,
  onValueChange,
  result,
}: {
  formats: readonly StillFormat[];
  value: OutputFormat;
  onValueChange: (value: OutputFormat) => void;
  result: MediaRender | null;
}) {
  // A saved format that isn't allowed here (JPEG in emote mode) renders as Auto
  const shown = value === "auto" || formats.includes(value) ? value : "auto";
  const hint = {
    auto: result
      ? `Smallest of the formats that keep its quality: ${result.formatLabel}.`
      : "Picks the smallest format that keeps its quality.",
    png: "Lossless, keeps transparency. Compression doesn't apply.",
    webp: "Small, keeps transparency.",
    jpeg: "For photos. Transparent areas turn white.",
  }[shown];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-foreground text-sm">Format</span>
      <SegmentedControl
        aria-label="Format"
        value={shown}
        onValueChange={(next) => next && onValueChange(next as OutputFormat)}
        className="flex w-full"
      >
        {FORMATS.filter(
          (format) => format.value === "auto" || formats.includes(format.value)
        ).map((format) => (
          <SegmentedControlItem key={format.value} value={format.value} className="px-0">
            {format.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      <span className="text-muted text-xs">{hint}</span>
    </div>
  );
}

const CROP_HINTS: Record<Fitting, string> = {
  contain: "Drag the edges to crop. The result keeps this shape.",
  cover: "Move or resize the square. Only what's inside stays.",
  fill: "Drag the edges to crop. This area gets squeezed into a square.",
};

function SizeSummary({
  original,
  result,
  pending,
}: {
  original: number;
  result: number;
  pending: boolean;
}) {
  const change = Math.round(((result - original) / original) * 100);

  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium text-foreground text-sm">
        {pending ? "Result size · updating" : "Result size"}
      </span>
      <p className="font-mono text-muted text-xs tabular-nums">
        {formatBytes(original)} →{" "}
        <span className="text-foreground">{formatBytes(result)}</span>
        {change !== 0 && ` · ${change > 0 ? "+" : ""}${change}%`}
      </p>
    </div>
  );
}

function ProcessingOverlay({
  fileName,
  bytes,
  contained,
}: {
  fileName: string;
  bytes: number;
  // Inside a host layout: covers only the editor, card at the top instead of centered
  contained: boolean;
}) {
  return (
    <div
      role="status"
      className={cn(
        "inset-0 z-50 flex justify-center bg-background/80 backdrop-blur-sm",
        contained ? "absolute z-10 items-start pt-24" : "fixed items-center"
      )}
    >
      <div className="flex flex-col items-center gap-3 border border-border bg-background px-8 py-6">
        <Spinner className="text-2xl" />
        <p className="font-medium text-sm">Processing</p>
        <p className="max-w-64 truncate font-mono text-muted text-xs">{fileName}</p>
        {bytes > LARGE_FILE_BYTES && (
          <p className="max-w-64 text-center text-muted text-xs">
            {formatBytes(bytes)} is a big file, this can take a while.
          </p>
        )}
      </div>
    </div>
  );
}

function InspectorSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-border border-b p-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="select-none font-medium font-mono text-muted text-xs tracking-widest">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
