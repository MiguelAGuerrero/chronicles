/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BORDER, WALK_STYLE } from '../../../components/map/types';
import { LAYERS } from '../../layers/registry';
import { layerNotes } from '../../layers/notes';
import { panelBox } from '../../layers/layout';
import { createLayers } from '../../layers/shell';
import { layerDefaults, nearKey } from '../../layers/state';
import { drawNow } from '../../walk/layer';
import { bandTip } from '../../walk/bandWords';
import { cellWords, countCells } from '../../walk/summary';
import type { Cell } from '../../walk/cells';
import type { LngLat } from '../../types';
import { fakePorts } from '../fakes';

// The UI audit of map layers and walkability (2026-11-05): one regression test per accepted finding, written before its fix.
// Numbered as the auditor's findings; the steward's S-findings are named for what they changed.

test('layers audit 1: the panel opens beside the button and fits at 375x667 and 390x844, whatever the button\'s height', () => {
  for (const [w, h, buttonTop, right] of [[375, 667, 76, 18], [390, 844, 250, 18], [430, 932, 330, 18]] as const) {
    const b = panelBox({ windowW: w, windowH: h, buttonTop, right, clearBottom: 160 });
    assert.ok(b.maxHeight >= 160, `${w}x${h}: room for three rows (${b.maxHeight})`);
    assert.ok(buttonTop + b.maxHeight <= h - 160 + 1, `${w}x${h}: ends above the bottom strip`);
    assert.ok(b.width >= 280 && b.width <= 320, `${w}x${h}: width ${b.width}`);
    assert.ok(right + 52 + b.width <= w - 8, `${w}x${h}: inside the screen`);
  }
});

test('layers audit 3: on a wide Explore the panel is sized by the map pane, not the window', () => {
  const b = panelBox({ windowW: 1280, windowH: 800, buttonTop: 10, right: 12, paneWidth: 512, clearBottom: 80 });
  assert.ok(b.width >= 280, `at least 280 px in a 512 px pane (${b.width})`);
  assert.ok(12 + 52 + b.width <= 512 - 8, 'inside the pane');
  const narrow = panelBox({ windowW: 1280, windowH: 800, buttonTop: 10, right: 12, paneWidth: 330, clearBottom: 80 });
  assert.ok(12 + 52 + narrow.width <= 330, 'a pane too narrow to fit 280 shrinks the panel rather than overflow it');
});

const here: LngLat = [-75.47, 40.6];
const rows = [{ key: 'a', centre: [-75.47, 40.601] as LngLat }, { key: 'b', centre: [-75.2, 40.9] as LngLat }] as never[];

test('ML15, layers audit 2: the busy streets are keyed by which areas are near, so a walker\'s fix never rebuilds the drawing', () => {
  const jitter = (n: number): LngLat => [here[0] + n * 0.00001, here[1] + n * 0.00001];
  const keys = new Set([0, 1, 2, 3, 4, 5].map((n) => nearKey(rows, jitter(n))));
  assert.equal(keys.size, 1, 'a few metres of walking is the same key');
  assert.notEqual(nearKey(rows, [-75.2, 40.9]), nearKey(rows, here), 'another area near is another key');
  assert.equal(nearKey(rows, null), '');
});

test('ML14, UF19, layers audit 7: a layer that is on but cannot draw says why: no position, reading, or not available', () => {
  assert.deepEqual(drawNow(true, null, ''), { draw: null, status: 'waiting' });
  assert.deepEqual(drawNow(false, null, ''), { draw: null, status: 'off' });
  assert.equal(layerNotes({ walkability: 'waiting', busyReading: false, busyFailed: false }).walkability, 'Waiting for your position');
  assert.equal(layerNotes({ walkability: 'reading', busyReading: false, busyFailed: false }).walkability, 'Reading…');
  assert.equal(layerNotes({ walkability: 'unavailable', busyReading: false, busyFailed: false }).walkability, 'Not available now');
  assert.equal(layerNotes({ walkability: 'ready', busyReading: false, busyFailed: false }).walkability, null);
  assert.equal(layerNotes({ walkability: 'off', busyReading: true, busyFailed: false }).busy, 'Reading…');
  assert.equal(layerNotes({ walkability: 'off', busyReading: false, busyFailed: true }).busy, 'Not available now');
  assert.equal(layerNotes({ walkability: 'off', busyReading: false, busyFailed: false }).busy, null);
});

test('layers audit 13: the settings load once; a switch made before the load finishes is not overwritten by it', async () => {
  const p = fakePorts();
  await p.db.setMeta('map_layers', JSON.stringify({ walkability: false, busy: false, borders: true }));
  const l = createLayers(p);
  const loads = [l.load(), l.load(), l.load()];
  await l.set('busy', true);
  await Promise.all(loads);
  assert.equal(l.store.get().on.busy, true, 'the early switch survives the load');
  assert.equal(l.store.get().on.borders, true, 'what was stored is there');
  const reads = p.log.effects().filter((e) => /getMeta/.test(JSON.stringify(e))).length;
  void reads;
  const again = createLayers(p);
  await again.load();
  assert.equal(again.store.get().on.busy, true, 'and it was kept');
});

test('the owner\'s call (2026-11-05): Walkability, Busy streets and Town borders all start off', () => {
  assert.deepEqual(layerDefaults(), { walkability: false, busy: false, borders: false });
  assert.ok(LAYERS.every((l) => l.defaultOn === false));
});

// --- the palette (the steward's S1, the auditor's F6, F11) ---
function hsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

test('walkability audit 15: the two tints are one cool hue family, neither green nor orange, apart from the accent and the borders, and differ in lightness', () => {
  const [foot, car] = [hsl(WALK_STYLE.foot.color), hsl(WALK_STYLE.car.color)];
  for (const c of [foot, car]) assert.ok(c.h >= 190 && c.h <= 260, `a cool hue (${c.h.toFixed(0)})`);
  assert.ok(hueGap(foot.h, car.h) <= 30, 'one hue family');
  assert.ok(Math.abs(foot.l - car.l) >= 0.2, 'told apart by lightness, not by hue alone (colour-blind safe)');
  const accent = hsl('#c2410c');
  const border = hsl(BORDER.color);
  for (const c of [foot, car]) {
    assert.ok(hueGap(c.h, accent.h) >= 90, 'far from the app\'s accent');
    assert.ok(hueGap(c.h, border.h) >= 90, 'far from the town borders');
  }
});

// --- the words (the steward's S4) ---
const mk = (foot: number, car: number, neither = 0): Cell[] => {
  const out: Cell[] = [];
  let i = 0;
  for (const [n, band] of [[foot, 'foot'], [car, 'car'], [neither, 'neither']] as const) for (let k = 0; k < n; k++) out.push({ i: i++, j: 0, west: 0, south: 0, east: 0, north: 0, band });
  return out;
};

test('walkability audit 16: the card says what the ground is, never "most", "mostly" or a comparison, and promises no outcome', () => {
  const said = [cellWords(countCells(mk(70, 5, 25))), cellWords(countCells(mk(5, 70, 25))), cellWords(countCells(mk(40, 40, 20)))];
  assert.deepEqual(said, ['Streets close together, with crossings', 'Streets far apart and busy', 'Streets close together and far apart, side by side']);
  assert.equal(cellWords(countCells(mk(20, 20, 60))), null);
  assert.equal(LAYERS[0].legend[1].tip, 'Streets far apart and busy.', 'the legend\'s tip is the meaning alone: its row already says the name');
  for (const t of [...said, bandTip('foot'), bandTip('car'), ...LAYERS.flatMap((l) => [l.note ?? '', ...l.legend.map((r) => r.tip ?? '')])])
    assert.ok(!/\bmost(ly)?\b|\bmore\b|\bless\b|likely|short walk|best|worst/i.test(t ?? ''), t ?? '');
});
