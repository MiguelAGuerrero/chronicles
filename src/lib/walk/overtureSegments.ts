// @layer core
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import type { LngLat } from '../types';
import type { WayFacts } from './types';

/*
 * Overture's transportation tiles (WK1): the only file that knows their schema (checked 2026-11-04,
 * release 2026-10-21.0). A `segment` layer; `subtype` road / rail / water; `class` is the OpenStreetMap
 * highway value; `subclass` is sidewalk, crosswalk, link, alley...; `speed_limits` and `road_flags` are
 * JSON strings. There is no "no sidewalk" tag (WK8b): sidewalks are footway segments of their own.
 */

const Z = 14;
const MPH = 1.609344;

const parse = (s: unknown): unknown => {
  if (typeof s !== 'string') return s ?? null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/** The fastest limit stated, in km/h (a limit that changes along a segment: the worst for someone beside it). */
function speedOf(raw: unknown): number | undefined {
  const rules = parse(raw);
  if (!Array.isArray(rules)) return undefined;
  let best: number | undefined;
  for (const r of rules) {
    const m = (r as { max_speed?: { unit?: string; value?: number } })?.max_speed;
    if (!m || typeof m.value !== 'number') continue;
    const kmh = Math.round(String(m.unit).toLowerCase().startsWith('mph') ? m.value * MPH : m.value);
    if (best === undefined || kmh > best) best = kmh;
  }
  return best;
}

/** A bridge is above the ground and a tunnel below it (NB1). */
function levelOf(raw: unknown): number {
  const flags = parse(raw);
  if (!Array.isArray(flags)) return 0;
  const values = flags.flatMap((f) => ((f as { values?: unknown })?.values as unknown[]) ?? []);
  if (values.includes('is_bridge')) return 1;
  if (values.includes('is_tunnel')) return -1;
  return 0;
}

/** WK1: a z14 tile's ways. Anything that is not a road or path (rail, water) is left out. */
export function waysFromOvertureTile(bytes: ArrayBuffer, x: number, y: number): WayFacts[] {
  const layer = new VectorTile(new PbfReader(new Uint8Array(bytes))).layers.segment;
  if (!layer) return [];
  const out: WayFacts[] = [];
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i);
    const p = f.properties as Record<string, unknown>;
    if (p.subtype !== 'road' || typeof p.class !== 'string') continue;
    const g = f.toGeoJSON(x, y, Z).geometry;
    const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
    lines.forEach((coords, k) => {
      if (coords.length < 2) return;
      out.push({
        id: `${String(p.id ?? `${x}/${y}/${i}`)}${k ? `#${k}` : ''}`,
        cls: p.class as string,
        sub: typeof p.subclass === 'string' ? p.subclass : undefined,
        speedKmh: speedOf(p.speed_limits),
        level: levelOf(p.road_flags),
        line: coords.map((c) => [c[0], c[1]] as LngLat),
      });
    });
  }
  return out;
}
