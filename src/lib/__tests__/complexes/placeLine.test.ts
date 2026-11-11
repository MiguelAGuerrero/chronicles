import assert from 'node:assert/strict';
import test from 'node:test';
import { complexAt } from '../../complexes/place';
import { COMPLEX_CODE, type Complex } from '../../complexes/types';
import { arrivalLine, placeLine, STREET_REACH_M } from '../../resurface/context';
import { distanceM } from '../../geo';
import type { LngLat } from '../../types';

// CX11: a moment keeps its street; the complex leads. CX13: only the arrival line names it.

function box(id: string, name: string, w: number, s: number, size = 0.001): Complex {
  const ring: LngLat[] = [[w, s], [w + size, s], [w + size, s + size], [w, s + size], [w, s]];
  return { id, name, kind: 'shopping', polygons: [[ring]], at: [w + size / 2, s + size / 2], bbox: [w, s, w + size, s + size], release: 'r', code: COMPLEX_CODE };
}
const square = box('sq', 'Strawberry Square', -76.8826, 40.2599);
const inside: LngLat = [-76.8821, 40.2604];

test('CX11: inside, the line leads with the complex and keeps the street and town; near, "Near ..."; farther, as MC1', { todo: 'test first' }, () => {
  assert.equal(placeLine({ street: 'N 2nd St', town: 'Harrisburg', complex: { name: 'Strawberry Square', near: false } }), 'Strawberry Square, N 2nd St, Harrisburg');
  assert.equal(placeLine({ street: 'N 2nd St', town: 'Harrisburg', complex: { name: 'Strawberry Square', near: true } }), 'Near Strawberry Square, N 2nd St, Harrisburg');
  assert.equal(placeLine({ street: 'N 2nd St', town: 'Harrisburg', complex: null }), 'N 2nd St, Harrisburg');
  assert.equal(placeLine({ street: null, town: 'Harrisburg', complex: { name: 'Strawberry Square', near: false } }), 'Strawberry Square, Harrisburg');
  assert.equal(complexAt(inside, [square])?.near, false);
  const justOut: LngLat = [-76.8826 - 0.0003, 40.2604];
  assert.ok(distanceM(justOut, [-76.8826, 40.2604]) < STREET_REACH_M);
  assert.equal(complexAt(justOut, [square])?.near, true);
  assert.equal(complexAt([-76.87, 40.27], [square]), null);
  const line = arrivalLine({ street: 'N 2nd St', town: 'Harrisburg', complex: { name: 'Strawberry Square', near: false }, t: Date.UTC(2026, 9, 20, 22), now: Date.UTC(2026, 10, 11), walkedMs: 600000, prev: null });
  assert.ok(line.startsWith('Strawberry Square, N 2nd St, Harrisburg · '), line);
});

test('CX11: overlapping complexes give one name, the same each time', { todo: 'test first' }, () => {
  const big = box('big', 'Big One', -76.8830, 40.2595, 0.002);
  const a = complexAt(inside, [square, big]);
  const b = complexAt(inside, [big, square]);
  assert.equal(a?.complex.id, b?.complex.id);
  assert.equal(a?.complex.id, 'sq', 'the smaller outline wins');
});
