#!/usr/bin/env node
// The tending loop's two mechanical reads (decisions 0128-0130; .claude/skills/tend/SKILL.md):
//
//   node scripts/tend.js balance [--days N] [--write]   growth against refinement on origin/main,
//                                                       the areas by state, the open entries, a reading
//   node scripts/tend.js commits <range>                every `tend …` commit in the range has a test
//                                                       and names its source (exit 1 otherwise)
//
// The decisions are pure and exported for arch/tend.test.ts; git and the files are read in main().
// None of this is shown in the app: nothing is a score there (decision 0020).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LEDGER = path.join(ROOT, '.claude', 'skills', 'tend', 'ledger.json');
const STATES = ['rough', 'settling', 'polished', 'resting'];
const LIMITS = { days: 14, rough: 3, inbox: 10, proposals: 3 };

/** A commit subject as growth (a slice's criteria), refinement (a fix, a tend, an audit, a revert) or other. */
function classify(subject) {
  const s = subject.trim();
  if (/^Merge\b/.test(s)) return 'other';
  if (/^(fix|tend)\b/i.test(s) || /^Revert\b/.test(s) || /\baudits?\b/i.test(s)) return 'refinement';
  if (criteriaPrefixes(s).length) return 'growth';
  return 'other';
}

/** The criterion prefixes a subject names in parentheses: "(PK1-PK19)" gives ["PK"]. */
function criteriaPrefixes(subject) {
  const out = new Set();
  for (const group of subject.match(/\(([^)]*)\)/g) ?? []) {
    for (const m of group.matchAll(/\b([A-Z]{1,3})\d+\b/g)) out.add(m[1]);
  }
  return [...out].sort();
}

/** Counts of each kind, and the slices (by prefix) that grew. */
function tally(subjects) {
  const t = { growth: 0, refinement: 0, other: 0, slices: [] };
  const slices = new Set();
  for (const s of subjects) {
    const kind = classify(s);
    t[kind] += 1;
    if (kind === 'growth') for (const p of criteriaPrefixes(s)) slices.add(p);
  }
  t.slices = [...slices].sort();
  return t;
}

/** Areas by state; an area the ledger does not list has never been swept and is not counted. */
function areasByState(areas) {
  const by = Object.fromEntries(STATES.map((s) => [s, []]));
  for (const [name, a] of Object.entries(areas ?? {})) (by[a.state] ?? (by[a.state] = [])).push(name);
  for (const s of Object.keys(by)) by[s].sort();
  return by;
}

/** Open inbox entries (T), open proposals (G) and rows in flight, from docs/STATUS.md. */
function readStatus(text) {
  const openT = new Set(text.match(/^- \*\*T\d+\b/gm) ?? []).size;
  const openG = new Set(text.match(/^- \*\*G\d+\b/gm) ?? []).size;
  const flight = /^## In flight\n([\s\S]*?)(?=^## |\Z)/m.exec(text);
  const rows = flight ? flight[1].split('\n').filter((l) => /^\|/.test(l)) : [];
  return { openT, openG, inFlight: Math.max(0, rows.length - 2) };
}

/**
 * The reading, in the order the skill gives it: a base that is not holding comes before a product
 * that is not growing, since nothing new goes on a rough base.
 */
function reading({ growth, rough, openT, openG, inFlight }, limits = LIMITS) {
  if (rough > limits.rough || openT > limits.inbox) {
    const why = [];
    if (rough > limits.rough) why.push(`${words(rough)} areas are rough`);
    if (openT > limits.inbox) why.push(`${words(openT)} inbox entries wait for the owner`);
    return { reading: 'outgrowing its base', propose: false, why: why.join('; ') };
  }
  if (growth === 0) return { reading: 'settling', propose: true, why: 'no slice grew in the window' };
  if (inFlight === 0 && openG === 0) return { reading: 'settling', propose: true, why: 'nothing is in flight and no evolution is proposed' };
  return { reading: 'in step', propose: false, why: 'slices are growing and the base holds' };
}

function words(n) {
  return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] ?? String(n);
}

const DOC_ONLY = /(\.md$|^docs\/|^\.claude\/|^specs\/)/;
const TEST_FILE = /(__tests__\/|^scripts\/e2e\/)/;

/** What a loop commit lacks: its test, its source, or nothing. Docs-only commits need neither. */
function tendCommitProblems({ subject, body, files }) {
  if (!/^tend\b/i.test(subject)) return [];
  const problems = [];
  const code = files.filter((f) => !DOC_ONLY.test(f));
  if (code.length && !files.some((f) => TEST_FILE.test(f))) problems.push('no test or journey step beside the change');
  if (code.length && !/^Source: \S/m.test(body)) problems.push('no "Source:" line naming the rule it conforms to');
  return problems;
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function readLedger() {
  return JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
}

function balance(argv) {
  const at = argv.indexOf('--days');
  const days = at >= 0 ? Number(argv[at + 1]) : LIMITS.days;
  const subjects = git('log', `--since=${days} days ago`, '--format=%s', 'origin/main').split('\n').filter(Boolean);
  const t = tally(subjects);
  const ledger = readLedger();
  const by = areasByState(ledger.areas);
  const status = readStatus(fs.readFileSync(path.join(ROOT, 'docs', 'STATUS.md'), 'utf8'));
  const r = reading({ growth: t.growth, rough: by.rough.length, ...status });
  const out = {
    date: new Date().toISOString().slice(0, 10),
    days,
    commits: { growth: t.growth, refinement: t.refinement, other: t.other },
    slices: t.slices,
    areas: by,
    open: status,
    ...r,
  };
  console.log(JSON.stringify(out, null, 2));
  if (argv.includes('--write')) {
    ledger.balance = out;
    fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
  }
}

function commits(range) {
  if (!range) {
    console.error('usage: node scripts/tend.js commits <range>, e.g. origin/main..HEAD');
    process.exit(2);
  }
  const shas = git('rev-list', '--no-merges', range).split('\n').filter(Boolean);
  let bad = 0;
  for (const sha of shas) {
    const [subject, ...rest] = git('show', '-s', '--format=%s%n%b', sha).split('\n');
    const files = git('show', '--name-only', '--format=', sha).split('\n').filter(Boolean);
    for (const p of tendCommitProblems({ subject, body: rest.join('\n'), files })) {
      bad += 1;
      console.error(`${sha.slice(0, 7)} ${subject}\n  ${p}`);
    }
  }
  if (bad) process.exit(1);
  console.log(`check:tend: ${shas.length} commits read, clean.`);
}

if (require.main === module) {
  const [cmd, ...argv] = process.argv.slice(2);
  if (cmd === 'balance') balance(argv);
  else if (cmd === 'commits') commits(argv[0]);
  else {
    console.error('usage: node scripts/tend.js balance [--days N] [--write] | commits <range>');
    process.exit(2);
  }
}

module.exports = { LIMITS, STATES, classify, criteriaPrefixes, tally, areasByState, readStatus, reading, tendCommitProblems };
