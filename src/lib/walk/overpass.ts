// @layer core
import type { LngLat } from '../types';
import type { Side, WayFacts } from './types';

/*
 * The Overpass API's side of walkability (WK1b): the only file that knows its query and answer. The
 * fallback when Overture can't be read, and the only source of an explicit "no sidewalk" (WK8b).
 */

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
export const OVERPASS_TIMEOUT_S = 10;

/**
 * Answers that mean "busy, ask later" (WK4; fix overpass-hardening): rate limited (429), overloaded (502, 503)
 * and timed out (504). The public instance bans applications that keep asking through them.
 */
export const OVERPASS_BUSY: readonly number[] = [429, 502, 503, 504];

/**
 * A Retry-After header as seconds to wait (its seconds form, or its HTTP-date form against `now`), or null when
 * absent or unreadable. Browsers hide the header on a cross-origin answer unless the server exposes it, so on
 * the web it is usually null.
 */
export function retryAfterS(header: string | null | undefined, now: number): number | null {
  if (header == null) return null;
  if (/^\s*\d+\s*$/.test(header)) return Number(header);
  // An HTTP date always says GMT; without a zone, Date.parse would read the device's time zone.
  if (!/\bGMT\b/.test(header)) return null;
  const at = Date.parse(header);
  return Number.isFinite(at) ? Math.max(0, Math.ceil((at - now) / 1000)) : null;
}

/** An answer Overpass sent as 200 that is a failure: a query that timed out or ran out of memory says so in `remark`. */
export function overpassRuntimeError(json: unknown): boolean {
  const remark = (json as { remark?: unknown } | null)?.remark;
  return typeof remark === 'string' && /^\s*runtime error/i.test(remark);
}

/**
 * How long to stay quiet after the `strikes`-th busy answer in a row (1-based): `base`, doubling each time,
 * never past `max`, and never shorter than what the server asked for, up to an hour (a garbled header can't
 * silence the fallback until a restart).
 */
export const RETRY_AFTER_MAX_MS = 3_600_000;

export function overpassPause(strikes: number, base: number, max: number, retryAfter: number | null = null): number {
  const grown = Math.min(base * 2 ** Math.max(0, strikes - 1), max);
  return Math.max(grown, retryAfter != null ? Math.min(retryAfter * 1000, RETRY_AFTER_MAX_MS) : 0);
}

/** WK1: the tile's bounds (south, west, north, east) and nothing else. */
export const overpassQuery = (s: number, w: number, n: number, e: number) => `[out:json][timeout:${OVERPASS_TIMEOUT_S}];way["highway"](${s},${w},${n},${e});out tags geom;`;

type Tags = Record<string, string>;
interface El {
  type: string;
  id: number;
  tags?: Tags;
  geometry?: { lat: number; lon: number }[];
}

const yes = (v: string | undefined) => v === 'yes' || v === 'both' || v === 'left' || v === 'right' || v === 'separate';
const no = (v: string | undefined) => v === 'no' || v === 'none';

/** `sidewalk`, or `sidewalk:both|left|right`, as one of the sides; undefined where it says nothing. */
function sidewalkOf(t: Tags): Side | undefined {
  const s = t.sidewalk;
  if (s === 'separate') return 'separate';
  if (yes(s) && s !== 'yes') return s as Side;
  if (s === 'yes') return 'both';
  if (no(s)) return 'none';
  const [both, left, right] = [t['sidewalk:both'], t['sidewalk:left'], t['sidewalk:right']];
  if (yes(both)) return 'both';
  if (no(both)) return 'none';
  if (yes(left) && yes(right)) return 'both';
  if (yes(left)) return 'left';
  if (yes(right)) return 'right';
  if (no(left) && no(right)) return 'none';
  return undefined;
}

/** "50", "30 mph", "none" -> km/h; undefined where it isn't a number. */
function speedOf(v: string | undefined): number | undefined {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(mph)?\s*$/i.exec(v ?? '');
  if (!m) return undefined;
  return Math.round(Number(m[1]) * (m[2] ? 1.609344 : 1));
}

const STREET_CLASSES = new Set(['residential', 'living_street', 'tertiary', 'unclassified', 'primary', 'secondary', 'trunk', 'motorway']);

/**
 * UF3: the junctions of a set of ways: the points where two or more streets share a node. Service ways, parking aisles and
 * footways make none (UF2).
 */
export function junctionsFromWays(ways: readonly WayFacts[]): LngLat[] {
  const touched = new Map<string, { at: LngLat; ways: Set<string> }>();
  for (const w of ways) {
    if (!STREET_CLASSES.has(w.cls)) continue;
    for (const p of w.line) {
      const k = `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
      const e = touched.get(k) ?? { at: p, ways: new Set<string>() };
      e.ways.add(w.id);
      touched.set(k, e);
    }
  }
  return [...touched.values()].filter((e) => e.ways.size >= 2).map((e) => e.at);
}

/** WK1b: the ways of an Overpass answer (`out tags geom`). Nodes and ways of fewer than two points are dropped. */
export function waysFromOverpass(json: { elements?: unknown[] }): WayFacts[] {
  const out: WayFacts[] = [];
  for (const raw of json.elements ?? []) {
    const el = raw as El;
    const t = el.tags;
    if (el.type !== 'way' || !t?.highway || !el.geometry || el.geometry.length < 2) continue;
    let cls = t.highway;
    let sub: string | undefined;
    if (cls.endsWith('_link')) {
      cls = cls.slice(0, -5);
      sub = 'link';
    }
    if (cls === 'footway' && (t.footway === 'crossing' || t.footway === 'crosswalk')) sub = 'crosswalk';
    else if (cls === 'footway' && t.footway === 'sidewalk') sub = 'sidewalk';
    out.push({
      id: `osm${el.id}`,
      cls,
      sub,
      name: t.name || undefined,
      speedKmh: speedOf(t.maxspeed),
      sidewalk: sidewalkOf(t),
      level: t.bridge && t.bridge !== 'no' ? 1 : t.tunnel && t.tunnel !== 'no' ? -1 : 0,
      line: el.geometry.map((g) => [g.lon, g.lat] as LngLat),
    });
  }
  return out;
}
