import { z } from "zod";

/**
 * Advanced sync rules: an ordered list, the first enabled rule whose conditions all match
 * decides what happens to an added emote (see docs/core/7tv-sync.md).
 */

export const MAX_RULES = 25;
export const MAX_CONDITIONS = 5;

const numberCondition = <F extends string>(field: F, value: z.ZodNumber) =>
  z.object({ field: z.literal(field), operator: z.enum(["gt", "lt"]), value });

export const ruleConditionSchema = z.union([
  z.object({
    field: z.literal("name"),
    operator: z.enum([
      "contains",
      "not_contains",
      "starts_with",
      "ends_with",
      "equals",
      "not_equals",
    ]),
    value: z.string().min(1).max(100),
  }),
  numberCondition("aspect_ratio", z.number().min(0).max(100)),
  numberCondition("file_size_kb", z.number().min(0).max(10_240)),
  numberCondition("duration_s", z.number().min(0).max(3600)),
  numberCondition("frame_count", z.number().int().min(0).max(10_000)),
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

/**
 * Stored rules, read leniently: a rule that no longer parses (e.g. a field that was
 * removed) is dropped instead of failing the whole list.
 */
export const readStoredRules = (stored: unknown): SyncRule[] | null => {
  if (!Array.isArray(stored)) return null;
  const rules: SyncRule[] = [];
  const ids = new Set<string>();
  for (const entry of stored) {
    const parsed = ruleSchema.safeParse(entry);
    if (!parsed.success || ids.has(parsed.data.id)) continue;
    ids.add(parsed.data.id);
    rules.push(parsed.data);
    if (rules.length === MAX_RULES) break;
  }
  return rules;
};

export const DEFAULT_RULES: SyncRule[] = [
  // Wide emotes end up tiny in Discord's square
  {
    id: "wide",
    enabled: true,
    conditions: [{ field: "aspect_ratio", operator: "gt", value: 1.75 }],
    action: "review",
  },
  // Big source files usually lose a lot of quality to reach 256 KB
  {
    id: "large-file",
    enabled: true,
    conditions: [{ field: "file_size_kb", operator: "gt", value: 1024 }],
    action: "review",
  },
];

export interface RuleFileFacts {
  width: number;
  height: number;
  sizeBytes: number;
  frames: number;
  durationMs: number;
}

/** Lazily loaded facts: rules only download or call Discord when a condition needs it. */
export interface RuleFacts {
  /** The alias in the set. */
  name: string;
  file: () => Promise<RuleFileFacts>;
  /** Free slots of the file's type. */
  freeSlots: () => Promise<number>;
}

type TextOperator = Extract<RuleCondition, { field: "name" }>["operator"];

const matchText = (operator: TextOperator, value: string, text: string) => {
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

const matchNumber = (operator: "gt" | "lt", value: number, actual: number) =>
  operator === "gt" ? actual > value : actual < value;

const matchCondition = async (
  condition: RuleCondition,
  facts: RuleFacts
): Promise<boolean> => {
  switch (condition.field) {
    case "name":
      return matchText(condition.operator, condition.value, facts.name);
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
    case "duration_s":
      return matchNumber(
        condition.operator,
        condition.value,
        (await facts.file()).durationMs / 1000
      );
    case "frame_count":
      return matchNumber(
        condition.operator,
        condition.value,
        (await facts.file()).frames
      );
    case "free_slots":
      return matchNumber(condition.operator, condition.value, await facts.freeSlots());
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
