// @tree-wide: every source file, test folder, journey, spec and rule file, against scripts/features.js
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { test } from 'node:test';

// The feature map (specs/test-organization/spec.md): one list of features, held to the tree.

type Feature = { name: string; about: string; rule: string; source: string[]; journeys: string[]; specs: string[] };
type Features = {
  FEATURES: Feature[];
  RETIRED: Record<string, string[]>;
  globToRegExp(glob: string): RegExp;
  featuresOf(rel: string): Feature[];
  featureOfJourney(name: string): Feature | null;
  featuresOfSpec(slug: string): Feature[];
  byName: Map<string, Feature>;
};
type Specs = {
  readSpecs(): { slug: string; text: string }[];
  idsOf(text: string): { ids: string[]; prefixes: string[] };
  testFilesFor(slug: string, shared: boolean, files?: string[]): string[];
  report(o?: { feature?: string | null }): { rows: { slug: string; missing: string[]; retired: string[]; shared: string[] }[]; shared: { prefix: string; slugs: string[] }[] };
  folderOf(file: string): string | null;
};
type Affected = {
  featureFolders(names: string[]): { ok: boolean; folders: string[]; unknown: string[]; names: string[] };
  coverage(root: string, changed: string[]): { holes: { file: string; layer: string; features: string[] }[]; unmapped: string[] };
  describeCoverage(c: { holes: { file: string; layer: string; features: string[] }[]; unmapped: string[] }): string;
  affectedTests(root: string, changed: string[]): { all: boolean; tests: { file: string; chain: string[]; wide?: string }[]; skipped: number };
  describeTests(r: unknown): string;
};

const ROOT = join(__dirname, '..', '..', '..', '..');
const TESTS = join(__dirname, '..');
const load = createRequire(__filename);
const features = load(join(ROOT, 'scripts', 'features.js')) as Features;
const specs = load(join(ROOT, 'scripts', 'check-specs.js')) as Specs;
const affected = load(join(ROOT, 'scripts', 'affected.js')) as Affected;
const { SCENARIOS } = load(join(ROOT, 'scripts', 'e2e-scenarios.js')) as { SCENARIOS: { name: string; covers: string[] }[] };

const posix = (p: string) => p.split('\\').join('/');
function filesUnder(dir: string, keep: (p: string) => boolean): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...filesUnder(p, keep));
    else if (keep(p)) out.push(p);
  }
  return out;
}
const sources = () =>
  filesUnder(join(ROOT, 'src'), (p) => /\.(ts|tsx|js)$/.test(p) && !p.endsWith('.d.ts') && !p.includes(`${join('lib', '__tests__')}`)).map((p) => posix(relative(ROOT, p)));
const names = features.FEATURES.map((f) => f.name);

test('TG1 every feature has a name, a purpose, a rule file that exists, and sources that match something', () => {
  assert.equal(new Set(names).size, names.length, 'feature names are unique');
  const all = sources();
  for (const f of features.FEATURES) {
    assert.ok(/^[a-z][a-z-]*$/.test(f.name), `${f.name}: a folder name`);
    assert.ok(f.about.length > 10, `${f.name} says what it is`);
    assert.ok(existsSync(join(ROOT, '.claude', 'rules', `${f.rule}.md`)), `${f.name}: .claude/rules/${f.rule}.md exists`);
    for (const g of f.source) {
      const re = features.globToRegExp(g);
      assert.ok(all.some((s) => re.test(s)), `${f.name}: the glob "${g}" matches no source file (moved or renamed?)`);
    }
  }
});

test('TG1 every source file under src belongs to at least one feature', () => {
  const orphans = sources().filter((s) => features.featuresOf(s).length === 0);
  assert.deepEqual(orphans, [], `in no feature: add each to a feature's source in scripts/features.js:\n  ${orphans.join('\n  ')}`);
});

test('TG1 every e2e journey belongs to exactly one feature, and every journey a feature names exists', () => {
  const journeys = SCENARIOS.map((s) => s.name);
  for (const j of journeys) {
    const owners = features.FEATURES.filter((f) => f.journeys.includes(j)).map((f) => f.name);
    assert.equal(owners.length, 1, `journey "${j}" is owned by ${owners.length ? owners.join(' and ') : 'no feature'}: list it under one feature's journeys`);
  }
  for (const f of features.FEATURES) for (const j of f.journeys) assert.ok(journeys.includes(j), `${f.name} names the journey "${j}", which scripts/e2e-scenarios.js does not list`);
});

test('TG1 every spec with criterion ids is listed by a feature, every listed spec exists, and RETIRED ids are the spec\'s own', () => {
  const all = specs.readSpecs();
  const slugs = new Set(all.map((s) => s.slug));
  for (const s of all) {
    const { ids } = specs.idsOf(s.text);
    if (!ids.length) continue;
    assert.ok(features.featuresOfSpec(s.slug).length > 0, `specs/${s.slug} has criteria (${ids.slice(0, 3).join(', ')}...) but no feature lists it`);
  }
  for (const f of features.FEATURES) for (const slug of f.specs) assert.ok(slugs.has(slug), `${f.name} lists the spec "${slug}", which is not under specs/`);
  for (const [slug, retired] of Object.entries(features.RETIRED)) {
    const spec = all.find((s) => s.slug === slug);
    assert.ok(spec, `RETIRED names the spec "${slug}", which is not under specs/`);
    const { ids } = specs.idsOf(spec!.text);
    for (const id of retired) assert.ok(ids.includes(id), `RETIRED["${slug}"] has ${id}, which that spec does not define`);
  }
});

test('TG2 every test folder is a feature, every test file is in a folder, and shared helpers stay at the root', () => {
  const entries = readdirSync(TESTS, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory() && e.name !== 'fakes').map((e) => e.name);
  for (const d of folders) assert.ok(features.byName.has(d), `src/lib/__tests__/${d}/ is not a feature in scripts/features.js: add the feature, or move the tests`);
  const loose = entries.filter((e) => e.isFile() && e.name.endsWith('.test.ts')).map((e) => e.name);
  assert.deepEqual(loose, [], 'a test file at the root of __tests__: move it into its feature\'s folder');
  for (const d of folders) {
    const tests = readdirSync(join(TESTS, d)).filter((n) => n.endsWith('.test.ts'));
    assert.ok(tests.length > 0, `src/lib/__tests__/${d}/ holds no test`);
  }
});

test('TG3 the tree-wide tests live in arch, and the contract in storage', () => {
  const wide = filesUnder(TESTS, (p) => p.endsWith('.test.ts')).filter((p) => /^\/\/ @tree-wide: /.test(readFileSync(p, 'utf8').split('\n', 1)[0]));
  assert.ok(wide.length >= 4);
  for (const w of wide) assert.equal(specs.folderOf(w), 'arch', `${relative(TESTS, w)} reads the whole tree: it belongs in arch/`);
  assert.ok(existsSync(join(TESTS, 'storage', 'db.contract.test.ts')));
});

test('TG4 test:feature resolves names to folders and refuses an unknown one, naming the features', () => {
  const ok = affected.featureFolders(['rides', 'map']);
  assert.deepEqual(ok, { ok: true, folders: ['src/lib/__tests__/rides', 'src/lib/__tests__/map'], unknown: [], names });
  const bad = affected.featureFolders(['rides', 'nope']);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.unknown, ['nope']);
  assert.ok(bad.names.includes('explore'));
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts['test:feature'], 'node scripts/affected.js feature');
});

test('TG5 the selected tests are listed under their feature', () => {
  const r = affected.affectedTests(ROOT, ['src/lib/rides.ts']);
  const text = affected.describeTests(r);
  assert.match(text, /^  rides:$/m, 'a feature header');
  assert.match(text, /^    src\/lib\/__tests__\/rides\/rides\.test\.ts/m, 'the test under it');
  const first = text.indexOf('  rides:');
  const idx = text.indexOf('src/lib/__tests__/rides/rides.test.ts');
  assert.ok(first >= 0 && first < idx);
});

test('TG6 a changed file no unit test reaches and no journey covers is named, with its layer and features; one in no feature too', () => {
  const c = affected.coverage(ROOT, ['src/lib/focus.ts', 'src/lib/rides.ts', 'src/app/walk.tsx', 'docs/STATUS.md']);
  assert.deepEqual(c.holes.map((h) => h.file), ['src/lib/focus.ts'], 'rides has tests, walk.tsx has journeys');
  assert.equal(c.holes[0].layer, 'adapter');
  assert.deepEqual(c.holes[0].features, ['arch']);
  assert.deepEqual(c.unmapped, []);
  const text = affected.describeCoverage(c);
  assert.match(text, /Covered by nothing: src\/lib\/focus\.ts \(adapter; arch\)/);
  assert.doesNotMatch(text, /No unit test imports/);
});

test('TG6 the words tell a hole from nothing to run', () => {
  const none = affected.coverage(ROOT, ['docs/STATUS.md']);
  assert.deepEqual(none, { holes: [], unmapped: [] });
  assert.equal(affected.describeCoverage(none), '');
});

test('TG7 a prefix two specs share is looked for only in the folders of the features that list the spec', () => {
  const files = ['src/lib/__tests__/rides/rides.test.ts', 'src/lib/__tests__/explore/recall.test.ts', 'scripts/e2e/journeys/qol.js'].map((f) => join(ROOT, f));
  assert.deepEqual(specs.testFilesFor('rides', true, files).map((f) => posix(relative(ROOT, f))), ['src/lib/__tests__/rides/rides.test.ts', 'scripts/e2e/journeys/qol.js']);
  assert.deepEqual(specs.testFilesFor('v1-discovery', true, files).map((f) => posix(relative(ROOT, f))), ['src/lib/__tests__/explore/recall.test.ts', 'scripts/e2e/journeys/qol.js']);
  assert.equal(specs.testFilesFor('rides', false, files).length, 3, 'a prefix one spec owns is looked for everywhere');
  const r = specs.report();
  const shared = r.shared.map((s) => s.prefix);
  for (const p of ['M', 'R', 'D']) assert.ok(shared.includes(p), `${p} is shared`);
  const v1 = r.rows.find((x) => x.slug === 'v1-discovery')!;
  // The 25 the spec's "Retired by this slice" line names, and E14 (the test trim, Nov 5).
  assert.equal(v1.retired.length, 26, 'the ids the spec\'s "Retired by this slice" line names are retired, not missing');
  for (const live of ['S7', 'S8', 'S13', 'S16', 'S17']) assert.ok(!v1.retired.includes(live), `${live} is live`);
  assert.ok(!v1.missing.some((id) => /^(S|A)\d+$/.test(id) && v1.retired.includes(id)));
  const one = specs.report({ feature: 'rides' });
  assert.deepEqual(one.rows.map((x) => x.slug), ['rides']);
});

test('TG8 each feature\'s rule loads for its test folder', () => {
  for (const f of features.FEATURES) {
    const folder = join(TESTS, f.name);
    if (!existsSync(folder) || !statSync(folder).isDirectory()) continue;
    const rule = readFileSync(join(ROOT, '.claude', 'rules', `${f.rule}.md`), 'utf8');
    const globs = [...rule.matchAll(/^\s*-\s*"([^"]+)"\s*$/gm)].map((m) => m[1]);
    const probe = `src/lib/__tests__/${f.name}/x.test.ts`;
    assert.ok(globs.some((g) => features.globToRegExp(g).test(probe)), `.claude/rules/${f.rule}.md does not load for ${probe}: add "src/lib/__tests__/${f.name}/**" to its paths`);
  }
});

test('TG10 every screen and component is covered by a journey row', () => {
  const ui = filesUnder(join(ROOT, 'src'), (p) => /\.(ts|tsx|js)$/.test(p) && !p.endsWith('.d.ts'))
    .map((p) => posix(relative(ROOT, p)))
    .filter((f) => /^src\/(app|components)\//.test(f));
  const compiled = SCENARIOS.map((s) => ({ name: s.name, res: s.covers.map(features.globToRegExp) }));
  const uncovered = ui.filter((f) => !compiled.some((s) => s.res.some((r) => r.test(f))));
  assert.deepEqual(uncovered, [], `no journey row covers:\n  ${uncovered.join('\n  ')}\nAdd each to the covers of its feature's journey (scripts/e2e/journeys/), or list it in docs/DEFERRED.md and here.`);
});

test('TG11 the docs name the layout and the commands', () => {
  const agents = readFileSync(join(ROOT, 'AGENTS.md'), 'utf8');
  assert.match(agents, /npm run test:feature/);
  assert.match(agents, /scripts\/features\.js/);
  const testing = readFileSync(join(ROOT, 'docs', 'TESTING.md'), 'utf8');
  for (const s of ['scripts/features.js', 'test:feature', 'scripts/e2e/journeys/', 'Covered by nothing']) assert.ok(testing.includes(s), `docs/TESTING.md says ${s}`);
  const slice = readFileSync(join(ROOT, '.claude', 'skills', 'slice', 'SKILL.md'), 'utf8');
  assert.match(slice, /src\/lib\/__tests__\/<feature>\//);
  assert.match(slice, /scripts\/e2e\/journeys\//);
});

test('TG12 the selection still follows type-only imports, and the docs say it is on purpose', () => {
  const r = affected.affectedTests(ROOT, ['src/lib/areas/types.ts']);
  assert.ok(r.tests.length > 5, `${r.tests.length} tests reach a types-only module through import type`);
  const testing = readFileSync(join(ROOT, 'docs', 'TESTING.md'), 'utf8');
  assert.match(testing, /Type-only edges are followed on\s+purpose/);
});

test('SH6 an instance of a tested shell is not a hole; one of an untested shell is', () => {
  const root = join(ROOT, '..', `sh6-${process.pid}`);
  const write = (rel: string, src: string) => {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), src);
  };
  try {
    write('src/lib/tested/shell.ts', '// @layer shell\nexport const createT = () => 1;\n');
    write('src/lib/tested/index.ts', "// @layer shell\n// @instance: the tested shell\nimport { createT } from './shell';\nexport const t = createT();\n");
    write('src/lib/untested/shell.ts', '// @layer shell\nexport const createU = () => 1;\n');
    write('src/lib/untested/index.ts', "// @layer shell\n// @instance: the untested shell\nimport { createU } from './shell';\nexport const u = createU();\n");
    write('src/lib/__tests__/x/t.test.ts', "import { createT } from '../../tested/shell';\nvoid createT;\n");
    const c = affected.coverage(root, ['src/lib/tested/index.ts', 'src/lib/untested/index.ts', 'src/lib/untested/shell.ts']);
    assert.deepEqual(c.holes.map((h) => h.file), ['src/lib/untested/index.ts', 'src/lib/untested/shell.ts']);
    assert.match(affected.describeCoverage(c), /src\/lib\/untested\/index\.ts \(instance of a shell no test reaches/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  // This repo's instances are marked.
  for (const rel of ['src/lib/ports/index.ts', 'src/lib/ready/index.ts', 'src/lib/tabsHidden.ts', 'src/lib/notify/index.ts', 'src/lib/unitsStore/index.ts', 'src/lib/nav/store/index.ts', 'src/lib/explore/momentFind/index.ts']) {
    assert.match(readFileSync(join(ROOT, rel), 'utf8').split('\n')[1] ?? '', /^\/\/ @instance: /, rel);
  }
  assert.deepEqual(affected.coverage(ROOT, ['src/lib/ports/index.ts', 'src/lib/ready/index.ts', 'src/lib/tabsHidden.ts']).holes, []);
});

test('TD1 a retired id is still tested only when a test name or an e2e check names it, not a comment or an assertion message', () => {
  const dir = join(ROOT, '..', `td1-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  try {
    const named = join(dir, 'named.test.ts');
    const mentioned = join(dir, 'mentioned.test.ts');
    writeFileSync(named, "test('S3 the scan is gone', () => {});\ncheck(ok, `A4: still here`);\n");
    writeFileSync(mentioned, "// S5 was retired with scan.\nassert.equal(x, 1, 'S6 and A7 are retired, not missing');\n");
    const s = specs as Specs & { namedIn(files: string[]): Set<string> };
    const got = s.namedIn([named, mentioned]);
    assert.ok(got.has('S3') && got.has('A4'), [...got].join(' '));
    assert.ok(!got.has('S5') && !got.has('S6') && !got.has('A7'), [...got].join(' '));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const v1 = specs.report().rows.find((x) => x.slug === 'v1-discovery') as { retiredStillTested?: string[] } | undefined;
  assert.deepEqual(v1?.retiredStillTested ?? [], [], 'this repo names no retired v1 id in a test');
});

test('TD2 coverage per feature: the features\' tests, their own sources only; an unknown name fails; no threshold', () => {
  const a = affected as Affected & { coverageArgs(names: string[]): { ok: boolean; files: string[]; include: string[]; unknown: string[] } };
  const r = a.coverageArgs(['rides']);
  assert.equal(r.ok, true);
  assert.deepEqual(r.files, ['src/lib/__tests__/rides/rides.test.ts']);
  assert.deepEqual(r.include, ['src/lib/rides.ts'], 'only the feature\'s own sources');
  const all = a.coverageArgs([]);
  assert.ok(all.ok && all.files.length > 50 && all.include.includes('src/lib/**'));
  const bad = a.coverageArgs(['nope']);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.unknown, ['nope']);
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts['test:coverage'], 'node scripts/affected.js coverage');
  assert.doesNotMatch(readFileSync(join(ROOT, 'scripts', 'affected.js'), 'utf8'), /--test-coverage-(lines|branches|functions)=/, 'no threshold');
});

test('NT12 the docs list the web notification transport as a web exception, with its reason', () => {
  const arch = readFileSync(join(ROOT, 'docs', 'ARCHITECTURE.md'), 'utf8');
  const section = arch.slice(arch.indexOf('## Web exceptions'), arch.indexOf('\n## ', arch.indexOf('## Web exceptions') + 1));
  assert.match(section, /notify\/transport\.web\.ts/);
  assert.match(section, /expo-notifications has no web build/);
});
