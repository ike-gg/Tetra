import { useMatchRoute } from "@tanstack/react-router";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@ui-sdk/react/dialog";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { QuickAdd } from "@/components/panel/quick-add";
import { buttonClassName } from "@/components/ui/button";
import { looksLikeEmoteLink } from "@/lib/catalog";

export type QuickAddRequest = {
  text?: string;
  /** Preselects this server; without it the user picks one. */
  guildId?: string;
};

const QuickAddContext = createContext<(request: QuickAddRequest) => void>(
  () => undefined
);

/** Opens the Quick add dialog, prefilled with a link. */
export const useQuickAdd = () => useContext(QuickAddContext);

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target.closest("input, textarea, select") !== null);

/**
 * The Quick add dialog for the whole panel. A link pasted while no field has focus opens
 * it prefilled; plain text never does. On the editor's routes a paste belongs to the
 * editor (its start screen opens links itself), so it never opens there.
 */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState<QuickAddRequest & { id: number }>({ id: 0 });
  const openRef = useRef(open);
  openRef.current = open;
  const matchRoute = useMatchRoute();
  const inEditor = Boolean(matchRoute({ to: "/panel/editor", fuzzy: true }));
  const inEditorRef = useRef(inEditor);
  inEditorRef.current = inEditor;

  const openQuickAdd = useCallback((next: QuickAddRequest) => {
    setRequest((current) => ({ ...next, id: current.id + 1 }));
    setOpen(true);
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (openRef.current || inEditorRef.current || event.defaultPrevented) return;
      if (isEditable(event.target)) return;
      // Images and files belong to whatever handles them (the editor), not here
      if (event.clipboardData?.files.length) return;
      const text = event.clipboardData?.getData("text/plain").trim() ?? "";
      if (!looksLikeEmoteLink(text)) return;
      event.preventDefault();
      openQuickAdd({ text });
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [openQuickAdd]);

  return (
    <QuickAddContext value={openQuickAdd}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogBackdrop className="bg-black/60" />
        {/* Top of the screen instead of centered, like a sheet (no vertically centered screens) */}
        <DialogContent
          initialFocus='input[name="emote-query"]'
          className="relative mt-[8vh] mb-auto flex max-h-[84dvh] w-[min(34rem,calc(100%-2rem))] flex-col gap-4 overflow-y-auto overscroll-contain border-border bg-background p-5 shadow-none sm:p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="font-semibold text-base tracking-tight">
              quick add
            </DialogTitle>
            <DialogClose className={buttonClassName({ variant: "ghost", size: "sm" })}>
              close
            </DialogClose>
          </div>
          <QuickAdd
            key={request.id}
            compact
            initialText={request.text}
            defaultGuildId={request.guildId}
            onAdded={() => setOpen(false)}
            onSearch={() => setOpen(false)}
            onOpenedInEditor={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </QuickAddContext>
  );
}
