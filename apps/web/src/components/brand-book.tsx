import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/cn";

// The brand book's chapters, in reading order. /branding is the cover and contents; every
// chapter links back to it with `ChapterCrumb`. A new brand page goes here, gets a face on
// the cube (brand-cube.tsx) or a plain one, and its path in staticPages and the Caddyfile
// redirects if it moved.
export const BRAND_CHAPTERS = [
  {
    id: "guide",
    to: "/branding/guide",
    title: "guide",
    description: "principles, color, type, shape, ASCII, motion and every component",
  },
  {
    id: "logo",
    to: "/branding/logo",
    title: "logo",
    description: "a plain square that emotes fall into, one by one",
  },
  {
    id: "static-logo",
    to: "/branding/static-logo",
    title: "static logo",
    description: "the frozen mark for icons and avatars: a dense square on an ASCII wall",
  },
  {
    id: "feedback",
    to: "/branding/feedback",
    title: "feedback emotes",
    description: "one ASCII pictogram for every kind of bot reply",
  },
] as const;

export type BrandChapter = (typeof BRAND_CHAPTERS)[number];
export type BrandChapterId = BrandChapter["id"];

export const chapterIndex = (id: BrandChapterId) =>
  String(BRAND_CHAPTERS.findIndex((chapter) => chapter.id === id) + 1).padStart(2, "0");

// The way back to the book, the first line of every chapter
export function ChapterCrumb({
  chapter,
  className,
}: {
  chapter: BrandChapterId;
  className?: string;
}) {
  const { title } = BRAND_CHAPTERS.find(({ id }) => id === chapter) ?? BRAND_CHAPTERS[0];
  return (
    <nav
      aria-label="Brand book"
      className={cn("font-mono text-muted text-xs tracking-widest", className)}
    >
      <Link
        to="/branding"
        className="cursor-default text-muted no-underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:outline-offset-2"
      >
        <span aria-hidden>← </span>brand book
      </Link>
      <span aria-hidden> / </span>
      <span aria-current="page" className="text-foreground">
        [{chapterIndex(chapter)}] {title}
      </span>
    </nav>
  );
}
