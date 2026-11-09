import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { exposureWords, gradeRuns, stripLabel, strip } from '../../walkPlanner/exposure';
import { planRoutes } from '../../walkPlanner/planner';
import { alsoLine, DENSITY_LABEL, MODE_LABEL, PRESET_NAMES, closeLabel, differentLabel, lessGroundLine, readingLine, reasonLine, rowWords, settingsHeading, startLabel, title, CEILING_HEADING, CEILING_NOTE, MODE_HEADING, densityHeading } from '../../walkPlanner/words';
import { ATLAS_ORDER } from '../../atlas/atlas';
import { cases, leg } from './grid';

const REASONS = ['noPosition', 'far', 'few', 'noRoute', 'outOfReach', 'little', 'same', 'nothingDifferent', 'cars', 'noLoop'] as const;
const BANNED = /\b(minutes?|mins?|hours?|hrs?|ETA|pace|brisk|quick(er|est)?|fast(er|est)?|shorter|longer|more|most|best|densest|finest|top|less|than|same)\b/i;

function everySentence(): string[] {
  const out: string[] = [...Object.values(PRESET_NAMES), ...Object.values(MODE_LABEL), ...Object.values(DENSITY_LABEL), ...REASONS.map(reasonLine),
    startLabel, differentLabel, closeLabel, settingsHeading, readingLine, lessGroundLine, CEILING_HEADING, CEILING_NOTE, MODE_HEADING, ...ATLAS_ORDER.map(title), ...ATLAS_ORDER.map(densityHeading)];
  for (const k of ATLAS_ORDER) for (const level of ['some', 'plenty'] as const) out.push(alsoLine([{ kind: k, level }])!);
  for (const c of cases(20)) {
    for (const mode of ['loop', 'oneway'] as const) {
      for (const units of ['km', 'mi'] as const) {
        for (const r of planRoutes({ cells: c.cells, from: c.from, mode, ceilingM: 3500, density: 'anywhere' }, leg).routes) {
          const w = rowWords(r, units);
          out.push(w.title, w.distance, w.passes, ...(w.getting ? [w.getting] : []), stripLabel(strip(r.runs), 'Green'));
        }
      }
    }
  }
  return out;
}

test('WP7: No name or line says a time, a pace, a comparison or a superlative', () => {
  for (const s of everySentence()) assert.ok(!BANNED.test(s), `"${s}" is a time, a pace or a comparison`);
  for (const f of ['words.ts', 'exposure.ts', 'presets.ts']) {
    const src = readFileSync(new URL(`../../walkPlanner/${f}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const quoted = (src.match(/'[^'\n]{6,}'/g) ?? []).join(' ');
    assert.ok(!BANNED.test(quoted), `${f} has a banned word in a sentence`);
  }
});

test('WP14: A row gives its own distance, what it passes and how much is getting there, and no digit but the distance', () => {
  let rows = 0, withGetting = 0;
  for (const c of cases()) {
    for (const r of planRoutes({ cells: c.cells, from: c.from, mode: 'oneway', ceilingM: 3500, density: 'anywhere' }, leg).routes) {
      const w = rowWords(r, 'km');
      rows += 1;
      assert.match(w.distance, /^About \d+(\.\d)? (km|m)\b/);
      assert.ok(!/\d/.test(w.passes) && !/\d/.test(w.title), 'no digit in what it passes');
      if (w.getting) {
        withGetting += 1;
        assert.ok(!/\d/.test(w.getting), 'the getting-there share is in words');
      }
      assert.match(w.passes, /^(Plenty|Some|Little)/);
    }
  }
  assert.ok(rows > 30 && withGetting > 0, `${rows} rows, ${withGetting} with a way there`);
  assert.equal(exposureWords([{ fromM: 0, toM: 1000, grade: 3 }], 300, 1000).getting, 'Part of the way is getting there');
});

test('WP14: The words for where the kind is along a route', () => {
  const near = exposureWords([{ fromM: 0, toM: 1000, grade: 3 }, { fromM: 1000, toM: 3000, grade: 0 }], 0, 3000);
  assert.equal(near.line, 'Some mostly near the start');
  assert.match(exposureWords([{ fromM: 0, toM: 2000, grade: 3 }], 0, 2000).line, /^Plenty/);
  assert.match(exposureWords([{ fromM: 0, toM: 3000, grade: 0 }], 0, 3000).line, /^Little/);
  const end = exposureWords([{ fromM: 0, toM: 2000, grade: 0 }, { fromM: 2000, toM: 3000, grade: 3 }], 0, 3000).line;
  assert.match(end, /near the end/);
  assert.equal(exposureWords([{ fromM: 0, toM: 1000, grade: 2 }], 600, 1000).getting, 'Much of the way is getting there');
  assert.equal(exposureWords([{ fromM: 0, toM: 1000, grade: 2 }], 0, 1000).getting, null);
});

test('WP15: The strip is three flat grades in order along the route, with a text equivalent and no number', () => {
  const runs = gradeRuns([[0, 0], [0.01, 0]], []);
  assert.deepEqual(strip(runs, 6), [0, 0, 0, 0, 0, 0]);
  const g = strip([{ fromM: 0, toM: 1000, grade: 0 }, { fromM: 1000, toM: 2000, grade: 3 }, { fromM: 2000, toM: 3000, grade: 1 }], 6);
  assert.deepEqual(g, [0, 0, 3, 3, 1, 1]);
  const label = stripLabel(g);
  assert.equal(label, 'The kind along this route: none at the start, plenty in the middle, a little near the end');
  assert.ok(!/\d/.test(label));
});

test('WP10: A route well short of the distance is said to be so because there is only a little of the kind', () => {
  assert.equal(lessGroundLine, 'There is only a little of it here.');
  assert.ok(!BANNED.test(lessGroundLine));
});
