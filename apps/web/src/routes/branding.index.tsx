import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import {
  BRAND_CHAPTERS,
  type BrandChapterId,
  chapterIndex,
} from "@/components/brand-book";
import { BrandCube } from "@/components/brand-cube";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Accent } from "@/components/ui/accent";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/branding/")({
  head: () => seoHead("branding"),
  component: BrandBookPage,
});

// Cut to the row by overflow: a printed contents page's dotted leader, in ASCII
const LEADER = " .".repeat(120);

function BrandBookPage() {
  const [focus, setFocus] = useState<BrandChapterId | null>(null);
  const navigate = useNavigate();
  const open = useCallback(
    (chapter: BrandChapterId) => {
      const target = BRAND_CHAPTERS.find(({ id }) => id === chapter);
      if (target) void navigate({ to: target.to });
    },
    [navigate]
  );

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <header className="grid items-center gap-8 pt-28 pb-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
          <div className="flex flex-col gap-6">
            <Eyebrow>branding</Eyebrow>
            <Heading level={1} size="xl">
              the tetra <Accent>book</Accent>
            </Heading>
            <Text size="lg" tone="muted" className="max-w-xl">
              how tetra looks, one chapter at a time. every face of the cube is a chapter:
              drag it around, or pick one below
            </Text>
          </div>
          <BrandCube
            focus={focus}
            onOpen={open}
            className="mx-auto max-w-[26rem] lg:mr-0"
          />
        </header>

        <nav aria-labelledby="brand-book-contents" className="flex flex-col gap-4">
          <h2
            id="brand-book-contents"
            className="font-mono font-normal text-muted text-xs tracking-widest"
          >
            contents
          </h2>
          <ol className="flex flex-col gap-px border-border border-y bg-border">
            {BRAND_CHAPTERS.map((chapter) => (
              <li key={chapter.id} className="flex">
                <Link
                  to={chapter.to}
                  onPointerEnter={() => setFocus(chapter.id)}
                  onPointerLeave={() => setFocus(null)}
                  onFocus={() => setFocus(chapter.id)}
                  onBlur={() => setFocus(null)}
                  className="group grid w-full min-w-0 cursor-default select-none grid-cols-[2.75rem_minmax(0,1fr)] items-baseline gap-y-1 bg-background px-4 py-5 text-foreground no-underline hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2 active:bg-neutral-800 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:px-6"
                >
                  <span className="font-mono text-muted text-xs tabular-nums group-hover:text-foreground">
                    [{chapterIndex(chapter.id)}]
                  </span>
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="shrink-0 font-medium text-lg sm:text-xl">
                      {chapter.title}
                    </span>
                    <span
                      aria-hidden
                      className="min-w-0 flex-1 overflow-hidden whitespace-pre font-mono text-neutral-700 text-xs group-hover:text-muted"
                    >
                      {LEADER}
                    </span>
                    <span className="hidden shrink-0 font-mono text-muted text-xs sm:inline">
                      {chapter.to}
                    </span>
                  </span>
                  <span className="col-start-2 text-muted text-sm">
                    {chapter.description}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
