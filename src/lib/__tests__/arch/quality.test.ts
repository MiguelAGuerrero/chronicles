// @tree-wide: the code-quality gate (scripts/quality), its baseline and the repo's own run
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { baseline, body, cleanup, commit, git, quality, ROOT, tree, write, type Violation } from './qualityFixture';

// Specs: specs/code-quality/spec.md, CQ1 and CQ8-CQ13.

after(cleanup);

const only = (v: Violation[], ...metrics: string[]) => v.filter((x) => metrics.includes(x.metric));
const fnOf = (name: string, n: number) => `export function ${name}() {\n  let x = 0;\n${body(n - 4)}\n  return x;\n}\n`;
const fileOf = (lines: number) => `// @layer core\n${Array.from({ length: lines - 1 }, (_, i) => `export const c${i} = ${i};`).join('\n')}\n`;

test('CQ1 the facts are the same bytes on two runs over a fixture tree', () => {
  const root = tree({
    'src/lib/one.ts': `// @layer core\n${fnOf('one', 12)}`,
    'src/components/Two.tsx': `export function Two() {\n  return <>{1}</>;\n}\n`,
  });
  write(root, { 'src/lib/one.ts': `// @layer core\n${fnOf('one', 14)}` });
  commit(root, 'grow');
  const q = quality();
  assert.equal(JSON.stringify(q.collect(root)), JSON.stringify(q.collect(root)));
});

test('CQ8 new code past each limit fails, naming its move', () => {
  const root = tree({
    'src/lib/long.ts': fileOf(401),
    'src/lib/fat.ts': `// @layer core\n${fnOf('fat', 61)}${fnOf('thin', 60)}`,
    'src/components/Quiet.tsx': `export function Quiet() {\n  Promise.resolve(1).catch(() => {});\n  return null;\n}\n`,
  });
  const v = quality().violations(quality().collect(root));
  const by = (metric: string) => v.filter((x) => x.metric === metric).map((x) => x.id);
  assert.deepEqual(by('file-lines'), ['file-lines:src/lib/long.ts']);
  assert.deepEqual(by('fn-lines'), ['fn-lines:src/lib/fat.ts#fat'], 'thin is at the limit, not past it');
  assert.deepEqual(by('swallowed'), ['swallowed:src/components/Quiet.tsx']);
  for (const x of v) assert.match(x.message, /R\d+/, `${x.id} names its move`);
  const { added } = baseline().compare(v, {});
  assert.equal(added.length, v.length, 'with no baseline, every violation is new');
  assert.match(added.join('\n'), /src\/lib\/long\.ts.*401.*400/);
});

test('CQ9 the baseline keys by name, so moving code within a file changes nothing', () => {
  const root = tree({ 'src/lib/fat.ts': `// @layer core\n${fnOf('fat', 70)}${fnOf('big', 65)}` });
  const q = quality();
  const v = () => only(q.violations(q.collect(root)), 'fn-lines');
  const b = baseline().build(v());
  assert.deepEqual(Object.keys(b).sort(), ['fn-lines:src/lib/fat.ts#big', 'fn-lines:src/lib/fat.ts#fat']);
  write(root, { 'src/lib/fat.ts': `// @layer core\n${fnOf('big', 65)}\n\n${fnOf('fat', 70)}` });
  commit(root, 'swap');
  assert.deepEqual(baseline().compare(v(), b), { worse: [], added: [], stale: [] });
});

test('CQ10 a recorded file or function that got worse fails; a frozen file may not grow by a line', () => {
  const root = tree({ 'src/lib/long.ts': fileOf(401), 'src/lib/fat.ts': `// @layer core\n${fnOf('fat', 61)}` });
  const q = quality();
  const v = () => only(q.violations(q.collect(root)), 'file-lines', 'fn-lines');
  const b = baseline().build(v());
  write(root, { 'src/lib/long.ts': fileOf(402), 'src/lib/fat.ts': `// @layer core\n${fnOf('fat', 62)}` });
  const { worse, added } = baseline().compare(v(), b);
  assert.deepEqual(added, []);
  assert.equal(worse.length, 2);
  assert.match(worse.join('\n'), /long\.ts.*402.*401/);
  assert.match(worse.join('\n'), /fat\.ts.*fat.*62.*61/);
});

test("CQ11 an improvement fails until tightened; tighten refuses to raise or add; no looser than main's", () => {
  const root = tree({ 'src/lib/long.ts': fileOf(405), 'src/lib/fat.ts': `// @layer core\n${fnOf('fat', 61)}` });
  const q = quality();
  const B = baseline();
  const v = () => only(q.violations(q.collect(root)), 'file-lines', 'fn-lines');
  const b = B.build(v());
  write(root, { 'src/lib/long.ts': fileOf(403), 'src/lib/fat.ts': `// @layer core\n${fnOf('fat', 50)}` });
  const better = v();
  assert.deepEqual(B.compare(better, b).stale.length, 2, 'a lower value and a fixed function are both stale');
  const t = B.tighten(better, b);
  assert.deepEqual(t.refused, []);
  assert.deepEqual(t.baseline, { 'file-lines:src/lib/long.ts': 403 });
  assert.deepEqual(B.compare(better, t.baseline!), { worse: [], added: [], stale: [] });
  write(root, { 'src/lib/long.ts': fileOf(404), 'src/lib/new.ts': `// @layer core\n${fnOf('fresh', 70)}` });
  const worse = B.tighten(v(), t.baseline!);
  assert.equal(worse.baseline, null, 'nothing is written');
  assert.equal(worse.refused.length, 2, 'a raise and an addition are both refused');
  assert.deepEqual(B.looser({ a: 3, b: 1 }, { a: 2 }).sort(), ['a', 'b']);
  assert.deepEqual(B.looser({ a: 1 }, { a: 2, b: 1 }), []);
});

test('CQ11 the repo baseline is no looser than the one at the merge base with main', () => {
  const B = baseline();
  const ours = JSON.parse(readFileSync(join(ROOT, 'scripts', 'quality.baseline.json'), 'utf8')) as Record<string, number>;
  let base: string | null = null;
  for (const ref of ['origin/main', 'main']) {
    try {
      base = execFileSync('git', ['merge-base', 'HEAD', ref], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      break;
    } catch {
      // try the next
    }
  }
  if (!base) return;
  let theirs: Record<string, number>;
  try {
    theirs = JSON.parse(execFileSync('git', ['show', `${base}:scripts/quality.baseline.json`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return; // main has no baseline yet: this branch writes the first
  }
  assert.deepEqual(B.looser(ours, theirs), [], 'an entry main lacks, or a value above main\'s: fix the code, never the baseline');
});

test('CQ12 the repo passes its gate, and check:affected and CI run check:quality', () => {
  const r = spawnSync('node', [join(ROOT, 'scripts', 'quality'), 'check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const affected = readFileSync(join(ROOT, 'scripts', 'affected.js'), 'utf8');
  assert.match(affected, /check:quality|quality['"], ['"]check/, 'check:affected runs the gate');
  const ci = readFileSync(join(ROOT, '.github', 'workflows', 'pages.yml'), 'utf8');
  assert.match(ci, /npm run check:quality/);
  assert.match(ci, /npm run check:refactor/);
});

test("CQ13 the scope follows the changed files' features and the queue is ranked by commits times branches", () => {
  const branchy = (name: string, n: number) =>
    `export function ${name}(a: number) {\n${Array.from({ length: n }, (_, i) => `  if (a === ${i}) return ${i};`).join('\n')}\n  return -1;\n}\n`;
  const root = tree({
    'src/lib/nav/a.ts': `// @layer core\n${branchy('pickA', 6)}`,
    'src/lib/nav/b.ts': `// @layer core\n${branchy('pickB', 2)}`,
    'src/lib/rides.ts': `// @layer core\n${branchy('ride', 2)}`,
  });
  git(root, 'checkout', '-q', '-b', 'work');
  for (let i = 0; i < 3; i++) {
    write(root, { 'src/lib/nav/a.ts': `// @layer core\n${branchy('pickA', 6)}// ${i}\n` });
    commit(root, `a ${i}`);
  }
  const q = quality();
  const facts = q.collect(root);
  assert.deepEqual(q.scopeFiles(root, facts), ['src/lib/nav/a.ts', 'src/lib/nav/b.ts']);
  assert.deepEqual(q.scopeFiles(root, facts, { feature: 'rides' }), ['src/lib/rides.ts']);
  const items = q.queue(facts, q.scopeFiles(root, facts));
  assert.ok(items.length >= 2);
  assert.equal(items[0].file, 'src/lib/nav/a.ts', 'four commits of seven branches outrank one of three');
  for (const it of items) {
    assert.match(it.move, /^R\d+$/);
    assert.ok(it.line > 0 && it.evidence.length > 0);
  }
  assert.ok(!items.some((it) => it.file === 'src/lib/rides.ts'), 'out of scope');
});
