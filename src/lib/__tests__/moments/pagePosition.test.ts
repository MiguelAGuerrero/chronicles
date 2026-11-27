/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { LngLat } from '../../types';

// fix outing-current-position (decision 0273, the owner's answers of Nov 27): Plan an outing and the walk planner read one
// fresh fix of their own as they open (OJ10, QC30, WP3), never the one Explore held from its launch; refused, they say so and
// propose nothing; a fix up to thirty minutes old stands in only when no fresh one came in time, and is said.
const SRC = join(__dirname, '..', '..', '..');
const mod = () => import('../../locate/pagePosition');
const FOX: LngLat = [-71.39, 41.82];
const CRANSTON: LngLat = [-71.44, 41.78];
const NOW = 1_800_000_000_000;
const MIN = 60_000;

test('fix outing-current-position 1: OJ10, WP3: the page plans from the fix it read as it opened, never the one held before', async () => {
  const { pagePosition, positionAt } = await mod();
  // Explore's launch fix at Fox Point, a minute old; the page's own read finds Cranston, 4 km off.
  const p = pagePosition({ at: CRANSTON }, { at: FOX, t: NOW - MIN }, NOW);
  assert.deepEqual(p, { state: 'here', at: CRANSTON, t: NOW });
  assert.deepEqual(positionAt(p), CRANSTON);
  // While the read is under way the page has no position at all, and so proposes nothing.
  assert.deepEqual(pagePosition(null, { at: FOX, t: NOW - MIN }, NOW), { state: 'finding' });
  assert.equal(positionAt({ state: 'finding' }), null);
});

test('fix outing-current-position 2: OJ10, QC30, WP3: refused, the page has no position, whatever fix is held, and says location is off', async () => {
  const { pagePosition, positionAt, positionLine } = await mod();
  const { LOCATION_OFF } = await import('../../locate/notice');
  const p = pagePosition({ at: null, reason: 'denied' }, { at: FOX, t: NOW - MIN }, NOW);
  assert.deepEqual(p, { state: 'none', refused: true });
  assert.equal(positionAt(p), null);
  assert.equal(positionLine(p, 'web'), LOCATION_OFF.web);
  assert.equal(positionLine(p, 'native'), LOCATION_OFF.native);
  // No fix and none held (a reload): no position, and nothing claims location is off.
  const none = pagePosition({ at: null, reason: 'timeout' }, null, NOW);
  assert.deepEqual(none, { state: 'none', refused: false });
  assert.equal(positionLine(none, 'web'), null);
});

test('fix outing-current-position 3: no fresh fix in time, one up to thirty minutes old is used and said; an older one never', async () => {
  const { pagePosition, positionAt, positionLine } = await mod();
  for (const reason of ['timeout', 'unavailable'] as const) {
    const p = pagePosition({ at: null, reason }, { at: FOX, t: NOW - 20 * MIN }, NOW);
    assert.deepEqual(p, { state: 'earlier', at: FOX, t: NOW - 20 * MIN, agoMs: 20 * MIN });
    assert.deepEqual(positionAt(p), FOX);
    // The owner's example, its count in words as every count is (VISION.md, "Counts are words"; the outing's QC28: no digit).
    assert.equal(positionLine(p, 'web'), 'From where you were twenty minutes ago.');
  }
  assert.equal(pagePosition({ at: null, reason: 'timeout' }, { at: FOX, t: NOW - 30 * MIN }, NOW).state, 'earlier');
  assert.deepEqual(pagePosition({ at: null, reason: 'timeout' }, { at: FOX, t: NOW - 30 * MIN - 1 }, NOW), { state: 'none', refused: false });
  // A fix stamped after now (a clock set back) is not known to be recent.
  assert.deepEqual(pagePosition({ at: null, reason: 'timeout' }, { at: FOX, t: NOW + MIN }, NOW), { state: 'none', refused: false });
});

test('fix outing-current-position 4: the line of an earlier fix says how long ago in words, and the wait says it is finding you', async () => {
  const { positionLine, FINDING_LINE } = await mod();
  const said = (agoMs: number) => positionLine({ state: 'earlier', at: FOX, t: NOW - agoMs, agoMs }, 'web');
  assert.equal(said(15_000), 'From where you were a moment ago.');
  assert.equal(said(MIN + 10_000), 'From where you were a minute ago.');
  assert.equal(said(2 * MIN), 'From where you were two minutes ago.');
  assert.equal(said(30 * MIN), 'From where you were thirty minutes ago.');
  for (let m = 0; m <= 30; m++) assert.doesNotMatch(said(m * MIN)!, /\d/);
  assert.equal(positionLine({ state: 'finding' }, 'web'), FINDING_LINE);
  assert.equal(FINDING_LINE, 'Finding you…', "Explore's own words while Find me reads a fix");
  assert.equal(positionLine({ state: 'here', at: CRANSTON, t: NOW }, 'web'), null);
});

test('fix outing-current-position 5: Explore hands the outing page and the planner no position; each reads its own as it opens', () => {
  const explore = readFileSync(join(SRC, 'app', '(tabs)', 'explore.tsx'), 'utf8');
  for (const el of ['OutingPage', 'PlannerDrawer']) {
    const at = explore.indexOf(`<${el}`);
    assert.ok(at > 0, el);
    const tag = explore.slice(at, explore.indexOf('/>', explore.indexOf('onClose=', at)));
    assert.doesNotMatch(tag, /\b(you|lastFixAt|fixNow)=|getLastFix/, `${el} is given a position by Explore`);
  }
  for (const f of [join('components', 'outing', 'OutingPage.tsx'), join('components', 'planner', 'PlannerDrawer.tsx')]) {
    const src = readFileSync(join(SRC, f), 'utf8');
    assert.match(src, /usePagePosition\(\)/, `${f} reads its own position`);
    assert.doesNotMatch(src, /getLastFix|props\.(you|fixNow|lastFixAt)\b/, `${f} plans or starts from a position it did not read`);
  }
});

test('fix outing-current-position audit 1: Start reads again when the page fix has aged past thirty minutes or a walk records; the line ages too', { todo: 'test first' }, async () => {
  const { aged, startFrom } = await mod();
  const here = { state: 'here' as const, at: CRANSTON, t: NOW };
  assert.equal(startFrom(here, NOW + 5 * MIN, false), 'use');
  assert.equal(startFrom(here, NOW + 30 * MIN, false), 'use');
  assert.equal(startFrom(here, NOW + 30 * MIN + 1, false), 'read', 'an aged fix is never routed from');
  assert.equal(startFrom(here, NOW + MIN, true), 'read', 'a walk recording has moved since the page opened (WP24)');
  assert.equal(startFrom({ state: 'earlier', at: FOX, t: NOW - 29 * MIN, agoMs: 29 * MIN }, NOW + 5 * MIN, false), 'read');
  assert.equal(startFrom({ state: 'none', refused: false }, NOW, false), 'read');
  assert.equal(startFrom({ state: 'finding' }, NOW, false), 'read');
  // Left open, the earlier fix's line counts on, and past thirty minutes it is no position.
  const e = { state: 'earlier' as const, at: FOX, t: NOW - 20 * MIN, agoMs: 20 * MIN };
  assert.deepEqual(aged(e, NOW + 5 * MIN), { ...e, agoMs: 25 * MIN });
  assert.deepEqual(aged(e, NOW + 10 * MIN + 1), { state: 'none', refused: false });
  assert.deepEqual(aged(here, NOW + 31 * MIN), { state: 'none', refused: false });
  assert.equal(aged(here, NOW + 5 * MIN), here, 'unchanged, the same object: nothing re-renders');
});

test('fix outing-current-position audit 3: a fix read again where the page already is keeps its position; one far off replaces it', { todo: 'test first' }, async () => {
  const { settle, PAGE_MOVE_M } = await mod();
  const was = { state: 'here' as const, at: CRANSTON, t: NOW };
  const near: LngLat = [CRANSTON[0] + 0.0003, CRANSTON[1]];
  const s = settle(was, { state: 'here', at: near, t: NOW + MIN });
  assert.equal(s.state === 'here' && s.at, CRANSTON, 'the same place: the plan is not read again');
  assert.equal(s.state === 'here' && s.t, NOW + MIN, 'but its time is the new read');
  assert.deepEqual(settle(was, { state: 'here', at: FOX, t: NOW + MIN }), { state: 'here', at: FOX, t: NOW + MIN });
  assert.deepEqual(settle(was, { state: 'none', refused: true }), { state: 'none', refused: true });
  assert.ok(PAGE_MOVE_M >= 50 && PAGE_MOVE_M <= 250);
});

test('fix outing-current-position audit 4: with a walk recording, the stand-in is the newer of its last walked fix and the fix held', { todo: 'test first' }, async () => {
  const { newerFix, pagePosition } = await mod();
  const walked = { at: CRANSTON, t: NOW - 2 * MIN };
  const held = { at: FOX, t: NOW - 25 * MIN };
  assert.equal(newerFix(held, walked), walked);
  assert.equal(newerFix(walked, held), walked);
  assert.equal(newerFix(null, held), held);
  assert.equal(newerFix(walked, null), walked);
  assert.equal(newerFix(null, null), null);
  assert.deepEqual(pagePosition({ at: null, reason: 'timeout' }, newerFix(held, walked), NOW), { state: 'earlier', at: CRANSTON, t: NOW - 2 * MIN, agoMs: 2 * MIN });
});

test('fix outing-current-position audit 6: the page closing ends its read: the web watch is cleared at once', { todo: 'test first' }, async () => {
  const cleared: number[] = [];
  const g = globalThis as unknown as { navigator?: unknown };
  const had = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { watchPosition: () => 7, clearWatch: (id: number) => cleared.push(id) } } });
  try {
    const { locateOnce } = await import('../../locate/index.web');
    const c = new AbortController();
    const r = locateOnce(10_000, { fresh: true, signal: c.signal });
    c.abort();
    assert.deepEqual(await r, { at: null, reason: 'unavailable' });
    assert.deepEqual(cleared, [7]);
  } finally {
    if (had) Object.defineProperty(globalThis, 'navigator', had);
    else delete g.navigator;
  }
});

test('fix outing-current-position audit 8: no fix in time and none held says the app\'s timeout words, with Try again; refused offers Open Settings on a phone', { todo: 'test first' }, async () => {
  const { pagePosition, positionLine, positionAction } = await mod();
  const { LOCATE_TIMEOUT } = await import('../../locate/notice');
  const none = pagePosition({ at: null, reason: 'timeout' }, null, NOW);
  assert.equal(positionLine(none, 'web'), LOCATE_TIMEOUT);
  assert.equal(positionAction(none, 'web'), 'retry');
  assert.equal(positionAction(none, 'native'), 'retry');
  const refused = pagePosition({ at: null, reason: 'denied' }, null, NOW);
  assert.equal(positionAction(refused, 'native'), 'settings');
  assert.equal(positionAction(refused, 'web'), null, 'a web page cannot open the browser\'s settings');
  assert.equal(positionAction({ state: 'here', at: FOX, t: NOW }, 'native'), null);
  assert.equal(positionAction({ state: 'finding' }, 'native'), null);
});

test('fix outing-current-position audit 10: the planner says location, as the outing page and the off line do', { todo: 'test first' }, async () => {
  const { reasonLine } = await import('../../walkPlanner/words');
  assert.equal(reasonLine('noPosition'), 'Needs your location to plan a walk.');
});
test('fix outing-current-position audit 12: the whole element Explore draws gives no position, and each page starts from its own hook\'s answer', { todo: 'test first' }, () => {
  const explore = readFileSync(join(SRC, 'app', '(tabs)', 'explore.tsx'), 'utf8');
  for (const el of ['OutingPage', 'PlannerDrawer']) {
    const at = explore.indexOf(`<${el}`);
    assert.ok(at > 0, el);
    // The whole element, to its own end: every prop it is given (audit 12: the slice once stopped at the first "/>").
    const tag = explore.slice(at, explore.indexOf(`</${el}>`, at) > 0 ? explore.indexOf(`</${el}>`, at) : explore.indexOf('\n        />', at));
    assert.doesNotMatch(tag, /\b(you|here|origin|from|at|position|lastFixAt|fixNow)=|getLastFix|lastFix\b/, `${el} is given a position by Explore`);
  }
  for (const f of [join('components', 'outing', 'OutingPage.tsx'), join('components', 'planner', 'PlannerDrawer.tsx')]) {
    const src = readFileSync(join(SRC, f), 'utf8');
    assert.match(src, /usePagePosition\(\)/, `${f} reads its own position`);
    assert.doesNotMatch(src, /getLastFix|lastFix'|props\.(you|fixNow|lastFixAt)\b/, `${f} plans or starts from a position it did not read`);
    // Start takes the position the page's own hook gives at that moment, never a null or a literal (audit 12).
    assert.match(src, /await (pos|page)\.startAt\(/, `${f} starts from its own fix`);
    assert.doesNotMatch(src, /\.start\(null\)/, `${f} starts from no position`);
  }
});

