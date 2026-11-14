import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";

// The start of an app header's breadcrumb: the resting mark and the wordmark, linking
// home. Static on purpose: the drop belongs to the site's navbar, not to app chrome.
export function BrandLink() {
  return (
    <Link
      to="/"
      className="flex cursor-default items-center gap-2 font-mono text-primary no-underline hover:text-primary-hover"
    >
      <Logo animated={false} className="size-3.5 text-foreground" />
      tetra
    </Link>
  );
}
