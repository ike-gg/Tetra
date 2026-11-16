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
  { to: "/branding/logo", label: "logo" },
] as const;

// Color and underline pinned: on /editor ui-sdk's web.css styles every link
const LINK =
  "text-muted no-underline hover:text-foreground data-[status=active]:text-foreground";

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 border-border border-t px-6 py-10 font-mono text-muted text-xs sm:flex-row",
        className
      )}
    >
      <span className="flex items-center gap-2.5">
        <Logo animated={false} className="size-3 text-foreground" />
        <span>
          <span className="text-brand-500">tetra</span> · emote manager for Discord
        </span>
      </span>
      <nav aria-label="Site" className="flex flex-wrap justify-center gap-x-6 gap-y-2">
        {PAGES.map(({ to, label }) => (
          <Link key={to} to={to} className={LINK} activeOptions={{ exact: true }}>
            {label}
          </Link>
        ))}
        <a href={INVITE_URL} className={LINK}>
          invite
        </a>
      </nav>
    </footer>
  );
}
