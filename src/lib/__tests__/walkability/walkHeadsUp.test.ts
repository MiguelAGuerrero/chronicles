/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { tilesNear } from '../../tileMath';
import type { LngLat } from '../../types';
import { aheadStep, carStretches, KEEP_MS, LEAD_M, STRETCH_MIN_M, warningLine, type AheadState } from '../../walk/ahead';
import { createAheadWatch } from '../../walk/aheadWatch';
import { MAX_TILES } from '../../walk/limits';
import type { Band } from '../../walk/types';
import { fakePorts } from '../fakes';

// Walkability heads-up (WH1-WH13), written from specs/walkability-headsup/spec.md AFTER the code, at the owner's
// request: they assert behaviour that already existed (see the spec's record).

const O: LngLat = [-75.19, 40.69];
const KX = 111_320 * Math.cos((O[1] * Math.PI) / 180);
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / KX, O[1] + dy / 110_540];
const path = [at(0), at(1000)];
const seg = (id: string, name: string | null, a: number, b: number) => ({ id, name, geometry: [[at(a), at(b)]] });
const segs = [seg('a', 'Elm Street', 0, 300), seg('b', 'Route 22', 300, 600), seg('c', 'Elm Street', 600, 1000)];
const bands = (b: Band) => new Map<string, Band>([['a', 'foot'], ['b', b], ['c', 'foot']]);
const fresh = (): AheadState => ({ said: [], shown: null });

test('WH1: only a car stretch of 100 m or more is a stretch', () => {
  assert.equal(STRETCH_MIN_M, 100);
  assert.equal(carStretches(path, segs, bands('car')).length, 1);
  for (const b of ['mixed', 'foot', 'unknown'] as Band[]) assert.deepEqual(carStretches(path, segs, bands(b)), [], b);
  assert.deepEqual(carStretches(path, segs, new Map()), [], 'no data');
  assert.deepEqual(carStretches([at(0), at(90)], [seg('s', 'X', 0, 90)], new Map([['s', 'car']])), [], 'under 100 m');
});

test('WH3: it appears within 200 m of the stretch, not before, and is there when on it', () => {
  const [s] = carStretches(path, segs, bands('car'));
  assert.equal(LEAD_M, 200);
  assert.equal(aheadStep(fresh(), [s], 90, 0).show, null, '210 m ahead');
  assert.ok(aheadStep(fresh(), [s], 110, 0).show, '190 m ahead');
  assert.ok(aheadStep(fresh(), [s], 450, 0).show, 'on it');
});

test('WH4: a stretch is said once on a route', () => {
  const [s] = carStretches(path, segs, bands('car'));
  let r = aheadStep(fresh(), [s], 150, 0);
  r = aheadStep(r.state, [s], 700, KEEP_MS + 1);
  assert.equal(r.show, null);
  assert.equal(aheadStep(r.state, [s], 120, KEEP_MS + 5000).show, null, 'walking back says nothing');
});

test('WH5: it stays while on the stretch, and 15 s from when it first appeared once past', () => {
  const [s] = carStretches(path, segs, bands('car'));
  assert.equal(KEEP_MS, 15_000);
  let r = aheadStep(fresh(), [s], 150, 1000);
  assert.ok(aheadStep(r.state, [s], 500, 600_000).show, 'on it, however long');
  r = aheadStep(r.state, [s], 650, 10_000);
  assert.ok(r.show, 'passed, 9 s after it appeared');
  assert.equal(aheadStep(r.state, [s], 650, 16_001).show, null, 'passed and 15 s after it appeared');
});

test('WH6: one at a time: the nearest unsaid, the next after the first has gone', () => {
  const a = { key: 'A@1', street: 'A', fromM: 300, toM: 450 };
  const b = { key: 'B@2', street: 'B', fromM: 400, toM: 700 };
  let r = aheadStep(fresh(), [a, b], 220, 0);
  assert.equal(r.show?.street, 'A', 'only one at once, though both are within 200 m');
  r = aheadStep(r.state, [a, b], 500, 5000);
  assert.equal(r.show?.street, 'A', 'A is held until it is gone');
  r = aheadStep(r.state, [a, b], 500, 20_000);
  assert.equal(r.show?.street, 'B', 'then B, now that A has gone');
});

test('WH7: the words, with no digit; no street name still reads', () => {
  assert.equal(warningLine({ street: 'Route 22' }), 'Next: a stretch built around cars on Route 22');
  assert.equal(warningLine({ street: null }), 'Next: a stretch built around cars');
  assert.ok(!/\d/.test(warningLine({ street: null })));
});

test('WH8, WH13: the watch reaches nothing but the clock: it cannot buzz, notify, record or write', () => {
  const p = fakePorts();
  const only = { clock: p.clock };
  const w = createAheadWatch(only);
  const [s] = carStretches(path, segs, bands('car'));
  w.stretches('r', [s]);
  w.at(150);
  assert.ok(w.store.get().show, 'given only a clock, it still says the stretch');
  // Nor can it reach one another way: the watch and its decisions import no notifier, motion, recorder or db.
  for (const f of ['aheadWatch.ts', 'ahead.ts']) {
    const imports = readFileSync(join(__dirname, '..', '..', 'walk', f), 'utf8').match(/^import .*$/gm) ?? [];
    for (const line of imports) assert.doesNotMatch(line, /notif|motion|feedback|haptic|recorder|\/db\b|ports(\/index)?'/, `${f}: ${line}`);
  }
});

test('WH10: no route says nothing; ending the route forgets what was said', () => {
  const p = fakePorts();
  const w = createAheadWatch(p);
  w.at(100);
  assert.equal(w.store.get().show, null, 'no route yet');
  const [s] = carStretches(path, segs, bands('car'));
  w.stretches('r', [s]);
  w.at(150);
  assert.ok(w.store.get().show);
  w.stretches(null, []);
  assert.equal(w.store.get().show, null);
  w.stretches('r2', [s]);
  w.at(150);
  assert.ok(w.store.get().show, 'a new route says it again');
});

test('WH11: a route\'s tiles are the ones within 100 m of it, 12 at most', () => {
  const long: LngLat[] = Array.from({ length: 60 }, (_, i) => [O[0] + i * 0.03, O[1]] as LngLat);
  assert.ok(tilesNear(long, 100, MAX_TILES).length <= 12);
  assert.ok(tilesNear(path, 100, MAX_TILES).length >= 1);
});

test('WH12: no tiles, or none a stretch, says nothing and breaks nothing', () => {
  const p = fakePorts();
  const w = createAheadWatch(p);
  w.stretches('r', []);
  w.at(100);
  w.at(900);
  assert.equal(w.store.get().show, null);
});

test('WH3: stretches that arrive after the walker is already within reach are said at once, without waiting for another fix', () => {
  const p = fakePorts();
  const w = createAheadWatch(p);
  w.stretches('r', []); // the route is known; its tiles are still being read
  w.at(150); // the walker's last fix
  assert.equal(w.store.get().show, null);
  const [s] = carStretches(path, segs, bands('car'));
  w.stretches('r', [s]); // the read finishes
  assert.ok(w.store.get().show, 'said as soon as it is known');
});
