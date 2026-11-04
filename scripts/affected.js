#!/usr/bin/env node
// Affected checks (specs/affected-checks/spec.md, AC1-AC11): what a change can
// break, from the import graph, so the inner loop checks only that. The whole
// suite stays what the end of a slice, /audit, /deploy and CI run.
//
//   node scripts/affected.js test     the unit tests that import a changed file
//   node scripts/affected.js lint     lint the changed files
//   node scripts/affected.js check    layers, tests, typecheck, lint, then the e2e scenarios to run
//   node scripts/affected.js hook     what the Stop hook runs (layers and tests, when TypeScript changed)
//
// "Changed" is everything that differs from the merge base with origin/main
// (or main): commits on the branch, edits, new files, renames and deletes.

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const layers = require('./layers');
const features = require('./features');

const ROOT = path.join(__dirname, '..');
const TESTS_DIR = 'src/lib/__tests__';

/**
 * Files whose change can affect any test, or any lint result: the test
 * harness, the toolchain's config and the layer reader (AC4, AC6). Folders end
 * with a slash. Non-test files in __tests__ (fakes, fixtures, helpers) count.
 */
const HARNESS = ['package.json', 'package-lock.json', 'tsconfig.json', 'eslint.config.js', 'eslint-suppressions.json', 'scripts/layers.js', `${TESTS_DIR}/fakes/`];
const LINT_CONFIG = ['package.json', 'package-lock.json', 'eslint.config.js', 'eslint-suppressions.json', 'scripts/layers.js'];
const SOURCE = /\.(ts|tsx|js|mjs|cjs)$/;

const toPosix = (p) => p.split(path.sep).join('/');

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

/** The commit to compare with: the merge base with origin/main, or main; null when neither exists. */
function mergeBase(root) {
  for (const ref of ['origin/main', 'main']) {
    try {
      return git(root, ['merge-base', 'HEAD', ref]).trim();
    } catch {
      // try the next
    }
  }
  return null;
}

function parseNameStatus(out) {
  const changes = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const [status, a, b] = line.split('\t');
    if (status.startsWith('R')) changes.push({ status: 'R', path: b, from: a });
    else if (status.startsWith('C')) changes.push({ status: 'A', path: b });
    else changes.push({ status: status[0], path: a });
  }
  return changes;
}

/**
 * Every file that differs from the merge base (AC1). `all` when there is no
 * base to compare with: then everything counts as changed.
 */
function changedFiles(root = ROOT) {
  const base = mergeBase(root);
  if (!base) return { base: null, all: true, changes: [] };
  const committed = parseNameStatus(git(root, ['diff', '--name-status', '-M', base, 'HEAD']));
  const working = parseNameStatus(git(root, ['diff', '--name-status', '-M', 'HEAD']));
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean)
    .map((p) => ({ status: 'A', path: p }));
  // Later states win: an edit after a commit is still one change to that path.
  const byPath = new Map();
  for (const c of [...committed, ...working, ...untracked]) byPath.set(c.path, c);
  return { base, all: false, changes: [...byPath.values()].sort((x, y) => x.path.localeCompare(y.path)) };
}

/** Every path a change touches: both sides of a rename. */
const changedPaths = (changes) => [...new Set(changes.flatMap((c) => (c.from ? [c.from, c.path] : [c.path])))].sort();

/** Every .ts/.tsx/.js file under src, and the tests (repo-relative, posix). */
function sourceFiles(root) {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(toPosix(path.relative(root, p)));
    }
  };
  walk(path.join(root, 'src'));
  return out.sort();
}

/** The paths a relative import could have meant, for an import whose file is gone (a delete, a rename). */
function candidates(root, fromRel, spec) {
  const base = path.resolve(path.dirname(path.join(root, fromRel)), spec);
  const stems = [base, path.join(base, 'index')];
  const exts = ['', '.ts', '.tsx', '.js', '.native.ts', '.native.tsx', '.web.ts', '.web.tsx'];
  return stems.flatMap((s) => exts.map((e) => toPosix(path.relative(root, s + e))));
}

/**
 * Who imports whom, by every kind of import, type-only ones included (AC2,
 * AC5): file → the files it imports. An import whose file no longer exists
 * points at every path it could have meant, so a deleted or renamed file's
 * importers are still found.
 */
function importGraph(root = ROOT) {
  const graph = new Map();
  for (const rel of sourceFiles(root)) {
    const edges = new Set();
    const source = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const { spec } of layers.valueImports(rel, source, { types: true })) {
      if (!spec.startsWith('.')) continue;
      const found = layers.resolveAll(path.join(root, rel), spec).map((p) => toPosix(path.relative(root, p)));
      for (const t of found.length ? found : candidates(root, rel, spec)) edges.add(t);
    }
    graph.set(rel, edges);
  }
  return graph;
}

/**
 * A test that reads the whole tree (every module's layer, every meta key)
 * rather than importing what it checks says so on its first line:
 * `// @tree-wide: <what it reads>`. It runs on any change under src or scripts.
 */
const TREE_WIDE = /^\/\/ @tree-wide: (.+)$/;
function treeWide(root, rel) {
  const first = fs.readFileSync(path.join(root, rel), 'utf8').split('\n', 1)[0];
  const m = TREE_WIDE.exec(first);
  return m ? m[1].trim() : null;
}

const isTest = (rel) => rel.startsWith(`${TESTS_DIR}/`) && rel.endsWith('.test.ts');
/**
 * Shared test infrastructure: the HARNESS list, and every non-test file directly under
 * `__tests__/` (fakes, the contract suite, helpers). A fixture inside a feature folder
 * (`__tests__/<feature>/x.json`) is not: the graph selects the tests that import it.
 */
const isHarness = (rel) =>
  HARNESS.some((h) => (h.endsWith('/') ? rel.startsWith(h) : rel === h)) ||
  (rel.startsWith(`${TESTS_DIR}/`) && !rel.endsWith('.test.ts') && !rel.slice(TESTS_DIR.length + 1).includes('/'));

/** Every unit test file, in every feature folder (repo-relative, posix). */
function allTests(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.test.ts')) out.push(toPosix(path.relative(root, p)));
    }
  };
  walk(path.join(root, TESTS_DIR));
  return out.sort();
}

/**
 * The unit tests a change can break (AC2-AC4): each test file that imports a
 * changed file, directly or through what it imports, with the shortest chain
 * from the test to the change. A harness change selects every test.
 */
function affectedTests(root, changed) {
  const graph = importGraph(root);
  const tests = [...graph.keys()].filter(isTest);
  const harness = changed.filter(isHarness);
  if (harness.length) {
    return { all: true, why: `${harness.join(', ')} changed: every test can depend on it`, tests: tests.map((file) => ({ file, chain: [file] })), skipped: 0 };
  }
  // Breadth-first from each test: the first changed file reached gives its shortest chain.
  const target = new Set(changed);
  const picked = [];
  const touchesTree = changed.some((c) => c.startsWith('src/') || c.startsWith('scripts/'));
  for (const t of tests) {
    const wide = treeWide(root, t);
    if (wide && touchesTree) {
      picked.push({ file: t, chain: [t], wide });
      continue;
    }
    const prev = new Map([[t, null]]);
    const queue = [t];
    let hit = null;
    while (queue.length && !hit) {
      const cur = queue.shift();
      if (target.has(cur)) {
        hit = cur;
        break;
      }
      for (const next of graph.get(cur) ?? []) {
        if (prev.has(next)) continue;
        prev.set(next, cur);
        if (target.has(next)) {
          hit = next;
          break;
        }
        if (graph.has(next)) queue.push(next);
      }
    }
    if (!hit) continue;
    const chain = [];
    for (let n = hit; n != null; n = prev.get(n)) chain.unshift(n);
    picked.push({ file: t, chain });
  }
  picked.sort((a, b) => a.file.localeCompare(b.file));
  return { all: false, tests: picked, skipped: tests.length - picked.length };
}

/** The feature a test file belongs to: its folder under __tests__ (TO2), or null at the root. */
function featureOfTest(file) {
  const m = /^src\/lib\/__tests__\/([^/]+)\/[^/]+$/.exec(file);
  return m ? m[1] : null;
}

/** What `test:affected` prints before running (AC3), the files under their feature (TO5). */
function describeTests(r) {
  if (r.all) return `Running every test: ${r.why}.`;
  if (!r.tests.length) return `No unit test imports what changed (${r.skipped} test files skipped).`;
  const groups = new Map();
  for (const t of r.tests) {
    const f = featureOfTest(t.file);
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f).push(t);
  }
  const lines = [];
  for (const [feature, tests] of groups) {
    if (feature) lines.push(`  ${feature}:`);
    const pad = feature ? '    ' : '  ';
    for (const t of tests) lines.push(`${pad}${t.file}${t.wide ? `  (reads the whole tree: ${t.wide})` : t.chain.length > 1 ? `\n${pad}    ← ${t.chain.slice(1).join(' ← ')}` : '  (changed)'}`);
  }
  return `Running ${r.tests.length} test file${r.tests.length === 1 ? '' : 's'} that import what changed:\n${lines.join('\n')}\n${r.skipped} test files skipped.`;
}

/** A module's layer tag, or the folder's layer for src/app and src/components. */
function layerOf(root, rel) {
  if (/^src\/(app|components)\//.test(rel)) return 'view';
  try {
    const m = /^\/\/ @layer (core|shell|adapter|view)/.exec(fs.readFileSync(path.join(root, rel), 'utf8'));
    return m ? m[1] : 'untagged';
  } catch {
    return 'untagged';
  }
}

/**
 * What covers each changed source file (TO6): a hole is a file that no unit
 * test reaches through the import graph and no e2e journey row covers. A file
 * in no feature is named too. Tests, docs and deleted files are not judged.
 */
function coverage(root, changed, graph = importGraph(root)) {
  const reached = new Set();
  for (const t of [...graph.keys()].filter(isTest)) {
    const queue = [t];
    const seen = new Set([t]);
    while (queue.length) {
      const cur = queue.shift();
      for (const next of graph.get(cur) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        reached.add(next);
        if (graph.has(next)) queue.push(next);
      }
    }
  }
  const holes = [];
  const unmapped = [];
  for (const c of changed) {
    if (!c.startsWith('src/') || c.startsWith(`${TESTS_DIR}/`) || !SOURCE.test(c) || !fs.existsSync(path.join(root, c))) continue;
    const feats = features.featuresOf(c).map((f) => f.name);
    if (!feats.length) unmapped.push(c);
    if (reached.has(c) || e2eFor([c]).scenarios.length) continue;
    // An instance file only builds a shell from the app's ports (SH6): it is covered when the
    // shell it builds from is, which is any module it imports that a test reaches.
    const instance = instanceOf(root, c);
    if (instance && [...(graph.get(c) ?? [])].some((t) => reached.has(t))) continue;
    holes.push({ file: c, layer: layerOf(root, c), features: feats, ...(instance ? { instance } : {}) });
  }
  return { holes, unmapped };
}

/**
 * What an instance file says it builds: `// @instance: <what>` on the line after its layer tag
 * (SH6), or null. Such a file holds no logic of its own: a shell's factory called with the
 * app's ports, or the composition root.
 */
function instanceOf(root, rel) {
  try {
    const m = /^\/\/ @instance: (.+)$/.exec(fs.readFileSync(path.join(root, rel), 'utf8').split('\n', 2)[1] ?? '');
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

/** The coverage report, in words distinct from "nothing to run" (TO6); empty when there is nothing to say. */
function describeCoverage(cov) {
  const lines = [];
  for (const h of cov.holes) {
    lines.push(
      h.instance
        ? `Covered by nothing: ${h.file} (instance of a shell no test reaches; ${h.features.join(', ') || 'no feature'}): test the factory it builds from over fakePorts().`
        : `Covered by nothing: ${h.file} (${h.layer}; ${h.features.join(', ') || 'no feature'}): no unit test reaches it and no e2e journey covers it.`,
    );
  }
  if (cov.holes.length) {
    lines.push(
      cov.holes.some((h) => h.layer === 'view')
        ? '  A screen gets a check in its feature\'s journey (/e2e); a shell gets a test over fakePorts(); a core module a unit test (.claude/rules/functional-core.md).'
        : '  A shell gets a test over fakePorts(); a core module a unit test (.claude/rules/functional-core.md).',
    );
  }
  for (const u of cov.unmapped) lines.push(`In no feature: ${u}. Add it to a feature's source in scripts/features.js (arch/features.test.ts fails until then).`);
  return lines.join('\n');
}

/** The test folders of the named features (TO4), or the unknown names and the list to pick from. */
function featureFolders(names) {
  const all = features.FEATURES.map((f) => f.name);
  const unknown = names.filter((n) => !features.byName.has(n));
  return { ok: names.length > 0 && unknown.length === 0, folders: names.filter((n) => features.byName.has(n)).map((n) => `${TESTS_DIR}/${n}`), unknown, names: all };
}

/**
 * The files `lint:affected` lints (AC6): changed sources that still exist, or everything when the lint config changed.
 * Only what `npm run lint` covers (`src`, `index.js`): the Node scripts were never written for that config, so a
 * change to `scripts/e2e-web.js` failed on its `__dirname` and `Buffer`.
 */
function lintTargets(root, changed) {
  const config = changed.filter((c) => LINT_CONFIG.includes(c));
  if (config.length) return { all: true, why: `${config.join(', ')} changed: every file's lint result can change`, files: [] };
  const files = changed.filter((c) => SOURCE.test(c) && (c.startsWith('src/') || c === 'index.js') && fs.existsSync(path.join(root, c)));
  return { all: false, files };
}

/** A glob (`**`, `*`, `{a,b}`) as a regular expression over posix paths: the feature map's reader. */
const { globToRegExp } = features;

/**
 * The e2e scenarios that cover the changed files (AC9), and the changed
 * screens and components no scenario covers.
 */
function e2eFor(changed, scenarios = require('./e2e-scenarios').SCENARIOS) {
  const compiled = scenarios.map((s) => ({ name: s.name, res: s.covers.map(globToRegExp) }));
  const hits = compiled.map((s) => ({ name: s.name, files: changed.filter((c) => s.res.some((r) => r.test(c))) })).filter((s) => s.files.length);
  const covered = new Set(hits.flatMap((h) => h.files));
  const uncovered = changed.filter((c) => /^src\/(app|components)\//.test(c) && !covered.has(c));
  return { scenarios: hits, uncovered };
}

/** Runs steps in order, stopping at the first failure (AC7). */
async function runSteps(steps) {
  const ran = [];
  let output = '';
  for (const step of steps) {
    ran.push(step.name);
    const r = await step.run();
    output += r.output ? `${r.output}\n` : '';
    if (!r.ok) return { ok: false, ran, failed: step.name, output };
  }
  return { ok: true, ran, output };
}

/** What the Stop hook runs besides the docs check and the typecheck (AC8): with TypeScript changed, the layers and the affected tests. */
function hookPlan(changed) {
  return changed.some((c) => /\.(ts|tsx)$/.test(c)) ? ['layers', 'tests'] : [];
}

// ---- The commands -------------------------------------------------------

function sh(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { ok: r.status === 0, output: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}

function layersStep() {
  const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, TESTS_DIR, 'layers.baseline.json'), 'utf8'));
  const r = layers.check(ROOT, baseline);
  const problems = [...r.untagged, ...r.added, ...r.stale];
  return { ok: problems.length === 0, output: problems.length ? `Layer check (FC1, FC2, FC4):\n${problems.join('\n')}` : 'Layers: ok' };
}

function testsStep(changed, all) {
  const r = all ? { all: true, why: 'no main branch to compare with', tests: [], skipped: 0 } : affectedTests(ROOT, changed);
  console.log(describeTests(r));
  if (!all) {
    const cov = describeCoverage(coverage(ROOT, changed));
    if (cov) console.log(cov);
  }
  if (!r.all && !r.tests.length) return { ok: true, output: '' };
  const files = r.all ? allTests() : r.tests.map((t) => t.file);
  const res = spawnSync('npx', ['tsx', '--test', '--test-reporter=dot', ...files], { cwd: ROOT, stdio: 'inherit' });
  return { ok: res.status === 0, output: res.status === 0 ? '' : 'Affected unit tests failed (above).' };
}

/** `npm run test:feature <name...>` (TO4): the named features' folders, whole. */
function featureStep(names) {
  const r = featureFolders(names);
  if (!r.ok) {
    const why = r.unknown.length ? `No feature named ${r.unknown.map((n) => `"${n}"`).join(', ')}.` : 'Name a feature.';
    return { ok: false, output: `${why} Features: ${r.names.join(', ')}.\n  npm run test:feature <name> [<name> ...]` };
  }
  const files = allTests().filter((f) => r.folders.some((d) => f.startsWith(`${d}/`)));
  console.log(`Running ${files.length} test file${files.length === 1 ? '' : 's'} of ${names.join(', ')}.`);
  const res = spawnSync('npx', ['tsx', '--test', '--test-reporter=dot', ...files], { cwd: ROOT, stdio: 'inherit' });
  return { ok: res.status === 0, output: res.status === 0 ? '' : `Tests of ${names.join(', ')} failed (above).` };
}

function lintStep(changed, all) {
  const t = all ? { all: true, why: 'no main branch to compare with', files: [] } : lintTargets(ROOT, changed);
  if (!t.all && !t.files.length) return { ok: true, output: 'Lint: nothing to lint' };
  console.log(t.all ? `Linting everything: ${t.why}.` : `Linting ${t.files.length} changed file${t.files.length === 1 ? '' : 's'}.`);
  const r = sh('npx', ['eslint', '--cache', '--cache-location', 'node_modules/.cache/eslint/', ...(t.all ? ['src', 'index.js'] : t.files)]);
  return { ok: r.ok, output: r.ok ? 'Lint: ok' : r.output };
}

function typecheckStep() {
  const r = sh('npx', ['tsc', '--noEmit']);
  return { ok: r.ok, output: r.ok ? 'Typecheck: ok' : r.output.split('\n').slice(0, 30).join('\n') };
}

function e2eHint(changed, all) {
  const r = e2eFor(changed);
  const lines = [];
  if (r.scenarios.length) {
    lines.push('E2E journeys that cover what changed (npm run export:web, then):');
    for (const s of r.scenarios) lines.push(`  E2E_ONLY=${s.name} npm run e2e:web    (${features.featureOfJourney(s.name)?.name ?? 'no feature'}: ${s.files.join(', ')})`);
  } else lines.push('E2E: no journey covers what changed.');
  if (r.uncovered.length) {
    lines.push(`  No journey covers ${r.uncovered.join(', ')}: if this slice changes what a screen shows, add a journey for it (/e2e, scripts/e2e-scenarios.js).`);
  }
  lines.push('  The full flow (npm run e2e:web with no E2E_ONLY) runs only when the owner asks (decision 0074).');
  if (all) lines.unshift('No main branch to compare with: every file counts as changed.');
  return lines.join('\n');
}

async function main(cmd) {
  const { all, changes } = changedFiles(ROOT);
  const changed = changedPaths(changes);
  const step = (name, fn) => ({ name, run: async () => fn() });
  let steps;
  if (cmd === 'test') steps = [step('tests', () => testsStep(changed, all))];
  else if (cmd === 'feature') steps = [step('feature', () => featureStep(process.argv.slice(3)))];
  else if (cmd === 'lint') steps = [step('lint', () => lintStep(changed, all))];
  else if (cmd === 'hook') {
    const plan = all ? ['layers', 'tests'] : hookPlan(changed);
    steps = plan.map((p) => (p === 'layers' ? step('layers', layersStep) : step('tests', () => testsStep(changed, all))));
  } else if (cmd === 'check') {
    steps = [step('layers', layersStep), step('tests', () => testsStep(changed, all)), step('typecheck', typecheckStep), step('lint', () => lintStep(changed, all))];
  } else {
    console.error('usage: node scripts/affected.js test | lint | check | hook | feature <name...>');
    process.exit(64);
  }
  const r = await runSteps(steps);
  if (r.output.trim()) console.log(r.output.trim());
  if (!r.ok) {
    if (cmd === 'feature') process.exit(64);
    console.error(`\n${r.failed} failed. Fix it before going on; the full suite (npm test, npm run lint) is for the end of the slice.`);
    process.exit(cmd === 'hook' ? 2 : 1);
  }
  if (cmd === 'check') console.log(`\n${e2eHint(changed, all)}`);
}

if (require.main === module) main(process.argv[2]);

module.exports = { HARNESS, changedFiles, changedPaths, importGraph, affectedTests, describeTests, lintTargets, e2eFor, runSteps, hookPlan, globToRegExp, coverage, describeCoverage, featureFolders, featureOfTest, allTests };
