![banner](https://i.imgur.com/mjhd6j9.png)

<br />
<div align="center">
  <h2 align="center">Tetra</h2>

  <p align="center">
    Emote management Discord bot.
    <br />
    <a href="https://tetra.lol/invite">Bot Invite Link</a>
    ·
    <a href="https://github.com/ike-gg/Tetra/issues">Report Bug</a>
    ·
    <a href="https://github.com/ike-gg/Tetra/issues">Request Feature</a>
  </p>
</div>

## About The Project

Tetra is a Discord bot project that greatly simplifies importing emotes from various services such as 7TV, BTTV, FFZ or direct links to sources onto your Discord server.

The built-in automatic file optimization feature requires no additional action from users, and the optional scaling function allows you to adjust the emote to look its best.

Additionally Tetra offers a few other smaller but equally exciting features, such as adding unavailable emotes directly from messages or reactions.

---

## Built with

![discordjs](https://img.shields.io/badge/discord.js-000000?style=for-the-badge&logo=discord&logoColor=FFFFFF)
![express](https://img.shields.io/badge/express.js-000000?style=for-the-badge&logo=express&logoColor=FFFFFF)
![nodejs](https://img.shields.io/badge/nodejs-000000?style=for-the-badge&logo=nodedotjs&logoColor=FFFFFF)
![typescript](https://img.shields.io/badge/typescript-000000?style=for-the-badge&logo=typescript&logoColor=FFFFFF)
![sharpjs](https://img.shields.io/badge/sharp-000000?style=for-the-badge&logo=sharp&logoColor=FFFFFF)
![zod](https://img.shields.io/badge/zod-000000?style=for-the-badge&logo=sharp&logoColor=FFFFFF)

---

## Getting Started

Requires [Bun](https://bun.sh), PostgreSQL and Redis. `ffmpeg` must be installed for the `/media` slideshow feature.

1. Clone repo and install dependencies

```
git clone https://github.com/ike-gg/Tetra
cd Tetra
bun install
```

2. Create a `.env` file (see [Environment variables](#environment-variables))

3. Create the database tables

```
bun run db:push
```

4. Register slash commands

```
bun run deploy:dev        # only on the guilds listed in DEV_GUILDS
bun run deployCommands    # globally
```

5. Run the bot

```
bun run dev      # watch mode
bun run start    # production
```

Before committing run `bun run check` (Biome) and `bun run typecheck`.

### Environment variables

The app validates them on startup and prints what is wrong. Required:

| Variable | What it is |
|---|---|
| `DISCORD_BOT_ID`, `DISCORD_BOT_TOKEN` | Discord bot application |
| `DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET` | OAuth2 login for the web panel |
| `POSTGRES_URL`, `REDIS_URL` | Database and Redis connection URLs |
| `BACKEND_URL`, `FRONTEND_URL` | Public URLs of this app (OAuth redirect) and of the panel |
| `SESSION_KEYS` | Comma separated list of secrets for the session cookie |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes (base64 or hex) that encrypt Discord tokens in the database. Create one with `openssl rand -base64 32`. Do not lose it: stored tokens cannot be read without it |
| `INVITE_LINK` | Bot invite link |
| `TWITCH_CLIENT_ID`, `TWITCH_SECRET_KEY`, `TENOR_API_KEY`, `IMGUR_CLIENT_ID` | API keys of the emote sources |

Optional: `ENV` (`development` or `production`, default `development`), `API_ENABLED` (`true` to serve the panel API), `PORT` (default `3002`), `CORS_ORIGINS` (comma separated, default `FRONTEND_URL`), `COOKIE_DOMAIN`, `TEMP_DIR_PATH`, `DEV_GUILDS` (comma separated guild IDs for `deploy:dev`), `ERROR_LOG_CHANNEL_ID` (channel for the "Send developers log" button), `COBALT_URL` and `COBALT_API_KEY` (for `/media`).

---


## Contributing

To contribute, simply fork this project and create a pull request with your changes. Whether it's a new feature, bug fix, or documentation improvement, we appreciate all contributions. Thank you for your interest in helping to make this project even better!
