/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DARK_STYLE } from '../../../components/map/types';

// After dark's UI review (decision 0145): the lit line must be seen outdoors at dusk.

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** The base map's ground and its streets, sampled from the e2e's picture of Explore (dark-explore.png). */
const GROUND = '#eeeae4';
const STREET = '#ffffff';

test('after-dark ui 2: the lit line is drawn whole, at 3:1 or more against the ground and the streets (WCAG 1.4.11)', () => {
  assert.equal(DARK_STYLE.lit.opacity, 1, 'never faint: thin with contrast is restraint, faint is invisible');
  assert.ok(contrast(DARK_STYLE.lit.color, GROUND) >= 3, `against the ground: ${contrast(DARK_STYLE.lit.color, GROUND).toFixed(2)}`);
  assert.ok(contrast(DARK_STYLE.lit.color, STREET) >= 3, `against a street: ${contrast(DARK_STYLE.lit.color, STREET).toFixed(2)}`);
  assert.ok(DARK_STYLE.lit.width <= 3, 'still one thin line (DK3)');
});
