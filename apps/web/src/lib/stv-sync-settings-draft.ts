import { useEffect, useRef, useState } from "react";

import type { SyncSettings } from "@/lib/stv-sync";
import { useSaveSyncSettings } from "@/lib/stv-sync-mutations";
import {
  type DraftRule,
  normalizeRules,
  rulesSignature,
  toDraftRule,
  toRules,
} from "@/lib/stv-sync-rules";

// What the form edits. The excluded ids aren't in it: they change from needs review and
// are cleared on their own, so a draft never holds a stale copy
export type SettingsDraft = {
  filters: SyncSettings["filters"];
  maxAspectRatio: number;
  rules: DraftRule[];
};

export const toSettingsDraft = (settings: SyncSettings): SettingsDraft => ({
  filters: settings.filters,
  maxAspectRatio: settings.optimization.maxAspectRatio,
  rules: settings.advancedRules.map(toDraftRule),
});

const signature = (draft: SettingsDraft) =>
  JSON.stringify({ ...draft, rules: rulesSignature(draft.rules) });

export type SettingsForm = ReturnType<typeof useSyncSettingsDraft>;

/**
 * The settings form's state, shared by the form and the save bar. A draft with changes
 * survives a refetch that brings other saved settings; a clean one follows them.
 */
export function useSyncSettingsDraft(guildId: string, saved: SyncSettings) {
  const [draft, setDraftState] = useState(() => toSettingsDraft(saved));
  const save = useSaveSyncSettings(guildId);

  const savedSignature = signature(toSettingsDraft(saved));
  const draftSignature = signature(draft);
  const dirty = draftSignature !== savedSignature;

  const previousSaved = useRef(savedSignature);
  useEffect(() => {
    if (previousSaved.current === savedSignature) return;
    const wasClean = previousSaved.current === draftSignature;
    previousSaved.current = savedSignature;
    if (wasClean) setDraftState(toSettingsDraft(saved));
  }, [savedSignature, draftSignature, saved]);

  const { rules, errors } = toRules(draft.rules);
  const valid = errors.size === 0;

  const setDraft = (update: (previous: SettingsDraft) => SettingsDraft) => {
    setDraftState(update);
    save.reset();
  };

  return {
    draft,
    setDraft,
    dirty,
    valid,
    errors,
    saving: save.isPending,
    saveError: save.error,
    save: () => {
      if (!dirty || !valid || save.isPending) return;
      setDraftState((previous) => ({
        ...previous,
        rules: normalizeRules(previous.rules),
      }));
      save.mutate({
        filters: draft.filters,
        excludedEmoteIds: saved.excludedEmoteIds,
        optimization: { maxAspectRatio: draft.maxAspectRatio },
        advancedRules: rules,
      });
    },
    discard: () => setDraft(() => toSettingsDraft(saved)),
    isDefault: (defaults: SyncSettings) =>
      draftSignature === signature(toSettingsDraft(defaults)),
  };
}
