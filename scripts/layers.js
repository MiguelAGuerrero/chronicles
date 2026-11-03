// The layer of every module in src/lib, and the imports that cross a layer
// the wrong way. One reader for both `npm test` (src/lib/__tests__/layers.test.ts)
// and `eslint.config.js`, so they always agree on which files are core.
//
// A module declares its layer on its first line: `// @layer core`.
//   core     decisions and data: imports only core, pure packages, JSON and types
//   shell    carries out one feature's effects (db, timers, the store)
//   adapter  a platform implementation behind an interface (db/*, recorder/*, ...)
//   view     a React hook
// src/app and src/components are views by folder and carry no tag.
// The convention: .claude/rules/functional-core.md.

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const LAYERS = ['core', 'shell', 'adapter', 'view'];
/** Packages a core module may import: plain computation, no platform. */
const PURE_PACKAGES = ['fflate', 'pbf', '@mapbox/vector-tile'];
const TAG = /^\/\/ @layer (\S+)\s*$/;

function libDir(root) {
  return path.join(root, 'src', 'lib');
}

/** Every non-test .ts/.tsx file under src/lib, as absolute paths, sorted. */
function libFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
    }
  };
  walk(libDir(root));
  return out.sort();
}

/**
 * The layer a source declares, or why it declares none. Only the first line
 * counts; another `@layer` line anywhere in the file is an error too.
 */
function readLayer(source) {
  const lines = source.split('\n');
  const tagged = lines.map((l, i) => [i, /^\/\/ @layer\b/.test(l)]).filter(([, t]) => t);
  const fix = `Start the file with one line: // @layer ${LAYERS.join('|')} (see .claude/rules/functional-core.md).`;
  if (tagged.length === 0 || tagged[0][0] !== 0) return { error: `no layer on its first line. ${fix}` };
  if (tagged.length > 1) return { error: `more than one @layer line. ${fix}` };
  const m = TAG.exec(lines[0]);
  if (!m || !LAYERS.includes(m[1])) return { error: `unknown layer "${lines[0].slice(10).trim()}". ${fix}` };
  return { layer: m[1] };
}

/** Value imports and re-exports of a source (type-only ones left out), with their lines. */
function valueImports(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const add = (node, spec) => out.push({ spec, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 });
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const c = st.importClause;
      if (c && c.isTypeOnly) continue;
      // `import { type A, type B } from` imports nothing at run time.
      const named = c && c.namedBindings && ts.isNamedImports(c.namedBindings) ? c.namedBindings.elements : null;
      if (c && !c.name && named && named.length > 0 && named.every((e) => e.isTypeOnly)) continue;
      add(st, st.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
      if (st.isTypeOnly) continue;
      const named = st.exportClause && ts.isNamedExports(st.exportClause) ? st.exportClause.elements : null;
      if (named && named.length > 0 && named.every((e) => e.isTypeOnly)) continue;
      add(st, st.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(st) && !st.isTypeOnly && ts.isExternalModuleReference(st.moduleReference)) {
      add(st, st.moduleReference.expression.text);
    }
  }
  // require('x') and import('x') anywhere in the file (functional-core audit 3).
  const calls = (node) => {
    if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === 'require')) add(node, node.arguments[0].text);
    }
    ts.forEachChild(node, calls);
  };
  calls(sf);
  return out;
}

const MUTATORS = new Set(['set', 'add', 'delete', 'clear', 'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);

/**
 * Module-level `const`s holding a Map, Set, array or object that the file
 * mutates: state no test can see or reset, which lint's `let`/`var` rule
 * misses (functional-core audit 2). A read-only lookup table is fine.
 */
function moduleState(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const held = new Map();
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || !d.initializer) continue;
      let init = d.initializer;
      while (ts.isAsExpression(init) || ts.isSatisfiesExpression(init) || ts.isParenthesizedExpression(init)) init = init.expression;
      const container =
        (ts.isNewExpression(init) && ts.isIdentifier(init.expression) && ['Map', 'Set', 'WeakMap', 'WeakSet', 'Array'].includes(init.expression.text)) ||
        ts.isArrayLiteralExpression(init) ||
        ts.isObjectLiteralExpression(init);
      if (container) held.set(d.name.text, sf.getLineAndCharacterOfPosition(d.getStart(sf)).line + 1);
    }
  }
  const mutated = new Set();
  const target = (e) => (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) && ts.isIdentifier(e.expression) && held.has(e.expression.text) ? e.expression.text : null;
  const walk = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && MUTATORS.has(node.expression.name.text)) {
      const t = target(node.expression);
      if (t) mutated.add(t);
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const t = target(node.left);
      if (t) mutated.add(t);
    }
    const steps = [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken];
    if ((ts.isPostfixUnaryExpression(node) || ts.isPrefixUnaryExpression(node)) && steps.includes(node.operator)) {
      const t = target(node.operand);
      if (t) mutated.add(t);
    }
    if (ts.isDeleteExpression(node)) {
      const t = target(node.expression);
      if (t) mutated.add(t);
    }
    ts.forEachChild(node, walk);
  };
  walk(sf);
  return [...mutated].map((name) => ({ name, line: held.get(name) }));
}

/**
 * Every file a relative import can load: Metro picks `x.native.ts` on the
 * phone and `x.web.ts` on the web over a plain `x.ts`, so each one that exists
 * counts (functional-core audit 3). Empty when nothing resolves.
 */
function resolveAll(from, spec) {
  const base = path.resolve(path.dirname(from), spec);
  const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();
  if (isFile(base)) return [base];
  for (const stem of [base, path.join(base, 'index')]) {
    const found = ['.ts', '.tsx', '.native.ts', '.native.tsx', '.web.ts', '.web.tsx'].map((e) => stem + e).filter(isFile);
    if (found.length) return found;
  }
  return [];
}

/** The layer of every src/lib file (relative path → layer or null), and the files with no valid tag. */
function readLayers(root) {
  const layers = new Map();
  const untagged = [];
  for (const file of libFiles(root)) {
    const rel = path.relative(root, file);
    const r = readLayer(fs.readFileSync(file, 'utf8'));
    layers.set(rel, r.layer || null);
    if (r.error) untagged.push({ file: rel, message: `${rel}: ${r.error}` });
  }
  return { layers, untagged };
}

function packageName(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Value imports from core modules that reach something other than core: a
 * module in another layer, a file outside src/lib, or a package not in
 * PURE_PACKAGES. Since core may import only core, a clean result holds
 * transitively. `id` is what the baseline records: `<file> -> <import>`.
 */
function coreViolations(root) {
  const { layers } = readLayers(root);
  const out = [];
  for (const [rel, layer] of layers) {
    if (layer !== 'core') continue;
    const file = path.join(root, rel);
    for (const { spec, line } of valueImports(file, fs.readFileSync(file, 'utf8'))) {
      let reaches;
      if (spec.startsWith('.')) {
        const targets = resolveAll(file, spec);
        if (!targets.length) reaches = 'a file that does not resolve';
        else {
          const bad = targets
            .filter((t) => !t.endsWith('.json'))
            .map((t) => path.relative(root, t))
            .filter((trel) => layers.get(trel) !== 'core')
            .map((trel) => {
              const tl = layers.get(trel);
              return tl ? `${trel} (${tl})` : layers.has(trel) ? `${trel} (no layer)` : `${trel} (outside src/lib: a view)`;
            });
          if (!bad.length) continue;
          reaches = bad.join(' and ');
        }
      } else {
        if (PURE_PACKAGES.includes(packageName(spec))) continue;
        reaches = `the package ${packageName(spec)}`;
      }
      out.push({
        id: `${rel} -> ${spec}`,
        message:
          `${rel}:${line} is core but imports '${spec}', which reaches ${reaches}. ` +
          `Core imports only core: pass the value in as an argument, import only its type (import type), ` +
          `or move this code to a shell (.claude/rules/functional-core.md).`,
      });
    }
    for (const { name, line } of moduleState(file, fs.readFileSync(file, 'utf8'))) {
      out.push({
        id: `${rel} holds ${name}`,
        message:
          `${rel}:${line} is core but keeps module-level state in '${name}', which it mutates: no test can see or reset it. ` +
          `Keep it in a shell (a Store, or a factory's closure), or pass it in (.claude/rules/functional-core.md).`,
      });
    }
  }
  const seen = new Set();
  return out.filter((v) => (seen.has(v.id) ? false : seen.add(v.id)));
}

/**
 * Checks the tree against a baseline of known core violations (ids). Returns
 * the problems: files with no layer, violations not in the baseline, and
 * baseline entries that no longer occur (remove them: the baseline only shrinks).
 */
function check(root, baseline) {
  const { untagged } = readLayers(root);
  const found = coreViolations(root);
  const known = new Set(baseline);
  const ids = new Set(found.map((v) => v.id));
  return {
    untagged: untagged.map((u) => u.message),
    added: found.filter((v) => !known.has(v.id)).map((v) => v.message),
    stale: [...known].filter((id) => !ids.has(id)).map((id) => `"${id}" is in the baseline but no longer occurs: delete it from src/lib/__tests__/layers.baseline.json.`),
  };
}

/** Files of one layer, relative to root with forward slashes, for ESLint's `files`. */
function filesOfLayer(root, layer) {
  const { layers } = readLayers(root);
  return [...layers].filter(([, l]) => l === layer).map(([rel]) => rel.split(path.sep).join('/'));
}

// ESLint rules for core files (FC3): no hidden inputs. Plain syntax rules, so
// they need no type information and run over any parser.
const FIX = 'Core takes it as an argument instead (now, an id, a random draw), or the code moves to a shell (.claude/rules/functional-core.md).';
const coreLintRules = {
  'no-restricted-properties': [
    'error',
    { object: 'Date', property: 'now', message: `Date.now() reads the clock: a hidden input. ${FIX}` },
    { object: 'Math', property: 'random', message: `Math.random() is a hidden input. ${FIX}` },
    { object: 'performance', property: 'now', message: `performance.now() reads the clock: a hidden input. ${FIX}` },
    { object: 'crypto', property: 'randomUUID', message: `crypto.randomUUID() is a hidden input. ${FIX}` },
    { object: 'crypto', property: 'getRandomValues', message: `crypto.getRandomValues() is a hidden input. ${FIX}` },
  ],
  'no-restricted-globals': [
    'error',
    { name: 'setTimeout', message: `A timer is an effect. ${FIX}` },
    { name: 'setInterval', message: `A timer is an effect. ${FIX}` },
    { name: 'requestAnimationFrame', message: `A frame callback is an effect. ${FIX}` },
    { name: 'requestIdleCallback', message: `An idle callback is an effect. ${FIX}` },
    { name: 'queueMicrotask', message: `Scheduling is an effect. ${FIX}` },
    { name: 'globalThis', message: `globalThis reaches the platform (its clock, timers, storage): a hidden input. ${FIX}` },
    { name: 'window', message: `window reaches the platform (its clock, timers, storage): a hidden input. ${FIX}` },
  ],
  'no-restricted-syntax': [
    'error',
    { selector: "NewExpression[callee.name='Date'][arguments.length=0]", message: `new Date() reads the clock: a hidden input. ${FIX} new Date(t) is fine.` },
    { selector: "CallExpression[callee.name='Date']", message: `Date() reads the clock: a hidden input. ${FIX}` },
    {
      selector:
        "Program > VariableDeclaration[kind=/^(let|var)$/]:not([declare=true]), Program > ExportNamedDeclaration > VariableDeclaration[kind=/^(let|var)$/]:not([declare=true])",
      message: `Module-level let or var is state no test can see or reset. Keep state in a shell (a Store), or make it a const. (.claude/rules/functional-core.md)`,
    },
  ],
};

// The singletons a view must not import (FC5): the db, the recorder, the
// notifier, and the ports that hold all three. Matched by the imported name,
// so other values from the same modules (a constant, a shell function) are
// fine. Its own rule id, so a suppressed count can never hide one of the older
// import boundaries (functional-core audit 1).
const FC5_RULE = 'no-restricted-syntax';
const FC5_MESSAGE =
  "Screens, components and hooks don't import the db, recorder, notifier or ports. Call a feature shell instead (src/lib/<feature>/shell.ts, " +
  'whose app instance is built from `ports`); type-only imports are fine. See .claude/rules/functional-core.md.';
const viewSingletonRule = [
  'error',
  {
    selector: "ImportDeclaration[importKind!='type'] > ImportSpecifier[importKind!='type'][imported.name=/^(db|recorder|notifier|ports)$/]",
    message: FC5_MESSAGE,
  },
  {
    selector: "ImportDeclaration[importKind!='type'][source.value=/(^|\\/)(db|recorder|notify|ports)(\\/index(\\.native|\\.web)?)?$/] > ImportNamespaceSpecifier",
    message: FC5_MESSAGE,
  },
];

module.exports = {
  LAYERS,
  PURE_PACKAGES,
  libFiles,
  readLayer,
  valueImports,
  readLayers,
  moduleState,
  coreViolations,
  check,
  filesOfLayer,
  coreLintRules,
  FC5_RULE,
  viewSingletonRule,
};
