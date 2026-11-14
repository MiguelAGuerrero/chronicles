// Syntactic patterns, one walker per file: each finding names its line, so a
// report can point at it and a baseline can list it. Grouped by the rule they
// serve:
//
//   functional   quadratic scans in core (AGENTS: "keep anything over features
//                O(n log n)"), a function that mutates its own parameters,
//                hidden local-time reads in core (the rule: "don't add more")
//   errors       a rejection or exception swallowed without a word
//   react        an effect that only derives state, setters always called
//                together (a reducer waiting to happen), wide props,
//                Platform.OS branches in a shared file, store selectors that
//                build a fresh object (the render budget), suppressed hook deps
//   invariants   calls that must carry their context (readTrace's pauses,
//                stills and fills), hard-coded colours

const ts = require('typescript');
const { isFn, calleeName } = require('./functions');

const SCANS = new Set(['find', 'findIndex', 'findLast', 'findLastIndex', 'filter', 'some', 'every', 'includes', 'indexOf', 'lastIndexOf']);
const ITERATES = new Set(['map', 'forEach', 'filter', 'reduce', 'reduceRight', 'some', 'every', 'flatMap', 'find', 'findIndex', 'sort']);
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);
const LOCAL_TIME = /^(getHours|getMinutes|getDay|getDate|getMonth|getFullYear|getTimezoneOffset|toLocaleDateString|toLocaleTimeString|toLocaleString|toDateString|toTimeString)$/;
/** Calls whose trailing arguments are the walk's context: leaving one out reads a different trace. */
const CONTEXT_CALLS = { readTrace: { args: 5, names: ['points', 'startedAt', 'pauses', 'stills', 'fills'] } };

const lineOf = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
const isLoop = (n) => ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n);
const rootIdent = (e) => {
  while (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
  return ts.isIdentifier(e) ? e.text : null;
};
const enclosingFnName = (n) => {
  for (let p = n.parent; p; p = p.parent) {
    if (isFn(p)) {
      if (p.name && ts.isIdentifier(p.name)) return p.name.text;
      if (p.parent && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) return p.parent.name.text;
    }
  }
  return '<module>';
};
/** Is this function an iteration callback (`xs.map(x => …)`)? */
const iterCallback = (fn) => {
  const p = fn.parent;
  return p && ts.isCallExpression(p) && p.arguments.includes(fn) && ts.isPropertyAccessExpression(p.expression) && ITERATES.has(p.expression.name.text);
};
/** Nothing, null or undefined: what a swallowed error hands back. */
const nothing = (e) => !e || e.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined') || ts.isVoidExpression(e);
/** A block that does nothing but return nothing (code-quality audit 13). */
const emptyBlock = (b) => b.statements.every((st) => ts.isReturnStatement(st) && nothing(st.expression));
const emptyBody = (fn) => {
  const b = fn.body;
  if (!b) return true;
  if (ts.isBlock(b)) return emptyBlock(b);
  return nothing(b);
};

/** Every pattern in one file. `layer` decides which rules apply. */
function patterns(sf, layer) {
  const out = {
    quadratic: [],
    paramMutation: [],
    localTime: [],
    silentCatch: [],
    derivedStateEffects: [],
    setterClusters: [],
    wideProps: [],
    platformBranches: [],
    freshSelectors: [],
    contextCalls: [],
    hexColors: 0,
    hookDepSuppressions: 0,
  };
  const core = layer === 'core';
  const text = sf.getFullText();
  // A .web or .native file is the platform split itself: Platform.OS there is not a branch to split.
  const platformFile = /\.(web|native|ios|android)\.[jt]sx?$/.test(sf.fileName);
  const srcLines = text.split('\n');
  /** The line before `line` (1-based), skipping blanks, says why a context call is short. */
  const saysWhy = (line, call) => {
    for (let i = line - 2; i >= 0; i--) {
      const t = srcLines[i].trim();
      if (!t) continue;
      return t.startsWith(`// ${call}:`) && t.length > call.length + 5;
    }
    return false;
  };
  out.hookDepSuppressions = (text.match(/eslint-disable[-a-z]*[^\n]*react-hooks\/exhaustive-deps/g) || []).length;

  // Parameters of every function, for "mutates its input".
  const paramsOf = new Map();
  const visit = (n, iterDepth) => {
    if (isFn(n)) {
      const names = new Set();
      const bind = (b) => {
        if (ts.isIdentifier(b)) names.add(b.text);
        else if (ts.isObjectBindingPattern(b) || ts.isArrayBindingPattern(b)) for (const el of b.elements) if (!ts.isOmittedExpression(el)) bind(el.name);
      };
      for (const p of n.parameters || []) bind(p.name);
      paramsOf.set(n, names);
      const inner = iterCallback(n) ? iterDepth + 1 : iterDepth;
      ts.forEachChild(n, (c) => visit(c, inner));
      return;
    }
    const nextDepth = isLoop(n) ? iterDepth + 1 : iterDepth;

    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const name = calleeName(callee) || '';
      const method = ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
      // A linear scan inside a loop: O(n·m). Strings and literals scan cheaply; skip them.
      if (core && iterDepth > 0 && method && SCANS.has(method) && !ts.isArrayLiteralExpression(callee.expression) && !ts.isStringLiteralLike(callee.expression)) {
        out.quadratic.push({ line: lineOf(sf, n), fn: enclosingFnName(n), call: method });
      }
      if (core && method && LOCAL_TIME.test(method)) out.localTime.push({ line: lineOf(sf, n), call: method });
      if (method === 'catch' && n.arguments.length === 1 && isFn(n.arguments[0]) && emptyBody(n.arguments[0])) out.silentCatch.push({ line: lineOf(sf, n), kind: '.catch(() => {})' });
      if (method === 'then' && n.arguments.length === 2 && isFn(n.arguments[1]) && emptyBody(n.arguments[1])) out.silentCatch.push({ line: lineOf(sf, n), kind: '.then(a, () => {})' });
      const ctx = CONTEXT_CALLS[ts.isIdentifier(callee) ? callee.text : ''];
      if (ctx && n.arguments.length < ctx.args) {
        let missing = ctx.names.slice(n.arguments.length);
        // readTrace, then withFilled(plain, fills) in the same function: the gaps
        // have to be read from the plain trace before its fills are known.
        if (missing.includes('fills') && fillsAppliedNearby(n)) missing = missing.filter((m) => m !== 'fills');
        if (missing.length && !saysWhy(lineOf(sf, n), callee.text)) out.contextCalls.push({ line: lineOf(sf, n), call: callee.text, missing, fn: enclosingFnName(n) });
      }
      if (name === 'useStore' && n.arguments.length >= 2 && isFn(n.arguments[1])) {
        let body = n.arguments[1].body;
        while (body && ts.isParenthesizedExpression(body)) body = body.expression;
        const fresh =
          body && (ts.isObjectLiteralExpression(body) || ts.isArrayLiteralExpression(body) ||
            (ts.isCallExpression(body) && ts.isPropertyAccessExpression(body.expression) && ['map', 'filter', 'slice', 'concat', 'flatMap', 'entries', 'keys', 'values'].includes(body.expression.name.text)));
        if (fresh) out.freshSelectors.push({ line: lineOf(sf, n) });
      }
      // Mutating a parameter in place.
      if (core && method && MUTATORS.has(method)) {
        const r = rootIdent(callee.expression);
        const owner = ownerWithParam(n, r, paramsOf);
        if (owner) out.paramMutation.push({ line: lineOf(sf, n), fn: enclosingFnName(n), param: r, exported: exportedFn(owner) });
      }
    }
    if (core && ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment && !ts.isIdentifier(n.left)) {
      const r = rootIdent(n.left);
      const owner = ownerWithParam(n, r, paramsOf);
      if (owner) out.paramMutation.push({ line: lineOf(sf, n), fn: enclosingFnName(n), param: r, exported: exportedFn(owner) });
    }
    if (ts.isCatchClause(n) && emptyBlock(n.block)) out.silentCatch.push({ line: lineOf(sf, n), kind: 'catch {}' });
    if (!platformFile && ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Platform' && (n.name.text === 'OS' || n.name.text === 'select')) out.platformBranches.push(lineOf(sf, n));
    if (ts.isStringLiteralLike(n) && /^#[0-9a-fA-F]{3,8}$|^rgba?\(|^hsla?\(/.test(n.text)) out.hexColors++;
    ts.forEachChild(n, (c) => visit(c, nextDepth));
  };
  visit(sf, 0);
  if (layer !== 'core') react(sf, out);
  return out;
}

/** Does the function around this call also call withFilled? */
function fillsAppliedNearby(n) {
  let fn = n.parent;
  while (fn && !isFn(fn)) fn = fn.parent;
  if (!fn) return false;
  let found = false;
  const look = (c) => {
    if (found) return;
    if (ts.isCallExpression(c) && ts.isIdentifier(c.expression) && c.expression.text === 'withFilled') found = true;
    ts.forEachChild(c, look);
  };
  // The live trace reads in one callback and fills in the same one; a hook's body counts as one function.
  look(fn);
  return found;
}

/** Is `fn` a function the module exports (a declaration, or a const's initializer)? */
function exportedFn(fn) {
  let st = fn;
  if (fn.parent && ts.isVariableDeclaration(fn.parent)) st = fn.parent.parent && fn.parent.parent.parent;
  if (!st || !st.parent || !ts.isSourceFile(st.parent)) return false;
  return !!(ts.canHaveModifiers(st) && (ts.getModifiers(st) || []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

/** Does the nearest function declaring `name` as a parameter enclose `n` (and is the write not to a local shadow)? */
function ownerWithParam(n, name, paramsOf) {
  if (!name) return null;
  for (let p = n.parent; p; p = p.parent) {
    if (isFn(p)) {
      const ps = paramsOf.get(p);
      if (ps && ps.has(name)) return p;
      // A local of the same name in this function shadows any outer parameter.
      let shadow = false;
      const look = (c) => {
        if (shadow || (c !== p && isFn(c))) return;
        if (ts.isVariableDeclaration(c) && ts.isIdentifier(c.name) && c.name.text === name) shadow = true;
        ts.forEachChild(c, look);
      };
      if (p.body) look(p.body);
      if (shadow) return null;
    }
  }
  return null;
}

/** React patterns in a component file. */
function react(sf, out) {
  const components = [];
  const walk = (n) => {
    if (isFn(n)) {
      const name = n.name && ts.isIdentifier(n.name) ? n.name.text : n.parent && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name) ? n.parent.name.text : null;
      if (name && /^[A-Z]|^use[A-Z]/.test(name)) components.push({ name, fn: n });
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  const interfaces = new Map();
  for (const st of sf.statements) {
    if (ts.isInterfaceDeclaration(st)) interfaces.set(st.name.text, st.members.length);
    if (ts.isTypeAliasDeclaration(st) && ts.isTypeLiteralNode(st.type)) interfaces.set(st.name.text, st.type.members.length);
  }
  for (const { name, fn } of components) {
    // Setters from `const [x, setX] = useState(…)` in this component.
    const setters = new Set();
    const findSetters = (n) => {
      if (n !== fn && isFn(n)) return;
      if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer)) {
        const c = calleeName(n.initializer.expression);
        const el = n.name.elements[1];
        if ((c === 'useState' || c === 'useReducer') && el && !ts.isOmittedExpression(el) && ts.isIdentifier(el.name)) setters.add(el.name.text);
      }
      ts.forEachChild(n, findSetters);
    };
    if (fn.body) findSetters(fn.body);

    // Props: the first parameter's destructured names, or its type's members.
    if (/^[A-Z]/.test(name) && fn.parameters && fn.parameters[0]) {
      const p = fn.parameters[0];
      let count = 0;
      if (ts.isObjectBindingPattern(p.name)) count = p.name.elements.length;
      else if (p.type && ts.isTypeLiteralNode(p.type)) count = p.type.members.length;
      else if (p.type && ts.isTypeReferenceNode(p.type) && ts.isIdentifier(p.type.typeName)) count = interfaces.get(p.type.typeName.text) || 0;
      if (count > 10) out.wideProps.push({ line: lineOf(sf, fn), component: name, props: count });
    }

    // Each callback inside the component: which setters it calls, and whether an
    // effect does nothing but set state (derived state: compute it in render).
    const bodies = [];
    const findBodies = (n) => {
      if (n !== fn && isFn(n)) {
        // What this callback itself calls; a nested callback's calls are its own.
        const called = new Set();
        let other = false;
        const scan = (c) => {
          if (isFn(c)) {
            other = true;
            return;
          }
          if (ts.isCallExpression(c)) {
            const cn = calleeName(c.expression);
            if (cn && setters.has(cn)) called.add(cn);
            else other = true;
          }
          if (ts.isAwaitExpression(c) || ts.isReturnStatement(c)) other = true;
          if (ts.isBinaryExpression(c) && c.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && c.operatorToken.kind <= ts.SyntaxKind.LastAssignment) other = true;
          ts.forEachChild(c, scan);
        };
        if (n.body) scan(n.body);
        bodies.push({ n, called });
        const p = n.parent;
        if (p && ts.isCallExpression(p) && calleeName(p.expression) === 'useEffect' && p.arguments[0] === n && called.size && !other) {
          out.derivedStateEffects.push({ line: lineOf(sf, p), component: name, sets: [...called] });
        }
        return;
      }
      ts.forEachChild(n, findBodies);
    };
    if (fn.body) findBodies(fn.body);
    // Setter pairs called together in 3+ callbacks: a reducer candidate.
    const pairs = new Map();
    for (const b of bodies) {
      const s = [...b.called].sort();
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
        const k = `${s[i]}+${s[j]}`;
        pairs.set(k, (pairs.get(k) || 0) + 1);
      }
    }
    const together = [...pairs].filter(([, c]) => c >= 3);
    if (together.length) {
      // Merge pairs into groups.
      const groups = [];
      for (const [k] of together) {
        const [a, b] = k.split('+');
        const g = groups.find((x) => x.has(a) || x.has(b));
        if (g) {
          g.add(a);
          g.add(b);
        } else groups.push(new Set([a, b]));
      }
      for (const g of groups) if (g.size >= 3) out.setterClusters.push({ line: lineOf(sf, fn), component: name, setters: [...g].sort() });
    }
  }
}

/** Tests with no assertion in their body, nor in a helper of the same file they call. */
function testsWithoutAssertions(sf) {
  const asserting = new Set();
  const hasAssert = (n) => /\b(assert|expect)\b/.test(n.getText(sf));
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name && st.body && hasAssert(st.body)) asserting.add(st.name.text);
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer && isFn(d.initializer) && hasAssert(d.initializer)) asserting.add(d.name.text);
  }
  const out = [];
  const walk = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === 'test' || n.expression.text === 'it')) {
      const cb = n.arguments.find((a) => isFn(a));
      if (cb && !hasAssert(cb)) {
        let calls = false;
        const scan = (c) => {
          if (ts.isCallExpression(c) && ts.isIdentifier(c.expression) && asserting.has(c.expression.text)) calls = true;
          ts.forEachChild(c, scan);
        };
        scan(cb);
        // A test that only awaits something that throws is fine (assert.rejects aside); flag the rest.
        if (!calls) out.push({ line: lineOf(sf, n), name: n.arguments[0] && ts.isStringLiteralLike(n.arguments[0]) ? n.arguments[0].text : '?' });
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}

module.exports = { patterns, testsWithoutAssertions, CONTEXT_CALLS };
