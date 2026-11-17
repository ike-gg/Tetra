export const DISCORD_EMOTE_LIMIT = 256 * 1024;

// Measured 2026-11-17: core's optimizeBuffer (default contain fitting) on the 3x.gif the
// bot downloads from 7TV. The outputs are in public/home/; the original is shown from
// 7TV's lighter 2x.webp, the sizes are of the 3x.gif.
export const OPTIMIZED_EMOTES = [
  {
    name: "AINTNOWAY",
    id: "01GDDQVMH000038Q48APH8VE3Q",
    file: "aintnoway",
    before: 1454083,
    after: 250943,
  },
  {
    name: "WhoAsked",
    id: "01FNSSG3T8000EJT2EVEY3FBSY",
    file: "whoasked",
    before: 2102067,
    after: 253775,
  },
  {
    name: "OOOO",
    id: "01GB4PT9NG000DGEZ8VYY59RSM",
    file: "oooo",
    before: 1350403,
    after: 211469,
  },
  {
    name: "Vibe",
    id: "01FRTYR8RR0005FHRFCCZBSEKR",
    file: "vibe",
    before: 1166850,
    after: 241746,
  },
] as const;

export type OptimizedEmote = (typeof OPTIMIZED_EMOTES)[number];

export const optimizedEmoteUrl = (emote: OptimizedEmote) => `/home/${emote.file}.gif`;
export const sevenTvPreviewUrl = (emote: OptimizedEmote) =>
  `https://cdn.7tv.app/emote/${emote.id}/2x.webp`;
