import { createFileRoute, Link } from "@tanstack/react-router";

import {
  LegalLink,
  LegalPage,
  type LegalSection,
  legalLinkClass,
} from "@/components/legal-page";
import { SUPPORT_SERVER_URL } from "@/lib/links";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
  head: () => seoHead("terms"),
  component: TermsPage,
});

// Bump on every change to the text below
const UPDATED = "2026-11-18";

const SUPPORT = <LegalLink href={SUPPORT_SERVER_URL}>Tetra support server</LegalLink>;

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of the Terms",
    body: (
      <>
        <p>
          These Terms of Service (the “Terms”) govern your access to and use of Tetra, a
          Discord application for managing emotes, including the Tetra bot on Discord, the
          website at tetra.lol (including the editor and the panel) and the API that
          serves them (together, the “Service”). The Service is developed and operated by
          ike (“we”, “us”, “our”).
        </p>
        <p>
          By adding Tetra to a Discord server, using any of its commands, logging in to
          the panel or otherwise using the Service, you confirm that you have read,
          understood and accepted these Terms and our{" "}
          <Link to="/privacy" className={legalLinkClass}>
            Privacy Policy
          </Link>
          . If you do not agree with these Terms, you must not use the Service or add
          Tetra to any server.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: (
      <p>
        You must be at least 13 years old, or older if the law of your country requires a
        higher minimum age to use the Service or Discord. By using the Service you confirm
        that you meet this requirement and that you are allowed to use Discord under
        Discord’s own terms.
      </p>
    ),
  },
  {
    id: "open-source",
    title: "Open Source and Self-Hosted Instances",
    body: (
      <p>
        The source code of Tetra is available under the MIT License. That license governs
        the use of the code. These Terms govern only the hosted Service operated by us:
        the Tetra bot on Discord, the website at tetra.lol and its API. Instances of Tetra
        hosted by anyone else are run by their own operators, who are solely responsible
        for them, and these Terms and our Privacy Policy do not apply to them.
      </p>
    ),
  },
  {
    id: "server-administrators",
    title: "Server Administrators",
    body: (
      <p>
        If you add Tetra to a Discord server, you accept these Terms on behalf of that
        server and you are responsible for informing its members that Tetra is used there
        and where these Terms and the Privacy Policy can be found. You are also
        responsible for how the Service is configured and used on your server, including
        the permissions you grant to Tetra and features such as the 7TV channel sync.
      </p>
    ),
  },
  {
    id: "user-content",
    title: "Your Content and Responsibility",
    body: (
      <>
        <p>
          The Service is a tool. It lets you find, add, edit, upload and download emotes,
          images and other media (“Content”), including emotes from 7TV, BetterTTV,
          FrankerFaceZ and Twitch, files from links you provide, and media downloaded with
          the <code>/media</code> command from social platforms.
        </p>
        <p>
          You are solely responsible for any Content you add, edit, upload or download
          through the Service and for how you use it. By using the Service you confirm
          that:
        </p>
        <ul>
          <li>
            you hold, or have permission to use, all rights in the Content that your use
            requires;
          </li>
          <li>
            your use of the Content complies with Discord’s Terms of Service and Community
            Guidelines and with the terms of the platform the Content comes from; and
          </li>
          <li>
            the Content does not infringe the rights of any third party and does not
            violate any applicable law.
          </li>
        </ul>
        <p>
          We do not claim ownership of your Content. Emotes, images and media remain the
          property of their respective owners. We do not review Content before it is
          processed and are not responsible for it.
        </p>
        <p>
          If you are a rights holder and believe that the Service is being used to
          infringe your rights, please report it on the {SUPPORT}, including enough
          information for us to identify the Content and the server where it is used.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    body: (
      <>
        <p>You must not use the Service:</p>
        <ul>
          <li>in violation of Discord’s Terms of Service or Community Guidelines;</li>
          <li>for any illegal purpose or in violation of any applicable law;</li>
          <li>to infringe the intellectual property or other rights of others;</li>
          <li>
            to interfere with, disrupt, overload or attempt to gain unauthorized access to
            the Service, its infrastructure or other users’ data; or
          </li>
          <li>
            to circumvent rate limits, queues or other technical limits of the Service.
          </li>
        </ul>
        <p>
          We do our best to prevent such activities while providing the best possible
          experience. If you find people or communities using Tetra against Discord’s
          Terms of Service or for illegal activities, please report it to us on the{" "}
          {SUPPORT}.
        </p>
      </>
    ),
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    body: (
      <p>
        The Service relies on and links to services operated by third parties, including
        Discord, Twitch, 7TV, BetterTTV, FrankerFaceZ and the social platforms supported
        by <code>/media</code>. Your use of those services is governed by their own terms
        and policies. We do not control them and are not responsible for their content,
        availability or practices.
      </p>
    ),
  },
  {
    id: "paid-features",
    title: "Paid Features and Donations",
    body: (
      <>
        <p>
          Tetra may offer optional paid features. These are sold through Discord’s own
          monetization (Premium Apps, including app subscriptions and one-time products).
          Purchases, billing, cancellations and refunds are governed by Discord’s terms
          and are handled entirely by Discord. We receive from Discord only the
          entitlement information needed to provide the feature (which user or server has
          which product), never your payment details.
        </p>
        <p>
          You may also support Tetra with a voluntary donation through a third-party
          donation platform. Donations are voluntary, are non-refundable except where
          required by law, and do not purchase any product, feature or level of service.
          The donation platform processes your payment and payment data under its own
          terms and privacy policy.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and Changes to the Service",
    body: (
      <>
        <p>
          The Service is provided free of charge except for optional paid features. There
          is no guarantee that it will be available at any particular time or that it will
          continue to be available in the future. We may change, suspend or discontinue
          the Service, or any of its features, at any time and without notice.
        </p>
        <p>
          We may restrict, suspend or revoke access to all or specific features of the
          Service for any user or server at any time, in particular where we believe these
          Terms have been violated.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Ending Your Use",
    body: (
      <p>
        You may stop using the Service at any time by removing Tetra from your servers,
        logging out of the panel and revoking Tetra’s access in Discord under User
        Settings → Authorized Apps. How to request deletion of data we hold about you is
        described in our{" "}
        <Link to="/privacy" hash="your-rights" className={legalLinkClass}>
          Privacy Policy
        </Link>
        .
      </p>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimer of Warranties",
    body: (
      <p>
        To the fullest extent permitted by law, the Service is provided “as is” and “as
        available”, without warranties of any kind, whether express or implied, including
        any implied warranties of merchantability, fitness for a particular purpose, title
        and non-infringement. We do not warrant that the Service will be uninterrupted,
        secure or error-free, that results such as optimized emotes or downloaded media
        will meet your expectations, or that any data will be preserved.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    body: (
      <>
        <p>
          To the fullest extent permitted by law, we shall not be liable for any indirect,
          incidental, special, consequential or punitive damages, or for any loss of data,
          content, profits or goodwill, arising out of or in connection with your use of,
          or inability to use, the Service, even if we have been advised of the
          possibility of such damages.
        </p>
        <p>
          Nothing in these Terms excludes or limits any liability that cannot be excluded
          or limited under applicable law.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    body: (
      <p>
        We may update these Terms from time to time. The date at the top of this page
        shows when they were last updated. Material changes will be announced on the{" "}
        {SUPPORT}. By continuing to use the Service after changes take effect, you accept
        the updated Terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        If you have questions about these Terms, contact us on the {SUPPORT} or send us a
        message with the bot’s <code>/feedback</code> command.
      </p>
    ),
  },
];

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={UPDATED}
      intro={
        <p>
          Please read these Terms carefully. They explain the rules for using Tetra and
          what you can expect from us.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
