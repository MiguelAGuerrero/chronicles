// @tree-wide: scripts/bookkeeping.js run on repositories of its own, scripts/records.js's matching, package.json and the skills that name the commands
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';

// Bookkeeping by script (the owner, Nov 14): numbers, counts, checks, extraction and verification, anything
// with one right answer, read from origin/main through git; judgment stays with agents and reviewers.

const ROOT = join(__dirname, '..', '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'bookkeeping.js');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
type Item = { section: string; tag: string | null; first: string; match: string | null; line: number };
type Records = { apply(kind: string, name: string, text: string, args?: Record<string, unknown>): { text: string } };
type Book = {
  decisionState(names: string[]): { next: string; width: number; highest: { number: string; file: string } | null; duplicates: { number: string; files: string[] }[] };
  checkDecision(names: string[], number: string, file?: string): { ok: boolean; number: string; next: string; problem?: string };
  auditNumbers(prefix: string, sources: { where: string; text: string }[]): { highest: number | null; next: number; hits: { n: number; where: string }[] };
  groupOf(path: string): string;
  entryBundle(html: string): string | null;
  absolutePaths(text: string, isRoot?: (segment: string) => boolean): { path: string; line: number }[];
  listItems(kind: 'deferred' | 'native' | 'inbox' | 'open', text: string, o?: { tag?: string; section?: string }): Item[];
};
let loaded: Book | undefined;
/** Loaded on first use, so the tests could be written before the script. */
const book = new Proxy({} as Book, { get: (_, k) => (loaded ??= createRequire(__filename)(SCRIPT) as Book)[k as keyof Book] });
const records = createRequire(__filename)(join(ROOT, 'scripts', 'records.js')) as Records;

const tmp = mkdtempSync(join(tmpdir(), 'bookkeeping-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
/** A repository of its own, `origin/main` a remote-tracking ref the test moves by hand. */
function repo(name: string) {
  const dir = join(tmp, name);
  mkdirSync(dir, { recursive: true });
  const git = (...args: string[]) => {
    const r = spawnSync('git', args, { cwd: dir, env, encoding: 'utf8' });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
    return r.stdout;
  };
  const write = (rel: string, text: string) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  const commit = (message: string) => {
    git('add', '-A');
    git('commit', '-q', '--allow-empty', '-m', message);
    return git('rev-parse', 'HEAD').trim();
  };
  const publish = (rev = 'HEAD') => git('update-ref', 'refs/remotes/origin/main', rev);
  const run = (...args: string[]) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, env: { ...env, TEND_ROOT: dir }, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  write('README.md', 'a repository\n');
  commit('base');
  publish();
  return { dir, git, write, commit, publish, run };
}
const json = (r: { stdout: string }) => JSON.parse(r.stdout) as Record<string, unknown>;

// ---------------------------------------------------------------------------------------------------
// next-decision

test('bookkeeping: next-decision is the highest number in docs/decisions plus one, padded as the files are', () => {
  const names = ['README.md', '0001-replay-five-beats.md', '0173-rule-files.md', '0042-x.md', 'notes.txt'];
  const s = book.decisionState(names);
  assert.equal(s.next, '0174');
  assert.deepEqual(s.highest, { number: '0173', file: '0173-rule-files.md' });
  assert.equal(book.decisionState(['001-a.md', '009-b.md']).next, '010', 'the width the files use');
  assert.equal(book.decisionState(['9999-a.md']).next, '10000', 'past the width, the number grows');
  assert.equal(book.decisionState(['README.md']).next, '0001', 'none yet: the repository\'s width, four');
  assert.deepEqual(book.decisionState(['0007-a.md', '0007-b.md', '0006-c.md']).duplicates, [{ number: '0007', files: ['0007-a.md', '0007-b.md'] }]);
});

test('bookkeeping: next-decision --check fails on a number main gave another file, on a gap and on a file numbered otherwise', () => {
  const main = ['0172-a.md', '0173-b.md'];
  assert.equal(book.checkDecision(main, '0174', 'docs/decisions/0174-mine.md').ok, true);
  assert.equal(book.checkDecision(main, '174', '0174-mine.md').ok, true, 'the number read as a number');
  const taken = book.checkDecision(main, '0173', '0173-mine.md');
  assert.equal(taken.ok, false);
  assert.equal(taken.next, '0174');
  assert.match(taken.problem ?? '', /0173-b\.md/);
  assert.equal(book.checkDecision(main, '0173', 'docs/decisions/0173-b.md').ok, true, 'the same file, already on main');
  assert.equal(book.checkDecision(main, '0173').ok, false, 'no file named: any file holding it on main');
  assert.match(book.checkDecision(main, '0176', '0176-mine.md').problem ?? '', /skips 0174-0175/);
  assert.match(book.checkDecision(main, '0174', '0175-mine.md').problem ?? '', /numbered 0175/);
  assert.equal(book.checkDecision(main, 'x74').ok, false);
});

test('bookkeeping: next-decision reads origin/main, not HEAD or the working tree, and --check catches a number main took meanwhile', () => {
  const r = repo('decisions');
  r.write('docs/decisions/0001-a.md', '# 0001\n');
  r.write('docs/decisions/0002-b.md', '# 0002\n');
  r.commit('two decisions');
  r.publish();
  const base = r.git('rev-parse', 'HEAD').trim();
  r.write('docs/decisions/0003-mine.md', '# 0003\n');
  r.commit('mine, not on main');
  r.write('docs/decisions/0004-loose.md', '# 0004\n');
  const plain = r.run('next-decision');
  assert.equal(plain.status, 0, plain.stderr);
  assert.equal(plain.stdout.split('\n')[0], '0003');
  assert.match(plain.stdout, /0002-b\.md/);
  assert.equal(json(r.run('next-decision', '--json')).next, '0003');
  assert.equal(r.run('next-decision', '--check', '0003', 'docs/decisions/0003-mine.md').status, 0);
  rmSync(join(r.dir, 'docs/decisions/0004-loose.md'));
  // Another session publishes 0003 first.
  r.git('checkout', '-q', '-b', 'other', base);
  r.write('docs/decisions/0003-theirs.md', '# 0003\n');
  r.publish(r.commit('theirs'));
  r.git('checkout', '-q', 'main');
  const clash = r.run('next-decision', '--check', '0003', 'docs/decisions/0003-mine.md');
  assert.equal(clash.status, 1);
  assert.match(clash.stderr, /0003-theirs\.md/);
  assert.match(clash.stdout, /^0004$/m, 'it prints the next free one');
  const j = json(r.run('next-decision', '--check', '0003', 'docs/decisions/0003-mine.md', '--json'));
  assert.equal(j.ok, false);
  assert.equal(j.next, '0004');
  const usage = r.run('next-decision', '--check');
  assert.equal(usage.status, 2);
});

test('bookkeeping audit 11: a decision file with no slug holds its number', () => {
  assert.equal(book.decisionState(['0174-a.md', '0175.md']).next, '0176');
  assert.equal(book.checkDecision(['0174-a.md', '0175.md'], '0175', '0175-mine.md').ok, false);
});

// ---------------------------------------------------------------------------------------------------
// next-audit

const src = (text: string) => ({ where: 'commit', text });

test('bookkeeping: next-audit reads "<prefix> audit N" in single numbers, ranges and lists, and no other prefix', () => {
  const subjects = [
    'tend zmap audit 12: the pin',
    'tend zmap audit 27-31: the pins\' time',
    'Revert "tend zmap audit 32: x"',
    'tend zmap: two fixes (tend zmap audits 33, 34 and 35)',
    'tend zmap audit 7, no number of its own',
    'tend zexplore audit 90: elsewhere',
    'sitezmap audit 99: not the map',
    'Records: the third audit (zrecords audit 41-54)',
    'tend zmap audit 1–3: an en dash',
  ];
  const map = book.auditNumbers('tend zmap', subjects.map(src));
  assert.equal(map.highest, 35);
  assert.equal(map.next, 36);
  assert.equal(book.auditNumbers('zmap', subjects.map(src)).highest, null, '"map" is not "tend zmap" nor "sitezmap"');
  assert.equal(book.auditNumbers('zrecords', subjects.map(src)).highest, 54);
  assert.equal(book.auditNumbers('Tend Zmap', [src('tend zmap audit 3: x')]).highest, 3, 'case is ignored');
  assert.equal(book.auditNumbers('ztranscripts', [src("test('memo-ztranscripts audit 4: x')")]).highest, null, 'part of a slug is not the slug');
  assert.equal(book.auditNumbers('memo-ztranscripts', [src("test('memo-ztranscripts audit 4: x')"), src("step('memo-ztranscripts audit 6 the caption')")]).highest, 6);
  assert.deepEqual(book.auditNumbers('rides', []), { highest: null, next: 1, hits: [] });
});

test('bookkeeping audit 1: next-audit takes the highest of origin/main, HEAD\'s history and tree, and the uncommitted working tree', () => {
  const r = repo('audits');
  r.commit('zrides audit 2: a subject');
  r.write('src/lib/__tests__/rides/rides.test.ts', "test('zrides audit 7: the ride', () => {});\n");
  r.write('src/lib/__tests__/rides/with space/a b.test.ts', "test('Zzrides audit 8: a path with spaces', () => {});\n");
  r.write('scripts/e2e/journeys/rides.js', "step('zrides audit 9 the journey');\n");
  r.commit('tests');
  r.publish();
  const published = r.git('rev-parse', 'HEAD').trim();
  const next = () => (json(r.run('next-audit', 'zrides', '--json')) as { next: number }).next;
  const plain = r.run('next-audit', 'zrides');
  assert.equal(plain.status, 0, plain.stderr);
  assert.equal(plain.stdout.split('\n')[0], '10');
  assert.match(plain.stdout, /scripts\/e2e\/journeys\/rides\.js/);
  r.commit('zrides audit 12: a first round on the branch, not on main');
  assert.equal(next(), 13, "HEAD's history: a second round never reuses the first's numbers");
  r.write('src/lib/__tests__/rides/round.test.ts', "test('zrides audit 14: committed on the branch', () => {});\n");
  r.commit('a test on the branch');
  assert.equal(next(), 15, "HEAD's tree");
  r.write('src/lib/__tests__/rides/later.test.ts', "test('zrides audit 16: in the working tree', () => {});\n");
  assert.equal(next(), 17, 'an untracked file');
  r.write('src/lib/__tests__/rides/rides.test.ts', "test('zrides audit 18: unstaged', () => {});\n");
  assert.equal(next(), 19, 'an unstaged change');
  // main moves on meanwhile: its numbers count too.
  r.git('worktree', 'add', '-q', '--detach', join(tmp, 'audits-main'), published);
  writeFileSync(join(tmp, 'audits-main', 'x.txt'), 'x\n');
  spawnSync('git', ['add', '-A'], { cwd: join(tmp, 'audits-main'), env });
  spawnSync('git', ['commit', '-qm', 'zrides audit 20: another session, on main'], { cwd: join(tmp, 'audits-main'), env });
  r.publish(spawnSync('git', ['rev-parse', 'HEAD'], { cwd: join(tmp, 'audits-main'), env, encoding: 'utf8' }).stdout.trim());
  assert.equal(next(), 21);
  assert.match(r.run('next-audit', 'zrides').stdout, /commit [0-9a-f]+: zrides audit 20/);
  const none = r.run('next-audit', 'tend zwalk');
  assert.equal(none.status, 0);
  assert.equal(none.stdout.split('\n')[0], '1');
  assert.equal(r.run('next-audit').status, 2, 'a prefix is required');
});

test('bookkeeping audit 2: next-audit reads every file and commit body, not only subjects and tests: a deferred or rejected finding keeps its number', () => {
  const r = repo('audits-wide');
  r.write('.gitignore', 'ignored/\n');
  r.write('src/lib/__tests__/rides/rides.test.ts', "test('zrides audit 3: x', () => {});\n");
  r.write('docs/DEFERRED.md', '- [loop] the ride ends early (deferred as zrides audit 5)\n');
  r.write('specs/rides/spec.md', 'Audit: zrides audit 6 rejected; zrides audit 4, 2026-11-14.\n');
  r.write('ignored/notes.md', 'zrides audit 90 in an ignored file\n');
  r.commit('rides: the audit (zrides audit 1-3)\n\nzrides audit 7 filed as an owner\'s entry.');
  r.publish();
  const j = json(r.run('next-audit', 'zrides', '--json')) as { highest: number; next: number; at: { where: string }[] };
  assert.equal(j.highest, 7, 'the body of a commit, the record documents and the specs; never an ignored file or a date');
  assert.match(j.at[0].where, /^commit [0-9a-f]+$/);
});

test('bookkeeping audit 3: space, hyphen and underscore are one separator inside a prefix', () => {
  const lines = [src('note ztypes audit 55-65: x'), src("test('note-ztypes audit 66: y')"), src('note_ztypes audit 67')];
  assert.equal(book.auditNumbers('note-ztypes', lines).highest, 67);
  assert.equal(book.auditNumbers('note ztypes', lines).highest, 67);
  assert.equal(book.auditNumbers('note_ztypes', lines).highest, 67);
  assert.equal(book.auditNumbers('ztypes', lines).highest, null, 'part of a name is still not the name');
});

test('bookkeeping audit 4: "and", ", and", "to" and "through" join a list or a range; a date is never an audit number', () => {
  const at = (t: string) => book.auditNumbers('tend zmap', [src(t)]).highest;
  assert.equal(at('tend zmap audits 3, 4, and 5'), 5);
  assert.equal(at('tend zmap audits 4 and 5'), 5);
  assert.equal(at('tend zmap audits 27 to 31'), 31);
  assert.equal(at('tend zmap audits 27 through 31'), 31);
  assert.equal(at('tend zmap audit 1-14, 16'), 16);
  assert.equal(at('tend zmap audit 12-18 (13 and 16 are record notes)'), 18);
  assert.equal(at('tend zmap audit 7 to the end'), 7);
  assert.equal(at('tend zmap audit 2, 2026-11-14'), 2);
  assert.equal(at('tend zmap audit 5 to 2026'), 5);
  assert.equal(at('tend zmap audit 3, 11-14-2026'), 3);
  assert.equal(at('tend zmap audit 2026: a year'), null);
});

// ---------------------------------------------------------------------------------------------------
// files

test('bookkeeping: files groups a path as src, tests, journeys, docs and records, skills and scripts, or other', () => {
  const cases: Record<string, string> = {
    'src/lib/rides.ts': 'src',
    'src/app/walk.tsx': 'src',
    'src/lib/__tests__/rides/rides.test.ts': 'tests',
    'src/lib/__tests__/fakes/ports.ts': 'tests',
    'scripts/e2e/journeys/qol.js': 'journeys',
    'docs/STATUS.md': 'docs',
    'docs/decisions/0174-x.md': 'docs',
    'specs/rides/spec.md': 'docs',
    '.claude/rules/map.md': 'docs',
    '.claude/records/20261114-000000-abcd1234.json': 'docs',
    '.claude/skills/tend/ledger.json': 'docs',
    '.claude/skills/tend/runs.jsonl': 'docs',
    'README.md': 'docs',
    'AGENTS.md': 'docs',
    '.claude/skills/tend/SKILL.md': 'scripts',
    '.claude/skills/ship.md': 'scripts',
    '.claude/agents/auditor.md': 'scripts',
    '.claude/hooks/check-done.sh': 'scripts',
    'scripts/tend.js': 'scripts',
    'scripts/e2e/economy.js': 'scripts',
    'package.json': 'other',
    '.github/workflows/pages.yml': 'other',
    'assets/icon.png': 'other',
  };
  for (const [p, g] of Object.entries(cases)) assert.equal(book.groupOf(p), g, p);
});

test('bookkeeping: files counts committed, staged, unstaged, deleted and untracked changes against the merge base, and --max-src trips', () => {
  const r = repo('files');
  r.write('.gitignore', 'ignored/\n');
  r.write('src/lib/a.ts', 'export const a = 1;\n');
  r.write('src/lib/old.ts', 'export const old = 1;\n');
  r.write('docs/STATUS.md', '# Status\n');
  r.commit('base files');
  r.publish();
  const base = r.git('rev-parse', 'HEAD').trim();
  r.write('src/lib/a.ts', 'export const a = 2;\n');
  r.commit('a committed change');
  r.write('src/lib/__tests__/x/a.test.ts', 'test\n');
  r.git('add', 'src/lib/__tests__/x/a.test.ts');
  r.write('docs/STATUS.md', '# Status, changed\n');
  r.git('rm', '-q', 'src/lib/old.ts');
  r.write('scripts/new file.js', '// untracked, a space in its name\n');
  r.write('.claude/skills/x/SKILL.md', 'untracked\n');
  r.write('ignored/big.bin', 'ignored\n');
  // main moves on after the branch: what it changed is not this worktree's.
  r.git('branch', '-q', 'later', base);
  r.git('worktree', 'add', '-q', join(tmp, 'files-later'), 'later');
  writeFileSync(join(tmp, 'files-later', 'README.md'), 'main moved\n');
  spawnSync('git', ['commit', '-qam', 'main moves'], { cwd: join(tmp, 'files-later'), env });
  r.publish('later');
  const j = json(r.run('files', '--json')) as { counts: Record<string, number>; total: number; files: { path: string; group: string; status: string }[] };
  assert.deepEqual(j.counts, { src: 2, tests: 1, journeys: 0, docs: 1, scripts: 2, other: 0 });
  assert.equal(j.total, 6);
  assert.ok(j.files.some((f) => f.path === 'scripts/new file.js' && f.status === '?'), 'untracked, by its real name');
  assert.ok(j.files.some((f) => f.path === 'src/lib/old.ts' && f.status === 'D'));
  assert.ok(!j.files.some((f) => f.path === 'README.md'), 'main\'s own change is not counted');
  const plain = r.run('files');
  assert.equal(plain.status, 0, plain.stderr);
  assert.match(plain.stdout, /^src 2$/m);
  assert.match(plain.stdout, /^skills and scripts 2$/m);
  assert.match(plain.stdout, /^total 6$/m);
  assert.match(plain.stdout, /^sources 3 /m);
  // The tripwire counts source files: src/lib/a.ts, src/lib/old.ts and scripts/new file.js (bookkeeping audit 7).
  const over = r.run('files', '--max-src', '2');
  assert.equal(over.status, 1);
  assert.match(over.stderr, /3 source files.*--max-src 2/);
  assert.equal(r.run('files', '--max-src', '3').status, 0);
  // A range counts what its commits changed, and nothing uncommitted.
  const range = json(r.run('files', 'origin/main..HEAD', '--json')) as { counts: Record<string, number> };
  assert.deepEqual(range.counts, { src: 1, tests: 0, journeys: 0, docs: 0, scripts: 0, other: 0 });
  assert.equal(r.run('files', 'nope..HEAD').status, 2);
});

test('bookkeeping audit 7: --max-src counts source files, src/ and scripts/, never tests, journeys or records', () => {
  const r = repo('sources');
  for (let k = 0; k < 7; k++) {
    r.write(`src/lib/m${k}.ts`, 'x\n');
    r.write(`src/lib/__tests__/x/m${k}.test.ts`, 'x\n');
  }
  r.write('scripts/e2e/journeys/a.js', 'x\n');
  r.write('scripts/e2e/journeys/b.js', 'x\n');
  r.write('docs/STATUS.md', 'x\n');
  r.write('.claude/skills/x/SKILL.md', 'x\n');
  const ok = r.run('files', '--max-src', '8');
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal((json(r.run('files', '--json')) as { sources: number }).sources, 7);
  r.write('scripts/one.js', 'x\n');
  r.write('scripts/two.js', 'x\n');
  const over = r.run('files', '--max-src', '8');
  assert.equal(over.status, 1);
  assert.match(over.stderr, /9 source files/);
  assert.match(r.run('files').stdout, /^sources 9 \(src\/ and scripts\/, the tripwire's count\)$/m);
});

// ---------------------------------------------------------------------------------------------------
// landed

test('bookkeeping: the entry bundle is read from an Expo web export\'s page', () => {
  const page = '<html><head><script src="/chronicles/_expo/static/js/web/entry-0a1b2c3d4e5f.js" defer></script></head></html>';
  assert.equal(book.entryBundle(page), 'entry-0a1b2c3d4e5f.js');
  assert.equal(book.entryBundle('<script src="/_expo/static/js/web/entry-ff.js"></script>'), 'entry-ff.js');
  assert.equal(book.entryBundle('<script src="/chronicles/_expo/static/js/web/index-09f4522cbdd3b261.js" defer></script>'), 'index-09f4522cbdd3b261.js', 'as SDK 58 names it');
  assert.equal(book.entryBundle('<link href="/_expo/static/js/web/x.js"><html>no bundle</html>'), null);
});

test('bookkeeping: landed checks the range is on origin/main, the branch and its worktree are gone, and the live bundle against dist/', () => {
  const r = repo('landed');
  const base = r.git('rev-parse', 'HEAD').trim();
  r.git('checkout', '-q', '-b', 'tooling/x');
  r.write('a.txt', '1\n');
  r.commit('one');
  r.write('a.txt', '2\n');
  const head = r.commit('two');
  r.git('checkout', '-q', 'main');
  r.git('merge', '-q', '--ff-only', 'tooling/x');
  r.publish();
  const ok = r.run('landed', `${base}..${head}`);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /2 commits/);
  assert.match(ok.stdout, /Pages/, 'it says Pages is not its to see');
  // The branch is still there, then a worktree of it.
  const branch = r.run('landed', `${base}..${head}`, '--branch', 'tooling/x');
  assert.equal(branch.status, 1);
  assert.match(branch.stderr, /local branch tooling\/x/);
  r.git('worktree', 'add', '-q', join(r.dir, '.claude', 'worktrees', 'tooling-x'), 'tooling/x');
  const tree = r.run('landed', `${base}..${head}`, '--branch', 'tooling/x', '--json');
  assert.equal(tree.status, 1);
  assert.match(String((json(tree).problems as string[]).join('\n')), /\.claude\/worktrees\/tooling-x/);
  r.git('worktree', 'remove', join(r.dir, '.claude', 'worktrees', 'tooling-x'));
  r.git('branch', '-q', '-D', 'tooling/x');
  assert.equal(r.run('landed', `${base}..${head}`, '--branch', 'tooling/x').status, 0);
  // A commit not on main, under another hash or not at all.
  r.git('checkout', '-q', '-b', 'rebased', base);
  r.write('a.txt', '1\n');
  r.commit('one, replayed');
  r.write('b.txt', 'only here\n');
  const stray = r.commit('three');
  r.git('checkout', '-q', 'main');
  const off = r.run('landed', `${base}..${stray}`);
  assert.equal(off.status, 1);
  assert.match(off.stderr, /three/);
  assert.match(off.stderr, /one.*another hash/);
  assert.equal(r.run('landed', `${head}..${head}`).status, 1, 'an empty range lands nothing');
  assert.equal(r.run('landed', head).status, 2, 'a range is <base>..<head>');
  // The live page, here a file: its entry bundle, and dist/'s beside it.
  const live = join(tmp, 'live.html');
  writeFileSync(live, '<script src="/chronicles/_expo/static/js/web/entry-aaa111.js" defer></script>');
  const seen = r.run('landed', `${base}..${head}`, '--live', `file://${live}`);
  assert.equal(seen.status, 0, seen.stderr);
  assert.match(seen.stdout, /entry-aaa111\.js/);
  r.write('dist/index.html', '<script src="/chronicles/_expo/static/js/web/entry-bbb222.js" defer></script>');
  const differs = r.run('landed', `${base}..${head}`, '--live', `file://${live}`);
  assert.equal(differs.status, 1);
  assert.match(differs.stderr, /entry-bbb222\.js/);
  r.write('dist/index.html', '<script src="/_expo/static/js/web/entry-ccc333.js" defer></script>');
  const otherBase = r.run('landed', `${base}..${head}`, '--live', `file://${live}`);
  assert.equal(otherBase.status, 0, 'an export for another base path is not compared');
  assert.match(otherBase.stdout, /not compared/);
  r.write('dist/index.html', '<script src="/chronicles/_expo/static/js/web/entry-aaa111.js" defer></script>');
  assert.equal(r.run('landed', `${base}..${head}`, '--live', `file://${live}`).status, 0);
  assert.equal(r.run('landed', `${base}..${head}`, '--live', `file://${join(tmp, 'gone.html')}`).status, 1, 'a page that cannot be read fails');
});

test('bookkeeping audit 6: landed refuses origin/main as the head, checks the branch alone after cleanup, and says when it compared nothing', () => {
  const r = repo('landed-head');
  const base = r.git('rev-parse', 'HEAD').trim();
  r.write('a.txt', '1\n');
  const head = r.commit('one');
  r.publish();
  const refused = r.run('landed', `${base}..origin/main`);
  assert.equal(refused.status, 2, 'a range ending at origin/main holds whatever landed and can never fail');
  assert.match(refused.stderr, /pushed sha/);
  assert.equal(r.run('landed', `${base}..HEAD`).status, 2, 'HEAD at origin/main is the same trap');
  assert.equal(r.run('landed', `${base}..${head}`).status, 0, 'the run\'s own sha, even when it is main\'s tip');
  assert.equal(r.run('landed', `${base}..${head.slice(0, 8)}`).status, 0);
  r.git('branch', 'tooling/y');
  assert.equal(r.run('landed', '--branch', 'tooling/y').status, 1, 'the cleanup part alone, with no range');
  r.git('branch', '-D', 'tooling/y');
  const gone = r.run('landed', '--branch', 'tooling/y');
  assert.equal(gone.status, 0, gone.stderr);
  const live = join(tmp, 'live-head.html');
  writeFileSync(live, '<script src="/chronicles/_expo/static/js/web/index-aaa.js" defer></script>');
  const seen = r.run('landed', `${base}..${head}`, '--live', `file://${live}`);
  assert.match(seen.stdout, /compared with nothing/);
  assert.equal(r.run('landed').status, 2);
});

// ---------------------------------------------------------------------------------------------------
// review-paths

test('bookkeeping: review-paths reads the absolute paths of a prompt, and nothing that is a URL, a route or a skill', () => {
  const roots = new Set(['workspace', 'tmp']);
  const isRoot = (s: string) => roots.has(s);
  const text = [
    'Read /workspace/chronicles/AGENTS.md and /workspace/chronicles/src/lib/rides.ts:120.',
    'The diff: `/tmp/scratch/my review/diff.patch` (a space in it).',
    'See https://example.io/chronicles/walk, the /walk route, /tend and and/or.',
    'Pictures in /tmp/scratch/shots/, file /workspace/chronicles/src/lib/__tests__/rides/*.test.ts',
  ].join('\n');
  const found = book.absolutePaths(text, isRoot).map((p) => `${p.line} ${p.path}`);
  assert.deepEqual(found, [
    '1 /workspace/chronicles/AGENTS.md',
    '1 /workspace/chronicles/src/lib/rides.ts:120',
    '2 /tmp/scratch/my review/diff.patch',
    '4 /tmp/scratch/shots/',
    '4 /workspace/chronicles/src/lib/__tests__/rides/*.test.ts',
  ]);
});

test('bookkeeping: review-paths names each missing path and a missing prompt, and passes a prompt whose paths exist', () => {
  const r = repo('prompts');
  const dir = join(tmp, 'prompts-scratch', 'a dir');
  mkdirSync(join(dir, 'shots'), { recursive: true });
  writeFileSync(join(dir, 'diff.patch'), 'diff\n');
  const good = join(dir, 'good-prompt.md');
  writeFileSync(good, `Read \`${join(dir, 'diff.patch')}\`, line refs ${join(r.dir, 'README.md')}:1, and the pictures in ${join(tmp, 'prompts-scratch')}/.\n`);
  const bad = join(dir, 'bad-prompt.md');
  writeFileSync(bad, `Read ${join(r.dir, 'README.md')}.\nThen ${join(r.dir, 'src', 'gone.ts')}:12 and \`${join(dir, 'no such.md')}\`.\n`);
  const ok = r.run('review-paths', good);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /3 absolute paths/);
  const missing = r.run('review-paths', good, bad, join(dir, 'never.md'));
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /line 2: .*src\/gone\.ts:12/);
  assert.match(missing.stderr, /no such\.md/);
  assert.match(missing.stderr, /never\.md/);
  const j = json(r.run('review-paths', bad, '--json')) as { prompts: { prompt: string; missing: { path: string }[] }[] };
  assert.equal(j.prompts[0].missing.length, 2);
  assert.equal(r.run('review-paths').status, 2);
});

test('bookkeeping audit 12: a backticked path with a <placeholder> is checked up to its directory', () => {
  const r = repo('placeholder');
  const dir = join(tmp, 'placeholder-scratch', 'reviews');
  mkdirSync(dir, { recursive: true });
  const prompt = join(tmp, 'placeholder-scratch', 'prompt.md');
  writeFileSync(prompt, `Write it to \`${dir}/<your branch>-diff-auditor-prompt.md\`.\n`);
  const ok = r.run('review-paths', prompt);
  assert.equal(ok.status, 0, ok.stderr);
  writeFileSync(prompt, `Write it to \`${join(tmp, 'placeholder-scratch', 'nope')}/<your branch>-x.md\`.\n`);
  assert.equal(r.run('review-paths', prompt).status, 1);
});

// ---------------------------------------------------------------------------------------------------
// items

const DEFERRED = `# Deferred

Intro paragraph.

## Explore and discovery

- [loop] The busy ring draws twice when the map settles.
- [owner] The busy ring flickers on a slow phone.
- The busy ring
- [loop] Swatches: three walked swatches.
  Since Nov 12: one more.
- [loop] Swatches: three walked swatches.
  Since Nov 13: a different note.

## Captures, media and export

### Video

- [ ] [phone] A long video plays on the phone.
- [arch] Export, a GPX file.
- [arch] Export, a GPX file.
`;

const STATUS = `# Status

## Needs the owner

### From /tend

- **T21 [owner] Replay: a quiet Back** (2026-11-12)
  Area: replay.
- **T26 [phone] The tabs at the largest text** (2026-11-13)
  Do: x. Expect: y.

### Next evolutions

- **G5 [M] Chronicle: search** (2026-11-11) · Return · aligned
  Area: memories.

### Last tend

Nothing.

### Open before the loop

- **The spec wording** (Nov 14): the answers.
- **R7's example** (Nov 14): the reminders.

## In flight
`;

/** What records.js does with an item's match: the note lands under the item listed, at its line. */
function accepted(kind: 'deferred' | 'inbox' | 'open', text: string, it: Item) {
  const name = kind === 'deferred' ? 'item note' : `${kind} note`;
  const out = records.apply(kind === 'deferred' ? 'deferred' : 'status', name, text, { match: it.match, body: 'NOTED' });
  const lines = out.text.split('\n');
  const at = lines.findIndex((l) => l.trim() === 'NOTED');
  let start = at - 1;
  while (start > 0 && /^\s/.test(lines[start])) start--;
  return start === it.line - 1;
}

test('bookkeeping: items lists DEFERRED\'s items with their section, tag, first line and the shortest match records.js accepts', () => {
  const items = book.listItems('deferred', DEFERRED);
  assert.deepEqual(items.map((i) => [i.section, i.tag, i.match]), [
    ['Explore and discovery', 'loop', 'The busy ring draws'],
    ['Explore and discovery', 'owner', 'The busy ring flickers'],
    ['Explore and discovery', null, '- The busy'],
    ['Explore and discovery', 'loop', 'Nov 12'],
    ['Explore and discovery', 'loop', 'Nov 13'],
    ['Captures, media and export › Video', 'phone', 'A long'],
    ['Captures, media and export › Video', 'arch', null],
    ['Captures, media and export › Video', 'arch', null],
  ]);
  assert.equal(items[0].first, 'The busy ring draws twice when the map settles.');
  assert.deepEqual(items.map((i) => i.line), [7, 8, 9, 10, 12, 19, 20, 21]);
  for (const it of items.filter((i) => i.match)) assert.ok(accepted('deferred', DEFERRED, it), `records.js names "${it.first}" by "${it.match}"`);
  // "The busy ring" is in three items, so its own item is named with its marker; twins have no match at all.
  assert.throws(() => records.apply('deferred', 'item note', DEFERRED, { match: 'The busy ring', body: 'x' }), /is in 3 items/);
  assert.throws(() => records.apply('deferred', 'item note', DEFERRED, { match: 'Export, a GPX file.', body: 'x' }), /is in 2 items/);
  assert.deepEqual(book.listItems('deferred', DEFERRED, { tag: 'loop' }).map((i) => i.match), ['The busy ring draws', 'Nov 12', 'Nov 13']);
  assert.deepEqual(book.listItems('deferred', DEFERRED, { tag: 'none' }).map((i) => i.first), ['The busy ring']);
  assert.deepEqual(book.listItems('deferred', DEFERRED, { section: 'video' }).map((i) => i.tag), ['phone', 'arch', 'arch']);
});

test('bookkeeping: items lists the inbox by number and the items open before the loop by match', () => {
  const inbox = book.listItems('inbox', STATUS);
  assert.deepEqual(inbox.map((i) => [i.section, i.tag, i.match]), [
    ['From /tend', 'owner', 'T21'],
    ['From /tend', 'phone', 'T26'],
    ['Next evolutions', 'M', 'G5'],
  ]);
  assert.equal(inbox[0].first, '**T21 [owner] Replay: a quiet Back** (2026-11-12)');
  assert.deepEqual(book.listItems('inbox', STATUS, { tag: 'phone' }).map((i) => i.match), ['T26']);
  const open = book.listItems('open', STATUS);
  assert.deepEqual(open.map((i) => i.match), ['**The spec', "**R7's"]);
  for (const it of open) assert.ok(accepted('open', STATUS, it), it.first);
  for (const it of inbox) assert.ok(accepted('inbox', STATUS, it), it.first);
});

test('bookkeeping: items reads origin/main with --main, the working tree with --worktree, and fails when an item has no match', () => {
  const r = repo('items');
  r.write('docs/DEFERRED.md', DEFERRED);
  r.write('docs/STATUS.md', STATUS);
  r.commit('records');
  r.publish();
  r.write('docs/DEFERRED.md', DEFERRED.replace('- [arch] Export, a GPX file.\n- [arch] Export, a GPX file.\n', '- [arch] Export, a GPX file.\n- [loop] A later item.\n'));
  const main = r.run('items', 'deferred', '--main');
  assert.equal(main.status, 1, 'origin/main holds twin items no match names');
  assert.match(main.stderr, /"Export, a GPX file\." \(line 20\)/);
  assert.match(main.stdout, /^## Explore and discovery$/m);
  assert.match(main.stdout, /match: "The busy ring draws"/);
  const tree = r.run('items', 'deferred', '--worktree');
  assert.equal(tree.status, 0, tree.stderr);
  assert.match(tree.stdout, /match: "A later"/);
  assert.match(tree.stdout, /match: "Export"/);
  const j = json(r.run('items', 'inbox', '--tag', 'owner', '--json')) as { items: Item[] };
  assert.deepEqual(j.items.map((i) => i.match), ['T21']);
  assert.equal(r.run('items', 'open').status, 0);
  assert.equal(r.run('items', 'deferred', '--main', '--tag', 'loop').status, 0, 'the filter leaves the unmatched item out');
  assert.equal(r.run('items', 'nope').status, 2);
});

test('bookkeeping audit 8: each match is also printed in single quotes, safe to paste into a shell', () => {
  const r = repo('quoted');
  r.write('docs/DEFERRED.md', "# D\n\n## A\n\n- [loop] It's `x` here, $HOME and all.\n- [loop] It is not.\n");
  r.commit('d');
  r.publish();
  const out = r.run('items', 'deferred');
  assert.equal(out.status, 0, out.stderr);
  assert.ok(out.stdout.includes("match: \"It's `x\"\n  shell: 'It'\\''s `x'"), out.stdout);
  const pasted = spawnSync('sh', ['-c', `printf %s ${"'It'\\''s `x'"}`], { encoding: 'utf8' });
  assert.equal(pasted.stdout, "It's `x", 'the shell reads back the match itself');
  assert.equal(((json(r.run('items', 'deferred', '--json')) as { items: Item[] }).items[0]).match, "It's `x");
});

test('bookkeeping audit 9: a CRLF document lists the same items as its LF copy', () => {
  const crlf = book.listItems('deferred', DEFERRED.replace(/\n/g, '\r\n'));
  assert.equal(crlf.length, 8);
  assert.deepEqual(crlf, book.listItems('deferred', DEFERRED));
});

test('bookkeeping audit 10: items reads the working tree when its record document differs from main, and says which it read', () => {
  const r = repo('items-where');
  r.write('docs/DEFERRED.md', DEFERRED);
  r.commit('records');
  r.publish();
  const same = r.run('items', 'deferred', '--tag', 'loop');
  assert.match(same.stdout, /from docs\/DEFERRED\.md on origin\/main \([0-9a-f]+\)/);
  r.write('docs/DEFERRED.md', DEFERRED.replace('- [arch] Export, a GPX file.\n- [arch] Export, a GPX file.\n', '- [arch] Export, a GPX file.\n- [loop] A later item.\n'));
  const tree = r.run('items', 'deferred');
  assert.equal(tree.status, 0, tree.stderr);
  assert.match(tree.stdout, /match: "A later"/);
  assert.match(tree.stdout, /from docs\/DEFERRED\.md in the working tree, which differs from origin\/main/);
  assert.match(r.run('items', 'deferred', '--main').stdout, /on origin\/main/);
});

// ---------------------------------------------------------------------------------------------------
// The commands' names, where the procedures use them.

/**
 * The units of a skill a reader acts on: a list item, a table row or a paragraph, inside a fence or not.
 * A unit that names a bookkeeping command must name where it runs.
 */
function units(text: string) {
  const out: string[] = [];
  let cur: string[] = [];
  const flush = () => {
    if (cur.length) out.push(cur.join('\n'));
    cur = [];
  };
  for (const line of text.split('\n')) {
    if (!line.trim() || /^\s*(```|~~~)/.test(line)) flush();
    else if (/^\s*([-*+]|\d+\.)\s|^\s*\|/.test(line)) {
      flush();
      cur.push(line);
    } else cur.push(line);
  }
  flush();
  return out;
}
const PLACES = /in the worktree|in your worktree|in the run's worktree|<main-tools>|<main-scripts>/;

test('bookkeeping audit 5: every skill names where its bookkeeping command runs, and each place holds the script', { todo: 'the fix comes next' }, () => {
  const skills = ['.claude/skills/tend/SKILL.md', '.claude/skills/slice/SKILL.md', '.claude/skills/audit/SKILL.md', '.claude/skills/ship.md', '.claude/skills/tend-orchestrator/SKILL.md', '.claude/skills/tend-orchestrator/briefs.md'];
  const unplaced: string[] = [];
  const named = new Set<string>();
  for (const f of skills) {
    for (const u of units(read(f))) {
      if (!/book:|bookkeeping\.js/.test(u)) continue;
      for (const m of u.matchAll(/book:([\w-]+)|bookkeeping\.js ([\w-]+)/g)) named.add(m[1] ?? m[2]);
      if (!PLACES.test(u)) unplaced.push(`${f}: ${u.trim().split('\n')[0]}`);
    }
  }
  assert.deepEqual(unplaced, [], 'each of these names a bookkeeping command and not where it runs');
  for (const c of ['next-decision', 'next-audit', 'files', 'landed', 'review-paths', 'items']) assert.ok(named.has(c), `a skill names ${c}`);
  // The places: the run's worktree is cut from origin/main, which holds the script; the orchestrator keeps a
  // detached worktree at origin/main; ship.md's cleanup reads main's scripts once the worktree is gone.
  const orchestrator = read('.claude/skills/tend-orchestrator/SKILL.md');
  assert.match(orchestrator, /git -C <primary> worktree add --detach <main-tools> origin\/main/);
  assert.match(orchestrator, /git -C <main-tools> fetch -q origin main && git -C <main-tools> checkout -q --detach origin\/main/);
  assert.doesNotMatch(orchestrator, /npm run book:/, 'the orchestrator sits in the primary checkout, which may predate the script');
  assert.doesNotMatch(read('.claude/skills/tend-orchestrator/briefs.md'), /<main-tools>[^\n]*book:/);
  assert.match(read('.claude/skills/ship.md'), /git -C <primary> archive origin\/main scripts \| tar -x -C <main-scripts>/);
  for (const f of skills) assert.doesNotMatch(read(f), /book:landed -- <base>\.\.origin\/main/, `${f}: a range ending at origin/main can never fail`);
  // npm's aliases run the script that exists; tend.js passes the commands on, in a repository of its own.
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  for (const c of ['next-decision', 'next-audit', 'files', 'landed', 'review-paths', 'items']) assert.equal(pkg.scripts[`book:${c}`], `node scripts/bookkeeping.js ${c}`, c);
  const r = repo('via-tend');
  mkdirSync(join(r.dir, 'scripts'), { recursive: true });
  for (const f of ['tend.js', 'bookkeeping.js', 'records.js']) writeFileSync(join(r.dir, 'scripts', f), read(`scripts/${f}`));
  r.commit('zrides audit 4: x');
  r.publish();
  const via = spawnSync(process.execPath, ['scripts/tend.js', 'next-audit', 'zrides'], { cwd: r.dir, env, encoding: 'utf8' });
  assert.equal(via.status, 0, via.stderr);
  assert.equal(via.stdout.split('\n')[0], '5');
});
