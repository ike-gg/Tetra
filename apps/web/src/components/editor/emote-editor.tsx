import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { SizeMeter } from "@/components/ui/size-meter";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { formatBytes } from "@/lib/format-bytes";
import { type EmoteFile, emoteNameError, LARGE_GIF_BYTES } from "@/lib/gif/emote-file";
import {
  buildCommands,
  type Crop,
  DISCORD_EMOTE_LIMIT,
  defaultEdit,
  defaultSettings,
  type EmoteEdit,
  type EmoteSettings,
  reduceStep,
  sizeRange,
  sourceFps,
  type Trim,
} from "@/lib/gif/emote-pipeline";
import { runGifsicle } from "@/lib/gif/gifsicle";

import { EmoteCropper } from "./emote-cropper";
import { EmotePreview, type PreviewScale } from "./emote-preview";
import { TrimTimeline } from "./trim-timeline";
import { type EmoteRender, useEmoteRender } from "./use-emote-render";
import { useFilmStrip } from "./use-film-strip";

type View = "preview" | "crop";

export type EmoteEditorState = {
  name: string;
  nameValid: boolean;
  result: EmoteRender | null;
  pending: boolean;
  fits: boolean;
};

type EmoteEditorProps = {
  source: EmoteFile;
  // Breadcrumb segment between the wordmark and the emote name
  section: string;
  actions: (state: EmoteEditorState) => ReactNode;
  sizeNote?: (state: EmoteEditorState) => ReactNode;
};

export function EmoteEditor({ source, section, actions, sizeNote }: EmoteEditorProps) {
  const { info } = source;
  const animated = info.frames > 1;

  const [name, setName] = useState(source.name);
  const [view, setView] = useState<View>("preview");
  const [previewScale, setPreviewScale] = useState<PreviewScale>("fit");
  const [edit, setEdit] = useState<EmoteEdit>(() => defaultEdit(info));
  const [squareCrop, setSquareCrop] = useState(info.width === info.height);
  const [largeNotice, setLargeNotice] = useState(source.bytes > LARGE_GIF_BYTES);
  const [fitting, setFitting] = useState(false);
  const fitController = useRef<AbortController | null>(null);

  const { result, pending, error } = useEmoteRender(source, edit);
  const frames = useFilmStrip(source);

  const nameError = emoteNameError(name);
  const bytes = result?.bytes ?? source.bytes;
  const state: EmoteEditorState = {
    name,
    nameValid: !nameError,
    result,
    pending,
    fits: Boolean(result) && bytes <= DISCORD_EMOTE_LIMIT,
  };

  useEffect(() => () => fitController.current?.abort(), []);

  // Any manual change wins over a running auto-fit
  const change = (next: (edit: EmoteEdit) => EmoteEdit) => {
    fitController.current?.abort();
    setEdit(next);
  };
  const setSetting =
    <Key extends keyof EmoteSettings>(key: Key) =>
    (value: EmoteSettings[Key]) =>
      change((current) => ({
        ...current,
        settings: { ...current.settings, [key]: value },
      }));
  const setCrop = (crop: Crop | null) => change((current) => ({ ...current, crop }));
  const setTrim = (trim: Trim) => change((current) => ({ ...current, trim }));

  const fit = async () => {
    fitController.current?.abort();
    const controller = new AbortController();
    fitController.current = controller;
    setFitting(true);

    let settings = edit.settings;
    try {
      for (;;) {
        const [output] = await runGifsicle(
          source.buffer,
          buildCommands(info, { ...edit, settings }),
          controller.signal
        );
        if (!output || output.file.byteLength <= DISCORD_EMOTE_LIMIT) break;
        const next = reduceStep(info, settings);
        if (!next) break;
        settings = next;
      }
      setEdit((current) => ({ ...current, settings }));
    } catch {
      // Aborted by a manual change, or a failed run; the current edit stays as it is
    } finally {
      if (fitController.current === controller) {
        fitController.current = null;
        setFitting(false);
      }
    }
  };

  const reset = () => {
    fitController.current?.abort();
    setName(source.name);
    setEdit(defaultEdit(info));
  };

  const { settings } = edit;
  const size = sizeRange(info);
  const maxFps = sourceFps(info);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <header className="flex h-12 shrink-0 select-none items-center gap-3 border-border border-b px-4">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            to="/"
            className="cursor-default font-mono text-primary hover:text-primary-hover"
          >
            tetra
          </Link>
          <span className="text-neutral-600">/</span>
          <span className="text-muted">{section}</span>
          <span className="text-neutral-600">/</span>
          <span className="truncate font-medium">{nameError ? source.name : name}</span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
          {actions(state)}
        </div>
      </header>

      {largeNotice && (
        <Notice
          title={`This GIF is ${formatBytes(source.bytes)}, our editor is made for smaller ones`}
          action={
            <Button variant="ghost" size="sm" onClick={() => setLargeNotice(false)}>
              Continue anyway
            </Button>
          }
          className="shrink-0 border-x-0 border-t-0"
        >
          It runs in your browser and is built for GIFs up to{" "}
          {formatBytes(LARGE_GIF_BYTES)}. You can keep going, but processing may be slow
          or fail. For big files a dedicated GIF tool will do better; once it&apos;s
          smaller, bring it back here.
        </Notice>
      )}

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
                <SegmentedControl
                  aria-label="Crop shape"
                  value={squareCrop ? "square" : "free"}
                  onValueChange={(next) => setSquareCrop(next === "square")}
                >
                  <SegmentedControlItem value="square">Square</SegmentedControlItem>
                  <SegmentedControlItem value="free">Free</SegmentedControlItem>
                </SegmentedControl>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!edit.crop}
                  onClick={() => {
                    setCrop(null);
                    setSquareCrop(info.width === info.height);
                    setView("preview");
                  }}
                >
                  Remove crop
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto p-4 lg:p-8">
            {view === "preview" ? (
              <EmotePreview
                source={source}
                name={nameError ? source.name : name}
                crop={edit.crop}
                scale={previewScale}
                result={result}
                pending={pending}
                error={error}
              />
            ) : (
              <EmoteCropper
                // Remount on shape change so the selection refits to the new ratio
                key={squareCrop ? "square" : "free"}
                source={source}
                crop={edit.crop}
                square={squareCrop}
                onCropChange={setCrop}
              />
            )}
          </div>

          {animated && (
            <div className="shrink-0 border-border border-t px-4 py-3">
              <TrimTimeline
                info={info}
                frames={frames}
                value={edit.trim}
                onValueChange={setTrim}
              />
            </div>
          )}
        </main>

        <aside
          aria-label="Emote settings"
          className="flex min-h-0 flex-col border-border border-t lg:border-t-0 lg:border-l"
        >
          <div className="flex-1 overflow-y-auto">
            <InspectorSection title="name">
              <TextField
                label="Emote name"
                value={name}
                onValueChange={setName}
                prefix=":"
                suffix=":"
                error={nameError}
                description="How people type it in chat."
              />
            </InspectorSection>

            <InspectorSection title="size">
              <SizeMeter
                label={pending ? "Result size · updating" : "Result size"}
                value={bytes}
                limit={DISCORD_EMOTE_LIMIT}
                max={source.bytes}
              />
              <Button
                className="mt-4 w-full"
                disabled={state.fits || fitting}
                onClick={() => void fit()}
              >
                {fitting ? "Fitting…" : "Fit automatically"}
              </Button>
              {sizeNote && <div className="mt-3">{sizeNote(state)}</div>}
            </InspectorSection>

            <InspectorSection
              title="adjust"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  className="-my-1 h-6 px-2 text-xs"
                  onClick={() =>
                    change((current) => ({ ...current, settings: defaultSettings(info) }))
                  }
                >
                  Reset
                </Button>
              }
            >
              <div className="flex flex-col gap-5">
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
                <Slider
                  label="Colors"
                  value={settings.colors}
                  onValueChange={setSetting("colors")}
                  min={16}
                  max={256}
                  step={16}
                />
                <Slider
                  label="Compression"
                  value={settings.compression}
                  onValueChange={setSetting("compression")}
                  min={0}
                  max={100}
                  step={5}
                  format={(value) => `${value}%`}
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
                  description="Cut transparent borders around the emote."
                  checked={settings.trimEdges}
                  onCheckedChange={setSetting("trimEdges")}
                />
              </div>
            </InspectorSection>
          </div>
        </aside>
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
