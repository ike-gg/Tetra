# Similar emotes

The server view's third tab, "similar names" (`/panel/servers/$guildId?view=similar`): the server's emotes grouped by names that look alike, so duplicates and leftovers are easy to spot and remove. Names only, no image comparison. Everything runs in the browser; nothing is stored on core. Paths are relative to `apps/web`.

## Grouping (`src/lib/similar-emotes.ts`)

Pure, no React. `findSimilarEmoteGroups({ id, name }[])` returns `SimilarGroup { key, kind, title, reason, emoteIds }`, sorted by strength (the order below), then size, then title. Two groups with the same members are never both emitted: the stronger one stays.

- **Tokens**: camelCase / PascalCase / ALLCAPS runs and digits (`catJAM` → cat JAM, `KEKWait` → KEK Wait, ambiguous by nature). Number tokens are dropped from the words.
- **Loose form**: lowercase, separators removed, look-alike digits folded only between letters (`0 1 3 4 5 7` → `o i e a s t`; a trailing digit is a version, not a letter), doubled letters collapsed (`poggg` → `pog`). **Base**: the loose form without trailing digits.
- **duplicate**: same loose form. The reason names what differs (`the exact same name`, `the same name in different case`, `the same name apart from case and underscores`).
- **numbered**: same base (`pog`, `pog2`, `pog_3`): `the same name apart from a number`; title is the name without its number.
- **near**: bases a letter or two apart, clustered with union-find. Optimal string alignment distance (transpositions count as one edit) on distinct bases only, O(n²); the shorter base needs 4+ characters, distance ≤ 1 under 8 characters and ≤ 2 from 8, and ≤ 25% of the longer one. When both names have the same words but one, and that word is under 4 letters, it's not a near-duplicate (`peepoSad` / `peepoMad` are a family, not a typo). Duplicate and numbered sub-groups inside a near cluster are emitted too.
- **prefix** (`peepo*`, `all start with peepo`): a shared first word of 3+ letters, in names with more than one word. A single-word name (`pepega`, `peepohappy`) joins the longest family stem of 4+ letters it starts with, unless its first word has a family of its own.
- **suffix** (`*JAM`, `all end with JAM`): a shared last word of 3+ letters, names with more than one word.
- **contains** (`*Clap*`, `all have Clap in the name`): a shared word of 4+ letters anywhere, only when the group isn't already a subset of the same word's prefix or suffix family.
- **Too common**: on servers with 8+ emotes a prefix/suffix family over 50% of the emotes, or a contains group over 25%, is dropped: that's the server's theme, not something to tidy up.
- Titles keep the emotes' own casing (the most common spelling of the stem).
- Speed (Bun, 2026-11): 500 names in about 30 ms; the component memoizes on the names.

## View (`src/components/panel/similar-emotes.tsx`)

- The toolbar's type filter applies before grouping; the name filter keeps groups with at least one matching emote; the sort control is hidden (groups have their own order).
- Each group is a bordered section: mono title (h3), reason · count, a ghost `dismiss` button, and its own `EmoteMenu kind="server"` + `EmoteGrid` (a menu's selection follows one list, so groups can't share one). Selecting or right-clicking an emote removes it as anywhere else; the groups recompute from the server's query.
- **Dismissing** is local only: `localStorage` `tetra:similar-dismissed:<guildId>`, a JSON array of `similarGroupDismissKey(group)` = `<kind>:<stem>|<sorted emote ids>`, so a group comes back when an emote joins or leaves it. Reads and writes are wrapped in try/catch; without storage dismissals last for the visit. Stale keys are kept (an emote removed and added back keeps its group dismissed).
- "show dismissed" (`Switch`, only while something matching is hidden) lists dismissed groups too, marked `dismissed`, with `show again`.
- Empty states: "no similar names", "nothing left to check" (everything dismissed), "no group has an emote matching …".
