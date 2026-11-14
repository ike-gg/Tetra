import { createFileRoute } from "@tanstack/react-router";

// The editor and its engines load with the lazy half of the route
export const Route = createFileRoute("/panel/editor/$taskId")({
  head: () => ({ meta: [{ title: "Editor · Panel · Tetra" }] }),
});
