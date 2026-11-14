# Tetra

Discord bot for managing emotes (adding them from 7TV / BTTV / FFZ / links with automatic optimization to Discord's limits) plus a web panel. Bun monorepo: `apps/core` (bot + REST API) and `apps/web` (TanStack Start site and panel).

## Read before working

The documentation lives in `docs/`. Read the overview, then only the doc for the area you touch:

- [docs/project-notes.md](docs/project-notes.md) – what Tetra is, monorepo layout, local setup, root scripts, deployment, conventions. **Always read.**
- [docs/core.md](docs/core.md) – bot and API (`apps/core`): architecture, API, security rules, verified Discord/Bun facts, database, env vars, agent pitfalls.
- [docs/web.md](docs/web.md) – website and panel (`apps/web`): rendering, structure, styling and brand tokens, ui-sdk, scripts.
  - [docs/web/background.md](docs/web/background.md) – homepage WebGL emote background. Only when working on it.
- [docs/branding.md](docs/branding.md) – visual and verbal identity: colors, fonts, square shape, ASCII accents, motion, voice. **Read before any UI or copy work.**

App docs link to deeper topic docs; follow those links only when the task needs them.

## Subagents

`.claude/agents/` has two project subagents: **core** (`apps/core`: bot, API, database) and **web** (`apps/web`: site, editor, panel). Delegate work in an app to its agent. For a feature that spans both, run `core` first (it defines the API and reports the shapes), then `web` with that report; run them in parallel only when the API doesn't change. Each agent commits its own files.

## Rules that apply everywhere

- Everything written to the repo is in **English** (code, comments, docs, commits), whatever language the chat is in.
- File and directory names are **kebab-case**; app-specific exceptions are listed in the app docs.
- Comments are sparse and explain "why", never restate the code.
- Before finishing: `bun check` (Biome) and `bun typecheck` must both pass. There are no tests yet.

## Keeping the docs current

The docs are the agents' memory of this project. When you change structure, behavior, scripts, conventions or learn a non-obvious fact (a verified platform quirk, a rejected approach), update the matching doc in the same change. Keep this file a short index: details go into `docs/`, and a new topic doc gets linked from its app doc.
