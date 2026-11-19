#!/usr/bin/env node
// The tending loop's mechanical reads (decisions 0128-0130; .claude/skills/tend/SKILL.md):
//
//   node scripts/tend.js balance [--days N] [--write]   which slices grew on origin/main against the
//                                                       refinement beside them, the areas by state (an
//                                                       area a change gave a screen or a control since
//                                                       its sweep is rough, decision 0229), the
//                                                       open entries, and a reading (shallow-clone
//                                                       boundary commits are left out); the ledger and
//                                                       the inbox as origin/main holds them, not the
//                                                       branch's unpushed record
//   node scripts/tend.js log <range> '<json>'          append this run's line to the run log: what the
//                                                       range holds (every finding a subject names:
//                                                       shipped, audit fixes, builds, reverts) with
//                                                       what only the run knows (found, filed, answers,
//                                                       expectations and compass: decision 0234)
//   node scripts/tend.js next                           the area to sweep when the owner names none
//   node scripts/tend.js compass [--runs N]             the compass (decision 0234), from the run log: per run and in
//                                                       sum, refinement shipped against filed low, lens-0 G entries,
//                                                       lines met, failed, lacking and provisional; whether it bites
//   node scripts/tend.js e2e-due [--days N] [--json]    whether the weekly full pass is due: no line of main's run
//                                                       log says "e2e":"full" in seven days (decision 0181)
//   node scripts/tend.js commits <range>                a sweep's commits: each is a loop commit with a
//                                                       real test and its source, and none touches what
//                                                       the loop may not (exit 1 otherwise); CI runs
//                                                       it with --loop-only on every push to main: these
//                                                       limits on loop commits, and the record gate
//                                                       (scripts/records.js) on loop and agent commits
//   node scripts/tend.js next-decision | next-audit | files | landed | review-paths | items
//                                                       the bookkeeping commands (decision 0174), run
//                                                       by scripts/bookkeeping.js, whose header says each
//
// The decisions are pure and exported for arch/tend.test.ts; git and the files are read in main().
// None of this is shown in the app: nothing is a score there (decision 0020).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// TEND_ROOT: the checkout to read, when CI runs these scripts as the push's base had them (pages.yml).
const ROOT = process.env.TEND_ROOT ? path.resolve(process.env.TEND_ROOT) : path.join(__dirname, '..');
const LEDGER = path.join(ROOT, '.claude', 'skills', 'tend', 'ledger.json');
const RUNS = path.join(ROOT, '.claude', 'skills', 'tend', 'runs.jsonl');
const RUNS_REL = '.claude/skills/tend/runs.jsonl';
const LEDGER_REL = '.claude/skills/tend/ledger.json';
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
 * Areas by state. An area a change reset since its sweep (`resetsArea`, decision 0229) is rough
 * whatever the ledger says: `changed` maps an area to true when that happened.
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
 * The area to sweep next: the one with the most commits that reset it since its sweep (decision 0229;
 * ties by name); with none reset, one the ledger left rough, then one left settling. Null when all are at rest.
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

// Decision 0229: what makes an area rough again. A control is each of these a line holds; a screen is a
// route file under src/app/ that is neither a navigator (_layout) nor one of the router's own (+html).
const CONTROL = /onPress=|<Pressable|<Switch|<TextInput|accessibilityRole="button"/g;
const controlsIn = (text) => (String(text ?? '').match(CONTROL) ?? []).length;
const isRoute = (p) => /^src\/app\/(?:[^/]+\/)*[^_+/][^/]*\.[jt]sx?$/.test(p);

/**
 * Whether a commit resets an area (decision 0229): not the loop's own, and it adds a route file the area
 * owns, or the controls its added lines hold outnumber those its removed lines held, across the .tsx
 * files the area owns. A control edited or moved within the area is none added. `files` are
 * `{ status, path, from?, plus?, minus? }`: plus and minus the text of the lines added and removed.
 */
function resetsArea(commit, owns) {
  if (isLoops(commit.subject)) return false;
  const mine = commit.files.filter((f) => owns(f.path));
  if (mine.some((f) => f.status === 'A' && isRoute(f.path))) return true;
  const tsx = mine.filter((f) => /\.tsx$/.test(f.path));
  return tsx.reduce((n, f) => n + controlsIn(f.plus) - controlsIn(f.minus), 0) > 0;
}

/**
 * Commits from `git log --raw -p -U0 --format=%x00%H%x01%s`: each file's status from its raw line (a
 * rename's old path as `from`), and the text of the lines its hunks add and remove.
 */
function readPatches(out) {
  return out.split('\0').filter(Boolean).map((chunk) => {
    const [head, ...lines] = chunk.split('\n');
    const [sha, subject] = head.split('\x01');
    const files = [];
    const byPath = new Map();
    let current = null;
    let from = null;
    let inHunk = false;
    for (const l of lines) {
      if (l.startsWith(':') && !inHunk && current === null) {
        const cols = l.split('\t');
        const f = { status: cols[0].split(' ').pop()[0], path: cols[cols.length - 1], ...(cols.length > 2 ? { from: cols[1] } : {}), plus: [], minus: [] };
        files.push(f);
        byPath.set(f.path, f);
      } else if (l.startsWith('diff --git ')) {
        current = undefined;
        inHunk = false;
      } else if (!inHunk && l.startsWith('--- ')) from = l.slice(6);
      else if (!inHunk && l.startsWith('+++ ')) current = byPath.get(l === '+++ /dev/null' ? from : l.slice(6));
      else if (l.startsWith('@@')) inHunk = true;
      else if (inHunk && current && l[0] === '+') current.plus.push(l.slice(1));
      else if (inHunk && current && l[0] === '-') current.minus.push(l.slice(1));
    }
    return { sha, subject, files: files.map((f) => ({ ...f, plus: f.plus.join('\n'), minus: f.minus.join('\n') })) };
  });
}

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
  // The record documents' gate (decision 0156): the loop changes them only through scripts/records.js,
  // and never the script or the tests that hold it (the line above covers the script; it is named here
  // so that loosening that line does not free the gate).
  /^scripts\/records\.js$/,
  /^src\/lib\/__tests__\/arch\/(records|tend|expectations)\.test\.ts$/,
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
const RECORD = [/^docs\//, /^\.claude\/rules\//, /^\.claude\/skills\/tend\/(ledger\.json|runs\.jsonl)$/, /^\.claude\/records\/[^/]+\.json$/, /^README\.md$/];
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
function tendCommitProblems({ subject, body, files, added = '', rewritesLog = false, rewritesRules = [], expectationEdits = [] }) {
  const problems = [];
  if (!/^tend /.test(subject)) return ['not a loop commit: the loop ships only `tend <area> …` commits'];
  if (rewritesLog) problems.push('rewrites the run log: a run adds its line and changes no other');
  // The expectation store (decision 0234): what scripts/expectations.js editProblems found in the commit's store files.
  problems.push(...expectationEdits);
  for (const f of rewritesRules) problems.push(`changes or removes a line of ${f} that the push's base holds: the loop may add a trap to a rule file, and reword a line its own push added, never reword a rule (the owner's, through the inbox)`);
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
const STORE_FILE = /^docs\/expectations\/(?!README\.md$)([^/]+)\.md$/;

/**
 * Whether lines a commit removes from a rule file include one the push's base holds: those stay
 * add-only. A line absent from the base was added by an earlier commit of the same push, and a later
 * commit may reword or drop it (a review fix to the run's own trap line).
 */
function rewritesBaseLines(removed, base) {
  const lines = new Set(String(base).split('\n'));
  return removed.some((l) => lines.has(l));
}
const ruleName = (p) => p.replace(/^\.claude\/rules\//, '');
/** Whether a commit's Source line names a rule file, by its path or its bare name ("tabs-and-home.md"). */
function citesRule(body, rulePath) {
  const source = (body.match(/^\s*Source:.*(?:\n(?!\s*\w+:).*)*/m) ?? [''])[0];
  return source.includes(rulePath) || new RegExp(`(^|[^\\w/-])${ruleName(rulePath).replace('.', '\\.')}`).test(source);
}

/**
 * Across one push, `commits` in commit order (oldest first): a loop commit may not rest on a rule file
 * that a loop commit at or before it in the push touched, so a rule cannot be written in one commit and
 * cited as the source in the next. A line a later commit adds (the run's trap, in its record) is not
 * what an earlier commit rested on.
 */
function citedOwnEdits(commits) {
  const touched = new Set();
  const problems = [];
  for (const c of commits.filter((x) => /^tend /.test(x.subject))) {
    for (const p of c.files.map((f) => f.path)) if (RULE_FILE.test(p)) touched.add(p);
    for (const rule of touched) if (citesRule(c.body, rule)) problems.push({ subject: c.subject, problem: `cites ${rule}, which this run's commits edit at or before it: a rule the loop wrote is not a source` });
  }
  return problems;
}

// `e2e` is the weekly full pass made on its own (decision 0181): every journey once, `npm run e2e:all`.
const MODES = ['sweep', 'triage', 'evolve', 'inbox', 'e2e'];
const DEPLOYS = ['main', 'branch', 'none'];
const ANSWERS = ['yes', 'no', 'reshape'];
const count = (v) => Number.isInteger(v) && v >= 0;
// The expectation lens (decision 0234): a sweep, and an inbox run that builds a yes, logs `expectations` (the
// store's lines it tested, by id, each met, failed or lacking; a proposed line provisional; met naming its evidence;
// the drafted lines the steward dropped, with the Never row each breaks) and `compass` (refinement shipped, filed
// low by the compass for serving no expectation or rule, the G entries lens 0 filed). Only a line this script wrote
// carries the marker LENS, and only such a line is held to them: an older script's line reads as it was, whatever
// its date. tend:log also reads the lines against the store (scripts/expectations.js, logRefProblems).
const LENS = '0234';
const VERDICTS = ['met', 'failed', 'lacking'];
const LENS_LINE = /^A person\b.*\bwould reasonably expect\b/;
const EXPECTATION_ID = /^E-[a-z][a-z0-9-]*-\d+$/;
const EVIDENCE = /^(?:test:".+"|picture:\S+|[a-z][a-z0-9-]*:".+")$/;

function expectationProblems(e) {
  if (typeof e !== 'object' || e === null || Array.isArray(e)) return ['expectations is { lines: [{ id, is, evidence?, provisional? }], dropped: [{ line, never }] }'];
  const p = [];
  if (!Array.isArray(e.lines) || !e.lines.length) p.push('expectations.lines names each store line the run tested, by id (E-<feature>-<n>)');
  for (const l of Array.isArray(e.lines) ? e.lines : []) {
    if (!EXPECTATION_ID.test(l?.id ?? '')) p.push(`"${l?.id}" is no line's id: E-<feature>-<n> (npm run expectations -- list)`);
    if (!VERDICTS.includes(l?.is)) p.push(`${l?.id}: is is ${VERDICTS.join(', ')}`);
    if (l?.provisional !== undefined && typeof l.provisional !== 'boolean') p.push(`${l?.id}: provisional is true or left out`);
    if (l?.is === 'met' && !EVIDENCE.test(l?.evidence ?? '')) p.push(`${l?.id} is met: its evidence is its check (<journey>:"…", test:"…") or picture:<path or shot>`);
  }
  if (e.dropped !== undefined && !Array.isArray(e.dropped)) p.push('expectations.dropped is a list');
  for (const d of Array.isArray(e.dropped) ? e.dropped : []) {
    if (typeof d?.line !== 'string' || !LENS_LINE.test(d.line)) p.push('a dropped line reads "A person … would reasonably expect …"');
    if (typeof d?.never !== 'string' || !d.never.trim()) p.push('a dropped line names the Never line it breaks');
  }
  return p;
}

function compassProblems(c, filedG) {
  if (typeof c !== 'object' || c === null) return ['compass is { shipped, filedLow, lensG }'];
  const p = [];
  if (![c.shipped, c.filedLow].every(count)) p.push('compass counts the refinement shipped and the refinement the compass filed low (filedLow), zeros included');
  if (!Array.isArray(c.lensG) || !c.lensG.every((g) => filedG.includes(g))) p.push('compass.lensG lists the G entries lens 0 filed, each one of filed.G');
  return p;
}

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
  const builds = g.mode === 'inbox' && (g.answers ?? []).some((a) => a?.answer === 'yes');
  const held = g.lens === LENS && (g.mode === 'sweep' || builds);
  if (g.expectations !== undefined) p.push(...expectationProblems(g.expectations));
  else if (held) p.push('a sweep or a build logs its expectations (decision 0234)');
  if (g.compass !== undefined) p.push(...compassProblems(g.compass, g.filed?.G ?? []));
  else if (held) p.push('a sweep or a build logs the compass\'s counts (decision 0234)');
  for (const e of [...(g.filed?.T ?? []), ...(g.filed?.G ?? [])]) if (!/^[TG]\d+$/.test(e)) p.push(`filed entry "${e}" is a T or G number`);
  for (const a of g.answers ?? []) if (!/^[TG]\d+$/.test(a?.entry ?? '') || !ANSWERS.includes(a?.answer)) p.push(`an answer is { entry: "T3", answer: ${ANSWERS.join(' | ')} }`);
  if (g.review && ![g.review.accepted, g.review.rejected, g.review.deferred].every(count)) p.push('review counts the auditor\'s findings: accepted, rejected, deferred');
  if (g.state && ![g.state.from, g.state.to].every((x) => x === null || STATES.includes(x))) p.push(`state moves between ${STATES.join(', ')}`);
  const names = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string' && /^[a-z][a-z0-9-]*$/.test(x));
  if (g.e2e !== undefined && g.e2e !== 'full' && !names(g.e2e)) p.push('e2e is the journeys run, or "full" for every journey');
  if (g.mode === 'e2e') {
    const checks = (v) => Array.isArray(v) && v.every((c) => names([c?.journey]) && typeof c?.check === 'string' && c.check.trim() !== '');
    if (g.e2e === undefined || (Array.isArray(g.e2e) && !g.e2e.length)) p.push('an e2e pass says what it ran: e2e is "full" or the journeys');
    if (!count(g.journeys) || !g.journeys || (Array.isArray(g.e2e) && g.e2e.length !== g.journeys)) p.push('journeys counts the journeys the pass ran');
    if (!count(g.ok)) p.push('ok counts the checks that passed in the pass');
    if (!checks(g.red) || !checks(g.flaky)) p.push('red and flaky list each check as { journey, check }, none as []');
    if (!count(g.minutes)) p.push('minutes is how long the pass took');
  }
  return p;
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Whether the weekly full pass is due (decision 0181): no run-log line of any mode says `"e2e":"full"` within `days`
 * of `today` (YYYY-MM-DD). `lines` are the log's lines as text; one that does not parse is skipped.
 */
function fullPassDue(lines, today, days = 7) {
  let last = null;
  for (const l of lines) {
    let run;
    try {
      run = JSON.parse(l);
    } catch {
      continue;
    }
    if (run?.e2e === 'full' && typeof run.date === 'string' && (!last || run.date >= last.date)) last = { date: run.date, base: run.base ?? null };
  }
  if (!last) return { due: true, last: null, dueFrom: null };
  const dueFrom = new Date(Date.parse(`${last.date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
  return { due: today >= dueFrom, last, dueFrom };
}

const COMPASS_WINDOW = 12;
// A half's shipped share must move by more than this to read as falling or rising.
const COMPASS_STEP = 0.05;

/**
 * The compass (decision 0234), read from the run log: per run that carries `compass` and in sum, the refinement
 * shipped against the refinement the compass filed low, the G entries lens 0 filed, and the store lines met, failed
 * and lacking (ratified) or provisional. Over the last `window` such runs, the shipped share of refinement in the
 * later half against the earlier: falling, or nothing shipped in the later half, is "the compass is biting"; after
 * `window` runs, anything else is "not biting: tighten it". No checkpoint: it is read at every landing.
 */
function compassReading(runs, window = COMPASS_WINDOW) {
  const rows = runs
    .filter((r) => r && typeof r.compass === 'object' && r.compass !== null)
    .map((r) => {
      const lines = Array.isArray(r.expectations?.lines) ? r.expectations.lines : [];
      const ratified = (is) => lines.filter((l) => !l.provisional && l.is === is).length;
      return {
        date: r.date ?? null,
        mode: r.mode,
        area: r.area ?? null,
        shipped: r.compass.shipped ?? 0,
        filedLow: r.compass.filedLow ?? 0,
        lensG: (r.compass.lensG ?? []).length,
        met: ratified('met'),
        failed: ratified('failed'),
        lacking: ratified('lacking'),
        provisional: lines.filter((l) => l.provisional).length,
      };
    });
  const add = (xs) => {
    const s = { runs: xs.length, shipped: 0, filedLow: 0, lensG: 0, met: 0, failed: 0, lacking: 0, provisional: 0 };
    for (const x of xs) for (const k of Object.keys(s)) if (k !== 'runs') s[k] += x[k];
    return s;
  };
  const last = rows.slice(-window);
  const half = Math.floor(last.length / 2);
  const share = (xs) => {
    const s = add(xs);
    return s.shipped + s.filedLow ? Math.round((s.shipped / (s.shipped + s.filedLow)) * 100) / 100 : null;
  };
  const shares = { first: last.length >= 2 ? share(last.slice(0, half)) : null, second: last.length >= 2 ? share(last.slice(half)) : null };
  const a = shares.first ?? 0;
  const b = shares.second ?? 0;
  const trend = last.length < 2 ? 'none' : b < a - COMPASS_STEP ? 'falling' : b > a + COMPASS_STEP ? 'rising' : 'flat';
  const quiet = last.length >= 2 && add(last.slice(half)).shipped === 0;
  const verdict =
    last.length >= 2 && (trend === 'falling' || quiet)
      ? 'the compass is biting'
      : last.length >= window
        ? 'the compass is not biting: tighten it'
        : `too early to say: ${last.length} of ${window} runs carry the compass`;
  const date = rows.length ? rows[rows.length - 1].date : null;
  return { rows, sum: add(rows), shares, trend, verdict, ledger: { date, runs: last.length, shares, trend, verdict } };
}

function compassText(r) {
  const row = (x) => `shipped ${x.shipped}, filed low ${x.filedLow}, lens-0 G ${x.lensG}; met ${x.met}, failed ${x.failed}, lacking ${x.lacking}, provisional ${x.provisional}`;
  const pct = (v) => (v === null ? 'none' : v.toFixed(2));
  return [
    `compass: ${r.rows.length} runs carry it`,
    ...r.rows.map((x) => `${x.date} ${x.mode}${x.area ? ` ${x.area}` : ''}: ${row(x)}`),
    `in sum: ${row(r.sum)}`,
    `last ${r.ledger.runs}: shipped share ${pct(r.shares.first)} then ${pct(r.shares.second)}, ${r.trend}`,
    r.verdict,
    '',
  ].join('\n');
}

/**
 * One run's line: what its commits say (which findings shipped, which were the review's, which were
 * builds of an answered entry, which were reverted) with what only the run knows. Facts, never a
 * verdict on the run: reading them is `/tend reflect`'s job and the owner's (decision 0139).
 */
function runLine({ date, subjects, given }) {
  const found = subjects.map(findingsOf);
  const all = (key) => found.flatMap((f) => f[key]);
  return {
    ...given,
    date,
    lens: LENS,
    shipped: all('shipped').sort((a, b) => a - b),
    auditFixes: all('audit').sort((a, b) => a - b),
    built: all('built'),
    reverted: subjects.filter((s) => /^Revert "tend /.test(s)).map((s) => testName(s.replace(/^Revert "/, '')) ?? s),
  };
}

const FINDING = String.raw`(?:audit \d+(?:-\d+)?|\d+(?:-\d+)?|T\d+)`;
const FINDINGS = new RegExp(`^tend \\S+ (${FINDING}(?:, ${FINDING})*)(?![\\w-])`);

/**
 * The findings a loop commit's subject names, every one: a clause per finding or a list ("tend tabs
 * 12: …; tend tabs 13: …", "tend map 17, 18: …", "tend explore audit 42, audit 43: …", "tend tabs
 * audit 26-28: …"). A number after "audit" in a list is an audit fix too; a number in the words is none.
 */
function findingsOf(subject) {
  const out = { shipped: [], audit: [], built: [] };
  for (const clause of subject.split(/;\s+(?=tend \S+ )/)) {
    const m = FINDINGS.exec(clause.trim());
    if (!m) continue;
    let audit = false;
    for (const token of m[1].split(', ')) {
      if (/^T\d+$/.test(token)) {
        out.built.push(token);
        continue;
      }
      if (token.startsWith('audit ')) audit = true;
      const [a, b = a] = token.replace(/^audit /, '').split('-').map(Number);
      for (let n = a; n <= b && n - a < 100; n++) (audit ? out.audit : out.shipped).push(n);
    }
  }
  return out;
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

/**
 * Per area, how many commits since `since(area)` reset it (decision 0229): its commits that are not the
 * loop's own and touch its source are read in one batched patch, limited to .tsx files and src/app/.
 */
function changesByArea(since) {
  const { FEATURES, featuresOf } = require('./features');
  const owner = (name) => (p) => isAppSource(p) && featuresOf(p).some((x) => x.name === name);
  const touched = {};
  for (const f of FEATURES) {
    if (f.name === 'arch') continue;
    const from = since(f.name);
    const commits = from ? log(`${from}..origin/main`) : log(`--since=${LIMITS.days} days ago`, 'origin/main');
    touched[f.name] = commits.filter((c) => !isLoops(c.subject) && c.files.some(owner(f.name))).map((c) => c.sha);
  }
  const shas = [...new Set(Object.values(touched).flat())];
  const patches = new Map();
  if (shas.length) {
    const out = execFileSync('git', ['log', '--stdin', '--no-walk=unsorted', '--raw', '-p', '-U0', '--format=%x00%H%x01%s', '--', 'src/*.tsx', 'src/app'], { cwd: ROOT, encoding: 'utf8', input: shas.join('\n') + '\n', maxBuffer: 256 * 1024 * 1024 });
    for (const c of readPatches(out)) patches.set(c.sha, c);
  }
  const counts = {};
  for (const [name, list] of Object.entries(touched)) {
    counts[name] = list.filter((sha) => patches.has(sha) && resetsArea(patches.get(sha), owner(name))).length;
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

/** A file as origin/main holds it (`show`), or this checkout's (`here`) where main's cannot be read. */
function mainOrHere(rel, show, here) {
  const text = show(rel);
  return text === null || text === undefined ? here(rel) : text;
}

const showMain = (rel) => {
  try {
    return execFileSync('git', ['show', `origin/main:${rel}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
};
const readHere = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * The balance reads origin/main alone: its commits, its ledger's areas and its open entries. The
 * run's own unpushed record (an area's new state, the entries it filed) is not main's yet.
 */
function balance(argv) {
  const at = argv.indexOf('--days');
  const days = at >= 0 ? Number(argv[at + 1]) : LIMITS.days;
  const known = knownPrefixes();
  const t = tally(log(`--since=${days} days ago`, 'origin/main'), known);
  const ledger = JSON.parse(mainOrHere(LEDGER_REL, showMain, readHere));
  const counts = changesByArea(sweptAt(ledger));
  const changed = Object.fromEntries(Object.keys(ledger.areas ?? {}).map((a) => [a, counts[a] > 0]));
  const by = areasByState(ledger.areas, changed);
  const status = readStatus(mainOrHere('docs/STATUS.md', showMain, readHere));
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
    // Into this checkout's ledger, beside the run's own record.
    const mine = readLedger();
    mine.balance = out;
    mine.compass = compassReading(readRuns()).ledger;
    fs.writeFileSync(LEDGER, JSON.stringify(mine, null, 2) + '\n');
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
  // The script writes the date and the marker; a run's JSON dates nothing and backfills nothing (decision 0234).
  const owned = ['date', 'backfilled', 'lens'].filter((k) => given && Object.prototype.hasOwnProperty.call(given, k));
  if (owned.length) {
    console.error(`tend log: ${owned.join(', ')} ${owned.length > 1 ? 'are' : 'is'} the script's to write, not the run's: leave ${owned.length > 1 ? 'them' : 'it'} out`);
    process.exit(1);
  }
  const subjects = range ? git('log', '--no-merges', '--reverse', '--format=%s', range).split('\n').filter(Boolean) : [];
  const line = runLine({ date: new Date().toISOString().slice(0, 10), subjects, given });
  // The line as it will be written is what is held (decision 0234): runLine marks it with the lens.
  const problems = logProblems(line);
  if (!problems.length && line.expectations?.lines) {
    const ex = require('./expectations');
    problems.push(...ex.logRefProblems(line.expectations.lines, ex.readStores(ROOT), ex.readIndex(ROOT), { shots: line.shots, area: line.area }));
  }
  if (problems.length) {
    console.error(`tend log: ${problems.join('; ')}`);
    process.exit(1);
  }
  fs.appendFileSync(RUNS, JSON.stringify(line) + '\n');
  console.log(JSON.stringify(line));
}

/** The run log as origin/main holds it, else this checkout's: a pass logged on main counts wherever this runs. */
function mainRuns() {
  try {
    return execFileSync('git', ['show', `origin/main:${RUNS_REL}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return fs.existsSync(RUNS) ? fs.readFileSync(RUNS, 'utf8') : '';
  }
}

/** The run log's lines, as mainRuns reads them; a line that does not parse is skipped. */
function readRuns() {
  return mainRuns()
    .split('\n')
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
}

function e2eDue(argv) {
  const at = argv.indexOf('--days');
  const days = at >= 0 ? Number(argv[at + 1]) : 7;
  const r = fullPassDue(mainRuns().split('\n').filter(Boolean), new Date().toISOString().slice(0, 10), days);
  if (argv.includes('--json')) console.log(JSON.stringify(r));
  else if (!r.last) console.log(`full pass: due (no run-log line says "e2e":"full"); run npm run e2e:all`);
  else if (r.due) console.log(`full pass: due (the last on ${r.last.date}, ${r.last.base}; due from ${r.dueFrom}); run npm run e2e:all`);
  else console.log(`full pass: not due (the last on ${r.last.date}, ${r.last.base}; due from ${r.dueFrom})`);
}

function next() {
  const ledger = mainLedger();
  const area = nextArea(changesByArea(sweptAt(ledger)), ledger.areas);
  console.log(area ?? 'none: every area is at rest; run /tend evolve');
}

function commits(argv) {
  const range = argv.find((a) => !a.startsWith('--'));
  // CI reads a push that may hold anyone's commits: with --loop-only the loop's limits read loop commits
  // alone, and the record gate loop and agent commits; the owner's own are left alone.
  const loopOnly = argv.includes('--loop-only');
  if (!range) {
    console.error('usage: node scripts/tend.js commits [--loop-only] <range>, e.g. origin/main..HEAD');
    process.exit(2);
  }
  // Oldest first: citedOwnEdits reads the push in commit order.
  const all = git('rev-list', '--reverse', '--no-merges', range).split('\n').filter(Boolean);
  const shas = loopOnly ? all.filter((sha) => /^tend /.test(git('show', '-s', '--format=%s', sha))) : all;
  // The push's base: a rule line it holds is add-only; one an earlier commit of the push added is not.
  const ends = range.split('..');
  const baseRev = ends.length === 2 && ends[0] ? git('merge-base', ends[0], ends[1] || 'HEAD').trim() : all.length ? `${all[0]}^` : 'HEAD';
  const atBase = (file) => {
    try {
      return execFileSync('git', ['show', `${baseRev}:${file}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    } catch {
      return '';
    }
  };
  let bad = 0;
  const read = [];
  const storesRead = new Set();
  const at = (rev, file) => {
    try {
      return execFileSync('git', ['show', `${rev}:${file}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    } catch {
      return '';
    }
  };
  // What a commit did to the expectation store files it changed (scripts/expectations.js, editProblems).
  const storeEdits = (sha, subject) => {
    const changed = git('show', '--name-only', '--format=', sha).split('\n').filter((p) => STORE_FILE.test(p));
    return changed.flatMap((p) => require('./expectations').editProblems(at(`${sha}^`, p), at(sha, p), STORE_FILE.exec(p)[1], subject));
  };
  // The record documents (decision 0156): each commit that touches them is its declared operations,
  // replayed on its parent's; a merge that touches them fails in a push that holds loop commits.
  const records = require('./records').gateRange(range, { cwd: ROOT, loopOnly });
  for (const r of records.results) for (const n of r.notices) console.log(`check:tend: ${r.sha.slice(0, 7)} ${r.subject}: ${n}`);
  const recordIssues = new Map(records.results.map((r) => [r.sha, r.problems]));
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
    const removed = (file) => git('show', '--format=', '-U0', sha, '--', file).split('\n').filter((l) => /^-(?!--)/.test(l)).map((l) => l.slice(1));
    const rewritesLog = files.some((f) => f.path === RUNS_REL) && removed(RUNS_REL).length > 0;
    const rewritesRules = files.filter((f) => RULE_FILE.test(f.path) && f.status === 'M' && rewritesBaseLines(removed(f.path), atBase(f.path))).map((f) => f.path);
    const expectationEdits = storeEdits(sha, subject);
    storesRead.add(sha);
    read.push({ subject, body: rest.join('\n'), files });
    const problems = tendCommitProblems({ subject, body: rest.join('\n'), files, added, rewritesLog, rewritesRules, expectationEdits });
    problems.push(...(recordIssues.get(sha) ?? []));
    recordIssues.delete(sha);
    for (const p of problems) {
      bad += 1;
      console.error(`${sha.slice(0, 7)} ${subject}\n  ${p}`);
    }
  }
  // The expectation store (decision 0234): every agent commit of the range is held to it, a loop commit or not.
  for (const sha of all.filter((x) => !storesRead.has(x))) {
    const message = git('show', '-s', '--format=%B', sha);
    if (!require('./records').isAgent(message)) continue;
    for (const p of storeEdits(sha, message.split('\n')[0].trim())) {
      bad += 1;
      console.error(`${sha.slice(0, 7)} ${message.split('\n')[0].trim()}\n  ${p}`);
    }
  }
  // What the record gate found in commits this loop does not read itself: agent commits, merges, reverts.
  for (const [sha, problems] of recordIssues) {
    for (const p of problems) {
      bad += 1;
      console.error(`${sha.slice(0, 7)} ${git('show', '-s', '--format=%s', sha).trim()}\n  ${p}`);
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
  else if (cmd === 'e2e-due') e2eDue(argv);
  else if (cmd === 'compass') process.stdout.write(compassText(compassReading(readRuns(), Number(argv[argv.indexOf('--runs') + 1]) || COMPASS_WINDOW)));
  else if (require('./bookkeeping').COMMANDS[cmd]) process.exitCode = require('./bookkeeping').main([cmd, ...argv]);
  else {
    console.error('usage: node scripts/tend.js balance [--days N] [--write] | next | log <range> "<json>" | commits [--loop-only] <range> | e2e-due [--days N] [--json] | compass [--runs N] | next-decision | next-audit | files | landed | review-paths | items (scripts/bookkeeping.js)');
    process.exit(2);
  }
}

module.exports = { compassReading, compassText, FORBIDDEN, LIMITS, STATES, classify, criteriaPrefixes, tally, areasByState, readStatus, reading, nextArea, isLoops, dropBoundary, testName, tendCommitProblems, citedOwnEdits, rewritesBaseLines, mainOrHere, findingsOf, logProblems, runLine, fullPassDue, controlsIn, isRoute, resetsArea, readPatches };
