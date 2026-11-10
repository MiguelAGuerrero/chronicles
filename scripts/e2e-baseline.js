#!/usr/bin/env node
// Does this journey fail on `main` too? One answer, with evidence, instead of rerunning a flake on the branch.
//
//   npm run e2e:baseline -- <journey> [--runs N]     (N defaults to 3)
//
// Makes a scratch worktree of origin/main under .claude/worktrees/, exports its web build, runs the journey N times there, and
// removes the worktree. A check that failed on main is recorded in scripts/e2e/flaky.json with the commit, the date and how
// often it failed. The record only labels: a journey that fails on a branch still fails (nothing is skipped or quarantined),
// and a journey that never failed on main records nothing, so its failure on a branch is the branch's until shown otherwise.
// (scripts/e2e/economy.js, docs/TESTING.md "The e2e's economy".)

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const economy = require('./e2e/economy');
const { SCENARIOS } = require('./e2e-scenarios');

const ROOT = path.join(__dirname, '..');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function main(argv) {
  const journey = argv.find((a) => !a.startsWith('--'));
  const runsAt = argv.indexOf('--runs');
  const runs = runsAt >= 0 ? Number(argv[runsAt + 1]) : 3;
  if (!journey || !SCENARIOS.some((s) => s.name === journey) || !(runs >= 1)) {
    console.error(`usage: npm run e2e:baseline -- <journey> [--runs N]\njourneys: ${SCENARIOS.map((s) => s.name).join(', ')}`);
    process.exit(64);
  }
  git(ROOT, 'fetch', 'origin', 'main');
  const base = git(ROOT, 'rev-parse', '--short', 'origin/main');
  const dir = path.join(ROOT, '.claude', 'worktrees', `baseline-${journey}-${Date.now()}`);
  console.log(`baseline: ${journey} on origin/main (${base}), ${runs} run${runs === 1 ? '' : 's'}, in ${path.relative(ROOT, dir)}`);
  git(ROOT, 'worktree', 'add', '--detach', dir, 'origin/main');
  try {
    // A real directory, never a symlink (Metro bakes the path into asset URLs): hard links when the lock is the same.
    let sameLock = false;
    try {
      git(ROOT, 'diff', '--quiet', 'HEAD', 'origin/main', '--', 'package-lock.json');
      sameLock = true;
    } catch {
      // differs
    }
    if (sameLock && fs.existsSync(path.join(ROOT, 'node_modules'))) spawnSync('cp', ['-al', path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules')], { stdio: 'inherit' });
    else spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'inherit' });
    const exp = spawnSync('npm', ['run', 'export:web'], { cwd: dir, encoding: 'utf8' });
    if (exp.status !== 0) {
      console.error(`baseline: the export on main failed:\n${(exp.stdout + exp.stderr).split('\n').slice(-15).join('\n')}`);
      process.exit(1);
    }
    const outputs = [];
    for (let i = 1; i <= runs; i++) {
      const r = spawnSync('node', ['scripts/e2e-web.js'], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, E2E_ONLY: journey, E2E_FORCE: '1' } });
      const out = `${r.stdout}\n${r.stderr}`;
      outputs.push(out);
      console.log(`  run ${i}/${runs}: ${r.status === 0 ? 'passed' : `failed (${economy.parseFailures(out)[0] ?? 'see output'})`}`);
    }
    const s = economy.summarizeBaseline(outputs);
    if (!s.failed.length) {
      console.log(`baseline: ${journey} passed ${s.runs}/${s.runs} on main (${base}). It did not fail there: a failure on your branch is the branch's until shown otherwise.`);
      return;
    }
    let registry = economy.readFlaky(ROOT);
    const seen = new Date().toISOString().slice(0, 10);
    for (const f of s.failed) {
      registry = economy.addFlake(registry, journey, { check: f.check, fails: f.fails, base, seen });
      console.log(`baseline: on main (${base}) "${f.check}" failed ${f.fails}. Recorded in scripts/e2e/flaky.json (a label only: it still fails a run).`);
    }
    economy.writeFlaky(ROOT, registry);
  } finally {
    spawnSync('git', ['worktree', 'remove', '--force', dir], { cwd: ROOT, stdio: 'ignore' });
    spawnSync('git', ['worktree', 'prune'], { cwd: ROOT, stdio: 'ignore' });
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { main };
