#!/usr/bin/env node
// Refactor commits keep behaviour (specs/code-quality, CQ14). A commit whose subject starts `refactor `
// may add to a test file but never change or remove a line of one: if a test has to change, the commit
// changed behaviour and is not a refactor. New test files are fine.
//
//   node scripts/refactor-commits.js                 the branch's commits since its merge base with main
//   node scripts/refactor-commits.js <a>..<b>        a range
//   node scripts/refactor-commits.js --ci            CI: the last 50 commits, agent commits only (a
//                                                    Claude-Session or Co-Authored-By: Claude trailer; the
//                                                    owner's own commits are theirs to judge)

const { execFileSync } = require('child_process');
const path = require('path');

const TEST = /^(src\/lib\/__tests__\/|scripts\/e2e\/journeys\/)|\.test\.[jt]sx?$/;
const AGENT = /^(Claude-Session:|Co-Authored-By: Claude)/im;

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
}

/** Lines of existing test files that refactor commits in `range` changed or removed. */
function check(root, range, { agentsOnly = false } = {}) {
  const out = [];
  const log = git(root, ['log', '--reverse', '--format=%H%x00%s%x00%B%x01', range]);
  for (const entry of log.split('\x01')) {
    const [sha, subject, message] = entry.replace(/^\n/, '').split('\x00');
    if (!sha || !/^refactor /.test(subject)) continue;
    if (agentsOnly && !AGENT.test(message || '')) continue;
    // -U0: only the changed lines; --diff-filter=M: files the commit modified, not ones it created.
    const diff = git(root, ['show', '--format=', '-U0', '--no-renames', '--diff-filter=M', sha]);
    let file = null;
    let oldLine = 0;
    for (const line of diff.split('\n')) {
      if (line.startsWith('--- ')) continue;
      if (line.startsWith('+++ ')) {
        file = line.slice(6);
        continue;
      }
      const h = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(line);
      if (h) {
        oldLine = Number(h[1]);
        continue;
      }
      if (file && TEST.test(file) && line.startsWith('-')) {
        out.push({ commit: sha.slice(0, 8), subject, file, line: oldLine, text: line.slice(1) });
        oldLine++;
      }
    }
  }
  return out;
}

function defaultRange(root) {
  for (const ref of ['origin/main', 'main']) {
    try {
      return `${git(root, ['merge-base', 'HEAD', ref]).trim()}..HEAD`;
    } catch {
      // try the next
    }
  }
  return 'HEAD';
}

function ciRange(root) {
  const count = Number(git(root, ['rev-list', '--count', 'HEAD']).trim());
  return count > 50 ? 'HEAD~50..HEAD' : 'HEAD';
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const args = process.argv.slice(2);
  const ci = args.includes('--ci');
  const range = args.find((a) => a.includes('..')) || (ci ? ciRange(root) : defaultRange(root));
  const found = check(root, range, { agentsOnly: ci });
  if (!found.length) console.log(`check:refactor: ok (${range}).`);
  else {
    console.error(`A refactor commit changed an existing test (CQ14). A refactor keeps behaviour: if a test had to change, name the commit for what it changed (fix …, or the slice's criteria) or put the test back.`);
    for (const f of found) console.error(`  ${f.commit} "${f.subject}": ${f.file}:${f.line} was: ${f.text.trim()}`);
    process.exitCode = 1;
  }
}

module.exports = { check, TEST };
