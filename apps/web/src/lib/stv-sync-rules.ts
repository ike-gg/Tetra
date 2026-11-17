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
  user: 64,
  users: 100,
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
    hint: "tetra adds it without checking the rules below. the aspect ratio, free slots and 256 KB still apply",
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

type ValueKind =
  | { type: "text" }
  | { type: "user" }
  | NumberKind
  | { type: "boolean"; yes: string; no: string };

type FieldSpec = {
  label: string;
  group: FieldGroup;
  operators: Option<RuleOperator>[];
  kind: ValueKind;
  defaultValue: string;
  /** Read from the downloaded file or from Discord, so tetra has to fetch first. */
  costly?: boolean;
};

export type FieldGroup = "name" | "origin" | "file" | "server";

export const FIELD_GROUPS: Option<FieldGroup>[] = [
  { value: "name", label: "name" },
  { value: "origin", label: "on 7TV" },
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
  { value: "matches_regex", label: "matches pattern" },
];

const USER_OPERATORS: Option<RuleOperator>[] = [
  { value: "is", label: "is" },
  { value: "is_not", label: "isn't" },
  { value: "in", label: "is one of" },
  { value: "not_in", label: "isn't one of" },
];

const COMPARE: Option<RuleOperator>[] = [
  { value: "gt", label: "over" },
  { value: "lt", label: "under" },
];

const BOOLEAN: Option<RuleOperator>[] = [{ value: "is", label: "is" }];

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
  },
  original_name: {
    label: "original 7TV name",
    group: "name",
    operators: TEXT_OPERATORS,
    kind: { type: "text" },
    defaultValue: "",
  },
  name_length: {
    label: "name length",
    group: "name",
    operators: [...COMPARE, { value: "eq", label: "exactly" }],
    kind: number("chars", 100, true),
    defaultValue: "20",
  },
  renamed: {
    label: "renamed in the set",
    group: "name",
    operators: BOOLEAN,
    kind: { type: "boolean", yes: "yes", no: "no" },
    defaultValue: "true",
  },
  author: {
    label: "author",
    group: "origin",
    operators: USER_OPERATORS,
    kind: { type: "user" },
    defaultValue: "",
  },
  added_by: {
    label: "added to the set by",
    group: "origin",
    operators: USER_OPERATORS,
    kind: { type: "user" },
    defaultValue: "",
  },
  tags: {
    label: "tags",
    group: "origin",
    operators: [
      { value: "contains", label: "include" },
      { value: "not_contains", label: "don't include" },
    ],
    kind: { type: "text" },
    defaultValue: "",
  },
  listed: {
    label: "listed on 7TV",
    group: "origin",
    operators: BOOLEAN,
    kind: { type: "boolean", yes: "yes", no: "no" },
    defaultValue: "false",
  },
  emote_age_days: {
    label: "age on 7TV",
    group: "origin",
    operators: COMPARE,
    kind: number("days", 36_500),
    defaultValue: "30",
  },
  width: {
    label: "width",
    group: "file",
    operators: COMPARE,
    kind: number("px", 10_000),
    defaultValue: "512",
    costly: true,
  },
  height: {
    label: "height",
    group: "file",
    operators: COMPARE,
    kind: number("px", 10_000),
    defaultValue: "512",
    costly: true,
  },
  aspect_ratio: {
    label: "aspect ratio",
    group: "file",
    operators: COMPARE,
    kind: number(":1", 100),
    defaultValue: "3",
    costly: true,
  },
  file_size_kb: {
    label: "file size",
    group: "file",
    operators: COMPARE,
    kind: number("KB", 10_240),
    defaultValue: "1024",
    costly: true,
  },
  frame_count: {
    label: "frames",
    group: "file",
    operators: COMPARE,
    kind: number("frames", 10_000, true),
    defaultValue: "100",
    costly: true,
  },
  duration_s: {
    label: "duration",
    group: "file",
    operators: COMPARE,
    kind: number("s", 3600),
    defaultValue: "10",
    costly: true,
  },
  free_slots: {
    label: "free slots",
    group: "server",
    operators: COMPARE,
    kind: number("slots", 250, true),
    defaultValue: "5",
    costly: true,
  },
  name_taken: {
    label: "name taken on the server",
    group: "server",
    operators: BOOLEAN,
    kind: { type: "boolean", yes: "yes", no: "no" },
    defaultValue: "true",
    costly: true,
  },
};

export const FIELD_HINTS: Partial<Record<RuleField, string>> = {
  name: "the name in the streamer's set",
  original_name: "the name the emote has on 7TV, before the streamer renamed it",
  renamed: "the streamer gave it another name in their set",
  author: "the 7TV user who made it, by username or id",
  added_by: "the 7TV user who added it to the set, by username or id",
  tags: "a tag on 7TV, as a whole word",
  listed: "approved by 7TV's moderators",
  aspect_ratio: "long side divided by the short side",
  free_slots: "of the emote's type, before it's added",
  name_taken: "the server already has an emote with this name",
};

export const fieldsInGroup = (group: FieldGroup) =>
  (Object.keys(FIELDS) as RuleField[]).filter((field) => FIELDS[field].group === group);

export type DraftCondition = {
  key: string;
  field: RuleField;
  operator: RuleOperator;
  /** Text as typed; booleans as "true" / "false", lists comma-separated. */
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

const formatValue = (value: RuleCondition["value"]) =>
  Array.isArray(value) ? value.join(", ") : String(value);

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

/** Comma separated, trimmed, without empties or duplicates. */
export const parseList = (text: string) => [
  ...new Set(
    text
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean)
  ),
];

// Mirrors core: a quantified group with a quantifier inside, like (a+)+, could stall it
const NESTED_QUANTIFIER = /\((?:[^()\\]|\\.)*[+*}](?:[^()\\]|\\.)*\)\s*(?:[+*]|\{\d+,)/;

const regexError = (pattern: string) => {
  if (NESTED_QUANTIFIER.test(pattern)) {
    return "nested repeats like (a+)+ could stall the sync. simplify the pattern";
  }
  try {
    new RegExp(pattern, "i");
    return undefined;
  } catch {
    return "that isn't a valid regular expression";
  }
};

type Parsed = { value: RuleCondition["value"]; error?: undefined } | { error: string };

const parseValue = ({ field, operator, value }: DraftCondition): Parsed => {
  const { kind } = FIELDS[field];
  const text = value.trim();

  switch (kind.type) {
    case "boolean":
      return { value: value === "true" };
    case "number": {
      const parsed = Number(text);
      if (text === "" || !Number.isFinite(parsed)) return { error: "enter a number" };
      if (kind.integer && !Number.isInteger(parsed))
        return { error: "use a whole number" };
      if (parsed < kind.min || parsed > kind.max) {
        return { error: `use a number from ${kind.min} to ${kind.max}` };
      }
      return { value: parsed };
    }
    case "user": {
      if (operator === "in" || operator === "not_in") {
        const users = parseList(text);
        if (users.length === 0) return { error: "enter one or more 7TV users" };
        if (users.length > RULE_LIMITS.users) {
          return { error: `up to ${RULE_LIMITS.users} users` };
        }
        if (users.some((user) => user.length > RULE_LIMITS.user)) {
          return { error: `each one can be up to ${RULE_LIMITS.user} characters` };
        }
        return { value: users };
      }
      if (text === "") return { error: "enter a 7TV username or id" };
      if (text.includes(","))
        return { error: "one user here. for a list, pick is one of" };
      if (text.length > RULE_LIMITS.user) {
        return { error: `up to ${RULE_LIMITS.user} characters` };
      }
      return { value: text };
    }
    case "text": {
      if (text === "") {
        return { error: field === "tags" ? "enter a tag" : "enter some text" };
      }
      if (text.length > RULE_LIMITS.text) {
        return { error: `up to ${RULE_LIMITS.text} characters` };
      }
      if (operator === "matches_regex") {
        const error = regexError(text);
        if (error) return { error };
      }
      return { value: text };
    }
  }
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
  {
    id: "renamed",
    label: "hold renamed emotes for review",
    conditions: [{ field: "renamed", operator: "is", value: "true" }],
    action: "review",
  },
  {
    id: "authors",
    label: "skip emotes by some authors",
    conditions: [{ field: "author", operator: "in", value: "" }],
    action: "skip",
  },
  {
    id: "added-by",
    label: "hold emotes someone else added",
    conditions: [{ field: "added_by", operator: "is_not", value: "" }],
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
