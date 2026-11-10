#!/usr/bin/env node
// The deploy's train (decision 0125): the e2e journeys of every branch that ships together, run once on one build, and each
// failure sent back to the branches whose files the failing journey covers.
//
//   npm run e2e:train -- <branch> [<branch> ...] [--base origin/main] [--root] [--force] [--keep] [--no-checks]
//
// A branch runs only the journeys it added or edited (`npm run check:e2e`); the journeys it reaches only through a shared file
// (walk.tsx alone is in twelve) are deferred to here, so seven sessions touching one screen do not run its twelve journeys seven
// times. The train:
//
//   1. merges the branches, in the order given, onto `--base` in a scratch worktree, on a new branch `train/<stamp>`; a
//      branch that conflicts is left out and said so;
//   2. runs the typecheck, lint and npm test once on the merged tree (branches green alone can break each other merged);
//   3. names each branch's journeys from its own diff against its merge base (comment-only changes left out, as check:e2e
//      does), and runs the union once, on the /chronicles build Pages serves (`--root`: the root build);
//   4. skips a journey that passed in an earlier train with its files as they are now (`--force` runs it), so a train run
//      again after dropping a red branch or after main moved reruns only what changed;
//   5. writes the report (.e2e-train/<stamp>/report.md, and each journey's log beside it) and prints it: each branch's red
//      journeys with their failed checks, the branches a failure is shared with, known flakes labelled (never skipped).
//
// All green: ship the tested commit with `git push origin train/<stamp>:main` (a fast-forward; /deploy). Anything red or
// left out: exit 1, nothing to ship until the owner drops the branch or it is fixed.
//
// The plan, the attribution and the report are pure (tests: src/lib/__tests__/arch/e2eEconomy.test.ts, "e2e economy 10").

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const economy = require('./e2e/economy');

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
 * Who each result belongs to. `results[name]` is { ok, failures: [check], flakes: [check] } or { skipped: 'green' }.
 * A red journey goes to every branch that named it; with more than one, each is told whom it shares it with, and a branch
 * whose own journey it is comes first (its edit is the likelier cause).
 */
function attribute(plan, results, order) {
  const out = new Map(order.map((b) => [b, { branch: b, red: [], green: [] }]));
  for (const j of plan) {
    const r = results[j.name];
    if (!r) continue;
    const names = j.branches.map((x) => x.branch);
    for (const x of j.branches) {
      const entry = out.get(x.branch);
      if (r.ok || r.skipped) entry.green.push(j.name);
      else entry.red.push({ journey: j.name, failures: r.failures, flakes: r.flakes ?? [], through: x.files, own: x.own, sharedWith: names.filter((n) => n !== x.branch) });
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
  const failedCheck = (t.checks ?? []).find((c) => !c.ok);
  if (failedCheck) {
    lines.push(`- **The branches do not pass together: ${failedCheck.name} fails on the merged tree** (log: ${failedCheck.log}). No journey ran. Each passes alone, so the break is between them: the branches whose files the log names are the ones to reconcile.`);
  }
  for (const x of t.excluded) lines.push(`- **${x.branch}: left out** (${x.why}).${x.conflict ? ` Rebase it on ${t.base} and run the train again.` : ''}`);
  for (const a of t.verdicts) {
    if (!a.red.length) {
      lines.push(`- **${a.branch}: green** (${a.green.length ? a.green.join(', ') : 'no journey covers it'}).`);
      continue;
    }
    lines.push(`- **${a.branch}: red**`);
    for (const r of a.red) {
      const shared = r.sharedWith.length ? `; shared with ${r.sharedWith.join(', ')}${r.own ? ' (the journey is this branch\'s own)' : ''}` : '';
      lines.push(`  - \`${r.journey}\`, named through ${r.through.join(', ')}${shared}. Log: ${t.logs[r.journey] ?? '(none)'}`);
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

/** A branch's commit: the local branch when there is one (it may be ahead of its push), else origin's. */
function resolve(branch) {
  tryGit(ROOT, 'fetch', 'origin', branch);
  for (const ref of [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`, branch]) {
    const sha = tryGit(ROOT, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
    if (sha) return sha;
  }
  return null;
}

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
  const branches = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--base');
  if (!branches.length) {
    console.error('usage: npm run e2e:train -- <branch> [<branch> ...] [--base origin/main] [--root] [--force] [--keep] [--no-checks]');
    process.exit(64);
  }
  if (base.startsWith('origin/')) tryGit(ROOT, 'fetch', 'origin', base.slice('origin/'.length));
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
    for (const b of branches) {
      const sha = resolve(b);
      if (!sha) {
        excluded.push({ branch: b, why: 'no such branch, here or on origin' });
        continue;
      }
      const r = spawnSync('git', ['merge', '--no-ff', '--no-edit', '-m', `Train ${stamp}: merge ${b}`, sha], { cwd: dir, encoding: 'utf8' });
      if (r.status !== 0) {
        const conflicts = tryGit(dir, 'diff', '--name-only', '--diff-filter=U') ?? '';
        spawnSync('git', ['merge', '--abort'], { cwd: dir, stdio: 'ignore' });
        excluded.push({ branch: b, conflict: true, why: conflicts ? `it does not merge onto the train: conflicts in ${conflicts.split('\n').join(', ')}` : (r.stderr || r.stdout).trim().split('\n')[0] });
        continue;
      }
      merged.push({ branch: b, sha, changed: branchChanges(sha, base) });
      console.log(`  merged ${b} (${sha.slice(0, 9)})`);
    }
    head = git(dir, 'rev-parse', '--short', 'HEAD');

    const { e2eFor } = require('./affected');
    const plan = trainPlan(merged, e2eFor);
    const results = {};
    const logs = {};
    // A real node_modules, never a symlink (Metro bakes the path into asset URLs): hard links when the lock is the same.
    const sameLock = tryGit(ROOT, 'diff', '--quiet', 'HEAD', head, '--', 'package-lock.json') !== null;
    if (sameLock && fs.existsSync(path.join(ROOT, 'node_modules'))) spawnSync('cp', ['-al', path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules')], { stdio: 'inherit' });
    else spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'inherit' });
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
        spawnSync('node', ['scripts/copy-maplibre-worker.js'], { cwd: dir, stdio: 'inherit' });
        const env = { ...process.env, ...(root ? {} : { CHRONICLES_BASE_URL: '/chronicles' }) };
        console.log(`train: exporting the ${root ? 'root' : '/chronicles'} build once`);
        const exp = spawnSync('npm', ['run', 'export:web'], { cwd: dir, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
        if (exp.status !== 0) {
          console.error(`train: the export failed:\n${(exp.stdout + exp.stderr).split('\n').slice(-20).join('\n')}`);
          process.exitCode = 1;
          return;
        }
      }
      for (const j of toRun) {
        const t0 = Date.now();
        const r = spawnSync('node', ['scripts/e2e-web.js'], {
          cwd: dir,
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
          env: { ...process.env, E2E_ONLY: j.name, ...(root ? {} : { E2E_BASE: '/chronicles' }), ...(force ? { E2E_FORCE: '1' } : {}) },
        });
        const out = `${r.stdout}\n${r.stderr}`;
        const log = path.join(outDir, `${j.name}.log`);
        fs.writeFileSync(log, out);
        logs[j.name] = path.relative(ROOT, log);
        const failures = economy.parseFailures(out);
        results[j.name] = { ok: r.status === 0, failures, flakes: failures.filter((f) => economy.flakeFor(flaky, j.name, f)) };
        console.log(`  ${j.name}: ${r.status === 0 ? 'passed' : `failed (${failures[0] ?? 'see the log'})`} in ${Math.round((Date.now() - t0) / 1000)} s`);
      }
      const after = path.join(dir, economy.GREEN_FILE);
      if (fs.existsSync(after)) fs.copyFileSync(after, cache);
    }
    const t = { stamp, base: `${base} (${baseSha})`, build: root ? 'root' : '/chronicles', trainBranch, head, plan, results, logs, merged, excluded, checks, verdicts: attribute(plan, results, merged.map((m) => m.branch)) };
    const report = describeTrain(t);
    fs.writeFileSync(path.join(outDir, 'report.md'), `${report}\n`);
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(t, null, 2)}\n`);
    console.log(`\n${report}\n\nReport: ${path.relative(ROOT, path.join(outDir, 'report.md'))}`);
    if (t.verdicts.some((a) => a.red.length) || excluded.length || !checksOk) process.exitCode = 1;
  } finally {
    if (!keep) {
      spawnSync('git', ['worktree', 'remove', '--force', dir], { cwd: ROOT, stdio: 'ignore' });
      spawnSync('git', ['worktree', 'prune'], { cwd: ROOT, stdio: 'ignore' });
    }
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { trainPlan, attribute, describeTrain };
