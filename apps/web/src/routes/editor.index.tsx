import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/editor/")({
  head: () => ({
    meta: [
      { title: "Image/GIF quick editor · Tetra" },
      {
        name: "description",
        content:
          "Crop, trim, resize and compress GIFs and images right in your browser. Made to fit Discord's 256 KB emote limit, works for anything.",
      },
    ],
  }),
});
