import { createFileRoute, Link } from "@tanstack/react-router";

import {
  LegalLink,
  LegalPage,
  type LegalSection,
  legalLinkClass,
} from "@/components/legal-page";
import { SUPPORT_SERVER_URL } from "@/lib/links";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
  head: () => seoHead("privacy"),
  component: PrivacyPage,
});

// Bump on every change to the text below. Update this policy whenever core changes what it
// collects, how long it keeps it or which third parties receive it.
const UPDATED = "2026-11-18";

const SUPPORT = <LegalLink href={SUPPORT_SERVER_URL}>Tetra support server</LegalLink>;

const COOKIES = (
  <Link to="/cookies" className={legalLinkClass}>
    Cookie Policy
  </Link>
);

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who We Are",
    body: (
      <>
        <p>
          Tetra (the “Service”) is a Discord application for managing emotes. It consists
          of the Tetra bot on Discord, the website at tetra.lol (including the editor and
          the panel) and the API that serves them. The Service is developed and operated
          by ike (“we”, “us”, “our”), who is responsible for the processing of personal
          data described in this Privacy Policy.
        </p>
        <p>
          You can contact us on the {SUPPORT} or with the bot’s <code>/feedback</code>{" "}
          command.
        </p>
      </>
    ),
  },
  {
    id: "scope",
    title: "Scope of This Policy",
    body: (
      <p>
        This policy applies to the hosted Service operated by us. It does not apply to
        Discord itself, which processes your data under its own privacy policy, to other
        third-party services linked from the Service, or to instances of Tetra hosted by
        anyone else from its open-source code; those are run by their own operators.
      </p>
    ),
  },
  {
    id: "data-we-process",
    title: "Information We Collect and How We Use It",
    body: (
      <>
        <p>
          We collect only what the Service needs to work, to stay secure and to be
          improved. Depending on which features you use, we process the following
          information.
        </p>

        <h3>Bot commands</h3>
        <p>
          Each time you use a Tetra command on Discord, we record the interaction ID, the
          command name, the arguments and options you entered (which may include links,
          names, search terms and other text you typed), your Discord user ID, the ID of
          the server where the command was used and the time. We use this command log for
          usage statistics, to prevent and investigate abuse, and to find and fix errors.
          Aggregated command statistics, which do not identify individual users, may be
          shown publicly, for example on the support server or the website. The command
          log is kept indefinitely, until it is deleted at your request.
        </p>
        <p>
          While you interact with a bot reply (for example by picking an emote from a list
          of search results), the state of that menu is stored temporarily. Search results
          behind such menus are kept for up to 6 hours and other menu state for up to 24
          hours, after which they are deleted automatically.
        </p>

        <h3>Panel login and sessions</h3>
        <p>
          When you log in to the panel with Discord, Discord asks you to authorize Tetra
          with the scopes <code>identify</code> (your account’s basic profile),{" "}
          <code>guilds</code> (the list of servers you are in) and{" "}
          <code>guilds.members.read</code> (your membership details in those servers). We
          store your Discord user ID and the OAuth access and refresh tokens that Discord
          issues, together with their expiry. The tokens are encrypted at rest
          (AES-256-GCM) and are used only to show you your servers and to act on your
          behalf in the panel.
        </p>
        <p>
          Your profile (such as your username and avatar) and your server list are fetched
          from Discord when the panel needs them and are not stored permanently. The
          server list (each server’s ID, name, icon, whether you own it and your
          permissions there) is cached for 60 seconds.
        </p>
        <p>
          When you log in, we create a session: a random token stored in our database and
          in the <code>tetra-session</code> cookie (see our {COOKIES}). A session ends
          when you log out or after 30 days without use; expired sessions are deleted
          automatically within an hour. Your user record (Discord user ID and encrypted
          tokens) is kept until it is deleted at your request.
        </p>

        <h3>Adding emotes</h3>
        <p>
          While an emote is being added or optimized, its processing state is kept in a
          temporary store and expires 15 minutes after its last change; the image files
          are kept in temporary storage for the same time and then deleted. The finished
          emote is uploaded to Discord, where it is governed by Discord’s policies.
        </p>

        <h3>Editor tasks</h3>
        <p>
          When you choose “open in editor” in the bot, we store a task with the server ID,
          your Discord user ID, the channel and message ID of the bot reply and the
          address of the source emote file, so that you can finish the edit in the panel.
          Tasks are kept for at most 14 days, and at most 20 per user (a new task replaces
          your oldest).
        </p>

        <h3>Removed emotes</h3>
        <p>
          While Tetra is on a server, we record emotes that are removed from it, so that
          they can be restored from the panel: the server ID, the emote’s name, Discord ID
          and image address, and whether it was removed through the panel. Records are
          kept for at most 14 days, and at most 250 per server.
        </p>

        <h3>7TV channel sync</h3>
        <p>
          If a server administrator links a Twitch channel to keep the server’s emotes in
          sync with its 7TV emote set, we store for that server: the Twitch channel’s ID,
          login and display name, the 7TV user and emote set IDs, the sync settings, the
          Discord user ID of the person who linked it, the links between 7TV emotes and
          the server’s emotes, a review list of emotes that were not added automatically
          (including each emote’s name, file address, size and the 7TV author’s name) and
          an activity log. The activity log keeps at most the newest 200 entries of the
          last 30 days. All of this is kept while the sync is linked and is deleted when
          the sync is unlinked.
        </p>

        <h3>Lookups and searches</h3>
        <p>
          When you look up an emote link or search for a Twitch channel, our servers query
          the relevant provider and cache the result for between 5 minutes and 1 hour. The
          cache is keyed by a hash of the input and does not contain your user ID.
        </p>

        <h3>Media downloads</h3>
        <p>
          When you use <code>/media</code>, our servers fetch the link you provide from
          the source platform. Downloaded files are stored temporarily, uploaded to
          Discord as the bot’s reply (together with details of the post such as its
          caption and author) and then deleted from our servers. To allow only one
          download per user at a time, a queue entry containing your Discord user ID is
          kept for a few seconds while your request is active.
        </p>

        <h3>Feedback and error reports</h3>
        <p>
          If you send feedback with <code>/feedback</code>, your message is posted to a
          private channel on the Tetra Discord server together with your Discord username,
          user ID and avatar, the name and ID of the server where you used the command,
          and the time. If you choose to send an error report from a bot reply, we post
          the error message and code, the command name and interaction ID, your Discord
          username, user ID and avatar, and the server’s name, ID, icon and member count
          to a private channel in the same way. These messages are kept until they are
          deleted at your request.
        </p>

        <h3>Server logs</h3>
        <p>
          Our servers write operational logs, which include a line for each bot command
          (the command, the interaction ID, your Discord username and user ID, and the
          server’s name and ID) and error messages with an error code and time. Session
          values and OAuth tokens are never logged. Logs are used to operate and debug the
          Service and are kept only for a limited period.
        </p>

        <h3>The editor and your browser</h3>
        <p>
          The public editor at tetra.lol/editor processes your files entirely in your
          browser. Your files are not uploaded to our servers, unless you choose to add
          the result to a server through the panel, in which case the file is sent to our
          API and uploaded to Discord. Your recent files are kept in your browser’s local
          storage on your device only; see our {COOKIES}.
        </p>
        <p>
          The website and the panel load emote images and catalog data directly from the
          providers’ servers (7TV, BetterTTV, FrankerFaceZ, Twitch and Discord’s CDN).
          These providers therefore receive your IP address and standard browser
          information when those images or data are loaded.
        </p>

        <h3>Analytics</h3>
        <p>
          We use Google Analytics 4 on the whole website, including the editor and the
          panel, to understand how the website is used. It is loaded for every visitor.
          Google Analytics records page views (the address of the page, which in the panel
          may include a server ID or a search term), the events we send (clicks on the
          invite link and on the panel login button, and emotes added in the panel
          together with their source type) and, through its enhanced measurement,
          interactions such as scrolling and outbound link clicks. Google may set cookies
          and process your IP address and information about your device and browser under
          its own privacy policy. We do not send your Discord user ID or other account
          details to Google.
        </p>
        <p>
          You can prevent this by blocking cookies or scripts in your browser, using a
          content blocker, or installing Google’s{" "}
          <LegalLink href="https://tools.google.com/dlpage/gaoptout">
            Google Analytics Opt-out Browser Add-on
          </LegalLink>
          .
        </p>

        <h3>Paid features and donations</h3>
        <p>
          If optional paid features are offered, they are sold through Discord’s own
          monetization (Premium Apps). Discord handles the purchase and payment and
          processes your payment details under its own policies. We receive from Discord
          only entitlement information: which user or server has which product. If you
          make a voluntary donation, the third-party donation platform processes your
          payment data under its own privacy policy.
        </p>
      </>
    ),
  },
  {
    id: "legal-bases",
    title: "Legal Bases for Processing",
    body: (
      <>
        <p>Where the law requires a legal basis for processing, we rely on:</p>
        <ul>
          <li>
            <strong>Performance of the Service</strong> you request, for example
            processing your commands, logging you in to the panel, keeping editor tasks,
            removed emotes and sync data, and providing paid features;
          </li>
          <li>
            <strong>Our legitimate interests</strong> in operating a secure and reliable
            Service, preventing and investigating abuse, fixing errors and understanding
            how the Service is used (the command log, server logs and analytics); and
          </li>
          <li>
            <strong>Your consent</strong>, where you give it, for example when you send
            feedback or an error report. You can withdraw your consent at any time.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    title: "How Long We Keep Information",
    body: (
      <ul>
        <li>Command log: indefinitely, until deleted at your request.</li>
        <li>Panel user record and OAuth tokens: until deleted at your request.</li>
        <li>
          Sessions: until you log out or 30 days without use, then deleted within an hour.
        </li>
        <li>Cached Discord server list: 60 seconds.</li>
        <li>
          Bot menu state: up to 6 hours for search results, up to 24 hours otherwise.
        </li>
        <li>
          Emote processing state and temporary files: 15 minutes after the last change.
        </li>
        <li>Editor tasks: at most 14 days, at most 20 per user.</li>
        <li>Removed emotes: at most 14 days, at most 250 per server.</li>
        <li>
          7TV channel sync: while the sync is linked; the activity log keeps at most 200
          entries of the last 30 days.
        </li>
        <li>Lookup and search caches: between 5 minutes and 1 hour.</li>
        <li>
          <code>/media</code> files: deleted after upload; queue entry: a few seconds.
        </li>
        <li>Feedback and error reports: until deleted at your request.</li>
        <li>Server logs: for a limited period.</li>
      </ul>
    ),
  },
  {
    id: "recipients",
    title: "Third Parties and Recipients",
    body: (
      <>
        <p>
          We do not sell your personal data and do not share it for advertising. Data is
          received by or exchanged with the following third parties, to the extent needed
          for the purposes described above:
        </p>
        <ul>
          <li>
            <strong>Discord</strong>: the platform the bot runs on, the panel login
            (OAuth), the content delivery network for emotes and avatars, and payments for
            paid features.
          </li>
          <li>
            <strong>Google</strong>: Google Analytics on the website, and the Tenor API,
            which our servers use to resolve Tenor GIF links you turn into emotes.
          </li>
          <li>
            <strong>Twitch</strong>: channel and emote lookups through the Twitch API.
          </li>
          <li>
            <strong>7TV, BetterTTV and FrankerFaceZ</strong>: emote data and files,
            fetched by our servers and, in the website and panel, by your browser.
          </li>
          <li>
            <strong>Imgur</strong>: the Imgur API, which our servers use to resolve Imgur
            links you turn into emotes.
          </li>
          <li>
            <strong>Other link sources</strong>: when you add an emote from a link, our
            servers fetch the file from the website it points to.
          </li>
          <li>
            <strong>Social platforms</strong> targeted by <code>/media</code>, such as
            Instagram, TikTok, YouTube, X, Twitch, Kick and Streamable, from which our
            servers fetch the posts you request.
          </li>
          <li>
            <strong>Our hosting provider</strong>, which runs the servers and databases of
            the Service.
          </li>
          <li>
            <strong>The donation platform</strong>, if you choose to donate.
          </li>
        </ul>
        <p>
          When our servers fetch data from these providers, the requests come from our
          servers, not from you, and do not include your Discord account details. We may
          also disclose information where required by law or to protect the rights and
          safety of users and the Service.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "International Transfers",
    body: (
      <p>
        The providers listed above may process data in countries other than the one you
        live in, including countries whose data protection laws differ from yours. By
        using the Service, you understand that your data may be processed outside your
        country by these providers.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We take reasonable technical and organizational measures to protect your data,
        including: OAuth tokens encrypted at rest with AES-256-GCM; random session tokens
        stored in an HTTP-only cookie and sent only over HTTPS; databases that are not
        reachable from the public internet; never writing tokens or session values to
        logs; and automatic deletion of temporary data as described above. No method of
        transmission or storage is completely secure, so we cannot guarantee absolute
        security.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights",
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access the personal data
          we hold about you, to have it corrected or deleted, to restrict or object to its
          processing, to receive it in a portable format, and to withdraw any consent you
          have given. You may also have the right to lodge a complaint with a data
          protection authority.
        </p>
        <p>
          To exercise any of these rights, including to have your data deleted, send a
          request on the {SUPPORT}. Requests are handled manually. We may ask you to
          confirm that you control the Discord account concerned.
        </p>
        <p>
          You can also end Tetra’s access to your Discord account at any time by logging
          out of the panel and revoking Tetra in Discord under User Settings → Authorized
          Apps. Data stored in your browser can be removed by clearing your browser’s site
          data for tetra.lol.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The Service is not intended for children under 13, or under the higher minimum age
        required by the law of their country. We do not knowingly collect personal data
        from such children. If you believe a child has provided us with personal data,
        contact us on the {SUPPORT} and we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. The date at the top of this
        page shows when it was last updated. Material changes will be announced on the{" "}
        {SUPPORT}. By continuing to use the Service after changes take effect, you accept
        the updated policy.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        For questions about this policy or your data, contact us on the {SUPPORT} or send
        us a message with the bot’s <code>/feedback</code> command.
      </p>
    ),
  },
];

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <p>
          This Privacy Policy explains what information Tetra collects when you use the
          bot, the website and the panel, why we collect it, how long we keep it, who
          receives it and what rights you have.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
