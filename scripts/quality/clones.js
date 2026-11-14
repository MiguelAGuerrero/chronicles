// Copy-paste detection from the TypeScript scanner's tokens, the way jscpd
// does it, with no dependency: identifiers and literals are normalised (so a
// copy with renamed variables still matches, a "type-2" clone), imports are
// skipped, every window of MIN_TOKENS tokens is hashed, and windows that match
// at the same offset are merged into one clone. Deterministic: files are read
// in sorted order and the first occurrence is the anchor.

const ts = require('typescript');

const MIN_TOKENS = 70;

/** Tokens of a file: [{ k: normalised kind, t: raw text, line }], imports left out. */
function tokenize(file, source) {
  const variant = file.endsWith('x') ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard;
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, variant, source);
  const out = [];
  let line = 1;
  let lastPos = 0;
  const countLines = (to) => {
    for (let i = lastPos; i < to; i++) if (source.charCodeAt(i) === 10) line++;
    lastPos = to;
  };
  let skippingImport = false;
  for (let k = scanner.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = scanner.scan()) {
    const start = scanner.getTokenStart ? scanner.getTokenStart() : scanner.getTokenPos();
    countLines(start);
    const text = scanner.getTokenText();
    // Skip `import … ;` and `export … from '…';` lines: every file has them.
    if (k === ts.SyntaxKind.ImportKeyword && (out.length === 0 || out[out.length - 1].k === ';' || out[out.length - 1].k === '}')) skippingImport = true;
    if (skippingImport) {
      if (k === ts.SyntaxKind.SemicolonToken) skippingImport = false;
      continue;
    }
    let norm;
    if (k === ts.SyntaxKind.Identifier || k === ts.SyntaxKind.PrivateIdentifier) norm = '$id';
    else if (k === ts.SyntaxKind.StringLiteral || k === ts.SyntaxKind.NoSubstitutionTemplateLiteral || k === ts.SyntaxKind.NumericLiteral || k === ts.SyntaxKind.BigIntLiteral) norm = '$lit';
    else if (k === ts.SyntaxKind.TemplateHead || k === ts.SyntaxKind.TemplateMiddle || k === ts.SyntaxKind.TemplateTail) norm = '$tpl';
    else if (k === ts.SyntaxKind.JsxText) {
      if (!text.trim()) continue;
      norm = '$text';
    } else norm = text;
    out.push({ k: norm, t: text, line });
  }
  return out;
}

/**
 * Clones across a set of files. `files` is [{ rel, source }] in a stable
 * order. Returns [{ a: {file, start, end}, b: {...}, tokens, lines, exact }].
 */
function findClones(files, { minTokens = MIN_TOKENS } = {}) {
  const toks = files.map((f) => tokenize(f.rel, f.source));
  const ids = new Map();
  const code = toks.map((ts_) =>
    Int32Array.from(ts_, (t) => {
      let id = ids.get(t.k);
      if (id === undefined) ids.set(t.k, (id = ids.size + 1));
      return id;
    }),
  );
  // Rolling hash of every window.
  const B = 1000003;
  const M = 2147483647;
  let pow = 1;
  for (let i = 0; i < minTokens - 1; i++) pow = (pow * B) % M;
  const first = new Map(); // hash → [fileIdx, pos]
  const pairs = []; // [fa, ia, fb, ib]
  // Every product is with B (< 2^20) or a token id (small): it stays under 2^53.
  const mulmod = (a, b) => (a * b) % M;
  for (let f = 0; f < code.length; f++) {
    const c = code[f];
    if (c.length < minTokens) continue;
    let h = 0;
    for (let i = 0; i < minTokens; i++) h = (mulmod(h, B) + c[i]) % M;
    for (let i = 0; ; i++) {
      const prev = first.get(h);
      if (prev === undefined) first.set(h, [f, i]);
      else if (!(prev[0] === f && i - prev[1] < minTokens)) pairs.push([prev[0], prev[1], f, i]);
      if (i + minTokens >= c.length) break;
      h = (h - mulmod(c[i], pow) + M) % M;
      h = (mulmod(h, B) + c[i + minTokens]) % M;
    }
  }
  // Merge pairs on the same diagonal into runs.
  pairs.sort((x, y) => x[0] - y[0] || x[2] - y[2] || (x[3] - x[1]) - (y[3] - y[1]) || x[1] - y[1]);
  const runs = [];
  for (const p of pairs) {
    const last = runs[runs.length - 1];
    if (last && last.fa === p[0] && last.fb === p[2] && last.ib - last.ia === p[3] - p[1] && p[1] <= last.iaEnd + 1) last.iaEnd = p[1];
    else runs.push({ fa: p[0], ia: p[1], iaEnd: p[1], fb: p[2], ib: p[3] });
  }
  const out = [];
  for (const r of runs) {
    const len = r.iaEnd - r.ia + minTokens;
    // Verify (hash collisions) and extend while the normalised tokens agree.
    const A = code[r.fa];
    const Bc = code[r.fb];
    let ok = true;
    for (let k = 0; k < len; k++) if (A[r.ia + k] !== Bc[r.ib + k]) { ok = false; break; }
    if (!ok) continue;
    const ta = toks[r.fa];
    const tb = toks[r.fb];
    let exact = true;
    for (let k = 0; k < len; k++) if (ta[r.ia + k].t !== tb[r.ib + k].t) { exact = false; break; }
    const a = { file: files[r.fa].rel, start: ta[r.ia].line, end: ta[r.ia + len - 1].line };
    const b = { file: files[r.fb].rel, start: tb[r.ib].line, end: tb[r.ib + len - 1].line };
    if (a.file === b.file && b.start <= a.end) continue; // overlapping repetition in one file
    out.push({ a, b, tokens: len, lines: Math.max(a.end - a.start, b.end - b.start) + 1, exact });
  }
  out.sort((x, y) => y.tokens - x.tokens || x.a.file.localeCompare(y.a.file) || x.a.start - y.a.start);
  return { clones: out, tokenCounts: Object.fromEntries(files.map((f, i) => [f.rel, toks[i].length])) };
}

/** Per file: the lines that are part of some clone, and the share of its lines. */
function duplicatedLines(clones, lineCounts) {
  const marked = new Map();
  const mark = (s) => {
    let set = marked.get(s.file);
    if (!set) marked.set(s.file, (set = new Set()));
    for (let l = s.start; l <= s.end; l++) set.add(l);
  };
  for (const c of clones) {
    mark(c.a);
    mark(c.b);
  }
  const out = {};
  for (const [file, set] of marked) out[file] = { lines: set.size, share: lineCounts[file] ? set.size / lineCounts[file] : 0 };
  return out;
}

module.exports = { tokenize, findClones, duplicatedLines, MIN_TOKENS };
