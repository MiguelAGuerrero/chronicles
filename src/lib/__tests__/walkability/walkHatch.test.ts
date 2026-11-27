/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { unzlibSync } from 'fflate';
import { ROUTE_CAR_WIDTH, WALK_SLATE, WALK_STYLE } from '../../../components/map/types';
import { hatchImage, hatchPng, swatchLines } from '../../walk/hatch';

// Walkability car ground: the hatch (CG2, CG10; walkability-car-ground audit 4), written from
// specs/walkability-car-ground/spec.md before the code.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, l: (mx + mn) / 2 };
}

test('CG2: the hatch is the owner\'s look: 45 degrees, 9 px apart, 1.25 px at 40%, one slate, clear between the lines, seamless', { todo: 'test first' }, () => {
  // The owner, 2026-11-27: "Soft A2 (Recommended)".
  assert.deepEqual(WALK_STYLE.car, { run: 1, rise: 1, spacingPx: 9, lineWidthPx: 1.25, lineOpacity: 0.4, edgeWidthPx: 1, edgeOpacity: 0.6, color: '#3b4a6b' });
  for (const ratio of [1, 2, 3]) {
    const im = hatchImage(WALK_STYLE.car, ratio);
    assert.equal(im.width, im.height, '45 degrees: a square tile');
    let covered = 0;
    let maxA = 0;
    for (let k = 0; k < im.width * im.height; k++) {
      const a = im.data[k * 4 + 3];
      if (a) assert.deepEqual([...im.data.slice(k * 4, k * 4 + 3)], [0x3b, 0x4a, 0x6b], 'every inked pixel is the slate');
      covered += a / 255;
      maxA = Math.max(maxA, a);
    }
    const share = covered / (im.width * im.height) / WALK_STYLE.car.lineOpacity;
    assert.ok(Math.abs(share - 1.25 / 9) < 0.03, `the lines cover about 1.25 / 9 of the ground at ${ratio}x (${share.toFixed(3)})`);
    assert.ok(maxA <= Math.round(0.4 * 255) + 1, 'no line stronger than 40%');
    // Lines run corner to corner of the tile, so it repeats with no seam: the corners are inked, the middle of a side is not.
    const alpha = (x: number, y: number) => im.data[(y * im.width + x) * 4 + 3];
    assert.ok(alpha(0, im.height - 1) > 0 && alpha(im.width - 1, 0) > 0, 'a line meets the tile\'s corners');
  }
});

test('CG2: no red or orange: the layer, its edge and the route\'s casing are the one cool slate', { todo: 'test first' }, () => {
  const c = hsl(WALK_SLATE);
  assert.ok(c.h >= 190 && c.h <= 260, `a cool hue (${c.h.toFixed(0)})`);
  assert.equal(WALK_STYLE.car.color, WALK_SLATE);
  assert.ok(ROUTE_CAR_WIDTH > 8, 'the casing shows either side of the route\'s 8 px');
});

/** The pixels of a PNG of 8-bit RGBA, no interlace, every filter decoded. */
function decodePng(buf: Uint8Array): { width: number; height: number; data: Uint8Array } {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let off = 8;
  let width = 0;
  let height = 0;
  const idat: Uint8Array[] = [];
  while (off < buf.length) {
    const len = view.getUint32(off);
    const type = String.fromCharCode(...buf.slice(off + 4, off + 8));
    const body = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') [width, height] = [new DataView(body.buffer).getUint32(0), new DataView(body.buffer).getUint32(4)];
    if (type === 'IDAT') idat.push(body);
    off += 12 + len;
  }
  const raw = unzlibSync(Uint8Array.from(idat.flatMap((b) => [...b])));
  const data = new Uint8Array(width * height * 4);
  const stride = width * 4;
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? data[y * stride + x - 4] : 0;
      const b = y ? data[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y ? data[(y - 1) * stride + x - 4] : 0;
      const p = a + b - c;
      const pr = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      data[y * stride + x] = (v + [0, a, b, (a + b) >> 1, pr][f]) & 255;
    }
  }
  return { width, height, data };
}

test('CG10: the native map\'s hatch images are the web\'s pixels', { todo: 'test first' }, () => {
  for (const [ratio, name] of [[1, 'walk-hatch.png'], [2, 'walk-hatch@2x.png'], [3, 'walk-hatch@3x.png']] as const) {
    const file = new Uint8Array(readFileSync(join(ROOT, 'assets', 'map', name)));
    assert.deepEqual(file, hatchPng(WALK_STYLE.car, ratio), `${name} is hatchPng at ${ratio}x: run \`node_modules/.bin/tsx scripts/walk-hatch.ts\` after a change of the look`);
    const im = hatchImage(WALK_STYLE.car, ratio);
    const png = decodePng(file);
    assert.deepEqual([png.width, png.height], [im.width, im.height]);
    assert.deepEqual(png.data, im.data, `${name} decodes to the web map's pixels`);
  }
});

test('walkability-car-ground audit 4: the swatch draws two lines, none corner to corner', { todo: 'test first' }, () => {
  const size = 20 - 2 * WALK_STYLE.car.edgeWidthPx;
  const lines = swatchLines(WALK_STYLE.car, size);
  assert.equal(lines.length, 2, 'two lines in the swatch');
  for (const l of lines) {
    // A line from (0, c) to (size, c - drop): corner to corner when c is size (bottom-left to top-right) or 0 or 2 * size.
    for (const corner of [0, size, 2 * size]) assert.ok(Math.abs(l.y1 - corner) > 2, `no line through a corner (${l.y1.toFixed(1)})`);
    assert.equal(l.x1, 0);
    assert.equal(l.x2, size);
  }
});
