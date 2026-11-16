// Read by the route heads and by scripts/build-seo.tsx (robots.txt, sitemap.xml, OG images)
export const SITE_URL: string = (
  import.meta.env.VITE_SITE_URL || "https://tetra.lol"
).replace(/\/+$/, "");

export const SITE_NAME = "tetra";

type SeoPage = {
  path: string;
  title: string;
  description: string;
  // Drawn on the OG image: the heading, with an optional serif accent after it
  og: { eyebrow: string; heading: string; accent?: string };
};

// Every indexable page: listed in sitemap.xml and given an OG image at /og/<key>.png
export const SEO_PAGES = {
  home: {
    path: "/",
    title: "tetra",
    description:
      "add emotes from 7TV, BTTV, FFZ or any link to your Discord server. tetra shrinks them to fit Discord's 256 KB limit",
    og: { eyebrow: "discord bot", heading: "add any emote.", accent: "that's it" },
  },
  editor: {
    path: "/editor",
    title: "Discord emote resizer and GIF compressor · 256 KB limit · tetra",
    description:
      "crop, trim, resize and compress GIFs and images to fit Discord's 256 KB emote limit. free, right in your browser, no account and no upload",
    og: { eyebrow: "editor", heading: "make any GIF", accent: "fit" },
  },
  branding: {
    path: "/branding",
    title: "branding · tetra",
    description:
      "how tetra looks and talks: colors, type, square shapes, ASCII accents, motion, voice and every UI component",
    og: { eyebrow: "branding", heading: "square, dark and", accent: "orange" },
  },
  logo: {
    path: "/logo",
    title: "logo · tetra",
    description: "the tetra mark: a plain square that emotes fall into, one by one",
    og: { eyebrow: "logo", heading: "a square full of", accent: "emotes" },
  },
  panel: {
    path: "/panel",
    title: "panel · tetra",
    description:
      "manage your servers' emotes in the browser: add them from 7TV and FFZ, restore removed ones, fix the ones that didn't fit",
    og: { eyebrow: "panel", heading: "your emotes,", accent: "one panel" },
  },
} satisfies Record<string, SeoPage>;

export type SeoPageKey = keyof typeof SEO_PAGES;

export const absoluteUrl = (path: string) => `${SITE_URL}${path === "/" ? "/" : path}`;

export const ogImagePath = (key: SeoPageKey) => `/og/${key}.png`;

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

// Canonical, description, Open Graph and Twitter card for an indexable page
export function seoHead(key: SeoPageKey) {
  const page: SeoPage = SEO_PAGES[key];
  const url = absoluteUrl(page.path);
  const image = absoluteUrl(ogImagePath(key));

  return {
    meta: [
      { title: page.title },
      { name: "description", content: page.description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:url", content: url },
      { property: "og:title", content: page.title },
      { property: "og:description", content: page.description },
      { property: "og:image", content: image },
      { property: "og:image:width", content: String(OG_IMAGE_SIZE.width) },
      { property: "og:image:height", content: String(OG_IMAGE_SIZE.height) },
      {
        property: "og:image:alt",
        content: `${page.og.heading} ${page.og.accent ?? ""}`.trim(),
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: page.title },
      { name: "twitter:description", content: page.description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

// schema.org data for a page, rendered as a JSON-LD script in its head. `<` is escaped so
// no string in the data can close the script tag.
export function jsonLdScript(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export const EDITOR_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "tetra editor",
  url: absoluteUrl(SEO_PAGES.editor.path),
  description: SEO_PAGES.editor.description,
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and WebAssembly",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "crop GIFs and images",
    "trim GIFs",
    "resize GIFs and images",
    "compress GIFs to fit Discord's 256 KB emote limit",
    "export GIF, PNG, WebP or JPEG",
    "runs in the browser, files are never uploaded",
  ],
};

// For pages that must stay out of search. Head meta merges by name with the deepest route
// winning, so put it on leaf routes only: on a layout it would reach every child.
export const NOINDEX_META = { name: "robots", content: "noindex" } as const;
