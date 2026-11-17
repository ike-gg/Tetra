import type { SyncSettings } from "@/lib/stv-sync";

export type SyncRule = SyncSettings["advancedRules"][number];
export type RuleCondition = SyncRule["conditions"][number];
export type RuleField = RuleCondition["field"];
export type RuleOperator = RuleCondition["operator"];
export type RuleAction = SyncRule["action"];

// Same limits as core's rule schema, so the form says what's wrong before saving
export const RULE_LIMITS = {
  rules: 25,
  conditions: 5,
  text: 100,
} as const;

export const RULE_ACTIONS: { value: RuleAction; label: string; hint: string }[] = [
  {
    value: "review",
    label: "hold for review",
    hint: "it shows up in needs review with this rule's number, and you decide",
  },
  {
    value: "skip",
    label: "skip",
    hint: "tetra leaves it alone. it won't show up in needs review",
  },
  {
    value: "add",
    label: "add",
    hint: "tetra adds it without checking the rules below. the max aspect ratio, free slots and 256 KB still apply",
  },
];

type Option<T> = { value: T; label: string };

type NumberKind = {
  type: "number";
  min: number;
  max: number;
  integer?: boolean;
  unit: string;
};

type ValueKind = { type: "text" } | NumberKind;

type FieldSpec = {
  label: string;
  group: FieldGroup;
  operators: Option<RuleOperator>[];
  kind: ValueKind;
  defaultValue: string;
  hint?: string;
  /** Read from the downloaded file or from Discord, so tetra has to fetch first. */
  costly?: boolean;
};

export type FieldGroup = "name" | "file" | "server";

export const FIELD_GROUPS: Option<FieldGroup>[] = [
  { value: "name", label: "name" },
  { value: "file", label: "file" },
  { value: "server", label: "server" },
];

const TEXT_OPERATORS: Option<RuleOperator>[] = [
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "doesn't contain" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
  { value: "equals", label: "is" },
  { value: "not_equals", label: "isn't" },
];

const COMPARE: Option<RuleOperator>[] = [
  { value: "gt", label: "over" },
  { value: "lt", label: "under" },
];

const number = (unit: string, max: number, integer = false): NumberKind => ({
  type: "number",
  min: 0,
  max,
  integer,
  unit,
});

export const FIELDS: Record<RuleField, FieldSpec> = {
  name: {
    label: "name",
    group: "name",
    operators: TEXT_OPERATORS,
    kind: { type: "text" },
    defaultValue: "",
    hint: "the name in the 7TV set, upper or lower case alike",
  },
  aspect_ratio: {
    label: "aspect ratio",
    group: "file",
    operators: COMPARE,
    kind: number(":1", 100),
    defaultValue: "3",
    hint: "long side divided by the short side",
    costly: true,
  },
  file_size_kb: {
    label: "file size",
    group: "file",
    operators: COMPARE,
    kind: number("KB", 10_240),
    defaultValue: "1024",
    hint: "the file on 7TV, before tetra optimizes it. 1024 KB is 1 MB",
    costly: true,
  },
  duration_s: {
    label: "duration",
    group: "file",
    operators: COMPARE,
    kind: number("s", 3600),
    defaultValue: "10",
    hint: "static emotes count as 0 s",
    costly: true,
  },
  frame_count: {
    label: "frames",
    group: "file",
    operators: COMPARE,
    kind: number("frames", 10_000, true),
    defaultValue: "100",
    hint: "static emotes count as 1 frame",
    costly: true,
  },
  free_slots: {
    label: "free slots",
    group: "server",
    operators: COMPARE,
    kind: number("slots", 250, true),
    defaultValue: "5",
    hint: "of the emote's type, before it's added",
    costly: true,
  },
};

export const fieldsInGroup = (group: FieldGroup) =>
  (Object.keys(FIELDS) as RuleField[]).filter((field) => FIELDS[field].group === group);

export type DraftCondition = {
  key: string;
  field: RuleField;
  operator: RuleOperator;
  /** As typed. */
  value: string;
};

export type DraftRule = {
  id: string;
  enabled: boolean;
  action: RuleAction;
  conditions: DraftCondition[];
};

const randomId = () => Math.random().toString(36).slice(2, 10);

/** Core wants 1–32 chars of `[A-Za-z0-9_-]`, unique in the list. */
export const newRuleId = (taken: Iterable<string>) => {
  const used = new Set(taken);
  let id = `rule-${randomId()}`;
  while (used.has(id)) id = `rule-${randomId()}`;
  return id;
};

const newConditionKey = () => `c-${randomId()}`;

export const newCondition = (field: RuleField = "name"): DraftCondition => ({
  key: newConditionKey(),
  field,
  operator: FIELDS[field].operators[0].value,
  value: FIELDS[field].defaultValue,
});

/** Another field means another kind of value: start that field over from its defaults. */
export const withField = (
  condition: DraftCondition,
  field: RuleField
): DraftCondition => ({
  ...newCondition(field),
  key: condition.key,
});

const formatValue = (value: RuleCondition["value"]) => String(value);

export const toDraftRule = (rule: SyncRule): DraftRule => ({
  id: rule.id,
  enabled: rule.enabled,
  action: rule.action,
  conditions: rule.conditions.map((condition) => ({
    key: newConditionKey(),
    field: condition.field,
    operator: condition.operator,
    value: formatValue(condition.value),
  })),
});

type Parsed = { value: RuleCondition["value"]; error?: undefined } | { error: string };

const parseValue = ({ field, value }: DraftCondition): Parsed => {
  const { kind } = FIELDS[field];
  const text = value.trim();

  if (kind.type === "text") {
    if (text === "") return { error: "enter some text" };
    if (text.length > RULE_LIMITS.text) {
      return { error: `up to ${RULE_LIMITS.text} characters` };
    }
    return { value: text };
  }

  const parsed = Number(text);
  if (text === "" || !Number.isFinite(parsed)) return { error: "enter a number" };
  if (kind.integer && !Number.isInteger(parsed)) return { error: "use a whole number" };
  if (parsed < kind.min || parsed > kind.max) {
    return { error: `use a number from ${kind.min} to ${kind.max}` };
  }
  return { value: parsed };
};

/** Errors by condition key; empty when the rules can be saved. */
export type RuleErrors = Map<string, string>;

export const toRules = (drafts: DraftRule[]) => {
  const errors: RuleErrors = new Map();
  const rules = drafts.map((draft) => ({
    id: draft.id,
    enabled: draft.enabled,
    action: draft.action,
    conditions: draft.conditions.flatMap((condition) => {
      const parsed = parseValue(condition);
      if (parsed.error !== undefined) {
        errors.set(condition.key, parsed.error);
        return [];
      }
      // The field, operator and value kinds come from FIELDS, which follows core's union;
      // TypeScript can't tie the three together on its own
      return [
        {
          field: condition.field,
          operator: condition.operator,
          value: parsed.value,
        } as RuleCondition,
      ];
    }),
  }));
  return { rules, errors };
};

/**
 * The drafts with their values as core will store them (trimmed, "3.0" as "3"), keys
 * kept: after a save the form matches the saved settings without remounting a row.
 */
export const normalizeRules = (drafts: DraftRule[]): DraftRule[] =>
  drafts.map((draft) => ({
    ...draft,
    conditions: draft.conditions.map((condition) => {
      const parsed = parseValue(condition);
      return parsed.error === undefined
        ? { ...condition, value: formatValue(parsed.value) }
        : condition;
    }),
  }));

/** What decides "changed": everything but the client-side condition keys. */
export const rulesSignature = (drafts: DraftRule[]) =>
  drafts.map(({ conditions, ...rule }) => ({
    ...rule,
    conditions: conditions.map(({ field, operator, value }) => [field, operator, value]),
  }));

/** Rules that read the file or the server make tetra fetch them before the next check. */
export const costlyCondition = (condition: DraftCondition) =>
  Boolean(FIELDS[condition.field].costly);

type Preset = {
  id: string;
  label: string;
  conditions: Omit<DraftCondition, "key">[];
  action: RuleAction;
};

export const RULE_PRESETS: Preset[] = [
  {
    id: "long-animations",
    label: "hold long animations for review",
    conditions: [{ field: "duration_s", operator: "gt", value: "10" }],
    action: "review",
  },
  {
    id: "big-files",
    label: "hold big files for review",
    conditions: [{ field: "file_size_kb", operator: "gt", value: "1024" }],
    action: "review",
  },
];

export const ruleFromPreset = (preset: Preset, taken: Iterable<string>): DraftRule => ({
  id: newRuleId(taken),
  enabled: true,
  action: preset.action,
  conditions: preset.conditions.map((condition) => ({
    ...condition,
    key: newConditionKey(),
  })),
});
