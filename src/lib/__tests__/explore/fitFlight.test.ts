/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { refitOnResize } from '../../atlas/fitFlight';

// tend explore 17 (AT9, specs/explore-atlas): opening an area's card frames it with its ring, under the title. The card
// folds the tabs away as it opens, so Explore's map grows (539 to 601 px in the e2e) while the card's fit is flying, and
// maplibre (6.16) landed that flight at the bounds' own middle, the padding's offset lost: the area sat at the map's
// middle, not 30 px below it (the weekly full pass on acb18b06; since b347dcdb, whose heavier card moved the tabs' fold
// into the flight). A fit still flying when its box changes size is asked again at the new size.

const BOX = { width: 390, height: 539 };

test('tend explore 17: a fit still flying when the map grows is asked again at the new size', () => {
  assert.equal(refitOnResize(BOX, { width: 390, height: 601 }, true), true, 'the tabs folded away mid-flight');
  assert.equal(refitOnResize(BOX, { width: 320, height: 539 }, true), true, 'narrower too');
});

test('tend explore 17: a landed fit, a box the same size or a map at rest is left be', () => {
  assert.equal(refitOnResize(null, { width: 390, height: 601 }, true), false, 'no fit flying: a move of the reader\'s, or none');
  assert.equal(refitOnResize(BOX, { ...BOX }, true), false, 'the same size: nothing to correct');
  assert.equal(refitOnResize(BOX, { width: 390, height: 601 }, false), false, 'the flight has landed');
});

test('tend explore 17: the web map asks it on every resize and keeps the fit it is flying', () => {
  const src = readFileSync(join(__dirname, '../../../components/map/WalkMap.web.tsx'), 'utf8');
  const handler = /map\.on\('resize', (\w+)\)/g;
  const names = [...src.matchAll(handler)].map((m) => m[1]);
  const asks = names.some((n) => new RegExp(`const ${n} = \\(\\) => \\{[\\s\\S]{0,600}?refitOnResize\\(`).test(src));
  assert.ok(asks, `a resize handler of the map calls refitOnResize (handlers: ${names.join(', ')})`);
  assert.match(src, /map\?\.fitBounds\([^;]+\);\s*\n\s*if \(map\?\.isMoving\(\)\) flight\.current = /, 'each fit that moves is recorded as the flight under way');
});
