import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

// The layer reader is plain CommonJS, shared with eslint.config.js.
type Layers = {
  LAYERS: string[];
  readLayer(source: string): { layer?: string; error?: string };
  readLayers(root: string): { layers: Map<string, string | null>; untagged: { file: string; message: string }[] };
  coreViolations(root: string): { id: string; message: string }[];
  check(root: string, baseline: string[]): { untagged: string[]; added: string[]; stale: string[] };
  filesOfLayer(root: string, layer: string): string[];
  coreLintRules: Record<string, unknown>;
  FC5_RULE: string;
  viewSingletonRule: unknown[];
};
type Message = { ruleId: string | null; message: string; line: number };
type ESLintClass = new (o: object) => { lintText(code: string, o: { filePath: string }): Promise<{ messages: Message[] }[]> };

const ROOT = join(__dirname, '..', '..', '..');
const load = createRequire(__filename);
const layers = load(join(ROOT, 'scripts', 'layers.js')) as Layers;
const { ESLint } = load('eslint') as { ESLint: ESLintClass };
// The TypeScript parser, as eslint-config-expo (a declared dependency) resolves it.
const tsParser = createRequire(load.resolve('eslint-config-expo/flat'))('@typescript-eslint/parser') as object;
const BASELINE = join(__dirname, 'layers.baseline.json');

const tmp = mkdtempSync(join(tmpdir(), 'layers-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
let trees = 0;
/** A throwaway repo root with the given src/lib files. */
function tree(files: Record<string, string>): string {
  const root = join(tmp, `t${++trees}`);
  for (const [rel, src] of Object.entries(files)) {
    const p = join(root, 'src', 'lib', rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, src);
  }
  return root;
}

/** Lints a TypeScript snippet with only the given rules: this repo's rules, not the whole Expo config. */
async function lint(rules: Record<string, unknown>, code: string): Promise<Message[]> {
  const eslint = new ESLint({
    cwd: tmp,
    overrideConfigFile: true,
    overrideConfig: [{ files: ['**/*.ts'], languageOptions: { parser: tsParser }, rules }],
  });
  const [r] = await eslint.lintText(code, { filePath: join(tmp, 'x.ts') });
  return r.messages;
}

test('FC1 every src/lib module declares one known layer on its first line', () => {
  const { layers: found, untagged } = layers.readLayers(ROOT);
  assert.ok(found.size > 100, `found only ${found.size} modules: the walk is broken`);
  assert.deepEqual(untagged.map((u) => u.message), []);
});

test('FC1 a missing, unknown, misplaced or doubled layer is named with the four layers', () => {
  assert.deepEqual(layers.readLayer('// @layer core\nexport const a = 1;\n'), { layer: 'core' });
  const cases = [
    ['export const a = 1;\n', /no layer on its first line/],
    ['// @layer pure\n', /unknown layer "pure"/],
    ['/** doc */\n// @layer core\n', /no layer on its first line/],
    ['// @layer core\n// @layer shell\n', /more than one @layer line/],
  ] as const;
  for (const [src, why] of cases) {
    const r = layers.readLayer(src);
    assert.equal(r.layer, undefined, src);
    assert.match(r.error ?? '', why);
    assert.match(r.error ?? '', /core\|shell\|adapter\|view/);
  }
});

test('FC2 core imports only core, pure packages, JSON and types', () => {
  const root = tree({
    'a.ts': [
      '// @layer core',
      "import { b } from './b';",
      "import type { S } from './s';",
      "import { type T } from './s';",
      "import { unzip } from 'fflate';",
      "import data from './data.json';",
      "export { b2 } from './b';",
      'export const a = b;',
    ].join('\n'),
    'b.ts': '// @layer core\nexport const b = 1; export const b2 = 2;\n',
    's.ts': '// @layer shell\nexport type S = 1; export type T = 2;\n',
    'data.json': '{}',
  });
  assert.deepEqual(layers.coreViolations(root), []);
});

test('FC2 a core import of another layer, a view or a platform package names the import, what it reaches and the fix', () => {
  const root = tree({
    'a.ts': [
      '// @layer core',
      "import { s } from './s';",
      "import { Platform } from 'react-native';",
      "import { X } from '../components/X';",
      "export * from './d';",
    ].join('\n'),
    's.ts': '// @layer shell\nexport const s = 1;\n',
    'd/index.ts': '// @layer adapter\nexport const d = 1;\n',
  });
  mkdirSync(join(root, 'src', 'components'), { recursive: true });
  writeFileSync(join(root, 'src', 'components', 'X.tsx'), 'export const X = 1;\n');
  const v = layers.coreViolations(root);
  assert.deepEqual(
    v.map((x) => x.id),
    ['src/lib/a.ts -> ./s', 'src/lib/a.ts -> react-native', 'src/lib/a.ts -> ../components/X', 'src/lib/a.ts -> ./d'],
  );
  assert.match(v[0].message, /src\/lib\/a\.ts:2 is core but imports '\.\/s', which reaches src\/lib\/s\.ts \(shell\)/);
  assert.match(v[1].message, /reaches the package react-native/);
  assert.match(v[2].message, /outside src\/lib: a view/);
  assert.match(v[3].message, /src\/lib\/d\/index\.ts \(adapter\)/);
  for (const x of v) assert.match(x.message, /pass the value in as an argument, import only its type .* or move this code to a shell/);
});

test('FC4 a new violation fails, and a baseline entry that no longer occurs fails until it is removed', () => {
  const root = tree({
    'a.ts': "// @layer core\nimport { s } from './s';\nexport const a = s;\n",
    's.ts': '// @layer shell\nexport const s = 1;\n',
  });
  const fresh = layers.check(root, []);
  assert.equal(fresh.added.length, 1);
  assert.deepEqual(layers.check(root, ['src/lib/a.ts -> ./s']), { untagged: [], added: [], stale: [] });
  const stale = layers.check(root, ['src/lib/a.ts -> ./s', 'src/lib/gone.ts -> ./x']);
  assert.deepEqual(stale.added, []);
  assert.equal(stale.stale.length, 1);
  assert.match(stale.stale[0], /"src\/lib\/gone\.ts -> \.\/x" is in the baseline but no longer occurs: delete it/);
});

test('FC2 FC4 the real tree has no core violation outside its baseline, and no stale baseline entry', () => {
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as string[];
  const r = layers.check(ROOT, baseline);
  assert.deepEqual(r.added, [], 'a core module imports something that is not core');
  assert.deepEqual(r.stale, [], 'the baseline only shrinks');
});

test('FC3 lint flags the clock, randomness, timers and module-level state in core, at the line, with the fix', async () => {
  const code = [
    'export const a = () => Date.now();',
    'export const b = () => Math.random();',
    'export const c = () => new Date();',
    'export const d = () => performance.now();',
    'export const e = () => setTimeout(() => {}, 1);',
    'export const f = () => setInterval(() => {}, 1);',
    'export const g = () => requestAnimationFrame(() => {});',
    'let h = 0;',
    'export let i = 0;',
    'var j = 0;',
  ].join('\n');
  const m = await lint(layers.coreLintRules, code);
  assert.deepEqual(m.map((x) => x.line), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  for (const x of m.slice(0, 7)) assert.match(x.message, /argument instead|moves to a shell/);
  for (const x of m.slice(7)) assert.match(x.message, /Module-level let or var/);
});

test('FC3 core may still use a given time, local state and pure helpers', async () => {
  const code = [
    'export const a = (t: number) => new Date(t).getHours();',
    'export function b(xs: number[]) { let s = 0; for (const x of xs) s += x; return s; }',
    'export const c = Math.max(1, 2);',
    'const LIMIT = 3;',
    'export const d = LIMIT;',
  ].join('\n');
  assert.deepEqual(await lint(layers.coreLintRules, code), []);
});

// That every core file and every view gets these rules from eslint.config.js, after all its
// overrides, is `functional-core audit 9` (functionalCoreAudit.test.ts).

test('FC5 a view importing the db, recorder, notifier or ports is flagged with the fix; a type import is not', async () => {
  const rules = { [layers.FC5_RULE]: layers.viewSingletonRule };
  const code = [
    "import { db } from '../lib/db';",
    "import { recorder } from '../../lib/recorder';",
    "import { notifier } from '../lib/notify';",
    "import { db as d2 } from './db/index.web';",
    "import { ports } from '../lib/ports';",
    "import * as dbm from '../lib/db';",
    "import type { Db } from '../lib/db';",
    "import { type Recorder } from '../lib/recorder/types';",
    "import { feedback } from '../lib/motion';",
  ].join('\n');
  const m = await lint(rules, code);
  assert.deepEqual(m.map((x) => x.line), [1, 2, 3, 4, 5, 6]);
  for (const x of m) assert.match(x.message, /Call a feature shell instead/);
});
