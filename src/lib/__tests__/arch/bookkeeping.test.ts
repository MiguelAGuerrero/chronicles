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

test('bookkeeping: next-decision is the highest number in docs/decisions plus one, padded as the files are', { todo: 'the commands come next' }, () => {
  const names = ['README.md', '0001-replay-five-beats.md', '0173-rule-files.md', '0042-x.md', 'notes.txt'];
  const s = book.decisionState(names);
  assert.equal(s.next, '0174');
  assert.deepEqual(s.highest, { number: '0173', file: '0173-rule-files.md' });
  assert.equal(book.decisionState(['001-a.md', '009-b.md']).next, '010', 'the width the files use');
  assert.equal(book.decisionState(['9999-a.md']).next, '10000', 'past the width, the number grows');
  assert.equal(book.decisionState(['README.md']).next, '0001', 'none yet: the repository\'s width, four');
  assert.deepEqual(book.decisionState(['0007-a.md', '0007-b.md', '0006-c.md']).duplicates, [{ number: '0007', files: ['0007-a.md', '0007-b.md'] }]);
});

test('bookkeeping: next-decision --check fails on a number main gave another file, on a gap and on a file numbered otherwise', { todo: 'the commands come next' }, () => {
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

test('bookkeeping: next-decision reads origin/main, not HEAD or the working tree, and --check catches a number main took meanwhile', { todo: 'the commands come next' }, () => {
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

// ---------------------------------------------------------------------------------------------------
// next-audit

test('bookkeeping: next-audit reads "<prefix> audit N" in single numbers, ranges and lists, and no other prefix', { todo: 'the commands come next' }, () => {
  const src = (text: string) => ({ where: 'commit', text });
  const subjects = [
    'tend map audit 12: the pin',
    'tend map audit 27-31: the pins\' time',
    'Revert "tend map audit 32: x"',
    'tend map: two fixes (tend map audits 33, 34 and 35)',
    'tend map audit 7, no number of its own',
    'tend explore audit 90: elsewhere',
    'sitemap audit 99: not the map',
    'Records: the third audit (records audit 41-54)',
    'tend map audit 1–3: an en dash',
  ];
  const map = book.auditNumbers('tend map', subjects.map(src));
  assert.equal(map.highest, 35);
  assert.equal(map.next, 36);
  assert.equal(book.auditNumbers('map', subjects.map(src)).highest, null, '"map" is not "tend map" nor "sitemap"');
  assert.equal(book.auditNumbers('records', subjects.map(src)).highest, 54);
  assert.equal(book.auditNumbers('Tend Map', [src('tend map audit 3: x')]).highest, 3, 'case is ignored');
  assert.equal(book.auditNumbers('transcripts', [src("test('memo-transcripts audit 4: x')")]).highest, null, 'part of a slug is not the slug');
  assert.equal(book.auditNumbers('memo-transcripts', [src("test('memo-transcripts audit 4: x')"), src("step('memo-transcripts audit 6 the caption')")]).highest, 6);
  assert.deepEqual(book.auditNumbers('rides', []), { highest: null, next: 1, hits: [] });
});

test('bookkeeping: next-audit searches origin/main\'s subjects and the tests under src and the journeys, nothing else', { todo: 'the commands come next' }, () => {
  const r = repo('audits');
  r.commit('rides audit 2: a subject');
  r.write('src/lib/__tests__/rides/rides.test.ts', "test('rides audit 7: the ride', () => {});\n");
  r.write('src/lib/__tests__/rides/with space/a b.test.ts', "test('Rides audit 8: a path with spaces', () => {});\n");
  r.write('scripts/e2e/journeys/rides.js', "step('rides audit 9 the journey');\n");
  r.write('docs/notes.md', 'rides audit 99 in a doc is not a test\n');
  r.commit('tests');
  r.publish();
  r.commit('rides audit 12: on the branch, not on main');
  r.write('src/lib/__tests__/rides/later.test.ts', "test('rides audit 13: in the working tree', () => {});\n");
  const plain = r.run('next-audit', 'rides');
  assert.equal(plain.status, 0, plain.stderr);
  assert.equal(plain.stdout.split('\n')[0], '10');
  assert.match(plain.stdout, /scripts\/e2e\/journeys\/rides\.js/);
  const j = json(r.run('next-audit', 'rides', '--json'));
  assert.equal(j.highest, 9);
  assert.equal(j.next, 10);
  const none = r.run('next-audit', 'tend walk');
  assert.equal(none.status, 0);
  assert.equal(none.stdout.split('\n')[0], '1');
  assert.equal(r.run('next-audit').status, 2, 'a prefix is required');
});

// ---------------------------------------------------------------------------------------------------
// files

test('bookkeeping: files groups a path as src, tests, journeys, docs and records, skills and scripts, or other', { todo: 'the commands come next' }, () => {
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

test('bookkeeping: files counts committed, staged, unstaged, deleted and untracked changes against the merge base, and --max-src trips', { todo: 'the commands come next' }, () => {
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
  const over = r.run('files', '--max-src', '1');
  assert.equal(over.status, 1);
  assert.match(over.stderr, /2 .*--max-src 1/);
  assert.equal(r.run('files', '--max-src', '2').status, 0);
  // A range counts what its commits changed, and nothing uncommitted.
  const range = json(r.run('files', 'origin/main..HEAD', '--json')) as { counts: Record<string, number> };
  assert.deepEqual(range.counts, { src: 1, tests: 0, journeys: 0, docs: 0, scripts: 0, other: 0 });
  assert.equal(r.run('files', 'nope..HEAD').status, 2);
});

// ---------------------------------------------------------------------------------------------------
// landed

test('bookkeeping: the entry bundle is read from an Expo web export\'s page', { todo: 'the commands come next' }, () => {
  const page = '<html><head><script src="/chronicles/_expo/static/js/web/entry-0a1b2c3d4e5f.js" defer></script></head></html>';
  assert.equal(book.entryBundle(page), 'entry-0a1b2c3d4e5f.js');
  assert.equal(book.entryBundle('<script src="/_expo/static/js/web/entry-ff.js"></script>'), 'entry-ff.js');
  assert.equal(book.entryBundle('<html>no bundle</html>'), null);
});

test('bookkeeping: landed checks the range is on origin/main, the branch and its worktree are gone, and the live bundle against dist/', { todo: 'the commands come next' }, () => {
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
  r.commit('one');
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

// ---------------------------------------------------------------------------------------------------
// review-paths

test('bookkeeping: review-paths reads the absolute paths of a prompt, and nothing that is a URL, a route or a skill', { todo: 'the commands come next' }, () => {
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

test('bookkeeping: review-paths names each missing path and a missing prompt, and passes a prompt whose paths exist', { todo: 'the commands come next' }, () => {
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
- [kept] Swatches: three walked swatches.
  Since Nov 13: a different note.

## Captures, media and export

### Video

- [ ] [phone] A long video plays on the phone.
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

test('bookkeeping: items lists DEFERRED\'s items with their section, tag, first line and the shortest match records.js accepts', { todo: 'the commands come next' }, () => {
  const items = book.listItems('deferred', DEFERRED);
  assert.deepEqual(items.map((i) => [i.section, i.tag, i.match]), [
    ['Explore and discovery', 'loop', 'The busy ring draws'],
    ['Explore and discovery', 'owner', 'The busy ring flickers'],
    ['Explore and discovery', null, null],
    ['Explore and discovery', 'loop', 'Nov 12'],
    ['Explore and discovery', 'kept', 'Nov 13'],
    ['Captures, media and export › Video', 'phone', 'A long'],
    ['Captures, media and export › Video', 'arch', 'Export'],
  ]);
  assert.equal(items[0].first, 'The busy ring draws twice when the map settles.');
  assert.deepEqual(items.map((i) => i.line), [7, 8, 9, 10, 12, 19, 20]);
  for (const it of items.filter((i) => i.match)) assert.ok(accepted('deferred', DEFERRED, it), `records.js names "${it.first}" by "${it.match}"`);
  // "The busy ring" is in three items: records.js refuses it, so it has no match.
  assert.throws(() => records.apply('deferred', 'item note', DEFERRED, { match: 'The busy ring', body: 'x' }), /is in 3 items/);
  assert.deepEqual(book.listItems('deferred', DEFERRED, { tag: 'loop' }).map((i) => i.match), ['The busy ring draws', 'Nov 12']);
  assert.deepEqual(book.listItems('deferred', DEFERRED, { tag: 'none' }).map((i) => i.first), ['The busy ring']);
  assert.deepEqual(book.listItems('deferred', DEFERRED, { section: 'video' }).map((i) => i.tag), ['phone', 'arch']);
});

test('bookkeeping: items lists the inbox by number and the items open before the loop by match', { todo: 'the commands come next' }, () => {
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

test('bookkeeping: items reads origin/main by default, the working tree with --worktree, and fails when an item has no match', { todo: 'the commands come next' }, () => {
  const r = repo('items');
  r.write('docs/DEFERRED.md', DEFERRED);
  r.write('docs/STATUS.md', STATUS);
  r.commit('records');
  r.publish();
  r.write('docs/DEFERRED.md', DEFERRED.replace('- The busy ring\n', '- [loop] A later item.\n'));
  const main = r.run('items', 'deferred');
  assert.equal(main.status, 1, 'origin/main holds an item no match names');
  assert.match(main.stderr, /The busy ring/);
  assert.match(main.stdout, /^## Explore and discovery$/m);
  assert.match(main.stdout, /match: "The busy ring draws"/);
  const tree = r.run('items', 'deferred', '--worktree');
  assert.equal(tree.status, 0, tree.stderr);
  assert.match(tree.stdout, /match: "A later"/);
  const j = json(r.run('items', 'inbox', '--tag', 'owner', '--json')) as { items: Item[] };
  assert.deepEqual(j.items.map((i) => i.match), ['T21']);
  assert.equal(r.run('items', 'open').status, 0);
  assert.equal(r.run('items', 'deferred', '--tag', 'loop').status, 0, 'the filter leaves the unmatched item out');
  assert.equal(r.run('items', 'nope').status, 2);
});

// ---------------------------------------------------------------------------------------------------
// The commands' names, where the procedures use them.

test('bookkeeping: package.json runs the commands, tend.js passes them on, and the skills name them where they did the work by hand', { todo: 'the commands come next' }, () => {
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  for (const s of ['next-decision', 'next-audit', 'files', 'landed', 'review-paths', 'items']) assert.equal(pkg.scripts[`book:${s}`], `node scripts/bookkeeping.js ${s}`, s);
  const via = spawnSync(process.execPath, [join(ROOT, 'scripts', 'tend.js'), 'next-audit', 'tend nothing-ever'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(via.status, 0, via.stderr);
  assert.equal(via.stdout.split('\n')[0], '1');
  const names = (rel: string, ...what: RegExp[]) => {
    const text = read(rel);
    for (const re of what) assert.match(text, re, `${rel} names ${re}`);
  };
  names('.claude/skills/tend/SKILL.md', /book:next-audit/, /book:next-decision -- --check/, /book:files -- --max-src/, /book:items/);
  names('.claude/skills/slice/SKILL.md', /book:next-decision/, /book:next-audit/);
  names('.claude/skills/ship.md', /book:next-decision -- --check/, /book:landed/);
  names('.claude/skills/tend-orchestrator/SKILL.md', /book:review-paths/, /book:landed/, /book:items/);
  names('.claude/skills/tend-orchestrator/briefs.md', /book:next-audit/, /book:next-decision -- --check/, /book:files -- --max-src/);
  names('.claude/skills/audit/SKILL.md', /book:next-audit/);
});
