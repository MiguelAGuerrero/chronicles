// @tree-wide: the weekly full pass's runner (scripts/e2e-all.js), the full flow's list it reads, and the run log's e2e line
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// Every journey once (decision 0181): the full flow holds 15 of the journeys and the rest run only by name, so a pass
// reads each run's `ok` and `not ok` lines by journey, reruns a failing journey alone, and says red or flaky.

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
type Run = { ok: string[]; notOk: string[]; stopped: string | null };
type Entry = { journey: string; check: string; text: string; why: string };
type Flaky = Record<string, { check: string; fails: string; base: string; seen: string }[]>;
const all = load(join(ROOT, 'scripts', 'e2e-all.js')) as {
  STOPPED: string;
  checkKey(text: string): string;
  checkId(text: string): string;
  parseRun(r: { journey: string; stdout?: string; status?: number; stderr?: string }): Record<string, Run>;
  plan(p: { all: string[]; fullJourneys: string[]; only: string[] | null }): { full: boolean; byName: string[]; unknown: string[] };
  unreached(fullRun: Record<string, Run>, fullJourneys: string[]): string[];
  classify(first: Record<string, Run>, rerun: Record<string, Run>): { red: Entry[]; flaky: Entry[] };
  knownFlake(registry: Flaky, journey: string, text: string): Flaky[string][number] | null;
  summarize(s: {
    base: string; full: boolean; journeys: string[]; first: Record<string, Run>; rerun: Record<string, Run>; registry?: Flaky; minutes: number; dirty?: boolean;
  }): { lines: string[]; given: Record<string, unknown>; red: Entry[]; flaky: Entry[] };
};
const fullFlow = load(join(ROOT, 'scripts', 'e2e', 'journeys', 'full.js')) as { journeys: string[] };
const { SCENARIOS } = load(join(ROOT, 'scripts', 'e2e-scenarios.js')) as { SCENARIOS: { name: string }[] };
const tend = load(join(ROOT, 'scripts', 'tend.js')) as { logProblems(given: unknown): string[] };

const AT9 = 'AT9: opening an area\'s card frames it with its 800 m ring (1 points for 1 tiles, Fox Point at (0.0, 0.5) px from the middle)';
const FULL = [
  'e2e: serving dist on :8081',
  '# journey: launch',
  'ok - NV1: the old /explore path lands on Explore (/explore)',
  'ok - NV2: each tab at its path',
  '# journey: atlas',
  'ok - AT1: the atlas grid (12 tiles)',
  `not ok - ${AT9}`,
  'not ok - AT14: a check written first # TODO',
  '# journey: walk',
  'not ok - W3: the hint shows (none)',
  '# journey: full',
  'ok - nothing is sent anywhere but the map tiles (D10: )',
  'ok - no console errors ',
].join('\n');

test('e2e all 1: a check is compared without its measured values, and named by its id', () => {
  assert.equal(all.checkKey(AT9), "AT9: opening an area's card frames it with its 800 m ring", 'the last group goes, nested parentheses and all');
  assert.equal(all.checkKey('a selected star settles into its ring (M9)'), 'a selected star settles into its ring');
  assert.equal(all.checkKey('no console errors '), 'no console errors');
  assert.equal(all.checkKey('(only values)'), '(only values)', 'a check that is only a group keeps it');
  assert.equal(all.checkKey('QL3: a check (with) words after'), 'QL3: a check (with) words after', 'a group mid-sentence stays');
  assert.equal(all.checkId(AT9), 'AT9');
  assert.equal(all.checkId('fix preview-clutter audit 1: the trace was drawn before the preview ( -> )'), 'fix preview-clutter audit 1');
  assert.equal(all.checkId('a selected star settles into its ring (M9)'), 'a selected star settles into its ring');
});

test('e2e all 2: the full flow\'s lines go to the journey its marker names; TODO checks and other lines are not counted', () => {
  const r = all.parseRun({ journey: 'full', stdout: FULL, status: 0 });
  assert.deepEqual(Object.keys(r).sort(), ['atlas', 'full', 'launch', 'walk']);
  assert.equal(r.launch.ok.length, 2);
  assert.deepEqual(r.atlas, { ok: ['AT1: the atlas grid (12 tiles)'], notOk: [AT9], stopped: null });
  assert.equal(r.full.ok.length, 2, 'the flow\'s closing checks are its own');
  const alone = all.parseRun({ journey: 'atlas', stdout: FULL.replace(/^# journey: .*$/gm, ''), status: 0 });
  assert.deepEqual(Object.keys(alone), ['atlas'], 'a by-name run is all its journey\'s');
  assert.equal(alone.atlas.ok.length, 5);
  const stopped = all.parseRun({ journey: 'full', stdout: '# journey: launch\nok - NV1: x\n# journey: walk\nok - W1: y', status: 1, stderr: 'warn\nTimeout 30000ms exceeded waiting for atlas-card\n' });
  assert.equal(stopped.walk.stopped, 'Timeout 30000ms exceeded waiting for atlas-card', 'a run that exits non-zero stopped in the journey it was in');
  assert.equal(stopped.launch.stopped, null);
  assert.deepEqual(all.unreached(stopped, ['launch', 'walk', 'chronicle', 'atlas']), ['atlas', 'chronicle'], 'what the flow never reached runs alone');
  assert.deepEqual(all.parseRun({ journey: 'qol', stdout: '', status: 0 }), { qol: { ok: [], notOk: [], stopped: null } }, 'a silent run is still a run');
});

test('e2e all 3: the pass runs the full flow and every journey it does not hold, from where the harness defines them', () => {
  const names = SCENARIOS.map((s) => s.name).sort();
  assert.ok(fullFlow.journeys.length >= 10 && fullFlow.journeys.every((j) => names.includes(j)), 'the full flow\'s list names journeys that exist');
  const p = all.plan({ all: names, fullJourneys: fullFlow.journeys, only: null });
  assert.equal(p.full, true);
  assert.deepEqual([...p.byName, ...fullFlow.journeys].sort(), names, 'every journey once, none twice');
  assert.deepEqual(all.plan({ all: names, fullJourneys: fullFlow.journeys, only: ['launch', 'atlas'] }), { full: false, byName: ['atlas', 'launch'], unknown: [] });
  assert.deepEqual(all.plan({ all: names, fullJourneys: fullFlow.journeys, only: ['full', 'launch', 'qol'] }), { full: true, byName: ['qol'], unknown: [] }, 'with the full flow, launch is read from it');
  assert.deepEqual(all.plan({ all: names, fullJourneys: fullFlow.journeys, only: ['nope'] }).unknown, ['nope']);
});

const run = (ok: string[], notOk: string[] = [], stopped: string | null = null): Run => ({ ok, notOk, stopped });

test('e2e all 4: red fails twice with the same check, flaky passes in the other run, and unreached stays red', () => {
  const first = {
    atlas: run(['AT1: grid (12)'], [AT9]),
    scenic: run([], ['fix preview-clutter audit 1: drawn again (a -> b)', 'SR2: the notice (none)']),
    walk: run(['W1: x'], [], 'Timeout waiting for walk-bar'),
    launch: run(['NV1: x']),
    qol: run(['QL1: a (1)'], ['QL2: b (2)']),
  };
  const rerun = {
    atlas: run(['AT1: grid (12)'], [AT9.replace('(0.0, 0.5)', '(0.0, 2.5)')]),
    scenic: run(['SR2: the notice (shown)'], ['fix preview-clutter audit 1: drawn again (c -> d)']),
    walk: run(['W1: x', 'W2: y']),
    qol: run([], ['QL1: a (0)']),
  };
  const { red, flaky } = all.classify(first, rerun);
  assert.deepEqual(red.map((e) => [e.journey, e.check, e.why]), [
    ['atlas', 'AT9', 'failed in the pass and alone'],
    ['qol', 'QL2', 'failed in the pass, not reached alone'],
    ['scenic', 'fix preview-clutter audit 1', 'failed in the pass and alone'],
  ]);
  assert.match(red[0].text, /\(0\.0, 2\.5\)/, 'the text is the rerun\'s, the latest seen');
  assert.deepEqual(flaky.map((e) => [e.journey, e.check, e.why]), [
    ['qol', 'QL1', 'passed in the pass, failed alone'],
    ['scenic', 'SR2', 'failed in the pass, passed alone'],
    ['walk', 'the run stopped', 'failed in the pass, passed alone'],
  ]);
  assert.equal(all.classify({ drive: run([], [], 'Timeout') }, { drive: run([], [], 'Timeout again') }).red[0].check, all.STOPPED, 'stopped twice is red');
  assert.equal(all.classify({ edit: run([], ['ME1: x']) }, {}).red[0].why, 'failed in the pass, not run alone');
});

test('e2e all 5: the summary is in a fixed order, matches flaky.json without values, and prints the run log line', () => {
  const first = { launch: run(['NV1: a', 'NV2: b']), atlas: run(['AT1: grid (12)'], [AT9]), full: run(['no console errors '], []) };
  const rerun = { atlas: run([], [AT9]) };
  const registry: Flaky = { atlas: [{ check: AT9.replace('(0.0, 0.5)', '(9, 9)'), fails: '2/3', base: '2e47bf94', seen: '2026-11-12' }] };
  const s = all.summarize({ base: 'acb18b06', full: true, journeys: ['atlas', 'launch'], first, rerun, registry, minutes: 99 });
  assert.deepEqual(s.lines.slice(0, 4), [
    'e2e:all on acb18b06: every journey; 2 journeys, 4 checks ok, 1 not ok in the pass; 1 red, 0 flaky; 99 min',
    '  atlas   1 ok, 1 not ok; alone again: 0 ok, 1 not ok',
    '  full    1 ok, 0 not ok',
    '  launch  2 ok, 0 not ok',
  ]);
  assert.equal(s.lines[4], 'red   atlas: AT9 (failed in the pass and alone) [flaky.json: failed 2/3 on 2e47bf94, 2026-11-12]');
  assert.deepEqual(s.given, { mode: 'e2e', e2e: 'full', deploy: 'main', base: 'acb18b06', journeys: 2, ok: 4, red: [{ journey: 'atlas', check: 'AT9' }], flaky: [], minutes: 99 });
  const log = s.lines[s.lines.length - 1];
  assert.match(log, /^log: npm run tend:log -- origin\/main\.\.HEAD '/);
  const quoted = all.summarize({ base: 'acb18b06', full: true, journeys: ['walk'], first: { walk: run([], ["the walk's card shows (none)"]) }, rerun: { walk: run([], ["the walk's card shows (none)"]) }, minutes: 5 });
  assert.ok(quoted.lines[quoted.lines.length - 1].endsWith(`"check":"the walk'\\''s card shows"}],"flaky":[],"minutes":5}'`), 'a quote in a check\'s id is escaped for the shell');
  assert.deepEqual(tend.logProblems(s.given), [], 'the line it prints is one tend:log takes');
  const some = all.summarize({ base: 'acb18b06', full: false, journeys: ['launch'], first: { launch: run(['NV1: a']) }, rerun: {}, minutes: 3, dirty: true });
  assert.deepEqual(some.given.e2e, ['launch'], 'a filtered pass names its journeys, never "full"');
  assert.match(some.lines[0], /^e2e:all on acb18b06 with uncommitted changes: launch; 1 journeys/);
  assert.deepEqual(tend.logProblems(some.given), []);
  assert.deepEqual(all.summarize({ base: 'acb18b06', full: true, journeys: ['atlas', 'launch'], first, rerun, registry, minutes: 99 }), s, 'the same runs, the same summary');
});

test('e2e all (decision 0226): the known-red list keeps journeys the pass did not run and replaces those it did', () => {
  const all = load(join(ROOT, 'scripts', 'e2e-all.js')) as {
    redRegistry(prev: Record<string, unknown[]>, red: { journey: string; check: string }[], run: string[], base: string, seen: string): Record<string, { check: string }[]>;
  };
  const next = all.redRegistry({ atlas: [{ check: 'AT9' }], upgrade: [{ check: 'old' }] }, [{ journey: 'upgrade', check: 'MT9' }], ['upgrade', 'walk'], 'b1', '2026-11-18');
  assert.deepEqual(next, { atlas: [{ check: 'AT9' }], upgrade: [{ check: 'MT9', base: 'b1', seen: '2026-11-18' }] });
  assert.deepEqual(all.redRegistry({ walk: [{ check: 'gone' }] }, [], ['walk'], 'b1', 'd'), {}, 'a journey green now leaves the list');
});
