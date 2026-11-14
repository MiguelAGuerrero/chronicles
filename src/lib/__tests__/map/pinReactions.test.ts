import assert from 'node:assert/strict';
import { test } from 'node:test';

// Reactions on a pin (RX17-RX19, decision 0172's addendum on pins). Reached by name: test first.
const pins = () => import('../../pins' as string) as Promise<Record<string, any>>;
const icons = () => import('../../reactions/core' as string) as Promise<Record<string, any>>;
const cap = (id: string, kind: string, extra: Record<string, unknown> = {}) => ({ id, kind, t: 1, pieces: [{ id, kind }], ...extra });
const pin = (...captures: unknown[]) => ({ lngLat: [0, 0], kind: 'text', captures });

test('RX17: a pin of exactly one moment wears its reactions in the families\' order; one with none wears none', { todo: 'test first' }, async () => {
  const { pinReactions } = await pins();
  const sets = new Map([['a', { thought: 'idea', feeling: 'happy' }], ['b', {}]]);
  assert.deepEqual(pinReactions(pin(cap('a', 'photo')), sets).map((r: { id: string }) => r.id), ['happy', 'idea']);
  assert.deepEqual(pinReactions(pin(cap('b', 'text')), sets), []);
  assert.deepEqual(pinReactions(pin(cap('z', 'voice')), sets), []);
});

test('RX19: a pin of several moments wears no reactions', { todo: 'test first' }, async () => {
  const { pinReactions } = await pins();
  const sets = new Map([['a', { thought: 'idea' }], ['b', { feeling: 'sad' }]]);
  assert.deepEqual(pinReactions(pin(cap('a', 'photo'), cap('b', 'text')), sets), []);
});

test('RX18: the head is the kind, whatever a note once carried: the pin\'s icon is chosen by kind alone', { todo: 'test first' }, async () => {
  // icons.tsx loads a font module, so it is read as source here (a Node test cannot load React Native).
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const src = readFileSync(join(__dirname, '..', '..', '..', 'components', 'icons.tsx'), 'utf8');
  assert.doesNotMatch(src, /note_type|noteType|markOf|reactions/, 'nothing but the kind chooses the head');
  assert.match(src, /export function captureIcon\(c: \{ kind: CaptureKind \}\)/);
  assert.ok((await icons()).REACTIONS.length === 8);
});
