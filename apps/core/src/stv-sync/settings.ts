import { z } from "zod";

/** Discord shows emotes in a square, so very wide emotes end up tiny. */
export const MAX_ASPECT_RATIO_LIMIT = 8;

const NAME_REGEX_MAX_LENGTH = 100;

/**
 * Patterns run on the manager's event loop, so reject the classic catastrophic shapes: a
 * quantified group that itself contains a quantifier, e.g. `(a+)+`, `(\w*)*`, `(a|aa){2,}`.
 */
const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d+,)/;

export const compileNameRegex = (pattern: string) => new RegExp(pattern, "i");

const nameRegexSchema = z
  .string()
  .min(1)
  .max(NAME_REGEX_MAX_LENGTH)
  .refine((pattern) => !NESTED_QUANTIFIER.test(pattern), "Nested quantifiers")
  .refine((pattern) => {
    try {
      compileNameRegex(pattern);
      return true;
    } catch {
      return false;
    }
  }, "Invalid regular expression");

/** 7TV ids: 26-char ULIDs, or the old 24-hex ids. */
export const stvIdSchema = z.string().regex(/^[0-9A-Za-z]{24,26}$/);

export const syncFittingSchema = z.enum(["contain", "cover", "fill"]);

export const syncSettingsSchema = z.object({
  filters: z.object({
    includeStatic: z.boolean(),
    includeAnimated: z.boolean(),
    skipZeroWidth: z.boolean(),
    skipNsfw: z.boolean(),
    /** Case-insensitive; when not empty the name must contain at least one of them. */
    nameContains: z.array(z.string().min(1).max(32)).max(50),
    /** Case-insensitive; when set the name must match. */
    nameRegex: nameRegexSchema.nullable(),
    excludedEmoteIds: z.array(stvIdSchema).max(1000),
    /** 7TV user ids or usernames (case-insensitive) of emote authors. */
    authors: z.object({
      mode: z.enum(["allow", "block"]),
      values: z.array(z.string().min(1).max(64)).max(100),
    }),
  }),
  optimization: z.object({
    /** Longer side / shorter side. Wider or taller emotes go to the queue. */
    maxAspectRatio: z.number().min(1).max(MAX_ASPECT_RATIO_LIMIT),
    /** How non-square emotes are made to fit (the optimizer's fitting option). */
    fitting: syncFittingSchema,
  }),
});

export type SyncSettings = z.infer<typeof syncSettingsSchema>;

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  filters: {
    includeStatic: true,
    includeAnimated: true,
    skipZeroWidth: true,
    skipNsfw: true,
    nameContains: [],
    nameRegex: null,
    excludedEmoteIds: [],
    authors: { mode: "block", values: [] },
  },
  optimization: {
    maxAspectRatio: 2,
    fitting: "contain",
  },
};

/**
 * Settings stored in the database, read defensively: a row written by an older version
 * (missing keys) falls back to the defaults field by field instead of failing.
 */
export const readStoredSettings = (stored: unknown): SyncSettings => {
  const value = (stored ?? {}) as Partial<{
    filters: Partial<SyncSettings["filters"]>;
    optimization: Partial<SyncSettings["optimization"]>;
  }>;
  const merged = {
    filters: { ...DEFAULT_SYNC_SETTINGS.filters, ...value.filters },
    optimization: { ...DEFAULT_SYNC_SETTINGS.optimization, ...value.optimization },
  };
  const parsed = syncSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SYNC_SETTINGS;
};

/** Which filter rejected an emote; also stored as the queue entry's `detail`. */
export type SyncFilter =
  | "static"
  | "animated"
  | "zero_width"
  | "nsfw"
  | "name"
  | "regex"
  | "author"
  | "excluded";

export interface FilterableEmote {
  id: string;
  name: string;
  animated: boolean;
  zeroWidth: boolean;
  nsfw: boolean;
  author: { id: string; username: string } | null;
}

/** 7TV names are at most 100 characters; the cut keeps regex runs bounded. */
const MAX_TESTED_NAME = 100;

export const findRejectingFilter = (
  emote: FilterableEmote,
  { filters }: SyncSettings
): SyncFilter | null => {
  if (filters.excludedEmoteIds.includes(emote.id)) return "excluded";
  if (emote.animated ? !filters.includeAnimated : !filters.includeStatic) {
    return emote.animated ? "animated" : "static";
  }
  if (filters.skipZeroWidth && emote.zeroWidth) return "zero_width";
  if (filters.skipNsfw && emote.nsfw) return "nsfw";

  const name = emote.name.slice(0, MAX_TESTED_NAME);
  const lowerName = name.toLowerCase();

  if (
    filters.nameContains.length > 0 &&
    !filters.nameContains.some((part) => lowerName.includes(part.toLowerCase()))
  ) {
    return "name";
  }

  if (filters.nameRegex) {
    try {
      if (!compileNameRegex(filters.nameRegex).test(name)) return "regex";
    } catch {
      return "regex";
    }
  }

  if (filters.authors.values.length > 0) {
    const values = filters.authors.values.map((value) => value.toLowerCase());
    const matches =
      !!emote.author &&
      (values.includes(emote.author.id.toLowerCase()) ||
        values.includes(emote.author.username.toLowerCase()));
    if (filters.authors.mode === "allow" ? !matches : matches) return "author";
  }

  return null;
};
