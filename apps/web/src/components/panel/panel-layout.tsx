import { useQuery } from "@tanstack/react-query";
import { Link, useMatchRoute } from "@tanstack/react-router";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@ui-sdk/react/drawer";
import { type ReactNode, useState } from "react";

import { BrandLink } from "@/components/brand-link";
import { PanelNav } from "@/components/panel/panel-nav";
import { PanelUserMenu } from "@/components/panel/panel-user-menu";
import { QuickAddProvider } from "@/components/panel/quick-add-dialog";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { guildsQueryOptions } from "@/lib/guilds";
import { libraryFileQueryOptions } from "@/lib/media/library-file";
import { taskQueryOptions } from "@/lib/tasks";

const ICON_BUTTON =
  "flex size-8 shrink-0 cursor-default select-none items-center justify-center border-0 bg-transparent p-0 font-mono text-base hover:bg-surface active:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2";

type CurrentView = {
  label: string;
  // A crumb between Panel and the label, for views that live under another one
  parent?: { label: string; to: "/panel/tasks" | "/panel/editor" };
  // The editor fills the content area edge to edge
  fullBleed?: boolean;
};

// The last crumb: what the content area shows right now
function useCurrentView(): CurrentView {
  const matchRoute = useMatchRoute();
  const guilds = useQuery(guildsQueryOptions);
  const taskEditor = matchRoute({ to: "/panel/tasks/$taskId" });
  const taskId = taskEditor ? taskEditor.taskId : "";
  // Shares the editor page's query, so it costs no extra request
  const task = useQuery({ ...taskQueryOptions(taskId), enabled: Boolean(taskEditor) });

  const fileEditor = matchRoute({ to: "/panel/editor/$key" });
  const fileKey = fileEditor ? fileEditor.key : "";
  // The editor page's own query: the library is read once
  const file = useQuery({
    ...libraryFileQueryOptions(fileKey),
    enabled: Boolean(fileEditor),
  });

  if (taskEditor) {
    return {
      label: task.data ? `:${task.data.emote.name}:` : "editor",
      parent: { label: "tasks", to: "/panel/tasks" },
      fullBleed: true,
    };
  }
  if (fileEditor) {
    return {
      label: file.data?.entry.fileName ?? fileEditor.key,
      parent: { label: "editor", to: "/panel/editor" },
      fullBleed: true,
    };
  }
  if (matchRoute({ to: "/panel/editor" })) return { label: "editor" };
  const server = matchRoute({ to: "/panel/servers/$guildId" });
  if (server) {
    return {
      label:
        guilds.data?.guildsWithUserPermissions.find(
          (guild) => guild.id === server.guildId
        )?.name ?? "server",
    };
  }
  if (matchRoute({ to: "/panel/tasks" })) return { label: "tasks" };
  if (matchRoute({ to: "/panel/browse" })) return { label: "browse" };
  if (matchRoute({ to: "/panel/channels" })) return { label: "channels" };
  return { label: "home" };
}

const CRUMB_LINK = "cursor-default text-muted no-underline hover:text-foreground";

// App chrome of the logged-in panel: header with breadcrumb and account, a fixed sidebar on
// wide screens and the same navigation in a drawer on narrow ones
export function PanelLayout({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const view = useCurrentView();

  return (
    // --panel-inset: where the content area starts, for chrome fixed to it (selection bar)
    <div
      data-panel-root
      className={cn(
        "min-h-dvh",
        view.fullBleed ? "xl:[--panel-inset:15rem]" : "md:[--panel-inset:15rem]"
      )}
    >
      <header className="sticky top-0 z-20 flex h-12 select-none items-center gap-2 border-border border-b bg-background px-2 text-sm sm:px-4">
        <Drawer side="left" open={navOpen} onOpenChange={setNavOpen}>
          <DrawerTrigger
            aria-label="open navigation"
            className={cn(ICON_BUTTON, view.fullBleed ? "xl:hidden" : "md:hidden")}
          >
            <span aria-hidden="true">≡</span>
          </DrawerTrigger>
          <DrawerBackdrop className="bg-black/60" />
          <DrawerContent className="flex h-full w-72 max-w-[85vw] flex-col gap-0 overflow-y-auto overscroll-none border-0 border-border border-r bg-background p-0 shadow-none">
            <div className="flex h-12 shrink-0 items-center justify-between border-border border-b pr-2 pl-5">
              <DrawerTitle className="font-medium text-sm">panel</DrawerTitle>
              <DrawerClose className="h-8 cursor-default select-none border-0 bg-transparent px-3 font-medium text-muted text-sm hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2 active:bg-neutral-800">
                close
              </DrawerClose>
            </div>
            <PanelNav onNavigate={() => setNavOpen(false)} />
          </DrawerContent>
        </Drawer>

        <BrandLink />
        <span aria-hidden="true" className="text-neutral-600">
          /
        </span>
        <Link to="/panel" className={CRUMB_LINK}>
          panel
        </Link>
        <span aria-hidden="true" className="text-neutral-600">
          /
        </span>
        {view.parent && (
          <>
            <Link to={view.parent.to} className={cn(CRUMB_LINK, "max-sm:hidden")}>
              {view.parent.label}
            </Link>
            <span aria-hidden="true" className="text-neutral-600 max-sm:hidden">
              /
            </span>
          </>
        )}
        <span aria-current="page" className="min-w-0 truncate font-medium">
          {view.label}
        </span>

        <div className="ml-auto shrink-0">
          <PanelUserMenu />
        </div>
      </header>

      <div className="flex">
        {/* The editor needs the width more than the sidebar below xl; the drawer stays */}
        <aside
          className={cn(
            "sticky top-12 hidden h-[calc(100dvh-3rem)] w-60 shrink-0 overflow-y-auto overscroll-none border-border border-r",
            view.fullBleed ? "xl:block" : "md:block"
          )}
        >
          <PanelNav />
        </aside>
        <QuickAddProvider>
          {view.fullBleed ? (
            // The page brings its own <main> (the editor has one around its workspace)
            <div className="min-w-0 flex-1">{children}</div>
          ) : (
            <main className="min-w-0 flex-1 px-4 pt-8 pb-16 sm:px-8 sm:pt-12">
              <div className="mx-auto w-full max-w-5xl">{children}</div>
            </main>
          )}
        </QuickAddProvider>
      </div>
      <Toaster />
    </div>
  );
}
