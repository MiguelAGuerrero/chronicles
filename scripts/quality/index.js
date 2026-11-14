#!/usr/bin/env node
// Code-quality facts about src, from the syntax tree, the import graph and git:
// deterministic numbers the refactor procedure reads instead of opinions.
//
//   node scripts/quality                       the summary, to stdout
//   node scripts/quality --json <file>         every fact, as JSON
//   node scripts/quality --files a.ts,b.tsx    the summary for these files only (a slice's)
//
// What it measures, per file: lines, functions (size, branching, nesting,
// parameters), components and their hooks, purity (pure functions living
// outside core: what could move to core and be unit tested), smells (any, casts,
// non-null assertions, suppressions, console, inline styles), the import graph
// (fan-in, fan-out, cycles, unused exports, cross-feature imports), copy-paste
// (scripts/quality/clones.js), churn from git, and the drift between a module's
// .web and .native files.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const layers = require('../layers');
const features = require('../features');
const { analyzeFunctions } = require('./functions');
const { findClones, duplicatedLines, tokenize } = require('./clones');
const { buildGraph } = require('./graph');
const { patterns, testsWithoutAssertions } = require('./patterns');
const { coChange } = require('./history');
const limits = require('./limits');
const baselineOps = require('./baseline');

const BASELINE = 'scripts/quality.baseline.json';
/** Lines as an editor counts them: a final newline ends the last line, it doesn't start another. */
const lineCount = (source) => (source.endsWith('\n') ? source.split('\n').length - 1 : source.split('\n').length);

const ROOT = path.join(__dirname, '..', '..');
const toPosix = (p) => p.split(path.sep).join('/');
const isTest = (rel) => rel.includes('/__tests__/');

function srcFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(toPosix(path.relative(root, p)));
    }
  };
  walk(path.join(root, 'src'));
  return out.sort();
}

/** The layer of a file: its tag in src/lib, `view` for routes and components. */
function layerOf(rel, libLayers) {
  if (rel.startsWith('src/lib/')) return libLayers.get(rel) || 'untagged';
  return rel.startsWith('src/app/') ? 'route' : 'component';
}

/** What an import specifier from `fromRel` reaches, for the purity verdict. */
function importResolver(root, fromRel, libLayers) {
  const abs = path.join(root, fromRel);
  return (spec) => {
    if (!spec.startsWith('.')) {
      const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      return layers.PURE_PACKAGES.includes(pkg) ? 'pure-package' : 'package';
    }
    const targets = layers.resolveAll(abs, spec).map((t) => toPosix(path.relative(root, t)));
    if (!targets.length) return 'unresolved';
    if (targets.every((t) => t.endsWith('.json'))) return 'json';
    const ls = targets.map((t) => layerOf(t, libLayers));
    return ls.every((l) => l === 'core') ? 'core' : ls.find((l) => l !== 'core');
  };
}

/** Per-file smells, counted from the syntax tree and comments. */
function smells(sf, source) {
  const s = { any: 0, asCasts: 0, nonNull: 0, inlineStyles: 0, styleSheets: 0, console: 0, magicDurations: 0, effects: 0, states: 0, refs: 0, memos: 0, components: 0 };
  const visit = (n) => {
    if (n.kind === ts.SyntaxKind.AnyKeyword) s.any++;
    if (ts.isAsExpression(n) && !(ts.isTypeReferenceNode(n.type) && n.type.typeName.getText(sf) === 'const')) s.asCasts++;
    if (ts.isNonNullExpression(n)) s.nonNull++;
    if (ts.isJsxAttribute(n) && n.name.getText(sf) === 'style' && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression) {
      const e = n.initializer.expression;
      if (ts.isObjectLiteralExpression(e) || (ts.isArrayLiteralExpression(e) && e.elements.some((x) => ts.isObjectLiteralExpression(x)))) s.inlineStyles++;
    }
    if (ts.isCallExpression(n)) {
      const t = n.expression.getText(sf);
      if (t === 'StyleSheet.create') s.styleSheets++;
      if (/^console\./.test(t)) s.console++;
      if (t === 'useEffect' || t === 'useLayoutEffect') s.effects++;
      if (t === 'useState' || t === 'useReducer') s.states++;
      if (t === 'useRef') s.refs++;
      if (t === 'useMemo' || t === 'useCallback') s.memos++;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  s.eslintDisable = (source.match(/eslint-disable/g) || []).length;
  s.tsSuppress = (source.match(/@ts-(ignore|expect-error|nocheck)/g) || []).length;
  s.todo = (source.match(/\b(TODO|FIXME|HACK|XXX)\b/g) || []).length;
  return s;
}

/** Lines that hold code (not blank, not only a comment). */
function codeLines(source) {
  let n = 0;
  let inBlock = false;
  for (const raw of source.split('\n')) {
    const l = raw.trim();
    if (inBlock) {
      if (l.includes('*/')) {
        inBlock = false;
        if (l.split('*/').pop().trim()) n++;
      }
      continue;
    }
    if (!l || l.startsWith('//')) continue;
    if (l.startsWith('/*')) {
      if (!l.includes('*/')) inBlock = true;
      continue;
    }
    n++;
  }
  return n;
}

/** Commits and lines changed per file over the whole history (renames not followed). */
function churn(root) {
  const out = new Map();
  let log;
  try {
    log = execFileSync('git', ['log', '--numstat', '--no-renames', '--format=@%H %ad', '--date=short', '--', 'src'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch {
    return { files: out, commits: 0, shallow: true };
  }
  let commits = 0;
  let date = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) {
      commits++;
      date = line.split(' ')[1];
      continue;
    }
    const m = /^(\d+|-)\t(\d+|-)\t(.+)$/.exec(line);
    if (!m) continue;
    const f = out.get(m[3]) || { commits: 0, added: 0, deleted: 0, last: null, first: null };
    f.commits++;
    f.added += m[1] === '-' ? 0 : +m[1];
    f.deleted += m[2] === '-' ? 0 : +m[2];
    f.last = f.last || date;
    f.first = date;
    out.set(m[3], f);
  }
  let shallow = false;
  try {
    shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true';
  } catch {}
  return { files: out, commits, shallow };
}

/** A module's platform files (`x.ts`, `x.web.ts`, `x.native.ts`, `x.types.ts`) and how far apart they are. */
function platformPairs(files, graph, dup) {
  const groups = new Map();
  for (const f of files) {
    const m = /^(.*?)(\.(web|native|ios|android|types))?\.tsx?$/.exec(f);
    if (!m) continue;
    if (!groups.has(m[1])) groups.set(m[1], []);
    groups.get(m[1]).push(f);
  }
  const out = [];
  for (const [base, fs_] of groups) {
    const web = fs_.find((f) => /\.web\.tsx?$/.test(f));
    const native = fs_.find((f) => /\.native\.tsx?$/.test(f));
    if (!web || !native) continue;
    const ex = (f) => new Set([...(graph.mods.get(f)?.exports.keys() || [])]);
    const we = ex(web);
    const ne = ex(native);
    out.push({
      base,
      web,
      native,
      onlyWeb: [...we].filter((x) => !ne.has(x)).sort(),
      onlyNative: [...ne].filter((x) => !we.has(x)).sort(),
      sharedClonedLines: dup.pairLines.get(`${web}|${native}`) || dup.pairLines.get(`${native}|${web}`) || 0,
    });
  }
  return out.sort((a, b) => b.onlyWeb.length + b.onlyNative.length - (a.onlyWeb.length + a.onlyNative.length) || b.sharedClonedLines - a.sharedClonedLines);
}

/** The facts for the whole tree. */
function collect(root = ROOT, { minTokens, types = false } = {}) {
  const all = srcFiles(root);
  const prod = all.filter((f) => !isTest(f));
  const libLayers = fs.existsSync(path.join(root, 'src', 'lib')) ? layers.readLayers(root).layers : new Map();
  const libRel = new Map([...libLayers].map(([k, v]) => [toPosix(k), v]));
  const featureNames = (rel) => features.featuresOf(rel).map((f) => f.name);

  const graph = buildGraph(root, all, {
    extraImporters: ['index.js', 'app.config.js', ...fs.readdirSync(path.join(root, 'scripts')).filter((f) => /\.(ts|mjs|js)$/.test(f)).map((f) => `scripts/${f}`)],
    isTest,
    featuresOf: featureNames,
  });
  const history = churn(root);

  const files = {};
  const fnRecords = [];
  const sources = new Map();
  const patternsOf = {};
  const unasserted = [];
  for (const rel of all) {
    const source = fs.readFileSync(path.join(root, rel), 'utf8');
    sources.set(rel, source);
    if (isTest(rel)) {
      if (rel.endsWith('.test.ts')) for (const t of testsWithoutAssertions(require('./functions').parse(rel, source))) unasserted.push({ file: rel, ...t });
      continue;
    }
    const layer = layerOf(rel, libRel);
    const { sf, functions } = analyzeFunctions(rel, source, { resolveImport: importResolver(root, rel, libRel) });
    for (const f of functions) fnRecords.push({ file: rel, layer, ...f });
    const pureOutsideCore = layer === 'core' ? [] : functions.filter((f) => f.pure && f.lines >= 5);
    const components = functions.filter((f) => f.component);
    const fanOut = graph.valueEdges.get(rel)?.size || 0;
    const ch = history.files.get(rel);
    files[rel] = {
      layer,
      features: featureNames(rel),
      lines: lineCount(source),
      code: codeLines(source),
      functions: functions.length,
      topLevelFunctions: functions.filter((f) => f.topLevel).length,
      maxFunctionLines: Math.max(0, ...functions.map((f) => f.lines)),
      maxComplexity: Math.max(0, ...functions.map((f) => f.complexity)),
      complexity: functions.reduce((a, f) => a + f.complexity, 0),
      maxNesting: Math.max(0, ...functions.map((f) => f.maxNesting)),
      components: components.length,
      maxHooksInComponent: Math.max(0, ...components.map((c) => c.hookCount)),
      pureOutsideCore: pureOutsideCore.length,
      pureLinesOutsideCore: pureOutsideCore.reduce((a, f) => a + f.lines, 0),
      fanIn: graph.fanIn.get(rel)?.size || 0,
      testFanIn: graph.testFanIn.get(rel)?.size || 0,
      fanOut,
      commits: ch?.commits || 0,
      churn: ch ? ch.added + ch.deleted : 0,
      ...smells(sf, source),
    };
    patternsOf[rel] = patterns(sf, layer);
  }

  // Copy-paste across production files, and across tests on their own.
  const prodSources = prod.map((rel) => ({ rel, source: sources.get(rel) }));
  const { clones } = findClones(prodSources, minTokens ? { minTokens } : {});
  const lineCounts = Object.fromEntries(prod.map((f) => [f, files[f].lines]));
  const dupPerFile = duplicatedLines(clones, lineCounts);
  const pairLines = new Map();
  for (const c of clones) {
    const k = `${c.a.file}|${c.b.file}`;
    pairLines.set(k, (pairLines.get(k) || 0) + c.lines);
  }
  for (const [f, d] of Object.entries(dupPerFile)) files[f].duplicatedLines = d.lines;
  const tests = all.filter(isTest);
  const testClones = findClones(tests.map((rel) => ({ rel, source: sources.get(rel) })), { minTokens: 100 }).clones;

  // The same helper name defined at the top level of more than one file
  // (platform siblings aside): a helper re-implemented instead of shared.
  const byName = new Map();
  for (const f of fnRecords) {
    if (!f.topLevel || f.inClass || f.component || f.hook || f.name.startsWith('<') || f.name === 'default' || f.lines < 2) continue;
    const base = f.file.replace(/\.(web|native|ios|android)(?=\.tsx?$)/, '');
    if (!byName.has(f.name)) byName.set(f.name, []);
    const list = byName.get(f.name);
    if (!list.some((x) => x.base === base)) list.push({ file: f.file, base, line: f.line, lines: f.lines, pure: f.pure });
  }
  const repeatedHelpers = [...byName]
    .filter(([, l]) => l.length > 1)
    .map(([name, defs]) => ({ name, defs }))
    .sort((a, b) => b.defs.length - a.defs.length || a.name.localeCompare(b.name));

  // Identical function bodies (normalised tokens) in different files.
  const bodies = new Map();
  for (const f of fnRecords) {
    if (f.lines < 5 || !(f.topLevel || f.hoistable)) continue;
    const src = sources.get(f.file).split('\n').slice(f.line - 1, f.line - 1 + f.lines).join('\n');
    const key = tokenize(f.file, src).map((t) => t.k).join(' ');
    if (key.split(' ').length < 30) continue;
    if (!bodies.has(key)) bodies.set(key, []);
    bodies.get(key).push({ file: f.file, name: f.name, line: f.line, lines: f.lines });
  }
  const identicalFunctions = [...bodies.values()].filter((l) => new Set(l.map((x) => x.file)).size > 1).sort((a, b) => b[0].lines * b.length - a[0].lines * a.length);

  // Shells that reach a singleton (db, ports, recorder, notifier) instead of
  // taking it in a factory (SH5): only a module mock could test them.
  const SINGLETON = /^(db|ports|recorder|notifier)$/;
  // src/lib reaching into the views by value (a type is fine): the dependency runs the wrong way.
  const libImportsViews = [];
  for (const f of prod.filter((x) => x.startsWith('src/lib/'))) {
    for (const imp of graph.mods.get(f)?.imports || []) {
      if (imp.typeOnly || !imp.spec.startsWith('.')) continue;
      const targets = layers.resolveAll(path.join(root, f), imp.spec).map((t) => toPosix(path.relative(root, t)));
      if (targets.some((t) => /^src\/(components|app)\//.test(t))) libImportsViews.push({ file: f, spec: imp.spec, line: imp.line || 1 });
    }
  }
  const shellsOnSingletons = prod
    // An instance file may import a singleton to build from it, and nothing more: one that also holds
    // a function of 3+ lines is a shell like any other (code-quality audit 10).
    .filter((f) => files[f].layer === 'shell' && !(/^\/\/ @instance/m.test(sources.get(f)) && !fnRecords.some((x) => x.file === f && x.lines >= 3)))
    .map((f) => ({ file: f, imports: (graph.mods.get(f)?.imports || []).filter((i) => !i.typeOnly && Array.isArray(i.names)).flatMap((i) => i.names.filter((n) => SINGLETON.test(n))) }))
    .filter((x) => x.imports.length)
    .map((x) => ({ ...x, factory: [...(graph.mods.get(x.file)?.exports.keys() || [])].some((n) => /^create[A-Z]/.test(n)) }));
  // Core modules no test reaches, directly or through what it imports.
  const reached = new Set();
  const queue = [];
  for (const [f, set] of graph.testFanIn) if (set.size) queue.push(f);
  while (queue.length) {
    const f = queue.pop();
    if (reached.has(f)) continue;
    reached.add(f);
    for (const t of graph.valueEdges.get(f) || []) queue.push(t);
  }
  const untestedCore = prod.filter((f) => files[f].layer === 'core' && !reached.has(f) && files[f].functions > 0);
  for (const f of prod) files[f].tested = reached.has(f) ? (files[f].testFanIn ? 'direct' : 'transitive') : 'none';

  // Pattern findings, flattened with their file.
  const flat = (key) => Object.entries(patternsOf).flatMap(([file, p]) => p[key].map((x) => (typeof x === 'object' ? { file, ...x } : { file, line: x })));
  const patternFindings = {};
  for (const key of ['quadratic', 'paramMutation', 'localTime', 'silentCatch', 'derivedStateEffects', 'setterClusters', 'wideProps', 'platformBranches', 'freshSelectors', 'contextCalls']) patternFindings[key] = flat(key);
  for (const [file, p] of Object.entries(patternsOf)) {
    files[file].hexColors = p.hexColors;
    files[file].hookDepSuppressions = p.hookDepSuppressions;
    files[file].silentCatches = p.silentCatch.length;
  }
  // Decisions inside shells: a shell function that branches a lot is deciding,
  // and its decisions want to be a core function the shell calls (the sandwich).
  const shellDecisions = fnRecords.filter((x) => (x.layer === 'shell' || x.layer === 'adapter') && !x.inClass && x.complexity > 8).map((x) => ({ file: x.file, line: x.line, name: x.name, complexity: x.complexity }));
  // Modules no production file imports: routes and composition roots aside.
  const ROOTS = /^src\/app\/|\/index(\.native|\.web)?\.tsx?$|\.d\.ts$/;
  const orphans = prod.filter((f) => !ROOTS.test(f) && files[f].fanIn === 0 && !graph.usedOutside.has(f)).map((f) => ({ file: f, testOnly: files[f].testFanIn > 0 }));
  // Change coupling from git (features that move together without an import).
  const linked = (a, b) => graph.valueEdges.get(a)?.has(b) || graph.valueEdges.get(b)?.has(a) || graph.typeEdges.get(a)?.has(b) || graph.typeEdges.get(b)?.has(a);
  const coupling = coChange(root, { exists: (f) => Object.prototype.hasOwnProperty.call(files, f), featuresOf: featureNames, linked: (a, b) => !!linked(a, b) });
  let floating = null;
  if (types) floating = require('./types').floatingPromises(root, (rel) => Object.prototype.hasOwnProperty.call(files, rel));
  if (floating) for (const [f, hits] of Object.entries(floating)) files[f].floatingPromises = hits.length;

  // Per feature: lines by layer, and pure logic stranded outside core.
  const perFeature = {};
  for (const [rel, fi] of Object.entries(files)) {
    for (const name of fi.features.length ? fi.features : ['(none)']) {
      const p = (perFeature[name] ||= { files: 0, lines: 0, byLayer: {}, pureLinesOutsideCore: 0, duplicatedLines: 0, maxFile: null, crossImportsOut: 0 });
      p.files++;
      p.lines += fi.code;
      p.byLayer[fi.layer] = (p.byLayer[fi.layer] || 0) + fi.code;
      p.pureLinesOutsideCore += fi.pureLinesOutsideCore;
      p.duplicatedLines += fi.duplicatedLines || 0;
      if (!p.maxFile || fi.lines > files[p.maxFile].lines) p.maxFile = rel;
    }
  }
  for (const e of graph.crossFeature) if (!e.typeOnly) for (const f of e.fromFeatures) if (perFeature[f]) perFeature[f].crossImportsOut++;

  return {
    generatedFrom: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    history: { commits: history.commits, shallow: history.shallow },
    files,
    functions: fnRecords,
    clones,
    testClones,
    repeatedHelpers,
    identicalFunctions,
    cycles: graph.cycles,
    unusedExports: graph.unusedExports,
    testOnlyExports: graph.testOnlyExports,
    crossFeature: graph.crossFeature,
    platformPairs: platformPairs(prod, graph, { pairLines }),
    shellsOnSingletons,
    untestedCore,
    perFeature,
    patterns: patternFindings,
    shellDecisions,
    orphans,
    coupling,
    floating,
    testsWithoutAssertions: unasserted,
    libImportsViews,
    packages: Object.fromEntries([...graph.packages].map(([k, v]) => [k, [...v].sort()])),
  };
}

// --- the summary -----------------------------------------------------------

const top = (arr, n, key) => [...arr].sort((a, b) => key(b) - key(a)).slice(0, n);
const pct = (x) => `${Math.round(x * 100)}%`;

function summary(facts, { only = null, n = 15 } = {}) {
  const inScope = (f) => !only || only.has(f);
  const F = Object.entries(facts.files).filter(([f]) => inScope(f)).map(([file, x]) => ({ file, ...x }));
  const fns = facts.functions.filter((f) => inScope(f.file));
  const L = [];
  const total = (k) => F.reduce((a, f) => a + (f[k] || 0), 0);
  L.push(`# Code quality facts (${facts.generatedFrom.slice(0, 7)}${only ? `, ${F.length} files` : ''})`);
  L.push('');
  L.push(`${F.length} files, ${total('code')} code lines, ${fns.length} functions, ${facts.clones.length} clones over ${facts.clones.length ? '' : ''}production code.`);
  const byLayer = {};
  for (const f of F) byLayer[f.layer] = (byLayer[f.layer] || 0) + f.code;
  L.push(`Code lines by layer: ${Object.entries(byLayer).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v} (${pct(v / total('code'))})`).join(', ')}.`);
  L.push(`Pure functions outside core: ${total('pureOutsideCore')} (${total('pureLinesOutsideCore')} lines) that could move to core and be unit-tested.`);
  L.push('');
  const table = (title, rows, cols) => {
    L.push(`## ${title}`, '', `| ${cols.map((c) => c[0]).join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`);
    for (const r of rows) L.push(`| ${cols.map((c) => c[1](r)).join(' | ')} |`);
    L.push('');
  };
  table('Largest files', top(F, n, (f) => f.lines), [
    ['file', (f) => f.file], ['layer', (f) => f.layer], ['lines', (f) => f.lines], ['fns', (f) => f.functions], ['max fn', (f) => f.maxFunctionLines], ['Σ cx', (f) => f.complexity], ['fan-out', (f) => f.fanOut], ['commits', (f) => f.commits],
  ]);
  table('Hotspots (commits × complexity)', top(F, n, (f) => f.commits * f.complexity), [
    ['file', (f) => f.file], ['commits', (f) => f.commits], ['Σ cx', (f) => f.complexity], ['lines', (f) => f.lines], ['churned lines', (f) => f.churn],
  ]);
  table('Longest functions', top(fns, n, (f) => f.lines), [
    ['function', (f) => `${f.file}:${f.line} ${f.name}`], ['lines', (f) => f.lines], ['cx', (f) => f.complexity], ['nest', (f) => f.maxNesting], ['hooks', (f) => f.hookCount],
  ]);
  table('Most branching functions', top(fns, n, (f) => f.complexity), [
    ['function', (f) => `${f.file}:${f.line} ${f.name}`], ['cx', (f) => f.complexity], ['lines', (f) => f.lines], ['nest', (f) => f.maxNesting],
  ]);
  table('Components with the most hooks', top(fns.filter((f) => f.component), n, (f) => f.hookCount), [
    ['component', (f) => `${f.file}:${f.line} ${f.name}`], ['hooks', (f) => f.hookCount], ['effects', (f) => (f.hooks.useEffect || 0) + (f.hooks.useLayoutEffect || 0)], ['state', (f) => f.hooks.useState || 0], ['refs', (f) => f.hooks.useRef || 0], ['lines', (f) => f.lines],
  ]);
  table('Pure logic stranded outside core (by lines)', top(F.filter((f) => f.pureLinesOutsideCore), n, (f) => f.pureLinesOutsideCore), [
    ['file', (f) => f.file], ['layer', (f) => f.layer], ['pure fns', (f) => f.pureOutsideCore], ['their lines', (f) => f.pureLinesOutsideCore], ['of', (f) => f.lines],
  ]);
  const clones = facts.clones.filter((c) => inScope(c.a.file) || inScope(c.b.file));
  table(`Copy-paste (${clones.length} clones)`, clones.slice(0, n), [
    ['a', (c) => `${c.a.file}:${c.a.start}-${c.a.end}`], ['b', (c) => `${c.b.file}:${c.b.start}-${c.b.end}`], ['lines', (c) => c.lines], ['tokens', (c) => c.tokens], ['exact', (c) => (c.exact ? 'yes' : 'renamed')],
  ]);
  const helpers = facts.repeatedHelpers.filter((h) => h.defs.some((d) => inScope(d.file)));
  table(`Helpers defined in more than one file (${helpers.length})`, helpers.slice(0, n), [
    ['name', (h) => h.name], ['files', (h) => h.defs.map((d) => `${d.file}:${d.line}`).join('<br>')],
  ]);
  const P = facts.patterns;
  const inP = (k) => P[k].filter((x) => inScope(x.file));
  const list = (title, rows, fmt) => {
    L.push(`## ${title} (${rows.length})`, '');
    for (const r of rows.slice(0, n)) L.push(`- ${fmt(r)}`);
    if (rows.length > n) L.push(`- … ${rows.length - n} more`);
    L.push('');
  };
  list('Linear scans inside loops, in core (O(n·m) candidates)', inP('quadratic'), (x) => `${x.file}:${x.line} ${x.fn}: .${x.call}()`);
  list('Exported core functions that mutate a parameter', inP('paramMutation').filter((x) => x.exported), (x) => `${x.file}:${x.line} ${x.fn} writes ${x.param}`);
  const lt = [...new Set(inP('localTime').map((x) => x.file))];
  list('Core files reading local time (hidden input)', lt, (x) => `${x}: ${inP('localTime').filter((y) => y.file === x).length} reads`);
  const sc = F.filter((x) => x.silentCatches).sort((a, b) => b.silentCatches - a.silentCatches);
  list(`Swallowed errors: ${total('silentCatches')} in`, sc, (x) => `${x.file}: ${x.silentCatches}`);
  if (facts.floating) {
    const fl = F.filter((x) => x.floatingPromises).sort((a, b) => b.floatingPromises - a.floatingPromises);
    list(`Floating promises: ${total('floatingPromises')} in`, fl, (x) => `${x.file}: ${x.floatingPromises}`);
  }
  list('Effects that only set state (derive it in render)', inP('derivedStateEffects'), (x) => `${x.file}:${x.line} ${x.component} sets ${x.sets.join(', ')}`);
  list('State setters always called together (reducer candidates)', inP('setterClusters'), (x) => `${x.file}:${x.line} ${x.component}: ${x.setters.join(', ')}`);
  list('Components with more than 10 props', inP('wideProps'), (x) => `${x.file}:${x.line} ${x.component}: ${x.props}`);
  list('Store selectors returning a fresh object', inP('freshSelectors'), (x) => `${x.file}:${x.line}`);
  list('Calls missing their context arguments', inP('contextCalls'), (x) => `${x.file}:${x.line} ${x.call} without ${x.missing.join(', ')}`);
  const pb = F.filter((x) => P.platformBranches.some((y) => y.file === x.file)).map((x) => ({ file: x.file, n: P.platformBranches.filter((y) => y.file === x.file).length })).sort((a, b) => b.n - a.n);
  list(`Platform.OS branches in shared files: ${pb.reduce((a, x) => a + x.n, 0)} in`, pb, (x) => `${x.file}: ${x.n}`);
  list('Shell and adapter functions that decide (over 8 branches)', facts.shellDecisions.filter((x) => inScope(x.file)).sort((a, b) => b.complexity - a.complexity), (x) => `${x.file}:${x.line} ${x.name}: ${x.complexity}`);
  L.push(`Suppressed hook dependencies: ${total('hookDepSuppressions')}. Hard-coded colours: ${total('hexColors')} in ${F.filter((x) => x.hexColors).length} files.`, '');
  if (!only) {
    list('Modules no production file imports', facts.orphans, (x) => `${x.file}${x.testOnly ? ' (tests only)' : ''}`);
    list('Files in different features that change together, with no import between them', facts.coupling.pairs, (x) => `${x.a} ↔ ${x.b}: ${x.commits} commits, ${Math.round(x.confidence * 100)}%`);
    L.push(`Features touched per commit: median ${facts.coupling.featuresPerCommit.p50}, p90 ${facts.coupling.featuresPerCommit.p90}.`, '');
    list('Tests with no assertion', facts.testsWithoutAssertions, (x) => `${x.file}:${x.line} ${x.name}`);
    L.push(`## Import cycles (${facts.cycles.length})`, '');
    for (const c of facts.cycles.slice(0, n)) L.push(`- ${c.length} files: ${c.slice(0, 6).join(', ')}${c.length > 6 ? ', …' : ''}`);
    L.push('');
    L.push(`## Unused exports: ${facts.unusedExports.length} (${facts.unusedExports.filter((e) => !e.typeOnly).length} values); test-only exports: ${facts.testOnlyExports.length}`, '');
    table('Platform pairs drifting apart (exports one side lacks)', facts.platformPairs.filter((p) => p.onlyWeb.length || p.onlyNative.length).slice(0, n), [
      ['module', (p) => p.base], ['only web', (p) => p.onlyWeb.join(', ') || '-'], ['only native', (p) => p.onlyNative.join(', ') || '-'], ['cloned lines', (p) => p.sharedClonedLines],
    ]);
    L.push(`## Shells importing a singleton instead of taking ports (${facts.shellsOnSingletons.length})`, '', facts.shellsOnSingletons.map((x) => `- ${x.file}: ${[...new Set(x.imports)].join(', ')}${x.factory ? ' (has a factory too)' : ''}`).join('\n'), '');
    L.push(`## Core modules no test reaches (${facts.untestedCore.length})`, '', facts.untestedCore.map((f) => `- ${f}`).join('\n'), '');
  }
  return L.join('\n');
}

// --- the scope and the queue (CQ13) -----------------------------------------

/** The files a slice touched, and the other source files of their features; or one feature's files. */
function scopeFiles(root, facts, { feature = null } = {}) {
  const all = Object.keys(facts.files);
  const names = (rel) => features.featuresOf(rel).map((f) => f.name);
  if (feature) return all.filter((f) => names(f).includes(feature)).sort();
  const { changedFiles, changedPaths } = require('../affected');
  const r = changedFiles(root);
  const changed = r.all ? all : changedPaths(r.changes).filter((p) => facts.files[p]);
  const touched = new Set(changed.flatMap(names));
  return all.filter((f) => changed.includes(f) || names(f).some((n) => touched.has(n))).sort();
}

/**
 * The catalog moves found in `files`, ranked by the file's commits times its branches (where change
 * is frequent and code is tangled, a move pays most), then path, then line. Moves still waiting on
 * their slice (limits.WAITING) are left out.
 */
function queue(facts, files) {
  const inScope = new Set(files);
  const items = [];
  for (const v of limits.violations(facts)) {
    if (!inScope.has(v.file) || limits.WAITING[v.move]) continue;
    items.push({ move: v.move, file: v.file, line: v.line, evidence: `${v.name ? `${v.name}: ` : ''}${v.what}${v.limit != null ? ` ${v.value} (limit ${v.limit})` : v.value > 1 ? `: ${v.value}` : ''}` });
  }
  for (const f of facts.functions) {
    if (inScope.has(f.file) && f.hoistable && (f.layer === 'component' || f.layer === 'route' || f.layer === 'view') && f.lines >= 5 && f.captures && f.captures.length === 0) {
      items.push({ move: 'R3', file: f.file, line: f.line, evidence: `${f.name}: a ${f.lines}-line closure that captures nothing` });
    }
  }
  for (const c of facts.patterns.setterClusters) {
    if (inScope.has(c.file)) items.push({ move: 'R11', file: c.file, line: c.line, evidence: `${c.component}: ${c.setters.join(', ')} always set together` });
  }
  const score = (f) => (facts.files[f]?.commits || 0) * (facts.files[f]?.complexity || 0);
  return items.sort((a, b) => score(b.file) - score(a.file) || a.file.localeCompare(b.file) || a.line - b.line || a.move.localeCompare(b.move));
}

// --- the command line --------------------------------------------------------

function readBaseline(root) {
  const p = path.join(root, BASELINE);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}
function writeBaseline(root, b) {
  fs.writeFileSync(path.join(root, BASELINE), `${JSON.stringify(b, null, 1)}\n`);
}
function report(title, lines) {
  if (!lines.length) return '';
  return `${title} (${lines.length}):\n${lines.map((l) => `  ${l}`).join('\n')}\n`;
}

/** check | --baseline | --tighten | --scope [feature]; returns the exit code. */
function main(args, root = ROOT) {
  const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
  };
  const writing = args.includes('--baseline') || args.includes('--tighten');
  const facts = collect(root, { types: args.includes('--types') || writing });
  const v = limits.violations(facts);
  const skip = limits.unmeasured(facts);
  const json = opt('--json');
  if (json) fs.writeFileSync(json, JSON.stringify(facts, null, 1));
  if (args.includes('--baseline')) {
    if (readBaseline(root)) {
      console.error(`${BASELINE} exists: it is written once. Lower it with --tighten; never by hand.`);
      return 1;
    }
    writeBaseline(root, baselineOps.build(v));
    console.log(`${BASELINE}: ${v.length} entries recorded.`);
    return 0;
  }
  const gated = args.includes('check') || args.includes('--scope') || args.includes('--tighten');
  const feature = opt('--scope');
  if (feature && !features.byName.has(feature)) {
    console.error(`--scope: no feature "${feature}" in scripts/features.js (${[...features.byName.keys()].join(', ')}).`);
    return 2;
  }
  if (!gated) {
    const only = opt('--files') ? new Set(opt('--files').split(',').map((x) => x.trim()).filter(Boolean)) : null;
    process.stdout.write(summary(facts, { only, n: Number(opt('--top')) || 15 }) + '\n');
    return 0;
  }
  const base = readBaseline(root);
  if (!base) {
    console.error(`No ${BASELINE}: run npm run quality -- --baseline once.`);
    return 1;
  }
  if (args.includes('--tighten')) {
    const t = baselineOps.tighten(v, base, skip);
    if (!t.baseline) {
      console.error(report('Not tightened: these got worse or are new, and a baseline never takes them in', t.refused));
      return 1;
    }
    const dropped = Object.keys(base).length - Object.keys(t.baseline).length;
    writeBaseline(root, t.baseline);
    console.log(`${BASELINE}: tightened (${dropped} entries gone, values lowered where the code got better).`);
    return 0;
  }
  if (args.includes('check') || args.includes('--scope')) {
    let scope = null;
    if (args.includes('--scope')) scope = new Set(scopeFiles(root, facts, { feature }));
    const inScope = (x) => !scope || scope.has(x.file);
    const sub = scope ? Object.fromEntries(Object.entries(base).filter(([id]) => scope.has(id.slice(id.indexOf(':') + 1).split('#')[0]))) : base;
    const r = baselineOps.compare(v.filter(inScope), sub, skip);
    // --since <rev>: the baseline may be no looser than it was at <rev> (CI: the push's base; audit 4).
    const since = opt('--since');
    let loose = [];
    if (since !== null) {
      if (!since || /^0+$/.test(since)) console.log('check:quality --since: no base to compare the baseline with (a new branch); not judged.');
      else {
        let theirs = null;
        try {
          theirs = JSON.parse(execFileSync('git', ['show', `${since}:${BASELINE}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
        } catch {
          console.log(`check:quality --since: ${since} has no ${BASELINE} (or is not in this clone); not judged.`);
        }
        if (theirs) loose = baselineOps.looser(base, theirs).map((id) => `${id}: ${base[id]}, recorded ${theirs[id] ?? 'nowhere'} at ${since.slice(0, 8)}. Fix the code; a baseline is only lowered (--tighten).`);
      }
    }
    const out = report('Baseline looser than at --since', loose) + report('New code past a limit', r.added) + report('Worse than recorded', r.worse) + report('Better than recorded (tighten)', r.stale);
    if (out) console.log(out.trimEnd());
    else console.log(`check:quality: ok (${scope ? `${scope.size} files in scope, ` : ''}${Object.keys(base).length} recorded${skip.length ? `; without --types, ${skip.join(', ')} not measured` : ''}).`);
    if (scope) {
      const items = queue(facts, [...scope]);
      const n = Number(opt('--top')) || 15;
      console.log(`\nThe queue (${items.length}, by commits × branches):`);
      for (const it of items.slice(0, n)) console.log(`  ${it.move}  ${it.file}:${it.line}  ${it.evidence}`);
      const waiting = Object.entries(limits.WAITING).map(([m, why]) => `${m} waits on ${why}`).join('; ');
      if (waiting) console.log(`  (${waiting})`);
    }
    return r.added.length || r.worse.length || r.stale.length || loose.length ? 1 : 0;
  }
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { collect, summary, srcFiles, codeLines, smells, violations: limits.violations, scopeFiles, queue, main, lineCount };
