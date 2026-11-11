import assert from 'node:assert/strict';
import test from 'node:test';
import { findFor, type ChecklistItem } from '../../explore/explore';
import { complexesFrom } from '../../complexes/rule';
import type { LngLat } from '../../types';
import { fixture, piecesOf, placesOf, RELEASE, tilesOf } from './fixtures';

// CX8: a complex is no mark, no checklist item, no find and no kind's bar.

const spot: LngLat = [-76.8821, 40.2604];
const mark: ChecklistItem = { key: 'm', area_key: null, name: 'A statue', category: 'history', kind: 'monuments', at: [-76.88211, 40.26041], generic: false };

test('CX8: a complex has no mark fields; a capture inside one finds its mark as before and nothing because of the complex', { todo: 'test first' }, () => {
  const h = fixture('harrisburg');
  const real = complexesFrom(piecesOf(h), placesOf(h), tilesOf(h), RELEASE);
  assert.ok(real.length > 0);
  for (const c of real) for (const k of ['markable', 'category', 'generic', 'area_key', 'key']) assert.equal(k in c, false, `${c.name}.${k}`);
  assert.equal(findFor(spot, [mark], new Set())?.key, 'm');
  assert.equal(findFor(spot, [], new Set()), null, 'with no mark there, a complex finds nothing');
  assert.equal(findFor(spot, [mark], new Set(['m'])), null);
});
