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
import { guildsQueryOptions } from "@/lib/guilds";

const ICON_BUTTON =
  "flex size-8 shrink-0 cursor-default select-none items-center justify-center border-0 bg-transparent p-0 font-mono text-base hover:bg-surface active:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2";

// The last crumb: what the content area shows right now
function useCurrentView() {
  const matchRoute = useMatchRoute();
  const guilds = useQuery(guildsQueryOptions);

  const server = matchRoute({ to: "/panel/servers/$guildId" });
  if (server) {
    return (
      guilds.data?.guildsWithUserPermissions.find((guild) => guild.id === server.guildId)
        ?.name ?? "Server"
    );
  }
  if (matchRoute({ to: "/panel/tasks" })) return "Tasks";
  return "Home";
}

// App chrome of the logged-in panel: header with breadcrumb and account, a fixed sidebar on
// wide screens and the same navigation in a drawer on narrow ones
export function PanelLayout({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const view = useCurrentView();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 flex h-12 select-none items-center gap-2 border-border border-b bg-background px-2 text-sm sm:px-4">
        <Drawer side="left" open={navOpen} onOpenChange={setNavOpen}>
          <DrawerTrigger
            aria-label="Open navigation"
            className={`${ICON_BUTTON} md:hidden`}
          >
            <span aria-hidden="true">≡</span>
          </DrawerTrigger>
          <DrawerBackdrop className="bg-black/60" />
          <DrawerContent className="flex h-full w-72 max-w-[85vw] flex-col gap-0 overflow-y-auto border-0 border-border border-r bg-background p-0 shadow-none">
            <div className="flex h-12 shrink-0 items-center justify-between border-border border-b pr-2 pl-5">
              <DrawerTitle className="font-medium text-sm">Panel</DrawerTitle>
              <DrawerClose className="h-8 cursor-default select-none border-0 bg-transparent px-3 font-medium text-muted text-sm hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2 active:bg-neutral-800">
                Close
              </DrawerClose>
            </div>
            <PanelNav onNavigate={() => setNavOpen(false)} />
          </DrawerContent>
        </Drawer>

        <BrandLink />
        <span aria-hidden="true" className="text-neutral-600">
          /
        </span>
        <Link
          to="/panel"
          className="cursor-default text-muted no-underline hover:text-foreground"
        >
          Panel
        </Link>
        <span aria-hidden="true" className="text-neutral-600">
          /
        </span>
        <span aria-current="page" className="min-w-0 truncate font-medium">
          {view}
        </span>

        <div className="ml-auto shrink-0">
          <PanelUserMenu />
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-12 hidden h-[calc(100dvh-3rem)] w-60 shrink-0 overflow-y-auto border-border border-r md:block">
          <PanelNav />
        </aside>
        <main className="min-w-0 flex-1 px-4 pt-8 pb-16 sm:px-8 sm:pt-12">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
