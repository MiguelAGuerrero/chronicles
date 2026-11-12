/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activityFromTilePois, mergeSources, type ActivityPoint } from '../../activity/points';
import { placesFromTiles } from '../../areas/tilePlaces';
import { decodeTile } from '../../discovery/tileDecode';
import { placesFromTilePois, transitFromTilePois } from '../../discovery/tilePois';
import { refineRead } from '../../discovery/refinements';
import { analyzeArea } from '../../landing/analyze';
import { computeRead, computeReadPaced, handleComputeMessage, type ComputeInput } from '../../landing/compute';
import { deriveSegments } from '../../streets';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { encodeTile, type FixtureFeature } from '../mvtFixture';

// Explore in a dense city (DC11, DC13, DC7's exchange), written from specs/explore-dense-city/spec.md before the code.

const O: LngLat = [-76.615, 39.29];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const t = tileAt(m(0, 0));
const features: FixtureFeature[] = [];
for (let y = -200; y <= 200; y += 80) features.push({ layer: 'transportation', props: { class: 'minor' }, coords: [m(-300, y), m(300, y)] });
for (let y = -200; y <= 200; y += 80) features.push({ layer: 'transportation_name', props: { class: 'minor', name: `${y + 300} Street` }, coords: [m(-300, y), m(300, y)] });
for (let i = 0; i < 24; i++) features.push({ layer: 'poi', props: { class: i % 2 ? 'cafe' : 'shop', subclass: i % 2 ? 'cafe' : 'gift', name: `Place ${i}` }, coords: m(-250 + i * 20, -192) });
features.push({ layer: 'place', props: { class: 'neighbourhood', name: 'Mount Vernon' }, coords: m(0, 0) });
const body = (): ArrayBuffer => {
  const bytes = encodeTile(features, 14, t.x, t.y);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};
const overture: ActivityPoint[] = [{ at: m(10, -88), weight: 1, name: 'Overture Bakery', source: 'overture' }];
const input = (analyzeAt: LngLat | null = m(0, 0)): ComputeInput => ({ bodies: [body(), body()], tiles: [[t.x, t.y], [t.x, t.y]], zoom: 14, build: 'b1', overturePoints: overture, archivePlaces: null, analyzeAt });

/** readAround's body before this slice, after the fetches: what the compute must give (DC13). */
function before(i: ComputeInput) {
  const out = { roads: [] as ReturnType<typeof decodeTile>['roads'], names: [] as ReturnType<typeof decodeTile>['names'], places: [] as ReturnType<typeof decodeTile>['places'], pois: [] as ReturnType<typeof decodeTile>['pois'], landcover: [] as NonNullable<ReturnType<typeof decodeTile>['landcover']> };
  i.tiles.forEach(([x, y], k) => {
    const f = decodeTile(new Uint8Array(i.bodies[k]), i.zoom, x, y);
    out.roads.push(...f.roads); out.names.push(...f.names); out.places.push(...f.places); out.pois.push(...f.pois); out.landcover.push(...(f.landcover ?? []));
  });
  const segments = deriveSegments(out.roads, out.names, i.build);
  const tilePlaces = placesFromTilePois(out.pois, i.build);
  const places = refineRead(tilePlaces, { landcover: out.landcover, archive: undefined });
  const points = mergeSources(activityFromTilePois(out.pois), i.overturePoints);
  const towns = placesFromTiles(out.places);
  const transit = transitFromTilePois(out.pois);
  const analysis = i.analyzeAt ? analyzeArea({ centre: i.analyzeAt, points, segments, towns, transit }) : null;
  return { segments, tilePlaces, places, points, towns, transit, analysis };
}

test('DC13: the compute gives readAround\'s result, measured or not', () => {
  assert.deepEqual(computeRead(input()), before(input()));
  assert.deepEqual(computeRead(input(null)), before(input(null)));
  assert.ok(before(input()).segments.length > 0 && before(input()).analysis?.strips.length, 'the fixture has busy streets to measure');
});

test('DC13: the worker\'s side of the exchange gives the same, through a structured clone as a worker\'s message is', () => {
  const reply = handleComputeMessage(structuredClone(input()));
  assert.equal(reply.ok, true);
  assert.deepEqual(reply.ok && structuredClone(reply.out), before(input()));
  const bad = handleComputeMessage({ nonsense: true });
  assert.equal(bad.ok, false, 'a message it can\'t read answers an error, never throws');
});

test('DC11: the compute yields between tiles and between stages, with the same result', async () => {
  let pauses = 0;
  const out = await computeReadPaced(input(), async () => { pauses++; });
  assert.deepEqual(out, before(input()));
  // Two tiles, then the streets, the places, the activity and the measure: a pause before each.
  assert.ok(pauses >= 2 + 4, `${pauses} pauses`);
});
