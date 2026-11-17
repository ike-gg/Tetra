import type { ReactNode } from "react";

import { BrandLink } from "@/components/brand-link";

type PanelScreenProps = {
  children: ReactNode;
  // Right side of the header
  actions?: ReactNode;
};

// App chrome for panel states without navigation (session check, login): a small header
// and one column centered horizontally below a top margin, never centered vertically.
// Not the public site's navbar and footer.
export function PanelScreen({ children, actions }: PanelScreenProps) {
  return (
    <div data-panel-root className="flex min-h-dvh flex-col">
      <header className="flex h-12 shrink-0 select-none items-center gap-2 border-border border-b px-4 text-sm">
        <BrandLink />
        <span className="text-neutral-600">/</span>
        <span className="font-medium">panel</span>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </header>
      <main className="flex-1 px-4 pt-16 pb-12 sm:pt-24">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
