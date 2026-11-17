import { z } from "zod";

/**
 * Advanced sync rules: an ordered list, the first enabled rule whose conditions all match
 * decides what happens to an added emote (see docs/core/7tv-sync.md).
 */

export const MAX_RULES = 25;
export const MAX_CONDITIONS = 5;

const TEXT_MAX_LENGTH = 100;
const LIST_MAX_ENTRIES = 100;

/**
 * Patterns run on the manager's event loop, so reject the classic catastrophic shapes: a
 * quantified group that itself contains a quantifier, e.g. `(a+)+`, `(\w*)*`, `(a|aa){2,}`.
 */
const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d+,)/;

/** 7TV names are at most 100 characters; the cut keeps regex runs bounded. */
const MAX_TESTED_TEXT = 100;

const compileRegex = (pattern: string) => new RegExp(pattern, "i");

const textValue = z.string().min(1).max(TEXT_MAX_LENGTH);

const regexValue = textValue
  .refine((pattern) => !NESTED_QUANTIFIER.test(pattern), "Nested quantifiers")
  .refine((pattern) => {
    try {
      compileRegex(pattern);
      return true;
    } catch {
      return false;
    }
  }, "Invalid regular expression");

const userValue = z.string().min(1).max(64);
const userListValue = z.array(userValue).min(1).max(LIST_MAX_ENTRIES);

const textConditions = (field: "name" | "original_name") =>
  [
    z.object({
      field: z.literal(field),
      operator: z.enum([
        "contains",
        "not_contains",
        "starts_with",
        "ends_with",
        "equals",
        "not_equals",
      ]),
      value: textValue,
    }),
    z.object({
      field: z.literal(field),
      operator: z.literal("matches_regex"),
      value: regexValue,
    }),
  ] as const;

const userConditions = (field: "author" | "added_by") =>
  [
    z.object({
      field: z.literal(field),
      operator: z.enum(["is", "is_not"]),
      value: userValue,
    }),
    z.object({
      field: z.literal(field),
      operator: z.enum(["in", "not_in"]),
      value: userListValue,
    }),
  ] as const;

const booleanCondition = <F extends string>(field: F) =>
  z.object({ field: z.literal(field), operator: z.literal("is"), value: z.boolean() });

const numberCondition = <F extends string>(field: F, value: z.ZodNumber) =>
  z.object({ field: z.literal(field), operator: z.enum(["gt", "lt"]), value });

export const ruleConditionSchema = z.union([
  ...textConditions("name"),
  ...textConditions("original_name"),
  z.object({
    field: z.literal("name_length"),
    operator: z.enum(["gt", "lt", "eq"]),
    value: z.number().int().min(0).max(100),
  }),
  booleanCondition("renamed"),
  booleanCondition("name_taken"),
  ...userConditions("author"),
  ...userConditions("added_by"),
  z.object({
    field: z.literal("tags"),
    operator: z.enum(["contains", "not_contains"]),
    value: textValue,
  }),
  booleanCondition("listed"),
  numberCondition("emote_age_days", z.number().min(0).max(36_500)),
  numberCondition("width", z.number().min(0).max(10_000)),
  numberCondition("height", z.number().min(0).max(10_000)),
  numberCondition("aspect_ratio", z.number().min(0).max(100)),
  numberCondition("file_size_kb", z.number().min(0).max(10_240)),
  numberCondition("frame_count", z.number().int().min(0).max(10_000)),
  numberCondition("duration_s", z.number().min(0).max(3600)),
  numberCondition("free_slots", z.number().int().min(0).max(250)),
]);

export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleField = RuleCondition["field"];

export const ruleSchema = z.object({
  /** Client-generated, only for the panel's list keys. */
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/),
  enabled: z.boolean(),
  conditions: z.array(ruleConditionSchema).min(1).max(MAX_CONDITIONS),
  action: z.enum(["review", "skip", "add"]),
});

export type SyncRule = z.infer<typeof ruleSchema>;

export const rulesSchema = z
  .array(ruleSchema)
  .max(MAX_RULES)
  .refine(
    (rules) => new Set(rules.map((rule) => rule.id)).size === rules.length,
    "Rule ids must be unique"
  );

export const DEFAULT_RULES: SyncRule[] = [
  // Not approved by 7TV's moderators
  {
    id: "unlisted",
    enabled: true,
    conditions: [{ field: "listed", operator: "is", value: false }],
    action: "review",
  },
  // Discord allows duplicate names, which only confuses people
  {
    id: "name-taken",
    enabled: true,
    conditions: [{ field: "name_taken", operator: "is", value: true }],
    action: "review",
  },
  // Keeps room for emotes added by hand
  {
    id: "few-slots",
    enabled: true,
    conditions: [{ field: "free_slots", operator: "lt", value: 5 }],
    action: "review",
  },
];

export interface StvUserRef {
  id: string;
  username: string | null;
}

/** What the event tells about an added emote. */
export interface RuleEventFacts {
  stvEmoteId: string;
  /** The alias in the set. */
  name: string;
  originalName: string;
  author: StvUserRef | null;
  /** Who added it to the set; null when 7TV didn't say. */
  actorId: string | null;
  tags: string[];
  /** Null when 7TV didn't send it: `listed` conditions then don't match. */
  listed: boolean | null;
}

export interface RuleFileFacts {
  width: number;
  height: number;
  sizeBytes: number;
  frames: number;
  durationMs: number;
}

/** Lazily loaded facts: rules only download or call Discord when a condition needs it. */
export interface RuleFacts {
  event: RuleEventFacts;
  file: () => Promise<RuleFileFacts>;
  /** Free slots of the file's type and whether the sanitized name is already used. */
  server: () => Promise<{ freeSlots: number; nameTaken: boolean }>;
  /** The actor's 7TV username, null when unknown. */
  actorUsername: () => Promise<string | null>;
}

const regexCache = new Map<string, RegExp>();

const testRegex = (pattern: string, text: string) => {
  let regex = regexCache.get(pattern);
  if (!regex) {
    try {
      regex = compileRegex(pattern);
    } catch {
      return false;
    }
    if (regexCache.size > 500) regexCache.clear();
    regexCache.set(pattern, regex);
  }
  return regex.test(text.slice(0, MAX_TESTED_TEXT));
};

type TextOperator =
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "equals"
  | "not_equals"
  | "matches_regex";

const matchText = (operator: TextOperator, value: string, text: string) => {
  if (operator === "matches_regex") return testRegex(value, text);
  const subject = text.toLowerCase();
  const needle = value.toLowerCase();
  switch (operator) {
    case "contains":
      return subject.includes(needle);
    case "not_contains":
      return !subject.includes(needle);
    case "starts_with":
      return subject.startsWith(needle);
    case "ends_with":
      return subject.endsWith(needle);
    case "equals":
      return subject === needle;
    case "not_equals":
      return subject !== needle;
  }
};

const matchNumber = (operator: "gt" | "lt" | "eq", value: number, actual: number) =>
  operator === "gt"
    ? actual > value
    : operator === "lt"
      ? actual < value
      : actual === value;

/** Unknown users never match, whatever the operator. */
const matchUser = (
  operator: "is" | "is_not" | "in" | "not_in",
  value: string | string[],
  candidates: (string | null)[]
) => {
  const known = candidates.filter((c): c is string => !!c).map((c) => c.toLowerCase());
  if (known.length === 0) return false;
  const values = (Array.isArray(value) ? value : [value]).map((v) => v.toLowerCase());
  const hit = known.some((candidate) => values.includes(candidate));
  return operator === "is" || operator === "in" ? hit : !hit;
};

/** Creation time of a 7TV id: ULID (48-bit ms prefix) or the old 24-hex ObjectId. */
export const stvIdCreatedAt = (id: string): number | null => {
  if (/^[0-9a-fA-F]{24}$/.test(id)) return Number.parseInt(id.slice(0, 8), 16) * 1000;
  if (!/^[0-9A-Za-z]{26}$/.test(id)) return null;
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let time = 0;
  for (const char of id.slice(0, 10).toUpperCase()) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) return null;
    time = time * 32 + digit;
  }
  return time;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const matchCondition = async (
  condition: RuleCondition,
  facts: RuleFacts
): Promise<boolean> => {
  const { event } = facts;
  switch (condition.field) {
    case "name":
      return matchText(condition.operator, condition.value, event.name);
    case "original_name":
      return matchText(condition.operator, condition.value, event.originalName);
    case "name_length":
      return matchNumber(condition.operator, condition.value, event.name.length);
    case "renamed":
      return (event.name !== event.originalName) === condition.value;
    case "name_taken":
      return (await facts.server()).nameTaken === condition.value;
    case "author":
      return matchUser(condition.operator, condition.value, [
        event.author?.id ?? null,
        event.author?.username ?? null,
      ]);
    case "added_by":
      return matchUser(condition.operator, condition.value, [
        event.actorId,
        event.actorId ? await facts.actorUsername() : null,
      ]);
    case "tags": {
      const needle = condition.value.toLowerCase();
      const has = event.tags.some((tag) => tag.toLowerCase() === needle);
      return condition.operator === "contains" ? has : !has;
    }
    case "listed":
      return event.listed !== null && event.listed === condition.value;
    case "emote_age_days": {
      const createdAt = stvIdCreatedAt(event.stvEmoteId);
      if (createdAt === null) return false;
      return matchNumber(
        condition.operator,
        condition.value,
        (Date.now() - createdAt) / DAY_MS
      );
    }
    case "width":
      return matchNumber(condition.operator, condition.value, (await facts.file()).width);
    case "height":
      return matchNumber(
        condition.operator,
        condition.value,
        (await facts.file()).height
      );
    case "aspect_ratio": {
      const { width, height } = await facts.file();
      const ratio = Math.max(width, height) / Math.max(1, Math.min(width, height));
      return matchNumber(condition.operator, condition.value, ratio);
    }
    case "file_size_kb":
      return matchNumber(
        condition.operator,
        condition.value,
        (await facts.file()).sizeBytes / 1024
      );
    case "frame_count":
      return matchNumber(
        condition.operator,
        condition.value,
        (await facts.file()).frames
      );
    case "duration_s":
      return matchNumber(
        condition.operator,
        condition.value,
        (await facts.file()).durationMs / 1000
      );
    case "free_slots":
      return matchNumber(
        condition.operator,
        condition.value,
        (await facts.server()).freeSlots
      );
  }
};

/**
 * The first enabled rule whose conditions all match, with its 1-based position in the
 * whole list (disabled rules count, so the number matches what the panel shows). Conditions
 * are checked in order and stop at the first miss, so later ones never download for nothing.
 */
export const findMatchingRule = async (
  rules: SyncRule[],
  facts: RuleFacts
): Promise<{ rule: SyncRule; position: number } | null> => {
  for (const [index, rule] of rules.entries()) {
    if (!rule.enabled) continue;
    let matches = true;
    for (const condition of rule.conditions) {
      if (!(await matchCondition(condition, facts))) {
        matches = false;
        break;
      }
    }
    if (matches) return { rule, position: index + 1 };
  }
  return null;
};
