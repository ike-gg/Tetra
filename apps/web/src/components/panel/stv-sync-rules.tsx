import { useLayoutEffect, useRef } from "react";

import { Button, buttonClassName } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { cn } from "@/lib/cn";
import {
  costlyCondition,
  type DraftCondition,
  type DraftRule,
  FIELD_GROUPS,
  FIELDS,
  fieldsInGroup,
  newCondition,
  newRuleId,
  RULE_ACTIONS,
  RULE_LIMITS,
  RULE_PRESETS,
  type RuleAction,
  type RuleErrors,
  type RuleField,
  type RuleOperator,
  ruleFromPreset,
  rulesSignature,
  type SyncRule,
  toDraftRule,
  withField,
} from "@/lib/stv-sync-rules";

type RulesUpdate = (update: (rules: DraftRule[]) => DraftRule[]) => void;

type StvSyncRulesProps = {
  rules: DraftRule[];
  errors: RuleErrors;
  onChange: RulesUpdate;
  defaults: SyncRule[];
};

const css = (value: string) => value.replace(/["\\]/g, "\\$&");

/**
 * The rule builder: an ordered list of "if … and … then …" cards. Positions are the
 * numbers needs review shows ("it matched rule 2"), so disabled rules keep theirs.
 */
export function StvSyncRules({ rules, errors, onChange, defaults }: StvSyncRulesProps) {
  // Moving or removing re-renders the list; focus goes where the user expects it next
  const focusTarget = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!focusTarget.current) return;
    document.querySelector<HTMLElement>(focusTarget.current)?.focus();
    focusTarget.current = null;
  });
  const focusAfter = (selector: string) => {
    focusTarget.current = selector;
  };

  const full = rules.length >= RULE_LIMITS.rules;
  const defaultRules = defaults.map(toDraftRule);
  const isDefault =
    JSON.stringify(rulesSignature(rules)) ===
    JSON.stringify(rulesSignature(defaultRules));
  const taken = () => rules.map((rule) => rule.id);

  const add = (rule: DraftRule, focus: string) => {
    onChange((previous) => [...previous, rule]);
    focusAfter(`[data-rule-id="${css(rule.id)}"] ${focus}`);
  };

  const update = (id: string, change: (rule: DraftRule) => DraftRule) =>
    onChange((previous) =>
      previous.map((rule) => (rule.id === id ? change(rule) : rule))
    );

  const move = (index: number, by: -1 | 1) => {
    const rule = rules[index];
    onChange((previous) => {
      const next = [...previous];
      const [moved] = next.splice(index, 1);
      next.splice(index + by, 0, moved);
      return next;
    });
    focusAfter(
      `[data-rule-id="${css(rule.id)}"] [data-move="${by < 0 ? "up" : "down"}"]`
    );
  };

  const remove = (index: number) => {
    const neighbor = rules[index + 1] ?? rules[index - 1];
    onChange((previous) => previous.filter((_, position) => position !== index));
    focusAfter(
      neighbor
        ? `[data-rule-id="${css(neighbor.id)}"] [role="switch"]`
        : "[data-add-rule]"
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Text size="sm" tone="muted">
        when an emote is added to the 7TV set, rules run from top to bottom and the first
        one that matches decides what happens. an emote no rule matches is added as usual.
        rules don&apos;t run on retry
      </Text>

      {rules.length === 0 ? (
        <p className="m-0 border border-border border-dashed p-4 text-muted text-sm">
          no rules. every emote that gets past the filters is added as usual
        </p>
      ) : (
        <ol className="relative m-0 flex list-none flex-col gap-3 p-0">
          {rules.map((rule, index) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              position={index + 1}
              first={index === 0}
              last={index === rules.length - 1}
              errors={errors}
              onChange={(change) => update(rule.id, change)}
              onMove={(by) => move(index, by)}
              onRemove={() => remove(index)}
              focusAfter={focusAfter}
            />
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          data-add-rule=""
          disabled={full}
          focusableWhenDisabled
          onClick={() =>
            add(
              {
                id: newRuleId(taken()),
                enabled: true,
                action: "review",
                conditions: [newCondition()],
              },
              '[role="combobox"]'
            )
          }
        >
          + add rule
        </Button>
        <Menu
          onAction={(value) => {
            const preset = RULE_PRESETS.find(({ id }) => id === value);
            if (!preset) return;
            add(ruleFromPreset(preset, taken()), '[role="combobox"]');
          }}
        >
          <MenuTrigger
            disabled={full}
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: "data-open:bg-surface data-open:text-foreground",
            })}
          >
            from a preset
            <span aria-hidden="true" className="font-mono text-xs opacity-60">
              ▾
            </span>
          </MenuTrigger>
          <MenuContent side="bottom" align="start">
            {RULE_PRESETS.map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.label}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
        {!isDefault && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => onChange(() => defaultRules)}
          >
            reset rules to defaults
          </Button>
        )}
      </div>
      {full && (
        <Text size="xs" tone="muted">
          {RULE_LIMITS.rules} rules is the most. remove one to add another
        </Text>
      )}
    </div>
  );
}

type RuleCardProps = {
  rule: DraftRule;
  position: number;
  first: boolean;
  last: boolean;
  errors: RuleErrors;
  onChange: (change: (rule: DraftRule) => DraftRule) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
  focusAfter: (selector: string) => void;
};

function RuleCard({
  rule,
  position,
  first,
  last,
  errors,
  onChange,
  onMove,
  onRemove,
  focusAfter,
}: RuleCardProps) {
  const name = `rule ${position}`;
  const { conditions } = rule;
  const action = RULE_ACTIONS.find(({ value }) => value === rule.action);
  const canAddCondition = conditions.length < RULE_LIMITS.conditions;
  // A file or server check before a cheap one makes tetra fetch first for nothing
  const costlyFirst = conditions.some(
    (condition, index) =>
      costlyCondition(condition) &&
      conditions.slice(index + 1).some((later) => !costlyCondition(later))
  );

  const setCondition = (key: string, change: (c: DraftCondition) => DraftCondition) =>
    onChange((previous) => ({
      ...previous,
      conditions: previous.conditions.map((condition) =>
        condition.key === key ? change(condition) : condition
      ),
    }));

  const ruleSelector = `[data-rule-id="${css(rule.id)}"]`;

  return (
    <li
      data-rule-id={rule.id}
      aria-label={name}
      className="flex flex-col border border-border"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-border border-b py-2 pr-2 pl-4">
        <Switch
          label={name}
          description={rule.enabled ? undefined : "off. the sync passes over it"}
          checked={rule.enabled}
          onCheckedChange={(enabled) =>
            onChange((previous) => ({ ...previous, enabled }))
          }
          className="mr-auto flex-row-reverse items-center justify-end"
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            data-move="up"
            aria-label={`move ${name} up`}
            disabled={first}
            focusableWhenDisabled
            onClick={() => onMove(-1)}
            className="font-mono"
          >
            ↑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            data-move="down"
            aria-label={`move ${name} down`}
            disabled={last}
            focusableWhenDisabled
            onClick={() => onMove(1)}
            className="font-mono"
          >
            ↓
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`remove ${name}`}
            onClick={onRemove}
          >
            remove
          </Button>
        </div>
      </div>

      <div
        className={cn("relative flex flex-col gap-3 p-4", !rule.enabled && "opacity-60")}
      >
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {conditions.map((condition, index) => (
            <ConditionRow
              key={condition.key}
              condition={condition}
              label={`${name}, condition ${index + 1}`}
              lead={index === 0 ? "if" : "and"}
              error={errors.get(condition.key)}
              onChange={(change) => setCondition(condition.key, change)}
              onRemove={
                conditions.length > 1
                  ? () => {
                      const neighbor = conditions[index + 1] ?? conditions[index - 1];
                      onChange((previous) => ({
                        ...previous,
                        conditions: previous.conditions.filter(
                          ({ key }) => key !== condition.key
                        ),
                      }));
                      focusAfter(
                        `[data-condition="${css(neighbor.key)}"] [role="combobox"]`
                      );
                    }
                  : undefined
              }
            />
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-10">
          {canAddCondition ? (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`add a condition to ${name}`}
              className="-ml-2.5"
              onClick={() => {
                const condition = newCondition();
                onChange((previous) => ({
                  ...previous,
                  conditions: [...previous.conditions, condition],
                }));
                focusAfter(
                  `${ruleSelector} [data-condition="${css(condition.key)}"] [role="combobox"]`
                );
              }}
            >
              + and
            </Button>
          ) : (
            <Text size="xs" tone="muted">
              {RULE_LIMITS.conditions} conditions is the most for one rule
            </Text>
          )}
          {conditions.length > 1 && (
            <Text size="xs" tone="muted">
              all of them have to match
            </Text>
          )}
        </div>
        {costlyFirst && (
          <Text size="xs" tone="muted" className="pl-10">
            file and server checks make tetra download the emote or ask Discord first. put
            the other conditions above them, so it can stop early
          </Text>
        )}

        <div className="flex items-start gap-2 border-border border-t pt-3">
          <span className="w-8 shrink-0 pt-2.5 font-mono text-muted text-xs">then</span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Select<RuleAction>
              value={rule.action}
              onValueChange={(next) =>
                next && onChange((previous) => ({ ...previous, action: next }))
              }
            >
              <SelectTrigger aria-label={`${name}: what happens`} className="sm:w-56">
                <SelectValue className="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent>
                {RULE_ACTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    label={option.label}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {action && <span className="text-muted text-xs">{action.hint}</span>}
          </div>
        </div>
      </div>
    </li>
  );
}

type ConditionRowProps = {
  condition: DraftCondition;
  label: string;
  lead: string;
  error?: string;
  onChange: (change: (condition: DraftCondition) => DraftCondition) => void;
  onRemove?: () => void;
};

function ConditionRow({
  condition,
  label,
  lead,
  error,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const spec = FIELDS[condition.field];
  const { hint } = spec;

  return (
    <li data-condition={condition.key} className="flex items-start gap-2">
      <span className="w-8 shrink-0 pt-2.5 font-mono text-muted text-xs">{lead}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-start gap-2">
          <Select<RuleField>
            value={condition.field}
            onValueChange={(next) =>
              next && next !== condition.field && onChange((c) => withField(c, next))
            }
          >
            <SelectTrigger aria-label={`${label}: what to check`} className="sm:w-52">
              <SelectValue className="min-w-0 truncate" />
            </SelectTrigger>
            <SelectContent>
              {FIELD_GROUPS.map((group) => (
                <SelectGroup key={group.value}>
                  <SelectGroupLabel>{group.label}</SelectGroupLabel>
                  {fieldsInGroup(group.value).map((field) => (
                    <SelectItem key={field} value={field} label={FIELDS[field].label}>
                      {FIELDS[field].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

          {spec.operators.length > 1 && (
            <Select<RuleOperator>
              value={condition.operator}
              onValueChange={(next) =>
                next && onChange((c) => ({ ...c, operator: next }))
              }
            >
              <SelectTrigger
                aria-label={`${label}: how to compare`}
                className="w-auto min-w-28 flex-1 sm:w-56 sm:flex-none"
              >
                <SelectValue className="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent className="min-w-56">
                {spec.operators.map((operator) => (
                  <SelectItem
                    key={operator.value}
                    value={operator.value}
                    label={operator.label}
                  >
                    {operator.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ValueField
            condition={condition}
            label={`${label}: value`}
            error={error}
            onChange={(value) => onChange((c) => ({ ...c, value }))}
          />
        </div>
        {hint && !error && <span className="text-muted text-xs">{hint}</span>}
      </div>
      {onRemove && (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`remove ${label}`}
          onClick={onRemove}
          className="mt-0.5 font-mono"
        >
          ×
        </Button>
      )}
    </li>
  );
}

function ValueField({
  condition,
  label,
  error,
  onChange,
}: {
  condition: DraftCondition;
  label: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const { kind } = FIELDS[condition.field];

  return (
    <TextField
      label={label}
      hideLabel
      name="rule-value"
      value={condition.value}
      onValueChange={onChange}
      error={error}
      className="min-w-32 flex-1 basis-40"
      inputMode={
        kind.type === "number" ? (kind.integer ? "numeric" : "decimal") : undefined
      }
      suffix={kind.type === "number" ? kind.unit : undefined}
      placeholder={kind.type === "text" ? "text" : undefined}
    />
  );
}
