/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { layerNotes } from '../../layers/notes';

// Storefronts (specs/storefronts, SF7, SF13): the panel's quiet lines, written before the code.
type S = Parameters<typeof layerNotes>[0] & { storefronts?: 'ok' | 'empty' | 'uncovered' | 'failed' | 'reading' | 'far' };
const base: S = { walkability: 'ok' as never, busyReading: false, busyFailed: false };
const note = (storefronts: S['storefronts']) => layerNotes({ ...base, storefronts } as never).storefronts ?? null;

test('SF7: no region, a failed read and "zoom in" each have their own words, and a covered empty area has none', () => {
  const lines = [note('uncovered'), note('failed'), note('far')];
  assert.ok(lines.every((l) => typeof l === 'string' && l.length > 0), JSON.stringify(lines));
  assert.equal(new Set(lines).size, 3, 'three different lines');
  assert.equal(note('empty'), null, 'an empty covered area is not a failure and says nothing');
  assert.match(note('ok') ?? '', /Tap a mark/, 'drawn: the one quiet line says what a mark is (the panel holds no legend)');
});

test('SF7: a failure is told quietly: no alert, no error title, no "error" or "failed" word', () => {
  for (const s of ['uncovered', 'failed', 'far', 'reading'] as const) {
    assert.ok(note(s), `${s} has a line`);
    assert.ok(!/error|alert|oops|sorry|failed|\!/i.test(note(s) ?? ''), `${s}: ${note(s)}`);
  }
});

test('SF13: no status line of the layer holds a number, a count or a percentage', () => {
  assert.ok(note('uncovered'), 'the layer has status lines');
  for (const s of ['uncovered', 'failed', 'far', 'reading', 'empty', 'ok'] as const) assert.ok(!/\d|%/.test(note(s) ?? ''), `${s}: ${note(s)}`);
});
