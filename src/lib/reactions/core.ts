// @layer core
/**
 * Reactions (specs/reactions, RX4-RX5, RX9, RX16, RX28-RX29, RX33; decision 0172): why a moment mattered, chosen by the
 * owner on any moment, at most one per family. Never inferred, never counted, never said of a place: these functions
 * take stored reactions and the owner's taps, nothing about a moment's words, picture, time or place.
 */

export type Family = 'feeling' | 'taste' | 'thought';
export type ReactionId = 'happy' | 'neutral' | 'sad' | 'like' | 'dislike' | 'question' | 'emphasis' | 'idea';

/** `glyph` is an Ionicons name; `name` is what is shown and said; `lens` names the moments gathered by it (RX23). */
export type ReactionInfo = { id: ReactionId; family: Family; glyph: string; name: string; lens: string };

/** A moment's reactions: at most one per family (RX5). */
export type ReactionSet = Partial<Record<Family, ReactionId>>;

/** One stored row (RX28): truth, its own record, never a field of the moment. `reaction: null` clears the family. */
export type StoredReaction = { moment_id: string; family: string; reaction: string | null; set_at: number };

export const FAMILIES: readonly { id: Family; name: string }[] = [
  { id: 'feeling', name: 'Feeling' },
  { id: 'taste', name: 'Taste' },
  { id: 'thought', name: 'Thought' },
];

/** The set, in its fixed order (RX4): the families' order, then each family's. No reaction is ranked above another. */
export const REACTIONS: readonly ReactionInfo[] = [
  { id: 'happy', family: 'feeling', glyph: 'happy-outline', name: 'Happy', lens: 'Happy moments' },
  // Ionicons has no neutral face: a plain dash in a circle, a mark of no lean either way.
  { id: 'neutral', family: 'feeling', glyph: 'remove-circle-outline', name: 'Neutral', lens: 'Neutral moments' },
  { id: 'sad', family: 'feeling', glyph: 'sad-outline', name: 'Sad', lens: 'Sad moments' },
  { id: 'like', family: 'taste', glyph: 'thumbs-up-outline', name: 'Like', lens: 'Likes' },
  { id: 'dislike', family: 'taste', glyph: 'thumbs-down-outline', name: 'Dislike', lens: 'Dislikes' },
  { id: 'question', family: 'thought', glyph: 'help-circle-outline', name: 'Question', lens: 'Questions' },
  { id: 'emphasis', family: 'thought', glyph: 'alert-circle-outline', name: 'Emphasis', lens: 'Emphasis' },
  { id: 'idea', family: 'thought', glyph: 'bulb-outline', name: 'Idea', lens: 'Ideas' },
];

const BY_ID = new Map<string, ReactionInfo>(REACTIONS.map((r) => [r.id, r]));
const FAMILY_IDS = new Set<string>(FAMILIES.map((f) => f.id));

/** A stored value as a reaction: null for anything outside the set (a newer build's, a bad row), never an error. */
export function reactionOf(raw: unknown): ReactionId | null {
  return typeof raw === 'string' && BY_ID.has(raw) ? (raw as ReactionId) : null;
}

export function infoOf(id: ReactionId): ReactionInfo {
  return BY_ID.get(id)!;
}

/** The families with their reactions, in order: the panel's three rows (RX6). */
export function familyRows(): { id: Family; name: string; reactions: ReactionInfo[] }[] {
  return FAMILIES.map((f) => ({ ...f, reactions: REACTIONS.filter((r) => r.family === f.id) }));
}

export function familyName(id: Family): string {
  return FAMILIES.find((f) => f.id === id)!.name;
}

/** A tap (RX5): the reaction replaces its family's; the one already chosen clears it; the others are untouched. */
export function pick(set: ReactionSet, tapped: ReactionId): ReactionSet {
  const fam = infoOf(tapped).family;
  const out: ReactionSet = { ...set };
  if (out[fam] === tapped) delete out[fam];
  else out[fam] = tapped;
  return out;
}

/** A set's reactions in the families' order (RX14, RX17). */
export function ordered(set: ReactionSet): ReactionInfo[] {
  return REACTIONS.filter((r) => set[r.family] === r.id);
}

/** The sign on an entry (RX9): its first reaction in the families' order, or null for the face with a plus. */
export function signOf(set: ReactionSet): ReactionInfo | null {
  return ordered(set)[0] ?? null;
}

/** What is said after a moment's kind (RX16, RX21): each reaction's name in lower case, in order. */
export function spokenReactions(set: ReactionSet): string[] {
  return ordered(set).map((r) => r.name.toLowerCase());
}

/** The sign's spoken name (RX9, RX12): "Reaction, Happy", or "Reaction, none". */
export function signLabel(set: ReactionSet): string {
  return `Reaction, ${signOf(set)?.name ?? 'none'}`;
}

/** Whether two sets hold the same reactions. */
export function sameSet(a: ReactionSet, b: ReactionSet): boolean {
  return FAMILIES.every((f) => a[f.id] === b[f.id]);
}

/** The rows a change writes (RX8): one per family that differs, a cleared family as `null`. */
export function rowsFor(momentId: string, before: ReactionSet, after: ReactionSet, at: number): StoredReaction[] {
  return FAMILIES.filter((f) => before[f.id] !== after[f.id]).map((f) => ({ moment_id: momentId, family: f.id, reaction: after[f.id] ?? null, set_at: at }));
}

/** Stored rows as each moment's set (RX28): a bad value, or a reaction stored under another family, reads as none. */
export function setsOf(rows: readonly StoredReaction[]): Map<string, ReactionSet> {
  const out = new Map<string, ReactionSet>();
  for (const r of rows) {
    const id = reactionOf(r.reaction);
    if (!id || !FAMILY_IDS.has(r.family) || infoOf(id).family !== r.family) continue;
    const s = out.get(r.moment_id) ?? {};
    s[r.family as Family] = id;
    out.set(r.moment_id, s);
  }
  return out;
}

/** A moment's set as stored in a bundle (RX32): null for none. */
export function bundled(set: ReactionSet | undefined): ReactionSet | null {
  return set && ordered(set).length ? Object.fromEntries(ordered(set).map((r) => [r.family, r.id])) : null;
}

/**
 * Note types kept before become their moment's reactions (RX29), as both stores' upgrade steps do: each piece's type in
 * its family, the earliest piece winning; a value outside the set moves nothing. `set_at` is the piece's own time.
 */
export function migrateTypes(pieces: readonly { id: string; moment_id: string; t: number; note_type?: string | null }[]): StoredReaction[] {
  const out = new Map<string, StoredReaction>();
  for (const p of [...pieces].sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1))) {
    const id = reactionOf(p.note_type);
    if (!id) continue;
    const key = `${p.moment_id}|${infoOf(id).family}`;
    if (!out.has(key)) out.set(key, { moment_id: p.moment_id, family: infoOf(id).family, reaction: id, set_at: p.t });
  }
  return [...out.values()];
}
