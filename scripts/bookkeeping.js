#!/usr/bin/env node
// Bookkeeping by script (decision 0174): the steps with one right answer, numbers, counts, checks,
// extraction and verification, that agents did by hand and got wrong at least once. Judgment stays
// with agents and reviewers. Each reads origin/main as last fetched through git (git show, ls-tree,
// log, grep), not the working tree, unless it says otherwise; each prints plain, stable lines, or
// JSON with --json, and exits 1 when its check fails (2 on a usage error).
//
//   npm run book:next-decision [-- --check <NNNN> [<file>]]   the next free decision number; with
//                                       --check, fails when main gave that number to another file, or
//                                       the number skips one, and prints the next free one
//   npm run book:next-audit -- "<prefix>"     the highest "<prefix> audit N" on main (commit subjects,
//                                       tests under src/ and scripts/e2e/journeys/; ranges and lists
//                                       read), and the next N
//   npm run book:files [-- <rev> | <a>..<b>] [--max-src N]   this worktree's changed files, against the
//                                       merge base with <rev> (default origin/main): committed, staged,
//                                       unstaged and untracked; a range counts its commits only.
//                                       Grouped; --max-src fails past N non-test src/ files
//   npm run book:landed -- <base>..<head> [--branch <name>] [--live <url>]   every commit of the
//                                       range on main; no worktree under .claude/worktrees/ and no
//                                       local branch left for <name>; the live page's entry bundle,
//                                       against dist/'s when that is an export for the same base path
//   npm run book:review-paths -- <prompt.md>...   each prompt exists and every absolute path in it
//   npm run book:items -- deferred|native|inbox|open [--tag <tag>|none] [--section <text>] [--worktree]
//                                       each item: section, tag, first line, and the shortest match
//                                       scripts/records.js accepts for it (an inbox entry: its number)
//
// `node scripts/tend.js <command>` runs the same. The decisions are pure and exported for
// arch/bookkeeping.test.ts; git, the files and the network are read in main().

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = process.env.TEND_ROOT ? path.resolve(process.env.TEND_ROOT) : path.join(__dirname, '..');
const MAIN = 'origin/main';

class Usage extends Error {}

// ---------------------------------------------------------------------------------------------------
// next-decision

// A decision file: its number, then a slug or nothing (`0175.md` holds 0175 too: bookkeeping audit 11).
const DECISION = /^(\d+)(?:-.+)?\.md$/;

/** The decision files' numbers: the highest, the width they are padded to, the next, and any held twice. */
function decisionState(names) {
  const files = names.map((n) => path.basename(n)).filter((n) => DECISION.test(n));
  const width = files.length ? Math.max(...files.map((f) => DECISION.exec(f)[1].length)) : 4;
  let highest = null;
  const by = new Map();
  for (const f of files) {
    const n = Number(DECISION.exec(f)[1]);
    by.set(n, [...(by.get(n) ?? []), f]);
    if (!highest || n > Number(highest.number) || (n === Number(highest.number) && f < highest.file)) highest = { number: DECISION.exec(f)[1], file: f };
  }
  const pad = (n) => String(n).padStart(width, '0');
  const next = pad(highest ? Number(highest.number) + 1 : 1);
  const duplicates = [...by].filter(([, fs2]) => fs2.length > 1).sort((a, b) => a[0] - b[0]).map(([n, fs2]) => ({ number: pad(n), files: fs2.sort() }));
  return { next, width, highest, duplicates, pad };
}

/**
 * Whether `number` (with the file that claims it, if given) may be published: no other file on main
 * holds it, it skips no free number, and the file is numbered so.
 */
function checkDecision(names, number, file) {
  const s = decisionState(names);
  const strip = ({ pad, ...rest }) => rest;
  if (!/^\d+$/.test(String(number ?? ''))) return { ...strip(s), ok: false, number: String(number), problem: `"${number}" is not a decision number` };
  const n = Number(number);
  const padded = s.pad(n);
  const base = file ? path.basename(file) : null;
  const holders = names.map((x) => path.basename(x)).filter((f) => DECISION.test(f) && Number(DECISION.exec(f)[1]) === n);
  const out = { ...strip(s), number: padded, file: base };
  if (base) {
    const m = DECISION.exec(base);
    if (!m) return { ...out, ok: false, problem: `${base} is not a decision file name (<NNNN>-<slug>.md)` };
    if (Number(m[1]) !== n) return { ...out, ok: false, problem: `${base} is numbered ${m[1]}, not ${padded}` };
  }
  const others = holders.filter((f) => f !== base);
  if (others.length) return { ...out, ok: false, taken: others, problem: `${padded} is taken on ${MAIN} by ${others.join(' and ')}; the next free is ${s.next}` };
  if (holders.length) return { ...out, ok: true, published: true };
  const next = Number(s.next);
  if (n > next) {
    const skipped = n - 1 === next ? s.pad(next) : `${s.pad(next)}-${s.pad(n - 1)}`;
    return { ...out, ok: false, problem: `${padded} skips ${skipped}; the next free is ${s.next}` };
  }
  return { ...out, ok: true };
}

// ---------------------------------------------------------------------------------------------------
// next-audit

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * "<prefix> audit N", "<prefix> audits N-M", "audits 3, 4, and 5", "audits 27 to 31": the prefix begins a
 * name (at a line's start, or after a quote, bracket, comma, colon or comment mark), so "map" is neither
 * "tend map" nor "sitemap", and "transcripts" is not "memo-transcripts". Space, hyphen and underscore are
 * one separator inside it ("note types" is "note-types": bookkeeping audit 3). Case is ignored. A number
 * has at most three digits and a member followed by "-<digit>" outside a range is refused, so a date
 * ("audit 2, 2026-11-14") is never read as an audit number (bookkeeping audit 4).
 */
function auditRegex(prefix) {
  const p = prefix.trim().split(/[\s_-]+/).filter(Boolean).map(escapeRe).join('[\\s_-]+');
  const num = '\\d{1,3}(?!\\d)';
  const item = `${num}(?:\\s*[-–—]\\s*${num}(?!\\s*[-–—]\\s*\\d)|\\s+(?:to|through)\\s+${num}|(?!\\s*[-–—]\\s*\\d))`;
  const sep = '(?:\\s*,\\s*and\\s+|\\s*,\\s*|\\s*&\\s*|\\s+and\\s+)';
  return new RegExp(`(?<=^\\s*|[('"\`\\[{,;:/*>]\\s*)${p}\\s+audits?\\s+(${item}(?:${sep}${item})*)`, 'gi');
}

/** The highest N any source names for the prefix, the next one, and every place a number was found. */
function auditNumbers(prefix, sources) {
  const re = auditRegex(prefix);
  const hits = [];
  for (const { where, text } of sources) {
    for (const line of String(text).split('\n')) {
      for (const m of line.matchAll(re)) {
        const n = Math.max(...m[1].match(/\d+/g).map(Number));
        hits.push({ n, where, text: line.trim() });
      }
    }
  }
  const highest = hits.length ? Math.max(...hits.map((h) => h.n)) : null;
  return { highest, next: (highest ?? 0) + 1, hits };
}

// ---------------------------------------------------------------------------------------------------
// files

const GROUPS = [
  ['src', 'src'],
  ['tests', 'tests'],
  ['journeys', 'journeys'],
  ['docs', 'docs and records'],
  ['scripts', 'skills and scripts'],
  ['other', 'other'],
];
const RECORDS = [/^docs\//, /^specs\//, /^\.claude\/rules\//, /^\.claude\/records\//, /^\.claude\/skills\/tend\/(ledger\.json|runs\.jsonl)$/, /^(README|AGENTS|CLAUDE)\.md$/];

/** A changed path's group; `src` is the app's own source, the tests apart (tend.js's isAppSource). */
function groupOf(p) {
  if (/^src\//.test(p)) return /__tests__\//.test(p) ? 'tests' : 'src';
  if (/^scripts\/e2e\/journeys\//.test(p)) return 'journeys';
  if (RECORDS.some((re) => re.test(p))) return 'docs';
  if (/^scripts\//.test(p) || /^\.claude\/(skills|agents|hooks)\//.test(p)) return 'scripts';
  return 'other';
}

/**
 * A source file, as the size tripwire counts them ("more than about 8 source files", ship.md "Hard
 * stops"): the app's own under src/ and the scripts' under scripts/; tests, journeys and the record
 * documents are not (bookkeeping audit 7).
 */
const isSource = (p) => groupOf(p) === 'src' || (groupOf(p) === 'scripts' && /^scripts\//.test(p));

function groupFiles(files) {
  const counts = Object.fromEntries(GROUPS.map(([k]) => [k, 0]));
  const listed = files.map((f) => ({ ...f, group: groupOf(f.path) })).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const f of listed) counts[f.group] += 1;
  return { counts, sources: listed.filter((f) => isSource(f.path)).length, total: listed.length, files: listed };
}

/** `git diff --name-status -z` read as { status, path }; renames are off, so one is a D and an A. */
function nameStatus(out) {
  const parts = out.split('\0');
  const files = [];
  for (let k = 0; k + 1 < parts.length; k += 2) if (parts[k]) files.push({ status: parts[k][0], path: parts[k + 1] });
  return files;
}

// ---------------------------------------------------------------------------------------------------
// landed

// The page's script under the export's web folder: `index-<hash>.js` as SDK 58 names it (the live page,
// Nov 14), `entry-<hash>.js` in other SDKs.
const ENTRY = /<script\b[^>]*\bsrc="([^"]*?)\/?_expo\/static\/js\/web\/([\w.-]+\.js)"/;
/** An Expo web export's entry bundle, as its page names it. */
function entryBundle(html) {
  return ENTRY.exec(String(html))?.[2] ?? null;
}
/** The base path the page loads its bundle under ("/chronicles", or "" at the root). */
function entryBase(html) {
  const m = ENTRY.exec(String(html));
  return m ? m[1].replace(/\/$/, '') : null;
}

// ---------------------------------------------------------------------------------------------------
// review-paths

const TRAIL = /[.,;:!?)\]}'"]+$/;
const rootDir = (seg) => {
  try {
    return fs.statSync(path.join('/', seg)).isDirectory();
  } catch {
    return false;
  }
};

/**
 * The absolute paths a prompt names: a backticked span that starts with "/" (spaces allowed), or a
 * bare token that does (not inside a URL or a word). Two segments at least, the first a directory at
 * the filesystem's root ("/workspace", "/tmp"), so a route ("/walk"), a skill ("/tend") or a URL's path
 * is not one. Trailing punctuation is dropped; a ":12" line reference is kept here and read in `exists`.
 */
function absolutePaths(text, isRoot = rootDir) {
  const out = [];
  const keep = (p, line, col) => {
    const segs = p.split('/');
    if (segs.length < 3 || !segs[1] || !isRoot(segs[1])) return;
    out.push({ path: p, line, col });
  };
  String(text).split('\n').forEach((raw, k) => {
    let line = raw;
    for (const m of raw.matchAll(/`(\/[^`\n]+)`/g)) {
      keep(m[1].trim().replace(TRAIL, ''), k + 1, m.index);
      line = line.slice(0, m.index) + ' '.repeat(m[0].length) + line.slice(m.index + m[0].length);
    }
    for (const m of line.matchAll(/(?<![\w:/.~-])\/[^\s`'"<>()[\]{}|,;]+/g)) keep(m[0].replace(TRAIL, ''), k + 1, m.index);
  });
  return out.sort((a, b) => a.line - b.line || a.col - b.col).map(({ path: p, line }) => ({ path: p, line }));
}

/** Whether a named path exists: as written, without a ":12" or "#L12" reference, or up to a glob or a `<placeholder>`. */
function exists(p, test = fs.existsSync) {
  const tries = [p, p.replace(/(:\d+(-\d+)?)+$/, ''), p.replace(/#L\d+(-L?\d+)?$/, '')];
  const glob = p.search(/[*?[\]{}<]/);
  if (glob >= 0) tries.push(p.slice(0, p.lastIndexOf('/', glob) + 1) || '/');
  return tries.some((t) => t && test(t));
}

// ---------------------------------------------------------------------------------------------------
// items

const MIN_MATCH = 6;
const WORD = /[\p{L}\p{N}]/u;
const TAGS = ['loop', 'owner', 'arch', 'phone', 'kept'];

/** An item's marker, checkbox, tag and the rest (records.js's itemParts). */
function itemParts(text) {
  const m = new RegExp(`^([-*+]|\\d+[.)])(\\s+)(\\[[ xX]\\]\\s+)?(\\[(${TAGS.join('|')})\\]\\s+)?`).exec(text);
  return m ? { tag: m[5] ?? null, rest: text.slice(m[0].length) } : null;
}

/** The ends of words in `s` (index after each word's last letter or digit), and its end. */
function wordEnds(s) {
  const ends = [];
  for (let k = 0; k < s.length; k++) if (WORD.test(s[k]) && (k + 1 === s.length || !WORD.test(s[k + 1]))) ends.push(k + 1);
  if (!ends.includes(s.length)) ends.push(s.length);
  return ends;
}

/**
 * The shortest text that names `own` alone among `texts` the way records.js reads a <match> (a plain
 * substring of exactly one item), at least six characters and ending at a word's end: a prefix of its
 * first line after the marker and tag; then a prefix of its first line with them ("- [loop] Swatches",
 * for an item whose words another item repeats); then the shortest such span within one of its lines,
 * starting at a word. Null when every part of it is in another item too (twins).
 */
function shortestMatch(own, rest, texts) {
  const unique = (m) => m.trim() !== '' && own.includes(m) && texts.filter((t) => t.includes(m)).length === 1;
  const prefixes = (line) => {
    for (const e of wordEnds(line)) {
      const m = line.slice(0, e).trimEnd();
      if (m.length >= Math.min(MIN_MATCH, line.trimEnd().length) && unique(m)) return m;
    }
    return null;
  };
  const found = prefixes(rest.split('\n')[0]) ?? prefixes(own.split('\n')[0]);
  if (found) return found;
  let best = null;
  for (const line of own.split('\n')) {
    const starts = [];
    for (let k = 0; k < line.length; k++) if (/\S/.test(line[k]) && (k === 0 || /\s/.test(line[k - 1]) || (WORD.test(line[k]) && !WORD.test(line[k - 1])))) starts.push(k);
    for (const s of starts) {
      for (const e of wordEnds(line)) {
        if (e <= s) continue;
        const m = line.slice(s, e).trimEnd();
        if (m.length < MIN_MATCH) continue;
        if (best && m.length >= best.length) break;
        if (unique(m)) {
          best = m;
          break;
        }
      }
    }
  }
  return best;
}

const sha = (text) => `sha256:${crypto.createHash('sha256').update(text, 'utf8').digest('hex')}`;

/**
 * The items of a record document: `deferred` and `native` (every bullet under an H2), `inbox` (the T and
 * G entries, named by their number) and `open` (the bullets of "Open before the loop"). Each with its
 * section, tag, first line, line number and match, filtered by tag (`none`: untagged) and by section.
 */
function listItems(kind, text, { tag, section } = {}) {
  const records = require('./records');
  // records.js reads a CRLF document as LF (its apply()); so does this (bookkeeping audit 9).
  text = String(text).replace(/\r\n/g, '\n');
  const doc = records.parse(text);
  const scope = {
    deferred: (b) => b.kind === 'item' && b.h2,
    native: (b) => b.kind === 'item' && b.h2,
    inbox: (b) => b.kind === 'item' && b.id,
    open: (b) => b.kind === 'item' && b.h2 === 'Needs the owner' && b.h3 === 'Open before the loop',
  }[kind];
  if (!scope) throw new Usage(`items takes deferred, native, inbox or open, not "${kind}"`);
  const blocks = doc.blocks.filter(scope);
  const texts = blocks.map((b) => b.text);
  const ids = blocks.map((b) => b.id);
  const items = blocks.map((b) => {
    const p = itemParts(b.text) ?? { tag: null, rest: b.text };
    const entryTag = b.id ? /^[-*+]\s+\*\*[TG]\d+\s+\[([\w]+)\]/.exec(b.text)?.[1] ?? null : null;
    const match = b.id ? (ids.filter((x) => x === b.id).length === 1 ? b.id : null) : shortestMatch(b.text, p.rest, texts);
    return {
      section: kind === 'deferred' || kind === 'native' ? [b.h2, b.h3].filter(Boolean).join(' › ') : b.id ? b.h3 : 'Open before the loop',
      tag: b.id ? entryTag : p.tag,
      first: p.rest.split('\n')[0].trim(),
      line: b.start + 1,
      match,
      _text: b.text,
    };
  });
  // records.js is the judge: the operation it would run on the match must act on this item.
  const op = { deferred: ['deferred', 'item note'], native: ['native', 'item note'], inbox: ['status', 'inbox note'], open: ['status', 'open note'] }[kind];
  for (const it of items) {
    if (!it.match) continue;
    try {
      const target = records.apply(op[0], op[1], text, { match: it.match, body: 'x' }).step.target;
      const want = sha(kind === 'inbox' ? it._text.replace(/^([-*+]\s+\*\*)[TG]\d+/, '$1#') : it._text);
      if (target !== want) it.match = null;
    } catch {
      it.match = null;
    }
  }
  const t = tag?.replace(/^\[|\]$/g, '');
  return items
    .filter((it) => !t || (t === 'none' ? it.tag === null : it.tag === t))
    .filter((it) => !section || it.section.toLowerCase().includes(section.toLowerCase()))
    .map(({ _text, ...it }) => it);
}

// ---------------------------------------------------------------------------------------------------
// The shell: git, the files, the network.

function git(...args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Usage(`git ${args.join(' ')}: ${(r.stderr || '').trim()}`);
  return r.stdout;
}
const tryGit = (...args) => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
};
function mainSha() {
  const sha = tryGit('rev-parse', '--verify', '-q', `${MAIN}^{commit}`);
  if (!sha) throw new Usage(`no ${MAIN} here: git fetch origin main first`);
  return sha.trim();
}
const short = (s) => s.slice(0, 7);

/** argv's flags: `--json`, the value flags named, the rest as words. */
function flags(argv, valued = []) {
  const words = [];
  const f = { json: false };
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (a === '--json') f.json = true;
    else if (valued.includes(a)) {
      if (k + 1 >= argv.length) throw new Usage(`${a} takes a value`);
      f[a.slice(2)] = argv[++k];
    } else if (a.startsWith('--') && a.length > 2) f[a.slice(2)] = true;
    else words.push(a);
  }
  return { words, f };
}

/** Prints the result: JSON, or its plain lines (stdout) and problems (stderr). Returns the exit code. */
function emit(f, result, lines, problems = []) {
  if (f.json) console.log(JSON.stringify({ ...result, ok: problems.length === 0, problems }, null, 2));
  else {
    if (lines.length) console.log(lines.join('\n'));
    for (const p of problems) console.error(p);
  }
  return problems.length ? 1 : 0;
}

function nextDecision(argv) {
  const { words, f } = flags(argv, ['--check']);
  if (f.check === true) throw new Usage('--check takes a number: next-decision --check <NNNN> [<file>]');
  const sha = mainSha();
  const names = git('ls-tree', '--name-only', `${MAIN}:docs/decisions`).split('\n').filter(Boolean);
  const s = decisionState(names);
  const head = `on ${MAIN} (${short(sha)})`;
  if (f.check === undefined) {
    if (words.length) throw new Usage(`unexpected words: ${words.join(' ')}`);
    const lines = [s.next, `highest ${head}: ${s.highest?.file ?? 'none'}`];
    for (const d of s.duplicates) lines.push(`held twice ${head}: ${d.number} (${d.files.join(', ')})`);
    return emit(f, { ref: MAIN, sha, next: s.next, highest: s.highest, duplicates: s.duplicates }, lines);
  }
  if (words.length > 1) throw new Usage(`unexpected words: ${words.slice(1).join(' ')}`);
  const c = checkDecision(names, f.check, words[0]);
  const result = { ref: MAIN, sha, number: c.number, file: c.file ?? null, next: c.next, taken: c.taken ?? [] };
  if (!c.ok) return emit(f, result, [c.next], [`next-decision: ${c.problem}`]);
  return emit(f, result, [`${c.number} ${c.published ? 'is this file\'s' : 'is free'} ${head}${c.file ? ` for ${c.file}` : ''}`]);
}

/** Every line holding "audit" in a tree (`rev`), or in the working tree, untracked files included. */
function grepAudit(rev, label) {
  const args = ['grep', '-I', '-n', '--null', '-i', '-F', '-e', 'audit'];
  if (rev) args.push(rev);
  else args.push('--untracked');
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0 && r.status !== 1) throw new Usage(`git grep: ${r.stderr.trim()}`);
  return r.stdout.split('\n').filter(Boolean).map((l) => {
    const [file, line, ...text] = l.split('\0');
    return { where: `${label}${rev ? file.slice(rev.length + 1) : file}:${line}`, text: text.join('\0') };
  });
}

/**
 * The places an audit number lives (bookkeeping audit 1, 2): origin/main's whole tree, HEAD's history and
 * tree, the uncommitted working tree (untracked files too, ignored ones not), and the subjects and bodies
 * of every commit on main or HEAD. A number a branch's first round gave, or a finding deferred or rejected
 * into a record document, is taken.
 */
function auditSources() {
  const sources = [];
  const log = git('log', '--format=%x1e%h%x00%B', MAIN, 'HEAD');
  for (const rec of log.split('\x1e').filter(Boolean)) {
    const [h, body] = rec.split('\0');
    sources.push({ where: `commit ${h}`, text: body ?? '' });
  }
  const head = tryGit('rev-parse', '--verify', '-q', 'HEAD^{commit}')?.trim();
  sources.push(...grepAudit(MAIN, `${MAIN}:`));
  if (head && head !== mainSha()) sources.push(...grepAudit('HEAD', 'HEAD:'));
  sources.push(...grepAudit(null, 'working tree: '));
  return sources;
}

function nextAudit(argv) {
  const { words, f } = flags(argv);
  const prefix = words.join(' ').trim();
  if (!prefix) throw new Usage('next-audit takes the prefix: next-audit "tend explore" | next-audit memo-transcripts');
  const sha = mainSha();
  const a = auditNumbers(prefix, auditSources());
  // One line per place: the same line in main's tree, HEAD's and the working tree is shown once.
  const seen = new Set();
  const top = a.hits.filter((h) => h.n === a.highest).filter((h) => {
    const key = `${h.where.replace(/^(origin\/main:|HEAD:|working tree: )/, '')}\0${h.text}`;
    return seen.has(key) ? false : (seen.add(key), true);
  });
  const read = `${MAIN} (${short(sha)}), HEAD and the working tree`;
  const lines = [String(a.next)];
  if (a.highest === null) lines.push(`no "${prefix} audit N" in ${read}`);
  else {
    lines.push(`highest in ${read}: ${prefix} audit ${a.highest}`);
    for (const h of top) {
      const text = h.text.trim().split('\n').find((l) => auditRegex(prefix).test(l)) ?? h.text.trim().split('\n')[0];
      lines.push(`  ${h.where}: ${text.length > 100 ? `${text.slice(0, 99)}…` : text}`);
    }
  }
  return emit(f, { ref: MAIN, sha, read: [MAIN, 'HEAD', 'working tree'], prefix, highest: a.highest, next: a.next, at: top.map(({ where, text }) => ({ where, text: text.trim() })) }, lines);
}

function files(argv) {
  const { words, f } = flags(argv, ['--max-src']);
  if (words.length > 1) throw new Usage(`unexpected words: ${words.slice(1).join(' ')}`);
  const spec = words[0] ?? MAIN;
  let changed;
  let what;
  const range = /^(.*?)\.{2,3}(.*)$/.exec(spec);
  if (range) {
    const [a, b] = [range[1] || 'HEAD', range[2] || 'HEAD'];
    const mb = git('merge-base', a, b).trim();
    changed = nameStatus(git('diff', '--name-status', '-z', '--no-renames', mb, b));
    what = `${spec}: the commits since the merge base ${short(mb)}, nothing uncommitted`;
  } else {
    const mb = git('merge-base', spec, 'HEAD').trim();
    changed = nameStatus(git('diff', '--name-status', '-z', '--no-renames', mb));
    const untracked = git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
    changed.push(...untracked.map((p) => ({ status: '?', path: p })));
    what = `against ${spec}: merge base ${short(mb)}, committed, staged, unstaged and untracked`;
  }
  const g = groupFiles(changed);
  const lines = [what, ...GROUPS.map(([k, label]) => `${label} ${g.counts[k]}`), `total ${g.total}`, `sources ${g.sources} (src/ and scripts/, the tripwire's count)`];
  for (const [k, label] of GROUPS) {
    const fs2 = g.files.filter((x) => x.group === k);
    if (!fs2.length) continue;
    lines.push('', label, ...fs2.map((x) => `  ${x.status} ${x.path}`));
  }
  const problems = [];
  if (f['max-src'] !== undefined) {
    const max = Number(f['max-src']);
    if (!Number.isInteger(max) || max < 0) throw new Usage('--max-src takes a whole number');
    if (g.sources > max) problems.push(`files: ${g.sources} source files (src/ and scripts/, tests and journeys apart), over --max-src ${max}`);
  }
  return emit(f, { spec, counts: g.counts, sources: g.sources, total: g.total, files: g.files }, lines, problems);
}

function fetchPage(url) {
  const r = spawnSync('curl', ['-fsSL', '--max-time', '30', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { error: `curl could not run: ${r.error.message}` };
  if (r.status !== 0) return { error: `curl exited ${r.status}: ${(r.stderr || '').trim()}` };
  return { html: r.stdout };
}

function landed(argv) {
  const { words, f } = flags(argv, ['--branch', '--live']);
  const spec = words[0];
  const m = spec && /^(.+?)\.\.(.+)$/.exec(spec);
  // Two parts, run where each can (ship.md, "Clean up"): the range and the live page while the run's
  // worktree is there, the branch once it is gone (bookkeeping audit 5, 6).
  if ((spec && !m) || (!spec && !f.branch) || words.length > 1 || f.branch === true || f.live === true) throw new Usage('landed <base>..<pushed sha> [--live <url>] | landed --branch <name>, or both');
  const sha = mainSha();
  const lines = [];
  const problems = [];
  const result = { ref: MAIN, sha, range: spec ?? null };
  if (m) {
    // A head named by a ref that is main's tip holds whatever landed, the run's or not: it can never fail.
    if (!/^[0-9a-f]{7,40}$/i.test(m[2]) && tryGit('rev-parse', '--verify', '-q', `${m[2]}^{commit}`)?.trim() === sha) {
      throw new Usage(`${m[2]} is ${MAIN}'s tip: give the run's pushed sha as the head (<base>..<pushed sha>), so the range holds the run's commits and nothing else`);
    }
    const commits = git('rev-list', '--reverse', spec).split('\n').filter(Boolean);
    result.commits = commits;
    if (!commits.length) problems.push(`landed: ${spec} holds no commits`);
    const off = commits.filter((c) => spawnSync('git', ['merge-base', '--is-ancestor', c, MAIN], { cwd: ROOT }).status !== 0);
    const cherry = off.length ? new Map(git('cherry', MAIN, m[2], m[1]).split('\n').filter(Boolean).map((l) => [l.slice(2), l[0]])) : new Map();
    for (const c of off) {
      const subject = git('show', '-s', '--format=%s', c).trim();
      const again = cherry.get(c) === '-' ? ` (its patch is on ${MAIN} under another hash: report main's)` : '';
      problems.push(`landed: not on ${MAIN}: ${short(c)} ${subject}${again}`);
    }
    result.notOnMain = off;
    if (commits.length && !off.length) lines.push(`${spec}: ${commits.length} commit${commits.length === 1 ? '' : 's'}, each an ancestor of ${MAIN} (${short(sha)}, as last fetched)`);
  }
  if (f.branch) {
    const left = [];
    if (tryGit('show-ref', '--verify', '-q', `refs/heads/${f.branch}`) !== null) left.push(`the local branch ${f.branch}`);
    const common = path.resolve(ROOT, git('rev-parse', '--git-common-dir').trim());
    const primary = path.dirname(common);
    const trees = git('worktree', 'list', '--porcelain').split('\n\n').filter(Boolean).map((b) => ({ path: /^worktree (.*)$/m.exec(b)?.[1], branch: /^branch refs\/heads\/(.*)$/m.exec(b)?.[1] }));
    const under = path.join(primary, '.claude', 'worktrees') + path.sep;
    for (const t of trees) if (t.path && (t.branch === f.branch || (t.path + path.sep).startsWith(under + f.branch.replace(/\//g, '-') + path.sep))) left.push(`the worktree ${path.relative(primary, t.path)}${t.branch ? ` (on ${t.branch})` : ''}`);
    const dir = path.join(under, f.branch.replace(/\//g, '-'));
    if (fs.existsSync(dir) && !left.some((l) => l.includes(path.relative(primary, dir)))) left.push(`the directory ${path.relative(primary, dir)}`);
    for (const l of left) problems.push(`landed: ${l} is left`);
    const remote = tryGit('show-ref', '--verify', '-q', `refs/remotes/origin/${f.branch}`) !== null;
    result.branch = { name: f.branch, left, remote };
    if (!left.length) lines.push(`${f.branch}: no worktree under .claude/worktrees/ and no local branch`);
    if (remote) lines.push(`origin/${f.branch} exists as last fetched: the remote branch is not this check's`);
  }
  if (f.live) {
    const page = fetchPage(f.live);
    const live = page.html !== undefined ? entryBundle(page.html) : null;
    result.live = { url: f.live, entry: live };
    if (page.error) problems.push(`landed: ${f.live}: ${page.error}`);
    else if (!live) problems.push(`landed: ${f.live} names no entry bundle (a script under _expo/static/js/web/)`);
    else {
      lines.push(`live ${f.live}: ${live}`);
      const index = path.join(ROOT, 'dist', 'index.html');
      if (fs.existsSync(index)) {
        const html = fs.readFileSync(index, 'utf8');
        const local = entryBundle(html);
        const [lb, db] = [entryBase(page.html), entryBase(html)];
        result.dist = { entry: local, compared: local !== null && lb === db };
        if (!local) lines.push('dist/index.html names no entry bundle: not compared');
        else if (lb !== db) lines.push(`dist/: ${local}, exported for "${db || '/'}", not "${lb || '/'}": not compared (the Pages export is CHRONICLES_BASE_URL=/chronicles npx expo export --platform web)`);
        else if (local === live) lines.push(`dist/: ${local}, the same`);
        else problems.push(`landed: dist/ exports ${local}, the live page loads ${live}`);
      } else lines.push('no dist/ here, so the live bundle was compared with nothing: it is only printed');
    }
  }
  lines.push('Pages: not seen here; the GitHub tools say whether its run is green (mcp__github__actions_list, mcp__github__actions_get)');
  return emit(f, result, lines, problems);
}

function reviewPaths(argv) {
  const { words, f } = flags(argv);
  if (!words.length) throw new Usage('review-paths <prompt.md>...');
  const prompts = [];
  const lines = [];
  const problems = [];
  for (const w of words) {
    const prompt = path.resolve(w);
    if (!fs.existsSync(prompt)) {
      prompts.push({ prompt, exists: false, paths: 0, missing: [] });
      problems.push(`review-paths: no prompt at ${prompt}`);
      continue;
    }
    const named = absolutePaths(fs.readFileSync(prompt, 'utf8'));
    const missing = named.filter((p) => !exists(p.path));
    prompts.push({ prompt, exists: true, paths: named.length, missing });
    if (!missing.length) lines.push(`ok ${prompt}: ${named.length} absolute paths, all exist`);
    else {
      lines.push(`${prompt}: ${named.length} absolute paths, ${missing.length} missing`);
      problems.push(`review-paths: missing in ${prompt}:`, ...missing.map((p) => `  line ${p.line}: ${p.path}`));
    }
  }
  return emit(f, { prompts }, lines, problems);
}

/** A word the shell reads back as itself: single quotes, a quote inside written '\\''. */
const shellQuote = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

const ITEM_FILES = { deferred: 'docs/DEFERRED.md', native: 'docs/NATIVE_UNVERIFIED.md', inbox: 'docs/STATUS.md', open: 'docs/STATUS.md' };

function items(argv) {
  const { words, f } = flags(argv, ['--tag', '--section']);
  const [kind, ...more] = words;
  if (!ITEM_FILES[kind] || more.length || (f.main && f.worktree)) throw new Usage('items deferred|native|inbox|open [--tag <tag>|none] [--section <text>] [--main | --worktree]');
  const file = ITEM_FILES[kind];
  // records.js acts on the working tree (HEAD and the pending operations): a run that already changed the
  // document reads its own copy; one that has not reads main's (bookkeeping audit 10).
  const sha = mainSha();
  const onMain = git('show', `${MAIN}:${file}`);
  const local = path.join(ROOT, file);
  const working = fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : null;
  let text;
  let from;
  if (f.worktree || (!f.main && working !== null && working !== onMain)) {
    if (working === null) throw new Usage(`no ${file} in this working tree`);
    text = working;
    from = `${file} in the working tree${working !== onMain ? `, which differs from ${MAIN} (${short(sha)})` : ''}`;
  } else {
    text = onMain;
    from = `${file} on ${MAIN} (${short(sha)})`;
  }
  const list = listItems(kind, text, { tag: typeof f.tag === 'string' ? f.tag : undefined, section: typeof f.section === 'string' ? f.section : undefined });
  const lines = [];
  let at = null;
  for (const it of list) {
    if (it.section !== at) {
      if (at !== null) lines.push('');
      lines.push(`## ${it.section}`);
      at = it.section;
    }
    const first = it.first.length > 110 ? `${it.first.slice(0, 109)}…` : it.first;
    lines.push(`- ${it.tag && !first.includes(`[${it.tag}]`) ? `[${it.tag}] ` : ''}${first} (line ${it.line})`);
    lines.push(`  match: ${it.match === null ? 'none: every part of it is in another item too' : JSON.stringify(it.match)}`);
    // The match in single quotes, safe to paste: a backtick or a $ inside double quotes is the shell's (bookkeeping audit 8).
    if (it.match !== null) lines.push(`  shell: ${shellQuote(it.match)}`);
  }
  if (lines.length) lines.push('');
  lines.push(`${list.length} items, from ${from}`);
  const problems = list.filter((it) => it.match === null).map((it) => `items: no match names "${it.first}" (line ${it.line}) alone: records.js cannot act on it until its text differs`);
  return emit(f, { file, from, items: list.map((it) => ({ ...it, shell: it.match === null ? null : shellQuote(it.match) })) }, lines, problems);
}

const COMMANDS = { 'next-decision': nextDecision, 'next-audit': nextAudit, files, landed, 'review-paths': reviewPaths, items };
const USAGE = 'usage: node scripts/bookkeeping.js next-decision [--check <NNNN> [<file>]] | next-audit "<prefix>" | files [<rev> | <a>..<b>] [--max-src N] | landed [<base>..<pushed sha>] [--live <url>] [--branch <name>] | review-paths <prompt.md>... | items deferred|native|inbox|open [--tag <t>] [--section <s>] [--main | --worktree]; each takes --json';

function main(argv) {
  const [cmd, ...rest] = argv;
  const run = COMMANDS[cmd];
  if (!run) {
    console.error(USAGE);
    return 2;
  }
  try {
    return run(rest);
  } catch (e) {
    if (!(e instanceof Usage)) throw e;
    console.error(`${cmd}: ${e.message}`);
    return 2;
  }
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { COMMANDS, decisionState: (n) => { const { pad, ...s } = decisionState(n); return s; }, checkDecision, auditRegex, auditNumbers, groupOf, groupFiles, entryBundle, absolutePaths, exists, shortestMatch, listItems, main };
