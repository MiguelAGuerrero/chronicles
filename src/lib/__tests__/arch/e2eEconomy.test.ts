// @tree-wide: the e2e runner's economy (scripts/e2e/economy.js, e2e-web.js, e2e-baseline.js, affected.js's plan) and the procedures that name it
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// What holds a session to the owner's e2e rule (decision 0074): run the journeys check:affected names, once, and no more.
// Written after the explore-carousel slice ran about seventy journey runs for a change that needed a third of them.

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

type Keys = { covers: string; strict: string; build: string | null };
type Greens = Record<string, { strict: string; covers: string; at: string }>;
type Flaky = Record<string, { check: string; fails: string; base: string; seen: string }[]>;
const economy = load(join(ROOT, 'scripts', 'e2e', 'economy.js')) as {
  isCommentOnly(a: string | null, b: string | null, file: string): boolean;
  meaningfulPaths(paths: string[], readOld: (p: string) => string | null, readNew: (p: string) => string | null): string[];
  keys(root: string, journey: { name: string; covers: string[] }, o: { files?: (root: string) => string[]; read?: (p: string) => string | null; build?: string | null; env?: Record<string, string> }): Keys;
  isGreen(g: Greens, name: string, k: Keys): boolean;
  isGreenSince(g: Greens, name: string, k: Keys): boolean;
  markGreen(g: Greens, name: string, k: Keys, now: number): Greens;
  flakeFor(r: Flaky, journey: string, message: string): Flaky[string][number] | null;
  addFlake(r: Flaky, journey: string, e: Flaky[string][number]): Flaky;
  parseFailures(out: string): string[];
  summarizeBaseline(runs: string[]): { runs: number; failed: { check: string; fails: string; always: boolean }[] };
};

test('e2e economy 1: a change to comments or types is not a change to what the app does', () => {
  const was = "export function a(x: number) {\n  return x + 1; // add one\n}\n";
  assert.equal(economy.isCommentOnly(was, "export function a(x: number) {\n  // one more\n  return x + 1;\n}\n", 'a.ts'), true, 'a comment moved');
  assert.equal(economy.isCommentOnly(was, "/** Adds one. */\nexport function a(x: number) {\n  return x + 1;\n}\n", 'a.ts'), true, 'a doc comment');
  assert.equal(economy.isCommentOnly(was, "export function a(x: number): number {\n  return x + 1;\n}\n", 'a.ts'), true, 'a type annotation never runs');
  assert.equal(economy.isCommentOnly(was, "export function a(x: number) {\n  return x + 2;\n}\n", 'a.ts'), false, 'a value changed');
  assert.equal(economy.isCommentOnly("const s = 'see http://a.example';\n", "const s = 'see http://b.example';\n", 'a.ts'), false, 'a string with // in it is code, never a comment');
  assert.equal(economy.isCommentOnly('const g = "src/**/*.ts";\n', 'const g = "src/**/*.tsx";\n', 'a.ts'), false, 'a glob with /* in it is code');
  assert.equal(economy.isCommentOnly("export const V = () => <Text>Don't go</Text>;\n", "export const V = () => <Text>Do go</Text>;\n", 'V.tsx'), false, 'JSX text is code');
  assert.equal(economy.isCommentOnly("export const V = () => <Text>Hi</Text>;\n", "// a note\nexport const V = () => <Text>Hi</Text>;\n", 'V.tsx'), true, 'a comment in a TSX file');
  assert.equal(economy.isCommentOnly('const a = ;\n', 'const a = ; // x\n', 'a.ts'), false, 'text that does not parse is never taken for a comment');
  assert.equal(economy.isCommentOnly(null, 'const a = 1;\n', 'a.ts'), false, 'a new file is a change');
  assert.equal(economy.isCommentOnly('const a = 1;\n', null, 'a.ts'), false, 'a deleted file is a change');
  assert.equal(economy.isCommentOnly('# a\n', '# b\n', 'a.md'), false, 'only source files can be comment-only');
});

test('e2e economy 2: the plan leaves out the comment-only source changes and keeps every other path', () => {
  const old: Record<string, string> = { 'src/a.ts': 'const a = 1; // one\n', 'src/b.ts': 'const b = 1;\n', 'src/c.tsx': 'export const C = () => null;\n' };
  const next: Record<string, string | null> = { 'src/a.ts': 'const a = 1; // uno\n', 'src/b.ts': 'const b = 2;\n', 'src/c.tsx': null, 'src/new.ts': 'const n = 1;\n' };
  const kept = economy.meaningfulPaths(['docs/x.md', 'src/a.ts', 'src/b.ts', 'src/c.tsx', 'src/new.ts'], (p) => old[p] ?? null, (p) => next[p] ?? null);
  assert.deepEqual(kept, ['docs/x.md', 'src/b.ts', 'src/c.tsx', 'src/new.ts']);
});

const journey = { name: 'atlas', covers: ['src/atlas/**'] };
const files = () => ['scripts/e2e/journeys/atlas.js', 'scripts/e2e/harness.js', 'src/atlas/A.ts', 'src/atlas/B.ts', 'src/other/C.ts'];
const keysOf = (text: Record<string, string>, o: { build?: string | null; env?: Record<string, string> } = {}) =>
  economy.keys('/r', journey, { files, read: (p) => text[p.replace('/r/', '')] ?? null, build: o.build === undefined ? 'b1' : o.build, env: o.env ?? {} });
const base = {
  'scripts/e2e/journeys/atlas.js': 'run();\n',
  'scripts/e2e/harness.js': 'harness();\n',
  'src/atlas/A.ts': 'export const a = 1;\n',
  'src/atlas/B.ts': 'export const b = 1;\n',
  'src/other/C.ts': 'export const c = 1;\n',
};

test('e2e economy 3: a journey\'s keys move with its file, the files it covers, the harness, the build and the flags, and with nothing else', () => {
  const k = keysOf(base);
  assert.deepEqual(keysOf(base), k, 'the same inputs are the same keys');
  assert.notEqual(keysOf({ ...base, 'src/atlas/A.ts': 'export const a = 2;\n' }).covers, k.covers, 'a covered file changed');
  assert.equal(keysOf({ ...base, 'src/atlas/A.ts': 'export const a = 1; // note\n' }).covers, k.covers, 'a covered file\'s comment is not a change');
  assert.equal(keysOf({ ...base, 'src/other/C.ts': 'export const c = 9;\n' }).covers, k.covers, 'a file it does not cover is not its input');
  assert.notEqual(keysOf({ ...base, 'scripts/e2e/journeys/atlas.js': 'run2();\n' }).covers, k.covers, 'its own file');
  const h = keysOf({ ...base, 'scripts/e2e/harness.js': 'harness2();\n' });
  assert.equal(h.covers, k.covers, 'the harness is not the journey\'s files');
  assert.notEqual(h.strict, k.strict, 'but it is part of the same run');
  assert.notEqual(keysOf(base, { build: 'b2' }).strict, k.strict, 'a new build');
  assert.equal(keysOf(base, { build: 'b2' }).covers, k.covers, 'the files it covers are the same');
  assert.notEqual(keysOf(base, { env: { E2E_MOBILE: '1' } }).strict, k.strict, 'a flag that changes the run');
});

test('e2e economy 4: only a pass is recorded; the same run is skipped, a changed one is not; a failure is never green', () => {
  const k = keysOf(base);
  assert.equal(economy.isGreen({}, 'atlas', k), false, 'nothing recorded: run it');
  const g = economy.markGreen({}, 'atlas', k, Date.UTC(2026, 10, 10));
  assert.equal(economy.isGreen(g, 'atlas', k), true, 'the same run again is skipped');
  assert.equal(economy.isGreen(g, 'atlas', keysOf({ ...base, 'src/atlas/A.ts': 'export const a = 2;\n' })), false, 'a covered file changed: run it');
  assert.equal(economy.isGreen(g, 'atlas', keysOf(base, { build: 'b2' })), false, 'a new build: run it');
  assert.equal(economy.isGreen(g, 'snap', k), false, 'another journey is its own');
  assert.equal(economy.isGreenSince(g, 'atlas', keysOf(base, { build: 'b2' })), true, 'its files unchanged since it passed, whatever the build: the plan need not name it');
  assert.equal(economy.isGreenSince(g, 'atlas', keysOf({ ...base, 'src/atlas/B.ts': 'export const b = 2;\n' })), false, 'a covered file changed since: the plan names it');
  assert.deepEqual(economy.markGreen({}, 'atlas', keysOf(base, { build: null }), 0), {}, 'a run without a build passed nothing');
  assert.equal(economy.isGreen({ atlas: { ...g.atlas } }, 'atlas', keysOf(base, { build: null })), false, 'and nothing without a build is skipped');
});

test('e2e economy 5: a known flake is a label on a failure that still fails; a check main never failed gets none', () => {
  const registry = economy.addFlake({}, 'atlas', { check: 'a short video is kept, sharing a pin with the memo nearby', fails: '2/3', base: 'abc1234', seen: '2026-11-10' });
  assert.equal(economy.flakeFor(registry, 'atlas', 'FAILED: a short video is kept, sharing a pin with the memo nearby')?.fails, '2/3');
  assert.equal(economy.flakeFor(registry, 'atlas', 'FAILED: AT9: the small map shows the areas\' points'), null, 'another check: yours');
  assert.equal(economy.flakeFor(registry, 'snap', 'FAILED: a short video is kept, sharing a pin with the memo nearby'), null, 'another journey: yours');
  assert.equal(economy.addFlake(registry, 'atlas', { check: 'a short video is kept, sharing a pin with the memo nearby', fails: '3/3', base: 'def5678', seen: '2026-11-11' }).atlas.length, 1, 'a check is recorded once, with the latest evidence');
  // The runner labels and still fails: the label is printed in the failure path, and the exit code is set there as before.
  const runner = read('scripts/e2e-web.js');
  const catchBlock = runner.slice(runner.indexOf('} catch (e) {'), runner.indexOf('} finally {'));
  assert.match(catchBlock, /flakeFor/, 'the failure path reads the registry');
  assert.match(catchBlock, /process\.exitCode = 1/, 'and still fails the run');
  assert.ok(!/process\.exit\(0\)|exitCode = 0/.test(catchBlock), 'a known flake never turns a failure into a pass');
  assert.match(read('scripts/e2e/flaky.json'), /^\{/, 'the registry is a file the tree holds');
});

test('e2e economy 6: a baseline records the checks that failed on main and how often, and nothing when none did', () => {
  const fail = (c: string) => `ok - a\nFAILED: ${c}\n`;
  const s = economy.summarizeBaseline([fail('x'), 'ok - a\nok - no console errors\n', fail('x'), fail('y')]);
  assert.equal(s.runs, 4);
  assert.deepEqual(s.failed.sort((a, b) => a.check.localeCompare(b.check)), [{ check: 'x', fails: '2/4', always: false }, { check: 'y', fails: '1/4', always: false }]);
  // Every run failed it: not a flake (main, or the baseline's setup, is broken): the script records nothing for it.
  assert.deepEqual(economy.summarizeBaseline([fail('z'), fail('z'), fail('z')]).failed, [{ check: 'z', fails: '3/3', always: true }]);
  assert.deepEqual(economy.summarizeBaseline([fail('z')]).failed, [{ check: 'z', fails: '1/1', always: false }], 'one run proves nothing about flakiness');
  assert.deepEqual(economy.summarizeBaseline(['ok - a\n', 'ok - b\n']).failed, [], 'it never failed on main: nothing recorded');
  assert.deepEqual(economy.parseFailures('ok - a\nFAILED: one\nnot FAILED: two\nFAILED: three\n'), ['one', 'three']);
  const script = read('scripts/e2e-baseline.js');
  assert.match(script, /worktree/, 'it runs on a scratch worktree of main, never the branch');
  assert.match(script, /E2E_FORCE: '1'/, 'every baseline run really runs');
  assert.match(script, /copy-maplibre-worker/, 'the worktree gets the map worker a hard-linked node_modules lacks (the 1995.8 km symptom)');
  assert.match(script, /f\.always/, 'a check that failed every run is not recorded as a flake');
});

test('e2e economy 7: the plan names a journey whose own file changed, lists the green ones apart, and says what it left out', () => {
  const affected = load(join(ROOT, 'scripts', 'affected.js')) as {
    e2eFor(changed: string[], s: { name: string; covers: string[]; file?: string }[]): { scenarios: { name: string }[] };
    e2eHint(changed: string[], all: boolean, status: (n: string) => string | null, comment: string[]): string;
  };
  const table = [{ name: 'atlas', covers: ['src/atlas/**'], file: 'scripts/e2e/journeys/atlas.js' }, { name: 'snap', covers: ['src/snap/**'], file: 'scripts/e2e/journeys/snap.js' }];
  assert.deepEqual(affected.e2eFor(['scripts/e2e/journeys/snap.js'], table).scenarios.map((s) => s.name), ['snap'], 'editing a journey names it');
  // Over the real journeys: a change AtlasTile makes names several; one of them already green is listed apart, not named to run.
  const real = ['src/components/atlas/AtlasTile.tsx'];
  const hint = affected.e2eHint(real, false, (n) => (n === 'atlas' ? 'green' : null), ['src/map/types.ts']);
  assert.match(hint, /E2E_ONLY=carousel npm run e2e:web/, 'a journey not yet green is named');
  assert.ok(!/E2E_ONLY=atlas npm run e2e:web/.test(hint), 'one already green is not');
  assert.match(hint, /Already green, with their files unchanged since \(not run again\): atlas\./);
  assert.match(hint, /Left out as comment-only.*src\/map\/types\.ts/);
  assert.match(affected.e2eHint(real, false, () => 'green', []), /every journey that covers what changed is already green/);
  assert.match(hint, /once, at the end/);
});

test('e2e economy 8: /slice, /audit and the testing reference tell a session the same economy', () => {
  const slice = read('.claude/skills/slice/SKILL.md');
  const audit = read('.claude/skills/audit/SKILL.md');
  const testing = read('docs/TESTING.md');
  for (const [name, text] of [['slice', slice], ['audit', audit], ['TESTING', testing]] as const) {
    assert.match(text, /already green/i, `${name} says a journey already green is not run again`);
    assert.match(text, /E2E_FORCE/, `${name} names the override`);
  }
  assert.match(slice, /once, at the end/, '/slice: the named journeys run once, at the end');
  assert.match(slice, /e2e:baseline/, '/slice: a failure outside the slice gets one baseline on main');
  assert.match(audit, /--since/, '/audit: only the journeys the fixes touched, from the slice\'s last green');
  assert.match(audit, /e2e:baseline/, '/audit: the same baseline rule');
  assert.match(testing, /e2e:baseline/);
  assert.match(testing, /flaky\.json/);
  assert.match(testing, /never skipped|never skips|still fails/i, 'a known flake still fails a run');
  assert.match(read('.gitignore'), /\.e2e-green\.json/, 'the green cache is never committed');
});
