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
import { EMOTE_FORMATS, type MediaRender, STILL_FORMATS } from "@/lib/media/render";

import { CanvasWindow } from "./canvas-window";
import { FITTING_HINTS, FittingPicker } from "./fitting-picker";
import { MediaCropper } from "./media-cropper";
import { type LiveResult, MediaPreview, type PreviewScale } from "./media-preview";
import { TrimTimeline } from "./trim-timeline";
import { useCropDraft } from "./use-crop-draft";
import { useFilmStrip } from "./use-film-strip";
import { useMediaRender } from "./use-media-render";

const sameCrop = (a: Crop | null, b: Crop | null) =>
  JSON.stringify(a) === JSON.stringify(b);

// What decides the result's geometry, to tell whether the result on screen still matches
// the crop that's shown
const geometryKey = (crop: Crop | null, fitting: Fitting) =>
  JSON.stringify([crop, fitting]);

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
  // Whether the Discord emote checks are on at first (name rules, 256 KB limit)
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
  const [previewScale, setPreviewScale] = useState<PreviewScale>("fit");
  const [edit, setEdit] = useState<Edit>(() => restoreEdit(info, initialEdit));
  // The crop before switching to "cover", so switching back gives the old shape again
  const cropBeforeCover = useRef<Crop | null>(null);
  const [largeNotice, setLargeNotice] = useState(source.bytes > LARGE_FILE_BYTES);
  const [firstFrameNotice, setFirstFrameNotice] = useState(source.firstFrameOnly);

  // Core rejects JPEG emotes, so emote mode never renders one
  const formats = useMemo(
    () =>
      discord
        ? outputFormats.filter((format) => EMOTE_FORMATS.includes(format))
        : outputFormats,
    [discord, outputFormats]
  );
  const { result, pending, error } = useMediaRender(source, edit, formats);
  const cropDraft = useCropDraft(info, edit.crop);
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

  const change = (next: (edit: Edit) => Edit) => setEdit(next);
  const setSetting =
    <Key extends keyof EditSettings>(key: Key) =>
    (value: EditSettings[Key]) =>
      change((current) => ({
        ...current,
        settings: { ...current.settings, [key]: value },
      }));
  const setCrop = (crop: Crop | null) => change((current) => ({ ...current, crop }));
  const commitCrop = (crop: Crop | null) => {
    cropDraft.set(crop);
    setCrop(crop);
  };
  // Fitting and crop are one decision: "cover" turns the crop into a square (its middle
  // square, which the person can then move), leaving "cover" restores the crop. The
  // selection animates there, while the edit takes the final crop at once, so the render
  // runs during the animation instead of after it.
  const setFitting = (fitting: Fitting) => {
    if (fitting === edit.settings.fitting) return;
    let crop = edit.crop;
    if (fitting === "cover") {
      cropBeforeCover.current = edit.crop;
      crop = squareInside(info, edit.crop);
    } else if (edit.settings.fitting === "cover") {
      crop = cropBeforeCover.current;
    }
    if (crop !== edit.crop || cropDraft.animating) cropDraft.animateTo(crop);
    change((current) => ({
      ...current,
      crop,
      settings: { ...current.settings, fitting },
    }));
  };
  // Under "cover" no crop is still a square: the middle one
  const uncropped = edit.settings.fitting === "cover" ? squareInside(info, null) : null;
  const resetCrop = () => {
    cropBeforeCover.current = null;
    cropDraft.animateTo(uncropped);
    setCrop(uncropped);
  };
  const setTrim = (trim: Trim) => change((current) => ({ ...current, trim }));

  const reset = () => {
    cropDraft.stop();
    setName(source.name);
    setEdit(defaultEdit(info));
  };

  const { settings } = edit;
  const size = sizeRange(info);
  const maxFps = sourceFps(info);

  // The crop as shown (the draft), and the result it will make
  const shownEdit = { ...edit, crop: cropDraft.draft };
  const shownCrop = effectiveCrop(info, shownEdit);
  const shownGeometry = geometryKey(shownCrop, settings.fitting);
  const committedGeometry = geometryKey(effectiveCrop(info, edit), settings.fitting);
  // A result always belongs to the edit current when it arrives (older runs are
  // discarded), so its geometry is noted then
  const [resultGeometry, setResultGeometry] = useState({
    result,
    key: committedGeometry,
  });
  if (resultGeometry.result !== result) {
    setResultGeometry({ result, key: committedGeometry });
  }
  // Until the render catches up with the shown crop, the result pane draws it from the
  // original with CSS; a failed render shows its error once nothing is moving
  const live: LiveResult | null =
    result &&
    shownGeometry !== resultGeometry.key &&
    (!error || shownGeometry !== committedGeometry)
      ? {
          crop: shownCrop ?? { x: 0, y: 0, width: info.width, height: info.height },
          ...predictDimensions(info, shownEdit).to,
        }
      : null;

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
              aria-label="breadcrumb"
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
              reset
            </Button>
            {actions(state)}
          </div>
        </header>

        {largeNotice && (
          <Notice
            title={`this file is ${formatBytes(source.bytes)}, the editor is made for smaller ones`}
            action={
              <Button variant="ghost" size="sm" onClick={() => setLargeNotice(false)}>
                continue anyway
              </Button>
            }
            className="shrink-0 border-x-0 border-t-0"
          >
            it runs in your browser and is built for files up to{" "}
            {formatBytes(LARGE_FILE_BYTES)}. you can keep going, but processing may be
            slow or fail. for big files a dedicated tool will do better; once it&apos;s
            smaller, bring it back here
          </Notice>
        )}
        {firstFrameNotice && (
          <Notice
            title="only the first frame opened"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFirstFrameNotice(false)}
              >
                keep the first frame
              </Button>
            }
            className="shrink-0 border-x-0 border-t-0"
          >
            this WebP is animated, but this browser couldn&apos;t read its frames. open it
            in a newer browser to edit the whole animation
          </Notice>
        )}
        {notice}

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="flex min-h-0 min-w-0 flex-col">
            <CanvasWindow
              className="max-lg:h-[60vh] lg:flex-1"
              title={<span className="font-medium">preview</span>}
              controls={
                <SegmentedControl
                  aria-label="preview scale"
                  size="sm"
                  value={previewScale}
                  onValueChange={(next) => next && setPreviewScale(next as PreviewScale)}
                >
                  <SegmentedControlItem value="fit">fit</SegmentedControlItem>
                  <SegmentedControlItem value="actual">actual size</SegmentedControlItem>
                </SegmentedControl>
              }
            >
              {(body) => (
                <MediaPreview
                  source={source}
                  name={nameError ? source.name : name}
                  crop={shownCrop}
                  scale={previewScale}
                  cropper={(pixelated) => (
                    <MediaCropper
                      source={source}
                      // Mid-animation the selection passes through other shapes, so the
                      // square lock waits until it lands
                      crop={cropDraft.animating ? cropDraft.draft : shownCrop}
                      square={settings.fitting === "cover" && !cropDraft.animating}
                      pixelated={pixelated}
                      onCropChange={cropDraft.set}
                      onCropCommit={commitCrop}
                    />
                  )}
                  cropControls={
                    <>
                      <FittingPicker
                        value={settings.fitting}
                        onValueChange={setFitting}
                      />
                      {!sameCrop(edit.crop, uncropped) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-6 px-2 text-xs"
                          onClick={resetCrop}
                        >
                          reset crop
                        </Button>
                      )}
                    </>
                  }
                  shapeHint={FITTING_HINTS[settings.fitting]}
                  result={result}
                  live={live}
                  pending={pending}
                  error={error}
                  discord={discord}
                  body={body}
                />
              )}
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
            aria-label="settings"
            className="flex min-h-0 flex-col border-border border-t lg:border-t-0 lg:border-l"
          >
            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <InspectorSection title="output">
                <div className="flex flex-col gap-4">
                  {!discordOnly && (
                    <Switch
                      label="Discord emote"
                      description={`checks the name and the ${formatBytes(DISCORD_EMOTE_LIMIT)} limit`}
                      checked={discord}
                      onCheckedChange={setDiscord}
                    />
                  )}
                  {discord ? (
                    <TextField
                      key="emote-name"
                      label="emote name"
                      value={name}
                      onValueChange={setName}
                      prefix=":"
                      suffix=":"
                      error={nameError}
                      description={
                        discordOnly
                          ? "how people type it in chat"
                          : "how people type it in chat, and the file name"
                      }
                    />
                  ) : (
                    <TextField
                      key="file-name"
                      label="file name"
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
                      label={pending ? "result size · updating" : "result size"}
                      value={bytes}
                      limit={DISCORD_EMOTE_LIMIT}
                      max={source.bytes}
                    />
                    {sizeNote && <div className="mt-3">{sizeNote(state)}</div>}
                  </>
                ) : (
                  <SizeSummary original={source.bytes} result={bytes} pending={pending} />
                )}
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
                    reset
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
                    label="size"
                    value={settings.size}
                    onValueChange={setSetting("size")}
                    min={size.min}
                    max={size.max}
                    step={4}
                    format={(value) => `${value} px`}
                  />
                  {animated && (
                    <Slider
                      label="frame rate"
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
                      label="colors"
                      value={settings.colors}
                      onValueChange={setSetting("colors")}
                      min={16}
                      max={256}
                      step={16}
                    />
                  )}
                  <Slider
                    label="compression"
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
                      label="speed"
                      value={settings.speed}
                      onValueChange={setSetting("speed")}
                      min={0.5}
                      max={2}
                      step={0.25}
                      format={(value) => `${value}×`}
                    />
                  )}
                  <Switch
                    label="trim empty edges"
                    description="cuts transparent borders around the image"
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
  { value: "auto", label: "auto" },
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
      ? `the smallest of the formats that keep its quality: ${result.formatLabel}`
      : "picks the smallest format that keeps its quality",
    png: "lossless, keeps transparency. compression doesn't apply",
    webp: "small, keeps transparency",
    jpeg: "for photos. transparent areas turn white",
  }[shown];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium text-foreground text-sm">format</span>
      <SegmentedControl
        aria-label="format"
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
        {pending ? "result size · updating" : "result size"}
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
        <p className="font-medium text-sm">processing</p>
        <p className="max-w-64 truncate font-mono text-muted text-xs">{fileName}</p>
        {bytes > LARGE_FILE_BYTES && (
          <p className="max-w-64 text-center text-muted text-xs">
            {formatBytes(bytes)} is a big file, this can take a minute
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
