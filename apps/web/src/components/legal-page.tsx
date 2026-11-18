import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";

import { Footer, LEGAL_PAGES } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Heading } from "@/components/ui/heading";
import { cn } from "@/lib/cn";

// The shared layout of /terms, /privacy and /cookies. Their text lives in the route files;
// bump `updated` there on every change.
export type LegalSection = { id: string; title: string; body: ReactNode };

type LegalPageProps = {
  title: string;
  // ISO date (YYYY-MM-DD), shown as "November 18, 2026"
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
};

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:outline-offset-2";

// Long-form text: calmer than `foreground`, generous leading, square bullets
const PROSE = cn(
  "text-base text-neutral-300 leading-7",
  "[&_p+p]:mt-4 [&_p+ul]:mt-3 [&_ul+p]:mt-4",
  "[&_ul]:flex [&_ul]:list-[square] [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5",
  "[&_li]:pl-1 [&_li]:marker:text-neutral-500",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:font-semibold [&_h3]:text-base [&_h3]:text-foreground",
  "[&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-foreground"
);

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

export function LegalPage({ title, updated, intro, sections }: LegalPageProps) {
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pt-28 pb-24 sm:px-6">
        <nav
          aria-label="legal documents"
          className="flex select-none gap-x-5 font-mono text-muted text-xs"
        >
          {LEGAL_PAGES.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "cursor-default no-underline hover:text-foreground data-[status=active]:text-foreground",
                FOCUS
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <header className="mt-10 border-border border-b pb-8">
          <Heading level={1} size="xl">
            {title}
          </Heading>
          <p className="mt-4 font-mono text-muted text-xs">
            Last updated: <time dateTime={updated}>{formatDate(updated)}</time>
          </p>
          <div className={cn(PROSE, "mt-6")}>{intro}</div>
        </header>

        <nav
          aria-labelledby="legal-contents"
          className="mt-8 border-border border-b pb-8"
        >
          <h2
            id="legal-contents"
            className="font-mono text-muted text-xs tracking-widest"
          >
            contents
          </h2>
          <ol className="mt-4 flex flex-col gap-1.5 text-sm">
            {sections.map((section, index) => (
              <li key={section.id} className="flex gap-3">
                <span className="w-6 shrink-0 font-mono text-neutral-500 tabular-nums">
                  {index + 1}.
                </span>
                <a
                  href={`#${section.id}`}
                  className={cn(
                    "text-neutral-300 no-underline hover:text-foreground hover:underline hover:underline-offset-4",
                    FOCUS
                  )}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-12 pt-12">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="scroll-mt-24"
            >
              <div className="group flex items-baseline gap-3">
                <span
                  aria-hidden
                  className="w-6 shrink-0 font-mono text-base text-neutral-500 tabular-nums"
                >
                  {index + 1}.
                </span>
                <Heading level={2} size="md" id={`${section.id}-title`}>
                  {section.title}
                </Heading>
                {/* Outside the heading, so its label doesn't become part of the title */}
                <a
                  href={`#${section.id}`}
                  aria-label={`Link to “${section.title}”`}
                  className={cn(
                    "font-mono text-neutral-500 no-underline opacity-0 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100",
                    FOCUS
                  )}
                >
                  #
                </a>
              </div>
              <div className={cn(PROSE, "mt-4 sm:pl-9")}>{section.body}</div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// An inline link inside legal text: underlined, keeps the pointer (prose, not a control).
// For a link to another page of the site, put the class on a router `Link`.
export const legalLinkClass = cn(
  "text-foreground underline decoration-neutral-600 underline-offset-4 hover:decoration-foreground",
  FOCUS
);

export function LegalLink({ className, ...props }: ComponentProps<"a">) {
  return <a className={cn(legalLinkClass, className)} {...props} />;
}
