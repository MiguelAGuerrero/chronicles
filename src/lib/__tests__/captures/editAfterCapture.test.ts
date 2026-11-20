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
// fix planner-edit (the owner's answer, Nov 20): the walk planner's capture stack too, a new moment of the walk (WP23).
const HOSTS = ['app/walk.tsx', 'components/MomentBar.tsx', 'components/journal/OpenLine.tsx', 'components/RecordingBar.tsx', 'components/planner/PlannerCapture.tsx'];

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
  assert.match(editor, /kept && empty && s\.tool !== 'draw' \?/, 'the kept line stands until the first edit, where Revert has nothing to revert');
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
  ['components/RecordingBar.tsx', /^!returning\.current && !wentBack\.current && !barStopping\(barStop\.get\(\), walk\.id, Date\.now\(\)\) && !unsaved\.hasEnded\(walk\.id\)$/],
  ['components/journal/OpenLine.tsx', /^!\(walk && \(barStopping\(barStop\.get\(\), walk\.id, Date\.now\(\)\) \|\| unsaved\.hasEnded\(walk\.id\)\)\)$/],
  ['app/walk.tsx', /^!stoppingNow\.current && !\(walk && unsaved\.hasEnded\(walk\.id\)\)$/],
  ['components/planner/PlannerCapture.tsx', /^!\(props\.leaving\?\.current \|\| noteUp\.current \|\| barStopping\(barStop\.get\(\), props\.walkId, Date\.now\(\)\) \|\| unsaved\.hasEnded\(props\.walkId\)\)$/],
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
  assert.match(composer, /\{composing && editing \? \(\s*<MediaEditor ref=\{editorRef\} key=\{editing\.piece_id\} overlay /);
  assert.match(composer, /onRequestClose=\{\(\) => \{ if \(editing\) \{ editorRef\.current\?\.requestClose\(\); return; \}/);
  assert.match(line, /\{editing && !composing && <MediaEditor /, 'its own Modal only with the composer closed');
});

// fix edit-after-capture audit 5 (round 2's R1, medium): a › tapped while the bar's photo was being saved went back to
// the walk, its `finally` lowered `returning` a few microtasks before the photo's check ran, and the editor opened as
// the bar went. The bar's own `back` and `photo`, lifted from its syntax tree, run here in the order a phone runs them.
const BAR = join(__dirname, '../../../components/RecordingBar.tsx');
const lift = (name: string): string => {
  const sf = ts.createSourceFile(BAR, readFileSync(BAR, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: string | null = null;
  const visit = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer) found = n.initializer.getText(sf);
    else ts.forEachChild(n, visit);
  };
  visit(sf);
  assert.ok(found, `the bar declares ${name}`);
  const js = ts.transpileModule(`(${found})`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return js.replace(/^"use strict";\s*/, '').trim().replace(/;$/, '');
};
const run = (name: string, fakes: Record<string, unknown>) =>
  new Function(...Object.keys(fakes), `"use strict"; return ${lift(name)};`)(...Object.values(fakes)) as (...a: unknown[]) => Promise<void>;

test('fix edit-after-capture audit 5: a way back tapped while the bar\'s photo is being saved opens no editor', async () => {
  const log: string[] = [];
  let keep: (k: unknown) => void = () => {};
  const fakes: Record<string, unknown> = {
    walk: { id: 'w1' },
    cap: { takePhoto: () => new Promise((r) => { keep = r; }) },
    keeping: { current: null },
    returning: { current: false },
    wentBack: { current: false },
    feedback: () => {},
    setSaid: () => {},
    barStopping: () => false,
    barStop: { get: () => null },
    unsaved: { hasEnded: () => false },
    editAfter: { open: () => log.push('editor') },
    goesBack: () => true,
    settleWithin: (p: Promise<unknown>) => Promise.resolve(p).then(() => {}, () => {}),
    RETURN_WAIT_MS: 5000,
    db: { setMeta: async () => {} },
    RECALL_OPEN_KEY: 'recall_open',
    showWalk: () => log.push('walk screen'),
  };
  const photo = run('photo', fakes)();
  const back = run('back', fakes)(null);
  keep({ kind: 'photo', id: 'm1', momentId: 'm1' });
  await Promise.all([photo, back]);
  assert.deepEqual(log, ['walk screen'], 'back to the walk, and no editor for the bar to take with it');
  // With no way back, the same photo opens its editor.
  log.length = 0;
  const alone = { ...fakes, keeping: { current: null }, returning: { current: false }, wentBack: { current: false } };
  const p2 = run('photo', alone)();
  keep({ kind: 'photo', id: 'm2', momentId: 'm2' });
  await p2;
  assert.deepEqual(log, ['editor']);
  // fix edit-after-capture audit 6 (round 2's R2, low): a save that outlasted Stop's wait lands after its walk ended.
  log.length = 0;
  const ended = { ...alone, keeping: { current: null }, unsaved: { hasEnded: (id: string) => id === 'w1' } };
  const p3 = run('photo', ended)();
  keep({ kind: 'video', id: 'm3', momentId: 'm3' });
  await p3;
  assert.deepEqual(log, [], 'its walk ended meanwhile: no editor');
});

// fix edit-after-capture audit 7 (round 2's R3, low): the composer's field kept its focus under the overlay editor, so a
// phone could raise the keyboard over it and type into the hidden entry; nothing gave the field focus back after.
test('fix edit-after-capture audit 7: the composer\'s field lets go while its editor is up, and takes focus back after', () => {
  const line = src('components/journal/OpenLine.tsx');
  assert.match(line, /const editingInComposer = composing && !!editing;/);
  assert.match(line, /useEffect\(\(\) => \{\s*if \(editingInComposer\) \{\s*input\.current\?\.blur\(\);\s*hadEditor\.current = true;\s*\} else if \(hadEditor\.current\) \{\s*hadEditor\.current = false;\s*if \(composing\) focusOn\(input\);\s*\}\s*\}, \[editingInComposer, composing\]\);/);
});

// fix edit-after-capture audit 8 (round 2's R4, low): with Draw's Undo and Redo, "Photo kept" made the top bar wider
// than a 320 px phone, and the first stroke swapped it for the narrower Revert, moving Undo under the thumb. The kept
// line stands only where Undo and Redo are not drawn.
test('fix edit-after-capture audit 8: the kept line gives way to Revert while Draw\'s Undo and Redo are up', () => {
  assert.match(src('components/edit/MediaEditor.tsx'), /\{kept && empty && s\.tool !== 'draw' \? \(/);
});

// fix edit-after-capture audit 9 (round 2's R6, low): every piece of a moment shares the moment's id, so an editor keyed
// by it kept one piece's session while it drew and saved another's.
test('fix edit-after-capture audit 9: the editor after a capture is keyed by its piece', () => {
  for (const f of HOSTS) {
    const s = src(f);
    const keys = [...s.matchAll(/<MediaEditor [^>]*?key=\{([^}]+)\}/g)].map((m) => m[1]);
    assert.ok(keys.length >= 1, f);
    for (const k of keys) assert.equal(k, 'editing.piece_id', `${f} keys its editor by the piece`);
  }
});

// fix planner-edit (the owner's answer to decision 0240's open question, Nov 20): the walk planner's camera (WP23, on the
// planner and the outing page) keeps a new moment of the walk, so its editor opens by itself as on the walk screen,
// behind the same stop guard. Respond's camera (a reply) and the note page's (a photo mentioned in a note) open none:
// they are edited later from the viewer.
test('fix planner-edit: the planner\'s camera opens the editor once kept, and Respond and the note page open none', () => {
  const s = src('components/planner/PlannerCapture.tsx');
  assert.match(s, /const kept = await cap\.takePhoto\(\);\s*if \(!kept\) return;/, 'the photo the camera kept, or nothing');
  const r = opensGuarded(s, GUARDS.find(([f]) => f === 'components/planner/PlannerCapture.tsx')![1]);
  assert.equal(r.calls, 1, 'one open, from the camera');
  assert.equal(r.guarded, 1, 'behind the walk\'s stop guard');
  for (const f of ['components/threads/ReplyDock.tsx', 'components/notePage/NewNotePage.tsx']) {
    assert.doesNotMatch(src(f), /useEditAfterCapture|editAfter\.open/, `${f} opens no editor after its photo (the owner's call)`);
  }
});

// fix planner-edit: the planner and the outing page close on Escape from a window listener of their own, so on the web
// an Escape meant for the editor over them closed the page too, and took the editor with it, edits and all, unasked
// (ME2). While a Modal is up over them (the editor, the note's page) Escape is that Modal's.
test('fix planner-edit: Escape closes the planner or the outing page only with no Modal over it', () => {
  for (const f of ['components/planner/PlannerDrawer.tsx', 'components/outing/OutingPage.tsx']) {
    const keys = [...src(f).matchAll(/const onKey = \(e: KeyboardEvent\) => ([^;]+);/g)].map((m) => m[1]);
    assert.equal(keys.length, 1, `${f} has one Escape handler`);
    assert.match(keys[0], /^e\.key === 'Escape' && modalsUp\.get\(\) === 0 && /, `${f} stands aside while a Modal is up`);
  }
});

// The planner's own `photo`, lifted from its syntax tree and run on fakes (as audit 5 runs the bar's).
const PLAN = join(__dirname, '../../../components/planner/PlannerCapture.tsx');
const planPhoto = (fakes: Record<string, unknown>) => {
  const sf = ts.createSourceFile(PLAN, readFileSync(PLAN, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: string | null = null;
  const visit = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'photo') found = n.getText(sf);
    else ts.forEachChild(n, visit);
  };
  visit(sf);
  assert.ok(found, 'the planner declares photo');
  const js = ts.transpileModule(`(${found})`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const body = js.replace(/^"use strict";\s*/, '').trim().replace(/;$/, '');
  return new Function(...Object.keys(fakes), `"use strict"; return ${body};`)(...Object.values(fakes)) as () => Promise<void>;
};
const planFakes = (over: Record<string, unknown> = {}) => {
  const log: string[] = [];
  const fakes: Record<string, unknown> = {
    cap: { takePhoto: async () => ({ kind: 'photo', id: 'm1', momentId: 'm1' }) },
    feedback: () => {},
    setMessage: (t: string) => log.push(`toast ${t}`),
    setSaid: (v: unknown) => log.push(`toast ${v === null ? 'cleared' : 'set'}`),
    editAfter: { open: () => log.push('editor') },
    props: { walkId: 'w1', leaving: { current: false } },
    noteUp: { current: false },
    barStopping: () => false,
    barStop: { get: () => null },
    unsaved: { hasEnded: () => false },
    ...over,
  };
  return { log, photo: planPhoto(fakes) };
};

// fix planner-edit audit 1 (the ux-reviewer's U1-U3, medium): "Saved here" stood over Start after the editor closed,
// said twice what the editor's "Photo kept" says, and a screen reader could hear both. As on the walk screen, the editor
// is the confirmation: no toast when it opens, and an older one goes.
test('fix planner-edit audit 1: a photo that opens its editor says no "Saved here", and clears an older toast', async () => {
  const a = planFakes();
  await a.photo();
  assert.deepEqual(a.log, ['toast cleared', 'editor']);
  const b = planFakes({ unsaved: { hasEnded: () => true } });
  await b.photo();
  assert.deepEqual(b.log, ['toast Saved here'], 'no editor (its walk ended): the toast says it was kept');
});

// fix planner-edit audit 2 (the auditor's F1, medium): a photo kept while the planner's Start was routing opened its
// editor, and Start's answer then closed the planner with the editor and its edits, unasked. Start is the planner asking
// for the walk screen: no editor once it is under way (as the bar's way back, 0240's audit 5).
test('fix planner-edit audit 2: no editor opens while the planner\'s Start is under way', async () => {
  const a = planFakes({ props: { walkId: 'w1', leaving: { current: true } } });
  await a.photo();
  assert.deepEqual(a.log, ['toast Saved here']);
  assert.match(src('components/planner/PlannerDrawer.tsx'), /<PlannerCapture walkId=\{p\.walkId\} [^>]*leaving=\{starting\} \/>/, 'the planner hands its Start in flight over');
  // The outing page's Start leaves at once (no await), so it has nothing to hand over.
  const outing = planFakes({ props: { walkId: 'w1' } });
  await outing.photo();
  assert.deepEqual(outing.log, ['toast cleared', 'editor']);
});

// fix planner-edit audit 3 (the auditor's F2, low): the pencil stays live while a photo is being kept, so the editor could
// open as a Modal over the note page's Modal, which iOS refuses (S2). With the note page up the photo is kept, no editor.
test('fix planner-edit audit 3: no editor opens over the note page', async () => {
  const a = planFakes({ noteUp: { current: true } });
  await a.photo();
  assert.deepEqual(a.log, ['toast Saved here']);
  const s = src('components/planner/PlannerCapture.tsx');
  assert.match(s, /onNote=\{\(\) => \{\s*noteUp\.current = true;\s*setPage\(\(n\) => n \+ 1\);\s*\}\}/, 'the pencil marks the page up');
  assert.match(s, /onClose=\{\(\) => \{\s*noteUp\.current = false;\s*setPage\(0\);\s*\}\}/, 'its close marks it gone');
});

// fix planner-edit audit 4 (round 2's R1, low): audit 2 holds only if the planner marks its Start under way before Start's
// re-plan is awaited; moved after the await, a photo kept meanwhile opened its editor again, and nothing failed. The
// planner's own `start`, lifted from its syntax tree, run on fakes.
test('fix planner-edit audit 4: the planner\'s Start is marked under way for as long as its re-plan is awaited', async () => {
  const file = join(__dirname, '../../../components/planner/PlannerDrawer.tsx');
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: string | null = null;
  const visit = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'start') found = n.getText(sf);
    else ts.forEachChild(n, visit);
  };
  visit(sf);
  assert.ok(found, 'the planner declares start');
  const js = ts.transpileModule(`(${found})`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const body = js.replace(/^"use strict";\s*/, '').trim().replace(/;$/, '');
  for (const outcome of ['route', 'none', 'throws'] as const) {
    let answer: (v: unknown) => void = () => {};
    let fail: (e: unknown) => void = () => {};
    const starting = { current: false };
    const fakes: Record<string, unknown> = {
      starting,
      setBusy: () => {},
      setFailed: () => {},
      p: { start: () => new Promise((res, rej) => { answer = res; fail = rej; }) },
      props: { fixNow: () => [0, 0], onStart: () => {} },
    };
    const start = new Function(...Object.keys(fakes), `"use strict"; return ${body};`)(...Object.values(fakes)) as () => Promise<void>;
    const run = start();
    assert.equal(starting.current, true, `${outcome}: under way while the re-plan is awaited`);
    if (outcome === 'throws') fail(new Error('no'));
    else answer(outcome === 'route' ? { at: [0, 0] } : null);
    await run;
    assert.equal(starting.current, false, `${outcome}: let go once it answers, so later photos open their editor`);
  }
});
