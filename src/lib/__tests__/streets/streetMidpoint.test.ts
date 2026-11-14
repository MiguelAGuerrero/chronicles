import assert from 'node:assert/strict';
import { test } from 'node:test';
import { streetMidpoint } from '../../streetMidpoint';
import type { StreetSegment } from '../../types';

// A street piece's middle point, out of walk.tsx (refactor streets 1, R1; paying back errors-handled's import line).

test('refactor streets 1: the middle point of the first line; none is [0, 0]', () => {
  const seg = (geometry: [number, number][][]) => ({ geometry }) as unknown as StreetSegment;
  assert.deepEqual(streetMidpoint(seg([[[0, 0], [1, 1], [2, 2]]])), [1, 1]);
  assert.deepEqual(streetMidpoint(seg([[[0, 0], [1, 1], [2, 2], [3, 3]]])), [2, 2]);
  assert.deepEqual(streetMidpoint(seg([])), [0, 0]);
});
