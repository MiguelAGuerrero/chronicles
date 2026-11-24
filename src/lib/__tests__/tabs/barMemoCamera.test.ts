/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { memoJoins, photoMidMemo } from '../../pieceStamp';
import * as bar from '../../recordingBar';

// tend tabs T60 (the owner's yes, Nov 23, "Yes, file it as yes'd (Recommended)", decision 0261): the T44 shape on the
// recording bar, amending BC2 (specs/recording-bar-captures). While the bar's own memo records the camera keeps its
// place, a photo taken then joins the memo's moment (`photoMidMemo`, `memoJoins`), its editor waits until the memo is
// saved or discarded, and Discard sits on the line beside the time. VISION's Always, "Capture is one tap away on every
// screen you walk or capture from"; Never, "A capture behind a menu, a drawer or an extra tap".

const BAR = join(__dirname, '../../../components/RecordingBar.tsx');

// Read loosely, so the file loads before the function exists.
const fn = (m: object, name: string) => (m as Record<string, unknown>)[name] as ((...a: unknown[]) => unknown) | undefined;

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((c) => walk(c, visit));
}

const source = () => ts.createSourceFile('RecordingBar.tsx', readFileSync(BAR, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/** The JSX element whose `id` or `testID` attribute is `id`. */
function element(sf: ts.SourceFile, id: string): ts.JsxSelfClosingElement | ts.JsxOpeningElement | null {
  let found: ts.JsxSelfClosingElement | ts.JsxOpeningElement | null = null;
  walk(sf, (n) => {
    if (found || !(ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n))) return;
    const hit = n.attributes.properties.some((a) => ts.isJsxAttribute(a) && ['id', 'testID'].includes(a.name.getText()) && a.initializer?.getText() === `"${id}"`);
    if (hit) found = n;
  });
  return found;
}

/** The text of an attribute's value on an element. */
function attr(el: ts.JsxSelfClosingElement | ts.JsxOpeningElement, name: string): string | null {
  const a = el.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === name) as ts.JsxAttribute | undefined;
  return a?.initializer?.getText() ?? null;
}

/** Whether a node is drawn only when the memo is off: in the false branch of a `memoOn ? … : …`. */
function onlyWithoutMemo(node: ts.Node): boolean {
  for (let n: ts.Node = node; n.parent; n = n.parent) {
    const p = n.parent;
    if (ts.isConditionalExpression(p) && /^\(?\s*memoOn\s*\)?$/.test(p.condition.getText()) && p.whenFalse === n) return true;
  }
  return false;
}

/** The initializer text of a `const <name> = …` in the file. */
function constText(sf: ts.SourceFile, name: string): string {
  let out = '';
  walk(sf, (n) => {
    if (!out && ts.isVariableDeclaration(n) && n.name.getText() === name && n.initializer) out = n.initializer.getText();
  });
  return out;
}

test('tend tabs T60: mid-memo the bar\'s camera keeps its place, spoken "Add a photo to this memo"', () => {
  const sf = source();
  const camera = element(sf, 'bar-photo');
  const save = element(sf, 'bar-voice-save');
  assert.ok(camera && save, 'the camera and the memo\'s Save are drawn');
  assert.equal(onlyWithoutMemo(camera), false, 'the camera is not left out while a memo records');
  assert.ok(camera.getStart() < save.getStart(), 'the camera, then Save in the mic\'s place');
  assert.match(attr(camera, 'label') ?? '', /Add a photo to this memo/, 'mid-memo it says where the photo goes');
  // Off while the memo is being saved, as the walk screen's (T44): the photo would have no memo to join.
  assert.match(attr(camera, 'disabled') ?? '', /cap\.busy === 'voice'|capturing/);
});

test('tend tabs T60: Discard sits on the line beside the time, before it, not in the camera\'s place', () => {
  const sf = source();
  const discard = element(sf, 'bar-voice-discard');
  const line = element(sf, 'recording-return');
  const camera = element(sf, 'bar-photo');
  assert.ok(discard && line && camera, 'Discard, the line and the camera are drawn');
  assert.ok(discard.getStart() < line.getStart(), 'Discard comes before the line\'s time, the farther from Save (as T44\'s row)');
  assert.notEqual(discard.parent, line.parent?.parent, 'Discard is not inside the line\'s button');
  assert.match(attr(discard, 'label') ?? '', /Discard voice memo/);
});

test('tend tabs T60: a photo taken mid-memo waits for its editor until the memo is saved or discarded', () => {
  // tend captures T62: the bar's mask is the editor hook's own `waits`, which holds no shot and draws no editor meanwhile.
  assert.match(readFileSync(BAR, 'utf8'), /= useEditAfterCapture\(cap\.captures, \{\s*waits: memoOn,/, 'the editor waits on the memo');
});

test('tend tabs T60: the editor waiting on the memo opens no more when the bar goes back to the walk or its memo leaves sight', () => {
  const sf = source();
  // The way back saves the memo, then the walk screen comes: the editor would open on the tab it leaves.
  assert.match(constText(sf, 'back'), /editAfter\.close\(\)/, 'back() lets the waiting editor go');
  // A memo saved as the bar's captures leave sight (another tab, a card, a Modal over the tabs): an editor opening then
  // would come over that card or Modal, and iOS cannot present a Modal over a Modal.
  const leave = constText(sf, 'leaveMemo');
  assert.match(leave, /editAfter\.close\(\)/, 'leaving sight lets the waiting editor go');
  assert.match(leave, /saveMemo\(\)/, 'and saves the memo');
  assert.match(readFileSync(BAR, 'utf8'), /useRef\(leaveMemo\)/, 'the leave-sight effect saves through leaveMemo');
});

test('tend tabs T60: the bar\'s photo mid-memo goes with the memo, as the walk screen\'s since T44', () => {
  const sf = source();
  // The bar's camera asks for no target of its own, so `useCaptures` sends it after the memo (`photoMidMemo`).
  // tend captures T62: still no target or place of its own; only the editor's camera watch is handed over.
  assert.match(constText(sf, 'photo'), /cap\.takePhoto\(null, null, editAfter\.camera\)/);
  // A memo of its own: the photo is kept as the moment, and the memo joins it when saved.
  assert.deepEqual(photoMidMemo({ into: null, place: null }, null, null), { into: null, place: null });
  assert.deepEqual(memoJoins({ t: 1, into: null }, 'm1'), { t: 1, into: 'm1' });
  // A memo begun for an open moment: the photo goes into that moment.
  assert.deepEqual(photoMidMemo({ into: 'm0', place: null }, null, null), { into: 'm0', place: null });
});

// The widest m:ss a memo's line draws ("59:59"), at 16 px tabular semibold; the bar's sizes as RecordingBar draws them.
const TIME_MAX = 44;
const PAD = 6 + 10; // the bar's left and right padding
const ROUND = 44; // the camera, Save, the pencil's empty slot and Stop
const GAP = 6; // between the row's parts
const DOT = 12 + 10; // the memo's dot and its gap

test('tend tabs T60: mid-memo the line keeps its time whole beside Discard at 320 px; the dot gives way below 360 px, as the line\'s', () => {
  const memoLine = fn(bar, 'barMemoLine') as ((w: number) => { dot: boolean; left: number; right: number; discard: number }) | undefined;
  assert.ok(memoLine, 'barMemoLine exists');
  for (const width of [320, 340, 360, 390, 430]) {
    const m = memoLine(width);
    assert.equal(m.dot, bar.barDot(width), `the memo's dot follows the line's at ${width} px`);
    // tend tabs T60: a 44 pt button itself, as the bar's others: react-native-web has no hitSlop (tabs-and-home rule).
    assert.equal(m.discard, ROUND, `Discard's touch is 44 pt at ${width} px`);
    const room = width - PAD - (m.discard + 4 * ROUND + 5 * GAP);
    const need = m.left + (m.dot ? DOT : 0) + TIME_MAX + m.right;
    assert.ok(need <= room, `the memo's time fits at ${width} px (${need} <= ${room})`);
  }
  assert.deepEqual([memoLine(390).left, memoLine(390).right], [10, 10], 'from 360 px the line\'s gaps are as before');
});

// tend tabs audit 68 (the batch's review: auditor F3): a photo still being saved when its memo left sight opened its editor
// anyway: `leaveMemo` let the editor go first, then the memo's save waited for the photo, and `photo()` opened the editor
// once it was kept, on the new tab or over a card or a Modal (iOS cannot present a Modal over a Modal). The memo a leave
// saved is kept, and a photo taken during that memo opens no editor once kept.
test('tend tabs audit 68: a photo taken during a memo that left sight opens no editor once kept', () => {
  // tend tabs audit 68: read from the bar's own `leaveMemo` and `photo`.
  const sf = source();
  const leave = constText(sf, 'leaveMemo');
  assert.match(leave, /leftMemo\.current = cap\.voiceStartedAt;/, 'the leave keeps which memo it saved');
  const photo = constText(sf, 'photo');
  assert.match(photo, /const memoAt = cap\.voiceStartedAt;/, 'the photo knows the memo it was taken during');
  const gate = photo.indexOf('memoAt != null && leftMemo.current === memoAt');
  assert.ok(gate >= 0 && gate < photo.indexOf('editAfter.open('), 'and opens no editor once that memo has left sight');
});
