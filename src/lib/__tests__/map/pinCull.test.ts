/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { boxAround, boxHolds, drawsPin, END_MARK_R, inBox, PIN_CULL_MARGIN, PIN_MAX_LIFT, PIN_REACH_PX, PIN_STEM, pinDrawBox, type ViewBox } from '../../pins';

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
  assert.match(hook, /map\.on\('moveend', moved\)/, 'a move past the box redraws on its end');
  assert.doesNotMatch(hook, /useState<[^>]*ViewBox/, 'the box is never React state');
});

// The review (tend map 16's auditor, Nov 17): F1, F5 and F3, accepted.

/** A flat projection for the tests: `px` pixels of the canvas `w` x `h` to where they lie, the view `v` unturned. */
const flatUnproject = (v: ViewBox, w: number, h: number) => ([x, y]: readonly [number, number]): [number, number] =>
  [v[0] + ((v[2] - v[0]) * x) / w, v[3] - ((v[3] - v[1]) * y) / h];

test('tend map audit 35: a pin reaches 24 px either side of its foot and its height above it, so the view grows by that much', () => {
  assert.deepEqual(PIN_REACH_PX, { top: 0, right: 24, bottom: 48 + PIN_MAX_LIFT, left: 24 });
  // The lift is the most stalkLift can give, two overlapping markers' worth.
  assert.equal(PIN_MAX_LIFT, 2 * (2 * END_MARK_R + PIN_STEM));
  // The canvas's corners, grown, and the box round them (a turned map's corners give a box round the turned view).
  assert.deepEqual(boxAround([[-71.4, 41.8], [-71.38, 41.79], [-71.41, 41.83]]), [-71.41, 41.79, -71.38, 41.83]);
});

test('tend map audit 35: panned until the view meets the box, a pin 4 px past its edge has its head on screen and is drawn', () => {
  // The review's input: view [-71.41, 41.81, -71.39, 41.83], 400 x 800 px; panned south half a screen.
  const w = 400;
  const h = 800;
  const drawn = pinDrawBox([-71.41, 41.81, -71.39, 41.83], 0.5);
  // Its bottom on the box's south edge (read from the box, so the floating point agrees).
  const panned: ViewBox = [-71.41, drawn[1], -71.39, drawn[1] + 0.02];
  const un = flatUnproject(panned, w, h);
  const pin: [number, number] = [-71.4, drawn[1] - (0.02 * 4) / h];
  const r = PIN_REACH_PX;
  const grown = boxAround([un([-r.left, -r.top]), un([w + r.right, -r.top]), un([w + r.right, h + r.bottom]), un([-r.left, h + r.bottom])]);
  assert.equal(boxHolds(drawn, panned, 0.5), true, 'the bare view is still inside the box: the cut the review found');
  assert.equal(boxHolds(drawn, grown, 0.5), false, 'the view grown by a pin\'s reach is not, so the box is drawn again');
  assert.equal(inBox(pin, pinDrawBox(grown, 0.5)), true, 'and the pin is in the new box');
});

test('tend map audit 37: a pin out of the box stays drawn while it holds the focus, or was the last pressed (its viewer returns the focus there)', () => {
  const box = pinDrawBox(view);
  const far: [number, number] = [-71.5, 41.9];
  assert.equal(drawsPin(far, box, { focused: false, pressed: false }), false);
  assert.equal(drawsPin(far, box, { focused: true, pressed: false }), true);
  assert.equal(drawsPin(far, box, { focused: false, pressed: true }), true);
  assert.equal(drawsPin([-71.4, 41.82], box, { focused: false, pressed: false }), true);
});

test('tend map audit 35, 36, 37: the web map grows the view by a pin\'s reach, redraws during a move, and keeps the focused or pressed pin', () => {
  const src = readFileSync(WEB, 'utf8');
  const start = src.indexOf('function usePinMarkers(');
  const hook = src.slice(start, src.indexOf('\n}\n', start));
  // audit 35: the view the box is judged by is the canvas grown by PIN_REACH_PX, read through unproject.
  const reach = /const pinViewOf = [\s\S]*?\n};/.exec(src)?.[0] ?? '';
  assert.match(reach, /PIN_REACH_PX/, 'pinViewOf grows the canvas by a pin\'s reach');
  assert.match(reach, /map\.unproject\(/, 'pinViewOf reads the grown corners through the map');
  assert.match(hook, /boxHolds\(drawn\.current, pinViewOf\(map\)\)/, 'the box is judged against the grown view');
  // audit 36: during a move, not only at its end.
  assert.match(hook, /map\.on\('move', moved\)/, 'a move redraws as it goes when it leaves the box');
  // audit 37: the focused pin, and the last pressed, are never dropped.
  assert.match(hook, /const focused = [^;]*\.contains\(document\.activeElement\);\s*if \(!drawsPin\(pin\.lngLat, box, \{ focused, pressed: pressed\.current === pin\.id \}\)\) continue;/, 'the loop asks drawsPin with the focus and the last press');
  assert.match(hook, /pressed\.current = id;/, 'a press is remembered');
});
