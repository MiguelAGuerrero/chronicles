// The import graph of src, with what each file exports and who uses it:
// fan-in, fan-out, cycles (strongly connected components of value imports),
// exports nothing imports, exports only tests import, and the imports that
// cross from one feature (scripts/features.js) into another.

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const layers = require('../layers');

const toPosix = (p) => p.split(path.sep).join('/');
const ROUTE_EXPORTS = new Set(['default', 'ErrorBoundary', 'unstable_settings', 'generateStaticParams', 'loader']);

/** What a file imports (by target and name) and what it exports, from its syntax. */
function readModule(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = []; // { spec, names: string[] | '*', typeOnly, reexport }
  const exports = new Map(); // name → { kind, line, typeOnly }
  const starExports = [];
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const isExported = (n) => ts.canHaveModifiers(n) && (ts.getModifiers(n) || []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const isDefault = (n) => ts.canHaveModifiers(n) && (ts.getModifiers(n) || []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const c = st.importClause;
      const spec = st.moduleSpecifier.text;
      if (!c) {
        imports.push({ spec, names: [], typeOnly: false, sideEffect: true });
        continue;
      }
      const names = [];
      let star = false;
      if (c.name) names.push('default');
      if (c.namedBindings) {
        if (ts.isNamespaceImport(c.namedBindings)) star = true;
        else for (const e of c.namedBindings.elements) names.push((e.propertyName || e.name).text);
      }
      const allTypes = c.isTypeOnly || (!c.name && c.namedBindings && ts.isNamedImports(c.namedBindings) && c.namedBindings.elements.length > 0 && c.namedBindings.elements.every((e) => e.isTypeOnly));
      imports.push({ spec, names: star ? '*' : names, typeOnly: !!allTypes, line: lineOf(st) });
    } else if (ts.isExportDeclaration(st)) {
      const spec = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) ? st.moduleSpecifier.text : null;
      if (!st.exportClause) {
        if (spec) {
          imports.push({ spec, names: '*', typeOnly: st.isTypeOnly, reexport: true, line: lineOf(st) });
          starExports.push(spec);
        }
        continue;
      }
      if (ts.isNamespaceExport(st.exportClause)) {
        exports.set(st.exportClause.name.text, { kind: 'namespace', line: lineOf(st), typeOnly: st.isTypeOnly });
        if (spec) imports.push({ spec, names: '*', typeOnly: st.isTypeOnly, reexport: true, line: lineOf(st) });
        continue;
      }
      const names = [];
      for (const e of st.exportClause.elements) {
        exports.set(e.name.text, { kind: spec ? 'reexport' : 'local', line: lineOf(st), typeOnly: st.isTypeOnly || e.isTypeOnly, from: spec, as: (e.propertyName || e.name).text });
        names.push((e.propertyName || e.name).text);
      }
      if (spec) imports.push({ spec, names, typeOnly: st.isTypeOnly, reexport: true, line: lineOf(st) });
    } else if (ts.isExportAssignment(st)) {
      exports.set('default', { kind: 'default', line: lineOf(st), typeOnly: false });
    } else if (isExported(st)) {
      const typeOnly = ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st);
      if (isDefault(st)) exports.set('default', { kind: 'default', line: lineOf(st), typeOnly });
      else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) exports.set(d.name.text, { kind: 'const', line: lineOf(d), typeOnly: false });
      } else if (st.name && ts.isIdentifier(st.name)) {
        exports.set(st.name.text, { kind: ts.SyntaxKind[st.kind].replace('Declaration', '').toLowerCase(), line: lineOf(st), typeOnly });
      }
    }
  }
  // require() and import() anywhere: the whole module is used.
  const calls = (node) => {
    if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === 'require')) imports.push({ spec: node.arguments[0].text, names: '*', typeOnly: false, dynamic: true, line: lineOf(node) });
    }
    // new Worker(new URL('./x', import.meta.url)): the bundler loads ./x as a module of its own.
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL' && node.arguments && node.arguments.length === 2 && ts.isStringLiteralLike(node.arguments[0]) && node.arguments[0].text.startsWith('.') && node.arguments[1].getText(sf) === 'import.meta.url') {
      imports.push({ spec: node.arguments[0].text, names: '*', typeOnly: false, dynamic: true, line: lineOf(node) });
    }
    ts.forEachChild(node, calls);
  };
  calls(sf);
  return { imports, exports, starExports };
}

/** Tarjan's strongly connected components; returns those of more than one node. */
function cycles(nodes, edges) {
  let index = 0;
  const idx = new Map();
  const low = new Map();
  const stack = [];
  const on = new Set();
  const out = [];
  const strong = (v) => {
    // Iterative, so a deep graph cannot overflow the stack.
    const work = [[v, 0]];
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    on.add(v);
    while (work.length) {
      const frame = work[work.length - 1];
      const [u, i] = frame;
      const succ = [...(edges.get(u) || [])];
      if (i < succ.length) {
        frame[1]++;
        const w = succ[i];
        if (!idx.has(w)) {
          idx.set(w, index);
          low.set(w, index);
          index++;
          stack.push(w);
          on.add(w);
          work.push([w, 0]);
        } else if (on.has(w)) low.set(u, Math.min(low.get(u), idx.get(w)));
      } else {
        work.pop();
        if (work.length) {
          const parent = work[work.length - 1][0];
          low.set(parent, Math.min(low.get(parent), low.get(u)));
        }
        if (low.get(u) === idx.get(u)) {
          const comp = [];
          let w;
          do {
            w = stack.pop();
            on.delete(w);
            comp.push(w);
          } while (w !== u);
          if (comp.length > 1) out.push(comp.sort());
        }
      }
    }
  };
  for (const v of nodes) if (!idx.has(v)) strong(v);
  return out.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

/**
 * The graph over `files` (repo-relative paths). Importers outside the set
 * (index.js, scripts) are read too, so an export only they use is not dead.
 */
function buildGraph(root, files, { extraImporters = [], isTest = () => false, featuresOf = () => [] } = {}) {
  const mods = new Map();
  for (const rel of [...files, ...extraImporters]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    mods.set(rel, readModule(abs, fs.readFileSync(abs, 'utf8')));
  }
  const inSet = new Set(files);
  const out = new Map(); // value edges, for cycles and fan
  const typeOut = new Map();
  const fanIn = new Map(files.map((f) => [f, new Set()]));
  const testFanIn = new Map(files.map((f) => [f, new Set()]));
  const used = new Map(files.map((f) => [f, { names: new Set(), star: false, byTest: new Set(), byProd: new Set() }]));
  const packages = new Map();
  const crossFeature = [];
  const usedOutside = new Set();

  for (const [rel, mod] of mods) {
    const abs = path.join(root, rel);
    for (const imp of mod.imports) {
      if (!imp.spec.startsWith('.')) {
        const pkg = imp.spec.startsWith('@') ? imp.spec.split('/').slice(0, 2).join('/') : imp.spec.split('/')[0];
        if (!isTest(rel) && inSet.has(rel)) {
          if (!packages.has(pkg)) packages.set(pkg, new Set());
          packages.get(pkg).add(rel);
        }
        continue;
      }
      const targets = layers.resolveAll(abs, imp.spec).map((t) => toPosix(path.relative(root, t))).filter((t) => inSet.has(t));
      for (const t of targets) {
        if (t === rel) continue;
        const u = used.get(t);
        if (imp.names === '*') u.star = true;
        else for (const n of imp.names) {
          u.names.add(n);
          (isTest(rel) ? u.byTest : u.byProd).add(n);
        }
        if (!inSet.has(rel)) {
          usedOutside.add(t);
          // index.js, scripts: real importers, never tests.
          if (imp.names !== '*') for (const n of imp.names) u.byProd.add(n);
          continue;
        }
        if (isTest(rel)) {
          testFanIn.get(t).add(rel);
          continue;
        }
        fanIn.get(t).add(rel);
        const bucket = imp.typeOnly ? typeOut : out;
        if (!bucket.has(rel)) bucket.set(rel, new Set());
        bucket.get(rel).add(t);
        const fa = featuresOf(rel);
        const fb = featuresOf(t);
        if (fa.length && fb.length && !fa.some((x) => fb.includes(x))) crossFeature.push({ from: rel, to: t, fromFeatures: fa, toFeatures: fb, typeOnly: imp.typeOnly });
      }
    }
  }
  // A star re-export passes usage through: if `index.ts` does `export * from './x'`
  // and something imports name n from index, x's n is used.
  for (let pass = 0; pass < 5; pass++) {
    for (const [rel, mod] of mods) {
      if (!inSet.has(rel)) continue;
      const u = used.get(rel);
      for (const spec of mod.starExports) {
        for (const t of layers.resolveAll(path.join(root, rel), spec).map((x) => toPosix(path.relative(root, x))).filter((x) => inSet.has(x))) {
          const tu = used.get(t);
          if (u.star) tu.star = true;
          for (const n of u.names) tu.names.add(n);
          for (const n of u.byProd) tu.byProd.add(n);
          for (const n of u.byTest) tu.byTest.add(n);
        }
      }
    }
  }
  const prodFiles = files.filter((f) => !isTest(f));
  const unusedExports = [];
  const testOnlyExports = [];
  for (const f of prodFiles) {
    const mod = mods.get(f);
    const u = used.get(f);
    if (!mod || u.star) continue;
    for (const [name, e] of mod.exports) {
      if (u.byProd.has(name)) continue;
      // Expo Router reads these from a route file itself.
      if (f.startsWith('src/app/') && ROUTE_EXPORTS.has(name)) continue;
      if (u.byTest.has(name)) testOnlyExports.push({ file: f, name, line: e.line, typeOnly: e.typeOnly });
      else unusedExports.push({ file: f, name, line: e.line, typeOnly: e.typeOnly });
    }
  }
  return {
    mods,
    valueEdges: out,
    typeEdges: typeOut,
    fanIn,
    testFanIn,
    cycles: cycles(prodFiles, out),
    unusedExports,
    testOnlyExports,
    packages,
    crossFeature,
    usedOutside,
  };
}

module.exports = { readModule, buildGraph, cycles };
