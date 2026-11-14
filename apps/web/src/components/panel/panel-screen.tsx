import type { ReactNode } from "react";

import { BrandLink } from "@/components/brand-link";

type PanelScreenProps = {
  children: ReactNode;
  // Right side of the header
  actions?: ReactNode;
};

// App chrome for panel states without navigation (session check, login): a small header
// and one centered column. Not the public site's navbar and footer.
export function PanelScreen({ children, actions }: PanelScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-12 shrink-0 select-none items-center gap-2 border-border border-b px-4 text-sm">
        <BrandLink />
        <span className="text-neutral-600">/</span>
        <span className="font-medium">Panel</span>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
