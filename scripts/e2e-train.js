#!/usr/bin/env node
// The deploy's train (decision 0125): the e2e journeys of every branch that ships together, run once on one build, and each
// failure sent back to the branches whose files the failing journey covers.
//
//   npm run e2e:train -- <branch> [<branch> ...] [--base origin/main] [--root] [--force] [--keep] [--no-checks] [--no-isolate]
//   npm run e2e:train -- --ready     the branches marked ready (npm run ready; decision 0126), local or on origin, whichever is ahead
//   npm run e2e:train -- --list      the candidate branches and their states, and nothing else (--all: the unmarked too)
//
// A branch runs only the journeys it added or edited (`npm run check:e2e`); the journeys it reaches only through a shared file
// (walk.tsx alone is in twelve) are deferred to here, so seven sessions touching one screen do not run its twelve journeys seven
// times. The train:
//
//   1. merges the branches, in the order given, onto `--base` in a scratch worktree, on a new branch `train/<stamp>`; a
//      branch that conflicts is left out and said so; the ready markers are removed in one last commit, so none reaches main;
//   2. runs the typecheck, lint and npm test once on the merged tree (branches green alone can break each other merged);
//   3. names each branch's journeys from its own diff against its merge base (comment-only changes left out, as check:e2e
//      does), and runs the union once, on the /chronicles build Pages serves (`--root`: the root build);
//   4. skips a journey that passed in an earlier train with its files as they are now (`--force` runs it), so a train run
//      again after dropping a red branch or after main moved reruns only what changed;
//   5. isolates a failure two or more branches could have caused (decision 0126): main with each of them alone, that journey
//      only, one export per branch; it is the branch's whose run alone fails, and "only together" when none does
//      (`--no-isolate` skips it);
//   6. writes the report (.e2e-train/<stamp>/report.md, and each journey's log beside it) and prints it: each branch's red
//      journeys with their failed checks, what isolation found, known flakes labelled (never skipped).
//
// All green: ship the tested commit with `git push origin train/<stamp>:main` (a fast-forward; /deploy). Anything red or
// left out: exit 1, nothing to ship until the owner drops the branch or it is fixed.
//
// The plan, the attribution and the report are pure (tests: src/lib/__tests__/arch/e2eEconomy.test.ts, "e2e economy 10").

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const economy = require('./e2e/economy');
const ready = require('./ready');

const ROOT = path.join(__dirname, '..');
const OUT = '.e2e-train';

// ---------------------------------------------------------------------------------------------------------------------
// Pure

/**
 * The train's journeys: the union of what each branch's changes name, each with the branches that named it and through
 * which files. `branches` is [{ branch, changed }] with the comment-only changes already left out.
 */
function trainPlan(branches, e2eFor) {
  const byJourney = new Map();
  for (const b of branches) {
    for (const s of e2eFor(b.changed).scenarios) {
      if (!byJourney.has(s.name)) byJourney.set(s.name, { name: s.name, branches: [] });
      byJourney.get(s.name).branches.push({ branch: b.branch, files: s.files, own: !!s.own });
    }
  }
  return [...byJourney.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * What isolation found for one red journey, from its runs with each candidate branch alone on the base (`alone[branch]` true
 * when it passed): the branches whose run alone fails are its culprits; when none fails alone, it fails only with them together
 * (an interaction, or a flake), and it stays with all of them.
 */
function isolationOf(alone) {
  const ran = Object.keys(alone);
  const culprits = ran.filter((b) => alone[b] === false);
  return culprits.length ? { culprits, cleared: ran.filter((b) => alone[b] === true), together: false } : { culprits: ran, cleared: [], together: true };
}

/**
 * Who each result belongs to. `results[name]` is { ok, failures: [check], flakes: [check] } or { skipped: 'green' }.
 * A red journey goes to every branch that named it, the one that edited the journey marked; with isolation runs for it
 * (`isolation[name][branch]`, true when it passed alone), only to the branches isolation blames, and a branch it clears
 * hears that it was cleared.
 */
function attribute(plan, results, order, isolation = {}) {
  const out = new Map(order.map((b) => [b, { branch: b, red: [], green: [], cleared: [] }]));
  for (const j of plan) {
    const r = results[j.name];
    if (!r) continue;
    const names = j.branches.map((x) => x.branch);
    const iso = isolation[j.name] && !r.ok && !r.skipped ? isolationOf(isolation[j.name]) : null;
    for (const x of j.branches) {
      const entry = out.get(x.branch);
      if (r.ok || r.skipped) entry.green.push(j.name);
      else if (iso && iso.cleared.includes(x.branch)) entry.cleared.push({ journey: j.name, culprits: iso.culprits });
      else
        entry.red.push({
          journey: j.name,
          failures: r.failures,
          flakes: r.flakes ?? [],
          through: x.files,
          own: x.own,
          sharedWith: (iso ? iso.culprits : names).filter((n) => n !== x.branch),
          isolated: iso ? (iso.together ? 'together' : 'alone') : null,
        });
    }
  }
  return [...out.values()];
}

/** The report, in Markdown: what shipped together, then each branch's verdict. */
function describeTrain(t) {
  const lines = [`# e2e train ${t.stamp}`, '', `Base ${t.base}; ${t.build} build; train branch \`${t.trainBranch}\` at ${t.head ?? '(none)'}.`, ''];
  const ran = t.plan.filter((j) => t.results[j.name] && !t.results[j.name].skipped);
  const skipped = t.plan.filter((j) => t.results[j.name]?.skipped);
  lines.push(`Journeys: ${t.plan.length} named across ${t.merged.length} branch${t.merged.length === 1 ? '' : 'es'}; ${ran.length ? `${ran.length} ran once each` : 'none ran'}${skipped.length ? `, ${skipped.length} already green with their files unchanged (${skipped.map((j) => j.name).join(', ')})` : ''}.`);
  lines.push('');
  const unmarked = (t.merged ?? []).filter((m) => m.ready && m.ready !== 'ready').map((m) => `${m.branch} (${m.ready === 'stale' ? 'its marker is stale' : 'no marker'})`);
  if (unmarked.length) lines.push(`Named by hand, not marked ready (npm run ready): ${unmarked.join(', ')}.`, '');
  const failedCheck = (t.checks ?? []).find((c) => !c.ok);
  if (failedCheck) {
    lines.push(`- **The branches do not pass together: ${failedCheck.name} fails on the merged tree** (log: ${failedCheck.log}). No journey ran. Each passes alone, so the break is between them: the branches whose files the log names are the ones to reconcile.`);
  }
  for (const x of t.excluded) lines.push(`- **${x.branch}: left out** (${x.why}).${x.conflict ? ` Rebase it on ${t.base} and run the train again.` : ''}`);
  for (const a of t.verdicts) {
    const cleared = (a.cleared ?? []).map((c) => `\`${c.journey}\` failed in the train but passed with this branch alone (it is ${c.culprits.join(', ')}'s)`);
    if (!a.red.length) {
      const passed = a.green.length ? a.green.join(', ') : cleared.length ? 'no journey of its own failed' : 'no journey covers it';
      lines.push(`- **${a.branch}: green** (${passed})${cleared.length ? `; cleared: ${cleared.join('; ')}` : ''}.`);
      continue;
    }
    lines.push(`- **${a.branch}: red**`);
    for (const c of cleared) lines.push(`  - cleared: ${c}`);
    for (const r of a.red) {
      const shared = r.sharedWith.length ? `; shared with ${r.sharedWith.join(', ')}${r.own ? ' (the journey is this branch\'s own)' : ''}` : '';
      const iso =
        r.isolated === 'alone'
          ? ' Isolated: it fails with this branch alone on the base.'
          : r.isolated === 'together'
            ? ` Isolated: it passes with each branch alone and fails only with ${r.sharedWith.join(', ')} together: an interaction between them, or a flake (one rerun of the train tells).`
            : '';
      lines.push(`  - \`${r.journey}\`, named through ${r.through.join(', ')}${shared}.${iso} Log: ${t.logs[r.journey] ?? '(none)'}`);
      for (const f of r.failures) lines.push(`    - FAILED: ${f}${r.flakes.includes(f) ? ' (known flake: it failed on main too, scripts/e2e/flaky.json; it still fails the run)' : ''}`);
      if (!r.failures.length) lines.push('    - it exited non-zero with no FAILED line: read the log.');
      lines.push(`    - Reproduce on the branch: \`npm run export:web && E2E_ONLY=${r.journey} npm run e2e:web\``);
    }
  }
  lines.push('');
  const red = t.verdicts.some((a) => a.red.length) || t.excluded.length || failedCheck;
  lines.push(
    red
      ? 'Not shippable as is. Send each red branch its section; ship the green ones by running the train again without the red (journeys whose files did not change are not rerun).'
      : `All green. Ship the tested commit: \`git push origin ${t.trainBranch}:main\` (a fast-forward; if main moved, run the train again).`,
  );
  return lines.join('\n');
}

// ---------------------------------------------------------------------------------------------------------------------
// The run

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
const tryGit = (cwd, ...args) => {
  try {
    return git(cwd, ...args);
  } catch {
    return null;
  }
};
const slug = (b) => b.replace(/[^\w.-]+/g, '_');

/** What a branch changes against its merge base with the train's base, comment-only edits left out. */
function branchChanges(sha, base) {
  const { changedPaths } = require('./affected');
  const mb = git(ROOT, 'merge-base', sha, base);
  const changes = git(ROOT, 'diff', '--name-status', '-M', mb, sha)
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [st, a, b] = l.split('\t');
      return st.startsWith('R') ? { path: b, from: a } : { path: st.startsWith('C') ? b : a };
    });
  const paths = changedPaths(changes);
  const show = (rev) => (p) => tryGit(ROOT, 'show', `${rev}:${p}`);
  return economy.meaningfulPaths(paths, show(mb), show(sha));
}

/** Merge one branch's commit into the worktree, or say why it does not merge. */
function mergeInto(dir, branch, sha, stamp) {
  const r = spawnSync('git', ['merge', '--no-ff', '--no-edit', '-m', `Train ${stamp}: merge ${branch}`, sha], { cwd: dir, encoding: 'utf8' });
  if (r.status === 0) return null;
  const conflicts = tryGit(dir, 'diff', '--name-only', '--diff-filter=U') ?? '';
  spawnSync('git', ['merge', '--abort'], { cwd: dir, stdio: 'ignore' });
  return { conflict: true, why: conflicts ? `it does not merge onto the train: conflicts in ${conflicts.split('\n').join(', ')}` : (r.stderr || r.stdout).trim().split('\n')[0] };
}

/** The ready markers go in one last commit, so none reaches main. */
function clearMarkers(dir, stamp) {
  if (!fs.existsSync(path.join(dir, ready.DIR))) return;
  spawnSync('git', ['rm', '-q', '-r', '--ignore-unmatch', ready.DIR], { cwd: dir, stdio: 'ignore' });
  if (tryGit(dir, 'diff', '--cached', '--quiet') === null) git(dir, 'commit', '-q', '-m', `Train ${stamp}: clear the ready markers`);
}

/** A real node_modules, never a symlink (Metro bakes the path into asset URLs): hard links when the lock is the same. */
function installInto(dir) {
  const sameLock = tryGit(ROOT, 'diff', '--quiet', 'HEAD', git(dir, 'rev-parse', 'HEAD'), '--', 'package-lock.json') !== null;
  if (sameLock && fs.existsSync(path.join(ROOT, 'node_modules'))) spawnSync('cp', ['-al', path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules')], { stdio: 'inherit' });
  else spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'inherit' });
}

/** The web build, once per worktree, with the map's worker a hard-linked node_modules lacks. Null, or the export's last lines. */
function exportIn(dir, root) {
  spawnSync('node', ['scripts/copy-maplibre-worker.js'], { cwd: dir, stdio: 'inherit' });
  const env = { ...process.env, ...(root ? {} : { CHRONICLES_BASE_URL: '/chronicles' }) };
  const exp = spawnSync('npm', ['run', 'export:web'], { cwd: dir, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  return exp.status === 0 ? null : (exp.stdout + exp.stderr).split('\n').slice(-20).join('\n');
}

/** One journey on the worktree's build; its output goes to `log`. */
function runJourney(dir, name, root, force, log) {
  const r = spawnSync('node', ['scripts/e2e-web.js'], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, E2E_ONLY: name, ...(root ? {} : { E2E_BASE: '/chronicles' }), ...(force ? { E2E_FORCE: '1' } : {}) },
  });
  const out = `${r.stdout}\n${r.stderr}`;
  fs.writeFileSync(log, out);
  return { ok: r.status === 0, failures: economy.parseFailures(out) };
}

const removeWorktree = (dir) => {
  spawnSync('git', ['worktree', 'remove', '--force', dir], { cwd: ROOT, stdio: 'ignore' });
  spawnSync('git', ['worktree', 'prune'], { cwd: ROOT, stdio: 'ignore' });
};

/**
 * Isolation (decision 0126): each red journey two or more branches named, run on the base with each of those branches alone.
 * One worktree and one export per branch, running every such journey that branch named. Returns isolation[journey][branch].
 */
function isolate(plan, results, merged, o) {
  const shared = plan.filter((j) => results[j.name] && !results[j.name].ok && !results[j.name].skipped && j.branches.length > 1);
  const isolation = {};
  if (!shared.length) return isolation;
  const byBranch = new Map();
  for (const j of shared) for (const x of j.branches) byBranch.set(x.branch, [...(byBranch.get(x.branch) ?? []), j.name]);
  console.log(`train: isolating ${shared.map((j) => j.name).join(', ')}: main with each of ${[...byBranch.keys()].join(', ')} alone`);
  for (const [branch, journeys] of byBranch) {
    const m = merged.find((x) => x.branch === branch);
    const dir = path.join(ROOT, '.claude', 'worktrees', `train-${o.stamp}-alone-${slug(branch)}`);
    git(ROOT, 'worktree', 'add', '--detach', dir, o.base);
    try {
      if (mergeInto(dir, branch, m.sha, o.stamp)) continue;
      clearMarkers(dir, o.stamp);
      installInto(dir);
      const failed = exportIn(dir, o.root);
      if (failed) {
        console.error(`train: the export with ${branch} alone failed; ${journeys.join(', ')} not isolated for it:\n${failed}`);
        continue;
      }
      for (const name of journeys) {
        const log = path.join(o.outDir, `${name}.alone.${slug(branch)}.log`);
        const r = runJourney(dir, name, o.root, true, log);
        (isolation[name] ??= {})[branch] = r.ok;
        console.log(`  ${name} with ${branch} alone: ${r.ok ? 'passed' : `failed (${r.failures[0] ?? 'see the log'})`}`);
      }
    } finally {
      removeWorktree(dir);
    }
  }
  return isolation;
}

function main(argv) {
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : null;
  };
  const base = opt('--base') ?? 'origin/main';
  const root = argv.includes('--root');
  const force = argv.includes('--force');
  const keep = argv.includes('--keep');
  const noChecks = argv.includes('--no-checks');
  const noIsolate = argv.includes('--no-isolate');
  if (base.startsWith('origin/')) tryGit(ROOT, 'fetch', 'origin', base.slice('origin/'.length));

  let branches = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--base');
  if (argv.includes('--list') || argv.includes('--ready')) {
    const list = ready.candidates(base);
    console.log(`Candidates for the train (not on ${base} yet):\n${ready.describeCandidates(list, { all: argv.includes('--all') })}`);
    if (argv.includes('--list')) return;
    branches = [...branches, ...list.filter((c) => c.state === 'ready').map((c) => c.branch)];
    if (!branches.length) {
      console.log('train: no branch is marked ready (npm run ready on the branch, then push).');
      return;
    }
  }
  if (!branches.length) {
    console.error('usage: npm run e2e:train -- <branch> [<branch> ...] | --ready | --list  [--base origin/main] [--root] [--force] [--keep] [--no-checks] [--no-isolate]');
    process.exit(64);
  }
  const baseSha = git(ROOT, 'rev-parse', '--short', base);

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
  const trainBranch = `train/${stamp}`;
  const outDir = path.join(ROOT, OUT, stamp);
  fs.mkdirSync(outDir, { recursive: true });
  const dir = path.join(ROOT, '.claude', 'worktrees', `train-${stamp}`);
  console.log(`train: ${branches.length} branch${branches.length === 1 ? '' : 'es'} onto ${base} (${baseSha}) in ${path.relative(ROOT, dir)}`);
  git(ROOT, 'worktree', 'add', '-b', trainBranch, dir, base);

  const merged = [];
  const excluded = [];
  let head = null;
  try {
    for (const b of [...new Set(branches)]) {
      const c = ready.inspect(b, base);
      if (!c.sha) {
        excluded.push({ branch: b, why: c.state === 'diverged' ? 'the local branch and origin\'s have diverged; push or pull it first' : 'no such branch, here or on origin' });
        continue;
      }
      const no = mergeInto(dir, b, c.sha, stamp);
      if (no) {
        excluded.push({ branch: b, ...no });
        continue;
      }
      merged.push({ branch: b, sha: c.sha, ready: c.state, changed: branchChanges(c.sha, base) });
      console.log(`  merged ${b} (${c.from} ${c.sha.slice(0, 9)}${c.state === 'ready' ? ', marked ready' : `, not marked ready: ${c.state}`})`);
    }
    clearMarkers(dir, stamp);
    head = git(dir, 'rev-parse', '--short', 'HEAD');

    const { e2eFor } = require('./affected');
    const plan = trainPlan(merged, e2eFor);
    const results = {};
    const logs = {};
    let isolation = {};
    installInto(dir);
    // Branches green alone can break each other merged (one renames what another imports): the merged tree's typecheck,
    // lint and unit tests, once, before any browser minute (--no-checks when the owner ran them on this very commit).
    const checks = [];
    if (!noChecks) {
      for (const [name, cmd] of [['typecheck', ['run', 'typecheck']], ['lint', ['run', 'lint']], ['npm test', ['test']]]) {
        const r = spawnSync('npm', cmd, { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
        const log = path.join(outDir, `${name.replace(' ', '-')}.log`);
        fs.writeFileSync(log, `${r.stdout}\n${r.stderr}`);
        checks.push({ name, ok: r.status === 0, log: path.relative(ROOT, log) });
        console.log(`  ${name} on the merged tree: ${r.status === 0 ? 'passed' : 'failed'}`);
        if (r.status !== 0) break;
      }
    }
    const checksOk = checks.every((c) => c.ok);
    if (plan.length && checksOk) {
      console.log(`train: ${plan.length} journey${plan.length === 1 ? '' : 's'} named: ${plan.map((j) => j.name).join(', ')}`);
      // The trains' own green cache: a journey green in an earlier train with its files as they are is not run again,
      // and when none is left to run there is no export either.
      const cache = path.join(ROOT, OUT, 'green.json');
      if (fs.existsSync(cache)) fs.copyFileSync(cache, path.join(dir, economy.GREEN_FILE));
      const { SCENARIOS } = require('./e2e-scenarios');
      const greens = economy.readGreen(dir);
      const flaky = economy.readFlaky(ROOT);
      const toRun = [];
      for (const j of plan) {
        const journey = SCENARIOS.find((x) => x.name === j.name);
        if (!force && journey && economy.isGreenSince(greens, j.name, economy.keys(dir, journey, { build: 'unused' }))) {
          results[j.name] = { skipped: 'green' };
          console.log(`  ${j.name}: already green in an earlier train, its files unchanged (--force runs it)`);
        } else toRun.push(j);
      }
      if (toRun.length) {
        console.log(`train: exporting the ${root ? 'root' : '/chronicles'} build once`);
        const failed = exportIn(dir, root);
        if (failed) {
          console.error(`train: the export failed:\n${failed}`);
          process.exitCode = 1;
          return;
        }
      }
      for (const j of toRun) {
        const t0 = Date.now();
        const log = path.join(outDir, `${j.name}.log`);
        const r = runJourney(dir, j.name, root, force, log);
        logs[j.name] = path.relative(ROOT, log);
        results[j.name] = { ok: r.ok, failures: r.failures, flakes: r.failures.filter((f) => economy.flakeFor(flaky, j.name, f)) };
        console.log(`  ${j.name}: ${r.ok ? 'passed' : `failed (${r.failures[0] ?? 'see the log'})`} in ${Math.round((Date.now() - t0) / 1000)} s`);
      }
      const after = path.join(dir, economy.GREEN_FILE);
      if (fs.existsSync(after)) fs.copyFileSync(after, cache);
      if (!noIsolate) isolation = isolate(plan, results, merged, { stamp, base, root, outDir });
    }
    const t = { stamp, base: `${base} (${baseSha})`, build: root ? 'root' : '/chronicles', trainBranch, head, plan, results, logs, merged, excluded, checks, isolation, verdicts: attribute(plan, results, merged.map((m) => m.branch), isolation) };
    const report = describeTrain(t);
    fs.writeFileSync(path.join(outDir, 'report.md'), `${report}\n`);
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(t, null, 2)}\n`);
    console.log(`\n${report}\n\nReport: ${path.relative(ROOT, path.join(outDir, 'report.md'))}`);
    if (t.verdicts.some((a) => a.red.length) || excluded.length || !checksOk) process.exitCode = 1;
  } finally {
    if (!keep) removeWorktree(dir);
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { trainPlan, isolationOf, attribute, describeTrain };
