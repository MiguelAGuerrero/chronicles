#!/usr/bin/env node
// Refactor commits keep behaviour (specs/code-quality, CQ14). A commit whose subject starts `refactor `
// (any case) may add to a test file but never change or remove a line of one, nor delete one: if a test
// has to change, the commit changed behaviour and is not a refactor. New test files are fine; so is a
// test moved whole (a rename with nothing else changed), and so are a test's import declarations, which
// follow the code they import when it moves (code-quality audit 6).
//
//   node scripts/refactor-commits.js                 the branch's commits since its merge base with main
//   node scripts/refactor-commits.js <a>..<b>        a range
//   node scripts/refactor-commits.js --ci <a>..<b>   CI: the push's range, agent commits only (a
//                                                    Claude-Session or Co-Authored-By: Claude trailer; the
//                                                    owner's own commits are theirs to judge)

const { execFileSync } = require('child_process');
const path = require('path');
const ts = require('typescript');

const TEST = /^(src\/lib\/__tests__\/|scripts\/e2e\/journeys\/)|\.test\.[jt]sx?$/;
const AGENT = /^(Claude-Session:|Co-Authored-By: Claude)/im;
const SUBJECT = /^refactor\b/i;
const ZERO = /^0{40}$/;

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
}

/** The lines (1-based) a file's import declarations span, at a commit. */
function importLines(root, rev, file) {
  let source;
  try {
    source = git(root, ['show', `${rev}:${file}`]);
  } catch {
    return new Set();
  }
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, false, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = new Set();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) && !ts.isImportEqualsDeclaration(st)) continue;
    const a = sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1;
    const b = sf.getLineAndCharacterOfPosition(st.end).line + 1;
    for (let l = a; l <= b; l++) out.add(l);
  }
  return out;
}

/** Lines of existing test files that refactor commits in `range` changed or removed. */
function check(root, range, { agentsOnly = false } = {}) {
  let log;
  try {
    log = git(root, ['log', '--reverse', '--no-merges', '--format=%H%x00%s%x00%B%x01', range]);
  } catch (e) {
    throw new Error(`check:refactor: git cannot read the range ${range}: ${String(e.stderr || e.message).trim().split('\n')[0]}`);
  }
  const out = [];
  for (const entry of log.split('\x01')) {
    const [sha, subject, message] = entry.replace(/^\n/, '').split('\x00');
    if (!sha || !SUBJECT.test(subject)) continue;
    if (agentsOnly && !AGENT.test(message || '')) continue;
    // -M: a test moved whole shows no lines; moved and edited, its edits. D: a test deleted.
    const diff = git(root, ['show', '--format=', '-U0', '-M', '--diff-filter=MDR', sha]);
    let oldFile = null;
    let imports = new Set();
    let oldLine = 0;
    for (const line of diff.split('\n')) {
      if (line.startsWith('--- ')) {
        oldFile = line === '--- /dev/null' ? null : line.slice(6);
        imports = oldFile && TEST.test(oldFile) ? importLines(root, `${sha}^`, oldFile) : new Set();
        continue;
      }
      if (line.startsWith('+++ ')) continue;
      const h = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(line);
      if (h) {
        oldLine = Number(h[1]);
        continue;
      }
      if (oldFile && TEST.test(oldFile) && line.startsWith('-')) {
        if (!imports.has(oldLine)) out.push({ commit: sha.slice(0, 8), subject, file: oldFile, line: oldLine, text: line.slice(1) });
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

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const args = process.argv.slice(2);
  const ci = args.includes('--ci');
  const given = args.find((a) => a.includes('..'));
  if (ci && (!given || given.startsWith('..') || ZERO.test(given.split('..')[0]))) {
    console.log('check:refactor --ci: no base to read the push from (a new branch, or not a push); not judged.');
    process.exit(0);
  }
  const range = given || defaultRange(root);
  let found;
  try {
    found = check(root, range, { agentsOnly: ci });
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (!found.length) console.log(`check:refactor: ok (${range}).`);
  else {
    console.error('A refactor commit changed an existing test (CQ14). A refactor keeps behaviour: if a test had to change, name the commit for what it changed (fix …, or the slice\'s criteria) or put the test back.');
    for (const f of found.slice(0, 40)) console.error(`  ${f.commit} "${f.subject}": ${f.file}:${f.line} was: ${f.text.trim()}`);
    process.exitCode = 1;
  }
}

module.exports = { check, TEST };
