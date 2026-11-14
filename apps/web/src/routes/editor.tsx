import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [
      { title: "Emote editor · Tetra" },
      {
        name: "description",
        content:
          "Crop, trim and shrink a GIF under Discord's 256 KB emote limit, right in your browser.",
      },
    ],
  }),
});
