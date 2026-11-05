// @tree-wide: the procedures audit (Nov 5): the skills, the agents, the Stop hook and the settings, held to what a model following them needs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

// specs/procedures-audit/audit.md: 17 findings against Anthropic's guidance for skills, subagents and hooks.

const ROOT = join(__dirname, '..', '..', '..', '..');
const load = createRequire(__filename);
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const skill = (name: string) => read(`.claude/skills/${name}/SKILL.md`);
const SKILLS = readdirSync(join(ROOT, '.claude', 'skills'));
const tmp = mkdtempSync(join(tmpdir(), 'procedures-audit-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const gitIn = (cwd: string) => (...a: string[]) =>
  execFileSync('git', ['-c', 'user.email=t@example.invalid', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', ...a], { cwd, encoding: 'utf8' });

test('procedures audit 1: the Stop hook checks the worktree it runs in, and a committed branch without an upstream', () => {
  const hook = read('.claude/hooks/check-done.sh');
  assert.match(hook, /\.cwd/, 'the hook reads the cwd Claude Code passes it, so a /fix worktree is the root it checks');
  assert.match(hook, /affected\.js changed/, 'what changed comes from one tested function');
  const { changedFiles: changes, changedPaths } = load(join(ROOT, 'scripts', 'affected.js')) as { changedFiles(dir: string): { changes: { path: string; from?: string }[] }; changedPaths(c: { path: string; from?: string }[]): string[] };
  const changedFiles = (dir: string) => changedPaths(changes(dir).changes);
  const repo = join(tmp, 'hookRepo');
  mkdirSync(repo);
  const git = gitIn(repo);
  git('init', '-q', '-b', 'main');
  writeFileSync(join(repo, 'a.ts'), 'export const a = 1;\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('checkout', '-qb', 'fix/x');
  writeFileSync(join(repo, 'b.ts'), 'export const b = 2;\n');
  git('add', '-A');
  git('commit', '-qm', 'the fix');
  // Committed, clean, and no upstream: the commit is still what changed.
  assert.deepEqual(changedFiles(repo), ['b.ts']);
  writeFileSync(join(repo, 'c.ts'), '');
  assert.deepEqual(changedFiles(repo), ['b.ts', 'c.ts']);
});

test('procedures audit 2: /fix\'s auditor brief names the worktree path and the fix\'s test naming', () => {
  const fix = skill('fix');
  const review = fix.slice(fix.indexOf('## 5.'), fix.indexOf('## 6.'));
  assert.match(review, /worktree path/, 'the brief gives the auditor the worktree to read and run in');
  assert.match(review, /fix <name> audit N/);
  const auditor = read('.claude/agents/auditor.md');
  assert.match(auditor, /worktree/, 'the auditor knows to work where it is pointed');
  assert.match(auditor, /fix <name> audit N/, 'and names a fix\'s findings as /fix does');
});

test('procedures audit 3: /fix and /deploy list origin/main..HEAD and stop on commits that are not theirs before pushing main', () => {
  const fix = skill('fix');
  const push = fix.indexOf('git push origin fix/');
  assert.ok(push > 0);
  assert.ok(fix.lastIndexOf('git log --oneline origin/main..HEAD', push) > 0, '/fix lists what would reach main before its push');
  assert.match(fix.slice(0, push), /not this fix's[^.]*stop/i);
  const deploy = skill('deploy');
  const step2 = deploy.slice(deploy.indexOf('## 2.'), deploy.indexOf('## 3.'));
  assert.match(step2, /AskUserQuestion/, '/deploy asks before shipping commits the owner did not name');
});

test('procedures audit 4: check:test-first judges only ids new on the branch', () => {
  const repo = join(tmp, 'tfRepo');
  mkdirSync(join(repo, 'src', 'lib', '__tests__', 'rides'), { recursive: true });
  mkdirSync(join(repo, 'specs', 'demo'), { recursive: true });
  const git = gitIn(repo);
  const t = join(repo, 'src', 'lib', '__tests__', 'rides', 'demo.test.ts');
  writeFileSync(join(repo, 'specs', 'demo', 'spec.md'), '1. **DM1** one\n2. **DM2** two\n');
  // DM1 shipped in an earlier round, on main.
  writeFileSync(t, "test('DM1: one', () => {});\n");
  git('init', '-q', '-b', 'main');
  git('add', '-A');
  git('commit', '-qm', 'round 1');
  git('checkout', '-qb', 'round2');
  writeFileSync(t, "test('DM1: one', () => {});\ntest('DM2: two', { todo: 'test first' }, () => {});\n");
  git('commit', '-qam', 'tests first');
  writeFileSync(t, "test('DM1: one', () => {});\ntest('DM2: two', () => {});\n");
  git('commit', '-qam', 'code');
  const out = execFileSync('node', [join(ROOT, 'scripts', 'test-first.js'), 'demo'], { cwd: repo, encoding: 'utf8', env: { ...process.env, TEST_FIRST_ROOT: repo, TEST_FIRST_BASE: 'main' } });
  assert.match(out, /DM1 ok: .*already tested on the base/);
  assert.match(out, /DM2 ok/);
});

test('procedures audit 5: /fix lists which /deploy preconditions apply per --tests level, and reads /deploy rather than invoking it', () => {
  const fix = skill('fix');
  const deployStep = fix.slice(fix.indexOf('## 8.'), fix.indexOf('## 9.'));
  for (const level of ['none', 'lean', 'scoped', 'full']) assert.match(deployStep, new RegExp(`\`${level}\``), `the ${level} level's preconditions`);
  assert.match(deployStep, /Read `\.claude\/skills\/deploy\/SKILL\.md`/, '/deploy is owner-invoked: /fix reads it');
  assert.match(deployStep, /not `git checkout main`/, 'main is pushed from the fix branch, never checked out in the worktree');
});

test('procedures audit 6: docs-gc\'s shipped-slices scan finds the shipped rows', () => {
  const { shippedSlices } = load(join(ROOT, 'scripts', 'shipped.js')) as { shippedSlices(status: string): string[] };
  const rows = shippedSlices(read('docs/STATUS.md'));
  assert.ok(rows.length >= 10, `shipped rows found: ${rows.length}`);
  assert.ok(rows.some((r) => r.startsWith('Test organization')));
  assert.match(skill('docs-gc'), /node scripts\/shipped\.js/);
  assert.doesNotMatch(skill('slice'), /row to Shipped/, 'STATUS has no Shipped section: the row\'s status changes');
});

test('procedures audit 7: a re-export keeps the spec\'s Vision and audit sections', () => {
  const step = skill('docs-gc').slice(skill('docs-gc').indexOf('## 4.'), skill('docs-gc').indexOf('## 5.'));
  for (const s of ['## Vision', 'Audit', 'keep']) assert.ok(step.includes(s), `docs-gc's re-export says ${s}`);
});

test('procedures audit 8: /audit is owner-invoked and the auditor\'s description says only on the owner\'s ask', () => {
  assert.match(skill('audit').split('---')[1], /disable-model-invocation: true/);
  const desc = /description: (.*)/.exec(read('.claude/agents/auditor.md'))![1];
  assert.match(desc, /only when the owner asks/i);
});

test('procedures audit 9: every e2e:web command in the skills names a journey and its export, or is the owner\'s full flow', () => {
  for (const s of SKILLS) {
    for (const line of skill(s).split('\n').filter((l) => l.includes('e2e:web'))) {
      assert.ok(/E2E_ONLY=/.test(line) || /only when the owner asks/.test(line), `${s}: ${line}`);
      assert.ok(/export:web/.test(line), `${s}: an e2e run reads dist/, so the line exports first: ${line}`);
    }
  }
});

test('procedures audit 10: /slice says how a todo test reaches a module not yet written', () => {
  assert.match(skill('slice'), /stub/, 'a todo test that imports a new module needs a stub, or the tests-first commit is red');
});

test('procedures audit 11: the invariant lists in /slice and the auditor match AGENTS.md', () => {
  for (const f of ['.claude/skills/slice/SKILL.md', '.claude/agents/auditor.md']) {
    const text = read(f);
    if (/SNAP_RULES/.test(text)) for (const code of ['STREET_CODE', 'LANDING_CODE']) assert.ok(text.includes(code), `${f} names ${code} beside SNAP_RULES`);
    if (/readTrace/.test(text)) assert.match(text, /gap fills/, `${f}: readTrace takes the gap fills too`);
  }
  assert.doesNotMatch(read('.claude/agents/auditor.md'), /web exceptions[^.]*in the rules/i, 'AGENTS.md lists them in docs/ARCHITECTURE.md');
});

test('procedures audit 12: the project settings deny force pushes and deleting main', () => {
  const deny = (JSON.parse(read('.claude/settings.json')) as { permissions?: { deny?: string[] } }).permissions?.deny ?? [];
  for (const want of [/--force\b/, /\s-f\b/, /--delete/, /:main\b/]) assert.ok(deny.some((r) => r.startsWith('Bash(') && want.test(r)), `a deny rule for ${want}`);
});

test('procedures audit 13: the live check says what it can show, and says so when the page can\'t be reached', () => {
  for (const s of ['deploy', 'fix']) {
    assert.doesNotMatch(skill(s), /confirm the build is the new one/i, `${s}: no claim the page cannot back`);
    assert.match(skill(s), /can't be reached/, `${s}: an unreachable page is reported, not passed`);
  }
});

test('procedures audit 14: /fix and /slice carry a checklist a model copies and ticks', () => {
  for (const s of ['fix', 'slice']) {
    const text = skill(s);
    assert.match(text, /^## Checklist/m, `${s} has a checklist`);
    assert.ok((text.match(/^- \[ \] /gm) ?? []).length >= 6, `${s}: its steps as boxes`);
  }
});

test('procedures audit 15: /audit commits with the audit test names and says how to find the base', () => {
  const audit = skill('audit');
  assert.match(audit, /git merge-base/);
  assert.match(audit, /git commit[\s\S]{0,200}audit N/);
});

test('procedures audit 16: every journey file has a row in /e2e', () => {
  const e2e = skill('e2e');
  const journeys = readdirSync(join(ROOT, 'scripts', 'e2e', 'journeys')).filter((f) => f.endsWith('.js') && f !== 'full.js').map((f) => f.replace(/\.js$/, ''));
  const missing = journeys.filter((j) => !new RegExp(`\`${j}\``).test(e2e));
  assert.deepEqual(missing, []);
});

test('procedures audit 17: what the skills name exists: skills, the GitHub tools, the hook\'s checks, a branch, the loop count', () => {
  const builtIn = new Set(['simplify', 'code-review', 'loop', 'docs-gc', 'clear', 'compact']);
  for (const s of SKILLS) {
    for (const m of skill(s).matchAll(/(?:^|[\s(`])\/([a-z][a-z-]+)\b(?![/.])/g)) {
      const name = m[1];
      if (['chronicles', 'tmp', 'navigate', 'walk', 'explore', 'chronicle', 'replay', 'day'].includes(name)) continue;
      assert.ok(SKILLS.includes(name) || builtIn.has(name), `${s} names /${name}, which is no skill`);
    }
  }
  assert.doesNotMatch(skill('deploy'), /gh` is not available/, 'gh exists for search; the GitHub MCP tools are for the rest');
  assert.match(skill('fix'), /check:vision/, 'the hook and CI run the vision check too');
  assert.match(skill('fix'), /--loops=0/, 'what no loop means is said');
  assert.match(skill('slice'), /git (checkout -b|switch -c)/, 'a slice starts on a branch, which IN_PROGRESS names');
});
