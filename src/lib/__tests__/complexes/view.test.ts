import assert from 'node:assert/strict';
import test from 'node:test';
import { createComplexes } from '../../complexes/shell';
import { COMPLEX_CODE, type Complex, type ComplexSource } from '../../complexes/types';
import type { LngLat } from '../../types';

// CX12: viewing a moment makes no request; the line changes once, never back.

const at: LngLat = [-76.8821, 40.2604];
const row: Complex = { id: 'a', name: 'Strawberry Square', kind: 'shopping', polygons: [[[[-76.8826, 40.2599], [-76.8816, 40.2599], [-76.8816, 40.2609], [-76.8826, 40.2609], [-76.8826, 40.2599]]]], at, bbox: [-76.8826, 40.2599, -76.8816, 40.2609], release: 'r', code: COMPLEX_CODE };

test('CX12: lineFor reads the store alone: no request with none cached, then the complex once it is, and not back', { todo: 'test first' }, async () => {
  let requests = 0;
  const source: ComplexSource = { read: async () => { requests++; return { ok: false }; } };
  let held: Complex[] = [];
  const c = createComplexes({ source, store: { putComplexes: async (r) => void (held = r), complexesNear: async () => held }, now: () => 0 });
  assert.equal(await c.lineFor(at), null, 'the street line while nothing is cached');
  held = [row];
  assert.equal((await c.lineFor(at))?.complex.name, 'Strawberry Square');
  assert.equal((await c.lineFor(at))?.complex.name, 'Strawberry Square', 'it does not flip back');
  assert.equal(requests, 0, 'showing a moment never fetches');
});
