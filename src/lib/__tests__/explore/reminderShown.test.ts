/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Faced } from '../../moment';
import { UNSEEN, barInSight, createRecallPlaces, firePlace, reminderSeen, reminderSight } from '../../discovery/recall';

// A fired reminder is marked fired (a "once" one cleared) as it is shown, so it must go where a person can see it.
// The places that listen (the walk screen, the recording bar) import React Native, so their wiring is read as text;
// the memories journey's reminder steps check what is seen.
const lib = join(__dirname, '..', '..');
const read = (...p: string[]) => readFileSync(join(lib, ...p), 'utf8');

// After a reload with a walk open, the walk screen (mounted as the app opens, NR3) and the recording bar both listened
// in one slot, and whichever listened last took the fire: the walk screen, kept behind the tabs while minimized,
// took it out of sight, with no card, no bar line and no notification (docs/DEFERRED.md, "Reminders and
// notifications"). explore-marks: "the walk screen's card if it is in front and listening, else a notification".
test('tend explore 21: a fire goes to the newest place listening that is in front; one out of sight never takes it', () => {
  // The bar listened, then the walk screen kept behind the tabs: the bar, in front, takes it.
  assert.equal(firePlace(true, [true, false]), 0);
  // The walk screen in front, the bar gone or not: the walk's card.
  assert.equal(firePlace(true, [true]), 0);
  assert.equal(firePlace(true, [false, true]), 1);
  // Both in front for a moment (a screen on its way out): the newest, as the openers are asked (lib/openers).
  assert.equal(firePlace(true, [true, true]), 1);
  // None in front, none listening, or the app behind: a notification.
  assert.equal(firePlace(true, [false, false]), null);
  assert.equal(firePlace(true, []), null);
  assert.equal(firePlace(false, [true]), null);

  // The wiring: every place listens, none replaces another, and each says whether it is in front.
  const check = read('discovery', 'recallCheck.ts');
  assert.doesNotMatch(check, /let screen\b/, 'no single slot that the last listener takes');
  // A place in front, else (tend explore 24) kept for the next one with the app in front, else a notification.
  assert.match(check, /const behind = places\.take\(walkId, captures, active\(\)\);\s*if \(behind\) await notify\(walkId, behind\);/, 'deliver gives it to a place in front, else a notification');
  const walk = readFileSync(join(lib, '..', 'app', 'walk.tsx'), 'utf8');
  assert.match(walk, /onRecallFired\(\s*\(due\) => \{[\s\S]*?\},\s*(\/\/[^\n]*\n\s*)*\(\) => routeNav\.isFocused\(\),?\s*\)/, 'the walk screen takes a fire only while it is in front');
  const bar = read('..', 'components', 'RecordingBar.tsx');
  assert.match(bar, /onRecallFired\(/, 'the recording bar listens too');
});

// A Remind me here fired while a walk is minimized and the tabs are folded under a full-screen card (the area card, the
// planner, the journal's keys) went to the recording bar, zero height and hidden then, which dropped it after 30 s:
// marked fired, never seen. The same under a viewer held over the tab. A notification is no way out: with the page in
// front the web shows none (docs/DEFERRED.md, "Tabs and the recording bar"). explore-marks: "The card goes after 30 s".
test('tend explore 22: a reminder the bar holds out of sight waits, however long; its half-minute runs from when it is seen', () => {
  const ms = 30_000;
  // Fired while folded: it waits, no clock.
  assert.deepEqual(reminderSight({ sight: UNSEEN, inSight: false, now: 1_000, showMs: ms }), { sight: UNSEEN, goesInMs: null });
  assert.deepEqual(reminderSight({ sight: UNSEEN, inSight: false, now: 1_000_000, showMs: ms }), { sight: UNSEEN, goesInMs: null });
  // Unfolded: seen now, and the whole half-minute is left.
  assert.deepEqual(reminderSight({ sight: UNSEEN, inSight: true, now: 1_000_000, showMs: ms }), { sight: { shownMs: 0, since: 1_000_000 }, goesInMs: ms });
  // In sight 40 s on: gone.
  assert.equal(reminderSight({ sight: { shownMs: 0, since: 1_000_000 }, inSight: true, now: 1_040_000, showMs: ms }).goesInMs, 0);
  // The wiring: the bar is in sight only unfolded with nothing over it, and clears by the sight's clock alone.
  const bar = read('..', 'components', 'RecordingBar.tsx');
  assert.match(bar, /useStore\(tabsHidden, /, 'the bar reads whether the tabs are folded');
  assert.match(bar, /useStore\(modalsUp, /, 'the bar reads whether anything is over it');
  assert.match(bar, /reminderSight\(\{ sight: [^}]*inSight[^}]*showMs: MOTION\.reminder \}\)/, 'its clock is the sight\'s');
  assert.doesNotMatch(bar, /setTimeout\(\(\) => setReminder\(null\), MOTION\.reminder\)/, 'no half-minute from the fire itself');
  const modal = read('..', 'components', 'Modal.tsx');
  assert.match(modal, /holdModal\(\)/, 'every Modal up says so');
});

const said = (id: string) => ({ id }) as unknown as Faced;
const ids = (c: Faced[] | null) => (c ?? []).map((x) => x.id);

// The bar held a fire out of sight (tend explore 22), in its own state: a tap that left the tabs (Walk here on the area
// card, the planner's start, a viewer's thread link) unmounted it, and the reminder went with it, its "once" flag spent
// (the review's F1, high). What a place goes with unseen is handed on, and the next place in front takes it.
test('tend explore audit 23: a reminder a place goes with unseen is taken by the next place in front, of the same walk', () => {
  const places = createRecallPlaces();
  const bar: string[][] = [];
  const offBar = places.listen((c) => bar.push(ids(c)), () => true);
  assert.equal(places.take('w1', [said('a')], true), null);
  assert.deepEqual(bar, [['a']]);
  // Walk here: the bar goes with it unseen, before the walk screen listens.
  offBar();
  places.handOn('w1', [said('a')], true, 'w1');
  // The walk screen mounts, in front: it takes it, with what came meanwhile merged in.
  places.handOn('w1', [said('b'), said('a')], true, 'w1');
  const walk: string[][] = [];
  places.listen((c) => walk.push(ids(c)), () => true);
  assert.equal(places.offer(true, 'w1'), true);
  assert.deepEqual(walk, [['a', 'b']]);
  assert.equal(places.offer(true, 'w1'), false, 'once');

  // A walk screen kept behind the tabs takes it only once it comes to the front, and never with the app behind.
  const p2 = createRecallPlaces();
  let front = false;
  const got: string[][] = [];
  p2.listen((c) => got.push(ids(c)), () => front);
  p2.handOn('w1', [said('c')], true, 'w1');
  assert.deepEqual(got, []);
  front = true;
  assert.equal(p2.offer(false, 'w1'), false);
  assert.equal(p2.offer(true, 'w1'), true);
  assert.deepEqual(got, [['c']]);

  // The walk it came on is over: it is dropped, never shown on the next walk.
  const p3 = createRecallPlaces();
  const late: string[][] = [];
  p3.handOn('w1', [said('d')], true, null);
  p3.listen((c) => late.push(ids(c)), () => true);
  assert.equal(p3.offer(true, 'w2'), false);
  assert.equal(p3.offer(true, 'w1'), false, 'dropped, not kept for its walk');
  assert.deepEqual(late, []);
  // With none in front and the app behind a fire is not taken: the caller notifies it (tend explore audit 31).
  assert.deepEqual(ids(createRecallPlaces().take('w1', [said('e')], false)), ['e']);

  // The wiring: the bar hands on what it goes with unseen; the walk screen asks for it as it comes to the front.
  const bar2 = read('..', 'components', 'RecordingBar.tsx');
  assert.match(bar2, /if \(held\.current && !reminderSeen\(seen\.current, Date\.now\(\)\)\) handOnRecall\(walkId, held\.current\)/, 'the bar hands on a reminder nobody saw');
  // Seen means read: a glance as the card closes for Walk here is not (the bar is in sight for the walk screen's few
  // tens of ms to come up).
  assert.equal(reminderSeen({ shownMs: 0, since: 1_000 }, 1_080), false);
  assert.equal(reminderSeen({ shownMs: 1_500, since: 9_000 }, 9_600), true);
  assert.equal(reminderSeen({ shownMs: 2_000, since: null }, 50_000), true);
  const walk2 = readFileSync(join(lib, '..', 'app', 'walk.tsx'), 'utf8');
  assert.match(walk2, /useFocusEffect\(useCallback\(\(\) => recallPlaceShown\(\), \[\]\)\)/, 'the walk screen takes it as it comes to the front');
  const check = read('discovery', 'recallCheck.ts');
  assert.match(check, /places\.offer\(active\(\), w\?\.id \?\? null, hiddenNow\(\)\)/, 'offered against the walk still open (and, since tend explore audit 29, without what went into Undo)');
});

// With a walk minimized and no place in front (an older walk's replay or a day over the tabs, the launch cover over the
// walk screen as a reload opens), a fire went to a notification, which the web does not show with the page in front
// and a phone puts only in its list, and it was marked fired all the same: never seen (docs/DEFERRED.md, "Reminders
// and notifications"). explore-marks: "a place must never take one it cannot show". Kept, it waits for the next place.
test('tend explore 24: a fire no place takes with the app in front waits for the next place in front of its walk', () => {
  // A replay over the tabs: the bar is down, the walk screen kept behind them.
  const places = createRecallPlaces();
  let front = false;
  const walk: string[][] = [];
  places.listen((c) => walk.push(ids(c)), () => front);
  assert.equal(places.take('w1', [said('a')], true), null, 'kept, not notified');
  assert.equal(places.take('w1', [said('b'), said('a')], true), null, 'a later fire merges into what waits');
  assert.deepEqual(walk, []);
  // The replay closes: the bar mounts over the tabs and listens, and takes both.
  const bar: string[][] = [];
  places.listen((c) => bar.push(ids(c)), () => true);
  assert.equal(places.offer(true, 'w1'), true);
  assert.deepEqual(bar, [['a', 'b']]);
  assert.deepEqual(walk, []);
  assert.equal(places.offer(true, 'w1'), false, 'once');
  // A place in front takes a fire at once, as before.
  assert.equal(places.take('w1', [said('c')], true), null);
  assert.deepEqual(bar, [['a', 'b'], ['c']]);

  // The app behind: not kept; the caller notifies, as before.
  const p2 = createRecallPlaces();
  const none: string[][] = [];
  p2.listen((c) => none.push(ids(c)), () => true);
  assert.deepEqual(ids(p2.take('w1', [said('d')], false)), ['d']);
  assert.equal(p2.offer(true, 'w1'), false, 'nothing waits');
  assert.deepEqual(none, []);

  // The walk it fired on ended before a place came to the front: dropped, never shown on the next walk.
  const p3 = createRecallPlaces();
  assert.equal(p3.take('w1', [said('e')], true), null);
  const late: string[][] = [];
  p3.listen((c) => late.push(ids(c)), () => true);
  assert.equal(p3.offer(true, 'w2'), false);
  assert.deepEqual(late, []);

  // The wiring: a fire goes to `take`, and only what it refuses becomes a notification.
  const check = read('discovery', 'recallCheck.ts');
  assert.match(check, /const behind = places\.take\(walkId, captures, active\(\)\);\s*if \(behind\) await notify\(walkId, behind\);/, 'deliver keeps what no place takes with the app in front');
});

// A reminder waiting for a place (tend explore 24) lived only in memory: the app going behind left it there, and a phone
// that killed the app later (a force-quit, memory pressure) lost it, its "once" flag spent, where the notification list
// had kept it before (the review's F1, high). R3: "with the app in the background it is a notification". The same on the
// web when the page goes hidden and the browser discards it (F3).
test('tend explore audit 28: a reminder waiting when the app goes behind becomes a notification, and is not kept as well', () => {
  const places = createRecallPlaces();
  const bar: string[][] = [];
  places.take('w1', [said('a')], true);
  // Behind: what waits, to notify; nothing waits after.
  assert.deepEqual(places.drain('w1'), { walkId: 'w1', captures: [said('a')] });
  assert.equal(places.drain('w1'), null, 'once');
  places.listen((c) => bar.push(ids(c)), () => true);
  assert.equal(places.offer(true, 'w1'), false, 'not kept as well');
  assert.deepEqual(bar, []);
  // A fire behind after it notifies both: one notification a walk, so none replaces another.
  assert.deepEqual(ids(createRecallPlaces().take('w1', [said('x')], false)), ['x']);
  const p2 = createRecallPlaces();
  p2.take('w1', [said('a')], true);
  p2.drain('w1');
  assert.deepEqual(ids(p2.take('w1', [said('b')], false)), ['a', 'b']);
  // A fire behind before it (iOS's 'inactive'), then the app goes behind with one waiting: both again.
  const p3 = createRecallPlaces();
  p3.take('w1', [said('c')], true);
  assert.deepEqual(ids(p3.take('w1', [said('d')], false)), ['d']);
  assert.deepEqual(ids(p3.drain('w1')?.captures ?? null), ['d', 'c']);
  // In front again, the next notification starts afresh.
  p3.front();
  assert.deepEqual(ids(p3.take('w1', [said('e')], false)), ['e']);
  // Nothing waits, or its walk ended: nothing to notify.
  assert.equal(createRecallPlaces().drain('w1'), null);
  const p4 = createRecallPlaces();
  p4.take('w1', [said('f')], true);
  assert.equal(p4.drain(null), null);
  assert.equal(p4.drain('w1'), null, 'dropped with its walk');

  // The wiring: 'background' (not iOS's passing 'inactive') notifies what waits; 'active' starts afresh.
  const check = read('discovery', 'recallCheck.ts');
  assert.match(check, /const held = places\.drain\(w\?\.id \?\? null, hiddenNow\(\)\);\s*if \(held\) return notify\(held\.walkId, held\.captures\);/, 'what waits becomes a notification');
  assert.match(check, /if \(s === 'active'\) \{\s*places\.front\(\);\s*offerHeld\(\);\s*\} else if \(s === 'background'\) notifyHeld\(\);/, 'as the app goes behind');
});

// A reminder waiting over a replay brought back a moment deleted from that replay meanwhile, waiting in Undo or gone
// (the review's F2, medium): "A reminder never brings back a moment waiting in Undo" (lib/deletion, ui-conformance audit 7).
test('tend explore audit 29: a reminder waiting while its moment goes into Undo leaves it out when a place comes to the front', () => {
  const places = createRecallPlaces();
  const bar: string[][] = [];
  places.take('w1', [said('a'), said('b')], true);
  places.listen((c) => bar.push(ids(c)), () => true);
  assert.equal(places.offer(true, 'w1', new Set(['a'])), true);
  assert.deepEqual(bar, [['b']]);
  // Every one of it gone: dropped, not shown empty, and not kept.
  const p2 = createRecallPlaces();
  const got: string[][] = [];
  p2.take('w1', [said('a')], true);
  p2.listen((c) => got.push(ids(c)), () => true);
  assert.equal(p2.offer(true, 'w1', new Set(['a'])), false);
  assert.equal(p2.offer(true, 'w1'), false, 'dropped');
  assert.deepEqual(got, []);
  // Nor in the notification it becomes as the app goes behind.
  const p3 = createRecallPlaces();
  p3.take('w1', [said('a'), said('b')], true);
  assert.deepEqual(ids(p3.drain('w1', new Set(['b']))?.captures ?? null), ['a']);
  // The wiring: what waits is offered with the moments in Undo now.
  const check = read('discovery', 'recallCheck.ts');
  assert.match(check, /places\.offer\(active\(\), w\?\.id \?\? null, hiddenNow\(\)\)/, 'offered with the hidden set');
});

// `places.fire` had no caller left after tend explore 24, and the tests still held it to "with none in front the caller
// notifies", which the app no longer did with the app in front (the review's F4). It is gone; `take` is held instead.
test('tend explore audit 31: with none in front and the app behind, take refuses it to the caller; fire is gone', () => {
  const places = createRecallPlaces();
  const walk: string[][] = [];
  places.listen((c) => walk.push(ids(c)), () => true);
  // In front, but the app behind: a notification, and the place never takes it.
  assert.deepEqual(ids(places.take('w1', [said('a')], false)), ['a']);
  assert.deepEqual(walk, []);
  assert.equal(places.offer(true, 'w1'), false, 'nothing kept');
  assert.equal('fire' in places, false);
  assert.doesNotMatch(read('discovery', 'recallCheck.ts'), /places\.fire\(/);
});

// The walk screen said whether it was in front from a ref copied in an effect: a frame behind the navigator as it
// came up or went (the review's F4). It reads the navigator at fire time.
test('tend explore audit 26: the walk screen says it is in front by asking the navigator when a fire comes', () => {
  const walk = readFileSync(join(lib, '..', 'app', 'walk.tsx'), 'utf8');
  assert.doesNotMatch(walk, /focusedRef/, 'no copy of the focus a frame behind');
  assert.match(walk, /const routeNav = useRouteNavigation\(\);/, 'the screen\'s own navigation');
  assert.match(walk, /\(\) => routeNav\.isFocused\(\),?\s*\)/, 'asked at fire time');
});

// Seen, then the phone locked: the walk's location task keeps JS running, and the half-minute ran out in a pocket with no
// notification (the review's F5). The app behind is out of sight; what was left comes back on return.
test('tend explore audit 27: a reminder seen a second before the app went behind is still there on return, with what was left', () => {
  const ms = 30_000;
  assert.equal(barInSight({ folded: false, covered: false, keyboard: false, active: false }), false);
  assert.equal(barInSight({ folded: false, covered: false, keyboard: false, active: true }), true);
  const seen = reminderSight({ sight: UNSEEN, inSight: true, now: 0, showMs: ms }).sight;
  // Locked a second later: the clock stops at 1 s shown.
  const behind = reminderSight({ sight: seen, inSight: false, now: 1_000, showMs: ms });
  assert.deepEqual(behind, { sight: { shownMs: 1_000, since: null }, goesInMs: null });
  // Ten minutes on, back in front: 29 s left.
  const back = reminderSight({ sight: behind.sight, inSight: true, now: 601_000, showMs: ms });
  assert.deepEqual(back, { sight: { shownMs: 1_000, since: 601_000 }, goesInMs: 29_000 });
  assert.equal(reminderSight({ sight: back.sight, inSight: true, now: 611_000, showMs: ms }).goesInMs, 19_000);
  // The wiring: the bar reads whether the app is in front.
  const bar = read('..', 'components', 'RecordingBar.tsx');
  assert.match(bar, /barInSight\(\{ folded, covered, keyboard(: [^,]+)?, active \}\)/, 'the bar\'s sight counts the app in front');
  assert.match(bar, /AppState\.addEventListener\('change', \(s\) => setActive\(s === 'active'\)\)/, 'and follows it');
});

// With Explore's search typing (a walk minimized), the keyboard covers the foot of the screen where the bar sits, and
// nothing folds the tabs there: the bar counted itself in sight and its half-minute ran under the keys (the review's F2).
test('tend explore audit 24: with the keyboard up, a reminder the bar holds waits until the keys go down', () => {
  assert.equal(barInSight({ folded: false, covered: false, keyboard: true, active: true }), false);
  assert.equal(barInSight({ folded: true, covered: false, keyboard: false, active: true }), false);
  assert.equal(barInSight({ folded: false, covered: true, keyboard: false, active: true }), false);
  const bar = read('..', 'components', 'RecordingBar.tsx');
  assert.match(bar, /const keyboard = useKeyboardHeight\(\) > 0;/, 'the bar reads the keyboard (visualViewport on the web)');
  assert.match(bar, /const inSight = barInSight\(\{ folded, covered, keyboard, active \}\);/);
});
