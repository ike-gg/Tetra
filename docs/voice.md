# Tetra voice

How tetra talks to people: bot replies, errors, buttons, labels, empty states, the website and the panel. Read this before writing any text a user will see. The visual identity is in [branding.md](branding.md).

## Who is talking

tetra talks like a calm friend who knows this stuff. It's relaxed but not trying to be funny, and it gets out of the way: it says what it did or what went wrong, then stops.

The people reading are mostly chat viewers. They know emotes from chat but don't necessarily know what BTTV is or what Discord's size limits are.

Discord's tone is the reference, minus its cringe. We keep:
- short sentences
- warmth
- plain words

We drop:
- forced excitement ("Woohoo!", "Yay!", "Oops!")
- mascot talk
- exclamation marks
- "hang tight"
- cute filler

## Rules

- **Lowercase, like chat.** Sentences, buttons, headings and labels start with a lowercase letter, and so does "i". Proper nouns keep their spelling: Discord, Twitch, 7TV, BTTV, FFZ, and emote names exactly as they are (`catJAM`). The wordmark is always `tetra`, never `Tetra`.
- **One exception: `discord` in buttons.** Calls to action write the platform lowercase (`add to discord`), so a button reads as one lowercase label. In running text, headings, descriptions and page titles it stays `Discord`.
- **No trailing period.** One-line messages, buttons and labels end without a period. Longer text uses periods between sentences but not after the last one. Question marks stay: `replace it?`
- **No exclamation marks.**
- **No emoji, no emotes, no emoticons** in any message or copy (`⏳`, `🤨`, `:)`, `KEKW` are all out). The only exception is the feedback emotes (the status pictograms from [branding.md](branding.md#logo)) used as status icons in bot replies.
- **Minimal by default.** Say the result and leave the subject out: `added catJAM`, not `i have successfully added catJAM to your server`.
- **First person when tetra did or couldn't do something** and the sentence needs a subject, mostly in errors: `i couldn't find an emote called catJAM on 7TV`. tetra takes responsibility; it never blames the user.
- **Direct.** Longer explanations are fine when they're needed. Say it plainly and stop, without filler, apologies, "unfortunately" or "please note".
- **No slang.** Words from the user's own world are terms, not slang: `animated`, `zero-width`, `sub emotes`, `your 7TV set`. Words that try to sound like chat are out: `banger`, `W`, `gg`, `nice`, `no cap`.
- **Concrete numbers.** `312 KB`, not `too big`. Units are written technically: `KB`, `MB`, `px`, `fps`.
- **Commands in code formatting:** `/addemote`, `/media`.

## Humor

- **Never in errors, payments, permissions or anything where the user has a problem.**
- Elsewhere (empty states, the footer, the website) one dry line is allowed now and then. Understatement, never jokes or puns, and never more than one per screen.
- When in doubt, leave it out.

## Message patterns

| situation | text |
|---|---|
| success | `added catJAM` |
| bulk success | `added 12 emotes from your 7TV set` |
| loading | `optimizing catJAM` |
| long loading | `uploading 24 emotes, this can take a minute` |
| user-side limit | `catJAM is 312 KB and Discord allows 256 KB. try a shorter clip or lower the quality` |
| our fault | `something broke on my side. try again, and if it keeps happening, report it with code A7F2` |
| missing permission | `you need the manage expressions permission to add emotes here` |
| server full | `this server has no free emote slots. remove one or boost the server for more` |
| question | `catJAM already exists here. replace it?` with buttons `replace` / `keep both` / `cancel` |
| expired | `this menu expired. run the command again` |
| empty state | `no emotes yet` |
| button | `add to discord`, `open in editor`, `save` |

- **Errors** say what happened and what to do next. If tetra can't say what to do, give a code to report.
- **Loading** says what is happening, not `please wait`. No `...`: the spinner already shows the wait.
- **Questions** are yes/no or have explicit choices. Button labels repeat the action (`replace`), never `yes` / `ok`.
- **Permissions** say what the user needs, not what they lack: `you need…`, not `you don't have…`.

## Words

| use | for | don't use |
|---|---|---|
| emote | a custom emote (Discord, 7TV, BTTV, FFZ) | emoji, sticker |
| emoji | built-in emoji like 😃 (the word, not the character) | emote |
| server | a Discord server | guild (code only) |
| panel | the web panel | dashboard |
| editor | the web editor | studio, tool |
| premium | paid features (will become **supporter**) | pro, plus |
| 7TV, BTTV, FFZ | the providers | 7tv, SevenTV |

Verbs follow the action:

| verb | when |
|---|---|
| add | an emote from 7TV, BTTV, FFZ or a link onto a server |
| upload | a file the user provides |
| save | changes in the panel or the editor |
| remove | an emote from a server (not "delete") |
| download | `/media` |

## Website

The site follows the same voice but may sell a little more:

- One stronger beat per heading is fine, usually the serif accent: `add any emote. that's it`
- Lead with what the user gets, not with technology.
- Descriptions, FAQ, buttons and forms talk exactly like the bot.
- Only claim what's verified: pricing, limits, permissions and numbers.

## Before and after

| before | after |
|---|---|
| `Processing your emote ⏳` | `optimizing catJAM` |
| `Uploading 24 emotes.. it could take a while` | `uploading 24 emotes, this can take a minute` |
| `It should never have happened, but it did. 🤨` | `something broke on my side. try again, and if it keeps happening, report it with code A7F2` |
| `Failed to get page from database, it might got expired` | `this menu expired. run the command again` |
| `Add To Discord` | `add to discord` |

## Checklist

Before handing in any user-facing text:

- [ ] lowercase start, proper nouns intact (`discord` lowercase only in buttons), `tetra` lowercase
- [ ] no trailing period, no exclamation marks
- [ ] no emoji, emotes or emoticons
- [ ] no slang, no humor in errors
- [ ] errors say what happened and what to do
- [ ] real numbers with technical units
- [ ] words and verbs from the tables above
