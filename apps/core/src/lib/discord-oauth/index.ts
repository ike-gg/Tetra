import DiscordOauth2 from "discord-oauth2";

import { env } from "@/env";

export const discordOauth = new DiscordOauth2({
  clientId: env.DISCORD_OAUTH_CLIENT_ID,
  clientSecret: env.DISCORD_OAUTH_CLIENT_SECRET,
  version: "v10",
});
