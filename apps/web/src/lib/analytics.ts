import type { EmoteSource } from "@/lib/emote";

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || undefined;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * gtag.js for the root `head()`, so it lands in every prerendered page and in `_shell.html`.
 * Empty without `VITE_GA_MEASUREMENT_ID`. Page views come from GA4's enhanced measurement
 * (history changes), so routes never send `page_view` themselves.
 */
export const analyticsScripts = GA_ID
  ? [
      {
        src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`,
        async: true,
      },
      {
        children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config",${JSON.stringify(GA_ID).replace(/</g, "\\u003c")});`,
      },
    ]
  : [];

type AnalyticsEvents = {
  invite_click: { location: string };
  emote_add: { source: EmoteSource | "file" | "task" };
  panel_login: undefined;
};

/** Sends a GA4 event; does nothing when GA isn't loaded (no ID, prerender, blocked). */
export function track<E extends keyof AnalyticsEvents>(
  event: E,
  ...[params]: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}

const INVITE_PATH = "/invite";

// `/invite` is a Caddy redirect GA never sees, so clicks are caught once for every link
function onInviteClick(event: MouseEvent) {
  if (event.type === "auxclick" && event.button !== 1) return;
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!link) return;
  const url = new URL(link.href, window.location.href);
  if (url.pathname !== INVITE_PATH) return;
  const location =
    link.closest<HTMLElement>("[data-track-location]")?.dataset.trackLocation ??
    (["footer", "nav", "header"].find((tag) => link.closest(tag)) || "page");
  track("invite_click", { location });
}

/** Starts the invite click listener (an effect: returns its cleanup). No-op without GA. */
export function listenForInviteClicks() {
  if (!GA_ID) return;
  // Capture: a link's own handler can't stop it; auxclick covers middle-click new tabs
  document.addEventListener("click", onInviteClick, true);
  document.addEventListener("auxclick", onInviteClick, true);
  return () => {
    document.removeEventListener("click", onInviteClick, true);
    document.removeEventListener("auxclick", onInviteClick, true);
  };
}
