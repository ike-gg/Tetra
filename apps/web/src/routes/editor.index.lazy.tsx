// Loaded here too, not only in the editor, so the drop zone looks the same before and
// after a file has been opened (web.css is global once loaded)
import "@/styles/ui-sdk.css";

import { createLazyFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { BrandLink } from "@/components/brand-link";
import { EditorStart } from "@/components/editor/editor-start";
import { Footer } from "@/components/footer";
import { Accent } from "@/components/ui/accent";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export const Route = createLazyFileRoute("/editor/")({
  component: EditorStartPage,
});

const STEPS = [
  {
    title: "open a file",
    body: "drop a GIF, PNG, JPEG or WebP anywhere on the page, paste it or pick it. up to 20 MB",
  },
  {
    title: "crop, trim and resize",
    body: "pick the part you want, cut the clip to the frames that matter and set the size. the preview shows the real result next to the original",
  },
  {
    title: "make it fit",
    body: "turn on Discord emote and a meter shows the size against 256 KB. fit automatically raises compression and lowers the frame rate, colors and size until it fits",
  },
  {
    title: "download it",
    body: "save it as GIF, PNG, WebP or JPEG. logged in to the panel, you can add it to a server straight from the editor",
  },
];

const FAQ: { question: string; answer: ReactNode }[] = [
  {
    question: "why is my GIF too big for a Discord emote?",
    answer:
      "Discord takes emote files up to 256 KB. a GIF stores every frame as its own picture, so a long clip, a big size or a lot of colors adds up fast",
  },
  {
    question: "what size should a Discord emote be?",
    answer:
      "the file has to be 256 KB or less. in chat Discord shows emotes at 22 px next to text and 48 px when an emote is sent alone, so a big picture adds weight you never see. the tetra bot makes emotes 128 px on the longest side, which is plenty",
  },
  {
    question: "how do i make a GIF smaller without losing much quality?",
    answer:
      "crop to the part that matters, trim the clip to the frames you need, lower the size, then the frame rate. each of these cuts bytes without touching what's left. fewer colors and more compression save a lot too, but they show sooner. fit automatically finds settings that fit for you",
  },
  {
    question: "is my file uploaded anywhere?",
    answer:
      "no. the editor runs in your browser and the file stays on your device. your last 10 files are kept in this browser's storage so you can come back to them. nothing leaves unless you add the result to a server yourself",
  },
  {
    question: "is it free? do i need an account?",
    answer:
      "it's free and there's no account. open the page and drop a file. you only log in if you want to add the result to a server",
  },
  {
    question: "does it work for images too?",
    answer:
      "yes. PNG, JPEG and WebP work the same way: crop, resize and compress, then save as PNG, WebP or JPEG. animated WebP and APNG open as their first frame",
  },
];

// Public and account-free: files are processed locally and never uploaded
function EditorStartPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-12 shrink-0 select-none items-center gap-2 border-border border-b px-4 text-sm">
        <BrandLink />
        <span className="text-neutral-600">/</span>
        <span className="font-medium">editor</span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pt-16 pb-12">
        <div className="flex flex-col gap-4">
          <Eyebrow>image/gif quick editor</Eyebrow>
          <Heading level={1} size="lg">
            make any GIF <Accent>fit</Accent> Discord&apos;s 256 KB emote limit
          </Heading>
          <Text tone="muted">
            crop, trim, resize and compress GIFs and images, then download them in the
            format you need. made for emotes, works for anything. it all runs in your
            browser: the file never leaves your device and you don&apos;t need an account
          </Text>
        </div>

        <EditorStart host="public" />

        <EditorGuide />
      </main>

      <Footer className="mt-auto w-full" />
    </div>
  );
}

// Prerendered for search: how the editor works and the questions people search for
function EditorGuide() {
  return (
    <div className="mt-16 flex flex-col gap-16 border-border border-t pt-16">
      <section aria-labelledby="editor-how" className="flex flex-col gap-8">
        <Heading id="editor-how" level={2} size="md">
          how it works
        </Heading>
        <ol className="flex flex-col gap-6">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="font-mono text-primary text-sm leading-6">
                0{index + 1}
              </span>
              <div>
                <Heading level={3} size="sm" className="text-base">
                  {step.title}
                </Heading>
                <Text tone="muted" className="mt-1">
                  {step.body}
                </Text>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="editor-faq" className="flex flex-col gap-8">
        <Heading id="editor-faq" level={2} size="md">
          questions
        </Heading>
        <div className="flex flex-col gap-8">
          {FAQ.map((item) => (
            <div key={item.question}>
              <Heading level={3} size="sm" className="text-base">
                {item.question}
              </Heading>
              <Text tone="muted" className="mt-2">
                {item.answer}
              </Text>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
