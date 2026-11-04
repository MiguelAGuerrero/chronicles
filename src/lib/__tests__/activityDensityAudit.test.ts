/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HOTSPOT, HOTSPOT_GRADES } from '../../components/map/types';
import { mergeSources, type ActivityPoint, type OverturePlace } from '../activity/points';
import { OvertureReader } from '../activity/reader';
import { newestRelease, type Archive } from '../activity/release';
import { osmWeight, overtureWeight } from '../activity/weights';
import { ATLAS_CODE, ATLAS_RULES, atlasStep, keptProfile, nearList, profileStale, type AtlasArea, type AtlasProfile } from '../atlas/atlas';
import { analyzeArea } from '../landing/analyze';
import { gradeStreets } from '../landing/grade';
import { replacesRow, type LandingRow } from '../landing/view';
import type { LngLat, StreetSegment } from '../types';

// Activity density's audit (2026-11-04): each accepted finding's regression test, written before its fix.

const O: LngLat = [-75.19, 40.69];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
let segN = 0;
/** A street from (x0, y0) to (x1, y1) as pieces of `piece` metres, each line with a vertex every `vertex` metres. */
function street(name: string, from: [number, number], to: [number, number], piece = 100, vertex = 0): StreetSegment[] {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(1, Math.round(len / piece));
  const at = (t: number): LngLat => m(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
  return Array.from({ length: n }, (_, i) => {
    const k = vertex ? Math.max(1, Math.round(len / n / vertex)) : 1;
    const line = Array.from({ length: k + 1 }, (_, j) => at((i + j / k) / n));
    return { id: `a${segN++}`, name, kind_detail: 'minor', length_m: len / n, build: 'b1', geometry: [line] };
  });
}
function grid(vertex = 0): StreetSegment[] {
  const out: StreetSegment[] = [];
  for (let x = -600; x <= 600; x += 100) out.push(...street(x === 0 ? 'Main Street' : `Avenue ${x}`, [x, -600], [x, 600], 100, vertex));
  for (let y = -600; y <= 600; y += 100) out.push(...street(`Street ${y}`, [-600, y], [600, y], 100, vertex));
  return out;
}
const pt = (at: LngLat, weight = 1, name: string | null = null, source: ActivityPoint['source'] = 'osm'): ActivityPoint => ({ at, weight, name, source });
const ovp = (id: string, confidence = 0.95): OverturePlace => ({ id, name: id, at: O, hierarchy: ['food_and_drink', 'restaurant'], confidence, operating_status: 'open' });

test('activity-density audit 1: a short strong cluster is drawn even when no busy street or pocket forms', () => {
  // Five shops within 60 m on Main Street: too short for a busy street, too small for a pocket.
  const points = Array.from({ length: 5 }, (_, i) => pt(m(i % 2 ? 8 : -8, 22 + i * 12)));
  const r = analyzeArea({ centre: O, points, segments: grid(), towns: [], transit: [] });
  assert.deepEqual(r.strips, []);
  assert.ok(r.graded.length > 0, `graded on the ${r.basis} fallback too`);
});

/** A fake archive: a header that may never come, or fail, and tiles of places. */
function fakeArchive(o: { hang?: boolean; fail?: string; places?: OverturePlace[]; delayMs?: number }): Archive & { calls: number } {
  const a = {
    calls: 0,
    getZxy(_z: number, _x: number, _y: number) {
      a.calls++;
      if (o.hang) return new Promise<never>(() => {});
      if (o.fail) return Promise.reject(new Error(o.fail));
      return new Promise<{ data: ArrayBuffer }>((res) => setTimeout(() => res({ data: new ArrayBuffer(1) }), o.delayMs ?? 1));
    },
  };
  return a;
}

test('activity-density audit 2: a read finishes without Overture when its header never arrives', async () => {
  const reader = new OvertureReader({ open: () => fakeArchive({ hang: true }), decode: () => [], tileMs: 60, readMs: 80 });
  const t0 = Date.now();
  const r = await reader.read('r1', [[1, 1]]);
  assert.equal(r.ok, false);
  assert.ok(Date.now() - t0 < 1000, `${Date.now() - t0} ms`);
});

test('activity-density audit 3: after one failed Overture request, the next read gets Overture’s places', async () => {
  let opened = 0;
  const reader = new OvertureReader({
    open: () => (++opened === 1 ? fakeArchive({ fail: 'Failed to fetch' }) : fakeArchive({})),
    decode: () => [ovp('a')],
    tileMs: 500,
    readMs: 1000,
  });
  assert.equal((await reader.read('r1', [[1, 1]])).ok, false);
  const again = await reader.read('r1', [[1, 1]]);
  assert.ok(again.ok && again.places.length === 1);
  assert.equal(opened, 2, 'a failed archive is opened afresh');
});

test('activity-density audit 5: a second reader of a tile is not failed when the first reader cancels', async () => {
  const reader = new OvertureReader({ open: () => fakeArchive({ delayMs: 400 }), decode: () => [ovp('a')], tileMs: 2000, readMs: 3000 });
  let stop = false;
  const first = reader.read('r1', [[1, 1]], () => stop);
  const second = reader.read('r1', [[1, 1]]);
  setTimeout(() => (stop = true), 10);
  assert.equal((await first).ok, false, 'the one that cancelled stops');
  const s = await second;
  assert.ok(s.ok && s.places.length === 1, 'the other still gets its places');
});

test('activity-density audit 6: a read without Overture never replaces one measured with it; a missing release is skipped', async () => {
  const row = (overture: string | null): LandingRow => ({ key: 'k', centre: O, analysis: analyzeArea({ centre: O, points: [], segments: [], towns: [], transit: [] }), build: 'b1', rules: 'x', analyzed_at: 0, overture });
  assert.equal(replacesRow(row('r1'), null), false);
  assert.equal(replacesRow(row('r1'), 'r2'), true);
  assert.equal(replacesRow(row(null), null), true);
  assert.equal(replacesRow(undefined, null), true);
  const p = (overture: string | null) => ({ overture } as AtlasProfile);
  assert.equal(keptProfile(p('r1'), p(null))?.overture, 'r1');
  assert.equal(keptProfile(p('r1'), p('r2'))?.overture, 'r2');
  assert.equal(keptProfile(null, p(null))?.overture, null);
  // A release listed but missing (403 or 404) is passed over for the one before it.
  const xml = '<Prefix>tiles/2026-09-23.0/</Prefix><Prefix>tiles/2026-10-21.0/</Prefix>';
  assert.equal(newestRelease(xml, new Set(['2026-10-21.0'])), '2026-09-23.0');
  const missing = new OvertureReader({ open: () => fakeArchive({ fail: 'Bad response code: 404' }), decode: () => [], tileMs: 100, readMs: 200 });
  const r = await missing.read('r1', [[1, 1]]);
  assert.ok(!r.ok && r.missing);
});

test('activity-density audit 7: grades, busy streets and pockets are unchanged by 3 m vertices or two carriageways', () => {
  const points = Array.from({ length: 10 }, (_, i) => pt(m(i % 2 ? 8 : -8, 12 + i * 9)));
  const plain = analyzeArea({ centre: O, points, segments: grid(), towns: [], transit: [] });
  const dense = analyzeArea({ centre: O, points, segments: grid(3), towns: [], transit: [] });
  assert.deepEqual(dense.pockets.length, plain.pockets.length);
  assert.deepEqual(dense.strips.map((s) => s.name), plain.strips.map((s) => s.name));
  for (let i = 0; i < plain.strips.length; i++) assert.ok(Math.abs(dense.strips[i].lengthM - plain.strips[i].lengthM) < 25);
  // A dual carriageway: two Main Street lines 20 m apart, shops along 250 m.
  const one = [...grid().filter((s) => s.name !== 'Main Street'), ...street('Main Street', [0, -600], [0, 600])];
  const two = [...one, ...street('Main Street', [20, -600], [20, 600])];
  const shops = Array.from({ length: 11 }, (_, i) => pt(m(i % 2 ? 28 : -8, 12 + i * 25)));
  const a = analyzeArea({ centre: O, points: shops, segments: one, towns: [], transit: [] }).strips.find((s) => s.name === 'Main Street');
  const b = analyzeArea({ centre: O, points: shops, segments: two, towns: [], transit: [] }).strips.find((s) => s.name === 'Main Street');
  assert.ok(a && b);
  assert.ok(b.lengthM < a.lengthM * 1.3, `${Math.round(a.lengthM)} m on one line, ${Math.round(b.lengthM)} m on two`);
  // The same piece given twice changes nothing.
  const twice = gradeStreets({ centre: O, points: shops, segments: [...one, ...one.filter((s) => s.name === 'Main Street').map((s) => ({ ...s, id: `${s.id}b` }))] });
  const once = gradeStreets({ centre: O, points: shops, segments: one });
  assert.equal(twice.samples.length, once.samples.length);
});

test('activity-density audit 9: the tile memo holds only places that count', async () => {
  const reader = new OvertureReader({ open: () => fakeArchive({}), decode: () => [ovp('sure'), ovp('unsure', 0.5)], tileMs: 500, readMs: 1000 });
  const r = await reader.read('r1', [[1, 1]]);
  assert.ok(r.ok);
  assert.deepEqual(r.places.map((p) => p.id), ['sure']);
  assert.equal(reader.held(), 1);
});

test('activity-density audit 10: a ring due a re-read is scheduled, and backs off while Overture fails', () => {
  const area = (overture: string | null, read_at: number): AtlasArea => ({
    key: 'k', level: 'neighborhood', name: 'A', at: O, reachM: 1000, build: 'b1', code: ATLAS_CODE, listed_at: 0, read_at, failed_at: null,
    profile: { overture } as AtlasProfile,
  });
  const step = (a: AtlasArea, now: number) => atlasStep({ build: 'b1', latest: 'b1', nears: [], list: nearList([a], O, 'neighborhood', 'b1'), now, release: 'r2' });
  // An older release: read again after the usual wait, and a wait is scheduled until then.
  const s1 = step(area('r1', 1000), 1000 + 10);
  assert.equal(s1.kind, 'wait');
  assert.ok(s1.kind === 'wait' && s1.ms > 0 && s1.ms <= ATLAS_RULES.retryMs);
  assert.equal(step(area('r1', 1000), 1000 + ATLAS_RULES.retryMs).kind, 'ring');
  // Measured without Overture while a release is known: backs off longer, so a failing Overture isn't asked each visit.
  assert.notEqual(step(area(null, 1000), 1000 + ATLAS_RULES.retryMs).kind, 'ring');
  assert.equal(step(area(null, 1000), 1000 + ATLAS_RULES.overtureRetryMs).kind, 'ring');
});

test('activity-density audit 11: CVS and CVS Pharmacy count once; one OSM place takes in at most one Overture place', () => {
  const merged = mergeSources([pt(m(0, 0), 0.5, 'CVS')], [pt(m(10, 0), 0.5, 'CVS Pharmacy', 'overture'), pt(m(0, 20), 1, 'Wawa', 'overture')]);
  assert.equal(merged.length, 2);
  // Two Overture places named for the same OSM one within 60 m: the second is another place.
  const two = mergeSources([pt(m(0, 0), 1, 'Main Street Deli')], [pt(m(5, 0), 1, 'Main Street Deli', 'overture'), pt(m(-5, 0), 1, 'Main Street Deli Catering', 'overture')]);
  assert.equal(two.length, 2);
});

test('activity-density audit 12: a vacant shop counts nothing; a library counts half from both sources', () => {
  assert.equal(osmWeight('shop', 'vacant'), 0);
  assert.equal(osmWeight('library', 'library'), 0.5);
  assert.equal(overtureWeight(['education', 'library']), 0.5);
});

test('activity-density audit 13: an atlas tile measured with another release, or without Overture, draws stale', () => {
  const p = (overture: string | null) => ({ overture } as AtlasProfile);
  assert.equal(profileStale(p('r1'), 'r1'), false);
  assert.equal(profileStale(p('r1'), 'r2'), true);
  assert.equal(profileStale(p(null), 'r2'), true);
  assert.equal(profileStale(p(null), null), false, 'no release known: as read');
});

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** A colour at an opacity over a background, as hex. */
const over = (fg: string, alpha: number, bg: string) =>
  '#' + [1, 3, 5].map((i) => Math.round(parseInt(fg.slice(i, i + 2), 16) * alpha + parseInt(bg.slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('');

test('activity-density audit 14: every grade, blended, is 3:1 on the base map and on a road (L9)', () => {
  for (const bg of ['#f2f3f0', '#ffffff'])
    for (const g of [1, 2, 3] as const) {
      const c = contrast(over(HOTSPOT, HOTSPOT_GRADES[g].opacity, bg), bg);
      assert.ok(c >= 3, `grade ${g} on ${bg}: ${c.toFixed(2)}:1`);
    }
});
