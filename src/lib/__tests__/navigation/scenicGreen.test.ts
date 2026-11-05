/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeTile } from '../../discovery/tileDecode';
import { placesFromTilePois } from '../../discovery/tilePois';
import { greenFromTiles, insideGreen } from '../../nav/scenicSignals';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { at } from '../foxPoint';
import { encodeTile } from '../mvtFixture';

// Scenic routes, SR15: green areas come from the map's own tiles, OpenMapTiles' `landcover` layer
// (grass/park, grass/garden, wood/*), decoded in code. Checked against the real Zurich tiles of
// tileserver-gl's test_data.zip in the session (specs/scenic-routes/spec.md, Record); this fixture
// holds the same classes.

const box = (x0: number, x1: number, y0: number, y1: number): LngLat[][] => [[at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1), at(x0, y0)]];

test('SR15: landcover parks, gardens and woods become green areas; meadows and farmland do not', () => {
  const t = tileAt(at(0, 0));
  const bytes = encodeTile(
    [
      { layer: 'landcover', props: { class: 'grass', subclass: 'park' }, coords: box(0, 2, 0, 1) },
      { layer: 'landcover', props: { class: 'grass', subclass: 'garden' }, coords: box(3, 3.5, 0, 0.5) },
      { layer: 'landcover', props: { class: 'wood', subclass: 'forest' }, coords: box(-2, -1, 0, 1) },
      { layer: 'landcover', props: { class: 'grass', subclass: 'meadow' }, coords: box(-2, -1, -2, -1) },
      { layer: 'landcover', props: { class: 'farmland', subclass: 'farmland' }, coords: box(0, 1, -2, -1) },
      { layer: 'poi', props: { class: 'park', subclass: 'park', name: 'Prospect Park' }, coords: at(1, 0.5) },
    ],
    14, t.x, t.y,
  );
  const f = decodeTile(bytes, 14, t.x, t.y);
  assert.equal(f.landcover?.length, 5, 'the landcover layer is decoded');
  const parks = placesFromTilePois(f.pois.map((p) => ({ ...p, zoom: 14 })), 't').filter((p) => p.category === 'parks');
  const green = greenFromTiles(f.landcover ?? [], parks);
  assert.equal(green.length, 3);
  const kinds = green.map((g) => `${g.kind}:${g.name ?? ''}`).sort();
  assert.deepEqual(kinds, ['park:', 'park:Prospect Park', 'wood:']);
  assert.ok(insideGreen(at(1, 0.5), green), 'inside the park');
  assert.ok(insideGreen(at(-1.5, 0.5), green), 'inside the wood');
  assert.ok(!insideGreen(at(-1.5, -1.5), green), 'a meadow is not green here');
  assert.ok(!insideGreen(at(2.5, 0.5), green), 'between them');
});

test('SR15: a map read without landcover (the map\'s own collect) gives no green, not an error', () => {
  assert.deepEqual(greenFromTiles([], []), []);
});
