/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EMPTY_PREFS, hideMoment, lessLike, parsePrefs, removeThread, renameThread, shown } from '../../resurface/prefs';

test('RM20: Not this one and Show less like this add to the choices, once', () => {
  const a = hideMoment(hideMoment(EMPTY_PREFS, 'm1'), 'm1');
  assert.deepEqual(a.hidden, ['m1']);
  const b = lessLike(EMPTY_PREFS, 'm2', ['harbor', 'bench']);
  assert.deepEqual([b.dim, b.less], [['m2'], ['harbor', 'bench']]);
  assert.equal(EMPTY_PREFS.hidden.length, 0, 'the empty value is never changed');
});

test('RM16: a rename is kept, and an empty one goes back to the user\'s word; a removed term stays removed', () => {
  const a = renameThread(EMPTY_PREFS, 'statue', '  The foxes ');
  assert.deepEqual(a.renames, { statue: 'The foxes' });
  assert.deepEqual(renameThread(a, 'statue', ' ').renames, {});
  assert.deepEqual(removeThread(removeThread(EMPTY_PREFS, 'x'), 'x').removed, ['x']);
});

test('RM21: stored choices read back; damage reads as empty fields, not a crash', () => {
  const p = shown(renameThread(lessLike(hideMoment(EMPTY_PREFS, 'a'), 'b', ['t']), 't', 'T!'), 'c');
  assert.deepEqual(parsePrefs(JSON.parse(JSON.stringify(p))), p);
  assert.deepEqual(parsePrefs({ hidden: 5, renames: { a: 3, b: 'ok' }, lastShown: 7 }), { ...EMPTY_PREFS, renames: { b: 'ok' } });
  assert.equal(parsePrefs('nope'), null);
  assert.equal(parsePrefs([1]), null);
});

test('RM8: the last moment shown is remembered', () => {
  assert.equal(shown(EMPTY_PREFS, 'z').lastShown, 'z');
});
