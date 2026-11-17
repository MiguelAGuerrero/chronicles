/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { boxHolds, inBox, PIN_CULL_MARGIN, pinDrawBox, type ViewBox } from '../../pins';

// tend map 16: the web map draws only the pins in view and a margin round it. Every pin was a DOM marker with its own
// React root, and maplibre moves each on every camera frame: on Chronicle's map that was every placed moment in the
// world (500 markers, 8 in view, frames of 75 ms at 4x CPU over a drag). The box is widened by a margin and redrawn
// only when the view leaves it, on the move's end, never as React state per pan (the render budget).

const view: ViewBox = [-71.41, 41.81, -71.39, 41.83];

test('tend map 16: the drawn box is the view widened by the margin on each side', () => {
  assert.equal(PIN_CULL_MARGIN, 0.5);
  const [w, s, e, n] = pinDrawBox(view);
  assert.ok(Math.abs(w - -71.42) < 1e-9 && Math.abs(e - -71.38) < 1e-9, `${w}, ${e}`);
  assert.ok(Math.abs(s - 41.8) < 1e-9 && Math.abs(n - 41.84) < 1e-9, `${s}, ${n}`);
});

test('tend map 16: a pin in the view or its margin is drawn; one past the margin is not', () => {
  const box = pinDrawBox(view);
  assert.equal(inBox([-71.4, 41.82], box), true, 'in view');
  assert.equal(inBox([-71.415, 41.805], box), true, 'in the margin');
  assert.equal(inBox([-71.43, 41.82], box), false, 'west of the margin');
  assert.equal(inBox([-71.4, 41.85], box), false, 'north of the margin');
});

test('tend map 16: across the antimeridian, a pin a world away is the same pin', () => {
  // maplibre's bounds run past 180 when the view crosses it.
  const box: ViewBox = [179.9, -0.1, 180.1, 0.1];
  assert.equal(inBox([-179.95, 0], box), true);
  assert.equal(inBox([179.95, 0], box), true);
  assert.equal(inBox([-179, 0], box), false);
});

test('tend map 16: a move inside the drawn box draws nothing new; one past it, or no box yet, does', () => {
  const drawn = pinDrawBox(view);
  assert.equal(boxHolds(drawn, [-71.415, 41.805, -71.395, 41.825]), true, 'panned within the margin');
  assert.equal(boxHolds(drawn, [-71.425, 41.81, -71.405, 41.83]), false, 'panned past the west margin');
  assert.equal(boxHolds(drawn, [-71.45, 41.79, -71.35, 41.85]), false, 'zoomed out past it');
  assert.equal(boxHolds(null, view), false, 'nothing drawn yet');
});

test('tend map 16: a zoom in of more than a level draws afresh; a smaller one keeps the box', () => {
  const drawn = pinDrawBox(view);
  // Half the view's width and height (a level in): the box is 4 times as wide, within twice what it would draw now.
  assert.equal(boxHolds(drawn, [-71.405, 41.815, -71.395, 41.825]), true, 'one level in');
  // A quarter (two levels in): the wide view's pins would all stay drawn.
  assert.equal(boxHolds(drawn, [-71.4025, 41.8175, -71.3975, 41.8225]), false, 'two levels in');
});

const WEB = join(__dirname, '../../../components/map/WalkMap.web.tsx');

test('tend map 16: the web map draws a pin only inside the drawn box, and redraws on a move past it, outside render', () => {
  const src = readFileSync(WEB, 'utf8');
  const start = src.indexOf('function usePinMarkers(');
  assert.ok(start > 0, 'usePinMarkers is found');
  const hook = src.slice(start, src.indexOf('\n}\n', start));
  assert.match(hook, /for \(const pin of pins\) \{\s*if \(!inBox\(pin\.lngLat, box\)\) continue;/, 'the marker loop skips a pin outside the drawn box');
  assert.match(hook, /map\.on\('moveend', moved\)/, 'a move past the box redraws on its end');
  assert.match(hook, /boxHolds\(drawn\.current, viewBoxOf\(map\)\)/, 'a move inside the box draws nothing new');
  assert.doesNotMatch(hook, /useState<[^>]*ViewBox/, 'the box is never React state');
});
