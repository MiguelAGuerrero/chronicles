/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyAffine,
  applyMatrix,
  aspectRect,
  clampCrop,
  clampTrim,
  cropToRotated,
  cropFromRotated,
  editedSize,
  emptyEdit,
  exportPlan,
  FILTER_IDS,
  FILTERS,
  isEmptyEdit,
  MAX_STROKES,
  parseEdit,
  PEN_COLORS,
  PEN_SIZES,
  resizeCrop,
  rotateBy,
  serializeEdit,
  simplifyStroke,
  strokeHit,
  strokeWidthFor,
  toFrame,
  trimLabel,
  type MediaEdit,
} from '../mediaEdit';

// Media editing (ME1-ME23), written from the criteria before the code.

const edit = (o: Partial<MediaEdit> = {}): MediaEdit => ({ ...emptyEdit(), ...o });
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
const grey = (v: number): [number, number, number] => [v, v, v];
const sat = ([r, g, b]: number[]) => Math.max(r, g, b) - Math.min(r, g, b);
const rectNear = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  (['x', 'y', 'w', 'h'] as const).forEach((k) => assert.ok(near(a[k], b[k], 1e-9), `${k}: ${a[k]} vs ${b[k]}`));

// ME5: rotate

test('ME5: four quarter turns come back to none', () => {
  let r = edit().rotate;
  const seen: number[] = [];
  for (let i = 0; i < 4; i++) {
    r = rotateBy(r);
    seen.push(r);
  }
  assert.deepEqual(seen, [90, 180, 270, 0]);
});

test('ME5: a quarter turn swaps the edited size', () => {
  assert.deepEqual(editedSize(400, 300, edit({ rotate: 90 })), { w: 300, h: 400 });
  assert.deepEqual(editedSize(400, 300, edit({ rotate: 180 })), { w: 400, h: 300 });
});

// ME6: crop

test('ME6: a crop never leaves the picture or goes under a tenth', () => {
  rectNear(clampCrop({ x: -0.2, y: 0.5, w: 0.5, h: 0.8 }), { x: 0, y: 0.2, w: 0.5, h: 0.8 });
  rectNear(clampCrop({ x: 0.95, y: 0.95, w: 0.01, h: 0.02 }), { x: 0.9, y: 0.9, w: 0.1, h: 0.1 });
  rectNear(clampCrop({ x: 0, y: 0, w: 2, h: 1.5 }), { x: 0, y: 0, w: 1, h: 1 });
});

test('ME6: aspect crops are centred and as large as fit', () => {
  // A 400x300 frame: Square is 300x300, centred.
  const sq = aspectRect('square', 400, 300);
  assert.ok(near(sq.w * 400, 300) && near(sq.h * 300, 300));
  assert.ok(near(sq.x, (1 - sq.w) / 2) && near(sq.y, 0));
  // 4:5 is portrait: 240x300.
  const p = aspectRect('4:5', 400, 300);
  assert.ok(near((p.w * 400) / (p.h * 300), 4 / 5));
  assert.ok(near(p.h, 1));
  // 16:9 in a tall frame: full width.
  const l = aspectRect('16:9', 300, 400);
  assert.ok(near(l.w, 1) && near((l.w * 300) / (l.h * 400), 16 / 9));
  assert.deepEqual(aspectRect('free', 400, 300), { x: 0, y: 0, w: 1, h: 1 });
});

test('ME6: dragging a corner resizes, keeps the aspect when one is chosen, and stays inside', () => {
  const r = resizeCrop({ x: 0, y: 0, w: 1, h: 1 }, 'br', -0.5, -0.2, null, 400, 300);
  assert.ok(near(r.w, 0.5) && near(r.h, 0.8) && r.x === 0 && r.y === 0);
  const sq = resizeCrop(aspectRect('square', 400, 300), 'br', -0.3, -0.1, 1, 400, 300);
  assert.ok(near((sq.w * 400) / (sq.h * 300), 1, 1e-6));
  const out = resizeCrop({ x: 0.5, y: 0.5, w: 0.3, h: 0.3 }, 'br', 1, 1, null, 400, 300);
  assert.ok(out.x + out.w <= 1 + 1e-9 && out.y + out.h <= 1 + 1e-9);
  const tiny = resizeCrop({ x: 0.2, y: 0.2, w: 0.5, h: 0.5 }, 'tl', 0.9, 0.9, null, 400, 300);
  assert.ok(tiny.w >= 0.1 - 1e-9 && tiny.h >= 0.1 - 1e-9);
});

// ME7: the crop is kept against the original

test('ME7: rotating after cropping keeps the same part of the picture', () => {
  const crop = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 }; // original fractions
  // The top-left quarter's centre stays inside the crop's mapped frame at every rotation.
  const p = { x: 0.25, y: 0.4 };
  for (const rotate of [0, 90, 180, 270] as const) {
    const f = toFrame(p, edit({ rotate, crop }));
    assert.ok(f.x > 0 && f.x < 1 && f.y > 0 && f.y < 1, `inside at ${rotate}`);
    // And the crop survives the trip to the rotated frame and back.
    const back = cropFromRotated(cropToRotated(crop, rotate), rotate);
    for (const k of ['x', 'y', 'w', 'h'] as const) assert.ok(near(back[k], crop[k]), `${k} at ${rotate}`);
  }
  // The crop's size swaps with the rotation.
  assert.deepEqual(editedSize(1000, 500, edit({ rotate: 90, crop })), { w: 200, h: 300 });
});

// ME9: filters

test('ME9: the presets are the nine, in order', () => {
  assert.deepEqual(FILTER_IDS, ['original', 'vivid', 'warm', 'cool', 'dramatic', 'fade', 'mono', 'noir', 'sepia']);
  for (const id of FILTER_IDS) assert.equal(FILTERS[id].matrix.length, 20, id);
});

test('ME9: Original is the identity', () => {
  for (const px of [[0, 0, 0], [255, 255, 255], [12, 200, 77]] as [number, number, number][]) {
    assert.deepEqual(applyMatrix(px, FILTERS.original.matrix), px);
  }
});

test('ME9: Vivid moves a colour away from its grey and leaves grey grey', () => {
  const c: [number, number, number] = [180, 120, 90];
  assert.ok(sat(applyMatrix(c, FILTERS.vivid.matrix)) > sat(c));
  assert.equal(sat(applyMatrix(grey(128), FILTERS.vivid.matrix)), 0);
});

test('ME9: Warm turns grey red above blue; Cool, blue above red', () => {
  const w = applyMatrix(grey(128), FILTERS.warm.matrix);
  assert.ok(w[0] > w[2]);
  const c = applyMatrix(grey(128), FILTERS.cool.matrix);
  assert.ok(c[2] > c[0]);
});

test('ME9: Dramatic moves values away from mid-grey and lowers saturation', () => {
  const dark = applyMatrix(grey(60), FILTERS.dramatic.matrix);
  const light = applyMatrix(grey(200), FILTERS.dramatic.matrix);
  assert.ok(dark[0] < 60 && light[0] > 200);
  const c: [number, number, number] = [180, 120, 90];
  assert.ok(sat(applyMatrix(c, FILTERS.dramatic.matrix)) < sat(c) * 1.35);
  const flat: [number, number, number] = [140, 120, 110];
  assert.ok(sat(applyMatrix(flat, FILTERS.dramatic.matrix)) / 30 < 1.35);
});

test('ME9: Fade lifts black, brings white down and lowers saturation', () => {
  assert.ok(applyMatrix([0, 0, 0], FILTERS.fade.matrix)[0] > 0);
  assert.ok(applyMatrix([255, 255, 255], FILTERS.fade.matrix)[0] < 255);
  const c: [number, number, number] = [180, 120, 90];
  assert.ok(sat(applyMatrix(c, FILTERS.fade.matrix)) < sat(c));
});

test('ME9: Mono gives equal channels; Noir too, further from mid-grey', () => {
  const c: [number, number, number] = [200, 90, 40];
  const m = applyMatrix(c, FILTERS.mono.matrix);
  assert.equal(sat(m), 0);
  const n = applyMatrix(c, FILTERS.noir.matrix);
  assert.equal(sat(n), 0);
  const dark: [number, number, number] = [60, 50, 40];
  assert.ok(Math.abs(applyMatrix(dark, FILTERS.noir.matrix)[0] - 128) > Math.abs(applyMatrix(dark, FILTERS.mono.matrix)[0] - 128));
});

test('ME9: Sepia turns grey red above green above blue', () => {
  const s = applyMatrix(grey(128), FILTERS.sepia.matrix);
  assert.ok(s[0] > s[1] && s[1] > s[2]);
});

test('ME9: results are whole numbers clamped to 0-255', () => {
  for (const id of FILTER_IDS) {
    for (const px of [[0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 255, 255]] as [number, number, number][]) {
      for (const v of applyMatrix(px, FILTERS[id].matrix)) assert.ok(Number.isInteger(v) && v >= 0 && v <= 255, `${id} ${px}`);
    }
  }
});

// ME10, ME11: drawing

test('ME10: Markup swatches, Black first; three thicknesses each for pen and marker', () => {
  assert.deepEqual(PEN_COLORS.map((c) => c.id), ['black', 'white', 'blue', 'green', 'yellow', 'red']);
  assert.equal(PEN_SIZES.pen.length, 3);
  assert.equal(PEN_SIZES.marker.length, 3);
  assert.ok(PEN_SIZES.marker[0] > PEN_SIZES.pen[2] * 0.9, 'a marker is wide');
  assert.ok(PEN_SIZES.pen[0] < PEN_SIZES.pen[1] && PEN_SIZES.pen[1] < PEN_SIZES.pen[2]);
});

test('ME10: the eraser hits a line it touches, not one it misses', () => {
  const s = { tool: 'pen' as const, color: 'red' as const, w: 0.01, pts: [0.1, 0.1, 0.9, 0.1] };
  assert.ok(strokeHit(s, { x: 0.5, y: 0.105 }, 0.01, 100, 100));
  assert.ok(!strokeHit(s, { x: 0.5, y: 0.5 }, 0.01, 100, 100));
  // A single dot is hit near it.
  assert.ok(strokeHit({ ...s, pts: [0.3, 0.3] }, { x: 0.305, y: 0.3 }, 0.01, 100, 100));
});

test('ME11: a line stays on its spot through a later crop and rotation', () => {
  const p = { x: 0.6, y: 0.3 };
  const crop = { x: 0.5, y: 0.2, w: 0.4, h: 0.4 };
  // Unedited: the same place.
  assert.deepEqual(toFrame(p, edit()), p);
  // Cropped: the crop's own fractions.
  const c = toFrame(p, edit({ crop }));
  assert.ok(near(c.x, 0.25) && near(c.y, 0.25));
  // Rotated 90 clockwise with the same crop: the rotated frame's fractions.
  const r = toFrame(p, edit({ crop, rotate: 90 }));
  assert.ok(near(r.x, 0.75) && near(r.y, 0.25));
});

test('ME11: a thickness is kept against the original, so it looks the chosen size on the frame it was drawn on', () => {
  // Drawn on the whole 1000x500 picture: the chosen fraction of the shorter side.
  assert.ok(near(strokeWidthFor('pen', 1, 1000, 500, edit()), PEN_SIZES.pen[1]));
  // Drawn on a half-size crop: half as thick against the original.
  assert.ok(near(strokeWidthFor('pen', 1, 1000, 500, edit({ crop: { x: 0, y: 0, w: 0.5, h: 0.5 } })), PEN_SIZES.pen[1] / 2));
});

test('ME11: simplify keeps the ends and drops points on a straight run', () => {
  const pts = [0, 0, 0.1, 0.1, 0.2, 0.2, 0.3, 0.3, 0.3, 0.6];
  assert.deepEqual(simplifyStroke(pts, 0.001), [0, 0, 0.3, 0.3, 0.3, 0.6]);
  assert.deepEqual(simplifyStroke([0.5, 0.5], 0.001), [0.5, 0.5]);
});

test('ME11: no more than 50 lines', () => {
  assert.equal(MAX_STROKES, 50);
});

// ME14: trim

test('ME14: a trim keeps at least a second, inside the clip', () => {
  assert.deepEqual(clampTrim(-200, 900, 8000), { start_ms: 0, end_ms: 1000 });
  assert.deepEqual(clampTrim(7500, 9000, 8000), { start_ms: 7000, end_ms: 8000 });
  assert.deepEqual(clampTrim(2000, 5000, 8000), { start_ms: 2000, end_ms: 5000 });
  // A clip under a second keeps all of it.
  assert.deepEqual(clampTrim(100, 300, 700), { start_ms: 0, end_ms: 700 });
});

test('ME14: the trim label says the kept times', () => {
  assert.equal(trimLabel(2000, 9400), '0:02 – 0:09');
  assert.equal(trimLabel(0, 65000), '0:00 – 1:05');
});

// ME19: the export plan

test('ME19: a photo plan keeps the crop\'s shape and caps the width', () => {
  const p = exportPlan({ w: 4000, h: 3000 }, edit({ crop: { x: 0.25, y: 0, w: 0.5, h: 1 } }), { maxW: 1600 });
  assert.deepEqual(p.out, { w: 1600, h: 1600 * (3000 / 2000) });
  // The original's top-left of the crop lands at the output's top-left.
  const o = applyAffine(p.matrix, { x: 1000, y: 0 });
  assert.ok(near(o.x, 0, 1e-6) && near(o.y, 0, 1e-6));
});

test('ME19: a video plan has even sides and the long side at most 1920', () => {
  const p = exportPlan({ w: 3840, h: 2160 }, edit({ rotate: 90 }), { maxLong: 1920, even: true });
  assert.equal(p.out.h, 1920);
  assert.equal(p.out.w % 2, 0);
  assert.equal(p.out.h % 2, 0);
  assert.ok(Math.abs(p.out.w - 1080) <= 2);
});

test('ME19: a rotated plan maps the original\'s corners to the output\'s', () => {
  const W = 400;
  const H = 300;
  for (const rotate of [0, 90, 180, 270] as const) {
    const p = exportPlan({ w: W, h: H }, edit({ rotate }), {});
    const corners = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }].map((c) => applyAffine(p.matrix, c));
    const xs = corners.map((c) => Math.round(c.x)).sort((a, b) => a - b);
    const ys = corners.map((c) => Math.round(c.y)).sort((a, b) => a - b);
    assert.deepEqual([xs[0], xs[3], ys[0], ys[3]], [0, p.out.w, 0, p.out.h], `rotate ${rotate}`);
  }
  // 90 clockwise: the original's top-left goes to the top-right.
  const p = exportPlan({ w: W, h: H }, edit({ rotate: 90 }), {});
  const tl = applyAffine(p.matrix, { x: 0, y: 0 });
  assert.ok(near(tl.x, p.out.w, 1e-6) && near(tl.y, 0, 1e-6));
});

test('ME19: a plan agrees with toFrame for a drawn point', () => {
  const e = edit({ rotate: 270, crop: { x: 0.2, y: 0.1, w: 0.6, h: 0.5 } });
  const p = exportPlan({ w: 800, h: 600 }, e, {});
  const f = toFrame({ x: 0.5, y: 0.3 }, e);
  const o = applyAffine(p.matrix, { x: 400, y: 180 });
  assert.ok(near(o.x / p.out.w, f.x, 1e-3) && near(o.y / p.out.h, f.y, 1e-3));
});

// ME21: storage

test('ME21: round trip', () => {
  const e = edit({
    rotate: 270,
    crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.6 },
    filter: 'noir',
    strokes: [{ tool: 'marker', color: 'yellow', w: 0.04, pts: [0.1, 0.2, 0.3, 0.4] }],
    trim: { start_ms: 1000, end_ms: 4000 },
  });
  const s = serializeEdit(e);
  assert.equal(typeof s, 'string');
  assert.deepEqual(parseEdit(s), e);
  // The object form (IndexedDB keeps the record whole) reads the same.
  assert.deepEqual(parseEdit(e), e);
});

test('ME21: an empty edit is stored as none', () => {
  assert.ok(isEmptyEdit(emptyEdit()));
  assert.equal(serializeEdit(emptyEdit()), null);
  assert.equal(serializeEdit(null), null);
  assert.ok(!isEmptyEdit(edit({ filter: 'mono' })));
});

test('ME21: bad or newer input reads as none', () => {
  for (const bad of [null, undefined, '', '{', 'null', '42', '[]', '{"v":2,"rotate":0}', { v: 1, rotate: 45 }, { v: 1, filter: 'lomo' }]) {
    assert.equal(parseEdit(bad as unknown), null, JSON.stringify(bad));
  }
});

test('ME21: a bad line or crop is dropped, the rest kept', () => {
  const got = parseEdit({
    v: 1,
    rotate: 90,
    crop: { x: 'a' },
    filter: 'warm',
    strokes: [{ tool: 'pen', color: 'red', w: 0.01, pts: [0.1, 0.1] }, { tool: 'crayon', color: 'red', w: 0.01, pts: [0.1, 0.1] }, { tool: 'pen', color: 'red', w: 0.01, pts: [0.1] }],
    trim: null,
  });
  assert.ok(got);
  assert.equal(got.rotate, 90);
  assert.equal(got.crop, null);
  assert.equal(got.filter, 'warm');
  assert.equal(got.strokes.length, 1);
});
