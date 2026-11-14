// @tree-wide: regression tests for the code-quality audit (specs/code-quality/spec.md, "Audit")
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { baseline, body, cleanup, commit, git, quality, ROOT, tree, write, type Facts, type Violation } from './qualityFixture';

after(cleanup);

const load = createRequire(__filename);
type Main = (args: string[], root: string) => number;
const main = () => (load(join(ROOT, 'scripts', 'quality', 'index.js')) as { main: Main }).main;
type Finding = { subject: string; file: string; line: number; text: string };
const refactors = () => load(join(ROOT, 'scripts', 'refactor-commits.js')) as { check(root: string, range: string): Finding[] };
const only = (v: Violation[], ...metrics: string[]) => v.filter((x) => metrics.includes(x.metric));
const branchy = (n: number, v = 'a') => Array.from({ length: n }, (_, i) => `    if (${v} === ${i}) return ${i};`).join('\n');
const quiet = <T>(f: () => T): T => {
  const [log, err] = [console.log, console.error];
  console.log = () => {};
  console.error = () => {};
  try {
    return f();
  } finally {
    console.log = log;
    console.error = err;
  }
};

test('code-quality audit 1: a small callback added above a recorded unnamed one leaves the gate green', () => {
  const store = (extra: string, big: number) => `// @layer shell
export function makeStore(write: (f: () => number) => void, a: number) {
${extra}  write(() => {
${branchy(big)}
    return -1;
  });
}
`;
  const root = tree({ 'src/lib/store.ts': store('', 16) });
  const q = quality();
  const v = () => only(q.violations(q.collect(root)), 'fn-branches', 'shell-branches');
  const b = baseline().build(v());
  assert.ok(Object.keys(b).every((id) => !/~\d/.test(id)), 'an unnamed callback is keyed by the function that holds it, never by its place');
  write(root, { 'src/lib/store.ts': store('  write(() => 0);\n', 16) });
  assert.deepEqual(baseline().compare(v(), b), { worse: [], added: [], stale: [] });
  write(root, { 'src/lib/store.ts': store('  write(() => 0);\n', 18) });
  assert.equal(baseline().compare(v(), b).worse.length, 2, 'the worst callback growing is still worse (both measures)');
});

test('code-quality audit 2: a createX(ports) factory in a shell is not pure logic outside core', () => {
  const root = tree({
    'src/lib/things/shell.ts': `// @layer shell
export function createThings(p: { db: { get(): Promise<number>; put(n: number): Promise<void> } }) {
  return {
    async bump() {
      const n = await p.db.get();
      await p.db.put(n + 1);
      return n + 1;
    },
  };
}
export function label(n: number) {
  const s = String(n);
  const t = s.padStart(3, '0');
  return t;
}
`,
  });
  const facts: Facts = quality().collect(root);
  const listed = only(quality().violations(facts), 'pure-outside-core').map((x) => x.name);
  assert.deepEqual(listed, ['label'], 'the factory is the shell pattern itself; the plain helper is still listed');
});

test('code-quality audit 3: code moved to another file keeps its recorded ceilings; a new swallow is still new', () => {
  const bigOnly = `// @layer shell\nexport function big(a: number) {\n  let x = a;\n${body(66)}\n  Promise.resolve(x).catch(() => {});\n  return x;\n}\n`;
  const big = `${bigOnly}export function also() {\n  Promise.resolve(1).catch(() => {});\n}\n`;
  const root = tree({ 'src/components/map/kit.ts': big, 'src/lib/keep.ts': '// @layer core\nexport const keep = 1;\n' });
  const q = quality();
  const B = baseline();
  const v = () => only(q.violations(q.collect(root)), 'fn-lines', 'swallowed', 'unused-export', 'dead-module');
  const b = B.build(v());
  git(root, 'mv', 'src/components/map/kit.ts', 'src/lib/kit.ts');
  commit(root, 'move');
  const moved = B.compare(v(), b);
  assert.deepEqual(moved.added, [], 'git mv carries every entry');
  assert.deepEqual(moved.worse, []);
  assert.ok(moved.stale.length > 0, 'the move is taken in by --tighten');
  const t = B.tighten(v(), b);
  assert.deepEqual(t.refused, []);
  assert.ok(Object.keys(t.baseline!).every((id) => !id.includes('src/components/')), 'every entry follows the file');
  assert.deepEqual(B.compare(v(), t.baseline!), { worse: [], added: [], stale: [] });
  // Half the swallows move out with `also`: the total holds, so the new file's count is carried.
  write(root, {
    'src/lib/kit.ts': bigOnly,
    'src/lib/also.ts': `// @layer shell\nexport function also() {\n  Promise.resolve(1).catch(() => {});\n}\n`,
  });
  assert.deepEqual(B.compare(only(v(), 'swallowed'), only2(t.baseline!, 'swallowed')).added, []);
  write(root, { 'src/lib/more.ts': `// @layer shell\nexport function more() {\n  Promise.resolve(2).catch(() => {});\n}\n` });
  assert.equal(B.compare(only(v(), 'swallowed'), only2(t.baseline!, 'swallowed')).added.length, 1, 'a swallow with no drop elsewhere is new');
});
const only2 = (b: Record<string, number>, metric: string) => Object.fromEntries(Object.entries(b).filter(([id]) => id.startsWith(`${metric}:`)));

test("code-quality audit 4: check --since <rev> fails a baseline looser than the one at that commit", () => {
  const root = tree({ 'src/lib/fat.ts': `// @layer core\nexport function fat() {\n  let x = 0;\n${body(66)}\n  return x;\n}\n` });
  const run = (args: string[]) => quiet(() => main()(args, root));
  assert.equal(run(['--baseline']), 0);
  commit(root, 'baseline');
  const rev = git(root, 'rev-parse', 'HEAD').trim();
  assert.equal(run(['check', '--since', rev]), 0);
  const path = join(root, 'scripts', 'quality.baseline.json');
  const b = JSON.parse(readFileSync(path, 'utf8')) as Record<string, number>;
  write(root, { 'scripts/quality.baseline.json': JSON.stringify({ ...b, 'fn-lines:src/lib/fat.ts#fat': 99 }) });
  commit(root, 'loosen by hand');
  assert.equal(run(['check', '--since', rev]), 1, 'a raised value');
  const ci = readFileSync(join(ROOT, '.github', 'workflows', 'pages.yml'), 'utf8');
  assert.match(ci, /check:quality -- --since "?\$\{?BEFORE/, 'CI judges the push against its base, as the records job does');
});

test('code-quality audit 5: a refactor commit that deletes, or renames and edits, a test is refused; the subject is read in any case', () => {
  const A = 'src/lib/__tests__/x/a.test.ts';
  const C = 'src/lib/__tests__/x/c.test.ts';
  const root = tree({ [A]: `test('a', () => {\n  assert.equal(f(), 1);\n});\n`, [C]: `test('c', () => {\n  assert.equal(h(), 1);\n});\n` });
  const start = git(root, 'rev-parse', 'HEAD').trim();
  git(root, 'rm', '-q', A);
  commit(root, 'refactor x 1: R21 the test goes');
  git(root, 'rm', '-q', C);
  write(root, { 'src/lib/__tests__/y/c.test.ts': `test('c', () => {\n  assert.equal(h(), 2);\n});\n` });
  commit(root, 'Refactor x 2: R1 moved and bent');
  const found = refactors().check(root, `${start}..HEAD`);
  assert.deepEqual([...new Set(found.map((f) => f.subject))], ['refactor x 1: R21 the test goes', 'Refactor x 2: R1 moved and bent']);
});

test('code-quality audit 6: a refactor commit may change a test\'s import lines', () => {
  const A = 'src/lib/__tests__/x/a.test.ts';
  const root = tree({ [A]: `import { f } from '../../old';\ntest('a', () => {\n  assert.equal(f(), 1);\n});\n` });
  const start = git(root, 'rev-parse', 'HEAD').trim();
  write(root, { [A]: `import { f, g } from '../../new';\ntest('a', () => {\n  assert.equal(f(), 1);\n});\n` });
  commit(root, 'refactor x 1: R6 f moves');
  assert.deepEqual(refactors().check(root, `${start}..HEAD`), []);
});

test('code-quality audit 7: check:refactor in CI reads the push\'s range, and says so when a range is unknown', () => {
  const root = tree({ 'src/a.ts': 'export const a = 1;\n' });
  assert.throws(() => refactors().check(root, 'deadbeef..HEAD'), /deadbeef\.\.HEAD/);
  const ci = readFileSync(join(ROOT, '.github', 'workflows', 'pages.yml'), 'utf8');
  assert.match(ci, /check:refactor -- --ci "?\$\{?BEFORE\}?\.\.\$\{?GITHUB_SHA/);
});

test("code-quality audit 8: a test's namespace import doesn't mark production exports used", () => {
  const root = tree({
    'src/lib/m.ts': `// @layer core\nexport const used = 1;\nexport const tested = 2;\nexport const neither = 3;\n`,
    'src/app/index.tsx': `import { used } from '../lib/m';\nexport default function H() { return <>{used}</>; }\n`,
    'src/lib/__tests__/x/m.test.ts': `import * as m from '../../m';\ntest('t', () => assert.equal(m.tested, 2));\n`,
  });
  const facts = quality().collect(root) as Facts & { testOnlyExports: { file: string; name: string }[] };
  assert.deepEqual(facts.unusedExports.filter((e) => e.file === 'src/lib/m.ts').map((e) => e.name), ['neither']);
  assert.deepEqual(facts.testOnlyExports.filter((e) => e.file === 'src/lib/m.ts').map((e) => e.name), ['tested']);
});

test('code-quality audit 9: a lowercase function that renders JSX is held to the limits', () => {
  const root = tree({
    'src/components/List.tsx': `export function List({ a }: { a: number }) {
  const renderRow = (n: number) => {
${branchy(16, 'n')}
    return <>{n}</>;
  };
  return <>{renderRow(a)}</>;
}
`,
  });
  const v = only(quality().violations(quality().collect(root)), 'fn-branches');
  assert.deepEqual(v.map((x) => x.name), ['renderRow']);
});

test('code-quality audit 10: the limits are pinned here, and an @instance file is no way around shell-singleton', () => {
  const { LIMITS } = load(join(ROOT, 'scripts', 'quality', 'limits.js')) as { LIMITS: Record<string, { limit: number | null }> };
  const pinned = Object.fromEntries(Object.entries(LIMITS).map(([k, l]) => [k, l.limit]));
  assert.deepEqual(pinned, {
    'file-lines': 400, 'fn-lines': 60, 'fn-branches': 15, nesting: 4, 'component-lines': 250, 'component-hooks': 20, 'component-props': 10,
    'shell-branches': 8, 'pure-outside-core': null, swallowed: 0, floating: 0, 'cloned-lines': 0, 'unused-export': null, cycle: null,
    'shell-singleton': null, 'lib-imports-view': null, 'local-time': 0, 'context-call': null, 'param-mutation': null, 'dead-module': null,
    'platform-os': 0, colour: 0, 'hook-deps': 0, 'derived-state': null, 'fresh-selector': 0, 'no-assertion': null,
  }, 'a limit changes only with the owner, and this table with it (decision 0178)');
  const root = tree({
    'src/lib/db/index.ts': `// @layer adapter\nexport const db = { get: async () => 1 };\n`,
    'src/lib/sneaky/index.ts': `// @layer shell\n// @instance: not really\nimport { db } from '../db';\nexport async function work() {\n  const a = await db.get();\n  const b = a + 1;\n  return b * 2;\n}\n`,
    'src/lib/real/index.ts': `// @layer shell\n// @instance: the app's things\nimport { db } from '../db';\nimport { createThings } from './shell';\nexport const things = createThings({ db });\n`,
    'src/lib/real/shell.ts': `// @layer shell\nexport const createThings = (p: { db: { get(): Promise<number> } }) => ({ get: () => p.db.get() });\n`,
  });
  assert.deepEqual(quality().collect(root).shellsOnSingletons.map((s) => s.file), ['src/lib/sneaky/index.ts']);
});

test('code-quality audit 11: check:affected runs the gate after the tests, typecheck and lint', () => {
  const src = readFileSync(join(ROOT, 'scripts', 'affected.js'), 'utf8');
  const line = src.split('\n').find((l) => l.includes("step('quality'") && l.includes("step('lint'"));
  assert.ok(line, 'the check steps are on one line');
  assert.ok(line.indexOf("step('quality'") > line.indexOf("step('lint'"), 'quality comes last');
});

test('code-quality audit 12: an unknown --scope feature is refused', () => {
  const root = tree({ 'src/lib/rides.ts': `// @layer core\nexport const r = 1;\n` });
  assert.equal(quiet(() => main()(['--baseline'], root)), 0);
  assert.equal(quiet(() => main()(['--scope', 'recordng'], root)), 2);
  assert.equal(quiet(() => main()(['--scope', 'rides'], root)), 0);
});

test('code-quality audit 13: the common ways around the error and React analyzers are counted', () => {
  const root = tree({
    'src/lib/errs.ts': `// @layer shell
const a = (x: number) => x;
export async function run(p: Promise<number>) {
  p.catch(() => { return; });
  p.then(a, () => {});
  try {
    await p;
  } catch {
    return null;
  }
  try {
    await p;
  } catch (e) {
    return a(Number(e));
  }
  return 0;
}
`,
    'src/components/P.tsx': `import { Platform, useEffect } from 'react-native';
export function P() {
  const pad = Platform.select({ web: 1, default: 2 });
  const c = 'hsl(10, 20%, 30%)';
  // eslint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps
  useEffect(() => {}, []);
  return <>{pad}{c}</>;
}
`,
  });
  const facts = quality().collect(root);
  assert.equal(facts.files['src/lib/errs.ts'].silentCatches, 3, 'return; and then(a, () => {}) and catch { return null }; the handled catch is not');
  assert.equal(facts.patterns.platformBranches.filter((x) => x.file === 'src/components/P.tsx').length, 1, 'Platform.select');
  assert.equal(facts.files['src/components/P.tsx'].hexColors, 1, 'hsl()');
  assert.equal(facts.files['src/components/P.tsx'].hookDepSuppressions, 1, 'a suppression listing another rule first');
});
