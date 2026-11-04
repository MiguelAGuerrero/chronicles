// @tree-wide: the Stop hook, the docs check's collision rules, the move-test script, tsconfig and the procedure docs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

// The procedures hold other agents to the feature-based testing (specs/test-organization, TG13-TG19).

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const tmp = mkdtempSync(join(tmpdir(), 'procedures-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

test('TG13 the Stop hook runs the tree-wide checks when only scripts changed, and nothing for docs alone', () => {
  const { hookPlan } = load(join(ROOT, 'scripts', 'affected.js')) as { hookPlan(changed: string[]): string[] };
  assert.deepEqual(hookPlan(['scripts/features.js']), ['layers', 'tests']);
  assert.deepEqual(hookPlan(['scripts/e2e/journeys/walk.js', 'docs/STATUS.md']), ['layers', 'tests']);
  assert.deepEqual(hookPlan(['docs/STATUS.md', '.claude/skills/slice/SKILL.md']), []);
  const hook = read('.claude/hooks/check-done.sh');
  assert.match(hook, /\^scripts\//, 'the hook calls affected.js hook when a script changed, not only TypeScript');
});

type Collisions = {
  sharedPrefixes(specs: { slug: string; prefixes: string[] }[], allowed?: string[]): { prefix: string; slugs: string[] }[];
  duplicateDecisions(names: string[]): { number: string; files: string[] }[];
  ALLOWED_SHARED: string[];
};
const collisions = load(join(ROOT, 'scripts', 'collisions.js')) as Collisions;

test('TG14 a criterion prefix a new spec shares with another fails, naming both; D, M and R are allowed', () => {
  const specs = [
    { slug: 'town-outlines', prefixes: ['TO'] },
    { slug: 'test-organization', prefixes: ['TO'] },
    { slug: 'rides', prefixes: ['R'] },
    { slug: 'v1-discovery', prefixes: ['R', 'S'] },
  ];
  assert.deepEqual(collisions.sharedPrefixes(specs), [{ prefix: 'TO', slugs: ['test-organization', 'town-outlines'] }]);
  assert.deepEqual(collisions.ALLOWED_SHARED, ['D', 'M', 'R']);
  // This repo has none beyond the three.
  const { readSpecs, idsOf } = load(join(ROOT, 'scripts', 'check-specs.js')) as { readSpecs(): { slug: string; text: string }[]; idsOf(t: string): { prefixes: string[] } };
  assert.deepEqual(collisions.sharedPrefixes(readSpecs().map((s) => ({ slug: s.slug, prefixes: idsOf(s.text).prefixes }))), []);
  assert.match(read('scripts/check-docs.js'), /require\('\.\/collisions'\)/, 'the docs check runs it');
});

test('TG15 two decision records with one number fail, naming both files', () => {
  assert.deepEqual(collisions.duplicateDecisions(['0082-compass.md', '0083-town-outlines.md', '0083-tests-by-feature.md', 'README.md']), [
    { number: '0083', files: ['0083-tests-by-feature.md', '0083-town-outlines.md'] },
  ]);
  const { readdirSync } = load('node:fs') as typeof import('node:fs');
  assert.deepEqual(collisions.duplicateDecisions(readdirSync(join(ROOT, 'docs', 'decisions'))), []);
});

test('TG16 move-test moves a test into its feature folder and every relative path still resolves to the same file', () => {
  const root = join(tmp, 'repo');
  const w = (rel: string, src: string) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), src); };
  w('src/lib/geo.ts', 'export const g = 1;\n');
  w('src/components/map/types.ts', 'export const t = 1;\n');
  w('assets/x.json', '{}');
  w('scripts/affected.js', 'module.exports = {};\n');
  w('src/lib/__tests__/fakes/index.ts', 'export const fakePorts = () => ({});\n');
  w('src/lib/__tests__/outAndBack.json', '{}');
  // A fixture a merge already put in the feature folder: the test's './' still names it there.
  w('src/lib/__tests__/recording/eastonSlow.json', '{}');
  w('src/lib/__tests__/rides/rides.test.ts', '');
  const src = [
    "import { g } from '../geo';",
    "import { t } from '../../components/map/types';",
    "import { fakePorts } from './fakes';",
    "const lazy = () => import('../geo');",
    "const r = require('../../../scripts/affected.js');",
    "const a = createRequire(import.meta.url)('../../../assets/x.json');",
    "const f = join(__dirname, 'outAndBack.json');",
    "const e = require('./eastonSlow.json');",
    "const root = join(__dirname, '..', '..');",
    "const s = 'from \\'../geo\\' in a string is left alone';",
  ].join('\n');
  w('src/lib/__tests__/still.test.ts', src);
  const run = (...args: string[]) => execFileSync('node', [join(ROOT, 'scripts', 'move-test.js'), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, MOVE_TEST_ROOT: root, MOVE_TEST_NO_GIT: '1' } });
  run('src/lib/__tests__/still.test.ts', 'recording');
  const moved = readFileSync(join(root, 'src/lib/__tests__/recording/still.test.ts'), 'utf8');
  assert.ok(!existsSync(join(root, 'src/lib/__tests__/still.test.ts')));
  for (const want of [
    "from '../../geo'", "from '../../../components/map/types'", "from '../fakes'", "import('../../geo')",
    "require('../../../../scripts/affected.js')", "('../../../../assets/x.json')", "join(__dirname, '..', 'outAndBack.json')", "join(__dirname, '..', '..', '..')", "require('./eastonSlow.json')",
  ]) assert.ok(moved.includes(want), `${want}\n${moved}`);
  assert.ok(moved.includes("'from \\'../geo\\' in a string is left alone'"), 'a string that is not a path call is untouched');
  assert.throws(() => run('src/lib/__tests__/recording/still.test.ts', 'nope'), /No feature named "nope"/);
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts['move-test'], 'node scripts/move-test.js');
});

test('TG17 the typecheck leaves out build output and agent worktrees', () => {
  const ts = JSON.parse(read('tsconfig.json')) as { exclude?: string[] };
  for (const x of ['node_modules', 'dist', '.claude/worktrees']) assert.ok(ts.exclude?.includes(x), `tsconfig.json excludes ${x}`);
});

test('TG18 the procedures name the feature folder, test:feature, the coverage holes and coverage', () => {
  const slice = read('.claude/skills/slice/SKILL.md');
  assert.match(slice, /feature folder/);
  assert.match(slice, /npm run test:feature/);
  assert.match(slice, /Covered by nothing/);
  assert.match(slice, /move-test/);
  assert.match(read('.claude/skills/fix/SKILL.md'), /src\/lib\/__tests__\/<feature>\//);
  assert.match(read('.claude/agents/auditor.md'), /npm run test:coverage/);
});

test('TG19 the e2e skill and AGENTS.md say what is true', () => {
  assert.match(read('.claude/skills/e2e/SKILL.md'), /nothing-leaves/);
  assert.match(read('AGENTS.md'), /\*\*Nothing is a score\*\* in the app/);
});
