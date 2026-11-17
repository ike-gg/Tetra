export type SimilarKind =
  | "duplicate"
  | "numbered"
  | "near"
  | "prefix"
  | "suffix"
  | "contains";

export type SimilarGroup = {
  /** The reason and its stem, stable while the names stay alike (`prefix:peepo`). */
  key: string;
  kind: SimilarKind;
  /** The shared stem as people read it: `KEKW`, `peepo*`, `*JAM`, `*Clap*`. */
  title: string;
  /** Why these names were grouped, in voice.md's words. */
  reason: string;
  emoteIds: string[];
};

type NamedEmote = { id: string; name: string };

// Strongest first: the order groups are listed in, and which one wins when two groups
// have the same members
const STRENGTH: Record<SimilarKind, number> = {
  duplicate: 0,
  numbered: 1,
  near: 2,
  prefix: 3,
  suffix: 4,
  contains: 5,
};

const MIN_STEM = 3;
const MIN_LOOSE_STEM = 4;

const LEET: Record<string, string> = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t" };

// camelCase, PascalCase and ALLCAPS runs: `catJAM` → cat JAM, `KEKWait` → KEK Wait
const TOKEN = /[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|\d+/g;

export const tokenizeEmoteName = (name: string) => name.match(TOKEN) ?? [];

// Only digits inside a word are look-alike letters; a trailing digit is a version (`pog2`)
const foldLeet = (name: string) =>
  name.replace(/(?<=[a-z])[013457](?=[a-z])/gi, (digit) => LEET[digit] ?? digit);

const collapseRepeats = (text: string) => text.replace(/([a-z])\1+/g, "$1");

// Case, separators, look-alike digits and doubled letters don't make a different name
const looseForm = (name: string) =>
  collapseRepeats(
    foldLeet(name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
  );

const baseForm = (loose: string) => {
  const base = loose.replace(/\d+$/, "");
  return base.length >= 2 ? base : loose;
};

type Entry = {
  id: string;
  name: string;
  loose: string;
  base: string;
  /** Lowercased word tokens, without number tokens. */
  words: string[];
  /** The original tokens matching `words`, for titles in the emote's own casing. */
  wordsRaw: string[];
};

const toEntry = ({ id, name }: NamedEmote): Entry => {
  const loose = looseForm(name);
  const wordsRaw = tokenizeEmoteName(name).filter((token) => !/^\d+$/.test(token));
  return {
    id,
    name,
    loose,
    base: baseForm(loose),
    words: wordsRaw.map((token) => token.toLowerCase()),
    wordsRaw,
  };
};

// Optimal string alignment distance (Damerau-Levenshtein without repeated edits of one
// substring), giving up once every path is over `max`
export const editDistance = (a: string, b: string, max = Infinity) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previousRow: number[] = [];
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, previousRow[j - 2] + 1);
      }
      next[j] = value;
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
    previousRow = row;
    row = next;
  }
  return row[b.length];
};

const allowedDistance = (longer: number) => (longer >= 8 ? 2 : 1);

// A letter apart is a typo in a long word but a different word in a short one:
// `peepoSad` and `peepoMad` differ only in a three-letter word, so they're a family,
// not a near-duplicate
const nearDistance = (a: Entry, b: Entry) => {
  const shorter = Math.min(a.base.length, b.base.length);
  const longer = Math.max(a.base.length, b.base.length);
  if (shorter < MIN_LOOSE_STEM) return null;
  const max = allowedDistance(longer);
  const distance = editDistance(a.base, b.base, max);
  if (distance > max || distance / longer > 0.25) return null;

  if (a.words.length === b.words.length && a.words.length > 1) {
    const differing = a.words.flatMap((word, index) =>
      word === b.words[index] ? [] : [[word, b.words[index]] as const]
    );
    if (
      differing.length === 1 &&
      Math.min(differing[0][0].length, differing[0][1].length) < MIN_LOOSE_STEM
    ) {
      return null;
    }
  }
  return distance;
};

const createUnionFind = (size: number) => {
  const parent = Array.from({ length: size }, (_, index) => index);
  const find = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  return {
    find,
    union: (a: number, b: number) => {
      parent[find(a)] = find(b);
    },
  };
};

const mostCommon = (values: string[]) => {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = values[0];
  for (const [value, count] of counts) {
    const bestCount = counts.get(best) ?? 0;
    if (count > bestCount || (count === bestCount && value < best)) best = value;
  }
  return best;
};

const sortedText = (values: string[]) =>
  [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const joinWords = (words: string[]) =>
  words.length <= 1
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;

// Says what actually differs, so "the same name apart from case" isn't a guess
const duplicateReason = (members: Entry[]) => {
  const names = members.map(({ name }) => name);
  if (new Set(names).size === 1) return "the exact same name";
  const lower = names.map((name) => name.toLowerCase());
  if (new Set(lower).size === 1) return "the same name in different case";

  const differences: string[] = [];
  if (new Set(lower).size < new Set(names).size) differences.push("case");
  const plain = lower.map((name) => name.replace(/[^a-z0-9]/g, ""));
  if (new Set(plain).size < new Set(lower).size) differences.push("underscores");
  const folded = plain.map(foldLeet);
  if (new Set(folded).size < new Set(plain).size) differences.push("look-alike digits");
  if (new Set(folded.map(collapseRepeats)).size < new Set(folded).size) {
    differences.push("doubled letters");
  }
  return differences.length > 0
    ? `the same name apart from ${joinWords(differences)}`
    : "nearly the same name";
};

const shortestName = (members: Entry[]) =>
  members
    .map(({ name }) => name)
    .sort((a, b) => a.length - b.length || a.localeCompare(b))[0];

const clusterGroup = (members: Entry[], maxDistance: number): SimilarGroup => {
  const ids = members.map(({ id }) => id);
  const looseForms = new Set(members.map(({ loose }) => loose));
  const bases = new Set(members.map(({ base }) => base));

  if (looseForms.size === 1) {
    return {
      key: `duplicate:${members[0].loose}`,
      kind: "duplicate",
      title: shortestName(members),
      reason: duplicateReason(members),
      emoteIds: ids,
    };
  }
  if (bases.size === 1) {
    const title = shortestName(members).replace(/[_-]*\d+$/, "");
    return {
      key: `numbered:${members[0].base}`,
      kind: "numbered",
      title: title || shortestName(members),
      reason: "the same name apart from a number",
      emoteIds: ids,
    };
  }
  const numbers = members.some(({ loose, base }) => loose !== base);
  return {
    key: `near:${sortedText([...bases])[0]}`,
    kind: "near",
    title: shortestName(members),
    reason: `nearly the same name, ${maxDistance > 1 ? "up to two letters" : "one letter"} apart${numbers ? ", numbers aside" : ""}`,
    emoteIds: ids,
  };
};

const groupBy = <T>(items: T[], keyOf: (item: T) => string) => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()];
};

const findClusters = (entries: Entry[]): SimilarGroup[] => {
  // Distances run on distinct bases only: a server with ten `pog` variants costs one row
  const bases = groupBy(entries, ({ base }) => base);
  const sets = createUnionFind(bases.length);
  const edges: [number, number][] = [];
  for (let i = 0; i < bases.length; i++) {
    for (let j = i + 1; j < bases.length; j++) {
      const distance = nearDistance(bases[i][0], bases[j][0]);
      if (distance === null) continue;
      sets.union(i, j);
      edges.push([i, distance]);
    }
  }

  const maxDistance = new Map<number, number>();
  for (const [i, distance] of edges) {
    const root = sets.find(i);
    maxDistance.set(root, Math.max(maxDistance.get(root) ?? 0, distance));
  }

  const groups: SimilarGroup[] = [];
  const clusters = groupBy(
    bases.map((members, index) => ({ members, root: sets.find(index) })),
    ({ root }) => String(root)
  );
  for (const cluster of clusters) {
    const members = cluster.flatMap(({ members }) => members);
    if (members.length < 2) continue;
    groups.push(clusterGroup(members, maxDistance.get(cluster[0].root) ?? 0));
    // The stronger signals inside a looser cluster get their own group too
    for (const same of groupBy(members, ({ loose }) => loose)) {
      if (same.length >= 2) groups.push(clusterGroup(same, 0));
    }
    for (const { members: numbered } of cluster) {
      if (numbered.length >= 2) groups.push(clusterGroup(numbered, 0));
    }
  }
  return groups;
};

// One shared word stays a useful family until it covers most of the server: then it's
// the server's theme, not something to tidy up
const tooCommon = (size: number, total: number, share: number) =>
  total >= 8 && size > total * share;

type Family = { entries: Entry[]; raw: string[] };

const addTo = (
  families: Map<string, Family>,
  stem: string,
  entry: Entry,
  raw: string
) => {
  const family = families.get(stem) ?? { entries: [], raw: [] };
  if (!family.entries.includes(entry)) {
    family.entries.push(entry);
    family.raw.push(raw);
  }
  families.set(stem, family);
};

const findFamilies = (entries: Entry[]): SimilarGroup[] => {
  const prefixes = new Map<string, Family>();
  const suffixes = new Map<string, Family>();
  const contained = new Map<string, Family>();

  for (const entry of entries) {
    const [first] = entry.words;
    if (first && first.length >= MIN_STEM && entry.words.length > 1) {
      addTo(prefixes, first, entry, entry.wordsRaw[0]);
    }
    const last = entry.words.at(-1);
    if (last && last.length >= MIN_STEM && entry.words.length > 1) {
      addTo(suffixes, last, entry, entry.wordsRaw.at(-1) ?? last);
    }
    entry.words.forEach((word, index) => {
      if (word.length >= MIN_LOOSE_STEM && entry.words.length > 1) {
        addTo(contained, word, entry, entry.wordsRaw[index]);
      }
    });
  }

  // A name that's one lowercase word (`pepega`, `peepohappy`) can't be split, so it joins
  // the longest family stem it starts with, unless its first word has a family of its own
  const stems = [...prefixes.keys()]
    .filter((stem) => stem.length >= MIN_LOOSE_STEM)
    .sort((a, b) => b.length - a.length);
  const ownFamilySizes = new Map(
    [...prefixes].map(([stem, family]) => [stem, family.entries.length])
  );
  for (const entry of entries) {
    const [first] = entry.words;
    const inOwnFamily = entry.words.length > 1;
    if (!first || (inOwnFamily && (ownFamilySizes.get(first) ?? 0) >= 2)) continue;
    const stem = stems.find(
      (candidate) => first.startsWith(candidate) && !(inOwnFamily && candidate === first)
    );
    if (stem) addTo(prefixes, stem, entry, entry.name.slice(0, stem.length));
  }

  const total = entries.length;
  const groups: SimilarGroup[] = [];
  for (const [stem, { entries: members, raw }] of prefixes) {
    if (members.length < 2 || tooCommon(members.length, total, 0.5)) continue;
    const title = mostCommon(raw);
    groups.push({
      key: `prefix:${stem}`,
      kind: "prefix",
      title: `${title}*`,
      reason: `all start with ${title}`,
      emoteIds: members.map(({ id }) => id),
    });
  }
  for (const [stem, { entries: members, raw }] of suffixes) {
    if (members.length < 2 || tooCommon(members.length, total, 0.5)) continue;
    const title = mostCommon(raw);
    groups.push({
      key: `suffix:${stem}`,
      kind: "suffix",
      title: `*${title}`,
      reason: `all end with ${title}`,
      emoteIds: members.map(({ id }) => id),
    });
  }
  for (const [stem, { entries: members, raw }] of contained) {
    if (members.length < 2 || tooCommon(members.length, total, 0.25)) continue;
    // Already said by "all start with" or "all end with" the same word
    const covered = [prefixes.get(stem), suffixes.get(stem)].some(
      (family) => family && members.every((entry) => family.entries.includes(entry))
    );
    if (covered) continue;
    const title = mostCommon(raw);
    groups.push({
      key: `contains:${stem}`,
      kind: "contains",
      title: `*${title}*`,
      reason: `all have ${title} in the name`,
      emoteIds: members.map(({ id }) => id),
    });
  }
  return groups;
};

/**
 * Groups emotes whose names look alike, by name alone: duplicates once case, separators,
 * look-alike digits and doubled letters are ignored; the same name apart from a number;
 * names a letter or two apart; and families sharing a first word, last word or a word
 * inside. Pairwise distances make it O(n²) over distinct names: fine for a server's few
 * hundred emotes.
 */
export function findSimilarEmoteGroups(emotes: NamedEmote[]): SimilarGroup[] {
  const entries = emotes.filter(({ name }) => name.length > 0).map(toEntry);
  const candidates = [...findClusters(entries), ...findFamilies(entries)].sort(
    (a, b) =>
      STRENGTH[a.kind] - STRENGTH[b.kind] ||
      b.emoteIds.length - a.emoteIds.length ||
      a.title.localeCompare(b.title)
  );

  const order = new Map(emotes.map(({ id }, index) => [id, index]));
  const seen = new Set<string>();
  const groups: SimilarGroup[] = [];
  for (const group of candidates) {
    const membership = sortedText(group.emoteIds).join(",");
    if (seen.has(membership)) continue;
    seen.add(membership);
    groups.push({
      ...group,
      emoteIds: [...group.emoteIds].sort(
        (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)
      ),
    });
  }
  return groups;
}

/** Changes when an emote joins or leaves the group, so a dismissed group comes back then. */
export const similarGroupDismissKey = (group: SimilarGroup) =>
  `${group.key}|${sortedText(group.emoteIds).join(",")}`;

/**
 * The groups after emotes left the server: each loses its removed members and goes once
 * fewer than two remain. Regrouping instead could merge a shrunk group into another
 * with the same members, so the group someone is tidying would vanish mid-way.
 */
export const pruneSimilarGroups = (groups: SimilarGroup[], present: Set<string>) =>
  groups.flatMap((group) => {
    const emoteIds = group.emoteIds.filter((id) => present.has(id));
    return emoteIds.length >= 2 ? [{ ...group, emoteIds }] : [];
  });
