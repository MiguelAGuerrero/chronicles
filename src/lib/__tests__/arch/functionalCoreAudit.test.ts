// @tree-wide: every module's layer and lint config, the baselines, the declared dependencies
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { after, test } from 'node:test';
import { metaStore } from '../../meta';
import { fakePorts, memoryDb } from '../fakes';
import { metaKeysIn } from '../metaKeys';

// Regression tests for the functional-core audit (specs/functional-core/spec.md, "Audit").

type Layers = {
  readLayers(root: string): { layers: Map<string, string | null> };
  coreViolations(root: string): { id: string; message: string }[];
  filesOfLayer(root: string, layer: string): string[];
  coreLintRules: Record<string, unknown>;
  FC5_RULE: string;
};
type Message = { ruleId: string | null; message: string; line: number };
type Config = { rules?: Record<string, unknown> };
type ESLintLike = {
  lintText(code: string, o: { filePath: string }): Promise<{ messages: Message[] }[]>;
  calculateConfigForFile(file: string): Promise<Config>;
};

const ROOT = join(__dirname, '..', '..', '..', '..');
const TESTS = join(__dirname, '..');
const load = createRequire(__filename);
const layers = load(join(ROOT, 'scripts', 'layers.js')) as Layers;
const { ESLint } = load('eslint') as { ESLint: new (o: object) => ESLintLike };

const tmp = mkdtempSync(join(tmpdir(), 'fc-audit-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
let trees = 0;
function tree(files: Record<string, string>): string {
  const root = join(tmp, `t${++trees}`);
  for (const [rel, src] of Object.entries(files)) {
    const p = join(root, 'src', 'lib', rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, src);
  }
  return root;
}

/** The repo's own lint config (eslint.config.js), as `npm run lint` uses it. */
let real: ESLintLike | null = null;
function realLint(): ESLintLike {
  real ??= new ESLint({ cwd: ROOT });
  return real;
}
async function lintAs(file: string, code: string): Promise<Message[]> {
  const [r] = await realLint().lintText(code, { filePath: join(ROOT, file) });
  return r.messages.filter((m) => m.ruleId !== null);
}

/** The core rules alone, over TypeScript. */
async function lintCore(code: string): Promise<Message[]> {
  const parser = createRequire(load.resolve('eslint-config-expo/flat'))('@typescript-eslint/parser') as object;
  const eslint = new ESLint({
    cwd: tmp,
    overrideConfigFile: true,
    overrideConfig: [{ files: ['**/*.ts'], languageOptions: { parser }, rules: layers.coreLintRules }],
  });
  const [r] = await eslint.lintText(code, { filePath: join(tmp, 'x.ts') });
  return r.messages;
}

const SUPPRESSIONS = join(ROOT, 'eslint-suppressions.json');
const suppressions = () => JSON.parse(readFileSync(SUPPRESSIONS, 'utf8')) as Record<string, Record<string, { count: number }>>;

test('functional-core audit 1: no suppressed count can hide a Modal, Reanimated, haptics or audio-mode import, or a hidden input in core', () => {
  assert.notEqual(layers.FC5_RULE, 'no-restricted-imports', 'FC5 must not share its rule with the older import boundaries');
  const core = new Set(layers.filesOfLayer(ROOT, 'core'));
  for (const [file, rules] of Object.entries(suppressions())) {
    assert.ok(!core.has(file), `${file} is core and has suppressions: core keeps none`);
    assert.deepEqual(Object.keys(rules), [layers.FC5_RULE], `${file}: only FC5's singleton imports may be suppressed`);
  }
});

test('functional-core audit 2: a core module that mutates a module-level Map, Set or array is a violation; a read-only one is not', () => {
  const root = tree({
    'a.ts': '// @layer core\nconst seen = new Map<string, number>();\nexport const f = (k: string) => { seen.set(k, 1); };\n',
    'b.ts': "// @layer core\nconst KINDS = new Set(['a', 'b']);\nexport const g = (k: string) => KINDS.has(k);\n",
    'c.ts': '// @layer core\nconst queue: number[] = [];\nexport const h = (n: number) => queue.push(n);\n',
  });
  const v = layers.coreViolations(root).map((x) => x.id);
  assert.deepEqual(v.sort(), ['src/lib/a.ts holds seen', 'src/lib/c.ts holds queue']);
  assert.match(layers.coreViolations(root)[0].message, /module-level state .* shell/);
});

test('functional-core audit 3: core require(), import() and every platform file of a split are checked', () => {
  const root = tree({
    'a.ts': [
      '// @layer core',
      "const rn = require('react-native');",
      "export const s = () => require('./s');",
      "export const lazy = () => import('./s');",
      "import { p } from './plat';",
      "import { q } from './plat2';",
    ].join('\n'),
    's.ts': '// @layer shell\nexport const s = 1;\n',
    'plat.ts': '// @layer core\nexport const p = 1;\n',
    'plat.native.ts': "// @layer adapter\nexport const p = 2;\n",
    'plat2.native.ts': '// @layer core\nexport const q = 1;\n',
    'plat2.web.ts': '// @layer adapter\nexport const q = 2;\n',
  });
  const ids = [...new Set(layers.coreViolations(root).map((x) => x.id))].sort();
  assert.deepEqual(ids, ['src/lib/a.ts -> ./plat', 'src/lib/a.ts -> ./plat2', 'src/lib/a.ts -> ./s', 'src/lib/a.ts -> react-native']);
  const plat = layers.coreViolations(root).find((x) => x.id === 'src/lib/a.ts -> ./plat');
  assert.match(plat?.message ?? '', /plat\.native\.ts \(adapter\)/);
});

test('functional-core audit 4: fakePorts recorder.emit appends the fix to the fake db before subscribers hear it', async () => {
  const p = fakePorts();
  await p.recorder.start('w1');
  let seen: number | null = null;
  p.recorder.subscribe(() => {
    void p.db.getPoints('w1').then((pts) => (seen = pts.length));
  });
  await p.recorder.emit({ walk_id: 'w1', t: 1, lat: 41.812, lon: -71.4, accuracy_m: 5, speed: null, course: null });
  await new Promise((r) => setImmediate(r));
  assert.equal(seen, 1);
  assert.equal((await p.db.getPoints('w1')).length, 1);
});

test('functional-core audit 5: a view importing ports is flagged: views call a shell, never the ports', async () => {
  const m = await lintAs('src/app/walk.tsx', "import { ports } from '../lib/ports';\nexport const a = ports;\n");
  assert.equal(m.filter((x) => x.ruleId === layers.FC5_RULE).length, 1);
});

test('functional-core audit 6: meta keys in double quotes, other constant names, function builders and templates are found; an unreadable key is named', () => {
  const r = metaKeysIn([
    { file: 'a.ts', source: 'db.setMeta("hint_stop", "1");' },
    { file: 'b.ts', source: "const HINT = 'seen_2';\ndb.getMeta(HINT);" },
    { file: 'c.ts', source: 'export function dayKey(d: string) { return `day_x:${d}`; }\ndb.getMeta(dayKey(d));' },
    { file: 'd.ts', source: 'db.setMeta(`tpl_${x}`, v);' },
    { file: 'e.ts', source: 'db.setMeta(someVar, v);' },
  ]);
  assert.deepEqual([...r.keys].sort(), ['hint_stop', 'seen_2']);
  assert.deepEqual([...r.families].sort(), ['day_x', 'tpl_']);
  assert.deepEqual(r.unreadable, ['e.ts: setMeta(someVar, …)']);
});

test('functional-core audit 7: the baselines never grow past slice 1', () => {
  // Slice 1's baselines (2026-11-03). Lower a number or delete a line as violations are fixed; never raise one.
  const LAYERS_CEILING = ['src/lib/format.ts -> ./units', 'src/lib/scaleBar.ts -> ./units'];
  // 26: the rule landed on main (Nov 4) after main's launch commit (NV2 launch) added _layout.tsx's db import.
  // 24: Navigate, ready (Nov 4): navigate.tsx is an entry route, and the ready screen's effects are lib/ready.
  const SUPPRESSED_CEILING = 24;
  const baseline = JSON.parse(readFileSync(join(__dirname, '..', 'layers.baseline.json'), 'utf8')) as string[];
  for (const id of baseline) assert.ok(LAYERS_CEILING.includes(id), `${id} is new in layers.baseline.json: fix it instead`);
  const total = Object.values(suppressions()).reduce((n, rules) => n + Object.values(rules).reduce((k, r) => k + r.count, 0), 0);
  assert.ok(total <= SUPPRESSED_CEILING, `${total} suppressed violations, over slice 1's ${SUPPRESSED_CEILING}: fix the new ones instead`);
});

test('functional-core audit 8: FC5 flags only the db, recorder, notifier and ports bindings, not other values from their modules', async () => {
  const code = [
    "import { PAUSE_REMIND_MS, loadNoticePrefs } from '../lib/notify';",
    "import { notifier } from '../lib/notify';",
    "import { db } from '../lib/db';",
    "import { recorder } from '../lib/recorder';",
    "import type { Db } from '../lib/db/types';",
    'export const a = [PAUSE_REMIND_MS, loadNoticePrefs, notifier, db, recorder];',
  ].join('\n');
  const m = (await lintAs('src/app/walk.tsx', code)).filter((x) => x.ruleId === layers.FC5_RULE);
  assert.deepEqual(m.map((x) => x.line), [2, 3, 4]);
  for (const x of m) assert.match(x.message, /feature shell/);
});

test('FC3 FC5 functional-core audit 9: after every override, each view keeps the four old boundaries and FC5, and each core file the core rules', async () => {
  const eslint = realLint();
  const views = [
    ...listFiles(join(ROOT, 'src', 'app')),
    ...listFiles(join(ROOT, 'src', 'components')),
    ...layers.filesOfLayer(ROOT, 'view').map((f) => join(ROOT, f)),
  ];
  const WRAPPERS = ['src/components/Modal.tsx'];
  for (const file of views) {
    const rel = relative(ROOT, file);
    const c = await eslint.calculateConfigForFile(file);
    const fc5 = JSON.stringify(c.rules?.[layers.FC5_RULE] ?? null);
    assert.match(fc5, /feature shell/, `${rel} is not held to FC5`);
    if (!WRAPPERS.includes(rel)) assert.match(JSON.stringify(c.rules?.['no-restricted-imports'] ?? null), /components\/Modal/, `${rel} lost the Modal boundary`);
  }
  for (const rel of layers.filesOfLayer(ROOT, 'core')) {
    const c = await eslint.calculateConfigForFile(join(ROOT, rel));
    assert.match(JSON.stringify(c.rules?.['no-restricted-properties'] ?? null), /Date/, `${rel} is not held to the core rules`);
  }
});

test('functional-core audit 10: lint flags Date(), globalThis.Date.now, crypto, queueMicrotask and window timers in core; declare let is fine', async () => {
  const code = [
    'export const a = () => Date();',
    'export const b = () => globalThis.Date.now();',
    'export const c = () => crypto.randomUUID();',
    'export const d = () => queueMicrotask(() => {});',
    'export const e = () => window.setTimeout(() => {}, 1);',
    'export const f = () => globalThis.performance.now();',
    'export const g = () => requestIdleCallback(() => {});',
    'declare let h: number;',
  ].join('\n');
  const m = await lintCore(code);
  assert.deepEqual(m.map((x) => x.line), [1, 2, 3, 4, 5, 6, 7]);
});

test('functional-core audit 11: modules holding only types, and pure row codecs, are core', () => {
  const { layers: all } = layers.readLayers(ROOT);
  for (const rel of ['src/lib/db/types.ts', 'src/lib/db/placeRow.ts', 'src/lib/db/exploreRow.ts', 'src/lib/db/segmentBounds.ts']) {
    assert.equal(all.get(rel), 'core', rel);
  }
  for (const [rel, layer] of all) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const typesOnly = !/^\s*(export\s+)?(default\s+)?(const|let|var|function|async|class|enum)\b/m.test(body) && !/^\s*export\s*\{(?![^}]*\btype\b)/m.test(body) && !/^\s*export\s*\*/m.test(body);
    if (typesOnly) assert.equal(layer, 'core', `${rel} holds only types: tag it core`);
  }
});

test('functional-core audit 12: metaStore.get reads a stored value of the wrong shape as null', async () => {
  const db = memoryDb();
  const m = metaStore(db);
  const cases: [Parameters<typeof m.get>[0], string][] = [
    ['nav', '{"walk_id":null,"dest":{}}'],
    ['nav', '{"walk_id":3,"dest":{"at":[1,2],"label":"x","kind":"pin"}}'],
    ['units', 'yards'],
    ['start_mode', 'run'],
    ['notify_off', '{"a":1}'],
    ['explore_hidden', '[1]'],
    ['recall_open', '"c1"'],
    ['atlas_near:town', '[]'],
  ];
  for (const [key, raw] of cases) {
    await db.setMeta(key, raw);
    assert.equal(await m.get(key), null, `${key} = ${raw}`);
  }
  await db.setMeta('nav', '{"walk_id":null,"dest":{"at":[-71.4,41.8],"label":"Start","kind":"start"}}');
  assert.notEqual(await m.get('nav'), null);
});

test('functional-core audit 14: every package the tests and the layer reader load is a declared dependency', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { dependencies: object; devDependencies: object };
  const declared = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)]);
  const files = [...listFiles(TESTS), join(ROOT, 'scripts', 'layers.js'), join(ROOT, 'eslint.config.js')];
  const missing = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const specs = [
      ...src.matchAll(/^\s*(?:import|export)\b[^'\n]*?from\s+'([^'.][^']*)'/gm),
      ...src.matchAll(/\b(?:require|load)\(\s*'([^'.][^']*)'\s*\)/g),
    ];
    for (const m of specs) {
      const spec = m[1];
      if (spec.startsWith('node:') || builtinModules.includes(spec)) continue;
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!declared.has(name)) missing.add(`${relative(ROOT, f)}: ${name}`);
    }
  }
  assert.deepEqual([...missing], []);
});

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'fakes' || dir === TESTS) out.push(...listFiles(p));
    } else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
