/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BORDER, COLORS, FOG_STYLE, HOTSPOT } from '../../../components/map/types';
import { deltaE, hueGap, lch } from '../map/colourSight';

// The owner's calls (Nov 1): the trace is green, and hotspots move to magenta.

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const hue = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return -1;
  const h = max === r ? (g - b) / (max - min) : max === g ? 2 + (b - r) / (max - min) : 4 + (r - g) / (max - min);
  return ((h * 60) + 360) % 360;
};
/** Positron's land colour, the walk map's background. */
const BASE = '#f2f3f0';

test('colors: the trace is green, and stands out on the base map (3:1)', () => {
  const h = hue(COLORS.trace);
  assert.ok(h > 100 && h < 160, `trace hue ${h}`);
  assert.ok(contrast(COLORS.trace, BASE) >= 3, `${contrast(COLORS.trace, BASE)}`);
});

test('colors: hotspots are magenta, and no other layer shares their hue or the trace’s', () => {
  const h = hue(HOTSPOT);
  assert.ok(h > 280 && h < 330, `hotspot hue ${h}`);
  const others = [COLORS.walked, COLORS.route, COLORS.photo, COLORS.video, COLORS.voice, COLORS.text];
  for (const c of others) {
    assert.ok(Math.abs(hue(c) - hue(COLORS.trace)) > 25, `${c} too close to the trace`);
    assert.ok(Math.abs(hue(c) - h) > 20, `${c} too close to hotspots`);
  }
});

// The magenta's rule, narrowed (the owner, Nov 17, "Keep it, narrow the rule"; decision 0187, amending 0028 and 0034):
// the magenta stays the one hue of any line, fill or label, and every map colour stays 15 or more from it (CIEDE2000,
// as it is seen). The madder video pin shares the magenta's hue angle but is a dark disc with a white glyph; every hue
// that clears the old 20° breaks the colour-blind floor (map-palette, MP6). The trace keeps its 25° of hue.
test('MP8: every map colour is 15 from the hotspot magenta (CIEDE2000), hues round the circle; the trace keeps its 25°', { todo: 'test first' }, () => {
  const h = lch(HOTSPOT).h;
  assert.ok(h > 330 && h < 360, `hotspot hue ${h}`);
  const pal = COLORS as unknown as Record<string, string>;
  const others = [pal.walked, pal.route, pal.photo, pal.video, pal.voice, pal.text, pal.several];
  for (const c of others) {
    assert.equal(typeof c, 'string');
    assert.ok(hueGap(hue(c), hue(COLORS.trace)) > 25, `${c} too close to the trace`);
    assert.ok(deltaE(c, HOTSPOT) >= 15, `${c} is ${deltaE(c, HOTSPOT).toFixed(1)} from the magenta`);
  }
});

test('colors: the fog is quiet unless asked for, so the trace reads over the fog’s streets', () => {
  assert.ok(FOG_STYLE.opacity <= 0.55);
  assert.ok(FOG_STYLE.widthMax <= 2.5);
  assert.ok(FOG_STYLE.widthMax < FOG_STYLE.traceWidth, 'the trace is wider than the fog');
});

/** A colour laid over another at an opacity, as the map draws a fill or a see-through line. */
const over = (top: string, under: string, a: number) => {
  const ch = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map((i) => Math.round(ch(top, i) * a + ch(under, i) * (1 - a)).toString(16).padStart(2, '0')).join('');
};
/** Positron's place labels, the darkest text a border's fill sits under. */
const LABEL = '#666666';

test('TB8, TB10: the town reads as a highlighted region, its labels stay readable, and its edges show on a phone', () => {
  const tinted = over(BORDER.color, BASE, BORDER.fillOpacity);
  // A highlight you can see (TB10: 7% read as nothing on the owner's phone), never a block of colour.
  assert.ok(contrast(tinted, BASE) >= 1.15 && contrast(tinted, BASE) < 1.35, `fill vs land ${contrast(tinted, BASE).toFixed(2)}`);
  // The labels drawn over it stay readable (4:1 at least).
  assert.ok(contrast(LABEL, tinted) >= 4, `label ${contrast(LABEL, tinted).toFixed(2)}`);
  // The firm edge and the lines are seen on the land and on a white street, the firm one more.
  const firm = contrast(over(BORDER.color, BASE, BORDER.firmOpacity), BASE);
  const lined = contrast(over(BORDER.lined, BASE, BORDER.linedOpacity), BASE);
  assert.ok(firm >= 3.5, `firm ${firm.toFixed(2)}`);
  assert.ok(lined >= 2.5 && lined < firm, `lined ${lined.toFixed(2)}`);
  assert.ok(contrast(over(BORDER.lined, '#ffffff', BORDER.linedOpacity), '#ffffff') >= 2.5, 'lined on a street');
  assert.ok(BORDER.firmWidth >= 3 && BORDER.linedWidth >= 1.5);
  // Never the hotspots' magenta or the trace's green.
  assert.ok(Math.abs(hue(BORDER.color) - hue(HOTSPOT)) > 20 && Math.abs(hue(BORDER.color) - hue(COLORS.trace)) > 25);
});
