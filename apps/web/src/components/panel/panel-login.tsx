import { useLocation } from "@tanstack/react-router";

import { PanelScreen } from "@/components/panel/panel-screen";
import { Accent } from "@/components/ui/accent";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Notice } from "@/components/ui/notice";
import { Text } from "@/components/ui/text";
import { loginUrl, panelReturnPath } from "@/lib/session";

// Codes from the API's OAuth callback (`AUTH_CALLBACK_ERRORS` in core)
const LOGIN_ERRORS: Record<string, { title: string; body: string }> = {
  ACCESS_DENIED: {
    title: "Login cancelled",
    body: "You cancelled on Discord. Log in again whenever you're ready.",
  },
  INVALID_OAUTH_STATE: {
    title: "Login link expired",
    body: "It timed out or was started in another tab. Try again.",
  },
  RATE_LIMITED: {
    title: "Too many attempts",
    body: "Wait a minute, then try again.",
  },
};

const FALLBACK_ERROR = {
  title: "Something went wrong",
  body: "That one's on our side. Try again.",
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
          Log in to the <Accent>panel</Accent>
        </Heading>

        {notice && <Notice title={notice.title}>{notice.body}</Notice>}

        <Button
          variant="primary"
          size="lg"
          glow
          className="w-full"
          render={<a href={loginUrl(returnPath)} />}
        >
          Log in with Discord
        </Button>

        <Text size="sm" tone="muted">
          <span className="font-medium text-foreground">Why only Discord?</span>{" "}
          Everything Tetra does runs on your Discord account: your servers, your
          permissions, your emotes. Another login would just be one more step in front of
          the same account.
        </Text>
      </div>
    </PanelScreen>
  );
}
