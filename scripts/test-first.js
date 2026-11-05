#!/usr/bin/env node
// Test-first, read from the history (specs/test-organization, TG24).
//
//   npm run check:test-first <spec>
//
// On the branch (the commits since the merge base with origin/main, or main), each live criterion of
// specs/<spec>/spec.md must first be named by a todo test (`test('XX1: ...', { todo: 'test first' }, ...)`
// or `check.todo(ok, 'XX1: ...')`) in an earlier commit than the one where a real test names it. So
// the failing tests were committed before the code that makes them pass. Ids retired or untested on
// purpose (scripts/features.js) are skipped. Exit 1 names each id that skipped it.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.env.TEST_FIRST_ROOT ? path.resolve(process.env.TEST_FIRST_ROOT) : path.join(__dirname, '..');
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

const ID = /\b([A-Z]{1,3})(\d+)\b/g;
const TODO = /\{\s*todo\s*:|\bcheck\.todo\(/;
const REAL = /\b(test|it|step|qstep|check)\(/;

/**
 * For each id, whether a todo naming it came first (pure). `commits` are oldest first, each with the
 * test lines naming ids as they stood at that commit.
 */
function testFirst(ids, commits) {
  return ids.map((id) => {
    const re = new RegExp(`\\b${id}\\b`);
    let firstTodo = -1;
    let firstReal = -1;
    commits.forEach((c, i) => {
      for (const line of c.lines) {
        if (!re.test(line)) continue;
        if (TODO.test(line)) { if (firstTodo < 0) firstTodo = i; }
        else if (REAL.test(line) && firstReal < 0) firstReal = i;
      }
    });
    if (firstReal < 0) return { id, ok: false, why: firstTodo < 0 ? 'no test names it' : `still a todo at ${commits.at(-1).sha}: make it a real test with the code` };
    if (firstTodo < 0) return { id, ok: false, why: `its test at ${commits[firstReal].sha} was never a todo first: the test came with the code` };
    if (firstTodo === firstReal) return { id, ok: false, why: `its todo and its real test arrived in the same commit (${commits[firstReal].sha}), which shows no order` };
    if (firstTodo > firstReal) return { id, ok: false, why: `its real test (${commits[firstReal].sha}) came before its todo` };
    return { id, ok: true, why: `todo at ${commits[firstTodo].sha}, real at ${commits[firstReal].sha}` };
  });
}

function base() {
  for (const ref of [process.env.TEST_FIRST_BASE, 'origin/main', 'main'].filter(Boolean)) {
    try {
      return git('merge-base', 'HEAD', ref).trim();
    } catch {
      // next
    }
  }
  return null;
}

/** The lines naming an id in the test files at a commit: the unit tests and the e2e journeys. */
function testLines(sha) {
  let out = '';
  try {
    out = git('grep', '-hE', '[A-Z][0-9]', sha, '--', 'src/lib/__tests__', 'scripts/e2e');
  } catch {
    return [];
  }
  return out.split('\n').filter(Boolean);
}

function main(argv) {
  const slug = argv[0];
  if (!slug) {
    console.error('usage: npm run check:test-first <spec>');
    process.exit(64);
  }
  const specFile = path.join(ROOT, 'specs', slug, 'spec.md');
  if (!fs.existsSync(specFile)) {
    console.error(`No spec at specs/${slug}/spec.md.`);
    process.exit(64);
  }
  const { idsOf } = require('./check-specs');
  let features = { RETIRED: {}, UNTESTED: {} };
  try {
    features = require(path.join(ROOT, 'scripts', 'features.js'));
  } catch {
    // a repo without the map: nothing is skipped
  }
  const skip = new Set([...(features.RETIRED[slug] ?? []), ...Object.keys(features.UNTESTED[slug] ?? {})]);
  const ids = idsOf(fs.readFileSync(specFile, 'utf8')).ids.filter((id) => !skip.has(id));
  const b = base();
  if (!b) {
    console.error('No main branch to compare with.');
    process.exit(2);
  }
  const shas = git('rev-list', '--reverse', `${b}..HEAD`).split('\n').filter(Boolean);
  if (!shas.length) {
    console.error('No commits on this branch since main.');
    process.exit(1);
  }
  const commits = shas.map((sha) => ({ sha: sha.slice(0, 7), lines: testLines(sha) }));
  const r = testFirst(ids, commits);
  for (const x of r) console.log(`${x.id} ${x.ok ? 'ok' : 'FAILED'}: ${x.why}`);
  const bad = r.filter((x) => !x.ok);
  console.log(`\n${r.length - bad.length} of ${r.length} criteria of ${slug} were tested first.`);
  if (bad.length) process.exit(1);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { testFirst };
