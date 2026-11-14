import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const staticPages = ["/", "/branding", "/editor", "/logo", "/static-logo"];
// Server routes (src/routes/robots[.]txt.ts, sitemap[.]xml.ts), prerendered to plain files
const staticFiles = ["/robots.txt", "/sitemap.xml"];

export default defineConfig({
  server: {
    port: 3000,
  },
  // The prerender step fetches from this server on 127.0.0.1; in Docker `localhost`
  // resolved to ::1 and every request was refused
  preview: {
    host: "127.0.0.1",
  },
  resolve: {
    tsconfigPaths: true,
  },
  // The image worker lazy-loads its wasm codecs, which needs ES module workers
  worker: {
    format: "es",
  },
  // Pre-bundling moves jSquash away from its .wasm files and breaks their
  // `new URL(..., import.meta.url)` lookups in dev
  optimizeDeps: {
    exclude: [
      "@jsquash/jpeg",
      "@jsquash/oxipng",
      "@jsquash/png",
      "@jsquash/resize",
      "@jsquash/webp",
    ],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        maskPath: "/panel",
      },
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
      },
      pages: [
        ...staticPages.map((path) => ({
          path,
          prerender: {
            enabled: true,
            outputPath: `${path.replace(/\/$/, "")}/index.html`,
          },
        })),
        ...staticFiles.map((path) => ({
          path,
          prerender: { enabled: true, outputPath: path },
        })),
        // Served by Caddy with status 404 for unknown paths
        { path: "/404", prerender: { enabled: true, outputPath: "/404.html" } },
      ],
    }),
    viteReact(),
  ],
});
