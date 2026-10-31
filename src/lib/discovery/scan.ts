import { distanceM, distanceToLinesM } from '../geo';
import type { LngLat, StreetSegment } from '../types';
import { CATEGORIES, categoryOf } from './categories';
import { isOffered } from './places';
import type { CategoryId, Mark, MarkOrigin, Offered, Place } from './types';

/** The scan's numbers (S3, S5, S7, S11). */
export const SCAN_RULES = {
  /** The circle: the farthest mark is a 10-15 minute walk. */
  radiusM: 500,
  count: 6,
  /** Marks at least this far apart. */
  spacingM: 100,
  /** None this close to where the scan was made. */
  clearM: 60,
  /** A mark shows its name within this of an accepted fix, and a capture this close finds it. */
  revealM: 60,
  /** Unresolved marks from a home scan expire silently after this. */
  homeDays: 14,
} as const;

export type Pref = 'more' | 'normal' | 'less';
/** Per category; a missing one is "normal". Stored in meta `discovery_prefs`. */
export type Prefs = Partial<Record<CategoryId, Pref>>;
export const PREF_WEIGHT: Record<Pref, number> = { more: 2, normal: 1, less: 0.5 };

export type ScanOutcome = 'full' | 'few' | 'none' | 'failed';

/** One item drawn by weight; null from an empty list. */
export function drawWeighted<T>(items: [T, number][], random: () => number): T | null {
  const total = items.reduce((s, [, w]) => s + w, 0);
  if (!items.length || total <= 0) return null;
  let r = random() * total;
  for (const [item, w] of items) {
    if ((r -= w) < 0) return item;
  }
  return items[items.length - 1][0];
}

function shuffle<T>(xs: T[], random: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks a scan's marks from the places around `center` (S2-S6, S15). Each
 * slot draws a category by preference weight, then a place in it; one or two
 * slots are wildcards, drawn with every category equal. Nothing in the result
 * says which slot was which (S4).
 */
export function pickMarks(o: {
  candidates: Place[];
  center: LngLat;
  offered: Offered[];
  prefs: Prefs;
  random?: () => number;
}): { picked: Place[]; outcome: Exclude<ScanOutcome, 'failed'> } {
  const random = o.random ?? Math.random;
  const seen = new Set<string>();
  const kept: Place[] = [];
  for (const p of o.candidates) {
    if (seen.has(p.key)) continue;
    seen.add(p.key);
    const d = distanceM(p.at, o.center);
    // A place keyed twice (it straddles a rounding line) is one place: the same test as Offered.
    if (d <= SCAN_RULES.radiusM && d > SCAN_RULES.clearM && !isOffered(p, o.offered) && !isOffered(p, kept)) kept.push(p);
  }
  let pool = kept;
  // The first slot is a wildcard, so even a scan with one mark has one (S3).
  const slots = ['wild', ...shuffle(['wild', 'match', 'match', 'match', 'match'], random)].slice(0, SCAN_RULES.count);
  const picked: Place[] = [];
  for (const slot of slots) {
    if (!pool.length) break;
    const present = CATEGORIES.map((c) => c.id).filter((id) => pool.some((p) => p.category === id));
    const category = drawWeighted(
      present.map((id) => [id, slot === 'wild' ? 1 : PREF_WEIGHT[o.prefs[id] ?? 'normal']] as [CategoryId, number]),
      random,
    )!;
    const inCategory = pool.filter((p) => p.category === category);
    const p = inCategory[Math.floor(random() * inCategory.length)];
    picked.push(p);
    pool = pool.filter((q) => distanceM(q.at, p.at) >= SCAN_RULES.spacingM);
  }
  const outcome = picked.length === 0 ? 'none' : picked.length < SCAN_RULES.count ? 'few' : 'full';
  return { picked: shuffle(picked, random), outcome };
}

/** A scan's candidates: the places just read, plus cached ones of this build (a purge may race a live read). */
export function candidatesFrom(read: Place[], cached: Place[], build: string): Place[] {
  const byKey = new Map<string, Place>();
  for (const p of cached) if (p.build === build) byKey.set(p.key, p);
  for (const p of read) byKey.set(p.key, p);
  return [...byKey.values()];
}

/** The marks a scan stores: a snapshot of each place, so a cache purge leaves them whole. */
export function marksFromScan(
  picked: Place[],
  o: { walkId: string | null; now: number; newId: () => string; origin?: MarkOrigin },
): Mark[] {
  return picked.map((p) => ({
    id: o.newId(),
    walk_id: o.walkId,
    key: p.key,
    name: p.name,
    category: p.category,
    at: p.at,
    generic: p.generic,
    origin: o.origin ?? 'scan',
    state: 'open',
    created_at: o.now,
    resolved_at: null,
    capture_id: null,
  }));
}

/** The Offered rows for a scan's picks, written at once (S6). */
export const offeredFrom = (picked: Place[], now: number, origin: MarkOrigin = 'scan'): Offered[] =>
  picked.map((p) => ({ key: p.key, name: p.name, category: p.category, at: p.at, generic: p.generic, offered_at: now, origin }));

/** A mark shows its name once an accepted fix came within 60 m, and stays shown once resolved (S7). */
export function isRevealed(mark: Mark, fixes: LngLat[]): boolean {
  if (mark.state !== 'open') return true;
  return fixes.some((f) => distanceM(f, mark.at) <= SCAN_RULES.revealM);
}

/** The open mark a capture at `at` finds: the nearest within 60 m (S8). */
export function foundBy(at: LngLat, marks: Mark[]): Mark | null {
  let best: Mark | null = null;
  let bestD = Infinity;
  for (const x of marks) {
    if (x.state !== 'open') continue;
    const d = distanceM(at, x.at);
    if (d <= SCAN_RULES.revealM && d < bestD) [best, bestD] = [x, d];
  }
  return best;
}

/** A re-scan replaces this walk's open marks (or the home's, with null); resolved ones stay (S10). */
export const toReplace = (marks: Mark[], walkId: string | null): string[] =>
  marks.filter((x) => x.walk_id === walkId && x.state === 'open').map((x) => x.id);

/** Home-scan marks the next walk adopts: open, and under 14 days old (S11). */
export const adoptable = (marks: Mark[], now: number): string[] =>
  marks
    .filter((x) => x.walk_id == null && x.state === 'open' && now - x.created_at < SCAN_RULES.homeDays * 86_400_000)
    .map((x) => x.id);

/** The card's line: finds by category, most first, then found and dismissed (S13). Null with neither. */
export function scanSummary(marks: Mark[]): { finds: string; found: number; dismissed: number } | null {
  const found = marks.filter((x) => x.state === 'found');
  const dismissed = marks.filter((x) => x.state === 'dismissed').length;
  if (!found.length && !dismissed) return null;
  const order = CATEGORIES.map((c) => c.id);
  const by = new Map<CategoryId, number>();
  for (const x of found) by.set(x.category, (by.get(x.category) ?? 0) + 1);
  const finds = [...by]
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([c, n]) => `${n} ${categoryOf(c).noun}`)
    .join(' · ');
  return { finds, found: found.length, dismissed };
}

/** What a scan says when it couldn't offer the full six (S15). */
export function scanNote(outcome: ScanOutcome, n: number): string | null {
  switch (outcome) {
    case 'full':
      return null;
    case 'few':
      return `Only ${n} ${n === 1 ? 'spot' : 'spots'} nearby`;
    case 'none':
      return 'Nothing to find here yet';
    case 'failed':
      return 'Couldn’t read the map here';
  }
}

/** A dismissed mark on the card: a low, kept in view, named by the nearest named street within 150 m (S9). */
export function passedOnLine(at: LngLat, segments: StreetSegment[]): string {
  let best: string | null = null;
  let bestD = 150;
  for (const x of segments) {
    if (!x.name) continue;
    const d = distanceToLinesM(at, x.geometry);
    if (d <= bestD) [best, bestD] = [x.name, d];
  }
  return best ? `Passed on: a mark near ${best}` : 'Passed on: a mark';
}
