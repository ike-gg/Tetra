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
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;
  const params: AnalyticsEvents["invite_click"] = { location };

  const plainClick =
    event.type === "click" &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented &&
    (!link.target || link.target === "_self");
  if (!plainClick) {
    // This page stays open, so the beacon gets out on its own
    gtag("event", "invite_click", { ...params, transport_type: "beacon" });
    return;
  }

  // `/invite` unloads the page at once, before gtag.js sends the hit: navigate after it
  // (Google's outbound link pattern), with a timeout for when the callback never fires
  event.preventDefault();
  const href = link.href;
  let navigated = false;
  const navigate = () => {
    if (navigated) return;
    navigated = true;
    window.location.assign(href);
  };
  window.setTimeout(navigate, 800);
  gtag("event", "invite_click", {
    ...params,
    transport_type: "beacon",
    event_callback: navigate,
  });
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
