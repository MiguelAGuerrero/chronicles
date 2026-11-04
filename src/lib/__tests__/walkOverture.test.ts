/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tileAt } from '../tileMath';
import type { LngLat } from '../types';
import { waysFromOvertureTile } from '../walk/overtureSegments';
import { encodeTile, type FixtureFeature } from './mvtFixture';

// Walkability (WK1), written from specs/walkability/spec.md before the code. Overture's transportation
// tile: a `segment` layer whose properties are strings, some of them JSON (checked 2026-11-04, release
// 2026-10-21.0).

const O: LngLat = [-75.19, 40.69];
const T = tileAt(O);
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / 84_000, O[1] + dy / 110_540];
const seg = (props: Record<string, string>, ...p: [number, number][]): FixtureFeature => ({ layer: 'segment', props: { subtype: 'road', ...props }, coords: p.map(([x, y]) => at(x, y)) });
const read = (...f: FixtureFeature[]) => waysFromOvertureTile(encodeTile(f, 14, T.x, T.y).buffer as ArrayBuffer, T.x, T.y);

test('WK1: a tile\'s segments become ways: class, kind, speed, level, line', () => {
  const ways = read(
    seg({ class: 'residential', speed_limits: JSON.stringify([{ max_speed: { unit: 'mph', value: 25 }, between: [0, 1] }]) }, [0, 0], [100, 0]),
    seg({ class: 'footway', subclass: 'sidewalk' }, [0, 8], [100, 8]),
    seg({ class: 'footway', subclass: 'crosswalk' }, [50, -5], [50, 5]),
    seg({ class: 'primary', road_flags: JSON.stringify([{ values: ['is_bridge'], between: [0, 1] }]) }, [0, 40], [100, 40]),
    seg({ class: 'secondary', subclass: 'link', speed_limits: JSON.stringify([{ max_speed: { unit: 'km/h', value: 80 }, between: [0, 1] }]) }, [0, 60], [100, 60]),
  );
  assert.equal(ways.length, 5);
  const by = (cls: string, sub?: string) => ways.find((w) => w.cls === cls && w.sub === sub)!;
  assert.equal(by('residential').speedKmh, Math.round(25 * 1.609));
  assert.equal(by('footway', 'sidewalk').sub, 'sidewalk');
  assert.equal(by('footway', 'crosswalk').sub, 'crosswalk');
  assert.equal(by('primary').level, 1, 'a bridge is off the ground');
  assert.equal(by('residential').level, 0);
  assert.equal(by('secondary', 'link').speedKmh, 80);
  assert.ok(Math.abs(by('residential').line[1][0] - at(100)[0]) < 1e-4, 'in lon/lat');
  for (const w of ways) assert.equal(w.sidewalk, undefined, 'Overture has no sidewalk tag (WK8b)');
});

test('WK1: rail and water are not ways for people; no segment layer is an empty tile', () => {
  const ways = read(seg({ class: 'residential' }, [0, 0], [100, 0]), { layer: 'segment', props: { subtype: 'rail', class: 'standard_gauge' }, coords: [at(0, 20), at(100, 20)] });
  assert.deepEqual(ways.map((w) => w.cls), ['residential']);
  assert.deepEqual(waysFromOvertureTile(encodeTile([{ layer: 'connector', props: {}, coords: at(0) }], 14, T.x, T.y).buffer as ArrayBuffer, T.x, T.y), []);
});
