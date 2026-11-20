/// <reference types="node" />
// @tree-wide
// fix edit-after-capture (the owner's call, Nov 20, decision 0240; amends ME23, supersedes 0149): once the camera's
// photo or video is accepted and kept, its editor opens by itself, so it is edited before it is seen on the map, not
// offered for a few seconds afterwards behind a second tap.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { editAfter, editingOf, keptWords } from '../../editOffer';
import { faced, type Faced } from '../../moment';
import type { Capture } from '../../types';

const src = (f: string) => readFileSync(join(__dirname, '../../..', f), 'utf8');

const piece = (id: string, moment_id: string, kind: 'photo' | 'video' | 'text', t: number): Capture =>
  ({ id, moment_id, t, kind, file_path: kind === 'text' ? null : `${id}.jpg`, body: kind === 'text' ? 'words' : null, edit: null }) as Capture;
const moment = (id: string, pieces: Capture[]): Faced => faced({ id, walk_id: null, t: pieces[0].t, lat: null, lon: null, segment_id: null, pieces });

test('ME23 fix edit-after-capture: a new moment\'s photo or video opens its editor once the screen holds it, and goes with it', () => {
  const a = moment('a', [piece('a', 'a', 'photo', 1)]);
  const b = moment('b', [piece('b', 'b', 'video', 2)]);
  const t = editAfter({ kind: 'video', id: 'b', momentId: 'b' });
  assert.deepEqual(t, { momentId: 'b', pieceId: 'b' });
  assert.equal(editingOf(t, [a, b])?.piece_id, 'b');
  assert.equal(editingOf(null, [a, b]), null);
  // Not yet in the screen's list, or deleted meanwhile: no editor, never one for another capture.
  assert.equal(editingOf(editAfter({ kind: 'photo', id: 'c', momentId: 'c' }), [a, b]), null);
});

// fix edit-after-capture audit 2 (the auditor's F1, F9, medium): on Memories a second photo joins the open entry as a
// piece (JN15), and with Group captures every edge photo does: they opened no editor, the owner's two taps still there.
test('fix edit-after-capture audit 2: a photo added to an open moment opens its editor too, on that piece and never the face', () => {
  const m = moment('m', [piece('m', 'm', 'text', 1), piece('p', 'm', 'photo', 2)]);
  const shown = editingOf(editAfter({ kind: 'photo', id: 'p', momentId: 'm' }), [m]);
  assert.equal(shown?.id, 'm', 'the moment, so a Done patches it');
  assert.equal(shown?.piece_id, 'p', 'its new piece, not the note it joined');
  assert.equal(shown?.kind, 'photo');
  // The piece not in the screen's moment yet: no editor, rather than the face's.
  assert.equal(editingOf(editAfter({ kind: 'photo', id: 'q', momentId: 'm' }), [m]), null);
  // Its open moment went while the camera was up: kept as a moment of its own (UN11), found by its own id.
  const own = moment('q', [piece('q', 'q', 'photo', 3)]);
  assert.equal(editingOf(editAfter({ kind: 'photo', id: 'q', momentId: 'gone' }), [own])?.piece_id, 'q');
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

// fix edit-after-capture audit 3 (the auditor's F3, F5, F8, medium): a photo kept while its walk was stopping opened an
// editor that the replay then covered or took away, and deleting the bar's one guard failed no test. Each host that
// can be on a stopping walk opens the editor only behind its guard, read from the syntax tree (no text match passes a
// call left outside it, or in dead code).
const opensGuarded = (code: string, guard: RegExp): { calls: number; guarded: number } => {
  const sf = ts.createSourceFile('host.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let calls = 0;
  let guarded = 0;
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'editAfter.open') {
      calls++;
      let p: ts.Node | undefined = n.parent;
      let ok = false;
      for (; p && !ts.isSourceFile(p); p = p.parent) {
        if (ts.isIfStatement(p) && n.pos >= p.thenStatement.pos && n.end <= p.thenStatement.end && guard.test(p.expression.getText(sf))) ok = true;
      }
      if (ok) guarded++;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { calls, guarded };
};
const GUARDS: [string, RegExp][] = [
  ['components/RecordingBar.tsx', /^!returning\.current && !barStopping\(barStop\.get\(\), walk\.id, Date\.now\(\)\)$/],
  ['components/journal/OpenLine.tsx', /^!\(walk && barStopping\(barStop\.get\(\), walk\.id, Date\.now\(\)\)\)$/],
  ['app/walk.tsx', /^!stoppingNow\.current$/],
];

test('fix edit-after-capture audit 3: the scan fails a call outside its guard, a guard dropped, and a file with no call', () => {
  const g = /^!stoppingNow\.current$/;
  assert.deepEqual(opensGuarded('async function p() { const k = await t(); if (!stoppingNow.current) editAfter.open(k); }', g), { calls: 1, guarded: 1 });
  assert.deepEqual(opensGuarded('async function p() { const k = await t(); editAfter.open(k); }', g), { calls: 1, guarded: 0 });
  assert.deepEqual(opensGuarded('async function p() { if (!stoppingNow.current) {} editAfter.open(k); }', g), { calls: 1, guarded: 0 });
  assert.deepEqual(opensGuarded('async function p() { if (!stoppingNow.current) f(); else editAfter.open(k); }', g), { calls: 1, guarded: 0 });
  assert.deepEqual(opensGuarded('async function p() { if (ready) editAfter.open(k); }', g), { calls: 1, guarded: 0 });
  assert.deepEqual(opensGuarded('const x = 1;', g), { calls: 0, guarded: 0 });
});

test('fix edit-after-capture audit 3: no editor opens while the walk is stopping (the bar, Memories, the walk screen) or the bar goes back', () => {
  for (const [f, guard] of GUARDS) {
    const r = opensGuarded(src(f), guard);
    assert.ok(r.calls >= 1, `${f} opens the editor`);
    assert.equal(r.guarded, r.calls, `${f}: every open behind ${guard}`);
  }
  // The walk screen's flag is set and cleared by its Stop alone.
  const walk = src('app/walk.tsx');
  assert.match(walk, /setStopping\(true\);\s*stoppingNow\.current = true;/);
  assert.match(walk, /setStopping\(false\);\s*stoppingNow\.current = false;\s*if \(failed\) throw failure;/);
});

// fix edit-after-capture audit 4 (the auditor's F2, medium): a photo from the composer opened the editor as a Modal over
// the composer's Modal, which iOS refuses (S2). Inside the composer it is an overlay in the composer's own Modal.
test('fix edit-after-capture audit 4: in the composer the editor is drawn inside its Modal, and Back goes to the editor first', () => {
  const line = src('components/journal/OpenLine.tsx');
  const composer = line.slice(line.indexOf('<Modal visible={composing}'), line.indexOf('</Modal>', line.indexOf('<Modal visible={composing}')));
  assert.match(composer, /\{composing && editing \? \(\s*<MediaEditor ref=\{editorRef\} key=\{editing\.id\} overlay /);
  assert.match(composer, /onRequestClose=\{\(\) => \{ if \(editing\) \{ editorRef\.current\?\.requestClose\(\); return; \}/);
  assert.match(line, /\{editing && !composing && <MediaEditor /, 'its own Modal only with the composer closed');
});
