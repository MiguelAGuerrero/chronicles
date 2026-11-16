/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { layerNotes, type ShopMarksStatus } from '../../layers/notes';

// Shop marks (specs/shop-marks, SM7, SM13): the panel's one line for the Storefronts layer, which says the shading's own state first and else the marks'.
const base = { walkability: 'ok' as never, storefrontsReading: false, storefrontsFailed: false };
const note = (shopMarks?: ShopMarksStatus, over: Partial<typeof base> = {}) => layerNotes({ ...base, ...over, shopMarks }).storefronts ?? null;

test('SM7: no region, a failed read and "zoom in" each have their own words, and a covered empty area has none', () => {
  const lines = [note('uncovered'), note('failed'), note('far')];
  assert.ok(lines.every((l) => typeof l === 'string' && l.length > 0), JSON.stringify(lines));
  assert.equal(new Set(lines).size, 3, 'three different lines');
  assert.equal(note('empty'), null, 'an empty covered area is not a failure and says nothing');
});

test('SM7: a failure is told quietly: no alert, no error title, no "error" or "failed" word', () => {
  for (const s of ['uncovered', 'failed', 'far', 'reading'] as const) {
    assert.ok(note(s), `${s} has a line`);
    assert.ok(!/error|alert|oops|sorry|failed|!/i.test(note(s) ?? ''), `${s}: ${note(s)}`);
  }
});

test('SM13: no status line of the marks holds a number, a count or a percentage', () => {
  assert.ok(note('uncovered'), 'the layer has status lines');
  for (const s of ['uncovered', 'failed', 'far', 'reading', 'empty', 'ok'] as const) assert.ok(!/\d|%/.test(note(s) ?? ''), `${s}: ${note(s)}`);
});

test('shop-marks ui 4: when drawn the line says what the marks are (shops, from OpenStreetMap) and how to use one', () => {
  assert.match(note('ok') ?? '', /Shops from OpenStreetMap/);
  assert.match(note('ok') ?? '', /Tap a mark/);
});

test('SM7: the street shading\'s own reading or failure is said first; the marks speak only when it has nothing to say', () => {
  assert.equal(note('ok', { storefrontsReading: true }), 'Reading…');
  assert.equal(note('ok', { storefrontsFailed: true }), 'Not available now');
  assert.equal(note(undefined), null, 'with no marks (no pack address) the layer says what it always did');
});
