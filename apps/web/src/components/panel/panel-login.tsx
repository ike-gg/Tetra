import { useLocation } from "@tanstack/react-router";

import { PanelScreen } from "@/components/panel/panel-screen";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Notice } from "@/components/ui/notice";
import { Text } from "@/components/ui/text";
import { track } from "@/lib/analytics";
import { loginUrl, panelReturnPath } from "@/lib/session";

// Codes from the API's OAuth callback (`AUTH_CALLBACK_ERRORS` in core)
const LOGIN_ERRORS: Record<string, { title: string; body: string }> = {
  ACCESS_DENIED: {
    title: "login cancelled",
    body: "you cancelled on Discord. log in again whenever you're ready",
  },
  INVALID_OAUTH_STATE: {
    title: "login link expired",
    body: "it timed out or was started in another tab. try again",
  },
  RATE_LIMITED: {
    title: "too many attempts",
    body: "wait a minute, then try again",
  },
};

const FALLBACK_ERROR = {
  title: "something broke on my side",
  body: "try again, and if it keeps happening, report it",
};

export function PanelLogin({ error }: { error?: string }) {
  const location = useLocation();
  // Back to where the user was after Discord, without the error of this attempt
  const returnPath = panelReturnPath(location.pathname, location.searchStr);
  const notice = error === undefined ? null : (LOGIN_ERRORS[error] ?? FALLBACK_ERROR);

  return (
    <PanelScreen>
      <div className="flex flex-col gap-6">
        <Heading level={1} size="lg">
          log in to the <Accent>panel</Accent>
        </Heading>

        {notice && <Notice title={notice.title}>{notice.body}</Notice>}

        <Button
          variant="primary"
          size="lg"
          glow
          className="w-full"
          render={<a href={loginUrl(returnPath)} onClick={() => track("panel_login")} />}
        >
          log in with discord
        </Button>

        <Text size="sm" tone="muted">
          <span className="font-medium text-foreground">why only Discord?</span>{" "}
          everything tetra does runs on your Discord account: your servers, your
          permissions, your emotes. another login would just be one more step in front of
          the same account
        </Text>
      </div>
    </PanelScreen>
  );
}
