import { z } from "zod";

import { DEFAULT_RULES, readStoredRules, rulesSchema } from "./rules";

/** Discord shows emotes in a square, so very wide emotes end up tiny. */
export const MAX_ASPECT_RATIO_LIMIT = 4;

/** 7TV ids: 26-char ULIDs, or the old 24-hex ids. */
export const stvIdSchema = z.string().regex(/^[0-9A-Za-z]{24,26}$/);

/** On = emotes of that kind are synced; off = they go to review. */
const filtersSchema = z.object({
  includeStatic: z.boolean(),
  includeAnimated: z.boolean(),
  includeZeroWidth: z.boolean(),
  /** 7TV's NSFW flag. */
  includeNsfw: z.boolean(),
});

const optimizationSchema = z.object({
  /** Longer side / shorter side, one decimal. Wider or taller emotes go to review. */
  maxAspectRatio: z
    .number()
    .min(1)
    .max(MAX_ASPECT_RATIO_LIMIT)
    .transform((value) => Math.round(value * 10) / 10),
});

/** Emotes dismissed with "never sync": skipped silently, never put in review. */
const excludedEmoteIdsSchema = z.array(stvIdSchema).max(1000);

export const syncSettingsSchema = z.object({
  filters: filtersSchema,
  excludedEmoteIds: excludedEmoteIdsSchema,
  optimization: optimizationSchema,
  advancedRules: rulesSchema,
});

export type SyncSettings = z.infer<typeof syncSettingsSchema>;

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  filters: {
    includeStatic: true,
    includeAnimated: true,
    includeZeroWidth: true,
    includeNsfw: true,
  },
  excludedEmoteIds: [],
  optimization: { maxAspectRatio: 2 },
  advancedRules: DEFAULT_RULES,
};

const parseOr = <T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
  fallback: z.infer<T>
) => {
  const parsed = schema.safeParse(value);
  return parsed.success ? (parsed.data as z.infer<T>) : fallback;
};

/**
 * Settings stored in the database, read defensively: a row written by an older version
 * (missing or unknown keys, an invalid section) falls back to the defaults per section and
 * per field instead of failing; rules that no longer parse are dropped one by one.
 */
export const readStoredSettings = (stored: unknown): SyncSettings => {
  const value = (stored && typeof stored === "object" ? stored : {}) as Record<
    string,
    unknown
  >;
  const section = (key: string) =>
    value[key] && typeof value[key] === "object" ? (value[key] as object) : {};

  return {
    filters: parseOr(
      filtersSchema,
      { ...DEFAULT_SYNC_SETTINGS.filters, ...section("filters") },
      DEFAULT_SYNC_SETTINGS.filters
    ),
    excludedEmoteIds: parseOr(
      excludedEmoteIdsSchema,
      value.excludedEmoteIds ?? [],
      DEFAULT_SYNC_SETTINGS.excludedEmoteIds
    ),
    optimization: parseOr(
      optimizationSchema,
      { ...DEFAULT_SYNC_SETTINGS.optimization, ...section("optimization") },
      DEFAULT_SYNC_SETTINGS.optimization
    ),
    advancedRules:
      readStoredRules(value.advancedRules) ?? DEFAULT_SYNC_SETTINGS.advancedRules,
  };
};

/** Which basic filter rejected an emote; also stored as the review entry's `detail`. */
export type SyncFilter = "static" | "animated" | "zero_width" | "nsfw" | "excluded";

export interface FilterableEmote {
  id: string;
  animated: boolean;
  zeroWidth: boolean;
  nsfw: boolean;
}

export const findRejectingFilter = (
  emote: FilterableEmote,
  { filters, excludedEmoteIds }: SyncSettings
): SyncFilter | null => {
  if (excludedEmoteIds.includes(emote.id)) return "excluded";
  if (emote.animated ? !filters.includeAnimated : !filters.includeStatic) {
    return emote.animated ? "animated" : "static";
  }
  if (!filters.includeZeroWidth && emote.zeroWidth) return "zero_width";
  if (!filters.includeNsfw && emote.nsfw) return "nsfw";
  return null;
};
