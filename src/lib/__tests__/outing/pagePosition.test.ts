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

test('fix outing-current-position 1: OJ10, WP3: the page plans from the fix it read as it opened, never the one held before', { todo: 'test first' }, async () => {
  const { pagePosition, positionAt } = await mod();
  // Explore's launch fix at Fox Point, a minute old; the page's own read finds Cranston, 4 km off.
  const p = pagePosition({ at: CRANSTON }, { at: FOX, t: NOW - MIN }, NOW);
  assert.deepEqual(p, { state: 'here', at: CRANSTON, t: NOW });
  assert.deepEqual(positionAt(p), CRANSTON);
  // While the read is under way the page has no position at all, and so proposes nothing.
  assert.deepEqual(pagePosition(null, { at: FOX, t: NOW - MIN }, NOW), { state: 'finding' });
  assert.equal(positionAt({ state: 'finding' }), null);
});

test('fix outing-current-position 2: OJ10, QC30, WP3: refused, the page has no position, whatever fix is held, and says location is off', { todo: 'test first' }, async () => {
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

test('fix outing-current-position 3: no fresh fix in time, one up to thirty minutes old is used and said; an older one never', { todo: 'test first' }, async () => {
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

test('fix outing-current-position 4: the line of an earlier fix says how long ago in words, and the wait says it is finding you', { todo: 'test first' }, async () => {
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

test('fix outing-current-position 5: Explore hands the outing page and the planner no position; each reads its own as it opens', { todo: 'test first' }, () => {
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
