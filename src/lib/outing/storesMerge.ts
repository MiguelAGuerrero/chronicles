// @layer core
import { distanceM } from '../geo';
import { isChain } from '../discovery/noise';
import { normalizeName } from '../discovery/places';
import type { LngLat } from '../types';
import type { Candidate, Facets } from './candidates';
import { asCandidate, type Store } from './stores';

/** A shop the map's own tiles carry (the fallback): its name, position and presence classes. */
export interface TileShop {
  name: string;
  at: LngLat;
  classes?: readonly string[];
}

/** QC15: one place within this distance for the same name is one stop. */
export const SAME_SHOP_M = 200;

/** QC14: what the tiles' presence classes say a shop sells, for the same table (a class without an entry says nothing). */
const TILE_FACETS: Readonly<Record<string, Facets>> = {
  antiques: { what: ['antiques'] },
  books: { what: ['books'] },
  // A charity or second-hand shop is `second_hand` (the contract's value; a curated vintage dealer is the pack's to say).
  second_hand: { what: ['second_hand'] },
};

function tileFacets(classes: readonly string[] | undefined): Facets | null {
  const out: Record<string, string[]> = {};
  for (const c of classes ?? []) {
    for (const [dim, vs] of Object.entries(TILE_FACETS[c] ?? {})) for (const v of vs) if (!(out[dim] ??= []).includes(v)) out[dim].push(v);
  }
  return Object.keys(out).length ? out : null;
}

/**
 * QC13, QC15, QC31: the pack's stores and the tiles' shops as candidates, one place once with the pack's record kept by rule (never by
 * a field of either), and a chain a candidate only when `opts.chains` is on (QC13, QC41; off by default). Read only by `outing/`.
 */
export function outingCandidates(stores: readonly Store[], tiles: readonly TileShop[], opts: { chains?: boolean } = {}): Candidate[] {
  const chainsOk = opts.chains === true;
  const packed = stores.filter((s) => chainsOk || !isChain(s.name, 'shops')).map(asCandidate);
  const out: Candidate[] = [...packed];
  for (const t of tiles) {
    const facets = tileFacets(t.classes);
    if (!facets || (!chainsOk && isChain(t.name, 'shops'))) continue;
    const n = normalizeName(t.name);
    if (packed.some((p) => normalizeName(p.name) === n && distanceM(p.at, t.at) <= SAME_SHOP_M)) continue;
    const id = `t:${n}@${t.at[0].toFixed(4)},${t.at[1].toFixed(4)}`;
    if (out.some((o) => o.id === id)) continue;
    out.push({ id, at: t.at, facets, name: t.name });
  }
  return out;
}
