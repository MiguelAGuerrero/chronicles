/// <reference types="node" />
// The recording bar's Edit offer waited (decision 0149, from /tend inbox T12) until decision 0240 (fix
// edit-after-capture) opened the editor by itself after a capture, everywhere; its rules and words went with it
// (captures/editAfterCapture.test.ts). What stays here is what steps aside for the bar's pills and Memories' column.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pressHintUp } from '../../atlas/overlaySlots';

// /tend inbox T36 (the proxy's yes under 0157, 2026-11-18): the pill's room above the bar lifts Explore's map, so at
// 320 x 700 the walker sat under "Press and hold the map to look anywhere." The hint steps aside while the pill is up and
// shows again as it goes; its seconds on screen count only while it shows, so EC14's "after a few seconds on screen it
// is marked seen" holds.
test('tend tabs T36: Explore\'s press hint steps aside while the bar\'s Edit pill is up, and counts no time on screen meanwhile', () => {
  const unseen = { seen: false, spot: false, located: true, reminder: false, focused: true, covered: false, folded: false, slotTaken: false };
  assert.equal(pressHintUp({ ...unseen, barOffer: false }), true);
  assert.equal(pressHintUp({ ...unseen, barOffer: true }), false, 'stepped aside while the pill is up');
  // Nothing else moves: seen, a long press open or no place yet keep it down as before, the pill or not.
  for (const barOffer of [false, true]) {
    assert.equal(pressHintUp({ ...unseen, seen: true, barOffer }), false);
    assert.equal(pressHintUp({ ...unseen, spot: true, barOffer }), false);
    assert.equal(pressHintUp({ ...unseen, located: false, barOffer }), false);
  }
});

test('tend tabs T36: Explore times its hint by one reading; the bar has had no Edit pill to tell of since decision 0240', () => {
  const bar = readFileSync(join(__dirname, '../../../components/RecordingBar.tsx'), 'utf8');
  const explore = readFileSync(join(__dirname, '../../../app/(tabs)/explore.tsx'), 'utf8');
  // Since decision 0240 the bar draws no Edit pill: it sets nothing (the store and its readers wait in docs/DEFERRED.md).
  assert.doesNotMatch(bar, /barOfferUp/, 'the bar has no pill to publish');
  assert.match(explore, /useStore\(barOfferUp,/, 'Explore subscribes to the pill');
  // The one reading gates both the timer that marks the hint seen and what is drawn, so it is never marked seen unseen.
  assert.match(explore, /const hintShown = pressHintUp\(\{[^}]*barOffer[^}]*\}\)/);
  assert.match(explore, /if \(!hintShown\) return;/);
  assert.match(explore, /\) : hintShown \? \(/);
});

// /tend inbox T40 (the owner's answer in person, 2026-11-19: "Shorter one-line words"): at 320 x 700 the two-line hint
// reached the walker; its words are one line at 320 px now, and the map's camera keeps today's padding.
test('tend tabs T40: Explore\'s press hint reads "Hold the map to look anywhere."', () => {
  const explore = readFileSync(join(__dirname, '../../../app/(tabs)/explore.tsx'), 'utf8');
  assert.match(explore, /<Text style=\{styles\.hint\} testID="atlas-press-hint">Hold the map to look anywhere\.<\/Text>/);
  assert.doesNotMatch(explore, /Press and hold the map to look anywhere/);
});

// tend tabs audit 51 (the T40 review's ux judgment call 3): the bar publishes its reminder card as it publishes its pill,
// and Explore's hint reads it, so the hint steps aside while the card lifts the map.
test('tend tabs audit 51: the bar tells the tabs whether its reminder card stands, and Explore\'s hint reads it', () => {
  const bar = readFileSync(join(__dirname, '../../../components/RecordingBar.tsx'), 'utf8');
  const explore = readFileSync(join(__dirname, '../../../app/(tabs)/explore.tsx'), 'utf8');
  assert.match(bar, /const reminderUp = !!reminder;\s*useEffect\(\(\) => \{\s*barReminderUp\.set\(reminderUp\);\s*return \(\) => barReminderUp\.set\(false\);\s*\}, \[reminderUp\]\);/);
  assert.match(explore, /useStore\(barReminderUp,/);
  assert.match(explore, /pressHintUp\(\{[^}]*reminder: barReminder[^}]*\}\)/);
});

// /tend inbox T37 (the proxy's yes under 0157, 2026-11-18): the storage notice on Memories waits for the bar's Edit pill
// (the shell's half is in storage/spaceShell.test.ts); the app's instance reads the same store the bar sets.
test('tend tabs T37: the app\'s storage awareness waits on the bar\'s Edit pill, the store the bar publishes', () => {
  const index = readFileSync(join(__dirname, '../../space/index.ts'), 'utf8');
  // tend tabs audit 32: the pill is one part of where the line can be seen.
  assert.match(index, /import \{ barOfferUp, modalsUp \} from '\.\.\/tabsHidden';/);
  assert.match(index, /createSpace\(ports, probe, sightOf\(\{ pill: barOfferUp, column: columnPills, lines: spaceLines, modals: modalsUp \}\)\)/, 'the instance is given the pill');
});

// tend tabs audit 32 (the T37 review's auditor 1, ux 2, steward 2): a line is said and marked only where it can be seen, so
// every SpaceLine counts itself mounted, before it knows whether it has a line to draw.
test('tend tabs audit 32: each SpaceLine counts itself mounted, and the instance reads that count and the Modals up', () => {
  const line = readFileSync(join(__dirname, '../../../components/SpaceLine.tsx'), 'utf8');
  assert.match(line, /useEffect\(\(\) => holdCount\(spaceLines\), \[\]\);\s*const line = useStore\(space\.store/, 'held in an effect, before the line is read');
  assert.match(line, /import \{ holdCount, spaceLines \} from '\.\.\/lib\/space\/sight';/);
});

// tend tabs audit 33 (the T37 review's auditor 2, steward 1; the owner's "The whole column", Nov 18): each dark pill of
// Memories' column counts itself while it stands and Memories is in front, and only there: the walk screen and Navigate,
// ready keep their own pills out of the count.
test('tend tabs audit 33: Memories\' column counts its dark pills while it is in front', () => {
  const read = (f: string) => readFileSync(join(__dirname, '../../../components', f), 'utf8');
  const line = read('journal/OpenLine.tsx');
  const memories = read('chronicle/MemoriesScreen.tsx');
  const undo = read('UndoToast.tsx');
  assert.match(line, /const pillsStand = !!errorPill \|\| !!toast \|\| \(cap\.discarded && !recording\) \|\| cap\.unsaved \|\| cap\.held\.length > 0;/);
  assert.match(line, /useEffect\(\(\) => \(focused && pillsStand \? holdCount\(columnPills\) : undefined\), \[focused, pillsStand\]\);/);
  assert.match(memories, /useEffect\(\(\) => \(bandFocused && toastUp \? holdCount\(columnPills\) : undefined\), \[bandFocused, toastUp\]\);/);
  assert.match(memories, /<UndoToast style=\{styles\.undoInColumn\} column=\{bandFocused\} \/>/);
  assert.match(undo, /useEffect\(\(\) => \(props\.column && drawn \? holdCount\(columnPills\) : undefined\), \[props\.column, drawn\]\);/);
  for (const other of ['MomentBar.tsx', 'edit/EditOffer.tsx']) assert.doesNotMatch(read(other), /columnPills/, `${other} keeps out of the count`);
});
