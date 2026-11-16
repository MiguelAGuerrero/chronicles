// @layer core
import { distanceM } from '../geo';
import { metersPerPixel } from '../pins';
import type { LngLat } from '../types';
import { isDrawn } from './types';

/*
 * Shop marks, the pure side (SM4, SM5, SM10, SM12, SM14): a pack tile's features into places, the places into the marks a
 * map draws, which mark a tap hit. A place holds a shop type, a name, a position and a chain flag and nothing else: no
 * rating, popularity, hours or description can reach it, and nothing says it was visited, passed, found or done (SM18).
 */

export interface Shop {
  /** The shop's OpenStreetMap value, as the pack writes it. */
  type: string;
  name: string;
  at: LngLat;
  /** True only when the pack says so; never inferred from a name (SM5). */
  chain: boolean;
}

/** A mark on the map: every one is drawn alike. A merged mark stands for several shops and says no number (SM10). */
export interface Mark {
  at: LngLat;
  merged: boolean;
  /** The shop, for a mark that stands for one. */
  place?: Shop;
}

interface TileFeature {
  geometry?: { type: string; coordinates: unknown } | null;
  properties?: Record<string, unknown> | null;
}

/** SM4, SM9: a tile's features as places: a named point of a drawn type; every other field is dropped. */
export function shopsFromTile(features: readonly TileFeature[]): Shop[] {
  const out = new Map<string, Shop>();
  for (const f of features) {
    if (f.geometry?.type !== 'Point') continue;
    const c = f.geometry.coordinates;
    if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const p = f.properties ?? {};
    const type = typeof p.type === 'string' ? p.type : '';
    const name = typeof p.name === 'string' ? p.name.trim() : '';
    if (!name || !isDrawn(type)) continue;
    const at: LngLat = [c[0] as number, c[1] as number];
    out.set(`${type}|${name}|${at[0]}|${at[1]}`, { type, name, at, chain: p.chain === true });
  }
  return [...out.values()];
}

/** SM10: about this many pixels apart is where two marks become one. */
const MERGE_PX = 24;

/**
 * SM10: the marks for a zoom. Places closer than a few pixels merge into one mark at their middle; a lone place is a mark
 * with its place. No count is made, so nothing about a mark can vary with how many it stands for.
 */
export function thin(places: readonly Shop[], zoom: number): Mark[] {
  const sorted = [...places].sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1]);
  const groups: { at: LngLat; members: Shop[] }[] = [];
  for (const p of sorted) {
    const reach = metersPerPixel(zoom, p.at[1]) * MERGE_PX;
    const g = groups.find((x) => distanceM(x.at, p.at) <= reach);
    if (g) g.members.push(p);
    else groups.push({ at: p.at, members: [p] });
  }
  return groups.map((g) => {
    if (g.members.length === 1) return { at: g.members[0].at, merged: false, place: g.members[0] };
    const lon = g.members.reduce((s, m) => s + m.at[0], 0) / g.members.length;
    const lat = g.members.reduce((s, m) => s + m.at[1], 0) / g.members.length;
    return { at: [lon, lat] as LngLat, merged: true };
  });
}

/** SM14: the mark nearest a tap within its reach, merged or not, or none. */
export function nearest(marks: readonly Mark[], at: LngLat, radiusM: number): Mark | null {
  let best: Mark | null = null;
  let bestM = radiusM;
  for (const m of marks) {
    const d = distanceM(m.at, at);
    if (d <= bestM) {
      best = m;
      bestM = d;
    }
  }
  return best;
}

/** SM12: the places within `m` of you (the walk maps draw only these). */
export const withinOf = (places: readonly Shop[], you: LngLat, m: number): Shop[] => places.filter((p) => distanceM(p.at, you) <= m);

export type PressTarget = 'control' | 'pin' | 'mark' | 'zoom' | 'card' | 'none';

/**
 * SM14: what a tap on the map is for. The walker's controls, a capture pin and a mark (or a "?") take it before a
 * shop; a merged mark zooms in to separate; only a single mark opens its card.
 */
export function pressTarget(i: { control: boolean; capturePin: boolean; mark: boolean; shop: Mark | null }): PressTarget {
  if (i.control) return 'control';
  if (i.capturePin) return 'pin';
  if (i.mark) return 'mark';
  if (!i.shop) return 'none';
  return i.shop.merged ? 'zoom' : 'card';
}

/** SM12: the map's layers from the bottom up; the shop marks sit above the base map and under everything the walker meets. */
export const shopMarkOrder = (): string[] => ['base', 'storefront-lines', 'shop-marks', 'trace', 'route', 'storefront-names', 'mark-pins', 'capture-pins', 'dot'];

/**
 * SM14: what the map does with a tap that no pin, mark or control took: open a card, zoom a merged mark apart, close an open card
 * and do nothing else, or hand the tap on as the screen had it before.
 */
export function pressAction(i: { cardOpen: boolean; target: PressTarget }): 'card' | 'zoom' | 'close' | 'press' {
  if (i.target === 'card') return 'card';
  if (i.cardOpen) return 'close';
  return i.target === 'zoom' ? 'zoom' : 'press';
}
