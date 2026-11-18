import { createFileRoute, Link } from "@tanstack/react-router";

import {
  LegalLink,
  LegalPage,
  type LegalSection,
  legalLinkClass,
} from "@/components/legal-page";
import { SUPPORT_SERVER_URL } from "@/lib/links";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/cookies")({
  head: () => seoHead("cookies"),
  component: CookiesPage,
});

// Bump on every change to the text below, and when a cookie or storage key changes
const UPDATED = "2026-11-18";

const SUPPORT = <LegalLink href={SUPPORT_SERVER_URL}>Tetra support server</LegalLink>;

type StorageItem = {
  name: string;
  facts: [label: string, value: string][];
};

const COOKIES: StorageItem[] = [
  {
    name: "tetra-session",
    facts: [
      ["Set by", "Tetra (first party), HTTP-only"],
      ["Category", "Strictly necessary"],
      [
        "Purpose",
        "Keeps you logged in to the panel. Holds a random session token and your Discord user ID; during login it also holds a temporary security value (the OAuth “state”) and the page to return to.",
      ],
      ["Duration", "30 days, renewed while you use the panel; removed when you log out"],
    ],
  },
  {
    name: "_ga",
    facts: [
      ["Set by", "Google Analytics"],
      ["Category", "Analytics"],
      ["Purpose", "Distinguishes visitors for usage statistics"],
      ["Duration", "Up to 2 years (Google’s default)"],
    ],
  },
  {
    name: "_ga_<ID>",
    facts: [
      ["Set by", "Google Analytics"],
      ["Category", "Analytics"],
      ["Purpose", "Keeps the state of the current visit for usage statistics"],
      ["Duration", "Up to 2 years (Google’s default)"],
    ],
  },
];

const BROWSER_STORAGE: StorageItem[] = [
  {
    name: "tetra-editor",
    facts: [
      ["Type", "IndexedDB database"],
      [
        "Purpose",
        "Your 10 most recent files in the editor, so you can reopen them. Stays on your device.",
      ],
      ["Duration", "Until you remove the files or clear your browser’s site data"],
    ],
  },
  {
    name: "tetra:editor-window",
    facts: [
      ["Type", "Local storage"],
      ["Purpose", "The position and size of the editor’s canvas window"],
      ["Duration", "Until you clear your browser’s site data"],
    ],
  },
  {
    name: "tetra:similar-dismissed:<server ID>",
    facts: [
      ["Type", "Local storage"],
      ["Purpose", "Emote name groups you dismissed in the panel’s “similar names” view"],
      ["Duration", "Until you clear your browser’s site data"],
    ],
  },
];

function StorageTable({ items }: { items: StorageItem[] }) {
  return (
    <div className="mt-4 flex flex-col gap-px border border-border bg-border">
      {items.map((item) => (
        <div key={item.name} className="bg-background p-4">
          <p className="font-mono text-foreground text-sm">{item.name}</p>
          <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[6.5rem_1fr]">
            {item.facts.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-mono text-neutral-500 text-xs leading-6">{label}</dt>
                <dd className="mb-2 leading-6 sm:mb-0">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

const SECTIONS: LegalSection[] = [
  {
    id: "what-are-cookies",
    title: "What Cookies Are",
    body: (
      <p>
        Cookies are small text files that a website stores in your browser. Websites can
        also store information in your browser in other ways, such as local storage and
        IndexedDB. This Cookie Policy explains which of these the Tetra website at
        tetra.lol (including the editor and the panel) uses and why. More about how we
        handle your data is in our{" "}
        <Link to="/privacy" className={legalLinkClass}>
          Privacy Policy
        </Link>
        .
      </p>
    ),
  },
  {
    id: "cookies-we-use",
    title: "Cookies We Use",
    body: (
      <>
        <p>
          <strong>Strictly necessary.</strong> The <code>tetra-session</code> cookie is
          set only when you log in to the panel. The panel cannot work without it.
        </p>
        <p>
          <strong>Analytics.</strong> We use Google Analytics 4 on the whole website. It
          is loaded for every visitor and may set the cookies below. Google processes the
          information they collect under its own privacy policy.
        </p>
        <StorageTable items={COOKIES} />
      </>
    ),
  },
  {
    id: "browser-storage",
    title: "Other Browser Storage",
    body: (
      <>
        <p>
          The editor and the panel store some preferences and files in your browser. This
          information stays on your device and is not sent to our servers.
        </p>
        <StorageTable items={BROWSER_STORAGE} />
      </>
    ),
  },
  {
    id: "managing-cookies",
    title: "How to Control and Delete Cookies",
    body: (
      <>
        <p>
          You can view, block and delete cookies and other site data in your browser’s
          settings, usually under privacy or site data. Blocking the{" "}
          <code>tetra-session</code> cookie means you cannot log in to the panel; the rest
          of the website keeps working.
        </p>
        <p>
          To stop Google Analytics, you can block third-party scripts or cookies in your
          browser, use a content blocker, or install Google’s{" "}
          <LegalLink href="https://tools.google.com/dlpage/gaoptout">
            Google Analytics Opt-out Browser Add-on
          </LegalLink>
          .
        </p>
        <p>
          Logging out of the panel removes the <code>tetra-session</code> cookie. Clearing
          your browser’s site data for tetra.lol removes everything listed on this page.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    body: (
      <p>
        We may update this Cookie Policy when the cookies or storage we use change. The
        date at the top of this page shows when it was last updated.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        If you have questions about cookies on tetra.lol, contact us on the {SUPPORT} or
        send us a message with the bot’s <code>/feedback</code> command.
      </p>
    ),
  },
];

function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated={UPDATED}
      intro={
        <p>
          This Cookie Policy describes the cookies and similar technologies used on
          tetra.lol and how you can control them.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
