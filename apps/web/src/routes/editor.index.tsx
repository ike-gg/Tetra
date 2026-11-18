import { createFileRoute } from "@tanstack/react-router";

import { validateOpenSearch } from "@/components/editor/editor-host";
import { EDITOR_JSON_LD, jsonLdScript, seoHead } from "@/lib/seo";

export const Route = createFileRoute("/editor/")({
  head: () => ({ ...seoHead("editor"), scripts: [jsonLdScript(EDITOR_JSON_LD)] }),
  validateSearch: validateOpenSearch,
});
