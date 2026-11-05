/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tileAt } from '../../tileMath';
import type { LngLat } from '../../types';
import { junctionsFromWays } from '../../walk/overpass';
import { junctionsFromOvertureTile } from '../../walk/overtureSegments';
import type { WayFacts } from '../../walk/types';
import { encodeTile } from '../mvtFixture';

// Urban form, the data (UF3, UF8), written from specs/walkability-urban-form/spec.md before the code.

const O: LngLat = [-75.19, 40.69];
const T = tileAt(O);
const at = (dx: number, dy = 0): LngLat => [O[0] + dx / 84_000, O[1] + dy / 110_540];
const way = (id: string, line: LngLat[]): WayFacts => ({ id, cls: 'residential', level: 0, line });

const conns = (...ids: string[]) => JSON.stringify(ids.map((id, k) => ({ connector_id: id, at: k })));
const road = (cls: string, ids: string[], a: LngLat, b: LngLat) => ({ layer: 'segment', props: { subtype: 'road', class: cls, connectors: conns(...ids) }, coords: [a, b] });

test('UF3: a junction is an Overture connector that two or more streets share, once; parking aisles, driveways and footways make none', () => {
  const bytes = encodeTile(
    [
      { layer: 'connector', props: { id: 'c1' }, coords: at(0) },
      { layer: 'connector', props: { id: 'c2' }, coords: at(100) },
      { layer: 'connector', props: { id: 'c1' }, coords: at(0) },
      { layer: 'connector', props: { id: 'p1' }, coords: at(300) },
      { layer: 'connector', props: { id: 'e1' }, coords: at(200) },
      road('residential', ['c1', 'c2'], at(0), at(100)),
      road('tertiary', ['c1', 'e1'], at(0), at(0, 100)),
      road('service', ['p1', 'e1'], at(300), at(300, 50)),
      road('service', ['p1'], at(300), at(350)),
      road('footway', ['c2'], at(100), at(100, 20)),
    ],
    14, T.x, T.y,
  );
  const j = junctionsFromOvertureTile(bytes.buffer as ArrayBuffer, T.x, T.y);
  assert.equal(j.length, 1, 'c1: shared by two streets. c2 is a street end met only by a footway, p1 and e1 meet a service way');
  assert.ok(Math.abs(j[0][0] - at(0)[0]) < 1e-4);
  assert.deepEqual(junctionsFromOvertureTile(encodeTile([{ layer: 'segment', props: { subtype: 'road', class: 'residential' }, coords: [at(0), at(50)] }], 14, T.x, T.y).buffer as ArrayBuffer, T.x, T.y), [], 'no connectors: none, not a guess');
});

test('UF3: from Overpass, a junction is a point where two or more ways share a node; a lone way\'s ends are not', () => {
  const ways = [
    way('a', [at(0), at(50), at(100)]),
    way('b', [at(50), at(50, 80)]),
    way('c', [at(50), at(50, -80)]),
    way('d', [at(300), at(400)]),
  ];
  const j = junctionsFromWays(ways);
  assert.equal(j.length, 1, 'three ways meet at one node');
  assert.ok(Math.abs(j[0][0] - at(50)[0]) < 1e-5 && Math.abs(j[0][1] - at(50)[1]) < 1e-5);
  assert.deepEqual(junctionsFromWays([way('x', [at(0), at(10)])]), []);
  assert.deepEqual(junctionsFromWays([way('s1', [at(0), at(50)]), { ...way('s2', [at(0), at(0, 50)]), cls: 'service', sub: 'parking_aisle' }]), [], 'a parking aisle meeting a street is not a street junction');
  // The footways beside a street share no node with it and make none.
  assert.deepEqual(junctionsFromWays([way('s', [at(0), at(100)]), { ...way('f', [at(0, 8), at(100, 8)]), cls: 'footway', sub: 'sidewalk' }]), []);
});
