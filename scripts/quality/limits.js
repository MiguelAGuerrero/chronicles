// The code-quality limits (specs/code-quality, CQ8) and the catalog moves that fix each one
// (.claude/rules/refactoring.md, R1-R21). One table, read by the gate, the queue and the skill.
//
// A violation is { id, metric, value, limit, move, file, name, line, what }. Its id is stable across
// edits that only move code within a file: the file, then the function or component name (with ~2, ~3
// for a name the file repeats), never a line number. `limit` is null for a list (an entry is wrong in
// itself) and the number new code may reach for a measure.

const LIMITS = {
  'file-lines': { limit: 400, move: 'R4', what: 'file length' },
  'fn-lines': { limit: 60, move: 'R8', what: 'function length' },
  'fn-branches': { limit: 15, move: 'R8', what: 'branches in a function' },
  nesting: { limit: 4, move: 'R8', what: 'nesting depth' },
  'component-lines': { limit: 250, move: 'R4', what: 'component length' },
  'component-hooks': { limit: 20, move: 'R4', what: 'hook calls in a component' },
  'component-props': { limit: 10, move: 'R4', what: 'props of a component' },
  'shell-branches': { limit: 8, move: 'R13', what: 'branches in a shell function' },
  'pure-outside-core': { limit: null, move: 'R1', what: 'pure logic outside core (lines)' },
  swallowed: { limit: 0, move: 'R10', what: 'swallowed errors' },
  floating: { limit: 0, move: 'R10', what: 'floating promises', types: true },
  'cloned-lines': { limit: 0, move: 'R2', what: 'lines copied from elsewhere' },
  'unused-export': { limit: null, move: 'R7', what: 'an export nothing imports' },
  cycle: { limit: null, move: 'R9', what: 'an import cycle' },
  'shell-singleton': { limit: null, move: 'R5', what: 'a shell importing a singleton' },
  'lib-imports-view': { limit: null, move: 'R6', what: 'src/lib importing a view' },
  'local-time': { limit: 0, move: 'R14', what: 'local-time reads in core' },
  'context-call': { limit: null, move: 'R17', what: 'readTrace without its context' },
  'param-mutation': { limit: null, move: 'R18', what: 'an exported core function mutating an argument' },
  'dead-module': { limit: null, move: 'R15', what: 'a module nothing imports' },
  'platform-os': { limit: 0, move: 'R12', what: 'Platform.OS in a shared file' },
  colour: { limit: 0, move: 'R16', what: 'hard-coded colours' },
  'hook-deps': { limit: 0, move: 'R19', what: 'suppressed hook dependencies' },
  'derived-state': { limit: null, move: 'R20', what: 'an effect that only sets state' },
  'fresh-selector': { limit: 0, move: 'R20', what: 'store selectors building a new object' },
  'no-assertion': { limit: null, move: 'R21', what: 'a test that cannot fail' },
};

/** Moves the queue offers only once their slice has landed (the owner, 2026-11-14). */
const WAITING = { R10: 'errors handled by kind', R16: 'the palette of semantic tokens' };

/** Stable names for a file's functions: the name, then ~2, ~3 for a repeat, in source order. */
function namer() {
  const seen = new Map();
  return (file, name) => {
    const k = `${file}#${name}`;
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    return n === 1 ? name : `${name}~${n}`;
  };
}

/** Every violation in the facts: measures past their limit, and list entries. */
function violations(facts) {
  const out = [];
  const add = (metric, file, name, value, line) => {
    const L = LIMITS[metric];
    const id = `${metric}:${file}${name ? `#${name}` : ''}`;
    const where = `${file}${name ? ` ${name}` : ''} (line ${line || 1})`;
    const message = L.limit == null ? `${where}: ${L.what}. Fix: ${L.move}.` : `${where}: ${L.what} is ${value}, past the limit of ${L.limit}. Fix: ${L.move}.`;
    out.push({ id, metric, value, limit: L.limit, move: L.move, file, name: name || null, line: line || 1, what: L.what, message });
  };
  const nameOf = namer();
  const byFile = new Map();
  for (const f of facts.functions) {
    const named = { ...f, stable: nameOf(f.file, f.name) };
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(named);
  }
  for (const [file, fi] of Object.entries(facts.files)) {
    if (fi.lines > LIMITS['file-lines'].limit) add('file-lines', file, null, fi.lines);
    for (const f of byFile.get(file) || []) {
      const uiLike = f.component || f.hook;
      if (uiLike) {
        if (f.lines > LIMITS['component-lines'].limit) add('component-lines', file, f.stable, f.lines, f.line);
        if (f.hookCount > LIMITS['component-hooks'].limit) add('component-hooks', file, f.stable, f.hookCount, f.line);
      } else if (!f.jsx) {
        if (f.lines > LIMITS['fn-lines'].limit) add('fn-lines', file, f.stable, f.lines, f.line);
        if (f.complexity > LIMITS['fn-branches'].limit) add('fn-branches', file, f.stable, f.complexity, f.line);
      }
      if (f.maxNesting > LIMITS.nesting.limit) add('nesting', file, f.stable, f.maxNesting, f.line);
      if ((fi.layer === 'shell' || fi.layer === 'adapter') && !f.inClass && f.complexity > LIMITS['shell-branches'].limit) add('shell-branches', file, f.stable, f.complexity, f.line);
      if (fi.layer !== 'core' && f.pure && f.lines >= 5) add('pure-outside-core', file, f.stable, f.lines, f.line);
    }
    if (fi.silentCatches) add('swallowed', file, null, fi.silentCatches);
    if (facts.floating && fi.floatingPromises) add('floating', file, null, fi.floatingPromises);
    if (fi.duplicatedLines) add('cloned-lines', file, null, fi.duplicatedLines);
    if (fi.hexColors) add('colour', file, null, fi.hexColors);
    if (fi.hookDepSuppressions) add('hook-deps', file, null, fi.hookDepSuppressions);
  }
  const P = facts.patterns;
  const count = (metric, list) => {
    const n = new Map();
    for (const x of list) n.set(x.file, (n.get(x.file) || 0) + 1);
    for (const [file, v] of n) add(metric, file, null, v, list.find((x) => x.file === file).line);
  };
  count('local-time', P.localTime);
  count('platform-os', P.platformBranches);
  count('fresh-selector', P.freshSelectors);
  for (const p of P.wideProps) add('component-props', p.file, p.component, p.props, p.line);
  const ctx = namer();
  for (const c of P.contextCalls) add('context-call', c.file, ctx(c.file, `${c.call}`), 1, c.line);
  const mut = new Set();
  for (const m of P.paramMutation) if (m.exported && !mut.has(`${m.file}#${m.fn}`)) {
    mut.add(`${m.file}#${m.fn}`);
    add('param-mutation', m.file, m.fn, 1, m.line);
  }
  const eff = namer();
  for (const d of P.derivedStateEffects) add('derived-state', d.file, eff(d.file, d.component), 1, d.line);
  for (const e of facts.unusedExports) if (!e.typeOnly) add('unused-export', e.file, e.name, 1, e.line);
  for (const c of facts.cycles) add('cycle', c[0], c.join(' > '), 1);
  for (const s of facts.shellsOnSingletons) add('shell-singleton', s.file, null, 1);
  for (const l of facts.libImportsViews) add('lib-imports-view', l.file, l.spec, 1, l.line);
  for (const o of facts.orphans) add('dead-module', o.file, null, 1);
  const t = namer();
  for (const x of facts.testsWithoutAssertions) add('no-assertion', x.file, t(x.file, x.name), 1, x.line);
  // An id can repeat only through a measure counted twice: keep the worst.
  const best = new Map();
  for (const v of out) if (!best.has(v.id) || best.get(v.id).value < v.value) best.set(v.id, v);
  return [...best.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** The metrics a run did not measure (floating promises without --types): their baseline entries stand. */
const unmeasured = (facts) => (facts.floating ? [] : Object.keys(LIMITS).filter((m) => LIMITS[m].types));

module.exports = { LIMITS, WAITING, violations, unmeasured, namer };
