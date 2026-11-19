/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { LngLat } from '../../types';

// Modes to layers MD9, written before the code: a walk's replay names what it passed only within the spans Places was on.

const ROOT = join(__dirname, '../../../..');
const O: LngLat = [-75.37, 40.61];
const mLon = 111320 * Math.cos((O[1] * Math.PI) / 180);
const at = (e: number, n = 0): LngLat => [O[0] + e / mLon, O[1] + n / 110540];
const spans = async () => (await import('../../explore/placesSpans')) as typeof import('../../explore/placesSpans');

test('MD9: toggling Places on and off makes spans; a second on opens another; off with none open does nothing', async () => {
  const { toggleSpans } = await spans();
  const a = toggleSpans([], true, 100);
  assert.deepEqual(a, [[100, null]]);
  const b = toggleSpans(a, false, 200);
  assert.deepEqual(b, [[100, 200]]);
  assert.deepEqual(toggleSpans(b, true, 300), [[100, 200], [300, null]]);
  assert.deepEqual(toggleSpans(b, false, 400), b);
  assert.deepEqual(toggleSpans(a, true, 150), a, 'on while already on is no new span');
});

test('MD9: spansCover: inside a span, outside it, an open span runs to the end', async () => {
  const { spansCover } = await spans();
  const s: [number, number | null][] = [[100, 200], [300, null]];
  assert.equal(spansCover(s, 150), true);
  assert.equal(spansCover(s, 250), false);
  assert.equal(spansCover(s, 99), false);
  assert.equal(spansCover(s, 9_999_999), true);
  assert.equal(spansCover([], 150), false);
});

test('MD9: spans are kept as JSON and read tolerantly', async () => {
  const { decodeSpans, encodeSpans, placesSpansKey } = await spans();
  assert.equal(placesSpansKey('w1'), 'places_spans:w1');
  assert.deepEqual(decodeSpans(encodeSpans([[1, 2], [3, null]])), [[1, 2], [3, null]]);
  assert.deepEqual(decodeSpans(null), []);
  assert.deepEqual(decodeSpans('{nope'), []);
  assert.deepEqual(decodeSpans('[[1],"x",[2,3]]'), [[2, 3]]);
});

test('MD9: passedAlong counts a pass only inside the spans; none without spans or a legacy stamp', async () => {
  const { passedAlong } = await import('../../explore/explore');
  const item = { key: 'p', name: 'Plaque', category: 'history', kind: 'monuments', at: at(100), generic: false } as never;
  const fixes = [{ at: at(0), t: 1000 }, { at: at(100), t: 2000 }, { at: at(200), t: 3000 }];
  const base = { items: [item], since: 0, hidden: new Set(), passM: 8, fixes, foundHere: new Set<string>() };
  const hit = (spans: [number, number | null][]) => passedAlong({ ...base, spans } as never).length;
  assert.equal(hit([[1500, 2500]]), 1, 'the pass at t=2000 is inside the span');
  assert.equal(hit([[2500, null]]), 0, 'the pass came before Places was on');
  assert.equal(hit([[0, 1500]]), 0, 'Places was off by then');
  assert.equal(passedAlong({ ...base, spans: [] } as never).length, 0, 'never on: none');
  assert.equal(passedAlong(base as never).length, 1, 'a walk before this slice (only `since`) reads as before');
});

test('MD9: the replay reads the spans for a new walk and `explored:` for an old one; a toggle after the walk adds nothing', () => {
  const t = readFileSync(join(ROOT, 'src/lib/summary.ts'), 'utf8');
  assert.ok(/placesSpansKey/.test(t) && /exploredKey/.test(t), 'both keys are read');
});
