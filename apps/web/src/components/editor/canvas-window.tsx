import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { type ElementSize, useElementSize } from "@/lib/use-element-size";

type Rect = { x: number; y: number; width: number; height: number };

const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;
const INSET = 16;
// A window dragged off an edge always keeps this much on screen to grab it back
const KEEP_VISIBLE = 64;

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

const fitted = (area: ElementSize): Rect => ({
  x: INSET,
  y: INSET,
  width: Math.max(Math.min(MIN_WIDTH, area.width), area.width - INSET * 2),
  height: Math.max(Math.min(MIN_HEIGHT, area.height), area.height - INSET * 2),
});

const clampRect = (rect: Rect, area: ElementSize): Rect => {
  const width = clampNumber(rect.width, Math.min(MIN_WIDTH, area.width), area.width);
  const height = clampNumber(rect.height, Math.min(MIN_HEIGHT, area.height), area.height);
  return {
    width,
    height,
    x: clampNumber(rect.x, KEEP_VISIBLE - width, area.width - KEEP_VISIBLE),
    y: clampNumber(rect.y, 0, area.height - KEEP_VISIBLE),
  };
};

// Per viewer and per browser, like a desktop app remembering its window; not tied to a file
const STORAGE_KEY = "tetra:editor-window";

const isRect = (value: unknown): value is Rect =>
  typeof value === "object" &&
  value !== null &&
  ["x", "y", "width", "height"].every(
    (key) => typeof (value as Record<string, unknown>)[key] === "number"
  );

// Storage can be missing or throw (private mode, blocked site data): the window then
// simply starts fitted
const loadRect = (): Rect | null => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return isRect(stored) ? stored : null;
  } catch {
    return null;
  }
};

const saveRect = (rect: Rect | null) => {
  try {
    if (rect) localStorage.setItem(STORAGE_KEY, JSON.stringify(rect));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not remembering the window is fine
  }
};

type CanvasWindowProps = {
  title: ReactNode;
  // Rendered with the body's current size, so content can fit itself to the window
  children: (body: ElementSize) => ReactNode;
  className?: string;
};

// The editor's workspace: a fixed area that never scrolls, holding one window the person
// can move by its title bar and resize from its corner, like a document window on a
// desktop. Its last position and size are remembered in this browser; double-clicking the
// title bar (or Fit window) puts it back and forgets them.
export function CanvasWindow({ title, children, className }: CanvasWindowProps) {
  const workspace = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const area = useElementSize(workspace);
  const bodySize = useElementSize(body);
  const [rect, setRect] = useState<Rect | null>(null);
  const areaRef = useRef(area);
  areaRef.current = area;
  const rectRef = useRef(rect);
  rectRef.current = rect;

  // What the person chose (or null: follow the workspace). The shown rect is this clamped
  // to the workspace, so a smaller browser window never overwrites the choice: the window
  // grows back when there's room again.
  const preferred = useRef<Rect | null | undefined>(undefined);

  useEffect(() => {
    if (!area) return;
    if (preferred.current === undefined) preferred.current = loadRect();
    setRect(clampRect(preferred.current ?? fitted(area), area));
  }, [area]);

  const reset = () => {
    if (!area) return;
    preferred.current = null;
    setRect(fitted(area));
    saveRect(null);
  };

  // Pointer capture keeps tracking outside the bar; the grab offset is kept, so the window
  // moves 1:1 with the pointer from wherever it was grabbed
  const startDrag =
    (mode: "move" | "resize") => (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || !rect) return;
      if (mode === "move" && (event.target as Element).closest("button")) return;
      event.preventDefault();

      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      const start = { x: event.clientX, y: event.clientY, rect };

      const move = (moveEvent: PointerEvent) => {
        const current = areaRef.current;
        if (!current) return;
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        setRect(
          clampRect(
            mode === "move"
              ? { ...start.rect, x: start.rect.x + dx, y: start.rect.y + dy }
              : {
                  ...start.rect,
                  width: Math.min(start.rect.width + dx, current.width - start.rect.x),
                  height: Math.min(start.rect.height + dy, current.height - start.rect.y),
                },
            current
          )
        );
      };
      const end = () => {
        preferred.current = rectRef.current;
        saveRect(rectRef.current);
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", end);
        target.removeEventListener("pointercancel", end);
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", end);
      target.addEventListener("pointercancel", end);
    };

  return (
    <div
      ref={workspace}
      className={cn("relative min-h-0 overflow-hidden bg-dots", className)}
    >
      <section
        aria-label="Canvas"
        className={cn(
          "absolute flex flex-col border border-border bg-background",
          !rect && "invisible"
        )}
        style={
          rect
            ? { left: rect.x, top: rect.y, width: rect.width, height: rect.height }
            : undefined
        }
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only drag handle; the Fit window button is the keyboard path */}
        <div
          onPointerDown={startDrag("move")}
          onDoubleClick={reset}
          className="flex h-9 shrink-0 cursor-default touch-none select-none items-center gap-2 border-border border-b bg-surface px-3"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">{title}</div>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={reset}>
            Fit window
          </Button>
        </div>
        <div ref={body} className="relative min-h-0 flex-1 overflow-hidden">
          {bodySize && children(bodySize)}
        </div>
        <div
          aria-hidden="true"
          onPointerDown={startDrag("resize")}
          className="absolute right-0 bottom-0 size-4 cursor-nwse-resize touch-none"
        >
          <span className="absolute right-1 bottom-1 size-1.5 bg-neutral-500" />
        </div>
      </section>
    </div>
  );
}
