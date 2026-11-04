// @tree-wide: this repo's import graph, e2e scenario table, Stop hook and CI
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

// Affected checks (specs/affected-checks/spec.md): what a change can break, from the import graph.

type Change = { status: 'A' | 'M' | 'D' | 'R'; path: string; from?: string };
type Scenario = { name: string; covers: string[] };
type Step = { name: string; run: () => Promise<{ ok: boolean; output: string }> };
type Affected = {
  HARNESS: string[];
  changedFiles(root: string): { base: string | null; all: boolean; changes: Change[] };
  affectedTests(root: string, changed: string[]): { all: boolean; why?: string; tests: { file: string; chain: string[]; wide?: string }[]; skipped: number };
  describeTests(r: ReturnType<Affected['affectedTests']>): string;
  lintTargets(root: string, changed: string[]): { all: boolean; why?: string; files: string[] };
  e2eFor(changed: string[], scenarios?: Scenario[]): { scenarios: { name: string; files: string[] }[]; uncovered: string[] };
  runSteps(steps: Step[]): Promise<{ ok: boolean; ran: string[]; failed?: string; output: string }>;
  hookPlan(changed: string[]): string[];
};

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const affected = load(join(ROOT, 'scripts', 'affected.js')) as Affected;

const tmp = mkdtempSync(join(tmpdir(), 'affected-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
let repos = 0;

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.email=test@example.invalid', '-c', 'user.name=test', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' });

function write(root: string, rel: string, src: string) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), src);
}

/** A throwaway repo on `main` with a small app and its tests, then a branch to change. */
function repo(): string {
  const root = join(tmp, `r${++repos}`);
  const files: Record<string, string> = {
    'package.json': '{"name":"t"}',
    'src/lib/geo.ts': '// @layer core\nexport const f = 1;\n',
    'src/lib/rides.ts': "// @layer core\nimport { f } from './geo';\nexport const r = f;\n",
    'src/lib/kinds.ts': '// @layer core\nexport type K = 1;\n',
    'src/lib/uses.ts': "// @layer core\nimport type { K } from './kinds';\nexport const u = (k: K) => k;\n",
    'src/lib/lazy.ts': '// @layer core\nexport const z = 1;\n',
    'src/lib/plat.native.ts': '// @layer adapter\nexport const p = 1;\n',
    'src/lib/plat.web.ts': '// @layer adapter\nexport const p = 2;\n',
    'src/lib/data.json': '{"a":1}',
    'src/lib/gone.ts': '// @layer core\nexport const g = 1;\n',
    'src/lib/__tests__/rides.test.ts': "import { r } from '../rides';\nvoid r;\n",
    'src/lib/__tests__/types.test.ts': "import { u } from '../uses';\nvoid u;\n",
    'src/lib/__tests__/lazy.test.ts': "export const m = () => import('../lazy');\n",
    'src/lib/__tests__/plat.test.ts': "import { p } from '../plat';\nvoid p;\n",
    'src/lib/__tests__/json.test.ts': "import d from '../data.json';\nvoid d;\n",
    'src/lib/__tests__/gone.test.ts': "import { g } from '../gone';\nvoid g;\n",
    'src/lib/__tests__/other.test.ts': 'export {};\n',
    'src/lib/__tests__/helper.ts': 'export const h = 1;\n',
    'src/app/walk.tsx': "import { r } from '../lib/rides';\nexport default r;\n",
  };
  for (const [rel, src] of Object.entries(files)) write(root, rel, src);
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'base');
  git(root, 'checkout', '-q', '-b', 'feature');
  return root;
}

const paths = (cs: Change[]) => cs.flatMap((c) => (c.from ? [c.from, c.path] : [c.path])).sort();
const testsFor = (root: string, changed: string[]) => affected.affectedTests(root, changed).tests.map((t) => t.file).sort();

test('AC1 changed files: commits, edits, new, renamed and deleted files since the merge base', () => {
  const root = repo();
  write(root, 'src/lib/geo.ts', '// @layer core\nexport const f = 2;\n');
  git(root, 'commit', '-qam', 'committed edit');
  write(root, 'src/lib/kinds.ts', '// @layer core\nexport type K = 2;\n');
  write(root, 'src/lib/fresh.ts', '// @layer core\nexport const n = 1;\n');
  git(root, 'mv', 'src/lib/lazy.ts', 'src/lib/later.ts');
  unlinkSync(join(root, 'src/lib/gone.ts'));
  const r = affected.changedFiles(root);
  assert.equal(r.all, false);
  assert.ok(r.base);
  assert.deepEqual(paths(r.changes), ['src/lib/fresh.ts', 'src/lib/geo.ts', 'src/lib/gone.ts', 'src/lib/kinds.ts', 'src/lib/later.ts', 'src/lib/lazy.ts']);
  assert.equal(r.changes.find((c) => c.path === 'src/lib/later.ts')?.status, 'R');
  assert.equal(r.changes.find((c) => c.path === 'src/lib/gone.ts')?.status, 'D');
});

test('AC1 with no main to compare with, everything counts as changed', () => {
  const root = join(tmp, `r${++repos}`);
  write(root, 'src/lib/a.ts', '// @layer core\n');
  git(root, 'init', '-q', '-b', 'trunk');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'only');
  const r = affected.changedFiles(root);
  assert.equal(r.base, null);
  assert.equal(r.all, true);
});

test('AC2 a change selects the tests that import it, through value, type-only, dynamic, platform and JSON imports', () => {
  const root = repo();
  assert.deepEqual(testsFor(root, ['src/lib/geo.ts']), ['src/lib/__tests__/rides.test.ts']);
  assert.deepEqual(testsFor(root, ['src/lib/kinds.ts']), ['src/lib/__tests__/types.test.ts']);
  assert.deepEqual(testsFor(root, ['src/lib/lazy.ts']), ['src/lib/__tests__/lazy.test.ts']);
  assert.deepEqual(testsFor(root, ['src/lib/plat.web.ts']), ['src/lib/__tests__/plat.test.ts']);
  assert.deepEqual(testsFor(root, ['src/lib/data.json']), ['src/lib/__tests__/json.test.ts']);
  assert.deepEqual(testsFor(root, ['src/app/walk.tsx', 'docs/x.md']), []);
});

test('AC2 a changed test runs itself, and a deleted file\'s importers run', () => {
  const root = repo();
  assert.deepEqual(testsFor(root, ['src/lib/__tests__/other.test.ts']), ['src/lib/__tests__/other.test.ts']);
  unlinkSync(join(root, 'src/lib/gone.ts'));
  assert.deepEqual(testsFor(root, ['src/lib/gone.ts']), ['src/lib/__tests__/gone.test.ts']);
  renameSync(join(root, 'src/lib/lazy.ts'), join(root, 'src/lib/later.ts'));
  assert.deepEqual(testsFor(root, ['src/lib/lazy.ts', 'src/lib/later.ts']), ['src/lib/__tests__/lazy.test.ts']);
});

test('AC2 a test that reads the whole tree says so on its first line, and runs on any change under src or scripts', () => {
  const root = repo();
  write(root, 'src/lib/__tests__/scan.test.ts', '// @tree-wide: reads every module\nexport {};\n');
  assert.deepEqual(testsFor(root, ['src/app/walk.tsx']), ['src/lib/__tests__/scan.test.ts']);
  assert.deepEqual(testsFor(root, ['scripts/e2e-scenarios.js']), ['src/lib/__tests__/scan.test.ts']);
  assert.deepEqual(testsFor(root, ['docs/STATUS.md']), []);
  assert.match(affected.describeTests(affected.affectedTests(root, ['src/app/walk.tsx'])), /scan\.test\.ts\s+\(reads the whole tree: reads every module\)/);
  // This repo's tree-wide tests are marked.
  for (const f of ['layers.test.ts', 'functionalCoreAudit.test.ts', 'meta.test.ts', 'affected.test.ts']) {
    assert.match(readFileSync(join(__dirname, f), 'utf8').split('\n')[0], /^\/\/ @tree-wide: /, f);
  }
});

test('AC3 each selected test prints its shortest chain; nothing selected says so', () => {
  const root = repo();
  const r = affected.affectedTests(root, ['src/lib/geo.ts']);
  assert.deepEqual(r.tests[0].chain, ['src/lib/__tests__/rides.test.ts', 'src/lib/rides.ts', 'src/lib/geo.ts']);
  assert.equal(r.skipped, 6);
  const text = affected.describeTests(r);
  assert.match(text, /src\/lib\/__tests__\/rides\.test\.ts\s+← src\/lib\/rides\.ts ← src\/lib\/geo\.ts/);
  assert.match(text, /6 test files skipped/);
  assert.match(affected.describeTests(affected.affectedTests(root, ['README.md'])), /No unit test imports what changed/);
});

test('AC4 a harness change runs everything and names the file', () => {
  const root = repo();
  for (const f of ['src/lib/__tests__/helper.ts', 'package.json', 'tsconfig.json', 'eslint.config.js', 'scripts/layers.js', 'src/lib/__tests__/fakes/memoryDb.ts']) {
    const r = affected.affectedTests(root, ['src/lib/geo.ts', f]);
    assert.equal(r.all, true, f);
    assert.equal(r.tests.length, 7, f);
    assert.match(r.why ?? '', new RegExp(f.replace(/[./]/g, '\\$&')));
  }
});

test('AC5 the graph follows what the layer reader follows, in this repo', () => {
  const tests = testsFor(ROOT, ['src/lib/geo.ts']);
  assert.ok(tests.includes('src/lib/__tests__/rides/rides.test.ts'), 'geo.ts reaches rides.test.ts');
  assert.ok(tests.length > 10 && tests.length < 60, `${tests.length} tests reach geo.ts`);
  // A change to a screen reaches only the tests that read the whole tree; the db's types reach the contract.
  const wide = affected.affectedTests(ROOT, ['src/app/walk.tsx']).tests;
  assert.ok(wide.length > 0 && wide.every((t) => t.wide), wide.map((t) => t.file).join(', '));
  assert.ok(testsFor(ROOT, ['src/lib/db/types.ts']).includes('src/lib/__tests__/storage/db.contract.test.ts'));
});

test('AC6 lint:affected lists the changed sources, or everything when the lint config changed', () => {
  const root = repo();
  write(root, 'src/lib/geo.ts', '// @layer core\nexport const f = 3;\n');
  unlinkSync(join(root, 'src/lib/gone.ts'));
  const r = affected.lintTargets(root, ['src/lib/geo.ts', 'src/lib/gone.ts', 'src/lib/data.json', 'docs/a.md']);
  assert.deepEqual(r, { all: false, files: ['src/lib/geo.ts'] });
  for (const f of ['eslint.config.js', 'eslint-suppressions.json', 'scripts/layers.js', 'package.json']) {
    const all = affected.lintTargets(root, ['src/lib/geo.ts', f]);
    assert.equal(all.all, true, f);
    assert.match(all.why ?? '', new RegExp(f.replace(/[./]/g, '\\$&')));
  }
});

test('lint:affected lints only what npm run lint covers (src and index.js), never a script it was never written for', () => {
  const root = repo();
  write(root, 'src/lib/geo.ts', '// @layer core\nexport const f = 3;\n');
  write(root, 'index.js', '// entry\n');
  write(root, 'scripts/e2e-web.js', 'console.log(__dirname);\n');
  const r = affected.lintTargets(root, ['src/lib/geo.ts', 'index.js', 'scripts/e2e-web.js']);
  assert.deepEqual(r, { all: false, files: ['src/lib/geo.ts', 'index.js'] });
});

test('AC7 check:affected runs its steps in order and stops at the first failure', async () => {
  const ran: string[] = [];
  const step = (name: string, ok: boolean): Step => ({ name, run: async () => (ran.push(name), { ok, output: `${name} said ${ok}` }) });
  const good = await affected.runSteps([step('layers', true), step('tests', true), step('typecheck', true), step('lint', true)]);
  assert.deepEqual(good.ran, ['layers', 'tests', 'typecheck', 'lint']);
  assert.equal(good.ok, true);
  ran.length = 0;
  const bad = await affected.runSteps([step('layers', true), step('tests', false), step('typecheck', true)]);
  assert.deepEqual(ran, ['layers', 'tests']);
  assert.equal(bad.ok, false);
  assert.equal(bad.failed, 'tests');
  assert.match(bad.output, /tests said false/);
});

test('AC8 the Stop hook runs the layer check and affected tests when TypeScript changed, and nothing for docs', () => {
  assert.deepEqual(affected.hookPlan(['src/lib/geo.ts', 'docs/STATUS.md']), ['layers', 'tests']);
  assert.deepEqual(affected.hookPlan(['src/app/walk.tsx']), ['layers', 'tests']);
  assert.deepEqual(affected.hookPlan(['docs/STATUS.md', 'scripts/e2e-web.js']), []);
  const hook = readFileSync(join(ROOT, '.claude', 'hooks', 'check-done.sh'), 'utf8');
  assert.match(hook, /node scripts\/affected\.js hook/);
});

test('AC9 a changed file names the scenarios that cover it; an uncovered screen is named', () => {
  const table: Scenario[] = [
    { name: 'gaps', covers: ['src/lib/gaps/**', 'src/components/GapCard.tsx'] },
    { name: 'tabs', covers: ['src/app/(tabs)/**'] },
  ];
  const r = affected.e2eFor(['src/lib/gaps/infer.ts', 'src/app/(tabs)/navigate.tsx', 'src/components/Ticking.tsx', 'docs/a.md'], table);
  assert.deepEqual(r.scenarios, [
    { name: 'gaps', files: ['src/lib/gaps/infer.ts'] },
    { name: 'tabs', files: ['src/app/(tabs)/navigate.tsx'] },
  ]);
  assert.deepEqual(r.uncovered, ['src/components/Ticking.tsx']);
  // The repo's table lists journeys only: the full flow runs only when the owner asks (decision 0074),
  // so a screen no journey covers is named, for the slice to add one.
  const own = affected.e2eFor(['src/components/GapCard.tsx', 'src/components/Nowhere.tsx']);
  assert.ok(own.scenarios.some((s) => s.name === 'gaps'), own.scenarios.map((s) => s.name).join(', '));
  assert.deepEqual(own.uncovered, ['src/components/Nowhere.tsx']);
  // One file per journey (TG9): the file is the registration, its name is its file's, and it says what it covers.
  const dir = join(ROOT, 'scripts', 'e2e', 'journeys');
  const files = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
  assert.ok(files.includes('full'), 'the full flow is scripts/e2e/journeys/full.js');
  const names = (load(join(ROOT, 'scripts', 'e2e-scenarios.js')) as { SCENARIOS: Scenario[] }).SCENARIOS.map((s) => s.name).sort();
  assert.deepEqual(names, files.filter((f) => f !== 'full'), 'every journey file but full.js is a row, and nothing else');
  for (const f of files) {
    const j = load(join(dir, `${f}.js`)) as { name: string; covers?: string[]; full?: boolean; run: unknown };
    assert.equal(j.name, f, `scripts/e2e/journeys/${f}.js exports name "${j.name}"`);
    assert.equal(typeof j.run, 'function', `${f}.js exports run`);
    if (!j.full) assert.ok(Array.isArray(j.covers) && j.covers.length > 0, `${f}.js says which files it covers`);
  }
  // The entry runs a journey by name, and the full flow with none.
  const e2e = readFileSync(join(ROOT, 'scripts', 'e2e-web.js'), 'utf8');
  assert.match(e2e, /E2E_ONLY/);
  assert.match(e2e, /journeys/);
});

test('AC10 CI runs lint before the export', () => {
  const ci = readFileSync(join(ROOT, '.github', 'workflows', 'pages.yml'), 'utf8');
  const lint = ci.indexOf('npm run lint');
  assert.ok(lint > 0, 'pages.yml runs npm run lint');
  assert.ok(lint < ci.indexOf('expo export'), 'lint runs before the export');
});
