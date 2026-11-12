import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { BORDER, COLORS, FOG_BOLD, HOTSPOT, HOTSPOT_INK, RING_COLOR, WAITING_DOT_EDGE } from '../../../components/map/types';
import { KIND_COLOR } from '../../../components/atlas/kinds';
import { COMPLEX_RETRY_MS, retryIn } from '../../complexes/extent';
import { COMPLEX_NOTE, readsWanted } from '../../complexes/kinds';
import { COMPLEX_TARGET_MIN, SEE_MORE, SEE_MORE_LABEL } from '../../complexes/lines';
import { createComplexLookup } from '../../complexes/lookup';
import { COMPLEX_STYLE } from '../../complexes/mapLayer';
import { createOvertureSource } from '../../complexes/overtureReader';
import { complexAt } from '../../complexes/place';
import { kindOf } from '../../complexes/rule';
import { createComplexes } from '../../complexes/shell';
import { COMPLEX_CODE, type BuildingPiece, type Complex, type ComplexRead, type ComplexSource, type PlaceIn } from '../../complexes/types';
import { placeLine } from '../../resurface/context';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { fixture, piecesOf, placesOf, RELEASE, type Raw } from './fixtures';

// The audit of Complexes (specs/complexes, "Audit" record): each accepted finding behind a regression test, named by its number.

const SRC = join(__dirname, '..', '..', '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const EATS = ['food_and_drink', 'restaurant'];
const square = (w: number, s: number, size: number): LngLat[] => [[w, s], [w + size, s], [w + size, s + size], [w, s + size], [w, s]];
const memoryStore = () => {
  const rows = new Map<string, Complex>();
  const writes: string[][] = [];
  return { rows, writes, putComplexes: async (r: Complex[]) => void (writes.push(r.map((c) => c.id)), r.forEach((c) => rows.set(c.id, c))), complexesNear: async () => [...rows.values()] };
};

test('complexes audit 1: a place that is in two tiles\' buffers is one place, so four restaurants do not make a mall', async () => {
  const at: LngLat = [-76.8815, 40.2617];
  const t = tileAt(at);
  const piece: BuildingPiece = { id: 'b1', name: 'Four Eats', subtype: null, class: null, tile: [t.x, t.y], polygons: [[square(-76.8814, 40.2616, 0.0004)]] };
  const places: PlaceIn[] = [0, 1, 2, 3].map((i) => ({ id: `p${i}`, at: [-76.8813 + i * 0.00008, 40.26175], hierarchy: EATS }));
  const source: ComplexSource = { read: async (_r, tiles): Promise<ComplexRead> => ({ ok: true, pieces: [piece], places: [...places, ...places], tiles }) };
  const c = createComplexes({ source, store: memoryStore(), now: () => 0 });
  const r = await c.readArea({ at, reachM: 200 }, RELEASE);
  assert.deepEqual(r.complexes, [], 'four places seen twice are still four');
});

test('complexes audit 2: a building with a vertex in a tile the area did not read makes the read partial, not complete', async () => {
  const at: LngLat = [-76.862, 40.254];
  const t = tileAt(at);
  // A polygon that crosses the tile's east edge (lon -76.860352) into the next tile, with eight places in the part we have.
  const piece: BuildingPiece = { id: 'edge', name: 'Edge Arcade', subtype: null, class: null, tile: [t.x, t.y], polygons: [[square(-76.8612, 40.2535, 0.0016)]] };
  const places: PlaceIn[] = Array.from({ length: 8 }, (_, i) => ({ id: `e${i}`, at: [-76.8611 + (i % 4) * 0.0002, 40.2537 + Math.floor(i / 4) * 0.0004], hierarchy: EATS }));
  const source: ComplexSource = { read: async (_r, tiles): Promise<ComplexRead> => ({ ok: true, pieces: [piece], places, tiles }) };
  const r = await createComplexes({ source, store: memoryStore(), now: () => 0 }).readArea({ at, reachM: 50 }, RELEASE);
  assert.deepEqual(r.complexes, [], 'never a partial outline');
  assert.equal(r.partial, true, 'and the card is not told the area was covered');
});

test('complexes audit 4: a failed read is said to have failed, a partial empty one is not; a failed one is due again after 90 s with no change of tab', async () => {
  const at: LngLat = [-76.8815, 40.2617];
  const failing = createComplexes({ source: { read: async () => ({ ok: false }) }, store: memoryStore(), now: () => 0 });
  const f = await failing.readArea({ at, reachM: 50 }, RELEASE);
  assert.equal(f.failed, true);
  const empty = createComplexes({ source: { read: async (_r, tiles) => ({ ok: true, pieces: [], places: [], tiles }) }, store: memoryStore(), now: () => 0 });
  const e = await empty.readArea({ at, reachM: 50 }, RELEASE);
  assert.equal(!!e.failed, false, 'nothing found is not a failure');
  assert.equal(retryIn(null, 1000), null);
  assert.equal(retryIn(1000, 1000 + 30_000), COMPLEX_RETRY_MS - 30_000);
  assert.equal(retryIn(1000, 1000 + COMPLEX_RETRY_MS + 5), 0);
});

test('complexes audit 5: a second area judges and stores only complexes this session has not stored', async () => {
  const raw: Raw = fixture('harrisburg');
  const source: ComplexSource = {
    async read(_r, tiles) {
      const have = tiles.filter(([x, y]) => raw.tiles.some((t) => t.x === x && t.y === y));
      const sub: Raw = { release: raw.release, tiles: raw.tiles.filter((t) => have.some(([x, y]) => x === t.x && y === t.y)) };
      return { ok: true, pieces: piecesOf(sub), places: placesOf(sub), tiles: have };
    },
  };
  const store = memoryStore();
  const c = createComplexes({ source, store, now: () => 0 });
  await c.readArea({ at: [-76.8815, 40.2617], reachM: 800 }, RELEASE);
  await c.readArea({ at: [-76.8815, 40.2617], reachM: 1500 }, RELEASE);
  await c.readArea({ at: [-76.872, 40.255], reachM: 800 }, RELEASE);
  const all = store.writes.flat();
  assert.ok(all.length > 0);
  assert.equal(new Set(all).size, all.length, 'no complex is written twice in a session');
});

test('complexes audit 6: a tile that fails is left unread, not a reason to blank the area; all failing is a failed read', async () => {
  const archive = { getZxy: async (_z: number, x: number) => { if (x === 1) throw new Error('boom'); return undefined; } };
  const source = createOvertureSource({ open: () => archive, tileMs: 1000, readMs: 5000 });
  const some = await source.read('r', [[1, 1], [2, 2]]);
  assert.deepEqual(some.ok && some.tiles, [[2, 2]], 'only the tile that was read is said to be read');
  const none = await createOvertureSource({ open: () => archive, tileMs: 1000, readMs: 5000 }).read('r2', [[1, 1]]);
  assert.equal(none.ok, false);
});

test('complexes audit 7: a row of an older rule is not offered to a moment\'s line', () => {
  const at: LngLat = [-76.88, 40.26];
  const c: Complex = { id: 'old', name: 'Old Rule', kind: 'shopping', polygons: [[square(-76.8801, 40.2599, 0.0004)]], at, bbox: [-76.8801, 40.2599, -76.8797, 40.2603], release: 'r', code: 'c0' };
  assert.notEqual(c.code, COMPLEX_CODE);
  assert.equal(complexAt(at, [c]), null);
  assert.equal(complexAt(at, [{ ...c, code: COMPLEX_CODE }])?.complex.id, 'old');
});

test('complexes audit 8: a transportation building is a station only when its class says so, never a garage or one with no class', () => {
  const place: PlaceIn = { at: [0, 0], hierarchy: EATS };
  assert.equal(kindOf({ subtype: 'transportation', class: null }, [place]), null);
  assert.equal(kindOf({ subtype: 'transportation', class: 'garage' }, [place]), null);
  assert.equal(kindOf({ subtype: 'transportation', class: 'parking' }, [place]), null);
  assert.equal(kindOf({ subtype: 'transportation', class: 'transportation' }, [place]), 'stations');
  assert.equal(kindOf({ subtype: 'transportation', class: 'train_station' }, [place]), 'stations');
});

test('complexes audit 10: forty moments in one place cause one store read; a far one another', async () => {
  let reads = 0;
  const lookup = createComplexLookup({ complexesNear: async () => { reads++; return []; } });
  for (let i = 0; i < 40; i++) await lookup([-76.88 + i * 0.000005, 40.26]);
  assert.equal(reads, 1);
  await lookup([-75.4, 40.6]);
  assert.equal(reads, 2);
});

test('complexes audit 11: the outline\'s data does not change with zoom, so the map sets it once', async () => {
  const { complexMap } = await import('../../complexes/mapLayer');
  const c: Complex = { id: 'a', name: 'A', kind: 'shopping', polygons: [[square(-76.88, 40.26, 0.001)]], at: [-76.8795, 40.2605], bbox: [-76.88, 40.26, -76.879, 40.261], release: 'r', code: COMPLEX_CODE };
  assert.deepEqual(complexMap([c], 12).lines, complexMap([c], 18).lines);
  const view = read('app/(tabs)/explore.tsx');
  assert.ok(/labelsOn/.test(view), 'the screen splits the labels (zoom) from the outlines (not)');
});

test('complexes audit 13: no grid surface of the gallery names a complex, and no view outside the card, the map and the settings reaches them', () => {
  assert.equal(/complexes\//.test(read('lib/gallery/shell.ts')), false, 'the gallery\'s street map is street names only');
  const allowed = new Set(['components/atlas/AtlasCard.tsx', 'components/ExploreSettings.tsx', 'components/ComplexLabel.tsx', 'components/map/WalkMap.web.tsx', 'components/map/WalkMap.native.tsx', 'components/map/types.ts', 'app/(tabs)/explore.tsx']);
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.tsx?$/.test(f)) out.push(p);
    }
    return out;
  };
  for (const root of ['components', 'app']) {
    for (const f of walk(join(SRC, root))) {
      const rel = relative(SRC, f);
      if (/lib\/complexes\//.test(readFileSync(f, 'utf8'))) assert.ok(allowed.has(rel), `${rel} may not reach complexes`);
    }
  }
});

test('complexes audit 14: inside a complex, a street found only by nearness keeps its Near', () => {
  assert.equal(placeLine({ street: 'N 2nd St', near: true, town: 'Harrisburg', complex: { name: 'Strawberry Square', near: false } }), 'Strawberry Square, Near N 2nd St, Harrisburg');
  assert.equal(placeLine({ street: 'N 2nd St', near: false, town: 'Harrisburg', complex: { name: 'Strawberry Square', near: false } }), 'Strawberry Square, N 2nd St, Harrisburg');
});

test('complexes audit 15: with every kind switched off nothing is read', () => {
  assert.equal(readsWanted([]), true);
  assert.equal(readsWanted(['shopping', 'markets', 'campuses', 'stations']), true);
  assert.equal(readsWanted(['shopping', 'markets', 'campuses', 'stations', 'civic']), false);
});

test('complexes audit 21: "See more" names what it shows and the card uses that name', () => {
  assert.ok(SEE_MORE_LABEL.includes(SEE_MORE) && !/\d/.test(SEE_MORE_LABEL));
  assert.ok(/accessibilityLabel=\{SEE_MORE_LABEL\}/.test(read('components/atlas/AtlasCard.tsx')));
});

test('complexes audit 22: a row\'s View carries no label of its own over the Walk to button inside it', () => {
  assert.equal(/testID="atlas-complex"[^>]*accessibilityLabel/.test(read('components/atlas/AtlasCard.tsx')), false);
});

test('complexes audit 23: the map label has a ground of its own and keeps to two lines at any text size', () => {
  const src = read('components/ComplexLabel.tsx');
  assert.ok(/numberOfLines=\{2\}/.test(src) && /maxFontSizeMultiplier/.test(src) && /backgroundColor/.test(src));
});

test('complexes audit 24: the outline\'s hue is far from every kind\'s and every other layer\'s', () => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const dist = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
  const others = [...Object.values(COLORS), ...Object.values(KIND_COLOR), HOTSPOT, HOTSPOT_INK, BORDER.color, BORDER.lined, RING_COLOR, FOG_BOLD, WAITING_DOT_EDGE];
  for (const o of others) assert.ok(dist(COMPLEX_STYLE.color, o) >= 55, `${COMPLEX_STYLE.color} is too near ${o}`);
});

test('complexes audit 25: the settings note says what the switches are, in words and no number', () => {
  assert.equal(/\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|dozen|several|few|many|couple)\b/i.test(COMPLEX_NOTE), false);
  assert.ok(/cards/.test(COMPLEX_NOTE) && /map/.test(COMPLEX_NOTE));
  assert.ok(/COMPLEX_NOTE/.test(read('components/ExploreSettings.tsx')));
});

test('complexes audit 28: the card\'s controls are 48 points, as on Android', () => {
  assert.ok(COMPLEX_TARGET_MIN >= 48);
  const src = read('components/atlas/AtlasCard.tsx');
  assert.ok(/complexMore:\s*\{\s*minHeight: COMPLEX_TARGET_MIN/.test(src));
  assert.ok(/complexWalk:\s*\{\s*minHeight: COMPLEX_TARGET_MIN/.test(src));
});
