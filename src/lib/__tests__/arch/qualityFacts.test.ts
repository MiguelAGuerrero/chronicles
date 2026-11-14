// @tree-wide: the code-quality analyzers (scripts/quality), each against a fixture and a look-alike
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { body, cleanup, commit, quality, tree, write, type Facts } from './qualityFixture';

// Specs: specs/code-quality/spec.md, CQ2-CQ7. Each analyzer finds its case and leaves the look-alike alone.

after(cleanup);

const fn = (f: Facts, file: string, name: string) => {
  const found = f.functions.find((x) => x.file === file && x.name === name);
  assert.ok(found, `${file} ${name} is measured`);
  return found;
};
const listed = (f: Facts, key: string, file: string) => (f.patterns[key] || []).filter((x) => x.file === file);

test('CQ2 lines, branches, nesting, parameters, hooks and props have known answers', () => {
  const root = tree({
    'src/lib/shape.ts': `// @layer core
export function f(a: number, b: number, c: number) {
  if (a > 0) {
    for (const x of [1]) {
      if (x && b) c++;
    }
  }
  return a ? b : c;
}
`,
    'src/components/Wide.tsx': `import { useEffect, useState } from 'react';
export function Wide({ a, b, c, d, e, f, g, h, i, j, k }: Record<string, number>) {
  const [n, setN] = useState(0);
  const [m] = useState(1);
  useEffect(() => setN(a), [a]);
  return <>{n + m + b + c + d + e + f + g + h + i + j + k}</>;
}
export function Narrow({ a, b, c, d, e, f, g, h, i, j }: Record<string, number>) {
  return <>{a + b + c + d + e + f + g + h + i + j}</>;
}
`,
  });
  const facts = quality().collect(root);
  const f = fn(facts, 'src/lib/shape.ts', 'f');
  assert.equal(f.lines, 8);
  assert.equal(f.params, 3);
  assert.equal(f.complexity, 6, 'if, for, if, &&, ?: and the path itself');
  assert.equal(f.maxNesting, 3);
  assert.equal(facts.files['src/lib/shape.ts'].lines, 9, 'as an editor counts them: the last newline ends a line');
  assert.equal(facts.files['src/lib/shape.ts'].code, 8, 'the layer line is a comment');
  const w = fn(facts, 'src/components/Wide.tsx', 'Wide');
  assert.deepEqual(w.hooks, { useState: 2, useEffect: 1 });
  assert.equal(w.hookCount, 3);
  assert.deepEqual(listed(facts, 'wideProps', 'src/components/Wide.tsx').map((x) => [x.component, x.props]), [['Wide', 11]]);
});

test('CQ3 purity and the layer findings: each with a look-alike that passes', () => {
  const root = tree({
    'src/lib/db/index.ts': `// @layer adapter
export const db = { get: async () => 1 };
`,
    'src/lib/calc.ts': `// @layer core
export function double(xs: number[]) {
  return xs.map((x) => x * 2);
}
export function stamp() {
  return Date.now();
}
export function hourOf(t: number) {
  return new Date(t).getHours();
}
export function remember(seen: Map<string, number>, k: string) {
  seen.set(k, 1);
  return seen;
}
function fill(out: number[], n: number) {
  out.push(n);
}
export function filled(n: number) {
  const out: number[] = [];
  fill(out, n);
  return out;
}
`,
    'src/lib/hourShell.ts': `// @layer shell
export function hourHere(t: number) {
  return new Date(t).getHours();
}
`,
    'src/lib/onDb.ts': `// @layer shell
import { db } from './db';
export async function read() {
  return db.get();
}
`,
    'src/lib/factory.ts': `// @layer shell
import type { db } from './db';
export function createRead(p: { db: typeof db }) {
  return () => p.db.get();
}
`,
    'src/lib/decides.ts': `// @layer shell
export function nine(a: number) {
  if (a === 1) return 1;
  if (a === 2) return 2;
  if (a === 3) return 3;
  if (a === 4) return 4;
  if (a === 5) return 5;
  if (a === 6) return 6;
  if (a === 7) return 7;
  if (a === 8) return 8;
  return 0;
}
export function eight(a: number) {
  if (a === 1) return 1;
  if (a === 2) return 2;
  if (a === 3) return 3;
  if (a === 4) return 4;
  if (a === 5) return 5;
  if (a === 6) return 6;
  if (a === 7) return 7;
  return 0;
}
`,
    'src/lib/leans.ts': `// @layer core
import type { Props } from '../components/View';
import { tint } from '../components/View';
export const t: Props = { a: tint(1) };
`,
    'src/components/View.tsx': `import { useState } from 'react';
export type Props = { a: number };
export function tint(n: number) {
  let x = n;
${body(4)}
  return x;
}
export function useTint() {
  const [n] = useState(0);
${body(4, 'n')}
  return n;
}
`,
  });
  const facts = quality().collect(root);
  assert.equal(fn(facts, 'src/lib/calc.ts', 'double').pure, true);
  assert.equal(fn(facts, 'src/lib/calc.ts', 'stamp').pure, false);
  assert.match(fn(facts, 'src/lib/calc.ts', 'stamp').impurity!.join(), /hidden input: Date\.now/);
  assert.equal(facts.files['src/components/View.tsx'].pureOutsideCore, 1, 'tint is listed; the hook is not');
  assert.deepEqual(listed(facts, 'localTime', 'src/lib/calc.ts').length, 1);
  assert.deepEqual(listed(facts, 'localTime', 'src/lib/hourShell.ts'), [], 'a shell may read local time');
  const mut = listed(facts, 'paramMutation', 'src/lib/calc.ts').filter((x) => x.exported);
  assert.deepEqual(mut.map((x) => x.fn), ['remember'], "a private helper filling its caller's accumulator is not listed");
  assert.deepEqual(facts.shellDecisions.map((x) => x.name), ['nine']);
  assert.deepEqual(facts.shellsOnSingletons.map((x) => x.file), ['src/lib/onDb.ts']);
  assert.deepEqual(facts.libImportsViews.map((x) => `${x.file} ${x.spec}`), ['src/lib/leans.ts ../components/View'], 'a type-only import is fine');
});

test('CQ4 swallowed errors and floating promises: each with a look-alike that passes', () => {
  const root = tree({
    'src/lib/errs.ts': `// @layer shell
async function work() {
  return 1;
}
function handle(e: unknown) {
  return e;
}
export async function run() {
  work().catch(() => {});
  work().catch(() => undefined);
  try {
    await work();
  } catch {}
  work().catch(handle);
  try {
    await work();
  } catch (e) {
    handle(e);
  }
  work();
  void work();
  await work();
  work().then(handle, handle);
}
`,
  });
  const facts = quality().collect(root, { types: true });
  assert.equal(facts.files['src/lib/errs.ts'].silentCatches, 3);
  assert.equal(facts.files['src/lib/errs.ts'].floatingPromises, 1, 'only the bare work(): void, await, catch and then(a, b) handle it');
});

test('CQ5 the React findings: each with a look-alike that passes', () => {
  const root = tree({
    'src/components/R.tsx': `import { Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/useStore';
export function R({ y }: { y: number }) {
  const [x, setX] = useState(0);
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const ref = useRef(0);
  const pick = useStore(null, (s: { a: number }) => ({ a: s.a }));
  const one = useStore(null, (s: { a: number }) => s.a);
  useEffect(() => {
    setX(y * 2);
  }, [y]);
  useEffect(() => {
    ref.current = y;
    setX(1);
  }, [y]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {}, []);
  const one1 = () => { setA(1); setB(1); setC(1); };
  const two = () => { setA(2); setB(2); setC(2); };
  const three = () => { setA(3); setB(3); setC(3); };
  const color = Platform.OS === 'web' ? '#ffffff' : 'rgba(0,0,0,0.5)';
  return <>{x + a + b + c + pick.a + one}{color}{String(one1)}{String(two)}{String(three)}{'#notacolour'}</>;
}
export function S() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  const one = () => { setA(1); setB(1); setC(1); };
  const two = () => { setA(2); setB(2); setC(2); };
  return <>{a + b + c}{String(one)}{String(two)}</>;
}
`,
    'src/components/R.web.tsx': `import { Platform } from 'react-native';
export const os = Platform.OS;
`,
    'src/lib/useStore.ts': `// @layer view
export function useStore<T, U>(_s: T, f: (s: { a: number }) => U): U {
  return f({ a: 1 });
}
`,
  });
  const facts = quality().collect(root);
  const R = 'src/components/R.tsx';
  assert.deepEqual(listed(facts, 'derivedStateEffects', R).map((x) => x.sets), [['setX']], 'the effect that also writes a ref is not listed');
  assert.deepEqual(listed(facts, 'setterClusters', R).map((x) => [x.component, x.setters]), [['R', ['setA', 'setB', 'setC']]], 'two callbacks are not enough');
  assert.equal(listed(facts, 'freshSelectors', R).length, 1, 'the selector returning a field is fine');
  assert.equal(listed(facts, 'platformBranches', R).length, 1);
  assert.equal(listed(facts, 'platformBranches', 'src/components/R.web.tsx').length, 0, 'a .web file is the platform split itself');
  assert.equal(facts.files[R].hookDepSuppressions, 1);
  assert.equal(facts.files[R].hexColors, 2, '#ffffff and the rgba; #notacolour is not a colour');
});

test('CQ6 cycles, unused exports, dead modules, copies and change coupling', () => {
  const copy = (name: string, v: string) => `export function ${name}(${v}: number[]) {
  let total = 0;
  for (const item of ${v}) {
    if (item > 10) total += item * 2;
    else if (item > 5) total += item + 3;
    else total -= item;
  }
  const scaled = total / (${v}.length || 1);
  return Math.round(scaled * 100) / 100;
}
`;
  const root = tree({
    'src/lib/a.ts': `// @layer core\nimport { b } from './b';\nexport const a = () => b();\nexport const unused = 1;\n`,
    'src/lib/b.ts': `// @layer core\nimport { a } from './a';\nexport const b = (): number => (a ? 1 : 0);\n`,
    'src/lib/dead.ts': `// @layer core\nexport const dead = 1;\n`,
    'src/lib/runs.ts': `// @layer shell\nexport const w = new Worker(new URL('./work.worker', import.meta.url));\nexport const used = w;\n`,
    'src/lib/work.worker.ts': `// @layer adapter\nexport const work = 1;\n`,
    'src/app/index.tsx': `import { a } from '../lib/a';\nimport { w } from '../lib/runs';\nimport { mean } from '../lib/m1';\nimport { avg } from '../lib/m2';\nimport { ride } from '../lib/rides';\nimport { far } from '../lib/nav/far';\nexport function ErrorBoundary() { return null; }\nexport default function Home() { return <>{String(a)}{String(w)}{mean([1])}{avg([1])}{ride + far}</>; }\n`,
    'src/lib/m1.ts': `// @layer core\n${copy('mean', 'values')}`,
    'src/lib/m2.ts': `// @layer core\n${copy('avg', 'xs')}`,
    'src/lib/rides.ts': `// @layer core\nexport const ride = 0;\n`,
    'src/lib/nav/far.ts': `// @layer core\nexport const far = 0;\n`,
  });
  for (let i = 1; i <= 6; i++) {
    write(root, { 'src/lib/rides.ts': `// @layer core\nexport const ride = ${i};\n`, 'src/lib/nav/far.ts': `// @layer core\nexport const far = ${i};\n` });
    commit(root, `both ${i}`);
  }
  const facts = quality().collect(root);
  assert.deepEqual(facts.cycles, [['src/lib/a.ts', 'src/lib/b.ts']]);
  const unused = facts.unusedExports.map((x) => `${x.file} ${x.name}`);
  assert.ok(unused.includes('src/lib/a.ts unused'));
  assert.ok(!unused.some((x) => x.startsWith('src/app/')), "Expo Router's route exports count as used");
  assert.deepEqual(facts.orphans.map((x) => x.file), ['src/lib/dead.ts'], 'a worker loaded by new URL is not dead');
  assert.ok(facts.clones.some((c) => [c.a.file, c.b.file].sort().join() === 'src/lib/m1.ts,src/lib/m2.ts' && !c.exact), 'a renamed copy is a clone');
  assert.deepEqual(facts.identicalFunctions.map((g) => g.map((x) => x.name).sort()), [['avg', 'mean']]);
  assert.deepEqual(facts.coupling.pairs.map((p) => [p.a, p.b, p.commits]), [['src/lib/nav/far.ts', 'src/lib/rides.ts', 7]], 'the first commit and six more, with no import between them');
});

test('CQ7 readTrace without context, with withFilled, and with a written reason', () => {
  const root = tree({
    'src/lib/rides.ts': `// @layer core
export function readTrace(p: number[], s: number | null, pauses: number[] = [], stills: number[] = [], fills: number[] = []) {
  return [p, s, pauses, stills, fills];
}
export function withFilled<T>(t: T, _f: number[]) {
  return t;
}
`,
    'src/lib/reads.ts': `// @layer core
import { readTrace, withFilled } from './rides';
export function bare(p: number[]) {
  return readTrace(p, 0, []);
}
export function twoStep(p: number[], fills: number[]) {
  const plain = readTrace(p, 0, [], []);
  return withFilled(plain, fills);
}
export function tail(p: number[]) {
  // readTrace: the last two minutes only; no stills or fills reach that far
  return readTrace(p, 0, []);
}
export function noStills(p: number[], fills: number[]) {
  return withFilled(readTrace(p, 0, []), fills);
}
`,
  });
  const facts = quality().collect(root);
  const found = listed(facts, 'contextCalls', 'src/lib/reads.ts').map((x) => [x.line, (x.missing as string[]).join(' ')]);
  assert.deepEqual(found, [
    [4, 'stills fills'],
    [15, 'stills'],
  ]);
});
