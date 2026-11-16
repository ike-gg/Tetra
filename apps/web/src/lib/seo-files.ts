import { absoluteUrl, SEO_PAGES, SITE_NAME, SITE_URL } from "@/lib/seo";

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

// A plain-text map of the site for AI assistants (llmstxt.org). Built from SEO_PAGES, so it
// only says what the pages' own descriptions say
export const LLMS_TXT = `# ${SITE_NAME}

> ${SEO_PAGES.home.description}

tetra is a Discord bot with a web panel and a free browser editor. emotes are added with the \`/addemote\` command or from the panel.

## Pages

${Object.values(SEO_PAGES)
  .map((page) => `- [${page.title}](${absoluteUrl(page.path)}): ${page.description}`)
  .join("\n")}
`;
