// Every function in a source file, measured from its syntax tree alone: size,
// branching, nesting, hooks, JSX, and whether it decides or acts (the
// functional-core line, .claude/rules/functional-core.md). Deterministic: the
// same tree gives the same numbers on any machine.
//
// "Pure" here is a syntactic verdict, not a proof. A function is pure when it
// reads no hidden input (clock, randomness, timers, platform globals), does not
// await, calls no hook, renders no JSX, mutates nothing it did not declare,
// and reaches outside itself only for core imports, globals that compute,
// module constants and other pure functions of the same file. What a
// parameter is (a callback, a port) is not looked into: passing an effect in is
// how core stays pure.

const ts = require('typescript');

const FN_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);
const isFn = (n) => FN_KINDS.has(n.kind);

/** Globals that compute and reach nothing outside: fine inside a pure function. */
const PURE_GLOBALS = new Set([
  'Math', 'JSON', 'Object', 'Array', 'Number', 'String', 'Boolean', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Symbol', 'BigInt', 'RegExp', 'Error', 'TypeError', 'RangeError', 'Infinity', 'NaN', 'undefined',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI',
  'decodeURI', 'Promise', 'Uint8Array', 'Uint16Array', 'Uint32Array', 'Int8Array', 'Int16Array', 'Int32Array',
  'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView', 'TextEncoder', 'TextDecoder', 'Intl', 'Date',
  'structuredClone', 'arguments', 'atob', 'btoa', 'URL', 'URLSearchParams',
]);
/** Globals that reach the clock, the platform or the outside world. */
const EFFECT_GLOBALS = new Set([
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'requestIdleCallback', 'queueMicrotask', 'window', 'globalThis', 'document', 'navigator', 'localStorage',
  'sessionStorage', 'indexedDB', 'fetch', 'console', 'performance', 'crypto', 'process', 'alert', 'location',
  'XMLHttpRequest', 'WebSocket', 'Worker', 'Image', 'Audio', 'FileReader', 'Blob', 'require',
]);
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);

function scriptKind(file) {
  return file.endsWith('x') ? ts.ScriptKind.TSX : file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
}
function parse(file, source) {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind(file));
}
const lineOf = (sf, pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;

/** The name a function goes by: its own, its variable's, its property's, or the call it is passed to. */
function fnName(node) {
  if (node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isPrivateIdentifier(node.name))) return node.name.text;
  if (node.kind === ts.SyntaxKind.Constructor) return 'constructor';
  const p = node.parent;
  if (!p) return '<anonymous>';
  if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) return p.name.text;
  if (ts.isPropertyDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  if (ts.isBinaryExpression(p) && ts.isPropertyAccessExpression(p.left)) return p.left.name.text;
  if (ts.isCallExpression(p)) {
    // useCallback(() => …) inside `const onPress = useCallback(…)` is onPress.
    const gp = p.parent;
    const callee = calleeName(p.expression);
    if (gp && ts.isVariableDeclaration(gp) && ts.isIdentifier(gp.name)) return `${gp.name.text}`;
    return `<${callee || 'call'} callback>`;
  }
  if (ts.isJsxExpression(p)) {
    const attr = p.parent;
    if (attr && ts.isJsxAttribute(attr)) return `<${attr.name.getText()} handler>`;
  }
  if (ts.isExportAssignment(p)) return 'default';
  return '<anonymous>';
}
function calleeName(e) {
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) {
    const left = calleeName(e.expression);
    return left ? `${left}.${e.name.text}` : e.name.text;
  }
  return null;
}

/** Names bound by a binding pattern or identifier. */
function bindingNames(name, out) {
  if (!name) return out;
  if (ts.isIdentifier(name)) out.add(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const el of name.elements) if (!ts.isOmittedExpression(el)) bindingNames(el.name, out);
  }
  return out;
}

/** Names a function declares anywhere in its own body (not in nested functions), and its parameters. */
function declaredIn(fn) {
  const out = new Set();
  for (const p of fn.parameters || []) bindingNames(p.name, out);
  const visit = (n) => {
    if (n !== fn && isFn(n)) {
      if (ts.isFunctionDeclaration(n) && n.name) out.add(n.name.text);
      return;
    }
    if (ts.isVariableDeclaration(n)) bindingNames(n.name, out);
    else if (ts.isClassDeclaration(n) && n.name) out.add(n.name.text);
    else if (ts.isCatchClause(n) && n.variableDeclaration) bindingNames(n.variableDeclaration.name, out);
    ts.forEachChild(n, visit);
  };
  if (fn.body) visit(fn.body);
  return out;
}

/** Is this identifier a value reference (not a property name, a declaration, a label or a type)? */
function isReference(id) {
  const p = id.parent;
  if (!p) return false;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return false;
  if (ts.isQualifiedName(p)) return false;
  if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isPropertySignature(p)) && p.name === id) return false;
  if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isClassDeclaration(p)) && p.name === id) return false;
  if (ts.isBindingElement(p) && (p.name === id || p.propertyName === id)) return false;
  if (ts.isJsxAttribute(p)) return false;
  if ((ts.isLabeledStatement(p) || ts.isBreakStatement(p) || ts.isContinueStatement(p)) && p.label === id) return false;
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p)) return false;
  if (ts.isEnumMember(p) || ts.isGetAccessor(p) || ts.isSetAccessor(p)) return false;
  if (ts.isTypeReferenceNode(p) || ts.isExpressionWithTypeArguments(p)) return false;
  // JSX tag names are components: references, but to a view.
  return true;
}

/** The root identifier of `a.b[c].d`, or null. */
function rootIdent(e) {
  while (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
  return ts.isIdentifier(e) ? e.text : e.kind === ts.SyntaxKind.ThisKeyword ? 'this' : null;
}

/**
 * Measures one function: the walk stops at nested functions, which are
 * measured on their own, so a component's numbers are its own body's.
 */
function measure(sf, fn) {
  const own = declaredIn(fn);
  const m = {
    complexity: 1,
    maxNesting: 0,
    hooks: {},
    jsx: false,
    awaits: false,
    hidden: new Set(),
    freeRefs: new Set(),
    mutatesOuter: new Set(),
    returns: 0,
    statements: 0,
  };
  const branchy = (n) =>
    ts.isIfStatement(n) || ts.isForStatement(n) || ts.isForInStatement(n) || ts.isForOfStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n) || ts.isSwitchStatement(n) || ts.isTryStatement(n);
  const typeNode = (n) => n.kind >= ts.SyntaxKind.FirstTypeNode && n.kind <= ts.SyntaxKind.LastTypeNode;
  const visit = (n, depth) => {
    if (n !== fn && isFn(n)) {
      // A nested function's free names that are not its own locals count as
      // references from here too (a closure reads what it captures).
      return;
    }
    if (typeNode(n) || ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;
    if (ts.isIfStatement(n) || ts.isConditionalExpression(n) || ts.isCaseClause(n) || ts.isCatchClause(n) ||
        ts.isForStatement(n) || ts.isForInStatement(n) || ts.isForOfStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n)) m.complexity++;
    if (ts.isBinaryExpression(n)) {
      const k = n.operatorToken.kind;
      if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) m.complexity++;
      if (k >= ts.SyntaxKind.FirstAssignment && k <= ts.SyntaxKind.LastAssignment) {
        const r = rootIdent(n.left);
        if (r && !own.has(r)) m.mutatesOuter.add(r);
      }
    }
    if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)) {
      const r = rootIdent(n.operand);
      if (r && !own.has(r)) m.mutatesOuter.add(r);
    }
    if (ts.isDeleteExpression(n)) {
      const r = rootIdent(n.expression);
      if (r && !own.has(r)) m.mutatesOuter.add(r);
    }
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      if (ts.isIdentifier(callee) && /^use[A-Z0-9]/.test(callee.text)) m.hooks[callee.text] = (m.hooks[callee.text] || 0) + 1;
      if (ts.isPropertyAccessExpression(callee) && MUTATORS.has(callee.name.text)) {
        const r = rootIdent(callee.expression);
        // `out.push` on a local is fine; on something captured, it is a write outside.
        if (r && !own.has(r) && r !== 'Object' && r !== 'Array') m.mutatesOuter.add(r);
      }
      const cn = calleeName(callee);
      if (cn === 'Date.now' || cn === 'Math.random' || cn === 'performance.now' || (cn && cn.startsWith('crypto.'))) m.hidden.add(cn);
    }
    if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Date' && (!n.arguments || n.arguments.length === 0)) m.hidden.add('new Date()');
    if (ts.isAwaitExpression(n) || ts.isForOfStatement(n) && n.awaitModifier) m.awaits = true;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) m.jsx = true;
    if (ts.isReturnStatement(n)) m.returns++;
    if (ts.isStatement(n) && !ts.isBlock(n)) m.statements++;
    if (ts.isIdentifier(n) && isReference(n) && !own.has(n.text)) {
      if (EFFECT_GLOBALS.has(n.text)) m.hidden.add(n.text);
      else m.freeRefs.add(n.text);
    }
    if (n.kind === ts.SyntaxKind.ThisKeyword) m.freeRefs.add('this');
    const d = branchy(n) ? depth + 1 : depth;
    if (d > m.maxNesting) m.maxNesting = d;
    ts.forEachChild(n, (c) => visit(c, d));
  };
  if (fn.body) visit(fn.body, 0);
  // Free names of nested functions that the outer function does not declare
  // are its free names as well: a closure that writes a captured `let` is the
  // outer function's write when it is called.
  const nested = [];
  const collect = (n) => {
    if (n !== fn && isFn(n)) {
      nested.push(n);
      return;
    }
    ts.forEachChild(n, collect);
  };
  if (fn.body) collect(fn.body);
  for (const inner of nested) {
    const im = measure(sf, inner);
    for (const r of im.freeRefs) if (!own.has(r)) m.freeRefs.add(r);
    for (const r of im.mutatesOuter) if (!own.has(r)) m.mutatesOuter.add(r);
    for (const h of im.hidden) m.hidden.add(h);
    if (im.awaits && ts.isArrowFunction(inner) === false) {
      // an inner async function awaiting is its own business
    }
  }
  return m;
}

/** Module-level facts a function's free names are judged against. */
function moduleScope(sf, resolveImport) {
  const imports = new Map(); // local name → { spec, typeOnly }
  const consts = new Set();
  const lets = new Set();
  const fns = new Set();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && st.importClause && ts.isStringLiteral(st.moduleSpecifier)) {
      const c = st.importClause;
      const spec = st.moduleSpecifier.text;
      if (c.name) imports.set(c.name.text, { spec, typeOnly: c.isTypeOnly });
      if (c.namedBindings) {
        if (ts.isNamespaceImport(c.namedBindings)) imports.set(c.namedBindings.name.text, { spec, typeOnly: c.isTypeOnly });
        else for (const e of c.namedBindings.elements) imports.set(e.name.text, { spec, typeOnly: c.isTypeOnly || e.isTypeOnly });
      }
    } else if (ts.isVariableStatement(st)) {
      const isConst = (st.declarationList.flags & ts.NodeFlags.Const) !== 0;
      for (const d of st.declarationList.declarations) {
        const names = bindingNames(d.name, new Set());
        const fnInit = d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer));
        for (const nm of names) (fnInit ? fns : isConst ? consts : lets).add(nm);
      }
    } else if (ts.isFunctionDeclaration(st) && st.name) fns.add(st.name.text);
    else if ((ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) consts.add(st.name.text);
  }
  return { imports, consts, lets, fns, resolveImport };
}

/**
 * Every function of a file with its measures and, for top-level functions and
 * hoistable closures, a purity verdict with reasons.
 */
function analyzeFunctions(file, source, { resolveImport = () => 'unknown' } = {}) {
  const sf = parse(file, source);
  const scope = moduleScope(sf, resolveImport);
  const all = [];
  const walk = (n, parentFn) => {
    if (isFn(n)) {
      const start = lineOf(sf, n.getStart(sf));
      const end = lineOf(sf, n.end);
      const m = measure(sf, n);
      const rec = {
        node: n,
        name: fnName(n),
        line: start,
        lines: end - start + 1,
        params: (n.parameters || []).length,
        complexity: m.complexity,
        maxNesting: m.maxNesting,
        hooks: m.hooks,
        hookCount: Object.values(m.hooks).reduce((a, b) => a + b, 0),
        jsx: m.jsx,
        async: !!(n.modifiers && n.modifiers.some((x) => x.kind === ts.SyntaxKind.AsyncKeyword)),
        awaits: m.awaits,
        hidden: [...m.hidden],
        freeRefs: [...m.freeRefs],
        mutatesOuter: [...m.mutatesOuter],
        parent: parentFn,
        depth: parentFn ? parentFn.depth + 1 : 0,
        topLevel: !parentFn,
      };
      rec.kind = ts.isMethodDeclaration(n) ? 'method' : ts.isConstructorDeclaration(n) ? 'constructor' : ts.isGetAccessor(n) || ts.isSetAccessor(n) ? 'accessor' : ts.isArrowFunction(n) ? 'arrow' : 'function';
      rec.inClass = !!(n.parent && (ts.isClassDeclaration(n.parent) || ts.isClassExpression(n.parent)));
      rec.component = /^[A-Z]/.test(rec.name) && rec.jsx;
      rec.hook = /^use[A-Z0-9]/.test(rec.name);
      all.push(rec);
      ts.forEachChild(n, (c) => walk(c, rec));
      return;
    }
    ts.forEachChild(n, (c) => walk(c, parentFn));
  };
  walk(sf, null);

  // Which free names of a function are bound by an enclosing function (a closure capture)?
  const localsOf = new Map(all.map((f) => [f, declaredIn(f.node)]));
  for (const f of all) {
    const captured = new Set();
    for (let p = f.parent; p; p = p.parent) for (const r of f.freeRefs) if (localsOf.get(p).has(r)) captured.add(r);
    f.captures = [...captured];
    f.hoistable = !f.topLevel && captured.size === 0;
  }

  // Purity: a fixpoint over the file's functions, since one pure helper may call another.
  const byName = new Map();
  // Class members keep their state in `this` on purpose (a local data structure): no verdict.
  const judged = (f) => (f.topLevel || f.hoistable) && !f.inClass;
  for (const f of all) if (judged(f)) byName.set(f.name, f);
  const reasonsOf = (f, pureNames) => {
    const r = [];
    if (f.hidden.length) r.push(`hidden input: ${f.hidden.join(', ')}`);
    if (f.awaits) r.push('awaits');
    if (f.hookCount) r.push(`hooks: ${Object.keys(f.hooks).join(', ')}`);
    if (f.jsx) r.push('renders JSX');
    if (f.freeRefs.includes('this')) r.push('uses this');
    if (f.mutatesOuter.length) r.push(`writes outside: ${f.mutatesOuter.join(', ')}`);
    for (const ref of f.freeRefs) {
      if (ref === 'this' || f.captures.includes(ref)) continue;
      if (PURE_GLOBALS.has(ref) || scope.consts.has(ref)) continue;
      if (scope.lets.has(ref)) {
        r.push(`reads module let: ${ref}`);
        continue;
      }
      if (scope.fns.has(ref)) {
        if (!pureNames.has(ref)) r.push(`calls effectful ${ref}`);
        continue;
      }
      const imp = scope.imports.get(ref);
      if (imp) {
        if (imp.typeOnly) continue;
        const kind = scope.resolveImport(imp.spec);
        if (kind === 'core' || kind === 'pure-package' || kind === 'json') continue;
        r.push(`imports ${ref} (${kind}: ${imp.spec})`);
        continue;
      }
      // Unknown: a global the lists don't name. Count it, conservatively.
      r.push(`unknown global: ${ref}`);
    }
    return r;
  };
  let pureNames = new Set(byName.keys());
  for (let i = 0; i < 10; i++) {
    const next = new Set([...pureNames].filter((nm) => reasonsOf(byName.get(nm), pureNames).length === 0));
    if (next.size === pureNames.size) break;
    pureNames = next;
  }
  for (const f of all) {
    if (!judged(f)) continue;
    f.impurity = reasonsOf(f, pureNames);
    f.pure = f.impurity.length === 0;
  }
  for (const f of all) {
    delete f.node;
    f.parent = f.parent ? f.parent.name : null;
  }
  return { sf, functions: all };
}

module.exports = { parse, analyzeFunctions, isFn, calleeName, PURE_GLOBALS, EFFECT_GLOBALS };
