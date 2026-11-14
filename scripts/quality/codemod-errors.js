#!/usr/bin/env node
// The errors codemod (specs/errors-handled, EH9, EH10, EH12; decision 0179): every swallowed error the gate counts
// (scripts/quality/patterns.js: an empty `.catch` or `.then(a, …)` handler, a fallback value handed back without a
// word, an empty `catch` block) is rewritten to report through the diagnostics sink, with its place filled from the
// file and the enclosing function. Deterministic: the same tree gives the same edits.
//
// Left for the hand pass, and listed: a save of the walker's (it needs its words and a Retry, EH7), a platform's
// refusal (it may need the screen's state, EH8), and anything in a core module (core can't import a shell: the
// handler is passed in).
//
//   node scripts/quality/codemod-errors.js            the plan: what it would change, and the hand list
//   node scripts/quality/codemod-errors.js --write    the edits

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const layers = require('../layers');
const { isFn, calleeName } = require('./functions');
const { emptyBody, emptyBlock, fallbackBody } = require('./patterns');

const ROOT = path.join(__dirname, '..', '..');
const SINK = path.join(ROOT, 'src', 'lib', 'diagnostics', 'sink');
const SAVE = /\b(?:db|p\.db|ports\.db)\.(?:put|set|add|append|update|start|end|save|delete|remove|mark|keep|insert|record|clear|close|create|move|split|write|stop)\w*\(|\bsave\w*\(|\bsetMeta\(|\.choose\(|\bkeep\w*\(|\bstore\w*\.set\w*\(/;
const REFUSE = /setAudioMode|[Kk]eepAwake|notifier\.|\.play\(|\.pause\(|seekTo|\bShare\.|\bshare\w*\(|[Pp]ermission|vibrate|clipboard|[Ff]ullscreen|wakeLock|AccessibilityInfo|Linking\.|haptic|feedback\(/;

const toPosix = (p) => p.split(path.sep).join('/');
/** The hand pass's decisions: [{ file, match, kind: 'save' | 'refused' | 'cache', what? }] (--hand <file>). */
let handTable = [];
const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function srcFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__') walk(p);
      } else if (/\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  return out.sort();
}

/** The nearest named function around a node, as the gate names it. */
function ownerName(n) {
  for (let p = n.parent; p; p = p.parent) {
    if (!isFn(p)) continue;
    if (p.name && ts.isIdentifier(p.name)) return p.name.text;
    if (p.parent && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) return p.parent.name.text;
    if (p.parent && ts.isPropertyAssignment(p.parent) && ts.isIdentifier(p.parent.name)) return p.parent.name.text;
    if (ts.isMethodDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  }
  return 'module';
}

/** The sites of one file: edits it can make, and the sites left for the hand pass. */
function plan(file, source) {
  const rel = toPosix(path.relative(ROOT, file));
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const layer = rel.startsWith('src/lib/') ? (layers.readLayer(source).layer || null) : 'view';
  const short = rel.replace(/^src\//, '').replace(/\.(web|native)?\.?tsx?$/, '').replace(/\.$/, '');
  const edits = [];
  const hand = [];
  const used = new Set();
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const site = (n, context, make) => {
    const place = `${short} · ${ownerName(n)}`;
    const text = context.getText(sf);
    // The hand pass's decision for this site, matched by file and a piece of its code (never a line number).
    const decided = handTable.find((d) => d.file === rel && text.includes(d.match));
    if (decided && layer !== 'core') {
      edits.push(make(place, decided, text));
      return;
    }
    const why = layer === 'core' ? 'core: pass a handler in' : SAVE.test(text) ? 'a save: its words and a Retry (EH7)' : REFUSE.test(text) ? 'a refusal: the screen\'s state (EH8)' : null;
    if (why) hand.push({ file: rel, line: lineOf(n), why, text: text.split('\n')[0].slice(0, 100) });
    else edits.push(make(place));
  };
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const method = n.expression.name.text;
      const h = method === 'catch' && n.arguments.length === 1 ? n.arguments[0] : method === 'then' && n.arguments.length === 2 ? n.arguments[1] : null;
      if (h && isFn(h) && (emptyBody(h) || fallbackBody(h))) {
        // `() => null` hands back a value as much as `() => []` does: a fallback, not an empty handler.
        const empty = emptyBody(h) && (ts.isBlock(h.body) || ts.isVoidExpression(h.body));
        site(n, n.expression.expression, (place, decided, text) => {
          if (decided && decided.kind === 'save') {
            used.add('failedSave');
            return { start: h.getStart(sf), end: h.end, text: `failedSave(${q(place)}, ${q(decided.what)}, () => ${text})` };
          }
          if (decided && empty) {
            used.add('caught');
            return { start: h.getStart(sf), end: h.end, text: `caught(${q(decided.kind)}, ${q(place)})` };
          }
          if (empty) {
            used.add('caught');
            return { start: h.getStart(sf), end: h.end, text: `caught('cache', ${q(place)})` };
          }
          used.add('fallback');
          let e = h.body;
          if (ts.isBlock(e)) e = e.statements[0].expression;
          // An object of literals keeps its literal types (`{ ok: false }` is not `{ ok: boolean }`).
          const value = ts.isObjectLiteralExpression(e) ? `${e.getText(sf)} as const` : e.getText(sf);
          const callee = ts.isCallExpression(n.expression.expression) ? calleeName(n.expression.expression.expression) : null;
          const standsFor = callee ? `what ${callee.split('.').pop()} read` : 'what was read';
          return { start: h.getStart(sf), end: h.end, text: `fallback(${q(place)}, ${value}, ${q(standsFor)})` };
        });
      }
    }
    if (ts.isCatchClause(n) && emptyBlock(n.block)) {
      const tryStmt = n.parent;
      site(n, tryStmt.tryBlock, (place, decided) => {
        const kind = decided && decided.kind !== 'save' ? decided.kind : 'cache';
        used.add('report');
        const v = n.variableDeclaration ? n.variableDeclaration.name.getText(sf) : 'caughtError';
        const decl = n.variableDeclaration ? '' : ` (${v})`;
        const ret = n.block.statements.map((st) => st.getText(sf)).join(' ');
        const start = n.variableDeclaration ? n.block.getStart(sf) : n.getStart(sf) + 'catch'.length;
        const head = n.variableDeclaration ? '' : `${decl} `;
        return { start, end: n.block.end, text: `${head}{ report(${q(kind)}, ${q(place)}, ${v});${ret ? ` ${ret}` : ''} }` };
      });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (edits.length) {
    let spec = toPosix(path.relative(path.dirname(file), SINK));
    if (!spec.startsWith('.')) spec = `./${spec}`;
    const names = [...used].sort();
    const existing = sf.statements.find((st) => ts.isImportDeclaration(st) && st.moduleSpecifier.text === spec && st.importClause && st.importClause.namedBindings && ts.isNamedImports(st.importClause.namedBindings));
    if (existing) {
      const have = existing.importClause.namedBindings.elements.map((e) => e.name.text);
      const all = [...new Set([...have, ...names])].sort();
      edits.push({ start: existing.importClause.namedBindings.getStart(sf), end: existing.importClause.namedBindings.end, text: `{ ${all.join(', ')} }` });
    } else {
      const imports = sf.statements.filter((st) => ts.isImportDeclaration(st));
      const at = imports.length ? imports[imports.length - 1].end : (source.startsWith('// @layer') ? source.indexOf('\n') : 0);
      edits.push({ start: at, end: at, text: `\nimport { ${names.join(', ')} } from ${q(spec)};` });
    }
  }
  return { rel, edits, hand };
}

function apply(source, edits) {
  let out = source;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

if (require.main === module) {
  const write = process.argv.includes('--write');
  const h = process.argv.indexOf('--hand');
  if (h >= 0) handTable = JSON.parse(fs.readFileSync(process.argv[h + 1], 'utf8'));
  let changed = 0;
  let sites = 0;
  const hand = [];
  const touched = [];
  for (const file of srcFiles()) {
    if (file.startsWith(path.join(ROOT, 'src', 'lib', 'diagnostics'))) continue;
    const source = fs.readFileSync(file, 'utf8');
    const p = plan(file, source);
    hand.push(...p.hand);
    const real = p.edits.filter((e) => e.start !== e.end || e.text.startsWith('\nimport'));
    const n = p.edits.length - (p.edits.some((e) => /^\n?import|^\{ /.test(e.text)) ? 1 : 0);
    if (!real.length) continue;
    sites += n;
    changed++;
    touched.push(p.rel);
    if (write) fs.writeFileSync(file, apply(source, p.edits));
  }
  console.log(`${write ? 'Rewrote' : 'Would rewrite'} ${sites} sites in ${changed} files.`);
  console.log(`Left for the hand pass (${hand.length}):`);
  for (const h of hand) console.log(`  ${h.file}:${h.line}  ${h.why}  | ${h.text}`);
  if (process.argv.includes('--files')) console.log(touched.join('\n'));
}

module.exports = { plan, apply };
