/// <reference types="node" />
// @tree-wide
// fix edit-after-capture (the owner's call, Nov 20, decision 0240; amends ME23, supersedes 0149): once the camera's
// photo or video is accepted and kept, its editor opens by itself, so it is edited before it is seen on the map, not
// offered for a few seconds afterwards behind a second tap.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { editAfter, editingOf, keptWords } from '../../editOffer';

const src = (f: string) => readFileSync(join(__dirname, '../../..', f), 'utf8');

test('ME23 fix edit-after-capture: a new moment\'s photo or video opens its editor; a piece added to an open moment opens none', () => {
  assert.equal(editAfter({ kind: 'photo', id: 'm1', momentId: 'm1' }), 'm1');
  assert.equal(editAfter({ kind: 'video', id: 'm2', momentId: 'm2' }), 'm2');
  // A piece joins a moment already open (MS2, MS3): the moment is already on the map, and the editor edits the face.
  assert.equal(editAfter({ kind: 'photo', id: 'p1', momentId: 'm1' }), null);
});

test('ME23 fix edit-after-capture: the editor is drawn for the kept capture once the screen holds it, and goes with it', () => {
  const a = { id: 'a', kind: 'photo' };
  const b = { id: 'b', kind: 'video' };
  assert.equal(editingOf('b', [a, b]), b);
  assert.equal(editingOf(null, [a, b]), null);
  // Not yet in the screen's list, or deleted meanwhile: no editor, never one for another capture.
  assert.equal(editingOf('c', [a, b]), null);
});

// Each place a photo is taken (ME23's places, and Memories' line): the editor opens from the camera's answer, and no
// pill offers Edit afterwards.
const HOSTS = ['app/walk.tsx', 'components/MomentBar.tsx', 'components/journal/OpenLine.tsx', 'components/RecordingBar.tsx'];

test('ME23 fix edit-after-capture: every place that takes a photo opens the editor once it is kept, with no Edit pill after', () => {
  for (const f of HOSTS) {
    const s = src(f);
    assert.match(s, /= useEditAfterCapture\(/, `${f} holds the editor after a capture`);
    assert.match(s, /\.open\(k(ept)?\)/, `${f} opens it with what the camera kept`);
    assert.match(s, /<MediaEditor [^>]*capture=\{[^}]*\}[^>]*onClose=\{\(\) => [a-zA-Z]+\.close\(\)\}/, `${f} draws it and closes it`);
    assert.doesNotMatch(s, /EditOfferPill|useEditOffer|capture-offer|bar-edit-offer|barOffer\(/, `${f} offers no Edit pill`);
  }
  const offer = src('components/edit/EditOffer.tsx');
  assert.doesNotMatch(offer, /export function (EditOfferPill|useEditOffer|EditButton)/, 'the pill and its timer are gone');
});

// fix edit-after-capture audit 1 (the review's ux U1, U2, medium): just after the shutter ✕ beside Done read as "throw the
// photo away", and nothing said the photo was already kept. The editor opened after a capture says so where the
// disabled Revert sat until the first edit, and its ✕ is named for what it does (A7; NN/g H1; matrix rows 9, 19).
test('fix edit-after-capture audit 1: the editor after a capture says the photo is kept, and its Close says it stays', () => {
  assert.deepEqual(keptWords('photo'), { line: 'Photo kept', close: 'Close, the photo stays as it is' });
  assert.deepEqual(keptWords('video'), { line: 'Video kept', close: 'Close, the video stays as it is' });
  for (const k of ['photo', 'video'] as const) assert.doesNotMatch(Object.values(keptWords(k)).join(' '), /\d|!/);
  for (const f of HOSTS) assert.match(src(f), /<MediaEditor [^>]*justKept[ />]/, `${f} tells the editor it opened after a capture`);
  const editor = src('components/edit/MediaEditor.tsx');
  assert.match(editor, /accessibilityLabel=\{kept \? kept\.close : 'Close'\}/, 'the ✕ is named for what it does after a capture');
  assert.match(editor, /kept && empty \?/, 'the kept line stands until the first edit, where Revert has nothing to revert');
});
