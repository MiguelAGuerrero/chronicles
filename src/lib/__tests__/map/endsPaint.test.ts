/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { CircleLayerSpecification } from 'maplibre-gl';
import { COLORS, ENDS_PAINT } from '../../../components/map/types';

// tend map T16 (the owner's yes, Nov 12): a walk's start and end differed by colour alone, two white discs
// ringed one green and one orange (WCAG 2.2, 1.4.1 Use of Color). The start stays hollow; the end is solid,
// filled in the walked colour with a white ring, so shape tells them apart. No new hue (T22 is open).

/** A maplibre `['match', ['get', 'kind'], 'start', a, b]`, or a constant, read for one marker. */
function paintFor(value: unknown, kind: 'start' | 'end'): unknown {
  if (!Array.isArray(value) || value[0] !== 'match') return value;
  const [, input, ...rest] = value as [string, unknown, ...unknown[]];
  assert.deepEqual(input, ['get', 'kind'], 'the markers are told apart by their kind');
  const fallback = rest[rest.length - 1];
  for (let i = 0; i + 1 < rest.length - 1; i += 2) if (rest[i] === kind) return rest[i + 1];
  return fallback;
}

const WHITE = '#ffffff';

test('tend map T16: the start is hollow, a white disc ringed in the trace\'s green', () => {
  assert.equal(paintFor(ENDS_PAINT['circle-color'], 'start'), WHITE);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], 'start'), COLORS.trace);
});

test('tend map T16: the end is solid, a disc filled in the walked colour with a white ring', () => {
  assert.equal(paintFor(ENDS_PAINT['circle-color'], 'end'), COLORS.walked);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], 'end'), WHITE);
});

test('tend map T16: the two differ in their fill, not only their ring, and are one size', () => {
  assert.notEqual(paintFor(ENDS_PAINT['circle-color'], 'start'), paintFor(ENDS_PAINT['circle-color'], 'end'));
  assert.equal(typeof ENDS_PAINT['circle-radius'], 'number');
  assert.equal(typeof ENDS_PAINT['circle-stroke-width'], 'number');
  // No new hue: the end takes the walked colour the streets already have.
  const hues = new Set([WHITE, COLORS.trace, COLORS.walked]);
  for (const kind of ['start', 'end'] as const) {
    assert.ok(hues.has(paintFor(ENDS_PAINT['circle-color'], kind) as string));
    assert.ok(hues.has(paintFor(ENDS_PAINT['circle-stroke-color'], kind) as string));
  }
});

test('tend map T16: both maps draw the ends layer with this paint, web and native', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  assert.match(web, /id: 'ends', type: 'circle', source: 'ends',\s*paint: ENDS_PAINT\b/);
  assert.match(native, /<Layer id="ends" type="circle" paint=\{\{\s*\.\.\.ENDS_PAINT,/);
});

test('tend map audit 9: ENDS_PAINT is a valid circle paint, type-checked with no cast', () => {
  // A misspelt key or a wrong value type fails the typecheck here: the maps no longer cast it away.
  const paint: NonNullable<CircleLayerSpecification['paint']> = ENDS_PAINT;
  for (const key of Object.keys(paint)) assert.match(key, /^circle-/);
  const web = readFileSync(join(__dirname, '../../../components/map/WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(__dirname, '../../../components/map/WalkMap.native.tsx'), 'utf8');
  assert.match(web, /paint: ENDS_PAINT \}\);/, 'the web passes ENDS_PAINT as it is');
  assert.doesNotMatch(native, /'circle-stroke-opacity': props\.traceOpacity \?\? 1,\s*\} as never\}/, 'native spreads it with no cast');
});
