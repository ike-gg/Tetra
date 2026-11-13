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

Requires [Bun](https://bun.sh) and Docker (for local Postgres and Redis).

This is a monorepo: `apps/core` is the Discord bot with the REST API, `apps/web` is the website and panel. Documentation lives in [docs](docs/project-notes.md).

1. Clone repo and install dependencies

```
git clone https://github.com/ike-gg/Tetra
cd Tetra
bun install
```

2. Create `apps/core/.env` from `apps/core/.env.example` (variables are described in [docs/core.md](docs/core.md#environment-variables))

3. Start Postgres and Redis, then create the database tables

```
bun db:up
bun db:push
```

4. Register slash commands

```
bun --filter @tetra/core deploy:dev        # only on the guilds listed in DEV_GUILDS
bun --filter @tetra/core deployCommands    # globally
```

5. Run everything

```
bun dev    # core (bot + API on :3002) and web (:3000)
```

Before committing run `bun check` (Biome) and `bun typecheck`.

---

## Contributing

To contribute, simply fork this project and create a pull request with your changes. Whether it's a new feature, bug fix, or documentation improvement, we appreciate all contributions. Thank you for your interest in helping to make this project even better!
