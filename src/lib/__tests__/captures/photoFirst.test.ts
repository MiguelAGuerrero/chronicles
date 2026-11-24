/// <reference types="node" />
// @tree-wide
// tend captures T62 (the owner's report, Nov 24: "there is a little bit of a visual jump when you're taking a photo and
// you go straight to the editor. It'll jump straight back to the map for a little bit and then open up the editor when
// there should be a clean transition. This happens on every moment capture. For camera or video."): the camera returned,
// the screen showed the map while the shot was kept and its list caught up, then the editor faded in from transparent.
// "Photo first, editor over it": from the camera's return the shot is held full screen, drawn as the editor draws it on
// the editor's backdrop, and once it is kept the editor's controls come over the same shot, in the same element.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { afterCapture, editAfter, shotClosed, shotKept, shotTaken, type HeldShot } from '../../editOffer';
import { faced, type Faced } from '../../moment';
import type { Capture } from '../../types';

const src = (f: string) => readFileSync(join(__dirname, '../../..', f), 'utf8');

const piece = (id: string, moment_id: string, kind: 'photo' | 'video' | 'text', t: number): Capture =>
  ({ id, moment_id, t, kind, file_path: kind === 'text' ? null : `${id}.jpg`, body: kind === 'text' ? 'words' : null, edit: null }) as Capture;
const moment = (id: string, pieces: Capture[]): Faced => faced({ id, walk_id: null, t: pieces[0].t, lat: null, lon: null, segment_id: null, pieces });
const view = (shot: HeldShot | null, target: ReturnType<typeof editAfter> | null, captures: Faced[], waits = false) => afterCapture({ shot, target, captures, waits });

for (const kind of ['photo', 'video'] as const) {
  test(`tend captures T62: a ${kind} is held full screen from the camera's return, and the editor comes over it in the same element once kept`, () => {
    const uri = kind === 'photo' ? 'blob:shot-1' : 'file:///tmp/clip.mov';
    // The camera answers: the shot is held at once, before it is kept, so the map never shows.
    let shot = shotTaken({ kind, uri }, 1, true);
    const held = view(shot, null, []);
    assert.equal(held.show, 'held');
    assert.ok(held.show === 'held');
    assert.deepEqual(held.shot, { kind, uri }, 'the picked asset itself, drawn as the editor draws it');
    // Kept: the screen opens its editor, in the same turn as the keep settles.
    const kept = { kind, id: 'm1', momentId: 'm1' };
    shot = shotKept(shot, 1, kept);
    const target = editAfter(kept);
    // Its list does not hold it yet: still the held shot, never the map in between.
    const waiting = view(shot, target, []);
    assert.equal(waiting.show, 'held');
    assert.ok(waiting.show === 'held');
    assert.equal(waiting.key, held.key, 'the same element');
    // The list holds it: the editor, over the same shot, in the same element (no remount, so no fade from transparent).
    const m = moment('m1', [piece('m1', 'm1', kind, 1)]);
    const up = view(shot, target, [m]);
    assert.equal(up.show, 'editor');
    assert.ok(up.show === 'editor');
    assert.equal(up.key, held.key, 'the element the shot was held in carries the editor');
    assert.equal(up.capture.piece_id, 'm1');
    assert.deepEqual(up.shot, { kind, uri }, 'the shot stays under the stored picture until it is drawn');
    // Done or Close: nothing.
    assert.deepEqual(view(shotClosed(shot), null, [m]), { show: 'none' });
  });
}

test('tend captures T62: no cover where the editor would not open, and none before the shot is taken', () => {
  // A cancelled camera or a refused permission never reaches the shot: nothing held.
  assert.deepEqual(view(null, null, []), { show: 'none' });
  // Mid-memo (T60: the editor waits for Save or Discard), the bar out of sight (leftMemo), a Stop under way, the walk
  // ended: the screen says it would not open, and the shot is not held.
  assert.equal(shotTaken({ kind: 'photo', uri: 'blob:a' }, 1, false), null);
  // A shot held and then a memo recording over it (the screen's own mask): nothing drawn.
  const shot = shotTaken({ kind: 'photo', uri: 'blob:a' }, 1, true);
  assert.deepEqual(view(shot, null, [], true), { show: 'none' });
  // Kept with the memo still recording, the editor waits for Save or Discard (T60) and then opens as before: keyed by its
  // piece, with no shot under it (it was never held), so it fades in from the map as it did.
  const m = moment('m1', [piece('m1', 'm1', 'photo', 1)]);
  const target = editAfter({ kind: 'photo', id: 'm1', momentId: 'm1' });
  assert.deepEqual(view(null, target, [m], true), { show: 'none' });
  const after = view(null, target, [m]);
  assert.equal(after.show, 'editor');
  assert.ok(after.show === 'editor');
  assert.equal(after.key, 'piece-m1');
  assert.equal(after.shot, null);
});

test('tend captures T62: a keep that fails, a screen that does not open, or a close takes the cover away', () => {
  const kept = { kind: 'photo' as const, id: 'm1', momentId: 'm1' };
  const shot = shotTaken({ kind: 'photo', uri: 'blob:a' }, 4, true);
  // The keep failed (held for Retry, its error said as today): the cover goes.
  assert.equal(shotKept(shot, 4, null), null);
  assert.deepEqual(view(shotKept(shot, 4, null), null, []), { show: 'none' });
  // Kept, but the screen did not open its editor (its Stop began, its walk ended, the bar went back): the cover goes.
  assert.deepEqual(view(shotKept(shot, 4, kept), null, []), { show: 'none' });
  // An older keep settling never touches a newer shot.
  assert.equal(shotKept(shot, 3, null), shot);
  // Closed while held (Escape, Back, the walk's Stop): the cover goes, and the editor does not open for it afterwards.
  const closed = shotClosed(shot);
  assert.deepEqual(view(closed, null, []), { show: 'none' });
  const m = moment('m1', [piece('m1', 'm1', 'photo', 1)]);
  assert.deepEqual(view(shotKept(closed, 4, kept), editAfter(kept), [m]), { show: 'none' });
  // A piece added to an open moment ("Add to this moment") is held and edited the same way, on that piece.
  const into = shotKept(shotTaken({ kind: 'video', uri: 'blob:v' }, 5, true), 5, { kind: 'video', id: 'p', momentId: 'open' });
  const open = moment('open', [piece('open', 'open', 'text', 1), piece('p', 'open', 'video', 2)]);
  const v = view(into, editAfter({ kind: 'video', id: 'p', momentId: 'open' }), [open]);
  assert.ok(v.show === 'editor');
  assert.equal(v.capture.piece_id, 'p');
  assert.equal(v.key, 'shot-5');
});

// The hook and its hosts: one mechanism, read from the source (the hook's state is React's, which no unit test renders).
const HOSTS = ['app/walk.tsx', 'components/MomentBar.tsx', 'components/journal/OpenLine.tsx', 'components/RecordingBar.tsx', 'components/planner/PlannerCapture.tsx'];

test('tend captures T62: every surface that opens the editor after a capture hands the camera to the hook and draws its view', () => {
  for (const f of HOSTS) {
    const s = src(f);
    const takes = [...s.matchAll(/cap\.takePhoto\(([^)]*)\)/g)].map((m) => m[1]);
    const watched = takes.filter((a) => /editAfter\.camera$/.test(a));
    assert.ok(watched.length >= 1, `${f} hands its camera to the editor's hook`);
    assert.match(s, /<AfterCaptureEditor [^>]*view=\{[^}]+\}/, `${f} draws the held shot and the editor through the hook's view`);
    assert.doesNotMatch(s, /<MediaEditor [^>]*justKept/, `${f} draws no editor after a capture of its own`);
  }
  // The note page's and Respond's cameras open no editor, so they hold no shot.
  assert.match(src('components/journal/OpenLine.tsx'), /const k = await cap\.takePhoto\(null\);/);
  assert.doesNotMatch(src('components/threads/ReplyDock.tsx'), /editAfter/);
  // The camera is told the shot the moment it returns, before the keep, and the keep's outcome once it settles.
  const caps = src('lib/useCaptures.ts');
  const take = caps.slice(caps.indexOf('const takePhoto = async'), caps.indexOf('// Voice memo actions run one after another'));
  assert.match(take, /camera\?: CameraWatch/);
  for (const k of ['video', 'photo']) {
    assert.match(take, new RegExp(`keepWatched\\(\\{ kind: '${k}'`), `the ${k} is kept through the watch`);
  }
  assert.match(caps, /const turn = camera\?\.shot\(\{ kind: k\.kind, uri: k\.uri \}\);[\s\S]{0,200}?await keepOrHold\(k\)/, 'held before the keep');
  assert.match(caps, /camera\?\.kept\(turn, /, 'and told how the keep went');
  // The hook asks the screen, at the camera's return, whether its editor would open there.
  const hook = src('components/edit/EditOffer.tsx');
  assert.match(hook, /shotTaken\(s, turn, !waitsNow\.current && \(opensNow\.current\?\.\(\) \?\? true\)\)/);
  assert.match(hook, /<MediaEditor [^>]*key=\{view\.key\}[^>]*held=\{view\.show === 'held'\}[^>]*justKept/);
});

test('tend captures T62: the held shot is the editor minus its controls, and the editor after a cover does not fade in', () => {
  const editor = src('components/edit/MediaEditor.tsx');
  // Decision 0240: "Photo kept" is never said before it is.
  assert.match(editor, /const kept = props\.justKept && !props\.held && kind !== 'voice' \? keptWords\(kind\) : null;/);
  // The controls keep their room while held, so the shot never moves when they come: hidden, untouchable, unread.
  assert.match(editor, /const hidden = props\.held \? HIDDEN : null;/);
  assert.match(editor, /<View style=\{hidden\} pointerEvents=\{props\.held \? 'none' : 'auto'\} \{\.\.\.unread\}>\s*\{top\}/);
  // Mounted over a held shot, the Modal comes at once, the backdrop and the shot with it; otherwise it fades, as before.
  assert.match(editor, /const \[enter\] = useState<'none' \| 'fade'>\(\(\) => \(props\.shot \? 'none' : 'fade'\)\);/);
  assert.match(editor, /<Modal visible animationType=\{enter\} /);
  // The shot is drawn on the stage until the stored picture is (a photo while its look is untouched, a video until sized).
  assert.match(editor, /\{under && shotRect && shotSize && \(/);
});
