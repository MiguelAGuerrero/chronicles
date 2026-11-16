import assert from 'node:assert/strict';
import { test } from 'node:test';
import { swapCandidate } from '../../outing/swap';
import { FROM, SHOPS } from './fixtures';

const ANTIQUES = { what: ['antiques'] } as const;
const [a1, a2, a3, a4] = SHOPS;

test('QC21: swap offers the other shop nearest the one it replaces, not held', { todo: 'test first' }, () => {
  const next = swapCandidate(a1, [a1, a2], SHOPS, ANTIQUES, FROM, 3500, new Set());
  assert.ok(next && next.id !== a1.id && next.id !== a2.id);
  assert.ok(next!.facets.what.includes('antiques'), 'of the picked entries');
});

test('QC21: a shop offered for a slot is not offered for it again, and nothing wraps', { todo: 'test first' }, () => {
  const seen = new Set<string>();
  const got: string[] = [];
  for (let i = 0; i < 6; i++) {
    const n = swapCandidate(a1, [a1, a2], SHOPS, ANTIQUES, FROM, 3500, seen);
    if (!n) break;
    got.push(n.id);
    seen.add(n.id);
  }
  assert.deepEqual(got.sort(), [a3.id, a4.id].sort());
  assert.equal(swapCandidate(a1, [a1, a2], SHOPS, ANTIQUES, FROM, 3500, seen), null, 'none left: no wrap');
});

test('QC21: beyond the ceiling is not offered', { todo: 'test first' }, () => {
  assert.equal(swapCandidate(a1, [a1, a2, a3, a4], SHOPS, ANTIQUES, FROM, 3500, new Set()), null);
  assert.equal(swapCandidate(a1, [a1], SHOPS, ANTIQUES, FROM, 100, new Set()), null);
});
