import { Link } from "@tanstack/react-router";
import { useLayoutEffect, useState } from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { INVITE_URL } from "@/lib/links";

const LINKS = [
  { to: "/editor", label: "editor" },
  { to: "/panel", label: "panel" },
] as const;

// The logo's drop plays once per page load: a refresh replays it, moving between pages
// in the app doesn't. Module state, because the navbar remounts with every route (and
// twice on a dev load).
let introPlayed = false;

function useLogoIntro() {
  const [animated, setAnimated] = useState(true);

  // Layout effect: decides before the first paint, so a later mount never flashes the
  // empty frame of the intro
  useLayoutEffect(() => {
    if (introPlayed) setAnimated(false);
    // Marked on the next frame: a double mount in the same commit still gets the intro
    const frame = requestAnimationFrame(() => {
      introPlayed = true;
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return animated;
}

// No background: a soft fade of the page color behind it keeps it readable over the
// emote field without drawing a bar edge
// The logo links home, so a click on another page remounts the navbar on the new route;
// the click is carried over so that navbar plays the drop. Time-boxed, so a click that
// stayed on the same page doesn't replay the logo on some later navigation.
const CARRY_REPLAY_MS = 2000;
let replayClickedAt = Number.NEGATIVE_INFINITY;

const takeCarriedReplay = () => {
  const carried = performance.now() - replayClickedAt < CARRY_REPLAY_MS;
  replayClickedAt = Number.NEGATIVE_INFINITY;
  return carried ? 1 : 0;
};

type NavbarProps = {
  className?: string;
  // Off on pages where the logo shouldn't compete with their own intro (the homepage)
  logoIntro?: boolean;
};

export function Navbar({ className, logoIntro = true }: NavbarProps) {
  const intro = useLogoIntro();
  // Clicking the logo replays the drop, whether or not it played on load: each click
  // remounts the logo with a new key, so a click mid-drop starts it over
  const [replays, setReplays] = useState(takeCarriedReplay);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -bottom-8 bg-linear-to-b from-background/90 via-background/50 to-transparent"
      />
      <nav className="relative mx-auto flex h-14 max-w-6xl select-none items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          to="/"
          aria-label="tetra home"
          onClick={() => {
            replayClickedAt = performance.now();
            setReplays((count) => count + 1);
          }}
          className="flex cursor-default items-center gap-2.5 text-foreground focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:outline-offset-4"
        >
          <Logo
            key={replays}
            animated={replays > 0 || (logoIntro && intro)}
            className="size-5"
          />
          <span aria-hidden className="font-mono text-sm">
            tetra
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="hidden h-8 cursor-default items-center px-3 text-muted text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-300 data-[status=active]:text-foreground sm:inline-flex"
            >
              {label}
            </Link>
          ))}
          <Button size="sm" className="ml-2" render={<a href={INVITE_URL} />}>
            add to discord
          </Button>
        </div>
      </nav>
    </header>
  );
}
