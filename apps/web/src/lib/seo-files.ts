import { absoluteUrl, SEO_PAGES, SITE_URL } from "@/lib/seo";

// Google picks the longest matching rule, so `Allow: /panel/$` (the shell) beats
// `Disallow: /panel/`, and `/panel` and `/editor` match no Disallow at all.
export const ROBOTS_TXT = `User-agent: *
Allow: /
Allow: /panel/$
Allow: /editor/$
Disallow: /panel/
Disallow: /editor/

Sitemap: ${SITE_URL}/sitemap.xml
`;

export const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.values(SEO_PAGES)
  .map((page) => `  <url><loc>${absoluteUrl(page.path)}</loc></url>`)
  .join("\n")}
</urlset>
`;
