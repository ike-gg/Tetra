export const INVITE_URL = "https://tetra.lol/invite";

/**
 * The invite with one server already picked in Discord's dialog. Caddy turns `guild` into
 * Discord's `guild_id` + `disable_guild_select` (docker/web.Caddyfile).
 */
export const inviteUrlFor = (guildId: string) =>
  `${INVITE_URL}?guild=${encodeURIComponent(guildId)}`;

// Tetra's support server on Discord: support, data requests and abuse reports (legal pages)
export const SUPPORT_SERVER_URL = "https://discord.gg/dNqBstzs4p";
