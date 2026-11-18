import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";
import { INVITE_URL } from "@/lib/links";

// Every page of the site; add new public pages here
const PAGES = [
  { to: "/", label: "home" },
  { to: "/editor", label: "editor" },
  { to: "/panel", label: "panel" },
  { to: "/branding", label: "branding" },
] as const;

// The legal documents, a quieter second row; their text lives in the route files
export const LEGAL_PAGES = [
  { to: "/terms", label: "terms" },
  { to: "/privacy", label: "privacy" },
  { to: "/cookies", label: "cookies" },
] as const;

// Color and underline pinned: on /editor ui-sdk's web.css styles every link
const LINK =
  "text-muted no-underline hover:text-foreground data-[status=active]:text-foreground";

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mx-auto max-w-6xl border-border border-t px-6 py-10 font-mono text-muted text-xs",
        className
      )}
    >
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <span className="flex items-center gap-2.5">
          <Logo animated={false} className="size-3 text-foreground" />
          <span>
            <span className="text-brand-500">tetra</span> · emote manager for Discord
          </span>
        </span>
        <nav aria-label="site" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {PAGES.map(({ to, label }) => (
            <Link key={to} to={to} className={LINK} activeOptions={{ exact: true }}>
              {label}
            </Link>
          ))}
          <a href={INVITE_URL} className={LINK}>
            invite
          </a>
        </nav>
      </div>
      <nav
        aria-label="legal"
        className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-end"
      >
        {LEGAL_PAGES.map(({ to, label }) => (
          <Link key={to} to={to} className={LINK}>
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
