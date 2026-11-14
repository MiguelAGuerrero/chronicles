/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import type { Stretch } from '../../walk/ahead';
import { aheadReads, unlitStretches, watchKeys } from '../../dark/ahead';
import { openAt, parseHours } from '../../dark/hours';
import { darkFromOverpass, litOf } from '../../dark/overpass';
import { createOverpassGate } from '../../net/overpassGate';
import { layerNotes } from '../../layers/notes';
import { LAYERS } from '../../layers/registry';
import { DARK_STYLE } from '../../../components/map/types';

// The after-dark audit (2026-11-14): one regression test per accepted finding, written before its fix.

const O: LngLat = [-75.49, 40.6];
const KX = 111_320 * Math.cos((O[1] * Math.PI) / 180);
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / KX, O[1] + dy / 110_540];
const dark = () => LAYERS.find((l) => l.id === 'dark');

test('after-dark audit 1: two short unlit crossings of an untagged street, 150 m apart, say nothing', () => {
  // Main Street (no lit tag, so not a way here) runs east; Oak and Elm Lane, mapped as unlit, cross it.
  const path = [at(0), at(300)];
  const ways = [
    { id: 'oak', lit: 'no', name: 'Oak Lane', line: [at(100, -200), at(100, 200)] },
    { id: 'elm', lit: 'no', name: 'Elm Lane', line: [at(250, -200), at(250, 200)] },
  ];
  assert.deepEqual(unlitStretches(path, ways), []);
  // Two real unlit stretches, each long enough, still join as one (steward S3), named by the street most of it is on.
  const long = [
    { id: 'a', lit: 'no', name: 'Pine Street', line: [at(0), at(120)] },
    { id: 'b', lit: 'yes', name: 'Pine Street', line: [at(120), at(200)] },
    { id: 'c', lit: 'no', name: 'Cedar Street', line: [at(200), at(600)] },
  ];
  const got = unlitStretches([at(0), at(600)], long);
  assert.equal(got.length, 1);
  assert.equal(got[0].street, 'Cedar Street');
});

test('after-dark audit 2: walkability\'s stretches reach the heads-up before a slow after-dark read finishes', async () => {
  const car: Stretch = { key: 'car', kind: 'road', street: 'Route 22', fromM: 100, toM: 300 };
  const unlit: Stretch = { key: 'unlit:x', kind: 'unlit', street: 'Oak Lane', fromM: 500, toM: 700 };
  let release: (s: Stretch[]) => void = () => {};
  const slow = new Promise<Stretch[]>((r) => (release = r));
  const seen: string[][] = [];
  const done = aheadReads({ walk: async () => [car], dark: () => slow }, (list) => seen.push(list.map((s) => s.key)));
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(seen, [['car']], 'walkability\'s line is not held for the after-dark read');
  release([unlit]);
  await done;
  assert.deepEqual(seen, [['car'], ['car', 'unlit:x']]);
});

test('after-dark audit 3: "Mo-Su 17:00-02:00; Su off" is closed on Sunday at 01:00', () => {
  const rules = parseHours('Mo-Su 17:00-02:00; Su off');
  assert.equal(openAt(rules, 0, 60), 'closed');
  assert.equal(openAt(rules, 1, 60), 'closed', 'Monday 01:00: Sunday was off, so nothing runs into Monday');
  assert.equal(openAt(rules, 2, 60), 'open', 'Tuesday 01:00: Monday\'s evening runs on');
});

test('after-dark audit 4: some tiles failed says so, beside the reading; the kept ones are still drawn', () => {
  const n = (darkPartial: boolean) =>
    layerNotes({ walkability: 'off', storefrontsReading: false, storefrontsFailed: false, dark: 'ready', darkWords: 'Open now', darkPartial }).dark;
  assert.equal(n(false), 'Open now. Only what is mapped.');
  assert.equal(n(true), 'Open now. Only what is mapped. Not all of it could be read now.');
});

test('after-dark audit 5: crossing sunset keeps the heads-up\'s route the same, so a line on screen stays', () => {
  const route: LngLat[] = [at(0), at(500)];
  const day = watchKeys(route, 'w');
  const night = watchKeys(route, 'wd');
  assert.equal(day.watch, night.watch, 'the heads-up\'s own route does not change');
  assert.notEqual(day.read, night.read, 'the read does');
});

test('after-dark audit 6: two busy answers at once pause for one strike', () => {
  let now = 0;
  const g = createOverpassGate({ now: () => now });
  g.pause();
  g.pause();
  now = 60_000;
  assert.equal(g.take('dark'), true, 'paused 60 s, not doubled to 120 s by a second answer in the same pause');
});

test('after-dark audit 7: the open tip names no time it cannot show', () => {
  const tip = dark()?.legend.find((r) => r.key === 'open')?.tip ?? '';
  assert.ok(!/above/.test(tip), tip);
  assert.ok(/now|sunset/.test(tip), tip);
});

test('after-dark audit 8: below z15 the lit line fades to half or less, so a densely mapped centre never reads as a zone', () => {
  const op = (z: number) => {
    const stops = DARK_STYLE.lit.opacityByZoom;
    if (z <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (z <= stops[i][0]) {
      const [z0, a0] = stops[i - 1];
      const [z1, a1] = stops[i];
      return a0 + ((a1 - a0) * (z - z0)) / (z1 - z0);
    }
    return stops[stops.length - 1][1];
  };
  assert.ok(op(14) <= op(16) / 2, `${op(14)} at z14, ${op(16)} at z16`);
  assert.equal(op(16), 1, 'whole at street zoom (after-dark ui 2)');
});

test('after-dark audit 9: the switch names the line on a route, so no line arrives unannounced', () => {
  assert.match(dark()?.sub ?? '', /route/);
});

test('after-dark audit 10: no open mark from a chemist, a convenience store, a kiosk or a supermarket', () => {
  const node = (id: number, tags: Record<string, string>) => ({ type: 'node', id, lat: 40.6, lon: -75.49, tags: { opening_hours: '24/7', ...tags } });
  const got = darkFromOverpass({ elements: [
    node(1, { shop: 'chemist' }), node(2, { shop: 'convenience' }), node(3, { shop: 'kiosk' }), node(4, { shop: 'supermarket' }),
    node(5, { shop: 'books' }), node(6, { amenity: 'bar' }),
  ] });
  assert.deepEqual(got.places.map((p) => p.id), ['n5', 'n6']);
});

test('after-dark audit 11: lit=disused draws nothing and is never said', () => {
  assert.equal(litOf('disused'), 'unknown');
  assert.deepEqual(unlitStretches([at(0), at(500)], [{ id: 'd', lit: 'disused', name: 'Old Road', line: [at(0), at(500)] }]), []);
});
