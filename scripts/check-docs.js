#!/usr/bin/env node
/**
 * Checks that the agent docs stay small and pointed at real files.
 * Run by CI (before the export, so a failure blocks the deploy) and by the
 * Stop hook (.claude/hooks/check-done.sh). Plain Node, no dependencies.
 *
 *   1. Budgets: AGENTS.md loads into every session, so it has a ceiling
 *      (Anthropic's guidance is under 200 lines; bytes are the real cost,
 *      since long lines dodge a line count). Rule files are cut off past
 *      40,000 characters; skills should stay under 500 lines.
 *   2. Every `paths:` glob of a rule file matches at least one file, or the
 *      rule never loads.
 *   3. Every repo path the docs name in backticks exists.
 *   4. A criterion prefix belongs to one spec, a decision number to one record
 *      (scripts/collisions.js).
 *
 * Exit 1 with a list of problems, each saying how to fix it; exit 0 when clean.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

const BUDGET = {
  agentsLines: 200,
  agentsBytes: 12_000,
  visionLines: 160,
  visionBytes: 12_000,
  ruleChars: 40_000,
  skillLines: 500,
};

// Docs whose backticked paths must exist. Left out on purpose: docs/STATUS.md
// (names branches and files that live only on branches), docs/decisions/
// (history; may name files since moved), docs/research-*.md (cites library
// sources), specs/ (a mirror of the owner's doc).
const PATH_CHECKED = [
  'AGENTS.md',
  'README.md',
  'docs/ARCHITECTURE.md',
  'docs/TESTING.md',
  'docs/PRODUCT.md',
  'docs/DEFERRED.md',
  'docs/NATIVE_UNVERIFIED.md',
  'docs/VISION.md',
  ...list('.claude/rules', '.md'),
  ...list('.claude/agents', '.md'),
  ...listSkills(),
];
const PATH_PREFIX = /^(src|scripts|docs|specs|public|assets|\.claude|\.github)\//;
// Docs usually name modules short: `lib/quietLines`, `nav/types.ts`,
// `components/Modal`, `(tabs)/index.tsx`. Those count when they look like a
// source path (a known extension, or a lib/ components/ app/ start) and are
// resolved against src/, src/lib/, src/components/, src/app/, src/lib/__tests__/ and scripts/e2e/.
const SHORT = /^[\w.()[\]-]+(\/[\w.()[\]-]+)+\/?$/;
const SOURCE_EXT = /\.(tsx?|m?js|json)$/;
const SHORT_START = /^(lib|components|app)\//;
const BASES = ['', 'src/', 'src/lib/', 'src/components/', 'src/app/', 'src/lib/__tests__/', 'scripts/e2e/'];
const EXTS = ['', '.ts', '.tsx', '.native.ts', '.web.ts', '.native.tsx', '.web.tsx', '/index.ts', '/index.tsx'];
function resolves(p) {
  for (const base of BASES) for (const ext of EXTS) if (fs.existsSync(base + p.replace(/\/$/, '') + ext)) return true;
  return false;
}

const problems = [];
const fail = (msg) => problems.push(msg);

function list(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => `${dir}/${f}`);
}
function listSkills() {
  const dir = '.claude/skills';
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((d) => `${dir}/${d}/SKILL.md`)
    .filter((f) => fs.existsSync(f));
}

/** Tracked and new (not ignored) files that exist on disk. */
function repoFiles() {
  const out = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' });
  return [...new Set(out.split('\n').filter(Boolean))].filter((f) => fs.existsSync(f));
}

/** A glob as Claude Code reads it: ** crosses directories, * stays in one, {a,b} alternates. */
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*';
      i++;
      if (glob[i + 1] === '/') i++;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '{' && glob.indexOf('}', i) > i) {
      const end = glob.indexOf('}', i);
      re += '(' + glob.slice(i + 1, end).split(',').map(escape).join('|') + ')';
      i = end;
    } else re += escape(c);
  }
  return new RegExp('^' + re + '$');
}
function escape(s) {
  return s.replace(/[.+^$()|[\]\\{}]/g, '\\$&');
}

function frontmatterPaths(text) {
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const block = fm[1].match(/^paths:[ \t]*(.*)$([\s\S]*)/m);
  if (!block) return null;
  if (block[1].trim()) {
    return block[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  const globs = [];
  for (const line of block[2].split('\n')) {
    const m = line.match(/^\s+-\s+["']?([^"']+?)["']?\s*$/);
    if (m) globs.push(m[1]);
    else if (line.trim() && !/^\s/.test(line)) break;
  }
  return globs;
}

// 1. Budgets
{
  const text = fs.readFileSync('AGENTS.md', 'utf8');
  const lines = text.split('\n').length;
  const bytes = Buffer.byteLength(text);
  if (lines > BUDGET.agentsLines || bytes > BUDGET.agentsBytes) {
    fail(
      `AGENTS.md is ${lines} lines / ${bytes} bytes (budget ${BUDGET.agentsLines} lines / ${BUDGET.agentsBytes} bytes). ` +
        'It loads into every session: move area rules to .claude/rules/<area>.md, an owner\'s call to docs/decisions/, ' +
        'a procedure to a skill, and keep only what every session needs.',
    );
  }
  {
    // The vision is read whole by every gate (decision 0094): one page, kept to one.
    const v = fs.readFileSync('docs/VISION.md', 'utf8');
    const vl = v.split('\n').length;
    const vb = Buffer.byteLength(v);
    if (vl > BUDGET.visionLines || vb > BUDGET.visionBytes) {
      fail(
        `docs/VISION.md is ${vl} lines / ${vb} bytes (budget ${BUDGET.visionLines} lines / ${BUDGET.visionBytes} bytes). ` +
          'Every /vision gate reads it whole: keep rules and shapes, move history to docs/decisions/.',
      );
    }
  }
  for (const f of list('.claude/rules', '.md')) {
    const n = fs.readFileSync(f, 'utf8').length;
    if (n > BUDGET.ruleChars) {
      fail(`${f} is ${n} characters; past ${BUDGET.ruleChars} Claude sees only its start. Split it into two rule files with narrower paths.`);
    }
  }
  for (const f of listSkills()) {
    const n = fs.readFileSync(f, 'utf8').split('\n').length;
    if (n > BUDGET.skillLines) {
      fail(`${f} is ${n} lines (keep under ${BUDGET.skillLines}); move reference material into files beside it.`);
    }
  }
}

const files = repoFiles();

// 2. Rule globs
for (const f of list('.claude/rules', '.md')) {
  const globs = frontmatterPaths(fs.readFileSync(f, 'utf8'));
  if (globs === null) continue; // no paths: an always-loaded rule
  if (globs.length === 0) fail(`${f} has a paths: key with no globs.`);
  for (const g of globs) {
    const re = globToRegExp(g);
    if (!files.some((x) => re.test(x))) {
      fail(`${f}: the glob "${g}" matches no file, so this rule never loads for it. Fix the glob (was the file moved or renamed?).`);
    }
  }
}

// 3. Named paths exist
for (const doc of PATH_CHECKED) {
  if (!fs.existsSync(doc)) continue;
  const text = fs.readFileSync(doc, 'utf8');
  const seen = new Set();
  for (const m of text.matchAll(/`([^`\s]+)`/g)) {
    let p = m[1].replace(/[),.;:]+$/, '').replace(/:\d+(-\d+)?$/, '');
    if (/[<>]/.test(p) || seen.has(p)) continue;
    const full = PATH_PREFIX.test(p);
    const short = !full && SHORT.test(p) && (SOURCE_EXT.test(p) || SHORT_START.test(p));
    if (!full && !short) continue;
    seen.add(p);
    if (short) {
      if (!resolves(p)) fail(`${doc} names \`${p}\`, which matches no file under src/. Update the reference (moved or renamed?) or remove it.`);
      continue;
    }
    if (/[*?{]/.test(p)) {
      const re = globToRegExp(p.replace(/\/$/, '/**'));
      if (!files.some((x) => re.test(x))) fail(`${doc} names \`${p}\`, which matches no file.`);
    } else if (!fs.existsSync(p)) {
      fail(`${doc} names \`${p}\`, which doesn't exist. Update the reference (moved or renamed?) or remove it.`);
    }
  }
}

// 4. One owner per criterion prefix and per decision number (TG14, TG15)
{
  const { sharedPrefixes, duplicateDecisions } = require('./collisions');
  const { readSpecs, idsOf } = require('./check-specs');
  for (const c of sharedPrefixes(readSpecs().map((s) => ({ slug: s.slug, prefixes: idsOf(s.text).prefixes })))) {
    fail(`The criterion prefix ${c.prefix} is used by ${c.slugs.join(' and ')}: give the newer spec a prefix no spec uses (npm run check:specs lists them), and rename its ids in its tests.`);
  }
  for (const d of duplicateDecisions(fs.readdirSync('docs/decisions'))) {
    fail(`Decision number ${d.number} is held by ${d.files.join(' and ')}: renumber the newer one to the next free number, in its file name, its title, docs/decisions/README.md and what cites it.`);
  }
}

if (problems.length) {
  console.error(`check-docs: ${problems.length} problem${problems.length > 1 ? 's' : ''}`);
  for (const p of problems) console.error(`- ${p}`);
  process.exit(1);
}
console.log(`check-docs: ok (AGENTS.md, ${list('.claude/rules', '.md').length} rule files, ${PATH_CHECKED.length} docs checked)`);
