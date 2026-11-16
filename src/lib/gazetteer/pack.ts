// @layer core
/*
 * The gazetteer pack (specs/place-search, GZ12, GZ13): the app's own format for a table of named places. The app reads only
 * packs; a script turns a dataset into one (scripts/build-gazetteer.js). Columnar so it parses fast and stays small.
 * Never a population, a rank or a class: nothing in the pack can order or show a size (GZ13).
 */
import type { LngLat } from '../types';

export interface GazetteerPack {
  /** The dataset and its date, e.g. "<dataset>-<date>". */
  id: string;
  /** The credit line, in words, shown where the app credits its map data (GZ14). */
  credit: string;
  names: string[];
  /** The name in plain ASCII. */
  ascii: string[];
  /** Other names people type, ASCII, may be empty. */
  alts: string[][];
  /** Index into `regions` / `countries`. */
  region: number[];
  country: number[];
  /** Degrees times 1e4, rounded. */
  lat: number[];
  lon: number[];
  regions: string[];
  /** The short code of each region where it has one ("PA"), else "": people type it ("carlisle pa"). */
  regionCodes: string[];
  countries: string[];
}

export interface Place {
  index: number;
  name: string;
  region: string;
  country: string;
  at: LngLat;
}

/** The only fields a pack may hold (GZ13). */
export const PACK_FIELDS: readonly string[] = ['id', 'credit', 'names', 'ascii', 'alts', 'region', 'country', 'lat', 'lon', 'regions', 'regionCodes', 'countries'];

const MAX_LAT = 900000;
const MAX_LON = 1800000;

/** What is wrong with a pack, or an empty list (GZ13): a field outside the list, columns out of step, a bad index or point. */
export function validatePack(pack: unknown): string[] {
  if (!pack || typeof pack !== 'object') return ['not an object'];
  const p = pack as Record<string, unknown>;
  const problems: string[] = [];
  for (const k of Object.keys(p)) if (!PACK_FIELDS.includes(k)) problems.push(`field outside the list: ${k}`);
  for (const k of PACK_FIELDS) if (!(k in p)) problems.push(`missing: ${k}`);
  if (problems.length) return problems;
  if (typeof p.id !== 'string' || typeof p.credit !== 'string') problems.push('id and credit are strings');
  const cols = ['names', 'ascii', 'alts', 'region', 'country', 'lat', 'lon'] as const;
  for (const k of [...cols, 'regions', 'regionCodes', 'countries']) if (!Array.isArray(p[k])) problems.push(`${k} is not a list`);
  if (problems.length) return problems;
  const n = (p.names as unknown[]).length;
  for (const k of cols) if ((p[k] as unknown[]).length !== n) problems.push(`${k} has ${(p[k] as unknown[]).length} rows, names has ${n}`);
  if (problems.length) return problems;
  const regions = p.regions as string[];
  if ((p.regionCodes as unknown[]).length !== regions.length) return ['regionCodes and regions differ in length'];
  const countries = p.countries as string[];
  const { region, country, lat, lon, names, ascii, alts } = p as unknown as GazetteerPack;
  for (let i = 0; i < n; i++) {
    if (typeof names[i] !== 'string' || !names[i] || typeof ascii[i] !== 'string') return [`row ${i}: a name`];
    if (!Array.isArray(alts[i]) || alts[i].some((a) => typeof a !== 'string')) return [`row ${i}: alts`];
    if (!Number.isInteger(region[i]) || region[i] < 0 || region[i] >= regions.length) return [`row ${i}: a region index`];
    if (!Number.isInteger(country[i]) || country[i] < 0 || country[i] >= countries.length) return [`row ${i}: a country index`];
    if (!Number.isInteger(lat[i]) || Math.abs(lat[i]) > MAX_LAT || !Number.isInteger(lon[i]) || Math.abs(lon[i]) > MAX_LON) return [`row ${i}: a point`];
  }
  return problems;
}

/** The place at an index of a pack. */
export function placeAt(pack: GazetteerPack, index: number): Place {
  return {
    index,
    name: pack.names[index],
    region: pack.regions[pack.region[index]] ?? '',
    country: pack.countries[pack.country[index]] ?? '',
    at: [pack.lon[index] / 1e4, pack.lat[index] / 1e4],
  };
}
