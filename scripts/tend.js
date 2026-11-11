#!/usr/bin/env node
// The tending loop's mechanical reads (decisions 0128-0130; .claude/skills/tend/SKILL.md):
//
//   node scripts/tend.js balance [--days N] [--write]   which slices grew on origin/main against the
//                                                       refinement beside them, the areas by state (an
//                                                       area changed since its sweep is rough), the
//                                                       open entries, and a reading (shallow-clone
//                                                       boundary commits are left out)
//   node scripts/tend.js log <range> '<json>'          append this run's line to the run log: what the
//                                                       range holds (shipped, audit fixes, reverts) with
//                                                       what only the run knows (found, filed, answers)
//   node scripts/tend.js next                           the area to sweep when the owner names none
//   node scripts/tend.js commits <range>                a sweep's commits: each is a loop commit with a
//                                                       real test and its source, and none touches what
//                                                       the loop may not (exit 1 otherwise); CI runs
//                                                       it with --loop-only on every push to main
//
// The decisions are pure and exported for arch/tend.test.ts; git and the files are read in main().
// None of this is shown in the app: nothing is a score there (decision 0020).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LEDGER = path.join(ROOT, '.claude', 'skills', 'tend', 'ledger.json');
const RUNS = path.join(ROOT, '.claude', 'skills', 'tend', 'runs.jsonl');
const RUNS_REL = '.claude/skills/tend/runs.jsonl';
const STATES = ['rough', 'settling', 'polished', 'resting'];
const LIMITS = { days: 14, rough: 3, inbox: 10, proposals: 3 };

const groups = (subject) => subject.match(/\(([^)]*)\)/g) ?? [];
const outside = (subject) => subject.replace(/\([^)]*\)/g, ' ');

/**
 * The criterion prefixes a subject names: in parentheses ("(PK1-PK19)") or leading it ("PW16: …").
 * With `known` (the prefixes the specs really use) anything else is dropped: "(WCAG 2.2, SC1)", "(G4)".
 */
function criteriaPrefixes(subject, known) {
  const out = new Set();
  for (const group of groups(subject)) for (const m of group.matchAll(/\b([A-Z]{1,3})\d+\b/g)) out.add(m[1]);
  const lead = /^([A-Z]{1,3})\d+(?:-[A-Z]{0,3}\d+)?:/.exec(subject.trim());
  if (lead) out.add(lead[1]);
  return [...out].filter((p) => !known || known.has(p)).sort();
}

/**
 * A commit as growth (a slice's criteria, changing the app's source), refinement (a fix, a tend, an
 * audit, a revert) or other. "audit" inside a criteria group does not make a slice's own commit
 * refinement; without `files` the source test is skipped.
 */
function classify(subject, { files, known } = {}) {
  const s = subject.trim();
  if (/^Merge\b/.test(s)) return 'other';
  if (/^(fix|tend)\b/i.test(s) || /^Revert\b/.test(s) || /\baudits?\b/i.test(outside(s))) return 'refinement';
  if (!criteriaPrefixes(s, known).length) return 'other';
  if (files && !files.some(isAppSource)) return 'other';
  return 'growth';
}

const isAppSource = (f) => /^src\//.test(f) && !/__tests__\//.test(f);

/** Counts of each kind, and the slices (by prefix) that grew: growth is read by slice, not by commit. */
function tally(commits, known) {
  const t = { growth: 0, refinement: 0, other: 0, slices: [] };
  const slices = new Set();
  for (const c of commits) {
    const kind = classify(c.subject, { files: c.files, known });
    t[kind] += 1;
    if (kind === 'growth') for (const p of criteriaPrefixes(c.subject, known)) slices.add(p);
  }
  t.slices = [...slices].sort();
  return t;
}

/**
 * Areas by state. An area whose source changed since its sweep by anything but the loop itself is
 * rough whatever the ledger says: `changed` maps an area to true when that happened.
 */
function areasByState(areas, changed = {}) {
  const by = Object.fromEntries(STATES.map((s) => [s, []]));
  for (const [name, a] of Object.entries(areas ?? {})) {
    const state = changed[name] ? 'rough' : a.state;
    if (by[state]) by[state].push(name);
  }
  for (const s of STATES) by[s].sort();
  return by;
}

/** Open inbox entries (T, those for a phone apart) and open proposals (G), from docs/STATUS.md. */
function readStatus(text) {
  const entries = (letter) => new Map([...text.matchAll(new RegExp(`^\\s*[-*] \\*\\*(${letter}\\d+)\\b([^\\n]*)`, 'gm'))].map((m) => [m[1], m[2]]));
  const t = entries('T');
  const phone = [...t.values()].filter((rest) => /\[phone\]/.test(rest)).length;
  return { openT: t.size - phone, phoneT: phone, openG: entries('G').size };
}

/**
 * The reading, in the order the skill gives it: a base that is not holding comes before a product
 * that is not growing, since nothing new goes on a rough base.
 */
function reading({ slices, rough, openT }, limits = LIMITS) {
  if (rough > limits.rough || openT > limits.inbox) {
    const why = [];
    if (rough > limits.rough) why.push(`${words(rough)} areas are rough`);
    if (openT > limits.inbox) why.push(`${words(openT)} inbox entries wait for the owner`);
    return { reading: 'outgrowing its base', propose: false, why: why.join('; ') };
  }
  if (slices === 0) return { reading: 'settling', propose: true, why: 'no slice grew in the window' };
  return { reading: 'in step', propose: false, why: 'slices are growing and the base holds' };
}

function words(n) {
  return ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] ?? 'many';
}

/**
 * The area to sweep next: the one with the most commits not the loop's own since its sweep (ties by
 * name); with none changed, one the ledger left rough, then one left settling. Null when all are at rest.
 */
function nextArea(counts, areas = {}) {
  const ranked = Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked.length) return ranked[0][0];
  for (const state of ['rough', 'settling']) {
    const left = Object.keys(areas).filter((a) => areas[a].state === state).sort();
    if (left.length) return left[0];
  }
  return null;
}

/** The loop's own commits: a `tend …` commit, or the revert of one. They never make an area rough. */
const isLoops = (subject) => /^tend /.test(subject) || /^Revert "tend /.test(subject);

/** A shallow clone's boundary commits list every file as changed: they are left out of every read. */
const dropBoundary = (commits, boundary) => commits.filter((c) => !boundary.has(c.sha));

// What a loop commit may never touch: the identity, its exceptions, the baselines, the gates and the
// procedures themselves, the sources it cites, the specs (the owner's doc wins), the schema and the
// dependencies (architectural calls). A journey is the one script it may change.
const FORBIDDEN = [
  /^docs\/VISION\.md$/,
  /^docs\/research\//,
  /^\.claude\/rules\/ui-patterns\.md$/,
  /\.baseline\.json$/,
  /^eslint-suppressions\.json$/,
  /^scripts\/(?!e2e\/journeys\/)/,
  /^\.claude\/(hooks|agents)\//,
  /^\.claude\/settings/,
  /^\.claude\/skills\/(?!tend\/(ledger\.json|runs\.jsonl)$)/,
  /^\.github\//,
  /^specs\//,
  /^(AGENTS|CLAUDE)\.md$/,
  /^package(-lock)?\.json$/,
  /^app\.(json|config\.js)$/,
  /^(eslint\.config|tsconfig)\./,
  /^src\/lib\/db\/migrations\.ts$/,
];
// The run's record and the notes: no test asked of these.
const RECORD = [/^docs\//, /^\.claude\/rules\//, /^\.claude\/skills\/tend\/(ledger\.json|runs\.jsonl)$/, /^README\.md$/];
const TEST_FILE = /(^src\/lib\/__tests__\/.+\.test\.tsx?$|^scripts\/e2e\/journeys\/.+\.js$)/;
const UNREAL_TEST = /(\{\s*todo\b|\btodo:|\.todo\(|\.skip\(|\bskip:|\bx(test|it)\()/;

/** The name a loop commit's test must carry: "tend memories 3", "tend memories T12", "tend memories audit 2". */
function testName(subject) {
  const m = /^(tend \S+ (?:audit \d+|T\d+|\d+))\b/.exec(subject);
  return m ? m[1] : null;
}

/**
 * What a commit in a loop's range lacks. `files` are `{ status, path, from? }` (git's A, M, D, R;
 * `from` is a rename's old path); `added` is the text of the lines the commit adds to its test files.
 */
function tendCommitProblems({ subject, body, files, added = '', rewritesLog = false, rewritesRules = [] }) {
  const problems = [];
  if (!/^tend /.test(subject)) return ['not a loop commit: the loop ships only `tend <area> …` commits'];
  if (rewritesLog) problems.push('rewrites the run log: a run adds its line and changes no other');
  for (const f of rewritesRules) problems.push(`changes or removes a line of ${f}: the loop may add a trap to a rule file, never reword a rule (the owner's, through the inbox)`);
  for (const f of files) {
    if (RULE_FILE.test(f.path) && citesRule(body, f.path)) problems.push(`cites ${f.path} as its source and edits it in the same commit`);
  }
  for (const f of files) {
    for (const p of [f.path, f.from].filter(Boolean)) if (FORBIDDEN.some((re) => re.test(p))) problems.push(`touches ${p}, which the loop never edits`);
    if (/^docs\//.test(f.from ?? f.path) && (f.status === 'D' || f.status === 'R')) problems.push(`removes ${f.from ?? f.path}: the loop deletes no document`);
    if (/^docs\/decisions\/\d/.test(f.path) && f.status === 'M') problems.push(`edits ${f.path}: an accepted decision is superseded, never edited`);
    if (TEST_FILE.test(f.from ?? f.path) && (f.status === 'D' || (f.status === 'R' && !TEST_FILE.test(f.path)))) problems.push('deletes a test');
  }
  const isTest = (f) => TEST_FILE.test(f.path);
  const code = files.filter((f) => !RECORD.some((re) => re.test(f.path)) && !isTest(f));
  if (!code.length && !files.some(isTest)) return problems;
  const name = testName(subject);
  if (!name) problems.push('its subject does not name the finding: `tend <area> <N>`, `tend <area> T<n>` or `tend <area> audit <N>`');
  if (!files.some((f) => isTest(f) && (f.status === 'A' || f.status === 'M' || f.status === 'R'))) problems.push('no test or journey added or changed beside the change');
  else if (name && !added.includes(name)) problems.push(`no added test line names "${name}"`);
  if (UNREAL_TEST.test(added)) problems.push('its test is a todo or a skip');
  const audit = /^tend \S+ audit \d/.test(subject);
  if (code.length && !audit && !/^\s*Source:\s*\S/m.test(body)) problems.push('no "Source:" line naming the rule it conforms to');
  return problems;
}

const RULE_FILE = /^\.claude\/rules\/[^/]+\.md$/;
const ruleName = (p) => p.replace(/^\.claude\/rules\//, '');
/** Whether a commit's Source line names a rule file, by its path or its bare name ("tabs-and-home.md"). */
function citesRule(body, rulePath) {
  const source = (body.match(/^\s*Source:.*(?:\n(?!\s*\w+:).*)*/m) ?? [''])[0];
  return source.includes(rulePath) || new RegExp(`(^|[^\\w/-])${ruleName(rulePath).replace('.', '\\.')}`).test(source);
}

/**
 * Across one push: a loop commit may not rest on a rule file that a loop commit of the same push
 * touched, so a rule cannot be written in one commit and cited as the source in the next.
 */
function citedOwnEdits(commits) {
  const loops = commits.filter((c) => /^tend /.test(c.subject));
  const touched = new Set(loops.flatMap((c) => c.files.map((f) => f.path).filter((p) => RULE_FILE.test(p))));
  const problems = [];
  for (const c of loops) for (const rule of touched) if (citesRule(c.body, rule)) problems.push({ subject: c.subject, problem: `cites ${rule}, which this run's commits edit: a rule the loop wrote is not a source` });
  return problems;
}

const MODES = ['sweep', 'triage', 'evolve', 'inbox'];
const DEPLOYS = ['main', 'branch', 'none'];
const ANSWERS = ['yes', 'no', 'reshape'];
const count = (v) => Number.isInteger(v) && v >= 0;

/** What is wrong with the half of a run's line only the run knows. A backfilled line may leave `found` out. */
function logProblems(given) {
  const p = [];
  const g = given ?? {};
  if (!MODES.includes(g.mode)) p.push(`mode is one of ${MODES.join(', ')}`);
  if (g.mode === 'sweep' && (typeof g.area !== 'string' || !g.area)) p.push('a sweep names its area');
  if (!DEPLOYS.includes(g.deploy)) p.push(`deploy is one of ${DEPLOYS.join(', ')}`);
  if (typeof g.base !== 'string' || !/^[0-9a-f]{7,40}$/.test(g.base)) p.push('base is the commit the worktree was opened from');
  if (g.mode === 'sweep' && !g.backfilled) {
    const f = g.found ?? {};
    const l = f.loop ?? {};
    if (![l.high, l.medium, l.low, f.owner, f.arch, f.phone, f.out].every(count)) p.push('found counts what the sweep found: loop { high, medium, low }, owner, arch, phone, out');
    if (typeof g.lenses?.whole !== 'boolean' || !Array.isArray(g.lenses?.skipped)) p.push('lenses says whether the sweep was whole and which lenses were skipped');
    if (g.lenses?.whole === true && g.lenses.skipped?.length) p.push('a whole sweep skipped no lens');
  }
  for (const e of [...(g.filed?.T ?? []), ...(g.filed?.G ?? [])]) if (!/^[TG]\d+$/.test(e)) p.push(`filed entry "${e}" is a T or G number`);
  for (const a of g.answers ?? []) if (!/^[TG]\d+$/.test(a?.entry ?? '') || !ANSWERS.includes(a?.answer)) p.push(`an answer is { entry: "T3", answer: ${ANSWERS.join(' | ')} }`);
  if (g.review && ![g.review.accepted, g.review.rejected, g.review.deferred].every(count)) p.push('review counts the auditor\'s findings: accepted, rejected, deferred');
  if (g.state && ![g.state.from, g.state.to].every((x) => x === null || STATES.includes(x))) p.push(`state moves between ${STATES.join(', ')}`);
  return p;
}

/**
 * One run's line: what its commits say (which findings shipped, which were the review's, which were
 * builds of an answered entry, which were reverted) with what only the run knows. Facts, never a
 * verdict on the run: reading them is `/tend reflect`'s job and the owner's (decision 0139).
 */
function runLine({ date, subjects, given }) {
  const ids = (re) => subjects.map((s) => re.exec(s)?.[1]).filter(Boolean);
  return {
    date,
    ...given,
    shipped: ids(/^tend \S+ (\d+)\b/).map(Number).sort((a, b) => a - b),
    auditFixes: ids(/^tend \S+ audit (\d+)\b/).map(Number).sort((a, b) => a - b),
    built: ids(/^tend \S+ (T\d+)\b/),
    reverted: subjects.filter((s) => /^Revert "tend /.test(s)).map((s) => testName(s.replace(/^Revert "/, '')) ?? s),
  };
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function readLedger() {
  return JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
}

/** Commits of a range or window, newest first, each with its subject and the files it touched. */
function log(...range) {
  const out = git('log', '--no-merges', '--name-only', '--format=%x00%H%x01%s', ...range);
  const commits = out.split('\0').filter(Boolean).map((chunk) => {
    const [head, ...files] = chunk.split('\n');
    const [sha, subject] = head.split('\x01');
    return { sha, subject, files: files.filter(Boolean) };
  });
  return dropBoundary(commits, shallowBoundary());
}

let boundary;
function shallowBoundary() {
  if (boundary) return boundary;
  boundary = new Set();
  try {
    const file = path.resolve(ROOT, git('rev-parse', '--git-path', 'shallow').trim());
    if (fs.existsSync(file)) for (const sha of fs.readFileSync(file, 'utf8').split('\n')) if (sha) boundary.add(sha);
  } catch {
    // not a git checkout the script can read: nothing to leave out
  }
  return boundary;
}

function knownPrefixes() {
  const { readSpecs, idsOf } = require('./check-specs');
  return new Set(readSpecs().flatMap((s) => idsOf(s.text).prefixes));
}

/** Per area, how many commits not the loop's own touched its source since `since(area)`. */
function changesByArea(since) {
  const { FEATURES, featuresOf } = require('./features');
  const counts = {};
  for (const f of FEATURES) {
    if (f.name === 'arch') continue;
    const from = since(f.name);
    const commits = from ? log(`${from}..origin/main`) : log(`--since=${LIMITS.days} days ago`, 'origin/main');
    counts[f.name] = commits.filter((c) => !isLoops(c.subject) && c.files.some((p) => isAppSource(p) && featuresOf(p).some((x) => x.name === f.name))).length;
  }
  return counts;
}

function sweptAt(ledger) {
  return (name) => {
    const sha = ledger.areas?.[name]?.main;
    if (!sha) return null;
    try {
      git('cat-file', '-e', `${sha}^{commit}`);
      return sha;
    } catch {
      return null;
    }
  };
}

function balance(argv) {
  const at = argv.indexOf('--days');
  const days = at >= 0 ? Number(argv[at + 1]) : LIMITS.days;
  const known = knownPrefixes();
  const t = tally(log(`--since=${days} days ago`, 'origin/main'), known);
  const ledger = readLedger();
  const counts = changesByArea(sweptAt(ledger));
  const changed = Object.fromEntries(Object.keys(ledger.areas ?? {}).map((a) => [a, counts[a] > 0]));
  const by = areasByState(ledger.areas, changed);
  const status = readStatus(fs.readFileSync(path.join(ROOT, 'docs', 'STATUS.md'), 'utf8'));
  const r = reading({ slices: t.slices.length, rough: by.rough.length, ...status });
  const out = {
    date: new Date().toISOString().slice(0, 10),
    days,
    slicesGrown: t.slices,
    commits: { growth: t.growth, refinement: t.refinement, other: t.other },
    areas: by,
    neverSwept: Object.keys(counts).filter((a) => !ledger.areas?.[a]).sort(),
    open: status,
    ...r,
  };
  console.log(JSON.stringify(out, null, 2));
  if (argv.includes('--write')) {
    ledger.balance = out;
    fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
  }
}

/** The ledger as origin/main holds it: `next` runs before the run's worktree exists. */
function mainLedger() {
  try {
    return JSON.parse(execFileSync('git', ['show', 'origin/main:.claude/skills/tend/ledger.json'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return readLedger();
  }
}

function appendLog(argv) {
  const [range, json] = argv;
  let given;
  try {
    given = JSON.parse(json ?? '');
  } catch {
    console.error("usage: node scripts/tend.js log <range> '<json>'; the json is the run's own half (see .claude/skills/tend/SKILL.md, section 10)");
    process.exit(2);
  }
  const problems = logProblems(given);
  if (problems.length) {
    console.error(`tend log: ${problems.join('; ')}`);
    process.exit(1);
  }
  const subjects = range ? git('log', '--no-merges', '--reverse', '--format=%s', range).split('\n').filter(Boolean) : [];
  const line = runLine({ date: new Date().toISOString().slice(0, 10), subjects, given });
  fs.appendFileSync(RUNS, JSON.stringify(line) + '\n');
  console.log(JSON.stringify(line));
}

function next() {
  const ledger = mainLedger();
  const area = nextArea(changesByArea(sweptAt(ledger)), ledger.areas);
  console.log(area ?? 'none: every area is at rest; run /tend evolve');
}

function commits(argv) {
  const range = argv.find((a) => !a.startsWith('--'));
  // CI reads a push that may hold anyone's commits: with --loop-only the others are left alone.
  const loopOnly = argv.includes('--loop-only');
  if (!range) {
    console.error('usage: node scripts/tend.js commits [--loop-only] <range>, e.g. origin/main..HEAD');
    process.exit(2);
  }
  const all = git('rev-list', '--no-merges', range).split('\n').filter(Boolean);
  const shas = loopOnly ? all.filter((sha) => /^tend /.test(git('show', '-s', '--format=%s', sha))) : all;
  let bad = 0;
  const read = [];
  for (const sha of shas) {
    const [subject, ...rest] = git('show', '-s', '--format=%s%n%b', sha).split('\n');
    const files = git('show', '--name-status', '--format=', sha).split('\n').filter(Boolean).map((l) => {
      const cols = l.split('\t');
      return { status: cols[0][0], path: cols[cols.length - 1], from: cols.length > 2 ? cols[1] : undefined };
    });
    const tests = files.filter((f) => TEST_FILE.test(f.path) && f.status !== 'D').map((f) => f.path);
    const added = tests.length
      ? git('show', '--format=', '-U0', sha, '--', ...tests).split('\n').filter((l) => /^\+(?!\+\+)/.test(l)).join('\n')
      : '';
    const removes = (file) => git('show', '--format=', '-U0', sha, '--', file).split('\n').some((l) => /^-(?!--)/.test(l));
    const rewritesLog = files.some((f) => f.path === RUNS_REL) && removes(RUNS_REL);
    const rewritesRules = files.filter((f) => RULE_FILE.test(f.path) && f.status === 'M' && removes(f.path)).map((f) => f.path);
    read.push({ subject, body: rest.join('\n'), files });
    for (const p of tendCommitProblems({ subject, body: rest.join('\n'), files, added, rewritesLog, rewritesRules })) {
      bad += 1;
      console.error(`${sha.slice(0, 7)} ${subject}\n  ${p}`);
    }
  }
  for (const { subject, problem } of citedOwnEdits(read)) {
    bad += 1;
    console.error(`${subject}\n  ${problem}`);
  }
  if (bad) process.exit(1);
  console.log(`check:tend: ${shas.length} commits read, clean.`);
}

if (require.main === module) {
  const [cmd, ...argv] = process.argv.slice(2);
  if (cmd === 'balance') balance(argv);
  else if (cmd === 'next') next();
  else if (cmd === 'log') appendLog(argv);
  else if (cmd === 'commits') commits(argv);
  else {
    console.error('usage: node scripts/tend.js balance [--days N] [--write] | next | log <range> '<json>' | commits [--loop-only] <range>');
    process.exit(2);
  }
}

module.exports = { LIMITS, STATES, classify, criteriaPrefixes, tally, areasByState, readStatus, reading, nextArea, isLoops, dropBoundary, testName, tendCommitProblems, citedOwnEdits, logProblems, runLine };
