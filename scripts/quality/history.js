// What git knows that the import graph doesn't: files that change together.
// Two files in different features that keep landing in the same commits, with
// no import between them, share a concept the code doesn't name (a rule
// written twice, a contract kept by hand). Large commits (a rename, a sweep)
// are left out: they say nothing about coupling.

const { execFileSync } = require('child_process');

const MAX_FILES_PER_COMMIT = 12;

/** Commits as lists of current, non-test source files. */
function commitsTouching(root, exists) {
  let log;
  try {
    log = execFileSync('git', ['log', '--no-renames', '--name-only', '--format=@%h', '--', 'src'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch {
    return [];
  }
  const commits = [];
  let cur = null;
  for (const l of log.split('\n')) {
    if (l.startsWith('@')) commits.push((cur = []));
    else if (cur && l.trim() && exists(l)) cur.push(l);
  }
  return commits.filter((c) => c.length);
}

/**
 * Pairs of files in different features that change together in at least
 * `minCommits` commits and import nothing of each other. `confidence` is the
 * share of the rarer file's commits that also touch the other.
 */
function coChange(root, { exists, featuresOf, linked, minCommits = 6 }) {
  const commits = commitsTouching(root, exists);
  const count = new Map();
  const pair = new Map();
  for (const c of commits) {
    if (c.length > MAX_FILES_PER_COMMIT) continue;
    for (const f of c) count.set(f, (count.get(f) || 0) + 1);
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      const k = [c[i], c[j]].sort().join('\n');
      pair.set(k, (pair.get(k) || 0) + 1);
    }
  }
  const out = [];
  for (const [k, n] of pair) {
    if (n < minCommits) continue;
    const [a, b] = k.split('\n');
    const fa = featuresOf(a);
    const fb = featuresOf(b);
    if (!fa.length || !fb.length || fa.some((x) => fb.includes(x))) continue;
    if (linked(a, b)) continue;
    out.push({ a, b, commits: n, confidence: n / Math.min(count.get(a), count.get(b)) });
  }
  const spread = commits.map((c) => new Set(c.flatMap(featuresOf)).size).sort((x, y) => x - y);
  const q = (p) => spread[Math.floor(p * (spread.length - 1))] || 0;
  return {
    pairs: out.sort((x, y) => y.commits - x.commits || y.confidence - x.confidence),
    featuresPerCommit: { p50: q(0.5), p90: q(0.9), p99: q(0.99), commits: spread.length },
  };
}

module.exports = { coChange, commitsTouching };
