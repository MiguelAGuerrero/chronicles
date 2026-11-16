/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { FIT_IDLE, fitStep, refitOnResize, type FitState } from '../../atlas/fitFlight';

// tend explore 17 (AT9, specs/explore-atlas): opening an area's card frames it with its ring, under the title. The card
// folds the tabs away as it opens, so Explore's map grows (539 to 601 px in the e2e) while the card's fit is flying, and
// maplibre (6.16) landed that flight at the bounds' own middle, the padding's offset lost: the area sat at the map's
// middle, not 30 px below it (the weekly full pass on acb18b06; since b347dcdb, whose heavier card moved the tabs' fold
// into the flight). A fit still flying when its box changes size is asked again at the new size.

const BOX = { width: 390, height: 539 };

test('tend explore 17: a fit still flying when the map grows is asked again at the new size', () => {
  assert.equal(refitOnResize(BOX, { width: 390, height: 601 }, true), true, 'the tabs folded away mid-flight');
  assert.equal(refitOnResize(BOX, { width: 320, height: 539 }, true), true, 'narrower too');
});

test('tend explore 17: a landed fit, a box the same size or a map at rest is left be', () => {
  assert.equal(refitOnResize(null, { width: 390, height: 601 }, true), false, 'no fit flying: a move of the reader\'s, or none');
  assert.equal(refitOnResize(BOX, { ...BOX }, true), false, 'the same size: nothing to correct');
  assert.equal(refitOnResize(BOX, { width: 390, height: 601 }, false), false, 'the flight has landed');
});

// tend explore audit 19 (the review of tend explore 17, F1, F2, F4): the record, the clear and the refit are one core
// step driven by the map's events. A refit restarts the fit's settle (F1: `useTabMap` redoes a fit the map left
// mid-flight, NV3/NV4); the moveend its own stop fires mid-air is skipped, never read as the map at rest (F2, DC9), and
// keeps the record; the wiring test fails with the refit's call or the clear undone (F4, decision 0181).

const ASK = { bounds: 'Fox Point', duration: 600 };
const flying = (): FitState<typeof ASK> => fitStep(FIT_IDLE, { kind: 'fit', key: 4, ask: ASK, box: BOX, moving: true }).state;

test('tend explore audit 19: a fit that moves is recorded; one that moves nothing is not', () => {
  assert.deepEqual(flying().flight, { key: 4, ask: ASK, ...BOX });
  assert.equal(fitStep(FIT_IDLE, { kind: 'fit', key: 4, ask: ASK, box: BOX, moving: false }).state.flight, null, 'duration 0, or no room');
});

test('tend explore audit 19: a resize mid-flight refits and restarts the fit\'s settle (F1)', () => {
  const r = fitStep(flying(), { kind: 'resize', box: { width: 390, height: 601 }, moving: true });
  assert.deepEqual(r.do, { kind: 'refit', ask: ASK, settle: 4 });
  assert.equal(r.state.refitting, true);
  assert.deepEqual(r.state.flight, { key: 4, ask: ASK, width: 390, height: 601 }, 'the new flight, at the new size');
  assert.deepEqual(fitStep(flying(), { kind: 'resize', box: BOX, moving: true }).do, { kind: 'none' }, 'the same size');
  assert.deepEqual(fitStep(FIT_IDLE, { kind: 'resize', box: { width: 390, height: 601 }, moving: true }).do, { kind: 'none' }, 'nothing flying');
});

test('tend explore audit 19: the moveend of the refit\'s own stop is skipped and keeps the record (F2); a landing clears it', () => {
  const mid = fitStep(flying(), { kind: 'resize', box: { width: 390, height: 601 }, moving: true }).state;
  const stopped = fitStep(mid, { kind: 'moveend' });
  assert.deepEqual(stopped.do, { kind: 'skip' }, 'not the map at rest');
  assert.equal(stopped.state.flight?.height, 601);
  const done = fitStep(stopped.state, { kind: 'refitted' }).state;
  assert.equal(done.refitting, false);
  const landed = fitStep(done, { kind: 'moveend' });
  assert.deepEqual(landed.do, { kind: 'none' });
  assert.equal(landed.state.flight, null, 'landed, or cut by the reader: nothing to refit');
});

test('tend explore audit 19: the web map drives the step: a fit records, a resize refits and restarts the settle, a moveend clears or is skipped', () => {
  const src = readFileSync(join(__dirname, '../../../components/map/WalkMap.web.tsx'), 'utf8');
  const fn = (name: string) => {
    const m = new RegExp(`const ${name} = \\(\\) => \\{([\\s\\S]*?)\\n    \\};`).exec(src);
    assert.ok(m, `the handler ${name}`);
    return m[1];
  };
  assert.match(src, /map\.on\('resize', resized\)/);
  assert.match(src, /map\.on\('moveend', landed\)/);
  const resized = fn('resized');
  assert.match(resized, /fitStep\(fit\.current, \{ kind: 'resize'/, 'a resize is a step');
  assert.match(resized, /map\.fitBounds\(r\.do\.ask\.bounds, r\.do\.ask\.options\)/, 'a refit asks the fit again');
  assert.match(resized, /settleAfter\(r\.do\.settle/, 'and restarts its settle');
  assert.match(resized, /kind: 'refitted'/, 'and ends the refit');
  assert.match(fn('landed'), /fitStep\(fit\.current, \{ kind: 'moveend' \}\)/, 'a moveend clears the record');
  assert.match(src, /map\?\.fitBounds\([^;]+\);\s*\n\s*if \(map\) fit\.current = fitStep\(fit\.current, \{ kind: 'fit'/, 'each fit is a step, after its call');
  // DC9, northAsked, the names and the view: the settle listeners skip a moveend fired inside a refit.
  for (const listener of [/perfMark\('mark:settled'\)/, /northAsked\.current = false/]) {
    const at = src.search(listener);
    assert.ok(at > 0 && /if \(fit\.current\.refitting\) return;/.test(src.slice(Math.max(0, at - 160), at)), `skipped while refitting: ${listener}`);
  }
});
