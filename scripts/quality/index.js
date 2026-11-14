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
function collect(root = ROOT, { minTokens } = {}) {
  const all = srcFiles(root);
  const prod = all.filter((f) => !isTest(f));
  const { layers: libLayers } = layers.readLayers(root);
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
  for (const rel of all) {
    const source = fs.readFileSync(path.join(root, rel), 'utf8');
    sources.set(rel, source);
    if (isTest(rel)) continue;
    const layer = layerOf(rel, libRel);
    const { sf, functions } = analyzeFunctions(rel, source, { resolveImport: importResolver(root, rel, libRel) });
    for (const f of functions) fnRecords.push({ file: rel, layer, ...f });
    const pureOutsideCore = layer === 'core' ? [] : functions.filter((f) => f.pure && f.lines >= 3);
    const components = functions.filter((f) => f.component);
    const fanOut = graph.valueEdges.get(rel)?.size || 0;
    const ch = history.files.get(rel);
    files[rel] = {
      layer,
      features: featureNames(rel),
      lines: source.split('\n').length,
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
  const shellsOnSingletons = prod
    .filter((f) => files[f].layer === 'shell' && !/^\/\/ @instance/m.test(sources.get(f)))
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
  if (!only) {
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

if (require.main === module) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : null;
  };
  const facts = collect(ROOT);
  const json = opt('--json');
  if (json) fs.writeFileSync(json, JSON.stringify(facts, null, 1));
  const only = opt('--files') ? new Set(opt('--files').split(',').map((s) => s.trim()).filter(Boolean)) : null;
  process.stdout.write(summary(facts, { only, n: Number(opt('--top')) || 15 }) + '\n');
}

module.exports = { collect, summary, srcFiles, codeLines, smells };
