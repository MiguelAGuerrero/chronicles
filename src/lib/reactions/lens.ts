// @layer core
/**
 * Lenses (RX23-RX27, decision 0172): the only code that gathers moments by a reaction. A lens is one list of moments,
 * oldest first, chosen by the owner's reactions alone; nothing here counts, ranks or groups by place or period.
 */
import { FAMILIES, REACTIONS, type Family, type ReactionId, type ReactionInfo, type ReactionSet } from './core';

export const LENS_EMPTY = 'When you react to a moment, it gathers here.';
export const LENS_LINE = 'Moments gathered by how you reacted';

export type LensGroup = { family: Family; name: string; rows: ReactionInfo[] };

/** The Reactions list (RX23): under each family, a row per reaction that a kept moment has, in the set's order. */
export function lensRows(sets: ReadonlyMap<string, ReactionSet>, kept: ReadonlySet<string>): LensGroup[] {
  const used = new Set<ReactionId>();
  for (const [id, set] of sets) {
    if (!kept.has(id)) continue;
    for (const f of FAMILIES) {
      const r = set[f.id];
      if (r) used.add(r);
    }
  }
  return FAMILIES.map((f) => ({ family: f.id, name: f.name, rows: REACTIONS.filter((r) => r.family === f.id && used.has(r.id)) }))
    .filter((g) => g.rows.length > 0);
}

/** A lens (RX24, RX26, RX27): the moments given that carry the reaction, oldest first. */
export function lensMoments<M extends { id: string; t: number }>(sets: ReadonlyMap<string, ReactionSet>, reaction: ReactionId, moments: readonly M[]): M[] {
  const fam = REACTIONS.find((r) => r.id === reaction)?.family;
  if (!fam) return [];
  return moments.filter((m) => sets.get(m.id)?.[fam] === reaction).sort((a, b) => a.t - b.t);
}

/** The ids a lens holds (RX24): to read just those moments. */
export function lensIds(sets: ReadonlyMap<string, ReactionSet>, reaction: ReactionId): string[] {
  const fam = REACTIONS.find((r) => r.id === reaction)?.family;
  if (!fam) return [];
  return [...sets].filter(([, s]) => s[fam] === reaction).map(([id]) => id);
}
