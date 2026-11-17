#!/usr/bin/env node
// Every journey once: the weekly full pass (decision 0181; docs/TESTING.md, "Choosing the journeys", 6).
//
//   npm run e2e:all                       export the web build, run the full flow, then every journey it does not hold
//                                         by name, each with E2E_SOFT=1; rerun alone each journey with a failure
//   npm run e2e:all -- --only launch,atlas   those journeys by name only (`full` names the full flow, and with it a
//                                         journey the full flow holds is read from it, not run again)
//   npm run e2e:all -- --no-export        use the dist/ already exported
//   npm run e2e:all -- --out <dir>        where each run's output is kept (default: a new folder in the system's temp dir)
//
// The journeys come from where the harness defines them: scripts/e2e/journeys/ (scripts/e2e-scenarios.js) and the full
// flow's own list (`journeys` of scripts/e2e/journeys/full.js, whose `# journey: <name>` lines say whose checks follow).
// What it reads is each run's `ok - ` and `not ok - ` lines, never its exit code alone (E2E_SOFT goes on past a failed
// check and exits 0); a run that stops on an error counts as the check "the run stopped". A check that fails in the pass
// and again alone is red; one that passes in the other run is flaky; one the other run never reached stays red. Checks
// are compared without their measured values (the last parenthesised group), and matched against scripts/e2e/flaky.json
// the same way: a label, never an excuse (the e2e's economy, docs/TESTING.md).
//
// It prints one summary in a fixed order and the `npm run tend:log` line that records the pass (mode "e2e"), and exits 1
// when a check is red. The decisions are pure and exported for src/lib/__tests__/arch/e2eAll.test.ts; the runs are main().

const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STOPPED = 'the run stopped';
const MARK = /^# journey: (\S+)\s*$/;
const LINE = /^(not ok|ok) - (.*)$/;

/** A check without its measured values: "AT9: the ring frames it (Fox Point at (0, 2) px)" is "AT9: the ring frames it". */
function checkKey(text) {
  const s = text.replace(/\s+# TODO$/, '').trim();
  if (!s.endsWith(')')) return s;
  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (s[i] === ')') depth++;
    else if (s[i] === '(' && --depth === 0) return s.slice(0, i).trim() || s;
  }
  return s;
}

/** The short name a log line gives a check: its id before the colon ("AT9", "fix preview-clutter audit 1"), else its key. */
function checkId(text) {
  const m = /^([^:()]{1,80}):\s/.exec(text);
  return m ? m[1].trim() : checkKey(text).slice(0, 80);
}

const empty = () => ({ ok: [], notOk: [], stopped: null });

/**
 * One run's checks by journey. A by-name run is all `journey`'s; the full flow's lines go to the journey its last
 * `# journey:` line named (its closing checks to `full`). TODO checks are not tests and are left out. A run that did not
 * exit 0 stopped on an error: the journey it was in gets `stopped`, with the run's last error line.
 */
function parseRun({ journey, stdout = '', status = 0, stderr = '' }) {
  const out = {};
  let cur = journey;
  const at = (name) => (out[name] ??= empty());
  if (journey !== 'full') at(journey);
  for (const line of stdout.split('\n')) {
    const mark = MARK.exec(line);
    if (mark) {
      cur = mark[1];
      at(cur);
      continue;
    }
    const m = LINE.exec(line);
    if (!m || /\s# TODO$/.test(m[2])) continue;
    at(cur)[m[1] === 'ok' ? 'ok' : 'notOk'].push(m[2]);
  }
  if (status !== 0) {
    const last = stderr.split('\n').map((l) => l.trim()).filter(Boolean).pop() ?? `exit ${status}`;
    at(cur).stopped = last;
  }
  return out;
}

/**
 * What the pass runs: the full flow and every journey it does not hold, or with `only` those journeys by name (`full`
 * among them for the full flow). An unknown name is an error, listed.
 */
function plan({ all, fullJourneys, only }) {
  if (!only) return { full: true, byName: all.filter((n) => !fullJourneys.includes(n)).sort(), unknown: [] };
  const names = [...new Set(only)];
  const full = names.includes('full');
  // With the full flow, a journey it holds is read from it, never run a second time by name.
  const byName = names.filter((n) => n !== 'full' && all.includes(n) && !(full && fullJourneys.includes(n))).sort();
  return { full, byName, unknown: names.filter((n) => n !== 'full' && !all.includes(n)).sort() };
}

/** The full flow's journeys it never reached (it stopped before them): each runs alone in the pass. */
function unreached(fullRun, fullJourneys) {
  return fullJourneys.filter((n) => !fullRun[n]).sort();
}

/** A journey's failed checks, by key, with the text first seen; a stop is the check "the run stopped". */
function failures(r) {
  const f = new Map();
  if (!r) return f;
  for (const t of r.notOk) if (!f.has(checkKey(t))) f.set(checkKey(t), t);
  if (r.stopped) f.set(STOPPED, `${STOPPED}: ${r.stopped}`);
  return f;
}

/** Whether a run passed a check by key: an `ok` line, or for a stop, a run that did not stop. */
function passed(r, key) {
  if (!r) return false;
  if (key === STOPPED) return !r.stopped;
  return r.ok.some((t) => checkKey(t) === key);
}

/**
 * Red or flaky, per check of each journey that failed in the pass (`first`) and was run again alone (`rerun`): failed in
 * both is red; passed in the other is flaky; never reached by the other stays red. Sorted by journey, then check.
 */
function classify(first, rerun) {
  const red = [];
  const flaky = [];
  for (const journey of Object.keys(first).sort()) {
    const a = failures(first[journey]);
    if (!a.size) continue;
    const r = rerun[journey];
    const b = failures(r);
    const keys = [...new Set([...a.keys(), ...b.keys()])].sort();
    for (const key of keys) {
      const text = b.get(key) ?? a.get(key);
      const entry = { journey, check: checkId(text), text };
      if (a.has(key) && b.has(key)) red.push({ ...entry, why: 'failed in the pass and alone' });
      else if (a.has(key) && passed(r, key)) flaky.push({ ...entry, why: 'failed in the pass, passed alone' });
      else if (b.has(key) && passed(first[journey], key)) flaky.push({ ...entry, why: 'passed in the pass, failed alone' });
      else red.push({ ...entry, why: a.has(key) ? (r ? 'failed in the pass, not reached alone' : 'failed in the pass, not run alone') : 'failed alone, not reached in the pass' });
    }
  }
  return { red, flaky };
}

/** The flaky.json entry a check matches, by key: the same check failed on main. */
function knownFlake(registry, journey, text) {
  return (registry[journey] ?? []).find((e) => checkKey(e.check) === checkKey(text)) ?? null;
}

const quote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

/**
 * The pass's summary, in a fixed order, and the run log's line (mode "e2e"): `first` is each journey's run in the pass,
 * `rerun` each failing journey's run alone, `journeys` the journeys the pass ran (the full flow's own closing checks
 * apart), `full` whether it was every journey.
 */
function summarize({ base, full, journeys, first, rerun, registry = {}, minutes, dirty = false }) {
  const { red, flaky } = classify(first, rerun);
  const ok = Object.values(first).reduce((n, r) => n + r.ok.length, 0);
  const notOk = Object.values(first).reduce((n, r) => n + r.notOk.length + (r.stopped ? 1 : 0), 0);
  const lines = [];
  const what = full ? 'every journey' : journeys.join(', ');
  lines.push(`e2e:all on ${base}${dirty ? ' with uncommitted changes' : ''}: ${what}; ${journeys.length} journeys, ${ok} checks ok, ${notOk} not ok in the pass; ${red.length} red, ${flaky.length} flaky; ${minutes} min`);
  const width = Math.max(4, ...Object.keys(first).map((n) => n.length));
  for (const name of Object.keys(first).sort()) {
    const r = first[name];
    const tail = rerun[name] ? `; alone again: ${rerun[name].ok.length} ok, ${rerun[name].notOk.length} not ok${rerun[name].stopped ? ', stopped' : ''}` : '';
    lines.push(`  ${name.padEnd(width)}  ${r.ok.length} ok, ${r.notOk.length} not ok${r.stopped ? ', stopped' : ''}${tail}`);
  }
  for (const [label, list] of [['red', red], ['flaky', flaky]]) {
    for (const e of list) {
      const known = knownFlake(registry, e.journey, e.text);
      lines.push(`${label.padEnd(5)} ${e.journey}: ${e.check} (${e.why})${known ? ` [flaky.json: failed ${known.fails} on ${known.base}, ${known.seen}]` : ''}`);
      lines.push(`      ${e.text}`);
    }
  }
  const given = {
    mode: 'e2e',
    e2e: full ? 'full' : journeys,
    deploy: 'main',
    base,
    journeys: journeys.length,
    ok,
    red: red.map(({ journey, check }) => ({ journey, check })),
    flaky: flaky.map(({ journey, check }) => ({ journey, check })),
    minutes,
  };
  lines.push(`log: npm run tend:log -- origin/main..HEAD ${quote(JSON.stringify(given))}`);
  return { lines, given, red, flaky };
}

// ---------------------------------------------------------------------------------------------------------------------
// The runs

function arg(argv, name) {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
}

function runOnce(name, out, env) {
  const isFull = name === 'full';
  const started = Date.now();
  const r = spawnSync(process.execPath, ['scripts/e2e-web.js'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    timeout: (isFull ? 60 : 25) * 60 * 1000,
    env: { ...process.env, ...env, E2E_SOFT: '1', E2E_FORCE: '1', ...(isFull ? {} : { E2E_ONLY: name }) },
  });
  const stdout = r.stdout ?? '';
  const stderr = `${r.stderr ?? ''}${r.signal ? `\ntimed out: stopped by ${r.signal} after ${Math.round((Date.now() - started) / 60000)} min` : ''}`;
  fs.writeFileSync(path.join(out, `${name}.log`), `${stdout}\n--- stderr ---\n${stderr}`);
  const parsed = parseRun({ journey: name, stdout, status: r.status ?? 1, stderr });
  const mine = parsed[name] ?? empty();
  console.log(`e2e:all: ${name}: ${mine.ok.length} ok, ${mine.notOk.length} not ok${mine.stopped ? ', stopped' : ''}${isFull ? ' (its own closing checks)' : ''}, ${((Date.now() - started) / 60000).toFixed(1)} min`);
  return parsed;
}

function main(argv) {
  const { SCENARIOS } = require('./e2e-scenarios');
  const fullFlow = require('./e2e/journeys/full.js');
  const economy = require('./e2e/economy');
  const all = SCENARIOS.map((s) => s.name).sort();
  const onlyArg = arg(argv, '--only');
  const p = plan({ all, fullJourneys: fullFlow.journeys, only: onlyArg ? onlyArg.split(',').map((s) => s.trim()).filter(Boolean) : null });
  if (p.unknown.length || (onlyArg !== undefined && !p.full && !p.byName.length)) {
    console.error(`e2e:all: no such journey: ${p.unknown.join(', ') || '(none named)'}. One of: full, ${all.join(', ')}`);
    return 64;
  }
  const out = path.resolve(arg(argv, '--out') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-all-')));
  fs.mkdirSync(out, { recursive: true });
  const base = execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: ROOT, encoding: 'utf8' }).trim() !== '';
  const started = Date.now();
  console.log(`e2e:all: on ${base}, each run's output in ${out}`);
  if (!argv.includes('--no-export')) {
    const exp = spawnSync('npm', ['run', 'export:web'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(path.join(out, 'export.log'), `${exp.stdout}\n${exp.stderr}`);
    if (exp.status !== 0) {
      console.error(`e2e:all: the export failed; see ${path.join(out, 'export.log')}`);
      return 1;
    }
  }
  const first = {};
  if (p.full) Object.assign(first, runOnce('full', out));
  const alone = [...p.byName, ...(p.full ? unreached(first, fullFlow.journeys) : [])];
  for (const name of alone) Object.assign(first, { [name]: runOnce(name, out)[name] });
  const rerunDir = path.join(out, 'rerun');
  fs.mkdirSync(rerunDir, { recursive: true });
  const rerun = {};
  for (const name of Object.keys(first).sort()) {
    if (!failures(first[name]).size) continue;
    const again = runOnce(name, rerunDir);
    rerun[name] = again[name] ?? empty();
  }
  const journeys = Object.keys(first).filter((n) => n !== 'full').sort();
  const s = summarize({ base, full: p.full && !onlyArg, journeys, first, rerun, registry: economy.readFlaky(ROOT), minutes: Math.round((Date.now() - started) / 60000), dirty });
  console.log('');
  for (const l of s.lines) console.log(l);
  return s.red.length ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { STOPPED, checkKey, checkId, parseRun, plan, unreached, failures, classify, knownFlake, summarize };
