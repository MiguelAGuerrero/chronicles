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
import { afterCapture, editAfter, keptWords, shotClosed, shotKept, shotTaken, type HeldShot } from '../../editOffer';
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
    // tend captures T62: a call's own nested parentheses (`momentPill.target()`) are read through.
    const takes = [...s.matchAll(/cap\.takePhoto\(((?:[^()]|\([^()]*\))*)\)/g)].map((m) => m[1]);
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
  // tend captures audit 8: the watch now answers whether the screen holds the shot, so the keep leaves its file in place.
  assert.match(caps, /const seen = camera\?\.shot\(\{ kind: k\.kind, uri: k\.uri \}\);[\s\S]{0,400}?await keepOrHold\(/, 'held before the keep');
  assert.match(caps, /camera\?\.kept\(seen\.turn, /, 'and told how the keep went');
  // The hook asks the screen, at the camera's return, whether its editor would open there.
  const hook = src('components/edit/EditOffer.tsx');
  // tend captures audit 8: asked once, its answer both holds the shot and tells the keep to leave the picked file.
  assert.match(hook, /const holds = !waitsNow\.current && \(opensNow\.current\?\.\(\) \?\? true\);[\s\S]{0,120}?setShot\(shotTaken\(s, turn, holds\)\);/);
  assert.match(hook, /<MediaEditor [^>]*key=\{view\.key\}[^>]*held=\{view\.show === 'held'\}[^>]*justKept/);
});

test('tend captures T62: the held shot is the editor minus its controls, and the editor after a cover does not fade in', () => {
  const editor = src('components/edit/MediaEditor.tsx');
  // Decision 0240: "Photo kept" is never said before it is.
  // (tend captures audit 11: the words are read once, `kept` only once not held.)
  assert.match(editor, /const kept = words && !props\.held \? words : null;/);
  // The controls keep their room while held, so the shot never moves when they come: hidden, untouchable, unread; the ✕
  // alone shows and works (tend captures audit 7: the top row's middle and Done, then the tools below, each hidden).
  assert.match(editor, /const hidden = props\.held \? HIDDEN : null;/);
  // (tend captures audit 12: the row's middle is unhidden for screen readers while it holds only the empty live line.)
  assert.equal([...editor.matchAll(/style=\{(?:\[[^\]]*\bhidden\]|hidden)\} pointerEvents=\{props\.held \? 'none' : 'auto'\} \{\.\.\.(?:unread|\(props\.held && !words \? unread : \{\}\))\}/g)].length, 3, 'tend captures audit 7: the top row\'s middle, Done and the tools below');
  assert.match(editor, /\{ paddingBottom: insets\.bottom \+ 10 \}, hidden\]\} pointerEvents=\{props\.held \? 'none' : 'auto'\} \{\.\.\.unread\}/);
  // Mounted over a held shot, the Modal comes at once, the backdrop and the shot with it; otherwise it fades, as before.
  assert.match(editor, /const \[enter\] = useState<'none' \| 'fade'>\(\(\) => \(props\.shot \? 'none' : 'fade'\)\);/);
  assert.match(editor, /<Modal visible animationType=\{enter\} /);
  // The shot is drawn on the stage until the stored picture is (a photo while its look is untouched, a video until sized).
  assert.match(editor, /\{under && shotRect && shotSize && \(/);
});

// tend captures audit 7 (the orchestrator's ruling on the batch's end pass): the held shot hid every control, so a keep
// that hung left no way out on iOS (no Back), and the cover blocked the walk screen's Stop for as long as the keep ran.
// While held, the editor's own ✕ is shown in its own place and works: it closes the held shot, the shot is still kept,
// and no editor opens for it afterwards. Done, Revert and the tools stay hidden and untouchable until it is kept.
test("tend captures audit 7: while the shot is held the editor's ✕ is shown in its place and closes it; Done, Revert and the tools stay hidden", () => {
  const editor = src('components/edit/MediaEditor.tsx');
  const top = editor.slice(editor.indexOf('const top = ('), editor.indexOf('const stage = ('));
  // The ✕ is the top row's first child, outside anything hidden while held.
  assert.match(top, /^const top = \(\s*<View style=\{\[styles\.top, \{ paddingTop: insets\.top \+ 8 \}\]\}>\s*<Pressable testID="edit-close" /);
  assert.doesNotMatch(editor, /<View style=\{hidden\}[^>]*>\s*\{top\}/, 'the top row as a whole is no longer hidden while held');
  // Its spoken name (tend captures audit 11, the owner's "Say it stays", decision 0263): from the start of the hold, the
  // same as once kept, "Close, the photo stays as it is" (or the video).
  assert.match(top, /testID="edit-close" accessibilityRole="button" accessibilityLabel=\{words \? words\.close : 'Close'\}/);
  // Revert, "Photo kept" and Draw's Undo and Redo (the row's middle), and Done: hidden in their place, untouchable, unread.
  // (tend captures audit 12: unread only when it holds more than the empty live line, i.e. no kept words to come.)
  assert.match(top, /<View style=\{\[styles\.topMid, hidden\]\} pointerEvents=\{props\.held \? 'none' : 'auto'\} \{\.\.\.\(props\.held && !words \? unread : \{\}\)\}>/);
  assert.match(top, /<View style=\{hidden\} pointerEvents=\{props\.held \? 'none' : 'auto'\} \{\.\.\.unread\}>\s*<Pressable testID="edit-done" [^>]*disabled=\{!!props\.held\}/);
  // The tools below: as before.
  assert.match(editor, /<View style=\{\[styles\.bottom, \{ paddingBottom: insets\.bottom \+ 10 \}, hidden\]\} pointerEvents=\{props\.held \? 'none' : 'auto'\} \{\.\.\.unread\}>/);

  // Closed while held, the keep goes on and the shot is kept; the editor does not open for it afterwards, even when a
  // later camera return holds nothing in its place (mid-memo, a Stop under way) and the screen opens the closed one.
  const hook = src('components/edit/EditOffer.tsx');
  assert.match(hook, /close: \(\) => \{\s*dropped\.current = \{ turn: turns\.current, piece: null \};/);
  // (tend captures audit 8: the keep also says whether the picked file is the editor's to let go.)
  assert.match(hook, /kept: \(turn, k, release\) => \{\s*if \(k && dropped\.current\?\.turn === turn\) dropped\.current = \{ turn, piece: k\.id \};/);
  assert.match(hook, /open: \(kept: KeptShot\) => \{\s*if \(dropped\.current\?\.piece === kept\.id\) return;\s*setTarget\(editAfter\(kept\)\);/);
  // The pure view agrees: closed while held, kept, then opened by the screen: nothing.
  const kept = { kind: 'photo' as const, id: 'm9', momentId: 'm9' };
  const closed = shotClosed(shotTaken({ kind: 'photo', uri: 'blob:held' }, 9, true));
  const m = moment('m9', [piece('m9', 'm9', 'photo', 1)]);
  assert.deepEqual(view(shotKept(closed, 9, kept), editAfter(kept), [m]), { show: 'none' });
});

// tend captures audit 8 (the review's F1 = finding B = S2 = U4, the orchestrator's ruling R1): the keep revoked the picked
// blob (web) or moved the picked file (native) while the held shot's element was still reading it, so a video kept at
// full speed logged ERR_FILE_NOT_FOUND and its held shot showed only the backdrop. The held shot owns its source until it
// leaves the view: watched, the keep leaves the picked file in place (the web keeps the blob, native copies), and the
// editor's hook lets it go once the shot is closed, replaced or unmounted, only if it was kept; a failed keep's file
// stays with the holder for Retry.
test('tend captures audit 8: a watched keep keeps its source until the shot leaves, and a failed one leaves it to Retry', () => {
  const web = src('lib/media/index.web.ts');
  assert.match(web, /export async function keepFile\(tempUri: string, walkId: string, name: string, opts: \{ replace\?: boolean; keepSource\?: boolean \} = \{\}\)/);
  assert.match(web, /if \(!opts\.keepSource && tempUri\.startsWith\('blob:'\)\) URL\.revokeObjectURL\(tempUri\);/, 'the web keeps the blob a held shot reads');
  const native = src('lib/media/index.native.ts');
  assert.match(native, /opts: \{ replace\?: boolean; keepSource\?: boolean \} = \{\}/);
  assert.match(native, /if \(opts\.keepSource\) await new File\(tempUri\)\.copy\(dest\);\s*else await new File\(tempUri\)\.move\(dest\);/, 'native copies the file a held shot reads');
  // The keep is told whether a held shot reads the file: only when the screen holds it.
  const caps = src('lib/useCaptures.ts');
  assert.match(caps, /return keepFile\(uri, folderOf\(stamp\.walk\), `\$\{newId\(\)\}\.\$\{k\.ext\}`, \{ keepSource: !!k\.keepSource \}\);/);
  assert.match(caps, /const seen = camera\?\.shot\(\{ kind: k\.kind, uri: k\.uri \}\);[\s\S]{0,400}?keepOrHold\(\{ \.\.\.k, keepSource: !!seen\?\.holds \}/);
  assert.match(caps, /camera\?\.kept\(seen\.turn, r, !!r \|\| released\)/, 'kept, or copied before the row failed: the file is the editor\'s to let go');
  // A failed keep whose file was copied is retried from the copy: the holder keeps no picked file to Retry from.
  assert.match(caps, /if \(k\.keepSource && r\.path\) released\?\.\(\);\s*holdFailed\(k\.keepSource && r\.path \? \{ \.\.\.k, uri: null \} : k, r\.path, r\.error\);/);
  // The hook lets the picked file go once its shot leaves the view, and never one a failed keep left with the holder.
  const hook = src('components/edit/EditOffer.tsx');
  assert.match(hook, /shot: \(s\) => \{[\s\S]{0,400}?if \(holds\) sources\.current\.set\(turn, s\.uri\);[\s\S]{0,200}?return \{ turn, holds \};/);
  assert.match(hook, /kept: \(turn, k, release\) => \{[\s\S]{0,300}?const uri = sources\.current\.get\(turn\);\s*sources\.current\.delete\(turn\);\s*if \(uri && release\) \{\s*if \(shownNow\.current === uri\) letGo\.current\.add\(uri\);\s*else dropTemp\(uri\);/);
  assert.match(hook, /return \(\) => \{\s*shownNow\.current = null;\s*if \(letGo\.current\.delete\(shown\)\) dropTemp\(shown\);\s*\};\s*\}, \[shown\]\);/, 'closed, replaced or unmounted: let go');
  // The watch says whether the screen holds the shot, and whether the keep left the file to the editor.
  const core = src('lib/editOffer.ts');
  assert.match(core, /shot\(s: Shot\): \{ turn: number; holds: boolean \};/);
  assert.match(core, /kept\(turn: number, k: KeptShot \| null, release: boolean\): void;/);
});

// tend captures audit 9 (the review's F8, the orchestrator's ruling R2, with audit 8): the camera's full-size photo stayed
// decoded under the stored copy for as long as the look was untouched (about 48 MB for a 12 MP shot). It is let go once
// the stored picture has loaded and been painted: then the two are the same picture in the same place, so nothing blinks.
test('tend captures audit 9: the camera\'s full-size shot leaves the stage once the stored picture has loaded', () => {
  const editor = src('components/edit/MediaEditor.tsx');
  assert.match(editor, /const \[drawn, setDrawn\] = useState<string \| null>\(null\);/);
  // Loaded, then one frame on for it to be painted, then the shot goes (tend captures audit 9: react-native-svg's web
  // Image hands `onLoad` to its <image>, native's to its own load event).
  assert.match(editor, /const storedDrawn = \(\) => \{\s*const at = uri;\s*requestAnimationFrame\(\(\) => setDrawn\(at\)\);\s*\};/);
  assert.match(editor, /<EditedPicture uri=\{uri\} W=\{size\.w\} H=\{size\.h\} edit=\{stageEdit\} width=\{rect\.width\} height=\{rect\.height\} onLoad=\{kind === 'photo' && props\.shot \? storedDrawn : undefined\} \/>/);
  assert.match(editor, /const under = !!props\.shot && \(!!props\.held \|\| !rect \|\| \(kind === 'photo' && plainLook && \(!uri \|\| drawn !== uri\)\)\);/);
});

// tend captures audit 11 (the review's S3, the owner's answer in decision 0263, "Say it stays"): while the shot was held
// its ✕ was named only "Close", bending 0240's audit 1 ("✕ never reads as throw it away"). It is named as once kept, from
// the start of the hold: "Close, the photo stays as it is" / "Close, the video stays as it is"; on screen the ✕ alone.
test('tend captures audit 11: the held shot\'s ✕ is named "Close, the photo stays as it is" from the start of the hold', () => {
  const editor = src('components/edit/MediaEditor.tsx');
  assert.match(editor, /const words = props\.justKept && kind !== 'voice' \? keptWords\(kind\) : null;/);
  assert.match(editor, /const kept = words && !props\.held \? words : null;/, '"Photo kept" is still never said before it is (0240)');
  assert.match(editor, /testID="edit-close" accessibilityRole="button" accessibilityLabel=\{words \? words\.close : 'Close'\}/);
  assert.equal(keptWords('photo').close, 'Close, the photo stays as it is');
  assert.equal(keptWords('video').close, 'Close, the video stays as it is');
  // (tend captures audit 11: the iOS announcement still says "Photo kept" only once kept, from `kept`.)
  assert.match(editor, /const keptLine = kept\?\.line;/);
});

// tend captures audit 12 (the review's U2, WCAG 4.1.3): "Photo kept" and "Video kept" were likely never announced on the
// web: the live region was inserted already full as the controls came (react-native-web's announceForAccessibility does
// nothing). It is mounted empty from the hold, in the row's middle, which screen readers may then read (it holds only that
// line: invisible, untouchable), and fills at the keep, the same node.
test('tend captures audit 12: the kept line\'s live region is in the page, empty, from the start of the hold, and fills at the keep', () => {
  const editor = src('components/edit/MediaEditor.tsx');
  const top = editor.slice(editor.indexOf('const top = ('), editor.indexOf('const stage = ('));
  // (tend captures audit 12: while held `empty` holds and the tool stays Crop, so the line is always there.)
  assert.match(top, /\{words && empty && s\.tool !== 'draw' \? \(/);
  assert.match(top, /<Text testID="edit-kept" style=\{styles\.kept\} accessibilityLiveRegion="polite" numberOfLines=\{1\}>\{kept \? kept\.line : ''\}<\/Text>/);
  assert.match(top, /<View style=\{\[styles\.topMid, hidden\]\} pointerEvents=\{props\.held \? 'none' : 'auto'\} \{\.\.\.\(props\.held && !words \? unread : \{\}\)\}>/);
});

// tend captures audit 13 (the review's U3 = S7 = F6, WCAG 2.4.7): while held, the web's keyboard reached the hidden tools,
// Enter edited a shot not yet kept, and ✕ then asked "Discard these edits?" in the hidden row, so it looked dead. While
// held the editor takes no event but `close`, and its chips and tools leave the Tab order (react-native-web's Pressable
// sets its own tabIndex, so `focusable` alone is not enough there: `tabIndex` -1 too).
test('tend captures audit 13: while the shot is held only ✕ acts, and the hidden chips and tools leave the Tab order', () => {
  const editor = src('components/edit/MediaEditor.tsx');
  assert.match(editor, /const dispatch = \(e: SessionEvent\) => \{\s*if \(saving\) return;\s*\/\/[^\n]*\n\s*if \(props\.held && e\.type !== 'close'\) return;/);
  assert.match(editor, /const untabbed = props\.held \? \(\{ focusable: false, tabIndex: -1 \} as const\) : \{\};/);
  const chip = editor.slice(editor.indexOf('const chip = ('), editor.indexOf('const controls = ('));
  assert.match(chip, /<Pressable\s+key=\{testID\}\s+testID=\{testID\}[\s\S]*?\{\.\.\.untabbed\}/);
  assert.match(editor, /testID=\{`edit-tool-\$\{t\}`\}[\s\S]{0,800}?\{\.\.\.untabbed\}/);
  // (tend captures audit 13: Done is disabled while held, and Revert while nothing is edited: both out of the order.)
  assert.match(editor, /testID="edit-done" [^>]*disabled=\{!!props\.held\}/);
});

// tend captures audit 14 (the review's F3): nothing read that the hook hands the screen's mask (`waits`, a memo recording,
// T60 and decision 0261) to `afterCapture`: with `waits: false` there, a photo taken mid-memo would open its editor over
// the memo. Read from the source: the hook passes its own `waits`, from the screen's option, into the pure view, and
// asks it again as the camera returns; the screens that record a memo hand it over.
test('tend captures audit 14: the editor\'s hook hands the screen\'s mid-memo mask to afterCapture', () => {
  const hook = src('components/edit/EditOffer.tsx');
  assert.match(hook, /const waits = !!opts\.waits;/);
  assert.match(hook, /const view = afterCapture\(\{ shot, target, captures, waits \}\);/);
  assert.match(hook, /useEffect\(\(\) => \{\s*waitsNow\.current = waits;/);
  assert.match(hook, /const holds = !waitsNow\.current && /);
  assert.match(src('app/walk.tsx'), /useEditAfterCapture\(cap\.captures, \{ waits: cap\.voiceStartedAt != null,/);
  assert.match(src('components/MomentBar.tsx'), /useEditAfterCapture\(cap\.captures, \{ waits: recording \}\)/);
  assert.match(src('components/RecordingBar.tsx'), /useEditAfterCapture\(cap\.captures, \{\s*waits: memoOn,/);
});
