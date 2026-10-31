/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COLORS, FOG_STYLE, HOTSPOT, HOTSPOT_PIN } from '../../components/map/types';

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
  // White text on the Start here pin reads at AA (4.5:1).
  assert.ok(contrast('#ffffff', HOTSPOT_PIN) >= 4.5, `${contrast('#ffffff', HOTSPOT_PIN)}`);
});

test('colors: the fog is quiet unless asked for, so the trace reads over a scan’s streets', () => {
  assert.ok(FOG_STYLE.opacity <= 0.55);
  assert.ok(FOG_STYLE.widthMax <= 2.5);
  assert.ok(FOG_STYLE.widthMax < FOG_STYLE.traceWidth, 'the trace is wider than the fog');
});
