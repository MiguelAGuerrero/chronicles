// @tree-wide: every spec's criteria against every test, the criteria baseline, the test-first history check and the procedures
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

// Every criterion has a status, and test-first shows in the history (specs/test-organization, TG20-TG26).

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const tmp = mkdtempSync(join(tmpdir(), 'criteria-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

type Problem = { slug: string; id: string; message: string };
type Criteria = {
  criteriaProblems(o: {
    specs: { slug: string; ids: string[] }[];
    named: (slug: string) => Set<string>;
    retired: Record<string, string[]>;
    untested: Record<string, Record<string, string>>;
    baseline: string[];
    inProgress: Record<string, { branch: string; since: string }>;
    today: string;
  }): Problem[];
  check(root: string, today?: string): Problem[];
  BASELINE_FILE: string;
};
const criteria = load(join(ROOT, 'scripts', 'criteria.js')) as Criteria;
const BASE = {
  specs: [{ slug: 'rides', ids: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] }],
  named: () => new Set(['R1']),
  retired: { rides: ['R2'] },
  untested: { rides: { R3: 'device: the phone\'s background task', R4: 'deferred: the owner, Nov 4, waits on GPX export' } },
  baseline: ['rides:R5'],
  inProgress: {},
  today: '2026-11-05',
};

test('TG20 a live criterion needs a test, a retirement, a reason not to test it, or a baseline entry', () => {
  assert.deepEqual(criteria.criteriaProblems(BASE).map((p) => p.id), ['R6']);
  const msg = criteria.criteriaProblems(BASE)[0].message;
  for (const way of ['a test named by its id', 'RETIRED', 'UNTESTED', 'scripts/criteria.baseline.json']) assert.ok(msg.includes(way), `the message names ${way}: ${msg}`);
  // An untested entry needs a kind and a reason.
  const bad = criteria.criteriaProblems({ ...BASE, named: () => new Set(['R1', 'R6']), untested: { rides: { R3: 'device', R4: 'later: someday' } } });
  assert.deepEqual(bad.map((p) => p.id).sort(), ['R3', 'R4']);
  assert.match(bad[0].message, /device: <why>|deferred: <why>/);
});

test('TG20 this repo: every live criterion has a status, and the docs check runs the gate', () => {
  assert.deepEqual(criteria.check(ROOT).map((p) => `${p.slug}:${p.id} ${p.message}`), []);
  assert.match(read('scripts/check-docs.js'), /require\('\.\/criteria'\)/);
});

test('TG21 the baseline only shrinks: a stale entry fails until removed, and its size has a ceiling', () => {
  const stale = criteria.criteriaProblems({ ...BASE, named: () => new Set(['R1', 'R5', 'R6']) });
  assert.deepEqual(stale.map((p) => p.id), ['R5']);
  assert.match(stale[0].message, /remove it from scripts\/criteria\.baseline\.json/);
  const baseline = JSON.parse(read('scripts/criteria.baseline.json')) as string[];
  // Lower the ceiling as entries go; never raise it (functional-core audit 7's rule, for criteria).
  const CEILING = 55;
  assert.ok(baseline.length <= CEILING, `the baseline grew: ${baseline.length} entries, ceiling ${CEILING}`);
  assert.deepEqual([...baseline].sort(), baseline, 'kept sorted');
});

test('TG22 a spec in progress is exempt for 7 days, then fails', () => {
  const building = { ...BASE, named: () => new Set<string>(), retired: {}, untested: {}, baseline: [], inProgress: { rides: { branch: 'claude/rides', since: '2026-11-01' } } };
  assert.deepEqual(criteria.criteriaProblems({ ...building, today: '2026-11-05' }), []);
  const old = criteria.criteriaProblems({ ...building, today: '2026-11-09' });
  assert.equal(old.length, 1);
  assert.match(old[0].message, /in progress since 2026-11-01.*claude\/rides/);
});

test('TG23 a todo is not a test: an id named only by a todo unit test or check.todo counts as untested', () => {
  const { namedIn } = load(join(ROOT, 'scripts', 'check-specs.js')) as { namedIn(files: string[]): Set<string> };
  const f = join(tmp, 'todo.test.ts');
  writeFileSync(f, [
    "test('XX1: real', () => {});",
    "test('XX2: before the code', { todo: 'test first' }, () => {});",
    "check(ok, 'XX3: real check');",
    "check.todo(ok, 'XX4: before the code');",
  ].join('\n'));
  const got = namedIn([f]);
  assert.ok(got.has('XX1') && got.has('XX3'));
  assert.ok(!got.has('XX2') && !got.has('XX4'), [...got].join(' '));
});

type TestFirst = {
  testFirst(ids: string[], commits: { sha: string; lines: string[] }[]): { id: string; ok: boolean; why: string }[];
};
const tf = load(join(ROOT, 'scripts', 'test-first.js')) as TestFirst;

test('TG24 test-first: each id was a todo test in an earlier commit than the one that made it real', () => {
  const todo = (id: string) => `test('${id}: x', { todo: 'test first' }, () => {});`;
  const real = (id: string) => `test('${id}: x', () => {});`;
  const commits = [
    { sha: 'a1', lines: [todo('XX1'), todo('XX2'), todo('XX4')] },
    { sha: 'b2', lines: [real('XX1'), todo('XX2'), real('XX3'), real('XX5')] },
    { sha: 'c3', lines: [real('XX1'), todo('XX2'), real('XX3'), todo('XX4'), real('XX5')] },
  ];
  // XX6: a todo and a real test arrive in one commit, which proves nothing about order.
  commits.push({ sha: 'd4', lines: [...commits[2].lines, todo('XX6'), real('XX6')] });
  const r = Object.fromEntries(tf.testFirst(['XX1', 'XX2', 'XX3', 'XX4', 'XX6'], commits).map((x) => [x.id, x]));
  assert.equal(r.XX1.ok, true, r.XX1.why);
  assert.equal(r.XX2.ok, false);
  assert.match(r.XX2.why, /still a todo/);
  assert.equal(r.XX3.ok, false);
  assert.match(r.XX3.why, /never a todo/);
  assert.equal(r.XX4.ok, false);
  assert.match(r.XX4.why, /still a todo/);
  assert.equal(r.XX6.ok, false);
  assert.match(r.XX6.why, /same commit/);
});

test('TG24 check:test-first reads a branch\'s history and exits 1 naming the id that skipped test-first', () => {
  const repo = join(tmp, 'repo');
  mkdirSync(join(repo, 'src', 'lib', '__tests__', 'rides'), { recursive: true });
  mkdirSync(join(repo, 'specs', 'demo'), { recursive: true });
  const git = (...a: string[]) => execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...a], { cwd: repo, encoding: 'utf8' });
  const t = join(repo, 'src', 'lib', '__tests__', 'rides', 'demo.test.ts');
  writeFileSync(join(repo, 'specs', 'demo', 'spec.md'), '1. **DM1** one\n2. **DM2** two\n');
  writeFileSync(t, '');
  git('init', '-q', '-b', 'main');
  git('add', '-A');
  git('commit', '-qm', 'spec');
  git('checkout', '-qb', 'slice');
  writeFileSync(t, "test('DM1: one', { todo: 'test first' }, () => {});\n");
  git('commit', '-qam', 'tests first');
  writeFileSync(t, "test('DM1: one', () => {});\ntest('DM2: two', () => {});\n");
  git('commit', '-qam', 'code');
  let out = '';
  let code = 0;
  try {
    out = execFileSync('node', [join(ROOT, 'scripts', 'test-first.js'), 'demo'], { cwd: repo, encoding: 'utf8', env: { ...process.env, TEST_FIRST_ROOT: repo, TEST_FIRST_BASE: 'main' } });
  } catch (e) {
    const err = e as { status: number; stdout: string };
    code = err.status;
    out = err.stdout;
  }
  assert.equal(code, 1, out);
  assert.match(out, /DM1 ok/);
  assert.match(out, /DM2 .*never a todo/);
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts['check:test-first'], 'node scripts/test-first.js');
});

test('TG25 check.todo reports and never fails the run; check still throws', () => {
  const { check } = load(join(ROOT, 'scripts', 'e2e', 'check.js')) as { check: ((ok: boolean, what: string) => void) & { todo(ok: boolean, what: string): void } };
  const lines: string[] = [];
  const log = console.log;
  console.log = (s: string) => { lines.push(s); };
  try {
    check.todo(false, 'XX1: not built yet');
    check.todo(true, 'XX2: built');
    check(true, 'XX3: real');
  } finally {
    console.log = log;
  }
  assert.deepEqual(lines, ['not ok - XX1: not built yet # TODO', 'ok - XX2: built # TODO', 'ok - XX3: real']);
  assert.throws(() => check(false, 'XX4: real'), /FAILED: XX4: real/);
  assert.match(read('scripts/e2e/harness.js'), /require\('\.\/check'\)/, 'the harness uses it');
});

test('TG26 the procedures track the spec, commit todos first, and check the history before done and deploy', () => {
  const slice = read('.claude/skills/slice/SKILL.md');
  for (const s of ['IN_PROGRESS', "{ todo: 'test first' }", 'check.todo', 'npm run check:test-first']) assert.ok(slice.includes(s), `/slice says ${s}`);
  const deploy = read('.claude/skills/deploy/SKILL.md');
  assert.match(deploy, /npm run check:test-first/);
  assert.match(deploy, /IN_PROGRESS/);
  assert.match(read('docs/TESTING.md'), /check:test-first/);
});
