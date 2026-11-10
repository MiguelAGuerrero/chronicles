#!/usr/bin/env node
// Ready to ship (decision 0126): a branch says it is ready for the deploy's train by committing a marker, and the train finds
// the ready branches itself instead of reading STATUS.md.
//
//   npm run ready [-- --force "<why>"]     mark this branch ready: commit .ready/<branch>.json (then push it)
//   npm run e2e:train -- --list [--all]    the candidate branches, local and on origin, with their states (--all: the unmarked too)
//   npm run e2e:train -- --ready           the train of every branch marked ready
//
// The marker vouches for the commit it is made in: a branch is ready while the commit that last wrote its marker is still the
// branch's tip. A later commit makes it stale until it is marked again, so the train never ships work nobody vouched for.
// Marking refuses a dirty tree, and a branch whose own journeys (the ones it added or edited, `npm run check:e2e`) have not
// passed with their files as they are; `--force "<why>"` marks it anyway and records why. Each branch has its own marker file, so
// two never conflict, and the train removes them all before it tests, so none reaches main.
//
// Pure parts tested in src/lib/__tests__/arch/e2eEconomy.test.ts ("e2e economy 12").

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = '.ready';

// ---------------------------------------------------------------------------------------------------------------------
// Pure

/** The marker's path for a branch: one file per branch, slashes made safe. */
const markerPath = (branch) => `${DIR}/${branch.replace(/\//g, '__')}.json`;

/** Branches that are never candidates: main, the trains' own, HEAD. */
const isCandidateName = (name) => !!name && name !== 'main' && name !== 'HEAD' && !name.startsWith('train/');

/**
 * Which copy of a branch to take. `rel` says how the two relate: 'same', 'local-ahead' (origin is an ancestor of local),
 * 'origin-ahead', or 'diverged'. A copy that exists on one side only is that one.
 */
function pickCopy(local, origin, rel) {
  if (local && !origin) return { sha: local, from: 'local' };
  if (origin && !local) return { sha: origin, from: 'origin' };
  if (rel === 'same' || rel === 'local-ahead') return { sha: local, from: 'local' };
  if (rel === 'origin-ahead') return { sha: origin, from: 'origin' };
  return { sha: null, from: 'diverged' };
}

/**
 * A branch's state from its marker: 'ready' when the commit that last wrote the marker is the tip, 'stale' with the number of
 * commits made after it, 'none' with no marker.
 */
function readyState({ tip, markerCommit, after }) {
  if (!markerCommit) return { state: 'none' };
  if (markerCommit === tip) return { state: 'ready' };
  return { state: 'stale', after };
}

/** The listing `--list` prints: the ready, stale and diverged in full, the unmarked as a count unless `o.all`. */
function describeCandidates(list, o = {}) {
  if (!list.length) return 'No candidate branches: every branch is on main already, or there are none.';
  const say = (c) => {
    if (c.state === 'ready') return `ready (${c.from}, ${c.sha.slice(0, 9)}${c.marker?.journeys?.length ? `; ran ${c.marker.journeys.join(', ')}` : ''}${c.marker?.forced ? `; forced: ${c.marker.forced}` : ''})`;
    if (c.state === 'stale') return `stale: ${c.after} commit${c.after === 1 ? '' : 's'} after its marker; mark it again (npm run ready)`;
    if (c.state === 'diverged') return 'diverged: the local branch and origin\'s each have commits the other lacks';
    return 'not marked ready';
  };
  const unmarked = list.filter((c) => c.state === 'none');
  const shown = o.all ? list : list.filter((c) => c.state !== 'none');
  const lines = shown.map((c) => `  ${c.branch}: ${say(c)}`);
  if (!o.all && unmarked.length) lines.push(`  ${unmarked.length} more not marked ready (--all lists them).`);
  if (!lines.length) lines.push('  none');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------------------------------------------------
// Git

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return null;
  }
};
const isAncestor = (a, b) => tryGit('merge-base', '--is-ancestor', a, b) !== null;

function relation(local, origin) {
  if (local === origin) return 'same';
  if (isAncestor(origin, local)) return 'local-ahead';
  if (isAncestor(local, origin)) return 'origin-ahead';
  return 'diverged';
}

/** One branch's copy and state at its tip (`fetch` false when the caller fetched already). */
function inspect(branch, base = 'origin/main', fetch = true) {
  if (fetch) tryGit('fetch', 'origin', branch);
  const local = tryGit('rev-parse', '--verify', '--quiet', `refs/heads/${branch}^{commit}`);
  const origin = tryGit('rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}^{commit}`);
  if (!local && !origin) return { branch, state: 'missing', sha: null };
  const pick = pickCopy(local, origin, local && origin ? relation(local, origin) : null);
  if (!pick.sha) return { branch, state: 'diverged', sha: null, from: pick.from };
  const merged = isAncestor(pick.sha, base);
  const marker = markerPath(branch);
  const markerCommit = tryGit('log', '-1', '--format=%H', pick.sha, '--', marker) || null;
  const present = markerCommit && tryGit('cat-file', '-e', `${pick.sha}:${marker}`) !== null;
  const after = present && markerCommit !== pick.sha ? Number(tryGit('rev-list', '--count', `${markerCommit}..${pick.sha}`)) : 0;
  let content = null;
  if (present) {
    try {
      content = JSON.parse(git('show', `${pick.sha}:${marker}`));
    } catch {
      content = null;
    }
  }
  return { branch, sha: pick.sha, from: pick.from, merged, marker: content, ...readyState({ tip: pick.sha, markerCommit: present ? markerCommit : null, after }) };
}

/** Every candidate branch, local and on origin, not yet on the base, with its state. */
function candidates(base = 'origin/main') {
  tryGit('fetch', 'origin', '--prune');
  const names = new Set();
  for (const n of (tryGit('for-each-ref', '--format=%(refname:short)', 'refs/heads') ?? '').split('\n')) if (isCandidateName(n)) names.add(n);
  for (const n of (tryGit('for-each-ref', '--format=%(refname:lstrip=3)', 'refs/remotes/origin') ?? '').split('\n')) if (isCandidateName(n)) names.add(n);
  return [...names]
    .sort()
    .map((n) => inspect(n, base, false))
    .filter((c) => c.state !== 'missing' && !c.merged);
}

// ---------------------------------------------------------------------------------------------------------------------
// Marking a branch ready

function mark(argv) {
  const forceAt = argv.indexOf('--force');
  const forced = forceAt >= 0 ? argv[forceAt + 1] : null;
  if (forceAt >= 0 && !forced) {
    console.error('--force needs a reason: npm run ready -- --force "<why>"');
    process.exit(64);
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (!isCandidateName(branch)) {
    console.error(`ready: ${branch} is not a branch that ships through the train.`);
    process.exit(1);
  }
  const dirty = git('status', '--porcelain');
  if (dirty) {
    console.error(`ready: commit or drop what is uncommitted first; a marker vouches for a commit, not a working tree:\n${dirty}`);
    process.exit(1);
  }
  const affected = require('./affected');
  const { base, all, changes } = affected.changedFiles(ROOT);
  const { real } = affected.splitComment(ROOT, base, affected.changedPaths(changes));
  const green = affected.greenStatus(ROOT);
  const named = affected.e2eFor(real).scenarios;
  const own = named.filter((s) => s.own).map((s) => s.name);
  const notGreen = own.filter((n) => green(n) !== 'green');
  if (notGreen.length && !forced) {
    console.error(`ready: these journeys of yours have not passed with their files as they are: ${notGreen.join(', ')}.\n  npm run export:web, then E2E_ONLY=<journey> npm run e2e:web for each; or npm run ready -- --force "<why>".`);
    process.exit(1);
  }
  const marker = {
    branch,
    vouches: git('rev-parse', 'HEAD'),
    journeys: own,
    deferred: named.filter((s) => !s.own).map((s) => s.name),
    ...(forced ? { forced, notGreen } : {}),
    ...(all ? { note: 'no main branch to compare with' } : {}),
  };
  const file = markerPath(branch);
  fs.mkdirSync(path.join(ROOT, DIR), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), `${JSON.stringify(marker, null, 2)}\n`);
  git('add', file);
  git('commit', '-m', `Ready: ${branch} for the deploy's train (journeys run: ${own.join(', ') || 'none'})`);
  console.log(`ready: ${branch} marked at ${git('rev-parse', '--short', 'HEAD')} (${file}). Push it (git push) so the train can see it; any later commit makes it stale.`);
}

if (require.main === module) mark(process.argv.slice(2));

module.exports = { DIR, markerPath, isCandidateName, pickCopy, readyState, describeCandidates, inspect, candidates };
