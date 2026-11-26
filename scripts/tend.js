#!/usr/bin/env node
// The tending loop's mechanical reads (decisions 0128-0130; .claude/skills/tend/SKILL.md):
//
//   node scripts/tend.js balance [--days N] [--write]   which slices grew on origin/main against the
//                                                       refinement beside them, the areas by their
//                                                       computed state (what is left open, decision 0235;
//                                                       a reset since the sweep is rough, 0229), the
//                                                       unseen apart, the rough share, every item under
//                                                       "Needs the owner" (0250), the evolve due, and a
//                                                       reading; the documents as origin/main holds them,
//                                                       not the branch's unpushed record; refused (exit 1)
//                                                       on a shallow history that cannot answer
//   node scripts/tend.js state [<area>…] [--here | --at <commit>] [--json]
//                                                       each area's computed state and why: main's, this
//                                                       checkout's record, or main's at a commit (a replay)
//   node scripts/tend.js base <area>… | --spec <slug> [--here]   /slice's warning: "lands on a rough base" with the
//                                                       area's open medium and high items; never a block
//   node scripts/tend.js log <range> '<json>'          append this run's line to the run log: what the
//                                                       range holds (every finding a subject names:
//                                                       shipped, audit fixes, builds, reverts) with
//                                                       what only the run knows (found, filed, answers,
//                                                       expectations and compass: decision 0236)
//   node scripts/tend.js next                           the area to sweep when the owner names none, or
//                                                       `evolve <area>` after fourteen days with no
//                                                       loop-filed G (decision 0235); refused when shallow
//   node scripts/tend.js compass [--runs N]             the compass (decision 0236), from the run log: per run and in
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
// The share's line (decision 0250, the owner's starting value, tuned from the run log, never by a run): the balance reads
// "outgrowing its base" when more than this share of the areas swept twice or more are rough, and more than LIMITS.rough are.
const ROUGH_SHARE = 0.5;

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
function reading({ slices, rough, openT, roughTwice, sweptTwice }, limits = LIMITS) {
  // With the share (decision 0250): more than half of the areas swept twice or more, and more than limits.rough of them.
  const shares = Number.isInteger(sweptTwice);
  const r = shares ? roughTwice : rough;
  const over = shares ? r > limits.rough && r / sweptTwice > ROUGH_SHARE : r > limits.rough;
  if (over || openT > limits.inbox) {
    const why = [];
    if (over) why.push(shares ? `${words(r)} of the ${words(sweptTwice)} areas swept twice or more are rough` : `${words(r)} areas are rough`);
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
function nextArea(counts, areas = {}, evolve = null) {
  // Decision 0229's resets first, then decision 0235's evolve (area-states audit 20, decision 0250), then the states.
  const ranked = Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked.length) return ranked[0][0];
  if (evolve) return `evolve ${evolve}`;
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
  // The expectation store (decision 0236): what scripts/expectations.js editProblems found in the commit's store files.
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

/** The store files a commit touches, from `git show --name-status`: both paths of a rename or a copy. */
function storeFilesOf(nameStatus) {
  return nameStatus
    .split('\n')
    .filter(Boolean)
    .flatMap((l) => l.split('\t').slice(1))
    .filter((p) => STORE_FILE.test(p));
}

/** A revision's full sha, or null when it names no commit here. */
function tryRev(rev) {
  try {
    return execFileSync('git', ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

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
// The expectation lens (decision 0236): a sweep, and an inbox run that builds a yes, logs `expectations` (the
// store's lines it tested, by id, each met, failed or lacking; a proposed line provisional; met naming its evidence;
// the drafted lines the steward dropped, with the Never row each breaks) and `compass` (refinement shipped, filed
// low by the compass for serving no expectation or rule, the G entries lens 0 filed). Only a line this script wrote
// carries the marker LENS, and only such a line is held to them: an older script's line reads as it was, whatever
// its date. tend:log also reads the lines against the store (scripts/expectations.js, logRefProblems). A line the
// steward flagged as serving no verb is logged `"serves": "none"` (decision 0245), apart from a dropped line's Never row.
const LENS = '0236';
const VERDICTS = ['met', 'failed', 'lacking'];
const LENS_LINE = /^A person\b.*\bwould reasonably expect\b/;
const EXPECTATION_ID = /^E-[a-z][a-z0-9-]*-\d+$/;
const EVIDENCE = /^(?:test:".+"|picture:\S+|[a-z][a-z0-9-]*:".+")$/;

function expectationProblems(e) {
  if (typeof e !== 'object' || e === null || Array.isArray(e)) return ['expectations is { lines: [{ id, is, evidence?, provisional?, serves? }], dropped: [{ line, never }] }'];
  const p = [];
  if (!Array.isArray(e.lines) || !e.lines.length) p.push('expectations.lines names each store line the run tested, by id (E-<feature>-<n>)');
  for (const l of Array.isArray(e.lines) ? e.lines : []) {
    if (!EXPECTATION_ID.test(l?.id ?? '')) p.push(`"${l?.id}" is no line's id: E-<feature>-<n> (npm run expectations -- list)`);
    if (!VERDICTS.includes(l?.is)) p.push(`${l?.id}: is is ${VERDICTS.join(', ')}`);
    if (l?.provisional !== undefined && typeof l.provisional !== 'boolean') p.push(`${l?.id}: provisional is true or left out`);
    if (l?.serves !== undefined && l.serves !== 'none') p.push(`${l?.id}: serves is "none", for a line flagged as serving no verb, or left out (its verb is in the store)`);
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
function logProblems(given, opts = {}) {
  const p = [];
  // Whether the line is a no-surface build (decision 0250), read from its own grew and built when not given (audit 14),
  // so a logged "none: <why>" line reads clean wherever the log is read.
  const noSurface = opts.noSurface ?? (given?.mode !== 'sweep' && !(given?.built ?? []).length && noSurfaceBuild(given?.grew ?? [], require('./check-specs').readSpecs()));
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
  // A build is what the range built (a T entry's commit, or a slice's criteria), not a yes it was given (decision 0236).
  const builds = (g.built ?? []).length > 0 || (g.grew ?? []).length > 0;
  const held = g.lens === LENS && (g.mode === 'sweep' || builds);
  // A build with nothing a person sees (every grown slice's spec reads no surface, decision 0250) may log, in place of
  // lines, "none: <why>": the reason required and kept in the line. A sweep, or any other build, logs its lines.
  if (typeof g.expectations === 'string') {
    if (!noSurface || g.mode === 'sweep') p.push('expectations "none: <why>" is only for a build whose grown slices\' specs all read no surface (decision 0250); log the lines');
    else if (!/^none: \S/.test(g.expectations)) p.push('expectations "none: <why>" says why there are no lines');
  } else if (g.expectations !== undefined) p.push(...expectationProblems(g.expectations));
  else if (held) p.push('a sweep or a build logs its expectations (decision 0236)');
  if (g.compass !== undefined) p.push(...compassProblems(g.compass, g.filed?.G ?? []));
  else if (held) p.push('a sweep or a build logs the compass\'s counts (decision 0236)');
  if (g.shots !== undefined && (typeof g.shots !== 'string' || !g.shots.trim())) p.push("shots is the run's shots folder, a path");
  for (const e of [...(g.filed?.T ?? []), ...(g.filed?.G ?? [])]) if (!/^[TG]\d+$/.test(e)) p.push(`filed entry "${e}" is a T or G number`);
  for (const a of g.answers ?? []) if (!/^[TG]\d+$/.test(a?.entry ?? '') || !ANSWERS.includes(a?.answer)) p.push(`an answer is { entry: "T3", answer: ${ANSWERS.join(' | ')} }`);
  // The answer log (LB3, decision 0235): a line this script marked holds each answer to who gave it and which option.
  if (g.answerLog === ANSWER_LOG) for (const a of g.answers ?? []) p.push(...answerProblems(a));
  if (g.review && ![g.review.accepted, g.review.rejected, g.review.deferred].every(count)) p.push('review counts the auditor\'s findings: accepted, rejected, deferred');
  if (g.review && g.review.high !== undefined && !count(g.review.high)) p.push('review.high counts the highs the review graded (decision 0269)');
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
// A half's shipped share must move by this much at least, and by this many findings at least (the move times the later
// half's findings), to read as falling or rising; each half must hold COMPASS_MIN refinement findings (shipped and
// filed low) before any trend is read.
const COMPASS_STEP = 0.1;
const COMPASS_MOVE = 2;
const COMPASS_MIN = 3;

/**
 * The compass (decision 0236), read from the run log: per run that carries `compass` and in sum, the refinement
 * shipped against the refinement the compass filed low, the G entries lens 0 filed, and the store lines met, failed
 * and lacking (ratified) or provisional. Until `window` runs carry it, "too early to say". Then, over the last `window`,
 * with at least COMPASS_MIN refinement findings in each half: the later half's shipped share falling, or nothing
 * shipped in it, is "the compass is biting"; flat or rising is "not biting: tighten it"; too few findings says so.
 * No checkpoint: it is read at every landing.
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
  const [early, late] = [add(last.slice(0, half)), add(last.slice(half))];
  const found = (h) => h.shipped + h.filedLow;
  const share = (h) => (found(h) ? Math.round((h.shipped / found(h)) * 100) / 100 : null);
  const shares = { first: last.length >= 2 ? share(early) : null, second: last.length >= 2 ? share(late) : null };
  // A trend is read only from enough refinement in each half: a null share, or fewer than three findings, is none.
  const enough = last.length >= 2 && found(early) >= COMPASS_MIN && found(late) >= COMPASS_MIN;
  const move = enough ? shares.second - shares.first : 0;
  const moved = Math.abs(move) >= COMPASS_STEP - 1e-9 && Math.abs(move) * found(late) >= COMPASS_MOVE - 1e-9;
  const trend = !enough ? 'none' : !moved ? 'flat' : move < 0 ? 'falling' : 'rising';
  // Nothing shipped in either half, with refinement in both: everything the loop found waited for a reason.
  const quiet = enough && late.shipped === 0 && early.shipped === 0;
  const verdict =
    last.length < window
      ? `too early to say: ${last.length} of ${window} runs carry the compass`
      : trend === 'falling' || quiet
        ? 'the compass is biting'
        : trend === 'none'
          ? `too few refinement findings to say: ${found(early)} and ${found(late)} in the halves, ${COMPASS_MIN} each at least`
          : 'the compass is not biting: tighten it';
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
    answerLog: ANSWER_LOG,
    shipped: all('shipped').sort((a, b) => a - b),
    auditFixes: all('audit').sort((a, b) => a - b),
    built: all('built'),
    grew: tally(subjects.map((subject) => ({ subject }))).slices,
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

// ---- Area states (decision 0235, as built by specs/area-states, decision 0250) ------------------------------------
// An area's state is computed from what is left open, never taken from a run's judgement. Pure; git and the files are
// read by stateInputs below.

const ABOVE = new Set(['high', 'medium']);
const above = (sev) => ABOVE.has(sev);

/**
 * An item's severity: a leading "Low", "Medium" or "High" ("(medium) Seven views…", "Low: …"), else the last high,
 * medium or low in the last of its parentheses that holds one ("(…, Nov 19, low)"; area-states audit 17), else null.
 */
function severityOf(text) {
  const lead = /^\W*(high|medium|low)\b/i.exec(String(text));
  if (lead) return lead[1].toLowerCase();
  const groups = (String(text).match(/\([^()]*\)/g) ?? []).filter((g) => /\b(high|medium|low)\b/i.test(g));
  if (!groups.length) return null;
  const words = groups[groups.length - 1].match(/\b(high|medium|low)\b/gi);
  return words[words.length - 1].toLowerCase();
}

let featureNamesCache;
function featureNames() {
  if (!featureNamesCache) featureNamesCache = new Set(require('./features').FEATURES.map((f) => f.name).filter((n) => n !== 'arch'));
  return featureNamesCache;
}

/**
 * The areas a text names as `/tend <area>` or `tend <area>`: the first that is a feature, or none. A citation of a
 * commit (`tend replay audit 8`, `tend tabs T35`, `tend walk-screen 15`) names where a fix came from, not whose item it is
 * (area-states audit 17), so it is skipped.
 */
function areasNamed(text, names = featureNames()) {
  for (const m of String(text).matchAll(/(?:^|[^\w-])\/?tend ([a-z][a-z0-9-]*)(?! (?:audit \d|T\d|\d))/g)) if (names.has(m[1])) return [m[1]];
  return [];
}

const titleOf = (text) => (/\*\*(.+?)\*\*/.exec(text)?.[1] ?? String(text).split(/(?<=[.:;])\s/)[0]).slice(0, 140).trim();

/**
 * Whether an item's fix is one the loop may not make: it says so ("the loop may not", "which the loop may not edit"), or
 * a sentence of it outside parentheses (a cited source sits in them) names a path the loop never edits beside the fix's
 * verb ("needs its lines out of `…baseline.json`"; area-states audit 17).
 */
function loopMayNot(text) {
  if (/\b(?:the )?loop (?:may not|never edits|cannot edit)\b/i.test(text)) return true;
  const bare = String(text).replace(/\([^()]*\)/g, ' ');
  return bare.split(/(?<=[.;:])\s/).some((sentence) => /\b(?:edit|change|reword|remove|take|out of|needs?|wants?)\b/i.test(sentence)
    && [...sentence.matchAll(/`([^`\s]+\/[^`\s]*)`/g)].some((m) => FORBIDDEN.some((re) => re.test(m[1].replace(/^\.\//, '')))));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** The first date an item gives ("2026-11-19", or "Nov 19" read in 2026), as YYYY-MM-DD, or null (area-states audit 16). */
function dateOf(text, year = 2026) {
  const iso = /\b(20\d\d-\d\d-\d\d)\b/.exec(String(text));
  const md = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* (\d{1,2})\b/.exec(String(text));
  if (iso && (!md || iso.index <= md.index)) return iso[1];
  if (md) return `${year}-${String(MONTHS.indexOf(md[1]) + 1).padStart(2, '0')}-${md[2].padStart(2, '0')}`;
  return null;
}

/** The bullets of a markdown region, each with its `##`/`###` heading and its continued (indented) lines. */
function bullets(text, headingLevel) {
  const out = [];
  let section = '';
  let cur = null;
  const heading = new RegExp(`^#{${headingLevel}} (.*)$`);
  for (const l of String(text).split('\n')) {
    const h = heading.exec(l);
    if (h) {
      section = h[1].trim();
      cur = null;
    } else if (/^#+ /.test(l)) cur = null;
    else if (/^- /.test(l)) {
      cur = { section, text: l.slice(2) };
      out.push(cur);
    } else if (cur && /^\s+\S/.test(l)) cur.text += `\n${l.trim()}`;
    else if (l.trim()) cur = null;
  }
  return out;
}

/**
 * docs/DEFERRED.md's items: each bullet's tag, section, title, the area it is the loop's to tend (the `tend <area>` its
 * words name, else its section heading's `/tend <area>`; none rather than a guess), its severity by its words (null
 * when unrated), and whether its fix is one the loop may not make (it waits on the owner, decision 0250).
 */
function deferredItems(text, names = featureNames()) {
  return bullets(text, 2).map((b) => {
    const m = /^(?:\[[ x]\] )?(?:\[(loop|owner|arch|phone|kept)\]\s?)?([\s\S]*)$/.exec(b.text);
    const body = m[2];
    // The section's `/tend <area>` first (area-states audit 17): an item sits under the area that filed it there.
    const heading = areasNamed(b.section, names);
    return { tag: m[1] ?? null, section: b.section, title: titleOf(body), areas: heading.length ? heading : areasNamed(body, names), severity: severityOf(body), waits: loopMayNot(body), date: dateOf(body) };
  });
}

/** The region of docs/STATUS.md under "## Needs the owner", up to the next `## `. */
function needsTheOwner(status) {
  const lines = String(status).split('\n');
  const start = lines.findIndex((l) => /^## Needs the owner\b/.test(l));
  if (start < 0) return '';
  const end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
}

const ANSWERED = /the owner'?s (?:yes|no|reshape|answers?|call)\b|\bAnswered\b|\bthe owner allowed\b/i;

/**
 * Every item under "Needs the owner" (AS7): each bullet of its sections but "Last tend" (the last run's digest, not an
 * item), with its id (`T<n>`, `G<n>` or none), tag, the areas its `Area:` line names, and whether an answer is noted
 * on it. `unansweredT` is what the alarm counts (decision 0250): `[owner]` and `[arch]` T entries with no answer.
 */
function readInbox(status) {
  const items = bullets(needsTheOwner(status), 3)
    .filter((b) => b.section && b.section !== 'Last tend')
    .map((b) => {
      const first = b.text.split('\n')[0];
      return {
        section: b.section,
        id: /^\*\*([TG]\d+)\b/.exec(first)?.[1] ?? null,
        tag: /\[(owner|arch|phone)\]/.exec(first)?.[1] ?? null,
        areas: (/\bArea: ([^\n]*?)\.(?:\s|$)/.exec(b.text)?.[1] ?? '').split(/,\s*/).map((s) => s.trim()).filter(Boolean),
        answered: ANSWERED.test(b.text),
        phone: /\[phone\]/.test(first),
        title: titleOf(b.text),
        text: b.text,
      };
    });
  const bySection = {};
  for (const i of items) bySection[i.section] = (bySection[i.section] ?? 0) + 1;
  return {
    items,
    unanswered: items.filter((i) => !i.phone && !i.answered).length,
    phone: items.filter((i) => i.phone).length,
    unansweredT: items.filter((i) => i.id?.startsWith('T') && (i.tag === 'owner' || i.tag === 'arch') && !i.answered).length,
    bySection,
  };
}

/** "Open before the loop": what the owner must change by hand, each with the area its words name and its severity. */
function beforeItems(status, names = featureNames()) {
  return readInbox(status)
    .items.filter((i) => i.section === 'Open before the loop')
    .map((i) => ({ title: i.title, areas: areasNamed(i.text, names), severity: severityOf(i.text), date: dateOf(i.text) }));
}

const wholeOf = (s) => (s.whole ?? s.lenses?.whole) === true;

/**
 * An area's state (AS1, AS2, decision 0235 as answered in 0250), from what is open:
 * never swept: unseen; a reset since its latest sweep: rough; the ledger's resting: resting; anything above low open
 * (the latest sweep's high and medium not shipped, a [loop] item rated medium or high) is rough, unless three whole
 * sweeps stand with no reset between them (then settling at least); what waits on the owner (its T entries, "Open
 * before the loop", a [loop] item the loop may not fix), an unrated item, a screen with no journey or a partial latest
 * sweep: settling; else polished. Lows never block polished.
 */
function areaState({ sweeps = [], resetsSince = [], between = [], deferred = [], before = [], entries = [], uncovered = [], ledgerState } = {}) {
  if (!sweeps.length) return { state: 'unseen', why: ['never swept'], open: 0, items: [] };
  if (resetsSince.length) return { state: 'rough', why: [`a change since its sweep added a screen or a control (${resetsSince.map((s) => s.slice(0, 7)).join(', ')})`], open: 0, items: [] };
  if (ledgerState === 'resting') return { state: 'resting', why: ['resting: the owner said no to its evolutions'], open: 0, items: [] };
  const last = sweeps[sweeps.length - 1];
  const l = last.found?.loop ?? {};
  const aboveFound = (l.high ?? 0) + (l.medium ?? 0);
  // A waiting medium is taken off what the latest sweep left only when it was filed at or after that sweep (audit 16).
  const waitsAbove = [...before, ...deferred.filter((d) => d.waits)].filter((x) => above(x.severity) && x.date && last.date && x.date >= last.date).length;
  // The log does not say which shipped numbers were above low (area-states audit 15): they count against the latest
  // sweep's highs and mediums only when they could all be them, more of them than its highs and mediums or one at or
  // below a number an earlier sweep of the area shipped says not; then nothing is taken off, and it is never polished.
  const distinct = [...new Set(last.shipped ?? [])];
  const earlierMax = Math.max(0, ...sweeps.slice(0, -1).flatMap((x) => x.shipped ?? []));
  const shows = distinct.length <= aboveFound && distinct.every((n) => n > earlierMax);
  const shipped = shows ? distinct.length : 0;
  const unshipped = Math.max(0, aboveFound - shipped - waitsAbove);
  const own = deferred.filter((d) => !d.waits && above(d.severity));
  const open = Math.max(unshipped, own.length);
  let run = 0;
  for (let k = sweeps.length - 1; k >= 0; k--) {
    if (wholeOf(sweeps[k])) run += 1;
    if (k > 0 && (between[k] ?? []).length) break;
  }
  const why = [];
  const items = own.map((d) => d.title);
  if (open) why.push(`${words(open)} above low open (the latest sweep found ${words(l.high ?? 0)} high and ${words(l.medium ?? 0)} medium, shipped ${words(shipped)}${own.length ? `; DEFERRED: ${items.join('; ')}` : ''})`);
  const waiting = [];
  if (entries.length) waiting.push(`entries ${entries.join(', ')}`);
  if (before.length) waiting.push(`Open before the loop: ${before.map((b) => `"${b.title}"${b.severity ? ` (${b.severity})` : ''}`).join('; ')}`);
  const mayNot = deferred.filter((d) => d.waits);
  if (mayNot.length) waiting.push(`a fix the loop may not make: ${mayNot.map((d) => `"${d.title}"`).join('; ')}`);
  if (waiting.length) why.push(`waits on the owner: ${waiting.join('; ')}`);
  const unrated = deferred.filter((d) => !d.waits && d.severity === null);
  if (unrated.length) why.push(`${words(unrated.length)} unrated [loop] ${unrated.length === 1 ? 'item' : 'items'}`);
  if (uncovered.length) why.push(`a screen with no journey: ${uncovered.join(', ')}`);
  if (!wholeOf(last)) why.push('its latest sweep was not whole');
  if (!shows && distinct.length) why.push('its log line cannot show that what it shipped was above low');
  if (open && run >= 3) return { state: 'settling', why: [...why, 'three whole sweeps with no reset between them: settling at least (decision 0235)'], open, items };
  if (open) return { state: 'rough', why, open, items };
  if (wholeOf(last) && shows && !waiting.length && !unrated.length && !uncovered.length) return { state: 'polished', why: why.length ? why : ['a whole sweep left nothing above low open'], open, items };
  return { state: 'settling', why: why.length ? why : ['nothing above low open'], open, items };
}

/** A run's given state.to against the script's (AS1): the run writes the computed state, never another. */
function givenStateProblems(given, computed) {
  const to = given?.state?.to;
  if (to === undefined || to === null || to === computed.state) return [];
  return [`state.to is the script's: ${computed.state} (${computed.why.join('; ')}); leave it out or give that`];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFrom = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

/**
 * Growth's actuator (AS4): when no run of the log filed a G in the last `days` (counted from the log's first line when
 * none ever did) and some area is settling or polished, the area to evolve: polished first, then the one swept longest
 * ago, ties by name. Only a run log line's filed.G is the loop's; a G /investigate filed is not in it.
 */
function evolveDue(runs, states, today, lastSwept = {}, days = LIMITS.days) {
  const dated = runs.filter((r) => typeof r?.date === 'string').map((r) => r.date).sort();
  if (!dated.length) return null;
  const filed = runs.filter((r) => typeof r?.date === 'string' && (r.filed?.G ?? []).length).map((r) => r.date).sort();
  const from = filed.length ? filed[filed.length - 1] : dated[0];
  if (daysFrom(from, today) < days) return null;
  const rank = (s) => (s === 'polished' ? 0 : 1);
  const ready = Object.entries(states).filter(([, s]) => s === 'polished' || s === 'settling');
  ready.sort((a, b) => rank(a[1]) - rank(b[1]) || String(lastSwept[a[0]] ?? '9999').localeCompare(String(lastSwept[b[0]] ?? '9999')) || a[0].localeCompare(b[0]));
  return ready.length ? ready[0][0] : null;
}

/**
 * Whether the history can answer (AS6): a shallow clone whose oldest commits are after the window's start, or that cuts
 * off a sweep base the reading needs, is refused, naming the date to fetch from (the oldest of the window's start and
 * those bases' dates). On a whole history a base that names no commit is a notice: its area is read from the window.
 */
function historyProblems({ shallow, boundaryDates = [], windowStart, needed = [] }) {
  const lost = needed.filter((n) => !n.resolves);
  if (!shallow) return { problems: [], notices: lost.map((n) => `${n.area}'s sweep base ${n.base} names no commit here: ${n.area} is read from the window`) };
  const newest = [...boundaryDates].sort().pop();
  const cut = newest !== undefined && newest > windowStart;
  if (!cut && !lost.length) return { problems: [], notices: [] };
  const from = [windowStart, ...needed.map((n) => n.date).filter(Boolean)].sort()[0];
  const why = [cut ? `its oldest commits are from ${newest}, after the window's start (${windowStart})` : null, lost.length ? `it lacks the sweep bases of ${lost.map((n) => n.area).join(', ')}` : null].filter(Boolean).join(', and ');
  return { problems: [`a shallow history: ${why}; the reading would be wrong. Fetch from ${from}: git fetch --shallow-since=${from} origin main`], notices: [] };
}

/** /slice step 1's warning (AS5): the area's state, and on a rough base its open medium and high items. Never a block. */
function baseWarning(area, s) {
  if (s.state !== 'rough') return `${area} is ${s.state}: nothing above low open${s.why.length ? ` (${s.why.join('; ')})` : ''}`;
  return [`lands on a rough base: ${area} (${s.why.join('; ')})`, ...(s.items ?? []).map((t) => `  - ${t}`)].join('\n');
}

/** A spec's "## Vision" section, up to its next `## ` heading: the one verdict that exempts (area-states audit 23). */
function visionOf(text) {
  const lines = String(text).split('\n');
  const start = lines.findIndex((l) => /^## Vision\s*$/.test(l));
  if (start < 0) return '';
  const end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join('\n');
}

/** Whether a build has nothing a person sees (decision 0250): every slice it grew has a spec whose verdict is no surface. */
function noSurfaceBuild(prefixes, specs) {
  if (!prefixes.length) return false;
  const { idsOf } = require('./check-specs');
  return prefixes.every((p) => {
    const mine = specs.filter((s) => idsOf(s.text).prefixes.includes(p));
    return mine.length > 0 && mine.every((s) => /^Verdict:\s*no surface\s*$/m.test(visionOf(s.text)));
  });
}

const shareLine = () => `more than half of the areas swept twice or more, and more than ${words(LIMITS.rough)} (ROUGH_SHARE ${ROUGH_SHARE}, LIMITS.rough ${LIMITS.rough}; decision 0250)`;

/**
 * The balance's reading of the areas and the inbox (AS1-AS4, AS7) from the documents and what git said: `runs` the run
 * log's lines, `deferred` and `status` the documents' text, `ledger` for resting, and `git` per area `{ swept,
 * resetsSince, between, uncovered }`, the slices grown and today's date.
 */
function report({ runs, deferred, status, ledger = {}, git: { areas, perArea = {}, slices = [], today } }) {
  const names = new Set(areas);
  const items = deferredItems(deferred, names).filter((d) => d.tag === 'loop');
  const before = beforeItems(status, names);
  const inbox = readInbox(status);
  const states = {};
  const sweepsOf = {};
  for (const a of areas) {
    const sweeps = runs.filter((r) => r?.mode === 'sweep' && r.area === a);
    sweepsOf[a] = sweeps;
    const g = perArea[a] ?? {};
    states[a] = areaState({
      sweeps,
      resetsSince: g.resetsSince ?? [],
      between: g.between ?? [],
      deferred: items.filter((d) => d.areas.includes(a)),
      before: before.filter((b) => b.areas.includes(a)),
      entries: inbox.items.filter((i) => i.id?.startsWith('T') && !i.phone && i.areas.includes(a)).map((i) => i.id),
      uncovered: g.uncovered ?? [],
      ledgerState: ledger.areas?.[a]?.state,
    });
  }
  const by = Object.fromEntries(STATES.map((s) => [s, []]));
  const firstSweep = Object.fromEntries(STATES.map((s) => [s, []]));
  const unseen = [];
  for (const a of [...areas].sort()) {
    const s = states[a].state;
    if (s === 'unseen') unseen.push(a);
    else by[s].push(a);
    if (sweepsOf[a].length === 1) firstSweep[s].push(a);
  }
  const twice = areas.filter((a) => sweepsOf[a].length >= 2);
  const roughTwice = twice.filter((a) => states[a].state === 'rough').length;
  const old = readStatus(status);
  const r = reading({ slices: slices.length, openT: inbox.unansweredT, roughTwice, sweptTwice: twice.length });
  const lastSwept = Object.fromEntries(areas.filter((a) => sweepsOf[a].length).map((a) => [a, sweepsOf[a][sweepsOf[a].length - 1].date]));
  const evolve = evolveDue(runs, Object.fromEntries(areas.map((a) => [a, states[a].state])), today, lastSwept);
  const why = evolve ? `${r.why}; no G filed by the loop in fourteen days while ${evolve} is ${states[evolve].state}: the next run evolves it` : r.why;
  return {
    areas: by,
    unseen,
    firstSweep,
    states,
    share: { sweptTwice: twice.length, roughTwice, line: shareLine() },
    open: { ...old, unansweredT: inbox.unansweredT },
    inbox: { items: inbox.items.length, unanswered: inbox.unanswered, phone: inbox.phone, bySection: inbox.bySection },
    unattributed: items.filter((d) => !d.areas.length && above(d.severity)).map((d) => d.title),
    unrated: items.filter((d) => d.severity === null).length,
    ...r,
    why,
    evolve,
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
 * The documents a reading needs, from `from`: 'main' (origin/main's, this checkout's where main's cannot be read),
 * 'here' (this checkout's: a run's own record), or a commit (as main held them there: the replay).
 */
function documentsFrom(from) {
  const raw =
    from === 'here'
      ? readHere
      : from === 'main'
        ? (rel) => mainOrHere(rel, showMain, readHere)
        : (rel) => execFileSync('git', ['show', `${from}:${rel}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  // Main's STATUS and ledger, or a commit's, must read, as before this slice (area-states audit 27): a reading of
  // nothing would say nothing waits. The run log and DEFERRED, which a history may not hold yet, read as empty when
  // absent, as the run log always has; so does any document a checkout lacks (a test's scratch repository).
  const strict = (rel) => from !== 'here' && (rel === 'docs/STATUS.md' || rel === LEDGER_REL);
  const read = (rel) => {
    if (strict(rel)) {
      const text = raw(rel);
      if (typeof text !== 'string') throw new Error(`tend: ${rel} could not be read from ${from}`);
      return text;
    }
    try {
      return raw(rel) ?? '';
    } catch {
      return '';
    }
  };
  const runs = read(RUNS_REL)
    .split('\n')
    .filter(Boolean)
    .flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
  return { runs, deferred: read('docs/DEFERRED.md'), status: read('docs/STATUS.md'), ledger: JSON.parse(read(LEDGER_REL) || '{}') };
}

const commitDate = (rev) => git('show', '-s', '--format=%cs', rev).trim();

/**
 * What git says for a reading at `tip` (AS1, AS2, AS6): per area its resets since its latest sweep's base and between
 * each two of its sweeps (decision 0229's `resetsArea`, the loop's own left out), its screens with no journey, and the
 * history's problems: a shallow clone that cannot answer is refused; a base that names no commit is read from the window.
 * `extra` adds a sweep not yet in the documents (the run's own, from tend:log).
 */
function gitFacts({ runs, tip, today, days = LIMITS.days }) {
  const { FEATURES, featuresOf, globToRegExp } = require('./features');
  const areas = FEATURES.map((f) => f.name).filter((n) => n !== 'arch');
  const owner = (name) => (p) => isAppSource(p) && featuresOf(p).some((x) => x.name === name);
  const windowStart = new Date(Date.parse(`${today}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);
  const needed = [];
  const ranges = [];
  for (const a of areas) {
    const sweeps = runs.filter((r) => r?.mode === 'sweep' && r.area === a);
    const bases = sweeps.map((s) => ({ sha: tryRev(s.base), base: s.base, date: s.date }));
    if (!sweeps.length) continue;
    const last = bases[bases.length - 1];
    needed.push({ area: a, base: last.base, date: last.date, resolves: Boolean(last.sha) });
    ranges.push({ area: a, key: 'since', args: last.sha ? [`${last.sha}..${tip}`] : [`--since=${windowStart}`, tip] });
    // The backstop needs the resets between sweeps only once three whole ones stand.
    if (sweeps.filter(wholeOf).length >= 3) {
      bases.forEach((b, i) => {
        if (!i) return;
        for (const x of [bases[i - 1], b]) if (!x.sha) needed.push({ area: a, base: x.base, date: x.date, resolves: false });
        if (b.sha && bases[i - 1].sha) ranges.push({ area: a, key: i, args: [`${bases[i - 1].sha}..${b.sha}`] });
      });
    }
  }
  const shallow = git('rev-parse', '--is-shallow-repository').trim() === 'true';
  const boundaryDates = [...shallowBoundary()].map((sha) => {
    try {
      return commitDate(sha);
    } catch {
      return null;
    }
  }).filter(Boolean);
  const history = historyProblems({ shallow, boundaryDates, windowStart, needed });
  const listed = new Map();
  for (const r of ranges) listed.set(r, git('rev-list', '--no-merges', ...r.args, '--', 'src/*.tsx', 'src/app').split('\n').filter(Boolean));
  const shas = [...new Set([...listed.values()].flat())];
  const patches = new Map();
  if (shas.length) {
    const out = execFileSync('git', ['log', '--stdin', '--no-walk=unsorted', '--raw', '-p', '-U0', '--format=%x00%H%x01%s', '--', 'src/*.tsx', 'src/app'], { cwd: ROOT, encoding: 'utf8', input: shas.join('\n') + '\n', maxBuffer: 256 * 1024 * 1024 });
    for (const c of readPatches(out)) patches.set(c.sha, c);
  }
  const { SCENARIOS } = require('./e2e-scenarios');
  const covered = (f) => SCENARIOS.some((j) => (j.covers ?? []).some((g) => globToRegExp(g).test(f)));
  const routes = git('ls-tree', '-r', '--name-only', tip, '--', 'src/app').split('\n').filter((f) => f && isRoute(f));
  const perArea = {};
  for (const a of areas) {
    const n = runs.filter((r) => r?.mode === 'sweep' && r.area === a).length;
    perArea[a] = { swept: n > 0, resetsSince: [], between: Array.from({ length: n }, () => []), uncovered: routes.filter((f) => owner(a)(f) && !covered(f)) };
  }
  for (const [r, list] of listed) {
    const hits = list.filter((sha) => patches.has(sha) && resetsArea(patches.get(sha), owner(r.area)));
    if (r.key === 'since') perArea[r.area].resetsSince = hits;
    else perArea[r.area].between[r.key] = hits;
  }
  return { areas, perArea, history, windowStart };
}

/** The whole reading at `tip`, from the documents of `from`: the report, with the slices grown and the history's notices. */
function readingAt({ from, tip, days = LIMITS.days, today = new Date().toISOString().slice(0, 10), docs = documentsFrom(from) }) {
  const facts = gitFacts({ runs: docs.runs, tip, today, days });
  const known = knownPrefixes();
  const t = tally(log(`--since=${facts.windowStart}`, tip), known);
  const r = report({ ...docs, git: { areas: facts.areas, perArea: facts.perArea, slices: t.slices, today } });
  return { r, t, facts };
}

function refuseShallow(facts) {
  for (const n of facts.history.notices) console.error(`tend: ${n}`);
  if (!facts.history.problems.length) return false;
  for (const p of facts.history.problems) console.error(`tend: ${p}`);
  process.exitCode = 1;
  return true;
}

/**
 * The balance reads origin/main alone: its commits, its run log, ledger and documents. The run's own unpushed record
 * (an area's new state, the entries it filed) is not main's yet. On a shallow history that cannot answer it refuses.
 */
function balance(argv) {
  const at = argv.indexOf('--days');
  const days = at >= 0 ? Number(argv[at + 1]) : LIMITS.days;
  const docs = documentsFrom('main');
  const { r, t, facts } = readingAt({ from: 'main', tip: 'origin/main', days, docs });
  if (refuseShallow(facts)) return;
  // LB4: the owner's take-up and the proxy's unconfirmed yeses, from main's run log, printed last.
  const out = balanceJson({ r, t, days, runs: docs.runs, today: new Date().toISOString().slice(0, 10) });
  console.log(JSON.stringify(out, null, 2));
  if (argv.includes('--write')) {
    // Into this checkout's ledger, beside the run's own record.
    const mine = readLedger();
    mine.balance = out;
    mine.compass = compassReading(readRuns()).ledger;
    fs.writeFileSync(LEDGER, JSON.stringify(mine, null, 2) + '\n');
  }
}

/** `state [<area>…] [--here | --at <commit>] [--json]`: each area's computed state and why (AS1). */
function stateCmd(argv) {
  const at = argv.indexOf('--at');
  const commit = at >= 0 ? argv[at + 1] : null;
  const from = commit ?? (argv.includes('--here') ? 'here' : 'main');
  const tip = commit ?? (from === 'here' ? 'HEAD' : 'origin/main');
  const today = commit ? commitDate(commit) : new Date().toISOString().slice(0, 10);
  const { r, facts } = readingAt({ from, tip, today });
  if (refuseShallow(facts)) return;
  const want = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--at');
  const names = want.length ? want : Object.keys(r.states).filter((a) => r.states[a].state !== 'unseen').sort();
  if (argv.includes('--json')) return console.log(JSON.stringify(Object.fromEntries(names.map((a) => [a, r.states[a]])), null, 2));
  for (const a of names) console.log(r.states[a] ? `${a}: ${r.states[a].state} (${r.states[a].why.join('; ')})` : `${a}: no such area`);
  if (!want.length) console.log(`unseen: ${r.unseen.join(', ')}\nreading: ${r.reading} (${r.why})`);
}

/** `base <area>… | --spec <slug> [--here]` (AS5): /slice's warning for the areas it lands on. Always exits 0. */
function baseCmd(argv) {
  try {
    const at = argv.indexOf('--spec');
    const areas = at >= 0 ? require('./features').featuresOfSpec(argv[at + 1]).map((f) => f.name) : argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--spec');
    if (!areas.length) return console.log('base: no area named (an area, or --spec <slug> of a spec a feature lists)');
    // --here: this checkout's documents and HEAD, so a slice's step 9 reads the base it leaves (area-states audit 18).
    const here = argv.includes('--here');
    const { r, facts } = readingAt({ from: here ? 'here' : 'main', tip: here ? 'HEAD' : 'origin/main' });
    for (const p of [...facts.history.problems, ...facts.history.notices]) console.log(`base: ${p}`);
    for (const a of areas) console.log(r.states[a] ? baseWarning(a, r.states[a]) : `${a} is no area the loop sweeps`);
  } catch (e) {
    console.log(`base: could not read the base (${e.message.split('\n')[0]}); a warning, never a block`);
  }
  process.exitCode = 0;
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
  // The script writes the date and the marker; a run's JSON dates nothing and backfills nothing (decision 0236).
  const owned = ['date', 'backfilled', 'lens', 'answerLog', 'regressions'].filter((k) => given && Object.prototype.hasOwnProperty.call(given, k));
  if (owned.length) {
    console.error(`tend log: ${owned.join(', ')} ${owned.length > 1 ? 'are' : 'is'} the script's to write, not the run's: leave ${owned.length > 1 ? 'them' : 'it'} out`);
    process.exit(1);
  }
  const subjects = range ? git('log', '--no-merges', '--reverse', '--format=%s', range).split('\n').filter(Boolean) : [];
  const line = runLine({ date: new Date().toISOString().slice(0, 10), subjects, given });
  // LB3: each answer's class, as the run's base held the entry (the script's: a run's class is replaced).
  const atBase = (rel) => {
    try {
      return execFileSync('git', ['show', `${line.base}:${rel}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    } catch {
      return '';
    }
  };
  const baseStatus = typeof line.base === 'string' ? atBase('docs/STATUS.md') : '';
  // A proxy answer is read against a base this history holds, before HEAD (loop-budget audit 21).
  const baseSha = typeof line.base === 'string' ? tryRev(line.base) : null;
  let baseResolved = false;
  try {
    if (baseSha) execFileSync('git', ['merge-base', '--is-ancestor', baseSha, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
    baseResolved = Boolean(baseSha);
  } catch {
    baseResolved = false;
  }
  if (Array.isArray(line.answers)) line.answers = line.answers.map((a) => (a && typeof a === 'object' && a.entry ? { ...a, class: classOf(a.entry, baseStatus) } : a));
  // LB1d: every regression the range's review fixes claim, the script's to list.
  const bodies = range ? git('log', '--no-merges', '--reverse', '--name-only', '--format=%x00%H%x01%s%x01%B%x02', range).split('\0').filter(Boolean).map((chunk) => {
    const [head, names = ''] = chunk.split('\x02');
    const [sha, subject, body = ''] = head.split('\x01');
    return { sha: sha.trim(), subject, body, files: names.split('\n').filter(Boolean).map((p) => ({ path: p })) };
  }) : [];
  const claims = regressionClaims(bodies);
  if (claims.length) line.regressions = claims.map((c) => ({ audit: c.audit, sha: c.sha.slice(0, 8) }));
  // A build with nothing a person sees may log "none: <why>" for its lines (decision 0250).
  const noSurface = line.mode !== 'sweep' && !line.built.length && noSurfaceBuild(line.grew, require('./check-specs').readSpecs());
  // The line as it will be written is what is held (decision 0236): runLine marks it with the lens.
  const problems = logProblems(line, { noSurface });
  // LB1's other half (loop-budget audit 1): what the review accepted is fixed or filed with its severity, no high filed.
  const deferredHere = fs.existsSync(path.join(ROOT, 'docs', 'DEFERRED.md')) ? readHere('docs/DEFERRED.md') : '';
  problems.push(...filedProblems(line, { auditsShipped: new Set(line.auditFixes).size, added: addedLoopItems(typeof line.base === 'string' ? atBase('docs/DEFERRED.md') : '', deferredHere) }));
  // A keep of a proxy yes names the line it keeps (loop-budget audit 2).
  problems.push(...confirmProblems(line.answers, documentsFrom('here').runs));
  problems.push(...proxyBaseProblems(line.answers, { resolved: baseResolved, ids: new Set(readInbox(baseStatus).items.map((i) => i.id).filter(Boolean)) }));
  // The owner's words stand in the range's record (loop-budget audit 22): its messages, and the sidecars and decision
  // records the range or the working tree adds.
  const recorded = bodies.map((b) => `${b.subject}\n${b.body}`);
  const since = baseResolved ? git('diff', '--name-only', baseSha, '--', '.claude/records', 'docs/decisions').split('\n') : [];
  const fresh = git('ls-files', '--others', '--exclude-standard', '--', '.claude/records', 'docs/decisions').split('\n');
  for (const rel of new Set([...since, ...fresh].filter(Boolean))) if (fs.existsSync(path.join(ROOT, rel))) recorded.push(readHere(rel));
  problems.push(...wordsProblems(line.answers, recorded));
  // A sweep's state is the script's (AS1, decision 0235): computed from this checkout's record with the run's own line,
  // and git from the run's base to HEAD (the loop's own commits left out); a given state.to that differs is refused.
  let computed = null;
  if (!problems.length && line.mode === 'sweep') {
    const docs = documentsFrom('here');
    docs.runs.push(line);
    const { r, facts } = readingAt({ from: 'here', tip: 'HEAD', docs });
    for (const n of facts.history.notices) console.error(`tend log: ${n}`);
    computed = r.states[line.area];
    if (!computed) problems.push(`"${line.area}" is no area of scripts/features.js`);
    else {
      problems.push(...givenStateProblems(line, computed));
      line.state = { from: line.state?.from ?? null, to: computed.state };
    }
  }
  if (!problems.length && line.expectations?.lines) {
    const ex = require('./expectations');
    problems.push(...ex.logRefProblems(line.expectations.lines, ex.readStores(ROOT), ex.readIndex(ROOT), { shots: line.shots, area: line.area }));
  }
  if (problems.length) {
    console.error(`tend log: ${problems.join('; ')}`);
    process.exit(1);
  }
  // The shots folder is the run's scratchpad: it checks the pictures and is not the log's to keep.
  delete line.shots;
  fs.appendFileSync(RUNS, JSON.stringify(line) + '\n');
  if (computed) console.error(`tend log: ${line.area} is ${computed.state} (${computed.why.join('; ')})`);
  if (computed && fs.existsSync(LEDGER)) {
    // The ledger's state is the script's, beside the run's own swept, note and main.
    const mine = readLedger();
    mine.areas = mine.areas ?? {};
    mine.areas[line.area] = { ...(mine.areas[line.area] ?? {}), state: computed.state };
    fs.writeFileSync(LEDGER, JSON.stringify(mine, null, 2) + '\n');
  }
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

function next(argv = []) {
  // The documents and git as origin/main holds them (`--here`: this checkout's and HEAD); LB2: after a rotation,
  // decision 0229's resets, then 0235's evolve, then the computed states; after any other sweep, the rotation.
  const here = argv.includes('--here');
  const docs = documentsFrom(here ? 'here' : 'main');
  const { r, facts } = readingAt({ from: here ? 'here' : 'main', tip: here ? 'HEAD' : 'origin/main', docs });
  if (refuseShallow(facts)) return;
  const counts = Object.fromEntries(Object.entries(facts.perArea).map(([a, g]) => [a, g.resetsSince.length]));
  const states = Object.fromEntries(Object.entries(r.states).filter(([, s]) => s.state !== 'unseen').map(([a, s]) => [a, { state: s.state }]));
  const verbs = Object.fromEntries(require('./features').FEATURES.filter((f) => f.name !== 'arch').map((f) => [f.name, f.verbs ?? []]));
  const pick = nextPick({ counts, states, evolve: r.evolve, runs: docs.runs, verbs });
  console.error(`tend next: ${pick.why}`);
  console.log(pick.area ?? 'none: every area is at rest; run /tend evolve');
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
  // A revert (ship.md, "A red run"), read by its `This reverts commit <sha>.` lines as the records gate reads them, is
  // taken for a store file only when it is one (audit 23): of the commits it names, those that touched the file are
  // ancestors of it and agent commits; every commit that touched the file since the oldest of them is named; and the
  // file is as it stood before that oldest. A revert of the owner's answer commit, or of a commit the owner made by
  // hand, is refused outright: un-ratifying, and undoing the owner's own edit, are the owner's.
  const reverted = (message) => [...new Set([...message.matchAll(/^This reverts commit ([0-9a-f]{7,40})\b/gm)].map((m) => tryRev(m[1])).filter(Boolean))];
  const ancestor = (a, b) => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', a, b], { cwd: ROOT, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
  const touches = (c, p) => storeFilesOf(git('show', '--name-status', '--format=', c)).includes(p);
  /** true when the commit reverts `p`, a problem when it reverts the owner's answer, false when it is no revert of it. */
  const revertOf = (sha, p, named) => {
    if (!named.length || named.some((n) => n === sha || !ancestor(n, sha))) return false;
    const touching = named.filter((n) => touches(n, p));
    if (!touching.length) return false;
    const answer = touching.find((n) => require('./expectations').ANSWER_COMMIT.test(git('show', '-s', '--format=%s', n).trim()));
    if (answer) return `reverts ${answer.slice(0, 7)}, the owner's answer commit, in ${p}: un-ratifying is the owner's (decision 0236)`;
    const owners = touching.find((n) => !require('./records').isAgent(git('show', '-s', '--format=%B', n)));
    if (owners) return `reverts ${owners.slice(0, 7)}, the owner's own commit, in ${p}: it is the owner's to revert (decision 0236)`;
    const oldest = touching.sort((a, b) => Number(git('rev-list', '--count', a)) - Number(git('rev-list', '--count', b)))[0];
    const since = git('rev-list', tryRev(`${oldest}^`) ? `${oldest}^..${sha}^` : `${sha}^`, '--', p).split('\n').filter(Boolean);
    if (since.some((c) => !touching.includes(c))) return false;
    return at(sha, p) === at(`${oldest}^`, p);
  };
  // Whether a check had vanished at a revision (audits 17, 24): the journeys, tests and feature map as it held them.
  const indexes = new Map();
  const missingAt = (rev, check, feature) => {
    if (!indexes.has(rev)) {
      const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tend-index-'));
      const paths = git('ls-tree', '--name-only', rev, '--', 'scripts/e2e/journeys', 'src/lib/__tests__', 'scripts/features.js').split('\n').filter(Boolean);
      if (paths.length) execFileSync('tar', ['-x', '-C', dir], { input: execFileSync('git', ['archive', rev, '--', ...paths], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 }) });
      if (!fs.existsSync(path.join(dir, 'scripts', 'features.js'))) {
        fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'scripts', 'features.js'), 'module.exports = { FEATURES: [] };\n');
      }
      indexes.set(rev, require('./expectations').readIndex(dir));
      fs.rmSync(dir, { recursive: true, force: true });
    }
    return require('./expectations').resolveCheck(check, indexes.get(rev), feature) === 'missing';
  };
  // A check counts as vanished only when the push's base lacks it (audit 24), so no commit of the same push removes a
  // check and then lets its line go back to pending; with no base to the range, the commit's parent.
  const vanishedAt = (sha) => (ends.length === 2 && ends[0] ? baseRev : `${sha}^`);
  const storeEdits = (sha) => {
    const message = git('show', '-s', '--format=%B', sha);
    const subject = message.split('\n')[0].trim();
    const changed = [...new Set(storeFilesOf(git('show', '--name-status', '--format=', sha)))];
    const named = reverted(message);
    return changed.flatMap((p) => {
      const revert = revertOf(sha, p, named);
      if (revert === true) return [];
      if (typeof revert === 'string') return [revert];
      return require('./expectations').editProblems(at(`${sha}^`, p), at(sha, p), STORE_FILE.exec(p)[1], subject, { missing: (check, feature) => missingAt(vanishedAt(sha), check, feature) });
    });
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
    const expectationEdits = storeEdits(sha);
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
  // The expectation store (decision 0236): every agent commit of the range is held to it, a loop commit or not.
  for (const sha of all.filter((x) => !storesRead.has(x))) {
    const message = git('show', '-s', '--format=%B', sha);
    if (!require('./records').isAgent(message)) continue;
    for (const p of storeEdits(sha)) {
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
  // LB1 (decisions 0235, 0269): the range's review fixes against its fixes, per area, revert-aware.
  const nameStatus = (sha) => git('show', '--name-status', '--format=', sha).split('\n').filter(Boolean).map((l) => {
    const cols = l.split('\t');
    return { status: cols[0][0], path: cols[cols.length - 1], from: cols.length > 2 ? cols[1] : undefined };
  });
  const change = (sha) => {
    const message = git('show', '-s', '--format=%B', sha);
    return { sha, subject: message.split('\n')[0].trim(), body: message.split('\n').slice(1).join('\n'), files: nameStatus(sha) };
  };
  const tip = ends.length === 2 ? ends[1] || 'HEAD' : range;
  // The run-log lines the range adds: their highs (audit 16), and each must carry the marker (audit 22).
  const addedLines = git('diff', '--format=', `${baseRev}`, tip, '--', RUNS_REL).split('\n').filter((l) => /^\+(?!\+\+)/.test(l)).map((l) => l.slice(1)).filter((l) => l.trim());
  for (const p of logLineProblems(addedLines)) {
    bad += 1;
    console.error(`${range}\n  ${p}`);
  }
  const logged = addedLines.reduce((n, l) => {
    try {
      return n + (JSON.parse(l)?.review?.high ?? 0);
    } catch {
      return n;
    }
  }, 0);
  // A regression beyond the push is a commit of the run's own range, from its latest log line's base (audit 25).
  const tipRuns = at(tip, RUNS_REL).split('\n').filter(Boolean);
  let runBase = null;
  try {
    runBase = tryRev(JSON.parse(tipRuns[tipRuns.length - 1] ?? 'null')?.base ?? '');
  } catch {
    runBase = null;
  }
  const resolve = (ref) => {
    const full = tryRev(ref);
    if (!full || !runBase || !ancestor(full, tryRev(tip) ?? tip) || ancestor(full, runBase)) return null;
    return change(full);
  };
  const loopish = all.map((sha) => ({ sha, subject: git('show', '-s', '--format=%s', sha).trim() })).filter((c) => /^(tend |Revert ")/.test(c.subject)).map((c) => change(c.sha));
  for (const p of [...reviewBudget(loopish, { resolve }), ...highProblems(loopish, logged)]) {
    bad += 1;
    console.error(`${range}\n  ${p}`);
  }
  // LB6 (decision 0235): an agent commit may not change a process file another lease holds while live, take a lease on
  // one another holds, nor end another's lease but by its lapse or the owner's words. The leases are the parent's.
  for (const sha of all) {
    const message = git('show', '-s', '--format=%B', sha);
    if (!require('./records').isAgent(message)) continue;
    const files = nameStatus(sha);
    const held = [...new Set(files.flatMap((f) => [f.path, f.from]).filter((x) => x && isProcess(x)))];
    const status = files.some((f) => f.path === 'docs/STATUS.md');
    if (!held.length && !status) continue;
    const rows = leaseRows(at(`${sha}^`, 'docs/STATUS.md'));
    const after = status ? leaseRows(at(sha, 'docs/STATUS.md')) : rows;
    if (!rows.length && !after.length) continue;
    const date = git('show', '-s', '--format=%cI', sha).trim();
    const lease = leaseOf(message);
    const problems = [
      ...leaseProblems({ files: held, date, lease, rows }),
      ...leaseAddProblems({ added: after.filter((a) => !rows.some((r) => r.id === a.id)), rows, date }),
      ...leaseRemovalProblems({ removed: leaseRemoved(rows, after), date, lease, message }),
    ];
    for (const p of problems) {
      bad += 1;
      console.error(`${sha.slice(0, 7)} ${message.split('\n')[0].trim()}\n  ${p}`);
    }
  }
  if (bad) process.exit(1);
  console.log(`check:tend: ${shas.length} commits read, clean.`);
}

// ---- Loop budget (G7, specs/loop-budget; decisions 0235 and 0269) ------------------------------------------------
// Review has a budget (LB1), sweeps rotate onto unseen ground (LB2), every answer says who gave it and which option
// (LB3, LB4), the inbox ages (LB5), and a session leases the process files it changes (LB6). Pure; wired below.

const loopArea = (subject) => /^tend (\S+)/.exec(subject)?.[1] ?? null;
/** The commit of `commits` a sha or its prefix names, or null. */
const commitNamed = (commits, ref) => commits.find((c) => c.sha.startsWith(ref) || ref.startsWith(c.sha)) ?? null;
/**
 * The shas the range's reverts leave undone, by their `This reverts commit <sha>.` lines (as the record gate reads
 * them), in commit order: a revert of a revert restores what that revert undid (loop-budget audit 26).
 */
function revertedIn(commits) {
  const gone = new Set();
  const undid = new Map();
  for (const c of commits.filter((x) => /^Revert "/.test(x.subject))) {
    const mine = [];
    for (const m of String(c.body).matchAll(/^This reverts commit ([0-9a-f]{7,40})\b/gm)) {
      const hit = commitNamed(commits, m[1]);
      if (!hit) continue;
      if (undid.has(hit.sha)) for (const y of undid.get(hit.sha)) gone.delete(y);
      else {
        gone.add(hit.sha);
        mine.push(hit.sha);
      }
    }
    undid.set(c.sha, mine);
  }
  return gone;
}

// What a T build's commit must change to ship an item (loop-budget audit 15): more than tests, journeys, rules and docs.
const notAnItem = (p) => TEST_FILE.test(p) || /^\.claude\/rules\//.test(p) || /^docs\//.test(p);

/**
 * The review fixes a high exempts (decision 0269, loop-budget audit 16): a review fix whose message says `Severity:
 * high` and that names exactly one audit number. `check:tend` holds their count to the highs the run logged.
 */
function highClaims(commits) {
  const gone = revertedIn(commits);
  return [...new Set(commits
    .filter((c) => /^tend /.test(c.subject) && !gone.has(c.sha) && /^\s*Severity:\s*high\b/im.test(String(c.body)))
    .map((c) => findingsOf(c.subject).audit)
    .filter((a) => a.length === 1)
    .map((a) => a[0]))].sort((x, y) => x - y);
}

/** More self-declared highs than the range's run-log lines count in `review.high` (loop-budget audit 16). */
function highProblems(commits, logged) {
  const highs = highClaims(commits);
  if (highs.length <= logged) return [];
  return [`${highs.length} review fixes say \`Severity: high\` (audit ${highs.join(', ')}), but the range's run-log line counts ${logged} (review.high): a high is the review's grade, logged by the run (decision 0269)`];
}

/**
 * The run's own regressions a review fix names (LB1d, loop-budget audit 11): a line `Regression: <sha> <what worked at
 * the base>` in a `tend <area> audit N` commit, `<sha>` a commit of the range of the same area that is no review fix.
 */
function regressionClaims(commits, resolve = () => null) {
  const out = [];
  for (const c of commits.filter((x) => /^tend /.test(x.subject))) {
    const audits = findingsOf(c.subject).audit;
    if (!audits.length) continue;
    const mine = new Set((c.files ?? []).map((f) => f.path));
    for (const m of String(c.body).matchAll(/^\s*Regression:\s*([0-9a-f]{7,40})[ \t]+(\S[^\n]*)$/gm)) {
      // Beyond the push, a commit of the run's own range (loop-budget audit 25), resolved by the caller.
      const target = commitNamed(commits, m[1]) ?? resolve(m[1]);
      if (!target || target.sha === c.sha || loopArea(target.subject) !== loopArea(c.subject) || findingsOf(target.subject).audit.length) continue;
      // The regression is of what the fix changed: the two share a file (loop-budget audit 16).
      if (!(target.files ?? []).some((f) => mine.has(f.path))) continue;
      for (const n of audits) out.push({ audit: n, sha: target.sha });
    }
  }
  return out;
}

/**
 * LB1 (decisions 0235, 0269): per area, the review fixes a range's loop commits name (distinct `audit N`) against its
 * fixes (distinct `tend <area> N`) and the items its T builds ship (each commit naming a `T<n>` that changes more than
 * tests and journeys). A commit the range reverts counts on neither side; a review fix that says `Severity: high`, or
 * names the run's own regression, is fixed whatever the budget. A G slice's `<slug> audit N` is outside it.
 */
function reviewBudget(commits, { resolve } = {}) {
  const gone = revertedIn(commits);
  const per = new Map();
  const of = (a) => {
    if (!per.has(a)) per.set(a, { fixes: new Set(), items: new Set(), audits: new Set(), exempt: new Set() });
    return per.get(a);
  };
  const highs = new Set(highClaims(commits));
  for (const c of commits.filter((x) => /^tend /.test(x.subject) && !gone.has(x.sha))) {
    const f = findingsOf(c.subject);
    if (!f.shipped.length && !f.built.length && !f.audit.length) continue;
    const x = of(loopArea(c.subject));
    for (const n of f.shipped) x.fixes.add(n);
    if ((c.files ?? []).some((file) => !notAnItem(file.path))) for (const t of f.built) x.items.add(t);
    for (const n of f.audit) {
      x.audits.add(n);
      if (highs.has(n)) x.exempt.add(n);
    }
  }
  for (const r of regressionClaims(commits.filter((c) => !gone.has(c.sha)), resolve)) {
    const c = commits.find((x) => findingsOf(x.subject).audit.includes(r.audit) && /^tend /.test(x.subject));
    if (c) of(loopArea(c.subject)).exempt.add(r.audit);
  }
  const problems = [];
  for (const [area, x] of [...per].sort((a, b) => a[0].localeCompare(b[0]))) {
    const counted = [...x.audits].filter((n) => !x.exempt.has(n)).sort((a, b) => a - b);
    const fixes = x.fixes.size + x.items.size;
    if (counted.length <= fixes) continue;
    const shipped = [...[...x.fixes].sort((a, b) => a - b).map(String), ...[...x.items].sort()];
    problems.push(
      `tend ${area}: ${counted.length} review fixes (audit ${counted.join(', ')}) against ${fixes} fixes and entries shipped (${shipped.join(', ') || 'none'}): one review fix per fix (decisions 0235, 0269). A high (\`Severity: high\`) and the run's own regression (\`Regression: <sha> <what worked at the base>\`) are fixed whatever the budget; the rest in severity order up to it, and what is over is filed [loop] with its severity`,
    );
  }
  return problems;
}

/** The [loop] items of `here`'s docs/DEFERRED.md whose section and first line `base`'s lack: what a run files. */
function addedLoopItems(base, here) {
  const key = (b) => `${b.section}\u0000${b.text.split('\n')[0]}`;
  const had = new Set(bullets(base, 2).map(key));
  return bullets(here, 2)
    .filter((b) => /^(?:\[[ x]\] )?\[loop\]/.test(b.text) && !had.has(key(b)))
    .map((b) => ({ text: b.text.split('\n')[0], severity: severityOf(b.text.replace(/^(?:\[[ x]\] )?\[loop\]\s?/, '')) }));
}

/**
 * LB1's other half (loop-budget audit 1, decision 0269), for a sweep or a T build: every finding its review accepted
 * is a review fix the range ships or a [loop] item the run files with its severity, and none filed is a high.
 */
function filedProblems(line, { auditsShipped, added }) {
  const bound = line?.mode === 'sweep' || (line?.built ?? []).length > 0;
  if (!bound || !line?.review || !count(line.review.accepted)) return [];
  const p = [];
  if (line.review.accepted > auditsShipped + added.length) {
    p.push(`review.accepted is ${line.review.accepted}, but the range ships ${auditsShipped} review fixes and the run files ${added.length} [loop] items: what the budget does not fix is filed [loop] with its severity (decisions 0235, 0269)`);
  }
  for (const a of added) {
    if (!a.severity) p.push(`a [loop] item the run files names no severity: "${a.text.slice(0, 80)}"`);
    else if (a.severity === 'high') p.push(`a high is filed: "${a.text.slice(0, 80)}"; a high is fixed whatever the budget (decision 0269)`);
  }
  return p;
}

let verbOrder;
/** VISION's verbs in the rotation's order (Return, Honour, Earn), from scripts/features.js. */
const VERB_ORDER = () => (verbOrder ??= require('./features').VERBS ?? ['Return', 'Honour', 'Earn']);
const rankOf = (verbs) => Math.min(9, ...(verbs ?? []).map((v) => VERB_ORDER().indexOf(v)).filter((i) => i >= 0));
const latestSweeps = (sweeps) => {
  const out = {};
  for (const s of sweeps) if (!out[s.area] || String(s.date) > out[s.area]) out[s.area] = String(s.date);
  return out;
};

/**
 * LB2: whether the latest sweep was a rotation: its area's first, or, once every area had been swept (loop-budget audit
 * 8), the area whose latest sweep was then the oldest (ties count). No sweep at all reads as a rotation.
 */
function lastWasRotation(runs, areas, resting = []) {
  // Neither a resting nor a retired area holds a turn (loop-budget audit 24).
  areas = areas.filter((a) => !resting.includes(a));
  const names = new Set(areas);
  const sweeps = runs.filter((r) => r?.mode === 'sweep' && typeof r.area === 'string' && names.has(r.area));
  if (!sweeps.length) return true;
  const last = sweeps[sweeps.length - 1];
  const before = latestSweeps(sweeps.slice(0, -1));
  if (!(last.area in before)) return true;
  if (areas.some((a) => !(a in before))) return false;
  return Object.entries(before).every(([a, d]) => a === last.area || before[last.area] <= d);
}

/** LB2's rotation: the never-swept areas by rank then name; when none, the one swept longest ago; resting skipped. */
function rotationArea(runs, verbs, resting = []) {
  const names = Object.keys(verbs).filter((a) => !resting.includes(a));
  const latest = latestSweeps(runs.filter((r) => r?.mode === 'sweep' && typeof r.area === 'string'));
  const byRank = (a, b) => rankOf(verbs[a]) - rankOf(verbs[b]) || a.localeCompare(b);
  const never = names.filter((a) => !(a in latest)).sort(byRank);
  if (never.length) return never[0];
  return names.sort((a, b) => latest[a].localeCompare(latest[b]) || byRank(a, b))[0] ?? null;
}

/**
 * LB2: `next`'s pick. After a rotation, the reset turn: decision 0229's resets, then 0235's evolve, then the states
 * (`nextArea`, as before). After any other sweep, the rotation turn: a due evolve, else `rotationArea`.
 */
function nextPick({ counts, states, evolve, runs, verbs }) {
  const resting = Object.keys(states).filter((a) => states[a]?.state === 'resting');
  if (lastWasRotation(runs, Object.keys(verbs), resting)) {
    return { area: nextArea(counts, states, evolve), turn: 'reset', why: 'the reset turn: the latest sweep was a rotation' };
  }
  if (evolve) return { area: `evolve ${evolve}`, turn: 'rotation', why: 'the rotation turn: an evolve is due first' };
  const area = rotationArea(runs, verbs, resting);
  const swept = runs.some((r) => r?.mode === 'sweep' && r.area === area);
  return { area, turn: 'rotation', why: `the rotation turn: ${area} is ${swept ? 'the area swept longest ago' : 'never swept'}, ${VERB_ORDER()[rankOf(verbs[area])] ?? 'no verb'}` };
}

// LB3: the answer log's marker. Only a line this script wrote carries it, and only such a line is held to by and pick.
const ANSWER_LOG = '0235';
const BY = ['owner', 'proxy'];
const PICKS = ['recommended', 'other', 'reshape', 'no'];
const PICK_OF = { yes: ['recommended', 'other'], no: ['no'], reshape: ['reshape'] };
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** What an answer of a marked line lacks (LB3, loop-budget audits 2 and 12; decisions 0157, 0236). */
function answerProblems(a) {
  const e = a?.entry ?? '(no entry)';
  const p = [];
  if (!BY.includes(a?.by)) p.push(`${e}: by is owner or proxy (decision 0236's words)`);
  if (!PICKS.includes(a?.pick)) p.push(`${e}: pick is ${PICKS.join(', ')}`);
  else if (PICK_OF[a?.answer] && !PICK_OF[a.answer].includes(a.pick)) p.push(`${e}: a ${a.answer} is picked ${PICK_OF[a.answer].join(' or ')}`);
  if (a?.by === 'owner' && (typeof a.words !== 'string' || !a.words.trim() || /[\r\n]/.test(a.words))) p.push(`${e}: an answer by the owner carries the owner's words, verbatim, on one line (words)`);
  if (a?.by === 'proxy') {
    if (a.answer !== 'yes') p.push(`${e}: the proxy answers only yes; a no or a reshape is the owner's (decision 0157)`);
    if (/^T \[(arch|phone)\]$/.test(a.class ?? '')) p.push(`${e}: the proxy never answers an [arch] or [phone] entry (decision 0157)`);
  }
  if (a?.confirms !== undefined && (a.by !== 'owner' || a.answer !== 'yes' || !ISO_DAY.test(String(a.confirms)))) p.push(`${e}: confirms is the owner's keep of a proxy yes: by owner, answer yes, and the proxy line's date (YYYY-MM-DD)`);
  return p;
}

/** A `confirms` names the date of a run-log line that answered the same entry (loop-budget audit 2). */
function confirmProblems(answers, runs) {
  return (answers ?? [])
    .filter((a) => a?.confirms !== undefined)
    .filter((a) => !runs.some((r) => r?.date === a.confirms && (r.answers ?? []).some((x) => x?.entry === a.entry)))
    .map((a) => `${a.entry}: confirms ${a.confirms}, but no line of the run log of that date answers ${a.entry}`);
}

/** A proxy answer is read against the run's base, a commit of this history before HEAD (loop-budget audit 21). */
function proxyBaseProblems(answers, { resolved, ids }) {
  return (answers ?? [])
    .filter((a) => a?.by === 'proxy')
    .flatMap((a) => (!resolved ? [`${a.entry}: a proxy answer is read against the run's base, a commit of this history and an ancestor of HEAD, so its class is known (decision 0157)`] : !ids.has(a.entry) ? [`${a.entry} is not in the inbox at the run's base: the proxy answers only an entry it can read there`] : []));
}

/**
 * The owner's words stand in the range's record for that entry (loop-budget audit 22): a piece (a commit message, its
 * Records-Op reasons, a sidecar, a decision record the range adds) that names the entry and holds the words, as typed or
 * as JSON escapes them.
 */
function wordsProblems(answers, record) {
  return (answers ?? [])
    .filter((a) => a?.by === 'owner' && typeof a.words === 'string' && a.words.trim())
    .filter((a) => !record.some((piece) => piece.includes(a.entry) && (piece.includes(a.words) || piece.includes(JSON.stringify(a.words).slice(1, -1)))))
    .map((a) => `${a.entry}: the owner's words "${a.words}" are in no record of the range that names ${a.entry} (an inbox operation's reason or body, a decision record it adds): the log says only what the record holds`);
}

/** Every run-log line a range adds is one tend:log wrote, with the answer log's marker (loop-budget audit 22). */
function logLineProblems(added) {
  return added.flatMap((l) => {
    let run;
    try {
      run = JSON.parse(l);
    } catch {
      return [`a run-log line the range adds does not parse: ${l.slice(0, 60)}`];
    }
    return run?.answerLog === ANSWER_LOG ? [] : [`a run-log line the range adds (${run?.date ?? 'undated'} ${run?.mode ?? ''}) lacks the answer log's marker (answerLog): tend:log writes every line (decision 0235)`];
  });
}

/** An entry's class as the run's base holds it: `T [owner]`, `T [arch]`, `T [phone]`, `G`, else its bare letter. */
function classOf(entry, status) {
  const letter = String(entry)[0];
  if (letter === 'G') return 'G';
  const item = readInbox(status).items.find((i) => i.id === entry);
  return item?.tag ? `T [${item.tag}]` : letter;
}

/**
 * LB4: over `days` to `today`, each entry's latest answer per `by` (loop-budget audit 3): by class, the owner's answers
 * and their picks (a keep of a proxy yes, `confirms`, apart: never take-up); the proxy's yeses, and those no later
 * answer by the owner confirms; the answers logged before the marker, apart. A reading, never an actuator (0157).
 */
function answerTakeUp(runs, today, days = 30) {
  // Thirty days, one end open (loop-budget audit 28).
  const from = new Date(Date.parse(`${today}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);
  const latest = new Map();
  runs.forEach((r, k) => {
    if (typeof r?.date !== 'string' || r.date <= from || r.date > today) return;
    for (const a of r.answers ?? []) if (a?.entry) latest.set(`${a.entry}\u0000${a.by ?? ''}`, { ...a, at: k, date: r.date });
  });
  const byClass = {};
  const proxy = { yeses: 0, unconfirmed: [], confirmed: 0 };
  let unlogged = 0;
  const all = [...latest.values()];
  for (const a of all) {
    if (!a.by) unlogged += 1;
    else if (a.by === 'owner' && a.confirms === undefined) {
      const c = a.class ?? String(a.entry)[0];
      byClass[c] ??= { owner: 0, recommended: 0, other: 0, reshape: 0, no: 0 };
      byClass[c].owner += 1;
      if (PICKS.includes(a.pick)) byClass[c][a.pick] += 1;
    } else if (a.by === 'proxy' && a.answer === 'yes') {
      proxy.yeses += 1;
      // Only the owner's yes that names the proxy line's date keeps it (loop-budget audit 23).
      const kept = runs.some((r, k) => k > a.at && (r.answers ?? []).some((x) => x?.entry === a.entry && x.by === 'owner' && x.answer === 'yes' && x.confirms === a.date));
      if (kept) proxy.confirmed += 1;
      else proxy.unconfirmed.push(a.entry);
    }
  }
  return { days, byClass, proxy, unlogged };
}

/** The balance's printed reading (as `balance` prints it), with LB4's take-up last. */
function balanceJson({ r, t, days, runs, today }) {
  return {
    date: today,
    days,
    slicesGrown: t.slices,
    commits: { growth: t.growth, refinement: t.refinement, other: t.other },
    areas: r.areas,
    unseen: r.unseen,
    firstSweep: r.firstSweep,
    states: Object.fromEntries(Object.entries(r.states).filter(([, s]) => s.state !== 'unseen').map(([a, s]) => [a, `${s.state}: ${s.why.join('; ')}`])),
    share: r.share,
    open: r.open,
    inbox: r.inbox,
    unattributed: r.unattributed,
    unrated: r.unrated,
    reading: r.reading,
    propose: r.propose,
    why: r.why,
    evolve: r.evolve,
    answers: answerTakeUp(runs, today),
  };
}

const HAND = 'Open before the loop';
// An item that names the owner's own direction, a decision or their phone is for a look, not a move (audit 27).
const LOOK = /your direction|\bdecision \d{4}\b|on your phone/i;
/**
 * LB5 (decisions 0235, 0269): every item under "Needs the owner" ("Last tend" apart), dated by its own first date, else
 * its heading's (loop-budget audit 7), unanswered by its words outside struck-through text (audit 14): fourteen days or
 * more `wait`, thirty or more `move`, oldest first; "Open before the loop" is `hand`, waiting on the owner's hand with
 * its age, never moved (audit 6); `undated` and `phone` apart.
 */
function inboxAge(status, today) {
  const out = { wait: [], move: [], look: [], hand: [], undated: [], phone: [] };
  for (const i of readInbox(status).items) {
    const date = dateOf(i.text) ?? dateOf(i.section);
    const rec = { id: i.id, section: i.section, age: date ? daysFrom(date, today) : null, date, text: i.text };
    if (i.section === HAND) {
      if (date && rec.age >= 14) out.hand.push(rec);
      continue;
    }
    if (ANSWERED.test(i.text.replace(/~~[\s\S]*?~~/g, ' '))) continue;
    if (i.phone) out.phone.push(rec);
    else if (!date) out.undated.push(rec);
    else if (rec.age >= 30 && LOOK.test(i.text)) out.look.push(rec);
    else if (rec.age >= 30) out.move.push(rec);
    else if (rec.age >= 14) out.wait.push(rec);
  }
  for (const k of ['wait', 'move', 'look', 'hand']) out[k].sort((a, b) => b.age - a.age || a.section.localeCompare(b.section));
  return out;
}

// LB6: what a lease may hold: the skills (the run log and the ledger apart: every run writes them), the hooks, the
// agents, AGENTS.md and CLAUDE.md, CI, and the loop's own scripts.
const PROCESS = [
  /^\.claude\/skills\/(?!tend\/(ledger\.json|runs\.jsonl)$)/,
  /^\.claude\/(hooks|agents)\//,
  /^(AGENTS|CLAUDE)\.md$/,
  /^\.github\//,
  /^scripts\/(tend|records|bookkeeping|expectations)\.js$/,
];
const isProcess = (p) => PROCESS.some((re) => re.test(p));
const LEASE_MS = 24 * 60 * 60 * 1000;

/**
 * LB6: the leases of docs/STATUS.md's "In flight": a row whose Session cell starts `Lease:`, its Branch cell the
 * holder's branch, its Doing cell the held files in backticks, `from <YYYY-MM-DDTHH:MMZ>` and `lease <id>`, the id the
 * holder's commits carry as a `Lease: <id>` trailer (loop-budget audit 18). A file that is no process file is not held;
 * a row without its start or its id holds nothing.
 */
function leaseRows(status) {
  const lines = String(status).split('\n');
  const start = lines.findIndex((l) => /^## In flight\b/.test(l));
  if (start < 0) return [];
  const rows = [];
  for (const l of lines.slice(start + 1)) {
    if (/^## /.test(l)) break;
    if (!/^\|/.test(l)) continue;
    const cells = l.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 3 || !/^Lease:/.test(cells[0])) continue;
    const from = /\bfrom (\d{4}-\d\d-\d\dT\d\d:\d\dZ)/.exec(cells[2])?.[1];
    const id = /\blease ([a-z0-9][a-z0-9._-]*)/.exec(cells[2])?.[1];
    if (!from || !id) continue;
    const files = [...cells[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter(isProcess);
    rows.push({ files, from, id, branch: /`([^`]+)`/.exec(cells[1])?.[1] ?? cells[1] });
  }
  return rows;
}

const live = (row, date) => Date.parse(row.from) <= Date.parse(date) && Date.parse(date) < Date.parse(row.from) + LEASE_MS;
const until = (row) => new Date(Date.parse(row.from) + LEASE_MS).toISOString().slice(0, 16) + 'Z';
/** The lease id a commit carries: its `Lease: <id>` trailer line. */
const leaseOf = (message) => /^Lease:[ \t]*([a-z0-9][a-z0-9._-]*)[ \t]*$/im.exec(String(message))?.[1] ?? null;

/** LB6: an agent commit's changes to files another lease holds while live (the holder's commits carry its id). */
function leaseProblems({ files, date, lease, rows }) {
  const p = [];
  for (const row of rows.filter((x) => live(x, date) && x.id !== lease)) {
    for (const f of files.filter((x) => row.files.includes(x))) p.push(`changes ${f}, which the lease ${row.id} of ${row.branch} holds until ${until(row)} ("In flight", decision 0235): wait for it, or ask the owner to clear the row`);
  }
  return p;
}

/** A lease taken on a file another live lease holds (loop-budget audit 17). */
function leaseAddProblems({ added, rows, date }) {
  const p = [];
  for (const a of added) {
    for (const row of rows.filter((x) => x.id !== a.id && live(x, date))) {
      for (const f of a.files.filter((x) => row.files.includes(x))) p.push(`takes a lease on ${f}, which the lease ${row.id} of ${row.branch} holds until ${until(row)}: one holder at a time (decision 0235)`);
    }
  }
  return p;
}

/** The leases `after` no longer holds whole: a row gone, or kept with a held file dropped (loop-budget audit 20). */
function leaseRemoved(before, after) {
  return before.filter((b) => {
    const a = after.find((x) => x.id === b.id);
    return !a || b.files.some((f) => !a.files.includes(f));
  });
}

/**
 * LB6b (loop-budget audits 13, 19): a lease ends by its holder, by its lapse, or by an `inflight remove` (or `set`)
 * whose `--reason` in the commit's Records-Op trailer quotes the owner's words.
 */
function leaseRemovalProblems({ removed, date, lease, message }) {
  const reasons = [...String(message).matchAll(/^Records-Op: inflight (?:remove|set) .*?--reason ("(?:[^"\\]|\\.)*")/gm)].map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      return '';
    }
  });
  const owner = reasons.some((r) => /\bthe owner\b/.test(r) && /"[^"]+"/.test(r));
  return removed
    .filter((row) => row.id !== lease && live(row, date) && !owner)
    .map((row) => `ends the lease ${row.id} of ${row.branch} while it holds: only its holder (\`Lease: ${row.id}\`), its lapse, or an inflight remove whose --reason quotes the owner's words ends a lease (decision 0235)`);
}

if (require.main === module) {
  const [cmd, ...argv] = process.argv.slice(2);
  if (cmd === 'balance') balance(argv);
  else if (cmd === 'next') next(argv);
  else if (cmd === 'state') stateCmd(argv);
  else if (cmd === 'base') baseCmd(argv);
  else if (cmd === 'log') appendLog(argv);
  else if (cmd === 'commits') commits(argv);
  else if (cmd === 'e2e-due') e2eDue(argv);
  else if (cmd === 'compass') {
    const at = argv.indexOf('--runs');
    const n = at >= 0 ? Number(argv[at + 1]) : COMPASS_WINDOW;
    if (!Number.isInteger(n) || n < 2) {
      console.error('usage: node scripts/tend.js compass [--runs N], N a whole number, 2 at least');
      process.exit(2);
    }
    process.stdout.write(compassText(compassReading(readRuns(), n)));
  }
  else if (require('./bookkeeping').COMMANDS[cmd]) process.exitCode = require('./bookkeeping').main([cmd, ...argv]);
  else {
    console.error('usage: node scripts/tend.js balance [--days N] [--write] | next | state [<area>…] [--here | --at <commit>] [--json] | base <area>… | --spec <slug> [--here] | log <range> "<json>" | commits [--loop-only] <range> | e2e-due [--days N] [--json] | compass [--runs N] | next-decision | next-audit | files | landed | review-paths | items (scripts/bookkeeping.js)');
    process.exit(2);
  }
}

module.exports = { highClaims, highProblems, proxyBaseProblems, wordsProblems, logLineProblems, leaseAddProblems, leaseRemoved, reviewBudget, regressionClaims, addedLoopItems, filedProblems, lastWasRotation, rotationArea, nextPick, answerProblems, confirmProblems, classOf, answerTakeUp, balanceJson, inboxAge, leaseRows, leaseProblems, leaseRemovalProblems, isProcess, ROUGH_SHARE, areaState, deferredItems, beforeItems, readInbox, evolveDue, historyProblems, baseWarning, givenStateProblems, noSurfaceBuild, report, severityOf, areasNamed, compassReading, compassText, FORBIDDEN, LIMITS, STATES, classify, criteriaPrefixes, tally, readStatus, reading, nextArea, isLoops, dropBoundary, testName, tendCommitProblems, citedOwnEdits, rewritesBaseLines, mainOrHere, findingsOf, logProblems, runLine, fullPassDue, controlsIn, isRoute, resetsArea, readPatches };
