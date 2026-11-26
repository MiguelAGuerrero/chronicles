// @tree-wide: the tending loop's script, its ledger and the skills it routes through
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// The loop's mechanical reads (decisions 0128-0130): growth against refinement, and what a loop commit carries.

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
type Reading = { reading: string; propose: boolean; why: string };
type File = { status: string; path: string; from?: string };
const tend = createRequire(__filename)(join(ROOT, 'scripts', 'tend.js')) as {
  STATES: string[];
  FORBIDDEN: RegExp[];
  classify(subject: string, o?: { files?: string[]; known?: Set<string> }): 'growth' | 'refinement' | 'other';
  criteriaPrefixes(subject: string, known?: Set<string>): string[];
  tally(commits: { subject: string; files?: string[] }[], known?: Set<string>): { growth: number; refinement: number; other: number; slices: string[] };
  readStatus(text: string): { openT: number; phoneT: number; openG: number };
  reading(input: { slices: number; rough: number; openT: number }): Reading;
  nextArea(counts: Record<string, number>, areas?: Record<string, { state: string }>): string | null;
  isLoops(subject: string): boolean;
  dropBoundary<T extends { sha: string }>(commits: T[], boundary: Set<string>): T[];
  testName(subject: string): string | null;
  tendCommitProblems(c: { subject: string; body: string; files: File[]; added?: string; rewritesLog?: boolean; rewritesRules?: string[]; expectationEdits?: string[] }): string[];
  citedOwnEdits(commits: { subject: string; body: string; files: File[] }[]): { subject: string; problem: string }[];
  rewritesBaseLines(removed: string[], base: string): boolean;
  mainOrHere(rel: string, show: (rel: string) => string | null, here: (rel: string) => string): string;
  logProblems(given: unknown): string[];
  compassReading(runs: Record<string, unknown>[], window?: number): { rows: Record<string, unknown>[]; sum: Record<string, number>; shares: { first: number | null; second: number | null }; trend: string; verdict: string; ledger: Record<string, unknown> };
  compassText(r: ReturnType<typeof tend.compassReading>): string;
  runLine(r: { date: string; subjects: string[]; given: Record<string, unknown> }): Record<string, unknown>;
  fullPassDue(lines: string[], today: string, days?: number): { due: boolean; last: { date: string; base: string | null } | null; dueFrom: string | null };
  controlsIn(text: string): number;
  isRoute(path: string): boolean;
  resetsArea(commit: { subject: string; files: Diffed[] }, owns: (path: string) => boolean): boolean;
  readPatches(out: string): { sha: string; subject: string; files: Diffed[] }[];
};
type Diffed = { status: string; path: string; from?: string; plus?: string; minus?: string };
const known = new Set(['PK', 'RF', 'PW', 'OT', 'MS', 'MT', 'QL', 'OP', 'EC']);

test('tend: a subject is growth by its criteria, refinement by fix, tend, audit or revert, else other', () => {
  assert.equal(tend.classify('Presence and kinds: a museum the data calls historic lights History (PK1-PK19) (#4)'), 'growth');
  assert.equal(tend.classify('fix thread-log audit 7, 8, 9: a plain note and its time are one named group'), 'refinement');
  assert.equal(tend.classify("presence-and-kinds audit 8, 10: the owner's call"), 'refinement');
  assert.equal(tend.classify('tend memories 3: the Undo names what it restores'), 'refinement');
  assert.equal(tend.classify('Revert "Explore: a row of cards (EC1-EC20)"'), 'refinement');
  assert.equal(tend.classify('Merge origin/main into claude/x: the decision renumbered (PK1)'), 'other');
  assert.equal(tend.classify('Testing: choose the e2e journeys, not every one check:affected names'), 'other');
});

test('tend round 1: a slice whose subject mentions its audit, or leads with its id, is still growth', () => {
  assert.equal(tend.classify('Places worth the stop: the places archive and Curiosities (PW1-PW19, places-worth-the-stop audit 1-7)', { known }), 'growth');
  assert.equal(tend.classify('UX grounding: a ux-reviewer in /audit; Respond is a menu (OT1)', { known }), 'refinement', 'audit named outside the group is the work itself');
  assert.equal(tend.classify('PW16: the places archive is read from the data repo', { known }), 'growth');
  assert.deepEqual(tend.criteriaPrefixes('Moment stacks: STATUS for the deploy (MT1-MT11, MS1-MS21)'), ['MS', 'MT']);
  assert.deepEqual(tend.criteriaPrefixes('fix x: decision 0125 and 1695 tests'), []);
});

test('tend round 1: only prefixes the specs use count, and only commits that change the app', () => {
  assert.deepEqual(tend.criteriaPrefixes('Memories: search by word (G4)', known), []);
  assert.deepEqual(tend.criteriaPrefixes('A label (WCAG 2.2, SC1)', known), []);
  assert.equal(tend.classify('Memories: search by word (G4)', { known }), 'other');
  assert.equal(tend.classify('Moment references: tests first (RF1-RF8, failing)', { known, files: ['src/lib/__tests__/threads/refs.test.ts'] }), 'other');
  assert.equal(tend.classify("Moment stacks: round 2's docs (MS16-MS21)", { known, files: ['docs/PRODUCT.md'] }), 'other');
  assert.equal(tend.classify('Places out of town is queued: its criteria deferred in UNTESTED (OP1-OP20)', { known, files: ['scripts/features.js', 'specs/places-out-of-town/spec.md'] }), 'other');
  assert.equal(tend.classify('Moment references: a note mentions other moments with @ (RF1-RF8)', { known, files: ['src/lib/refs.ts', 'src/lib/__tests__/threads/refs.test.ts'] }), 'growth');
});

test('tend: the tally counts each kind and names the slices that grew', () => {
  const t = tend.tally([
    { subject: 'A slice (QL1-QL8)', files: ['src/app/a.tsx'] },
    { subject: 'A slice: docs (QL1-QL8)', files: ['docs/PRODUCT.md'] },
    { subject: 'fix a thing', files: ['src/app/a.tsx'] },
    { subject: 'Another (RF1)', files: ['src/lib/b.ts'] },
  ], known);
  assert.deepEqual(t, { growth: 2, refinement: 1, other: 1, slices: ['QL', 'RF'] });
});

test('tend: the reading holds back on a rough base before it asks for growth', () => {
  const base = { slices: 2, rough: 1, openT: 2 };
  assert.equal(tend.reading(base).reading, 'in step');
  assert.equal(tend.reading(base).propose, false);
  assert.deepEqual([tend.reading({ ...base, slices: 0 }).reading, tend.reading({ ...base, slices: 0 }).propose], ['settling', true]);
  // Four rough areas, or eleven unanswered entries: nothing new is proposed, even with no growth.
  assert.deepEqual([tend.reading({ ...base, slices: 0, rough: 4 }).reading, tend.reading({ ...base, slices: 0, rough: 4 }).propose], ['outgrowing its base', false]);
  assert.equal(tend.reading({ ...base, openT: 11 }).reading, 'outgrowing its base');
  assert.equal(tend.reading({ ...base, rough: 3, openT: 10 }).reading, 'in step');
  assert.doesNotMatch(tend.reading({ ...base, rough: 4 }).why, /\d/, 'the reason is said in words');
  assert.doesNotMatch(tend.reading({ ...base, openT: 40 }).why, /\d/);
});

test('tend round 1: STATUS.md gives the open entries; a phone entry is not one the owner can answer at a desk', () => {
  const text = [
    '## Needs the owner', '', '- **T3 [owner] A thing in Zurich** (2026-11-11)', '  Seen: a picture.', '- **T4 [phone] Another**',
    '* **T5** [owner] starred', '  - **T6 [arch] indented**', '- **G1 [M] Search** · Return', '- **G1 [M] Search** · Return', '',
    '## In flight', '| Zurich | Z | Z |',
  ].join('\n');
  assert.deepEqual(tend.readStatus(text), { openT: 3, phoneT: 1, openG: 1 });
  assert.deepEqual(tend.readStatus('## Needs the owner\n'), { openT: 0, phoneT: 0, openG: 0 });
  assert.equal(typeof tend.readStatus(read('docs/STATUS.md')).openT, 'number');
});

test('tend round 1: an area a change reset since its sweep (decision 0229) is rough whatever the ledger says', () => {
  assert.deepEqual(tend.STATES, ['rough', 'settling', 'polished', 'resting']);
  // Since area-states the state is computed (areaState), the ledger's word kept only for resting: a reset beats both.
  const polished = { sweeps: [g6sweep({ whole: true })] };
  assert.equal(g6.areaState(polished).state, 'polished');
  assert.equal(g6.areaState({ ...polished, ledgerState: 'resting' }).state, 'resting');
  assert.equal(g6.areaState({ ...polished, resetsSince: ['abc1234'] }).state, 'rough');
  assert.equal(g6.areaState({ ...polished, ledgerState: 'resting', resetsSince: ['abc1234'] }).state, 'rough');
});

test('tend round 1: with no area named, the one changed most since its sweep is next', () => {
  assert.equal(tend.nextArea({ map: 2, replay: 5, memories: 5, tabs: 0 }), 'memories');
  assert.equal(tend.nextArea({ map: 0 }), null);
});

test('tend round 2: with nothing changed, an area the last sweep left rough or settling is next, never one at rest', () => {
  const areas = { replay: { state: 'polished' }, tabs: { state: 'settling' }, map: { state: 'rough' }, memories: { state: 'resting' } };
  assert.equal(tend.nextArea({ map: 0, replay: 0, tabs: 0, memories: 0 }, areas), 'map');
  assert.equal(tend.nextArea({ replay: 0, tabs: 0 }, { replay: areas.replay, tabs: areas.tabs }), 'tabs');
  assert.equal(tend.nextArea({ replay: 0 }, { replay: areas.replay, memories: areas.memories }), null);
});

test('tend round 2: the loop never marks its own area rough, by a commit or by its revert; a boundary commit is not read', () => {
  assert.equal(tend.isLoops('tend memories 3: the Undo names what it restores'), true);
  assert.equal(tend.isLoops('Revert "tend memories 3: the Undo names what it restores"'), true);
  assert.equal(tend.isLoops('fix memories: a thing'), false);
  assert.equal(tend.isLoops('Revert "Memories: search (MC1)"'), false);
  assert.deepEqual(tend.dropBoundary([{ sha: 'a' }, { sha: 'b' }], new Set(['b'])), [{ sha: 'a' }]);
});

test('tend round 2: a busy fortnight is never settling for want of a proposal', () => {
  assert.equal(tend.reading({ slices: 16, rough: 0, openT: 0 }).reading, 'in step');
  assert.equal(tend.reading({ slices: 0, rough: 0, openT: 0 }).reading, 'settling');
});

const A = (path: string): File => ({ status: 'A', path });
const M = (path: string): File => ({ status: 'M', path });
const ok = {
  subject: 'tend memories 2: Undo is a button with a name',
  body: 'Test: tend memories 2\nSource: WCAG 2.2, 4.1.2 Name, Role, Value\n',
  files: [M('src/components/Undo.tsx'), A('src/lib/__tests__/memories/undo.test.ts')],
  added: "+test('tend memories 2: Undo has a name', () => {",
};

test('tend: a loop commit that changes code carries a test and names its source; the record needs neither', () => {
  assert.deepEqual(tend.tendCommitProblems(ok), []);
  assert.deepEqual(tend.tendCommitProblems({ ...ok, files: [M('src/components/Undo.tsx'), M('scripts/e2e/journeys/memories.js')] }), []);
  assert.equal(tend.tendCommitProblems({ ...ok, files: [M('src/components/Undo.tsx')] }).length, 1);
  assert.equal(tend.tendCommitProblems({ ...ok, body: 'It looked wrong.' }).length, 1);
  assert.deepEqual(tend.tendCommitProblems({ ...ok, body: '  source: ui-patterns.md, "one primary action"' }).length, 1, 'the line is spelled Source:');
  assert.deepEqual(tend.tendCommitProblems({ subject: "tend memories: the run's record", body: '', files: [M('docs/STATUS.md'), M('docs/DEFERRED.md'), M('.claude/skills/tend/ledger.json'), M('.claude/rules/memories.md')] }), []);
  assert.deepEqual(tend.tendCommitProblems({ ...ok, subject: 'tend memories audit 1: Undo keeps its name after a reload', body: '', added: "+test('tend memories audit 1: x', () => {" }), [], 'an audit fix answers a failing input, not a source');
  assert.deepEqual(tend.tendCommitProblems({ ...ok, subject: 'tend memories T12: a way back from a reply', added: "+  check(ok, 'tend memories T12: back')" }), []);
  assert.deepEqual(tend.tendCommitProblems({ subject: 'tend inbox: T4 declined, a rule recorded', body: '', files: [M('docs/STATUS.md'), A('docs/decisions/0131-never-a-count-there.md'), M('docs/decisions/README.md')] }), []);
});

test('tend round 1: a sweep cannot carry what the loop may not ship', () => {
  const one = (c: Partial<typeof ok>) => tend.tendCommitProblems({ ...ok, ...c });
  assert.match(one({ subject: 'Memories: a new filter' })[0], /not a loop commit/);
  assert.match(one({ subject: 'Tend: something' })[0], /not a loop commit/);
  for (const path of ['docs/VISION.md', 'scripts/vision.allow.json', 'scripts/criteria.baseline.json', 'src/lib/__tests__/layers.baseline.json', 'eslint-suppressions.json', '.claude/hooks/check-done.sh', '.claude/settings.json', 'specs/a/spec.md', 'package.json', 'scripts/e2e/flaky.json', '.github/workflows/pages.yml']) {
    assert.ok(one({ files: [...ok.files, M(path)] }).some((p) => p.includes(path)), `${path} is never the loop's to edit`);
    assert.ok(tend.tendCommitProblems({ subject: 'tend x: notes', body: '', files: [M(path)] }).length > 0, `${path} alone is not a record`);
  }
  assert.ok(one({ files: [M('src/app/a.tsx'), M('scripts/e2e/economy.js')] }).some((p) => /no test/.test(p)), 'a harness file is not a test');
  assert.ok(one({ files: [M('src/app/a.tsx'), { status: 'D', path: 'src/lib/__tests__/memories/undo.test.ts' }] }).some((p) => /deletes a test/.test(p)));
  assert.ok(one({ added: "+test('tend memories 2: x', { todo: 'later' }, () => {})" }).some((p) => /todo or a skip/.test(p)));
  assert.ok(one({ added: '+  check.todo(ok, "tend memories 2")' }).some((p) => /todo or a skip/.test(p)));
  assert.ok(one({ files: [M('.claude/skills/slice/SKILL.md')] }).length > 0, 'a skill is code to the loop, not a note');
});

test('tend round 2: the gates, the procedures, the cited sources and the schema are not the loop\'s to change', () => {
  const one = (c: Partial<typeof ok>) => tend.tendCommitProblems({ ...ok, ...c });
  for (const path of ['scripts/tend.js', 'scripts/check-docs.js', 'scripts/check-vision.js', 'scripts/features.js', 'scripts/e2e/economy.js', 'eslint.config.js', 'tsconfig.json', 'AGENTS.md', '.claude/agents/auditor.md', '.claude/skills/tend/SKILL.md', '.claude/skills/ship.md', '.claude/rules/ui-patterns.md', 'docs/research/ui-references.md', 'src/lib/db/migrations.ts']) {
    assert.ok(one({ files: [...ok.files, M(path)] }).some((p) => p.includes(path)), `${path} with a test beside it`);
    assert.ok(tend.tendCommitProblems({ subject: 'tend x: notes', body: '', files: [M(path)] }).length > 0, `${path} alone`);
  }
  assert.deepEqual(one({ files: [...ok.files, M('scripts/e2e/journeys/memories.js'), M('.claude/skills/tend/ledger.json'), M('.claude/rules/memories.md')] }), []);
  // Renames are read on both sides; a document or a test never leaves.
  assert.ok(tend.tendCommitProblems({ subject: 'tend x: notes', body: '', files: [{ status: 'R', from: 'docs/VISION.md', path: 'docs/OLD.md' }] }).some((p) => /docs\/VISION\.md/.test(p)));
  assert.ok(tend.tendCommitProblems({ subject: 'tend x: notes', body: '', files: [{ status: 'D', path: 'docs/decisions/0094-the-vision-gate.md' }] }).some((p) => /deletes no document/.test(p)));
  assert.ok(tend.tendCommitProblems({ subject: 'tend x: notes', body: '', files: [M('docs/decisions/0094-the-vision-gate.md')] }).some((p) => /never edited/.test(p)));
  assert.ok(one({ files: [M('src/components/Undo.tsx'), { status: 'R', from: 'src/lib/__tests__/memories/undo.test.ts', path: 'src/lib/old/undo.ts' }] }).some((p) => /deletes a test/.test(p)));
});

test('tend round 2: the test beside a loop commit is its own, named for the finding, and real', () => {
  const one = (c: Partial<typeof ok>) => tend.tendCommitProblems({ ...ok, ...c });
  assert.equal(tend.testName('tend memories 3: x'), 'tend memories 3');
  assert.equal(tend.testName('tend memories T12: x'), 'tend memories T12');
  assert.equal(tend.testName('tend memories audit 2: x'), 'tend memories audit 2');
  assert.equal(tend.testName('tend memories: tidy'), null);
  assert.ok(one({ added: '+// a comment in some other test' }).some((p) => /names "tend memories 2"/.test(p)), 'a test touched in passing is not the finding\'s test');
  assert.ok(one({ added: '' }).some((p) => /names "tend memories 2"/.test(p)), 'a test edit that only removes lines');
  assert.ok(one({ subject: 'tend memories: tidy the Undo' }).some((p) => /does not name the finding/.test(p)));
  for (const added of ["+test.todo('tend memories 2: x')", "+xtest('tend memories 2: x', () => {})", "+it.skip('tend memories 2: x', () => {})"]) {
    assert.ok(one({ added }).some((p) => /todo or a skip/.test(p)), added);
  }
  assert.ok(one({ subject: 'tend memories audit 1: a new filter button', body: '', added: '+// nothing' }).length > 0, 'an audit fix still needs its named test');
});

test('tend: the ledger is JSON the script can read, and the skills name the shared procedure', () => {
  const ledger = JSON.parse(read('.claude/skills/tend/ledger.json')) as { lastT: number; lastG: number; areas: Record<string, { state: string }>; declined: unknown[] };
  assert.equal(typeof ledger.lastT, 'number');
  assert.equal(typeof ledger.lastG, 'number');
  assert.ok(Array.isArray(ledger.declined));
  for (const a of Object.values(ledger.areas)) assert.ok(tend.STATES.includes(a.state));
  assert.ok(existsSync(join(ROOT, '.claude', 'skills', 'ship.md')));
  for (const skill of ['fix', 'tend', 'slice']) assert.match(read(`.claude/skills/${skill}/SKILL.md`), /\.claude\/skills\/ship\.md/, `${skill} follows ship.md`);
  const ship = read('.claude/skills/ship.md');
  const named = new Set<string>();
  for (const skill of ['fix', 'tend', 'slice', 'deploy']) for (const m of read(`.claude/skills/${skill}/SKILL.md`).matchAll(/ship\.md`?,?\s+"([^"]+)"/g)) named.add(m[1]);
  for (const h of ['Open the worktree', 'Hard stops', 'Review', 'Publish to main', 'Clean up', 'The result block', ...named]) {
    assert.match(ship, new RegExp(`^###? ${h}$`, 'm'), `ship.md keeps the heading "${h}" the skills name`);
  }
  assert.match(read('.claude/skills/slice/SKILL.md'), /--from=G<n>/);
  assert.doesNotMatch(read('.claude/skills/tend/SKILL.md'), /--from=T/, 'only a proposal with criteria skips the plan review (decision 0130)');
  assert.match(read('package.json'), /"check:tend"/);
});

test('tend 0133: a reviewer\'s shell runs tests and reads, and nothing that writes', () => {
  const hook = join(ROOT, '.claude', 'hooks', 'readonly-bash.sh');
  const run = (command: string) => spawnSync('bash', [hook], { input: JSON.stringify({ tool_input: { command } }), encoding: 'utf8' }).status;
  for (const ok of [
    'npm test 2>&1 | tail -5', 'npx tsx --test src/lib/__tests__/arch/tend.test.ts', 'npm run check:vision -- --list',
    'git log --oneline -5 && grep -rn foo src | head', 'git diff origin/main..HEAD --stat', "sed -n '10,40p' src/lib/geo.ts", 'find src -name "*.tsx" | wc -l', 'git diff > /dev/null',
  ]) assert.equal(run(ok), 0, ok);
  for (const no of [
    'git commit -am x', 'git push origin main', 'git checkout -- .', 'git stash', 'echo hi > file', 'cat x >> y', 'cat $(rm -rf x)', 'cat `id`', 'node -e "1"',
    'find . -name x -delete', 'find . -exec rm {} +', 'npm test; rm -rf src', 'npm test && git reset --hard', "sed -i s/a/b/ f", "sed -n 'w out' f", 'npm install x', 'npx expo install x',
    'ls & rm x', 'git diff --output=patch.txt', 'sort -o out in', 'tee out', 'npm run export:web', 'curl https://example.com',
  ]) assert.equal(run(no), 2, no);
  assert.equal(spawnSync('bash', [hook], { input: '{}', encoding: 'utf8' }).status, 0, 'no command, nothing to judge');
});

test('tend 0133: the reviewers are read-only by their definitions, and CI holds the loop\'s commits', () => {
  for (const agent of ['auditor', 'steward']) {
    const text = read(`.claude/agents/${agent}.md`);
    assert.match(text, /^hooks:\n  PreToolUse:\n    - matcher: "Bash"/m, `${agent} guards its shell`);
    assert.match(text, /readonly-bash\.sh/);
  }
  const ux = read('.claude/agents/ux-reviewer.md');
  assert.match(ux, /^tools: Read, Grep, Glob$/m, 'the ux-reviewer has no shell');
  for (const agent of ['auditor', 'steward', 'ux-reviewer']) assert.doesNotMatch(read(`.claude/agents/${agent}.md`).split('---')[1], /\b(Edit|Write)\b/);
  const ci = read('.github/workflows/pages.yml');
  assert.match(ci, /scripts\/tend\.js commits --loop-only/);
  assert.ok(ci.indexOf('tend.js commits') < ci.indexOf('expo export'), 'before the build');
});

const person = 'A person who wanders a town to notice, using memories, would reasonably expect';
const expectations = {
  lines: [
    { id: 'E-memories-1', is: 'met', evidence: 'memories:"a later walk passing a flagged capture brings it back"' },
    { id: 'E-memories-2', is: 'failed' },
    { id: 'E-memories-3', is: 'lacking', provisional: true },
  ],
  dropped: [{ line: `${person} to see how many moments they kept this week`, never: 'Scores, streaks, completion, coverage, levels, badges, leaderboards' }],
};
const compass = { shipped: 2, filedLow: 1, lensG: [] as string[] };

const sweep = {
  mode: 'sweep', area: 'chronicle', deploy: 'main', base: '83a3f257b6c6',
  lenses: { whole: false, skipped: ['2: 320 px and 200% text not pictured'] },
  found: { loop: { high: 0, medium: 2, low: 9 }, owner: 2, arch: 1, phone: 0, out: 0 },
  filed: { T: ['T1', 'T2', 'T3'], G: [] }, review: { accepted: 1, rejected: 1, deferred: 0 }, state: { from: null, to: 'rough' },
  expectations, compass,
};
// A run logged end to end ships or files what its review accepted (loop-budget audit 1): these ship none.
const NONE_ACCEPTED = { accepted: 0, rejected: 1, deferred: 0 };

test('tend 0134: a run\'s line joins what its commits say with what only the run knows', () => {
  const line = tend.runLine({
    date: '2026-11-11', given: sweep,
    subjects: [
      'tend chronicle 2: a walks list row says its date', 'tend chronicle 1: Escape closes the picker', 'tend chronicle 10: a tenth',
      "tend chronicle: the run's record", 'tend chronicle audit 2: Escape while the More is fading in', 'tend chronicle T1: a kept suggestion is no title',
      'Revert "tend chronicle 2: a walks list row says its date"', 'fix something else',
    ],
  });
  assert.deepEqual(line.shipped, [1, 2, 10]);
  assert.deepEqual(line.auditFixes, [2]);
  assert.deepEqual(line.built, ['T1']);
  assert.deepEqual(line.reverted, ['tend chronicle 2']);
  assert.equal(line.date, '2026-11-11');
  assert.equal(line.area, 'chronicle');
  assert.deepEqual(line.found, sweep.found, 'the run\'s own half is kept as given');
});

test('tend 0134: a line that does not say what the run found, or how it was run, is refused', () => {
  assert.deepEqual(tend.logProblems(sweep), []);
  assert.deepEqual(tend.logProblems({ mode: 'triage', deploy: 'main', base: 'abc1234', filed: { T: ['T4'] } }), []);
  assert.deepEqual(tend.logProblems({ mode: 'inbox', deploy: 'main', base: 'abc1234', answers: [{ entry: 'T3', answer: 'no' }, { entry: 'G1', answer: 'reshape' }] }), []);
  assert.deepEqual(tend.logProblems({ ...sweep, found: undefined, lenses: undefined, backfilled: true }), [], 'a line written after the fact says only what the record says');
  const bad = (g: unknown) => tend.logProblems(g).length > 0;
  assert.ok(bad(null));
  assert.ok(bad({ ...sweep, mode: 'polish' }));
  assert.ok(bad({ ...sweep, area: '' }));
  assert.ok(bad({ ...sweep, deploy: 'live' }));
  assert.ok(bad({ ...sweep, base: 'main' }));
  assert.ok(bad({ ...sweep, found: { loop: { high: 0, medium: 2 }, owner: 2, arch: 1, phone: 0, out: 0 } }), 'every count is said, zero included');
  assert.ok(bad({ ...sweep, found: undefined }));
  assert.ok(bad({ ...sweep, lenses: { whole: true, skipped: ['2'] } }));
  assert.ok(bad({ ...sweep, filed: { T: ['T1', 'the Undo'] } }));
  assert.ok(bad({ ...sweep, answers: [{ entry: 'T3', answer: 'maybe' }] }));
  assert.ok(bad({ ...sweep, review: { accepted: 1 } }));
  assert.ok(bad({ ...sweep, state: { from: 'rough', to: 'done' } }));
});

test('tend 0236: a sweep or a build logs its expectations by id, met naming its evidence, and the compass\'s counts', () => {
  const base = { deploy: 'main', base: 'abc1234' };
  const build = { ...base, mode: 'inbox', answers: [{ entry: 'T3', answer: 'yes' }], built: ['T3'], lens: '0236', expectations, compass };
  const held = { ...sweep, lens: '0236' };
  assert.deepEqual(tend.logProblems(sweep), []);
  assert.deepEqual(tend.logProblems(build), []);
  assert.deepEqual(tend.logProblems({ ...base, mode: 'evolve', expectations }), [], 'an evolve run may log them');
  assert.deepEqual(tend.logProblems({ ...base, mode: 'evolve' }), [], 'only sweeps and builds are held to them');
  assert.deepEqual(tend.logProblems({ ...base, mode: 'inbox', answers: [{ entry: 'T3', answer: 'no' }] }), [], 'an inbox run that builds nothing');
  assert.deepEqual(tend.logProblems({ ...sweep, expectations: undefined, compass: undefined }), [], 'a line the lens\'s script did not write reads as it was');
  assert.deepEqual(tend.logProblems({ ...sweep, filed: { T: [], G: ['G7'] }, compass: { ...compass, lensG: ['G7'] } }), [], 'a G from lens 0 is one the run filed');
  const bad = (g: unknown) => tend.logProblems(g).length > 0;
  const [met, failed, lacking] = expectations.lines;
  const lines = (...l: unknown[]) => ({ ...sweep, expectations: { ...expectations, lines: l } });
  assert.ok(bad({ ...held, expectations: undefined }), 'a sweep says its expectations');
  assert.ok(bad({ ...build, expectations: undefined }), 'a build says its expectations');
  assert.ok(bad({ ...held, compass: undefined }), 'a sweep says the compass\'s counts');
  assert.ok(bad({ ...build, compass: undefined }), 'a build says the compass\'s counts');
  assert.ok(bad({ ...sweep, expectations: [] }));
  assert.ok(bad({ ...sweep, expectations: 'met' }));
  assert.ok(bad(lines()), 'one line at least');
  assert.ok(bad(lines({ ...failed, id: 'memories-2' })), 'a line by its id');
  assert.ok(bad(lines({ ...failed, is: 'partly' })), 'met, failed or lacking');
  assert.ok(bad(lines({ ...met, evidence: undefined })), 'met names its evidence');
  assert.ok(bad(lines({ ...met, evidence: 'pending "it shows"' })), 'a pending check is no evidence');
  assert.ok(bad(lines({ ...lacking, provisional: 'yes' })));
  assert.ok(bad({ ...sweep, expectations: { ...expectations, dropped: [{ line: expectations.dropped[0].line }] } }), 'a dropped line names the Never line it breaks');
  assert.ok(bad({ ...sweep, expectations: { ...expectations, dropped: [{ line: 'counts', never: 'Scores' }] } }), 'a dropped line in the lens\'s form');
  assert.ok(bad({ ...sweep, compass: { ...compass, shipped: -1 } }));
  assert.ok(bad({ ...sweep, compass: { shipped: 1, lensG: [] } }), 'filed low counted, zero included');
  assert.ok(bad({ ...sweep, compass: { ...compass, lensG: ['G9'] } }), 'a lens-0 G is one the run filed');
});

test('tend audit 1: only a line the lens\'s script wrote is held to the lens, whatever its date', () => {
  const line = tend.runLine({ date: '2026-12-01', subjects: [], given: { ...sweep, expectations: undefined, compass: undefined } });
  assert.equal(line.lens, '0236', 'tend:log marks its lines');
  assert.ok(tend.logProblems(line).some((p) => /expectations/.test(p)));
  const old = { ...line, lens: undefined };
  assert.deepEqual(tend.logProblems(old), [], 'an older script\'s line logged on any date reads as it was');
  const r = repo();
  const out = r.tendJs('log', 'HEAD..HEAD', JSON.stringify({ ...sweep, review: NONE_ACCEPTED, area: 'memories', expectations: undefined, compass: undefined }));
  assert.equal(out.status, 1, 'tend:log holds the line it writes');
  assert.match(out.stderr, /logs its expectations/);
  const lines = { lines: [{ id: 'E-memories-1', is: 'met', evidence: 'memories:"a capture comes back"' }] };
  r.commit({ 'docs/expectations/memories.md': STORE.replace('pending "a capture comes back"', 'memories:"a capture comes back"') }, 'the check, by hand');
  const ok = r.tendJs('log', 'HEAD..HEAD', JSON.stringify({ ...sweep, review: NONE_ACCEPTED, area: 'memories', expectations: lines, compass }));
  assert.equal(ok.status, 0, ok.stderr);
  const written = JSON.parse(readFileSync(join(r.root, '.claude/skills/tend/runs.jsonl'), 'utf8').trim()) as Record<string, unknown>;
  assert.equal(written.lens, '0236');
  assert.deepEqual(tend.logProblems(written), []);
  const unknown = r.tendJs('log', 'HEAD..HEAD', JSON.stringify({ ...sweep, review: NONE_ACCEPTED, area: 'memories', expectations: { lines: [{ id: 'E-memories-9', is: 'lacking' }] }, compass }));
  assert.equal(unknown.status, 1, 'the lines are read against the store');
  assert.match(unknown.stderr, /E-memories-9 is no line/);
  const elsewhere = r.tendJs('log', 'HEAD..HEAD', JSON.stringify({ ...sweep, review: NONE_ACCEPTED, area: 'threads', expectations: lines, compass }));
  assert.match(elsewhere.stderr, /not of the run's area, threads/, 'of the run\'s own area');
});

test('tend audit 6: a run cannot date its own line or call it backfilled', () => {
  const line = tend.runLine({ date: '2026-11-21', subjects: [], given: { ...sweep, date: '2020-01-01', lens: 'none' } });
  assert.equal(line.date, '2026-11-21', 'the script writes the date');
  assert.equal(line.lens, '0236');
  const r = repo();
  const json = { ...sweep, review: NONE_ACCEPTED, area: 'memories', expectations: { lines: [{ id: 'E-memories-1', is: 'lacking' }] }, compass };
  for (const extra of [{ date: '2020-01-01' }, { backfilled: true }]) {
    const out = r.tendJs('log', 'HEAD..HEAD', JSON.stringify({ ...json, ...extra }));
    assert.equal(out.status, 1, JSON.stringify(extra));
    assert.match(out.stderr, new RegExp(Object.keys(extra)[0]));
  }
  assert.equal(r.tendJs('log', 'HEAD..HEAD', JSON.stringify(json)).status, 0);
});

test('tend audit 8: a run is held to the lens by what its range built, not by the answers it was given', () => {
  const line = tend.runLine({ date: '2026-11-21', subjects: ['Search over moments: the box (SR1-SR4)', 'tend memories T3: a word', 'fix memories audit 2: x'], given: { mode: 'inbox', deploy: 'main', base: 'abc1234' } });
  assert.deepEqual(line.built, ['T3']);
  assert.deepEqual(line.grew, ['SR'], 'a G build is a slice: its criteria');
  const inbox = { mode: 'inbox', deploy: 'main', base: 'abc1234', lens: '0236', built: [], grew: [] };
  assert.deepEqual(tend.logProblems({ ...inbox, answers: [{ entry: 'G5', answer: 'yes' }] }), [], 'a yes that built nothing (an Open: line, a phone check)');
  assert.ok(tend.logProblems({ ...inbox, built: ['T3'] }).some((p) => /expectations/.test(p)), 'a T built');
  assert.ok(tend.logProblems({ ...inbox, grew: ['SR'] }).some((p) => /expectations/.test(p)), 'a slice built');
});

test('tend audit 20: the run\'s shots folder is a string, used to check its pictures, and kept out of the committed log', () => {
  assert.ok(tend.logProblems({ ...sweep, shots: 5 }).some((p) => /shots/.test(p)));
  const r = repo();
  const json = { ...sweep, review: NONE_ACCEPTED, area: 'memories', expectations: { lines: [{ id: 'E-memories-1', is: 'lacking' }] }, compass };
  const bad = r.tendJs('log', 'HEAD..HEAD', JSON.stringify({ ...json, shots: ['/tmp/shots'] }));
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /shots/);
  const ok = r.tendJs('log', 'HEAD..HEAD', JSON.stringify({ ...json, shots: '/tmp/claude-shots' }));
  assert.equal(ok.status, 0, ok.stderr);
  const written = JSON.parse(readFileSync(join(r.root, '.claude/skills/tend/runs.jsonl'), 'utf8').trim()) as Record<string, unknown>;
  assert.equal('shots' in written, false, 'a scratchpad path is not the log\'s');
});

test('tend audit 22: a trend needs a move of two findings and a tenth of the share at least', () => {
  const half = (pairs: [number, number][], month: string) => pairs.map(([a, b], i) => run(`2026-${month}-${10 + i}`, a, b));
  const rest = Array.from({ length: 3 }, (): [number, number] => [0, 0]);
  const one = tend.compassReading([...half([[1, 0], [1, 0], [1, 0], ...rest], '11'), ...half([[1, 0], [1, 0], [0, 1], ...rest], '12')]);
  assert.equal(one.trend, 'flat', '3 of 3 shipped, then 2 of 3: one finding is no trend');
  assert.equal(one.verdict, 'the compass is not biting: tighten it');
  assert.equal(tend.compassReading([...half([[1, 2], [0, 0], [0, 0], ...rest], '11'), ...half([[0, 3], [0, 0], [0, 0], ...rest], '12')]).verdict, 'the compass is not biting: tighten it', 'one shipped, then none: one finding');
  const two = tend.compassReading([...half([[1, 0], [1, 0], [1, 0], ...rest], '11'), ...half([[1, 0], [0, 1], [0, 1], ...rest], '12')]);
  assert.equal(two.trend, 'falling', '3 of 3, then 1 of 3: two findings');
  assert.equal(two.verdict, 'the compass is biting');
  const tenth = tend.compassReading([...half([[20, 0], [20, 0], [20, 0], ...rest], '11'), ...half([[19, 0], [19, 0], [19, 3], ...rest], '12')]);
  assert.equal(tenth.trend, 'flat', 'three findings fewer, but less than a tenth of the share');
});

const run = (date: string, shipped: number, filedLow: number, extra: Record<string, unknown> = {}) => ({
  ...sweep, date, compass: { shipped, filedLow, lensG: [] }, ...extra,
});

test('tend 0236: the compass reads the run log: refinement shipped against filed, lens-0 growth and the lines met, and whether it bites', () => {
  const twelve = (a: [number, number], b: [number, number]) => [
    ...Array.from({ length: 6 }, (_, i) => run(`2026-11-2${i}`, ...a)),
    ...Array.from({ length: 6 }, (_, i) => run(`2026-12-0${i + 1}`, ...b)),
  ];
  const biting = tend.compassReading([{ mode: 'sweep', date: '2026-11-18' }, ...twelve([4, 0], [1, 3])]);
  assert.equal(biting.rows.length, 12, 'only runs that carry the compass');
  assert.deepEqual(biting.shares, { first: 1, second: 0.25 });
  assert.equal(biting.trend, 'falling');
  assert.equal(biting.verdict, 'the compass is biting');
  assert.deepEqual(biting.sum, { runs: 12, shipped: 30, filedLow: 18, lensG: 0, met: 12, failed: 12, lacking: 0, provisional: 12 });
  const flat = tend.compassReading(twelve([2, 2], [2, 2]));
  assert.equal(flat.trend, 'flat');
  assert.equal(flat.verdict, 'the compass is not biting: tighten it');
  assert.equal(tend.compassReading(twelve([1, 3], [3, 1])).verdict, 'the compass is not biting: tighten it', 'a rising share');
  assert.equal(tend.compassReading(twelve([2, 2], [0, 3])).verdict, 'the compass is biting', 'nothing shipped without a reason');
  assert.equal(tend.compassReading(twelve([2, 2], [2, 2]).slice(0, 5)).verdict, 'too early to say: 5 of 12 runs carry the compass');
  assert.equal(tend.compassReading([...Array.from({ length: 20 }, (_, i) => run(`2026-10-${10 + i}`, 0, 5)), ...twelve([2, 2], [2, 2])]).verdict, 'the compass is not biting: tighten it', 'the last twelve runs');
  assert.equal(tend.compassReading([run('2026-11-21', 1, 1, { filed: { T: [], G: ['G8'] }, compass: { shipped: 1, filedLow: 1, lensG: ['G8'] } })]).sum.lensG, 1);
  const text = tend.compassText(biting);
  assert.equal(text, tend.compassText(tend.compassReading([{ mode: 'sweep', date: '2026-11-18' }, ...twelve([4, 0], [1, 3])])), 'the same log prints the same');
  assert.match(text, /\nthe compass is biting\n$/);
  assert.match(text, /^2026-11-20 sweep chronicle: shipped 4, filed low 0, lens-0 G 0; met 1, failed 1, lacking 0, provisional 1$/m);
  assert.deepEqual(Object.keys(biting.ledger), ['date', 'runs', 'shares', 'trend', 'verdict']);
});

test('tend audit 7: the compass says nothing before twelve runs, and reads a trend only from enough refinement in each half', () => {
  const half = (pairs: [number, number][], month: string) => pairs.map(([a, b], i) => run(`2026-${month}-${10 + i}`, a, b));
  const six = (p: [number, number]) => Array.from({ length: 6 }, () => p);
  assert.equal(tend.compassReading([...half(six([4, 0]), '11'), ...half(six([1, 3]), '12')].slice(0, 11)).verdict, 'too early to say: 11 of 12 runs carry the compass', 'a falling share, but eleven runs');
  assert.equal(tend.compassReading([]).verdict, 'too early to say: 0 of 12 runs carry the compass');
  const none = tend.compassReading([...half(six([0, 0]), '11'), ...half(six([0, 0]), '12')]);
  assert.equal(none.trend, 'none', 'no refinement at all');
  assert.match(none.verdict, /^too few refinement findings to say/);
  const few = tend.compassReading([...half([[1, 0], [1, 0], [0, 0], [0, 0], [0, 0], [0, 0]], '11'), ...half([[0, 2], ...six([0, 0]).slice(1)], '12')]);
  assert.equal(few.trend, 'none', 'two findings in a half are too few');
  assert.match(few.verdict, /^too few refinement findings to say/, 'nothing shipped later, but too little before it');
  const nullFirst = tend.compassReading([...half(six([0, 0]), '11'), ...half(six([1, 3]), '12')]);
  assert.equal(nullFirst.trend, 'none', 'a half with no refinement has no share, and reads no rise');
  assert.equal(tend.compassReading([...half(six([0, 1]), '11'), ...half(six([0, 1]), '12')]).verdict, 'the compass is biting', 'nothing shipped later, with refinement in both halves');
  const r = repo();
  for (const runs of ['1', '0', '-3', 'x', '2.5']) assert.equal(r.tendJs('compass', '--runs', runs).status, 2, `--runs ${runs}`);
  assert.equal(r.tendJs('compass', '--runs', '2').status, 0);
  const lines = [...half(six([4, 0]), '11'), ...half(six([1, 3]), '12')].map((l) => JSON.stringify(l)).join('\n');
  r.commit({ '.claude/skills/tend/runs.jsonl': `${lines}\n`, '.claude/skills/tend/ledger.json': '{"lastT":0,"lastG":0,"areas":{},"declined":[]}\n', 'docs/STATUS.md': '# Status\n' }, 'a log of twelve runs, by hand');
  r.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.equal(r.tendJs('balance', '--write').status, 0);
  const ledger = JSON.parse(readFileSync(join(r.root, '.claude/skills/tend/ledger.json'), 'utf8')) as { compass: { verdict: string; trend: string; runs: number } };
  assert.deepEqual([ledger.compass.verdict, ledger.compass.trend, ledger.compass.runs], ['the compass is biting', 'falling', 12], 'tend:balance --write keeps the reading in the ledger');
  assert.match(r.tendJs('compass').stdout, /\nthe compass is biting\n$/);
  const main = read('.claude/skills/tend/runs.jsonl').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>);
  const carrying = main.filter((l) => typeof l.compass === 'object' && l.compass !== null).length;
  if (carrying < 12) assert.equal(tend.compassReading(main).verdict, `too early to say: ${carrying} of 12 runs carry the compass`, 'the log as it is');
  else assert.match(tend.compassReading(main).verdict, /^(the compass is biting|the compass is not biting: tighten it|too few refinement findings to say)/);
});

const STORE = [
  '# Expectations: memories',
  '',
  'What a person would reasonably expect of memories.',
  '',
  `- E-memories-1 [ratified 2026-11-20] ${person} a capture to come back when they pass its place again.`,
  '  Check: pending "a capture comes back"',
  '  Grounds: VISION "Who it is for"; not yet recorded',
  '  Answer: "Ratify as drafted" (the owner, 2026-11-20)',
  '',
].join('\n');
const PROPOSED = `- E-memories-2 [proposed] ${person} a day of walks in order.\n  Check: pending "days in order"\n  Grounds: VISION "Who it is for"; not yet recorded\n  Serves: Return\n`;
const AGENT = '\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_test';

/** A git checkout of its own for tend.js to read (TEND_ROOT): the store, the run log, and the commits made in it. */
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'tend-'));
  for (const d of ['docs/expectations', '.claude/skills/tend', 'scripts/e2e/journeys', 'src/lib/__tests__/memories']) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, 'docs/expectations/memories.md'), STORE);
  writeFileSync(join(root, '.claude/skills/tend/runs.jsonl'), '');
  writeFileSync(join(root, 'scripts/features.js'), "module.exports = { FEATURES: [{ name: 'memories', journeys: ['memories'] }] };\n");
  writeFileSync(join(root, 'scripts/e2e/journeys/memories.js'), "check(ok, 'a capture comes back');\n");
  const git = (...a: string[]) => spawnSync('git', a, { cwd: root, encoding: 'utf8' }).stdout.trim();
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  git('add', '-A');
  git('commit', '-q', '-m', 'the base, by hand');
  const commit = (files: Record<string, string>, message: string) => {
    for (const [f, text] of Object.entries(files)) writeFileSync(join(root, f), text);
    git('add', '-A');
    git('commit', '-q', '--allow-empty', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  const tendJs = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'tend.js'), ...args], { cwd: root, env: { ...process.env, TEND_ROOT: root }, encoding: 'utf8' });
  return { root, git, commit, tendJs };
}

test('tend 0236: a loop commit adds proposed expectation lines and fills checks; it changes, removes or ratifies none', () => {
  const r = repo();
  const base = r.git('rev-parse', 'HEAD');
  r.commit({ 'docs/expectations/memories.md': STORE + PROPOSED }, `tend memories: the run's record${AGENT}`);
  const added = r.tendJs('commits', `${base}..HEAD`);
  assert.equal(added.status, 0, added.stderr);
  const filled = r.commit({ 'docs/expectations/memories.md': (STORE + PROPOSED).replace('pending "a capture comes back"', 'memories:"a capture comes back"') }, `tend memories: the run's record${AGENT}`);
  assert.equal(r.tendJs('commits', `${filled}^..${filled}`).status, 0, 'a check filled in');
  const reworded = r.commit({ 'docs/expectations/memories.md': (STORE + PROPOSED).replace('its place again', 'its street again') }, `tend memories: the run's record${AGENT}`);
  const refused = r.tendJs('commits', `${reworded}^..${reworded}`);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /changes E-memories-1 in docs\/expectations\/memories\.md/);
  const removed = r.commit({ 'docs/expectations/memories.md': STORE.replace(/- E-memories-1[\s\S]*$/, '') }, `tend memories: the run's record${AGENT}`);
  assert.match(r.tendJs('commits', `${removed}^..${removed}`).stderr, /removes E-memories-1/);
  assert.ok(tend.FORBIDDEN.some((re) => re.test('src/lib/__tests__/arch/expectations.test.ts')), 'the store\'s test is not the loop\'s');
  assert.ok(tend.FORBIDDEN.some((re) => re.test('scripts/expectations.js')));
});

test('tend 0134: the run log is the loop\'s to add to and nobody\'s to rewrite; every line of it reads', () => {
  const record = { subject: "tend chronicle: the run's record", body: '', files: [M('docs/STATUS.md'), M('.claude/skills/tend/ledger.json'), M('.claude/skills/tend/runs.jsonl')] };
  assert.deepEqual(tend.tendCommitProblems(record), []);
  assert.ok(tend.tendCommitProblems({ ...record, rewritesLog: true }).some((p) => /rewrites the run log/.test(p)));
  const lines = read('.claude/skills/tend/runs.jsonl').split('\n').filter(Boolean);
  assert.ok(lines.length >= 1);
  for (const l of lines) {
    const run = JSON.parse(l) as { date: string; shipped: number[] };
    assert.deepEqual(tend.logProblems(run), [], l.slice(0, 60));
    assert.match(run.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(run.shipped));
  }
  assert.match(read('.claude/skills/tend/SKILL.md'), /npm run tend:log/);
});

test('tend 0135: the loop adds a trap to a rule file, never rewords a rule, and never cites a rule it edited', () => {
  const rule = '.claude/rules/tabs-and-home.md';
  const fix = {
    subject: 'tend chronicle 4: one Escape steps out of the Rename editor',
    body: 'Test: tend chronicle 4\nSource: WCAG 2.2, 2.1.2 No Keyboard Trap\n',
    files: [M('src/components/Rename.tsx'), M('scripts/e2e/journeys/qol.js'), M(rule)],
    added: "+  check(ok, 'tend chronicle 4: Escape')",
  };
  assert.deepEqual(tend.tendCommitProblems(fix), [], 'a trap noted beside its fix');
  assert.ok(tend.tendCommitProblems({ ...fix, rewritesRules: [rule] }).some((p) => /never reword a rule/.test(p)));
  const cites = (source: string) => tend.tendCommitProblems({ ...fix, body: `Test: tend chronicle 4\nSource: ${source}\n` });
  assert.ok(cites('.claude/rules/tabs-and-home.md, Rename later: "Escape steps out of the editor first"').some((p) => /same commit/.test(p)));
  assert.ok(cites('tabs-and-home.md, Rename later').some((p) => /same commit/.test(p)), 'by its bare name too');
  assert.ok(cites('specs/quality-of-life QL22\n  and .claude/rules/tabs-and-home.md, Rename later').some((p) => /same commit/.test(p)), 'on a wrapped Source line');
  assert.deepEqual(cites('.claude/rules/ui-patterns.md, Where actions live'), [], 'another rule file is a source like any other');
  assert.deepEqual(cites('home.md is not this file'), []);
});

test('tend 0135: a rule written in one commit of a run is not the source of another', () => {
  const rule = '.claude/rules/memories.md';
  const note = { subject: "tend memories: the run's record", body: '', files: [M('docs/STATUS.md'), M(rule)] };
  const fix = (source: string) => ({ subject: 'tend memories 2: a thing', body: `Test: tend memories 2\nSource: ${source}\n`, files: [M('src/app/a.tsx'), M('scripts/e2e/journeys/memories.js')] });
  assert.match(tend.citedOwnEdits([note, fix('memories.md, Hidden')])[0].problem, /a rule the loop wrote is not a source/);
  assert.deepEqual(tend.citedOwnEdits([note, fix('WCAG 2.2, 1.3.1')]), []);
  assert.deepEqual(tend.citedOwnEdits([fix('.claude/rules/memories.md, Hidden')]), [], 'a rule nobody in the run touched');
  assert.deepEqual(tend.citedOwnEdits([{ ...note, subject: 'Memories: a rule (MC1)' }, fix('.claude/rules/memories.md, Hidden')]), [], 'a rule the owner or a slice wrote is theirs');
});

test('tend rule lines: a commit rests only on rule lines written before it; a trap line added in a later commit of the push fails no earlier Source', () => {
  const rule = '.claude/rules/memories.md';
  const note = { subject: "tend memories: the run's record", body: '', files: [M('docs/STATUS.md'), M(rule)] };
  const fix = (n: number, source: string, files: File[] = [M('src/app/a.tsx'), M('scripts/e2e/journeys/memories.js')]) => ({ subject: `tend memories ${n}: a thing`, body: `Test: tend memories ${n}\nSource: ${source}\n`, files });
  // In commit order, oldest first: the record commit that adds the trap comes last.
  assert.deepEqual(tend.citedOwnEdits([fix(1, '.claude/rules/memories.md, Hidden'), fix(2, 'memories.md, Hidden'), note]), [], 'a line written after a commit is not what it rested on');
  const after = tend.citedOwnEdits([fix(1, 'memories.md, Hidden'), note, fix(2, 'memories.md, Hidden')]);
  assert.deepEqual(after.map((p) => p.subject), ['tend memories 2: a thing'], 'a line written before it in the same push is still the loop\'s own');
  assert.equal(tend.citedOwnEdits([fix(3, 'memories.md, Hidden', [M('src/app/a.tsx'), M('scripts/e2e/journeys/memories.js'), M(rule)])]).length, 1, 'itself included');
});

test('tend rule lines, reworded: a later commit of the push may reword a rule line an earlier one added; a line the base holds stays add-only', () => {
  const base = '# Memories\n\n- Hidden moments stay hidden in the replay.\n- Undo names what it restores.\n';
  assert.equal(tend.rewritesBaseLines(['- The run\'s own trap, first worded.'], base), false, 'a line absent from the push\'s base is the run\'s to reword');
  assert.equal(tend.rewritesBaseLines(['- Undo names what it restores.'], base), true, 'a line on main stays add-only');
  assert.equal(tend.rewritesBaseLines(['- The run\'s own trap.', '- Hidden moments stay hidden in the replay.'], base), true);
  assert.equal(tend.rewritesBaseLines(['- Undo names what it'], base), false, 'a whole line is matched, not a part');
  assert.equal(tend.rewritesBaseLines(['- a line'], ''), false, 'a rule file new in the push');
  assert.equal(tend.rewritesBaseLines([], base), false);
});

const pass = {
  mode: 'e2e', e2e: 'full', deploy: 'main', base: 'acb18b06', journeys: 48, ok: 1618,
  red: [{ journey: 'atlas', check: 'AT9' }], flaky: [], minutes: 99,
};

test('tend 0181: the weekly full pass logs itself as mode e2e, and a line that leaves a count out is refused', () => {
  assert.deepEqual(tend.logProblems(pass), []);
  assert.deepEqual(tend.logProblems({ ...pass, e2e: ['launch', 'atlas'], journeys: 2 }), [], 'a pass of some journeys names them');
  assert.deepEqual(tend.logProblems({ ...sweep, e2e: ['memories', 'launch'] }), [], 'a run names the journeys it ran');
  assert.deepEqual(tend.logProblems({ ...sweep, e2e: 'full' }), [], 'a run that made the pass says so');
  const bad = (g: unknown) => tend.logProblems(g).length > 0;
  assert.ok(bad({ ...pass, e2e: undefined }));
  assert.ok(bad({ ...pass, e2e: 'all' }));
  assert.ok(bad({ ...pass, e2e: [] }));
  assert.ok(bad({ ...pass, e2e: ['launch'], journeys: 2 }), 'the journeys named are the journeys counted');
  assert.ok(bad({ ...pass, journeys: 0 }));
  assert.ok(bad({ ...pass, ok: undefined }));
  assert.ok(bad({ ...pass, red: undefined }), 'none red is [], said');
  assert.ok(bad({ ...pass, flaky: ['AT9'] }), 'a check is { journey, check }');
  assert.ok(bad({ ...pass, red: [{ journey: 'atlas', check: ' ' }] }));
  assert.ok(bad({ ...pass, minutes: -1 }));
  assert.ok(bad({ ...pass, base: 'HEAD' }));
  assert.ok(bad({ ...sweep, e2e: 'some' }));
});

test('tend 0181: the full pass is due when no line of the run log says "e2e":"full" in seven days', () => {
  const line = (date: string, extra: Record<string, unknown>) => JSON.stringify({ date, ...extra });
  const log = [line('2026-11-09', { ...pass, base: 'aaaaaaaa' }), line('2026-11-14', { ...sweep, e2e: ['launch'] }), 'not json', line('2026-11-16', { ...pass })];
  assert.deepEqual(tend.fullPassDue(log, '2026-11-20'), { due: false, last: { date: '2026-11-16', base: 'acb18b06' }, dueFrom: '2026-11-23' });
  assert.equal(tend.fullPassDue(log, '2026-11-23').due, true, 'seven days on, it is due');
  assert.equal(tend.fullPassDue(log.slice(0, 3), '2026-11-15').due, false, 'a sweep that ran some journeys is no pass');
  assert.equal(tend.fullPassDue(log.slice(0, 3), '2026-11-16').due, true);
  assert.deepEqual(tend.fullPassDue([line('2026-11-10', { ...sweep, e2e: 'full' })], '2026-11-12').last, { date: '2026-11-10', base: sweep.base }, 'a run of any mode may make the pass');
  assert.deepEqual(tend.fullPassDue([], '2026-11-16'), { due: true, last: null, dueFrom: null });
  const runs = read('.claude/skills/tend/runs.jsonl').split('\n').filter(Boolean);
  assert.equal(typeof tend.fullPassDue(runs, '2026-11-16').due, 'boolean', 'the log as it is reads');
});

test('tend run log: the run log counts every finding a grouped subject names, not only the first', () => {
  const line = tend.runLine({
    date: '2026-11-18', given: sweep,
    subjects: [
      "tend tabs 12: the bar's way back does nothing while the walk is stopping; tend tabs 13: its comment names its held Stop",
      'tend map 17, 18: the pin, star and "?" taps read handlers filled before paint',
      "tend tabs audit 26-28: the bar's stop is shared by any bar of the walk",
      'tend explore audit 42, audit 43, audit 44: dividers at 3:1',
      "tend chronicle audit 7, 8, 9: the thread's rename state",
      'tend chronicle 2: Escape closes 3 pickers in 10 ms', 'tend chronicle T1: a kept suggestion; tend chronicle T4: its twin',
      "tend chronicle: the run's record",
    ],
  });
  assert.deepEqual(line.shipped, [2, 12, 13, 17, 18], 'a number in the words is not a finding');
  assert.deepEqual(line.auditFixes, [7, 8, 9, 26, 27, 28, 42, 43, 44]);
  assert.deepEqual(line.built, ['T1', 'T4']);
});

test('tend balance: the balance reads the documents as origin/main holds them, not the branch\'s unpushed record', () => {
  const show = (rel: string) => (rel === 'docs/STATUS.md' ? 'main' : null);
  assert.equal(tend.mainOrHere('docs/STATUS.md', show, () => 'branch'), 'main');
  assert.equal(tend.mainOrHere('.claude/skills/tend/ledger.json', show, () => 'branch'), 'branch', 'only where origin/main cannot be read');
  const src = read('scripts/tend.js');
  const body = (name: string) => src.slice(src.indexOf(`function ${name}(`), src.indexOf('\n}\n', src.indexOf(`function ${name}(`)));
  // Since area-states (decision 0235): the balance reads one reading of main's documents and main's commits.
  assert.match(body('balance'), /readingAt\(\{ from: 'main', tip: 'origin\/main'/, 'the documents and the commits are main\'s');
  assert.match(body('documentsFrom'), /from === 'main'\s*\?\s*\(rel\) => mainOrHere\(rel, showMain, readHere\)/, 'the open entries, DEFERRED and the ledger are main\'s');
  assert.match(body('documentsFrom'), /read\('docs\/STATUS\.md'\)/);
  assert.match(body('documentsFrom'), /read\(LEDGER_REL\)/);
  assert.doesNotMatch(body('balance'), /readFileSync\(path\.join\(ROOT, 'docs', 'STATUS\.md'\)/);
  assert.match(body('readingAt'), /log\(`--since=\$\{facts\.windowStart\}`, tip\)/, 'the commits are the tip\'s, main\'s for the balance');
});

// Decision 0229: a change resets an area only when it adds a screen or a control in files the area owns.
const owns = (p: string) => p === 'src/app/walk.tsx' || p.startsWith('src/app/walk/') || p.startsWith('src/components/walk/');
const change = (subject: string, files: Diffed[]) => tend.resetsArea({ subject, files }, owns);
const edit = (path: string, plus = '', minus = ''): Diffed => ({ status: 'M', path, plus, minus });

test('tend 0229: a control is an onPress=, <Pressable, <Switch, <TextInput or accessibilityRole="button" a line holds, each counted', () => {
  assert.equal(tend.controlsIn('<Pressable onPress={go} accessibilityRole="button">'), 3);
  assert.equal(tend.controlsIn('<Switch value={on} />\n<TextInput value={t} />'), 2);
  assert.equal(tend.controlsIn('<Text onPressIn={x}>a Pressable, a Switch</Text>'), 0, 'onPressIn= and the words are not a control');
  assert.equal(tend.controlsIn(''), 0);
});

test('tend 0229: a screen is a route file under src/app/, not a navigator (_layout) or a router file (+html)', () => {
  for (const p of ['src/app/walk.tsx', 'src/app/(tabs)/explore.tsx', 'src/app/day/[key].tsx', 'src/app/into.ts']) assert.equal(tend.isRoute(p), true, p);
  for (const p of ['src/app/_layout.tsx', 'src/app/(tabs)/_layout.tsx', 'src/app/+html.tsx', 'src/app/+not-found.tsx', 'src/components/walk/Bar.tsx', 'src/app/walk.md']) assert.equal(tend.isRoute(p), false, p);
});

test('tend 0229: a change resets an area when it adds a route file under src/app/ that the area owns', () => {
  assert.equal(change('Walk: a page of its own (WK1)', [{ status: 'A', path: 'src/app/walk/page.tsx', plus: 'export default function P() {}' }]), true);
  assert.equal(change('Walk: a layout (WK1)', [{ status: 'A', path: 'src/app/walk/_layout.tsx', plus: '' }]), false, 'a navigator is no screen');
  assert.equal(change('Into: a page (WI1)', [{ status: 'A', path: 'src/app/into.tsx', plus: '' }]), false, 'a screen another area owns');
  assert.equal(change('Walk: the route renamed', [{ status: 'R', from: 'src/app/walk.tsx', path: 'src/app/walk/index.tsx' }]), false, 'a moved route is no new screen');
  assert.equal(change('fix walk: the route reads the walk once', [edit('src/app/walk.tsx', 'const w = read();', 'const w = read(); read();')]), false, 'an edited route is no new screen');
});

test('tend 0229: a change resets an area when the added minus removed controls across the .tsx files it owns is more than none', () => {
  assert.equal(change('Walk: a Pause button (WK2)', [edit('src/components/walk/Bar.tsx', '<Pressable onPress={pause} accessibilityRole="button">')]), true);
  assert.equal(change('fix walk: Pause reads its walk', [edit('src/components/walk/Bar.tsx', '<Pressable onPress={pauseWalk}>', '<Pressable onPress={pause}>')]), false, 'a control edited is not a control added');
  assert.equal(change('Walk: the bar split in two', [edit('src/components/walk/Bar.tsx', '', '<Switch value={on} />'), { status: 'A', path: 'src/components/walk/Toggle.tsx', plus: '<Switch value={on} />' }]), false, 'a control moved within the area');
  assert.equal(change('Walk: one Pause, not two', [edit('src/components/walk/Bar.tsx', '', '<Pressable onPress={pause}>')]), false, 'a control removed');
  assert.equal(change('Into: a button (WI2)', [edit('src/components/IntoRow.tsx', '<Pressable onPress={go}>')]), false, 'a control in a file the area does not own');
  assert.equal(change('Walk: a handler (WK3)', [edit('src/components/walk/useBar.ts', 'onPress={go}')]), false, 'only a .tsx file holds a control');
  assert.equal(change('docs: the walk', [edit('docs/PRODUCT.md', 'onPress=')]), false);
});

test('tend 0229: the loop\'s own commits never reset an area, by a commit or by its revert', () => {
  const files = [{ status: 'A', path: 'src/app/walk/page.tsx', plus: '<Pressable onPress={go}>' }];
  assert.equal(change('Walk: a page (WK1)', files), true);
  assert.equal(change('tend walk-screen 3: the page', files), false);
  assert.equal(change('Revert "tend walk-screen 3: the page"', files), false);
});

test('tend 0229: any other change leaves the ledger\'s state as it stands; a reset one makes its area rough', () => {
  const commits = [
    { subject: 'fix walk: a copy change', files: [edit('src/components/walk/Bar.tsx', '<Text>Paused</Text>', '<Text>Pause</Text>')] },
    { subject: 'Walk: a new route file (WK9)', files: [{ status: 'A', path: 'src/app/replay/all.tsx', plus: '' }] },
  ];
  // Since area-states: the commits that reset the area are areaState's resetsSince, as gitFacts reads them.
  const resets = (list: typeof commits) => list.filter((c) => tend.resetsArea(c, owns)).map((_, i) => `c${i}`);
  const polished = { sweeps: [g6sweep({ whole: true })] };
  assert.equal(g6.areaState({ ...polished, resetsSince: resets(commits) }).state, 'polished', 'nothing reset: the state as it stands');
  const more = [...commits, { subject: 'Walk: a Stop (WK10)', files: [edit('src/components/walk/Bar.tsx', '<Pressable onPress={stop}>')] }];
  assert.equal(g6.areaState({ ...polished, resetsSince: resets(more) }).state, 'rough');
});

test('tend 0229: git\'s raw and -U0 patch output reads as each commit\'s files, their status and their added and removed lines', () => {
  const out = [
    '\0aaa1111\x01Walk: a page (WK1)', '',
    ':000000 100644 00000000 1f6f5429 A\tsrc/app/walk/page.tsx',
    ':100644 100644 0a1e6211 db67ae18 M\tsrc/components/walk/Bar.tsx',
    ':100644 100644 49efec7e fcbf6fbc R100\tsrc/components/atlas/Sheet.tsx\tsrc/components/Sheet.tsx',
    ':100644 000000 ea33e64a 00000000 D\tsrc/components/walk/Old.tsx', '',
    'diff --git a/src/app/walk/page.tsx b/src/app/walk/page.tsx', 'new file mode 100644', 'index 00000000..1f6f5429', '--- /dev/null', '+++ b/src/app/walk/page.tsx',
    '@@ -0,0 +1,2 @@', '+export default function P() {', '+  return <Pressable onPress={go} />;',
    'diff --git a/src/components/walk/Bar.tsx b/src/components/walk/Bar.tsx', 'index 0a1e6211..db67ae18 100644', '--- a/src/components/walk/Bar.tsx', '+++ b/src/components/walk/Bar.tsx',
    '@@ -3 +3 @@ export function Bar() {', '-  <Text>--- a rule</Text>', '+  <Text>+++ a rule</Text>', '\\ No newline at end of file',
    'diff --git a/src/components/atlas/Sheet.tsx b/src/components/Sheet.tsx', 'similarity index 100%', 'rename from src/components/atlas/Sheet.tsx', 'rename to src/components/Sheet.tsx',
    'diff --git a/src/components/walk/Old.tsx b/src/components/walk/Old.tsx', 'deleted file mode 100644', 'index ea33e64a..00000000', '--- a/src/components/walk/Old.tsx', '+++ /dev/null',
    '@@ -1 +0,0 @@', '-<Switch value={on} />',
    '\0bbb2222\x01docs: nothing in src', '',
  ].join('\n');
  const commits = tend.readPatches(out);
  assert.deepEqual(commits.map((c) => [c.sha, c.subject]), [['aaa1111', 'Walk: a page (WK1)'], ['bbb2222', 'docs: nothing in src']]);
  assert.deepEqual(commits[0].files, [
    { status: 'A', path: 'src/app/walk/page.tsx', plus: 'export default function P() {\n  return <Pressable onPress={go} />;', minus: '' },
    { status: 'M', path: 'src/components/walk/Bar.tsx', plus: '  <Text>+++ a rule</Text>', minus: '  <Text>--- a rule</Text>' },
    { status: 'R', path: 'src/components/Sheet.tsx', from: 'src/components/atlas/Sheet.tsx', plus: '', minus: '' },
    { status: 'D', path: 'src/components/walk/Old.tsx', plus: '', minus: '<Switch value={on} />' },
  ]);
  assert.deepEqual(commits[1].files, []);
});

test('tend 0229: next and the balance count an area as changed only by a commit that resets it, read from one batched patch', () => {
  const src = read('scripts/tend.js');
  // Since area-states (decision 0235) gitFacts holds what changesByArea did: one batched patch, read by resetsArea.
  const body = src.slice(src.indexOf('function gitFacts('), src.indexOf('\n}\n', src.indexOf('function gitFacts(')));
  assert.match(body, /resetsArea\(/, 'the count is of commits that reset the area');
  assert.match(body, /'--stdin', '--no-walk=unsorted'/, 'read from one batched patch');
  assert.doesNotMatch(body, /c\.files\.some\(\(p\) => isAppSource\(p\)/, 'not of every commit that touched its source');
  assert.match(src.slice(src.indexOf('function next(argv = []) {')), /^function next\(argv = \[\]\) \{[\s\S]*?readingAt\([\s\S]*?g\.resetsSince\.length/, 'next ranks by it');
  assert.match(src.slice(src.indexOf('function readingAt(')), /^function readingAt\([^\n]*\n\s*const facts = gitFacts\(/, 'the balance reads it');
});

// Area states (specs/area-states, G6, decision 0235): an area's state is what is left open, computed by the script; the
// balance reads shares and acts both ways; the whole inbox is read. The replay is the run log of Nov 11-19 with main's
// documents verbatim at 42d3ccd8 (scripts/fixtures/tend-replay-1119/, their blobs checked).
type Sweep = { date: string; base: string; whole?: boolean; found?: { loop?: { high?: number; medium?: number; low?: number } }; shipped?: number[]; expectations?: unknown };
type Item = { title: string; severity: string | null; waits?: boolean; date?: string | null };
type StateIn = { sweeps: Sweep[]; resetsSince?: string[]; between?: string[][]; deferred?: Item[]; before?: Item[]; entries?: string[]; uncovered?: string[]; ledgerState?: string };
type StateOut = { state: string; why: string[]; open: number };
type Inbox = { items: { section: string; id: string | null; tag: string | null; areas: string[]; answered: boolean; phone: boolean; title: string }[]; unanswered: number; phone: number; unansweredT: number; bySection: Record<string, number> };
type Report = { areas: Record<string, string[]>; unseen: string[]; firstSweep: Record<string, string[]>; states: Record<string, StateOut>; share: { sweptTwice: number; roughTwice: number; line: string }; open: { openT: number; unansweredT: number }; inbox: { items: number; unanswered: number }; reading: string; why: string; evolve: string | null };
const g6 = tend as unknown as {
  ROUGH_SHARE: number;
  severityOf(text: string): string | null;
  areaState(i: StateIn): StateOut;
  deferredItems(text: string): { tag: string; section: string; title: string; areas: string[]; severity: string | null; waits: boolean }[];
  beforeItems(text: string): { title: string; areas: string[]; severity: string | null }[];
  readInbox(text: string): Inbox;
  reading(i: { slices: number; rough?: number; openT: number; roughTwice?: number; sweptTwice?: number }): Reading;
  evolveDue(runs: Record<string, unknown>[], states: Record<string, string>, today: string, lastSwept?: Record<string, string>): string | null;
  nextArea(counts: Record<string, number>, areas?: Record<string, { state: string }>, evolve?: string | null): string | null;
  historyProblems(h: { shallow: boolean; boundaryDates: string[]; windowStart: string; needed: { area: string; base: string; date: string; resolves: boolean }[] }): { problems: string[]; notices: string[] };
  baseWarning(area: string, s: StateOut & { items?: string[] }): string;
  givenStateProblems(given: Record<string, unknown>, computed: StateOut): string[];
  logProblems(given: unknown, o?: { noSurface?: boolean }): string[];
  noSurfaceBuild(prefixes: string[], specs: { slug: string; text: string }[]): boolean;
  report(i: { runs: Record<string, unknown>[]; deferred: string; status: string; ledger: { areas?: Record<string, { state: string }> }; git: { areas: string[]; perArea: Record<string, { swept: boolean; resetsSince?: string[]; between?: string[][]; uncovered: string[] }>; slices: string[]; today: string } }): Report;
};
const flat = (text: string) => text.replace(/\s+/g, ' ');
function g6sweep(o: Partial<Sweep> = {}): Sweep {
  return sw(o);
}
const sw = (o: Partial<Sweep> = {}): Sweep => ({ date: '2026-11-10', base: 'aaa1111', whole: false, found: { loop: { high: 0, medium: 0, low: 0 } }, shipped: [], ...o });
const FIX = join(ROOT, 'scripts', 'fixtures', 'tend-replay-1119');
const fixture = () => {
  const git = JSON.parse(readFileSync(join(FIX, 'git.json'), 'utf8'));
  const file = (n: string) => readFileSync(join(FIX, n));
  return {
    git,
    file,
    blob: (n: string) => createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${file(n).length}\0`), file(n)])).digest('hex'),
    input: {
      runs: file('runs.jsonl').toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)),
      deferred: file('DEFERRED.md').toString('utf8'),
      status: file('STATUS.md').toString('utf8'),
      ledger: JSON.parse(file('ledger.json').toString('utf8')),
      git,
    },
  };
};

test('AS1: an area\'s state is what is left open', () => {
  const medium = { found: { loop: { high: 0, medium: 2, low: 1 } }, shipped: [1] };
  assert.equal(g6.areaState({ sweeps: [sw(medium)] }).state, 'rough', 'a medium not shipped is open');
  assert.match(g6.areaState({ sweeps: [sw(medium)] }).why.join('; '), /medium/);
  assert.equal(g6.areaState({ sweeps: [sw({ found: { loop: { medium: 2, low: 4 } }, shipped: [1, 1] })] }).state, 'rough', 'shipped numbers count once');
  assert.equal(g6.areaState({ sweeps: [sw({ whole: true, found: { loop: { medium: 1, low: 3 } }, shipped: [1] })] }).state, 'polished', 'a whole sweep leaving only lows, every screen with a journey');
  assert.equal(g6.areaState({ sweeps: [sw({ found: { loop: { medium: 1 } }, shipped: [1] })] }).state, 'settling', 'not whole: settling at best');
  const waiting = g6.areaState({ sweeps: [sw({ whole: true })], entries: ['T42', 'T48'] });
  assert.equal(waiting.state, 'settling');
  assert.match(waiting.why.join('; '), /T42, T48/);
  assert.equal(g6.areaState({ sweeps: [sw({ whole: true })], uncovered: ['src/app/x.tsx'] }).state, 'settling', 'a screen with no journey');
  assert.equal(g6.areaState({ sweeps: [sw({ whole: true })], deferred: [{ title: 'a stale card', severity: 'medium' }] }).state, 'rough', 'a [loop] medium in DEFERRED');
  assert.equal(g6.areaState({ sweeps: [sw({ whole: true })], deferred: [{ title: 'a gap', severity: 'low' }] }).state, 'polished', 'lows do not block polished (J2)');
  const reset = g6.areaState({ sweeps: [sw({ whole: true })], resetsSince: ['abc1234'] });
  assert.equal(reset.state, 'rough', 'a 0229 reset');
  assert.match(reset.why.join('; '), /abc1234/);
  // The run writes the script's state: the log line's state.to is the computed one, never another.
  const computed = g6.areaState({ sweeps: [sw({ whole: true })], entries: ['T1'] });
  assert.deepEqual(g6.givenStateProblems({ state: { from: 'rough', to: 'settling' } }, computed), []);
  assert.deepEqual(g6.givenStateProblems({ state: { from: 'rough' } }, computed), []);
  assert.match(g6.givenStateProblems({ state: { from: 'rough', to: 'rough' } }, computed).join(), /settling/);
});

test('AS1b: never swept reads unseen; resting stays until a reset', () => {
  assert.equal(g6.areaState({ sweeps: [] }).state, 'unseen');
  assert.equal(g6.areaState({ sweeps: [sw({ whole: true })], ledgerState: 'resting' }).state, 'resting');
  assert.equal(g6.areaState({ sweeps: [sw({ whole: true })], ledgerState: 'resting', resetsSince: ['abc1234'] }).state, 'rough');
});

test('AS2: three whole sweeps with no reset between them make an area settling at least', () => {
  const m = { whole: true, found: { loop: { medium: 2 } }, shipped: [] as number[] };
  assert.equal(g6.areaState({ sweeps: [sw(m), sw(m)] }).state, 'rough');
  const three = g6.areaState({ sweeps: [sw(m), sw(m), sw(m)], between: [[], [], []] });
  assert.equal(three.state, 'settling');
  assert.match(three.why.join('; '), /three whole sweeps/);
  assert.equal(g6.areaState({ sweeps: [sw(m), sw(m), sw(m)], between: [[], [], ['abc1234']] }).state, 'rough', 'a reset between breaks the run');
});

test('area-states audit 8: a partial sweep between whole ones neither counts nor breaks the backstop', () => {
  const m = { whole: true, found: { loop: { medium: 2 } }, shipped: [] as number[] };
  const part = { whole: false, found: { loop: { medium: 1 } }, shipped: [] as number[] };
  assert.equal(g6.areaState({ sweeps: [sw(m), sw(part), sw(m), sw(m)], between: [[], [], [], []] }).state, 'settling');
  assert.equal(g6.areaState({ sweeps: [sw(m), sw(part), sw(m), sw(part)], between: [[], [], [], []] }).state, 'rough', 'two whole sweeps are not three');
});

test('AS3: rough is a share of the areas swept twice; a first sweep cannot raise the alarm by itself', () => {
  assert.equal(g6.ROUGH_SHARE, 0.5);
  assert.equal(g6.reading({ slices: 9, openT: 0, roughTwice: 4, sweptTwice: 7 }).reading, 'outgrowing its base');
  assert.equal(g6.reading({ slices: 9, openT: 0, roughTwice: 4, sweptTwice: 8 }).reading, 'in step', 'half is not more than half');
  assert.equal(g6.reading({ slices: 9, openT: 0, roughTwice: 3, sweptTwice: 4 }).reading, 'in step', 'three rough are not more than three');
  // A first sweep enters neither side of the share: the reading before and after it is the same.
  const runs = (extra: Record<string, unknown>[]) => [...['a', 'b', 'c', 'd', 'e'].flatMap((area) => [{ mode: 'sweep', area, date: '2026-11-01', base: 'aaa1111', lenses: { whole: false }, found: { loop: { medium: 1 } }, shipped: [] }, { mode: 'sweep', area, date: '2026-11-02', base: 'aaa1111', lenses: { whole: false }, found: { loop: { medium: 1 } }, shipped: [] }]), ...extra];
  const perArea = (names: string[]) => Object.fromEntries(names.map((n) => [n, { swept: true, resetsSince: [], between: [[], []], uncovered: [] }]));
  const before = g6.report({ runs: runs([]), deferred: '', status: '## Needs the owner\n', ledger: {}, git: { areas: ['a', 'b', 'c', 'd', 'e', 'f'], perArea: { ...perArea(['a', 'b', 'c', 'd', 'e']), f: { swept: false, uncovered: [] } }, slices: ['X'], today: '2026-11-03' } });
  const after = g6.report({ runs: runs([{ mode: 'sweep', area: 'f', date: '2026-11-03', base: 'aaa1111', lenses: { whole: false }, found: { loop: { high: 1 } }, shipped: [] }]), deferred: '', status: '## Needs the owner\n', ledger: {}, git: { areas: ['a', 'b', 'c', 'd', 'e', 'f'], perArea: perArea(['a', 'b', 'c', 'd', 'e', 'f']), slices: ['X'], today: '2026-11-03' } });
  assert.deepEqual([before.share.roughTwice, before.share.sweptTwice], [after.share.roughTwice, after.share.sweptTwice]);
  assert.equal(before.reading, after.reading);
  assert.deepEqual(before.unseen, ['f']);
  assert.deepEqual(after.firstSweep.rough, ['f'], 'a first sweep is listed by its state');
});

test('area-states audit 5: the share\'s line is one named constant, printed beside the shares', () => {
  const r = g6.report({ runs: [], deferred: '', status: '## Needs the owner\n', ledger: {}, git: { areas: [], perArea: {}, slices: [], today: '2026-11-03' } });
  assert.match(r.share.line, /more than half of the areas swept twice or more, and more than three/);
  assert.match(read('specs/area-states/spec.md'), /ROUGH_SHARE/);
});

test('AS4: fourteen days with no loop-filed G and a settling area: evolve it, and next says so', () => {
  const runs = [{ date: '2026-11-01', mode: 'inbox', filed: { T: [], G: ['G4'] } }, { date: '2026-11-05', mode: 'sweep', filed: { T: [], G: [] } }];
  const states = { a: 'settling', b: 'polished', c: 'rough' };
  assert.equal(g6.evolveDue(runs, states, '2026-11-14'), null, 'thirteen days');
  assert.equal(g6.evolveDue(runs, states, '2026-11-15'), 'b', 'polished first');
  assert.equal(g6.evolveDue(runs, { a: 'settling', c: 'rough' }, '2026-11-20'), 'a');
  assert.equal(g6.evolveDue(runs, { c: 'rough' }, '2026-11-20'), null, 'never on a rough base');
  assert.equal(g6.evolveDue([{ date: '2026-11-11', mode: 'sweep', filed: { G: [] } }], states, '2026-11-20'), null, 'counted from the log\'s first line');
  assert.equal(g6.evolveDue(runs, { a: 'settling', d: 'settling' }, '2026-11-20', { a: '2026-11-09', d: '2026-11-03' }), 'd', 'then the one swept longest ago');
  assert.equal(g6.nextArea({ a: 0 }, { a: { state: 'settling' } }, 'a'), 'evolve a');
  assert.equal(g6.nextArea({ c: 2 }, { a: { state: 'settling' } }, null), 'c');
});

test('area-states audit 7: only the run log\'s filed G is the loop\'s, and section 8 names the evolve', () => {
  // A G filed by /investigate is in STATUS, never in a run's filed.G: it does not count.
  assert.equal(g6.evolveDue([{ date: '2026-11-01', mode: 'sweep', filed: { G: [] } }], { a: 'settling' }, '2026-11-20'), 'a');
  const s8 = flat(read('.claude/skills/tend/SKILL.md').split('## 8.')[1].split('## 9.')[0]);
  assert.match(s8, /fourteen days[^|]*filed\.G/i);
});

test('AS5: base names a rough base\'s open medium and high items, and never blocks', () => {
  const rough = { state: 'rough', why: ['one medium open'], open: 1, items: ['A stale card'] };
  assert.match(g6.baseWarning('tabs', rough), /lands on a rough base/);
  assert.match(g6.baseWarning('tabs', rough), /A stale card/);
  assert.match(g6.baseWarning('tabs', { state: 'settling', why: ['lows only'], open: 0 }), /tabs is settling: nothing above low open/);
  // The command's printed reading, not only its exit (the diff review): this checkout's HEAD, which CI's clone holds.
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'tend.js'), 'base', '--here', 'walk-screen'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^(lands on a rough base: walk-screen \(|walk-screen is (settling|polished|resting): nothing above low open)/m);
  assert.doesNotMatch(r.stdout, /could not read the base/);
  const spec = spawnSync(process.execPath, [join(ROOT, 'scripts', 'tend.js'), 'base', '--here', '--spec', 'area-states'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(spec.stdout, /arch is no area the loop sweeps/);
  assert.match(flat(read('.claude/skills/slice/SKILL.md')), /lands on a rough base/);
  assert.match(flat(read('.claude/skills/slice/SKILL.md')), /no rougher/);
});

test('AS6: a shallow history whose boundary is inside the window refuses', () => {
  const h = { shallow: true, boundaryDates: ['2026-11-15'], windowStart: '2026-11-07', needed: [] };
  assert.match(g6.historyProblems(h).problems.join(), /shallow/);
  assert.deepEqual(g6.historyProblems({ ...h, boundaryDates: ['2026-11-01'] }).problems, []);
  assert.deepEqual(g6.historyProblems({ ...h, shallow: false }).problems, []);
});

test('area-states audit 9: the refusal names the date to fetch from, the oldest base it needs', () => {
  const h = { shallow: true, boundaryDates: ['2026-11-15'], windowStart: '2026-11-07', needed: [{ area: 'map', base: 'aaa1111', date: '2026-10-20', resolves: false }] };
  assert.match(g6.historyProblems(h).problems.join(), /--shallow-since=2026-10-20/);
  const s0 = flat(read('.claude/skills/tend/SKILL.md').split('## 0.')[1].split('## 1.')[0]);
  assert.match(s0, /the date the refusal names/);
});

test('AS6b: a bad sha on a whole history is named, and the area read from its window', () => {
  const h = { shallow: false, boundaryDates: [], windowStart: '2026-11-07', needed: [{ area: 'presence', base: 'bfb60fdb85e1430d0f399681368b0b055f1f900', date: '2026-11-20', resolves: false }] };
  assert.deepEqual(g6.historyProblems(h).problems, []);
  assert.match(g6.historyProblems(h).notices.join(), /presence.*bfb60fdb/);
});

test('AS7: every item under Needs the owner is read, Last tend apart', () => {
  const text = [
    '## Needs the owner', 'Intro.', '',
    '### From /fix x', '', '- **A question** for you.', '- Another, answered.', '  Nov 14: the owner\'s yes, in person.', '',
    '### From /tend', '', '- **T11 [owner] Voice two taps away** (2026-11-11)', '  Area: tabs.', '- **T13 [phone] Largest text** (2026-11-11)', '  Area: tabs.',
    '- **T42 [owner] The bar at 320** (2026-11-19)', '  Area: walk-screen.', '  Nov 19: the owner\'s yes, in person, 2026-11-19.', '',
    '### Next evolutions', '', '- **G5 [M] Walkability** (2026-11-19) · Earn · aligned', '',
    '### Last tend', '', '- Shipped: tend x 1.', '',
    '### Open before the loop', '', '- **A spec line** (Nov 19). Still to say by hand.', '',
    '## In flight', '', '- not this',
  ].join('\n');
  const inbox = g6.readInbox(text);
  assert.equal(inbox.items.length, 7);
  assert.equal(inbox.phone, 1);
  assert.equal(inbox.unanswered, 4, 'the question, T11, G5 and the spec line');
  assert.equal(inbox.unansweredT, 1, 'T11');
  assert.deepEqual(inbox.bySection, { 'From /fix x': 2, 'From /tend': 3, 'Next evolutions': 1, 'Open before the loop': 1 });
  assert.deepEqual(inbox.items.find((i) => i.id === 'T42')?.areas, ['walk-screen']);
});

test('area-states audit 6: the alarm\'s count is said beside the whole inbox\'s, both numbers', () => {
  const r = g6.report(fixture().input);
  assert.equal(r.open.openT, 7, 'the old count: every T entry but a phone\'s');
  assert.equal(r.open.unansweredT, 1, 'T11 alone has no answer');
  assert.equal(r.inbox.items, 73, 'eighty-one bullets, Last tend\'s eight apart');
  assert.ok(r.inbox.unanswered > 10);
});

test('AS8: the Nov 11-19 log replayed: walk-screen settling, the balance not outgrowing', () => {
  const f = fixture();
  for (const n of Object.keys(f.git.blobs)) assert.equal(f.blob(n), f.git.blobs[n].blob, `${n} is main's ${f.git.blobs[n].path} at ${f.git.commit}`);
  const r = g6.report(f.input);
  assert.equal(r.states['walk-screen'].state, 'settling');
  assert.notEqual(r.reading, 'outgrowing its base', r.why);
});

test('area-states audit 1: a medium the loop may not fix, filed to the owner, waits: it does not keep its area rough', () => {
  const s = g6.areaState({ sweeps: [sw({ whole: true, found: { loop: { medium: 2 } }, shipped: [1] })], before: [{ title: 'The compiler skips', severity: 'medium', date: '2026-11-10' }] });
  assert.equal(s.state, 'settling');
  assert.match(s.why.join('; '), /The compiler skips/);
  const text = '## Needs the owner\n\n### Open before the loop\n\n- **The walk screen\'s React Compiler skips, and who takes their lines out** (Nov 19). Left for a run that may (`/tend walk-screen`\'s review, auditor 2, medium).\n  Nov 19: the owner allowed a run.\n- **A spec line** (Nov 19).\n\n## In flight\n';
  assert.deepEqual(g6.beforeItems(text).map((i) => [i.areas, i.severity]), [[['walk-screen'], 'medium'], [[], null]]);
});

test('area-states audit 2: replayed, walk-screen\'s reason names what waits: T42-T45, T48 and the compiler skips', () => {
  const why = g6.report(fixture().input).states['walk-screen'].why.join('; ');
  assert.match(why, /T42, T43, T44, T45, T48/);
  assert.match(why, /React Compiler skips/);
});

test('area-states audit 3: an unrated item keeps its area from polished; a fix the loop may not make waits; the unattributed are apart', () => {
  assert.equal(g6.areaState({ sweeps: [sw({ whole: true })], deferred: [{ title: 'a check', severity: null }] }).state, 'settling');
  assert.equal(g6.areaState({ sweeps: [sw({ whole: true })], deferred: [{ title: 'a gate', severity: 'medium', waits: true }] }).state, 'settling');
  const text = [
    '## Vision gate', '',
    '- [loop] `check:vision` does not catch a count. The loop may not edit `scripts/`, so it is a proposal (`/tend walk-screen`\'s review, steward 1, Nov 19, medium)',
    '- [loop] A spread row of marks (fix mark-overlap; F5, medium)',
    '', '## Tabs and the recording bar (`/tend tabs`, Nov 11)', '', '- [loop] **Two controls** (the UX review, U3, Nov 17, medium, older): both on screen', '- [owner] Not a loop item (low)',
  ].join('\n');
  const items = g6.deferredItems(text).filter((i) => i.tag === 'loop');
  assert.deepEqual(items.map((i) => [i.areas, i.severity, i.waits]), [[['walk-screen'], 'medium', true], [[], 'medium', false], [['tabs'], 'medium', false]]);
});

test('area-states audit 4: a failed expectation line does not by itself keep an area from polished', () => {
  const failed = { lines: [{ id: 'E-x-1', is: 'failed', provisional: true }] };
  assert.equal(g6.areaState({ sweeps: [sw({ whole: true, expectations: failed })] }).state, 'polished');
});

test('area-states audit 10: a loop commit may not touch the tests that grade the states or their fixture', () => {
  const one = (path: string) => tend.tendCommitProblems({ subject: 'tend map 3: x', body: 'Source: x', files: [{ status: 'M', path }], added: 'tend map 3' });
  assert.match(one('src/lib/__tests__/arch/tend.test.ts').join(), /never edits/);
  assert.match(one('scripts/fixtures/tend-replay-1119/runs.jsonl').join(), /never edits/);
});

test('area-states audit 11: the replay\'s git facts are recorded with their shas, the documents verbatim', () => {
  const f = fixture();
  assert.match(f.git.commit, /^42d3ccd8[0-9a-f]{32}$/);
  assert.deepEqual(f.git.perArea['walk-screen'].resetsSince, []);
  assert.equal(f.git.perArea.explore.resetsSince.length, 3);
  for (const sha of f.git.perArea.explore.resetsSince) assert.match(sha, /^[0-9a-f]{40}$/);
  assert.deepEqual(Object.keys(f.git.blobs).sort(), ['DEFERRED.md', 'STATUS.md', 'ledger.json', 'runs.jsonl']);
});

test('area-states audit 12: tend:log takes expectations "none: <why>" only for a build with nothing a person sees', () => {
  const line = { mode: 'inbox', deploy: 'main', base: 'abc1234', lens: '0236', grew: ['AS'], built: [], compass: { shipped: 0, filedLow: 0, lensG: [] }, filed: { T: [], G: [] } };
  assert.deepEqual(g6.logProblems({ ...line, expectations: 'none: the loop\'s own bookkeeping' }, { noSurface: true }), []);
  assert.match(g6.logProblems({ ...line, expectations: 'none: the loop\'s own bookkeeping' }, { noSurface: false }).join(), /no surface/);
  assert.match(g6.logProblems({ ...line, expectations: 'none:' }, { noSurface: true }).join(), /why/);
  assert.match(g6.logProblems(line, { noSurface: true }).join(), /expectations/);
  const spec = (slug: string, verdict: string) => ({ slug, text: `## Vision\n\n\`\`\`\nVerdict: ${verdict}\n\`\`\`\n\n## Criteria\n\n1. **${slug === 'a' ? 'AS' : 'BK'}1 · x.**\n` });
  assert.equal(g6.noSurfaceBuild(['AS'], [spec('a', 'no surface'), spec('b', 'aligned')]), true);
  assert.equal(g6.noSurfaceBuild(['AS', 'BK'], [spec('a', 'no surface'), spec('b', 'aligned')]), false);
  assert.equal(g6.noSurfaceBuild([], [spec('a', 'no surface')]), false);
});

test('AS9: tend sections 0, 8 and 9, slice step 1 and the orchestrator\'s stop rule say the same', () => {
  const skill = flat(read('.claude/skills/tend/SKILL.md'));
  const s8 = skill.split('## 8.')[1].split('## 9.')[0];
  assert.match(s8, /node scripts\/tend\.js state/);
  assert.match(s8, /unseen/);
  assert.match(s8, /more than half of the areas swept twice or more/i);
  assert.match(s8, /every item under "Needs the owner"/);
  assert.match(skill.split('## 9.')[1].split('## 10.')[0], /fourteen days/);
  assert.match(skill.split('## 0.')[1].split('## 1.')[0], /exits? non-zero/);
  const orch = flat(read('.claude/skills/tend-orchestrator/SKILL.md').split('## 1.')[0]);
  assert.match(orch, /evolve <area>/);
  assert.match(orch, /share/);
});

test('area-states audit 13: the argument table says what a run does when next answers evolve <area>', () => {
  const row = read('.claude/skills/tend/SKILL.md').split('\n').find((l) => l.startsWith('| none |')) ?? '';
  assert.match(row, /`evolve <area>`/);
});

test('area-states audit 14: a logged "none: <why>" line of a no-surface build reads clean in the run log\'s test, and tend:log takes it', () => {
  const line = { mode: 'inbox', area: 'arch', deploy: 'main', base: 'abc1234', lens: '0236', date: '2026-11-21', grew: ['AS'], built: [], expectations: 'none: the loop\'s own bookkeeping', compass: { shipped: 0, filedLow: 0, lensG: [] }, filed: { T: [], G: [] } };
  assert.deepEqual(tend.logProblems(line), [], 'with no flag, the line\'s own grew and built decide');
  assert.match(tend.logProblems({ ...line, grew: ['BK'] }).join(), /no surface/, 'a feature\'s build is held to its lines');
  assert.match(tend.logProblems({ ...line, built: ['T3'] }).join(), /no surface/, 'a T entry built beside it is a feature\'s');
  // End to end, in a scratch repository: the range's subjects grow AS (no surface) or BK (a screen).
  const r = repo();
  const base = r.git('rev-parse', 'HEAD');
  r.commit({ 'a.txt': 'x' }, 'Area states: the code (AS1-AS9)');
  const json = { mode: 'inbox', area: 'arch', deploy: 'main', base: base.slice(0, 8), filed: { T: [], G: [] }, answers: [{ entry: 'G6', answer: 'yes', by: 'owner', pick: 'recommended', words: 'Allow a run to build G6 only' }], expectations: 'none: the loop\'s own bookkeeping', compass: { shipped: 0, filedLow: 0, lensG: [] } };
  const ok = r.tendJs('log', `${base}..HEAD`, JSON.stringify(json));
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(readFileSync(join(r.root, '.claude/skills/tend/runs.jsonl'), 'utf8'), /"expectations":"none: the loop's own bookkeeping"/, 'the reason is kept in the line');
  r.commit({ 'b.txt': 'y' }, 'Back up everything: the page (BK1)');
  const feature = r.tendJs('log', `${base}..HEAD`, JSON.stringify(json));
  assert.equal(feature.status, 1);
  assert.match(feature.stderr, /no surface/);
});

test('area-states audit 15: a sweep whose shipped numbers are lows or an earlier run\'s leaves its mediums open', () => {
  const lows = g6.areaState({ sweeps: [sw({ whole: true, found: { loop: { medium: 2, low: 5 } }, shipped: [3, 4, 5] })] });
  assert.equal(lows.state, 'rough', 'three shipped against two mediums: they cannot all be the mediums');
  const earlier = g6.areaState({ sweeps: [sw({ shipped: [11, 12] }), sw({ whole: true, found: { loop: { medium: 2 } }, shipped: [11, 12] })] });
  assert.equal(earlier.state, 'rough', 'numbers an earlier sweep shipped are not this one\'s');
  const onlyLows = g6.areaState({ sweeps: [sw({ whole: true, found: { loop: { low: 2 } }, shipped: [1, 2] })] });
  assert.equal(onlyLows.state, 'settling', 'never polished when the line cannot show what it shipped');
  assert.match(onlyLows.why.join('; '), /cannot show/);
  assert.equal(g6.areaState({ sweeps: [sw({ shipped: [9] }), sw({ whole: true, found: { loop: { medium: 2 } }, shipped: [10, 11] })] }).state, 'polished');
});

test('area-states audit 16: only a waiting medium filed at or after the latest sweep is taken off what it left', () => {
  const sweep = sw({ date: '2026-11-19', whole: true, found: { loop: { medium: 2 } }, shipped: [1] });
  assert.equal(g6.areaState({ sweeps: [sweep], before: [{ title: 'an older call', severity: 'medium', date: '2026-11-12' }] }).state, 'rough');
  assert.equal(g6.areaState({ sweeps: [sweep], before: [{ title: 'this sweep\'s call', severity: 'medium', date: '2026-11-19' }] }).state, 'settling');
  assert.equal(g6.areaState({ sweeps: [sweep], before: [{ title: 'undated', severity: 'medium', date: null }] }).state, 'rough');
});

test('area-states audit 17: an item\'s area is its heading\'s, a citation names none, its severity is its last word on it, a cited path is no fix', () => {
  const text = [
    '## Tabs and the recording bar (`/tend tabs`, Nov 11)', '',
    '- [loop] An error in the tabs\' own layout (`tend replay audit 8`, medium provisional); filed low by the review (low)',
    '- [loop] Low: chips run into each other (`docs/research/ui-references.md`, section 2)',
    '- [loop] Seen from Chronicle\'s side (`/tend chronicle`\'s review, Nov 17, medium)',
    '', '## Navigate, ready', '',
    '- [loop] The strip\'s numbers (`tend walk-screen 12`; `/tend walk-screen`\'s review, ux 3, Nov 19, low)',
    '- [loop] The compiler skips: their lines need taking out of `src/lib/__tests__/arch/compiler.baseline.json` (`/tend walk-screen`, auditor 2, medium)',
  ].join('\n');
  const items = g6.deferredItems(text).filter((i) => i.tag === 'loop');
  assert.deepEqual(items.map((i) => [i.areas, i.severity, i.waits]), [[['tabs'], 'low', false], [['tabs'], 'low', false], [['tabs'], 'medium', false], [['walk-screen'], 'low', false], [['walk-screen'], 'medium', true]]);
  assert.equal(g6.severityOf('(medium) Seven views'), 'medium');
});

test('area-states audit 18: base --here reads the base the slice leaves, for its record', () => {
  assert.match(flat(read('.claude/skills/slice/SKILL.md')), /base --here/);
  const src = read('scripts/tend.js');
  assert.match(src.slice(src.indexOf('function baseCmd(')), /readingAt\(\{ from: here \? 'here' : 'main', tip: here \? 'HEAD' : 'origin\/main' \}\)/);
});

test('area-states audit 20: next takes 0229\'s resets before the evolve, as the skill says', () => {
  assert.equal(g6.nextArea({ c: 2 }, { a: { state: 'settling' } }, 'a'), 'c');
  assert.equal(g6.nextArea({ c: 0 }, { a: { state: 'settling' } }, 'a'), 'evolve a');
  assert.match(read('docs/decisions/0250-area-states-the-owners-answers.md'), /resets first, then the evolve/);
});

test('area-states audit 23: only the Vision block\'s verdict exempts a build', () => {
  const spec = (vision: string, later: string) => ({ slug: 'x', text: `## Vision\n\n\`\`\`\nVerdict: ${vision}\n\`\`\`\n\n## Criteria\n\n1. **AS1 · x.**\n\n## Audit\n\nVerdict: ${later}\n` });
  assert.equal(g6.noSurfaceBuild(['AS'], [spec('no surface', 'aligned')]), true);
  assert.equal(g6.noSurfaceBuild(['AS'], [spec('aligned', 'no surface')]), false);
});

test('area-states audit 27: the balance fails when main\'s STATUS or ledger cannot be read', () => {
  const r = repo();
  r.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  const out = r.tendJs('balance');
  assert.notEqual(out.status, 0, 'no STATUS and no ledger: no reading');
  assert.match(out.stderr, /STATUS\.md|ledger\.json|ENOENT/);
});

// ---- Loop budget (G7, specs/loop-budget, decisions 0235 and 0269) ------------------------------------------------
type Change = { sha: string; subject: string; body: string; files: File[] };
type Lease = { files: string[]; from: string; session: string; branch: string };
type Age = { id: string | null; section: string; age: number; date: string; text: string };
const lb = createRequire(__filename)(join(ROOT, 'scripts', 'tend.js')) as {
  reviewBudget(commits: Change[]): string[];
  regressionClaims(commits: Change[]): { audit: number; sha: string }[];
  filedProblems(line: unknown, o: { auditsShipped: number; added: { text: string; severity: string | null }[] }): string[];
  lastWasRotation(runs: unknown[], areas: string[]): boolean;
  rotationArea(runs: unknown[], verbs: Record<string, string[]>, resting?: string[]): string | null;
  nextPick(o: { counts: Record<string, number>; states: Record<string, { state: string }>; evolve: string | null; runs: unknown[]; verbs: Record<string, string[]> }): { area: string | null; turn: string; why: string };
  logProblems(given: unknown): string[];
  confirmProblems(answers: unknown[], runs: unknown[]): string[];
  answerTakeUp(runs: unknown[], today: string, days?: number): {
    days: number;
    byClass: Record<string, { owner: number; recommended: number; other: number; reshape: number; no: number }>;
    proxy: { yeses: number; unconfirmed: string[]; confirmed: number };
    unlogged: number;
  };
  balanceJson(o: { r: unknown; t: unknown; days: number; runs: unknown[]; today: string }): { answers?: unknown };
  inboxAge(status: string, today: string): { wait: Age[]; move: Age[]; hand: Age[]; undated: Age[]; phone: Age[] };
  leaseRows(status: string): Lease[];
  leaseProblems(o: { files: string[]; date: string; session: string | null; rows: Lease[] }): string[];
  leaseRemovalProblems(o: { removed: Lease[]; date: string; session: string | null; message: string }): string[];
  readInbox(status: string): { items: { answered: boolean; title: string }[] };
  beforeItems(status: string): { title: string }[];
};
const H = (n: number) => `${String(n).repeat(8)}`.slice(0, 8);
const ch = (n: number, subject: string, body = '', files: File[] = [M('src/lib/x.ts')]): Change => ({ sha: H(n), subject, body, files });
const sweepLine = (area: string, date: string) => ({ mode: 'sweep', area, date, lenses: { whole: true, skipped: [] } });

test('LB1: check:tend fails a range whose review fixes outnumber its fixes and T items, but for the run\'s own regression', () => {
  const fix = ch(1, 'tend explore 12: the card reads its name');
  const a1 = ch(2, 'tend explore audit 1: the name wraps at 320 px');
  const a2 = ch(3, 'tend explore audit 2: the name is spoken');
  assert.deepEqual(lb.reviewBudget([fix, a1]), [], 'one review fix per fix');
  const over = lb.reviewBudget([fix, a1, a2]);
  assert.equal(over.length, 1);
  assert.match(over[0], /explore/);
  assert.match(over[0], /audit 1, 2/);
  assert.match(over[0], /\[loop\]/, 'says to file the rest with their severity');
  const regression = { ...a2, body: `Regression: ${fix.sha} the card read its name whole at the base\n` };
  assert.deepEqual(lb.reviewBudget([fix, a1, regression]), [], 'the run\'s own regression is fixed whatever the budget');
  assert.deepEqual(lb.regressionClaims([fix, a1, regression]), [{ audit: 2, sha: fix.sha }]);
  // A T build counts one fix per item it ships (decision 0269): each commit naming it that changes more than tests.
  const t = [
    ch(4, 'tend explore T63: the failing tests', '', [M('src/lib/__tests__/explore/chips.test.ts')]),
    ch(5, 'tend explore T63: the chip reads the table\'s name'),
    ch(6, 'tend explore T63: the rule notes it', '', [M('.claude/rules/outing.md')]),
    ch(7, 'tend explore T63: the journey reads it', '', [M('scripts/e2e/journeys/outing.js')]),
  ];
  assert.deepEqual(lb.reviewBudget([...t, ch(8, 'tend explore audit 50: x'), ch(9, 'tend explore audit 51: y')]), []);
  assert.equal(lb.reviewBudget([...t, ch(8, 'tend explore audit 50: x'), ch(9, 'tend explore audit 51: y'), ch(10, 'tend explore audit 52: z')]).length, 1);
  assert.deepEqual(lb.reviewBudget([ch(1, 'Town fixtures: the code (TF1)'), ch(2, 'Town fixtures: the review (town-fixtures audit 1)')]), [], 'a G slice\'s own review is outside it');
});

test('LB1: check:tend refuses a range over the budget, in a scratch repository', () => {
  const r = repo();
  const base = r.git('rev-parse', 'HEAD');
  const t = (name: string) => ({ [`src/lib/__tests__/memories/${name.replace(/\W+/g, '-')}.test.ts`]: `test('${name}: x', () => {});\n` });
  r.commit(t('tend memories 1'), `tend memories 1: a capture comes back\n\nSource: WCAG 2.2, 4.1.2${AGENT}`);
  r.commit(t('tend memories audit 1'), `tend memories audit 1: its name is spoken${AGENT}`);
  assert.equal(r.tendJs('commits', '--loop-only', `${base}..HEAD`).status, 0, 'within the budget');
  r.commit(t('tend memories audit 2'), `tend memories audit 2: it wraps${AGENT}`);
  const over = r.tendJs('commits', '--loop-only', `${base}..HEAD`);
  assert.equal(over.status, 1);
  assert.match(over.stderr, /review fix/);
});

test('loop-budget audit 1: tend:log refuses a review that accepted more than it fixed and filed, or filed a high', () => {
  const line = { mode: 'sweep', area: 'explore', review: { accepted: 3, rejected: 0, deferred: 1 } };
  assert.deepEqual(lb.filedProblems(line, { auditsShipped: 2, added: [{ text: 'a stale comment (low)', severity: 'low' }] }), []);
  assert.match(lb.filedProblems(line, { auditsShipped: 2, added: [] }).join(), /accepted/, 'a third accepted finding neither shipped nor filed');
  assert.match(lb.filedProblems(line, { auditsShipped: 2, added: [{ text: 'a stale comment', severity: null }] }).join(), /severity/);
  assert.match(lb.filedProblems(line, { auditsShipped: 2, added: [{ text: 'the walk loses its end (high)', severity: 'high' }] }).join(), /high/, 'a high is never filed (0269)');
  assert.deepEqual(lb.filedProblems({ mode: 'inbox', grew: ['TF'], review: { accepted: 9, rejected: 0, deferred: 0 } }, { auditsShipped: 0, added: [] }), [], 'a G slice\'s review is outside the budget');
});

test('loop-budget audit 11: a regression is a commit of the range, of the same area, no review fix, and says what worked', () => {
  const fix = ch(1, 'tend explore 12: the card reads its name');
  const a1 = ch(2, 'tend explore audit 1: x');
  const claim = (sha: string, words = ' the name read whole at the base') => ch(3, 'tend explore audit 2: y', `Regression: ${sha}${words}\n`);
  assert.equal(lb.reviewBudget([fix, a1, claim(a1.sha)]).length, 1, 'a review fix names no review fix as the regression');
  assert.equal(lb.reviewBudget([fix, a1, claim('abcdef12')]).length, 1, 'a commit outside the range is not the run\'s');
  assert.equal(lb.reviewBudget([ch(9, 'tend tabs 3: z'), fix, a1, claim(H(9))]).length, 1, 'another area\'s commit is not this area\'s regression');
  assert.equal(lb.reviewBudget([fix, a1, claim(fix.sha, '')]).length, 1, 'the line says what worked at the base');
  assert.deepEqual(lb.reviewBudget([fix, a1, { ...ch(3, 'tend explore audit 2: y'), body: 'Severity: high\n' }]), [], 'a high is fixed whatever the budget (0269)');
});

test('LB1b: a reverted commit counts on neither side, and a finding two commits name counts once', () => {
  const fix = ch(1, 'tend explore 12: x');
  const a1 = ch(2, 'tend explore audit 1: y');
  const rule = ch(3, 'tend explore audit 1: the rule line says so', '', [M('.claude/rules/explore-marks.md')]);
  assert.deepEqual(lb.reviewBudget([fix, a1, rule]), []);
  const revert = ch(4, 'Revert "tend explore 12: x"', `This reverts commit ${fix.sha}.\n`);
  assert.equal(lb.reviewBudget([fix, a1, revert]).length, 1, 'the fix reverted, its review fix is over');
  const revertAudit = ch(5, 'Revert "tend explore audit 1: y"', `This reverts commit ${a1.sha}.\n`);
  assert.deepEqual(lb.reviewBudget([fix, a1, ch(6, 'tend explore audit 2: z'), revertAudit]), []);
});

test('LB2: next alternates: after a rotation the most-reset area, else the never-swept or longest-unswept, by verb', () => {
  const areas = ['chronicle', 'explore'];
  assert.equal(lb.lastWasRotation([], areas), true, 'no sweep: the reset turn');
  assert.equal(lb.lastWasRotation([sweepLine('chronicle', '2026-11-11')], areas), true, 'a first sweep is a rotation');
  assert.equal(lb.lastWasRotation([sweepLine('chronicle', '2026-11-11'), sweepLine('explore', '2026-11-12'), sweepLine('chronicle', '2026-11-13')], areas), true, 'the oldest swept again');
  assert.equal(lb.lastWasRotation([sweepLine('chronicle', '2026-11-11'), sweepLine('explore', '2026-11-12'), sweepLine('explore', '2026-11-13')], areas), false);
  const verbs = { gallery: ['Return'], journal: ['Return'], explore: ['Earn'], storage: ['Honour'], map: ['Earn', 'Return'] };
  assert.equal(lb.rotationArea([], verbs), 'gallery', 'Return first, then by name');
  assert.equal(lb.rotationArea([sweepLine('gallery', '2026-11-20')], verbs), 'journal');
  assert.equal(lb.rotationArea(['gallery', 'journal', 'map'].map((a) => sweepLine(a, '2026-11-20')), verbs), 'storage', 'an area takes its first verb in VISION\'s order: map is Return');
  const all = Object.keys(verbs).map((a, k) => sweepLine(a, `2026-11-2${k}`));
  assert.equal(lb.rotationArea(all, verbs), 'gallery', 'all swept: the longest unswept');
  assert.equal(lb.rotationArea(all, verbs, ['gallery']), 'journal', 'a resting area is not rotated onto');
  const states = { explore: { state: 'rough' }, chronicle: { state: 'rough' } };
  const after = [sweepLine('chronicle', '2026-11-11'), sweepLine('explore', '2026-11-12'), sweepLine('explore', '2026-11-13')];
  const v = { chronicle: ['Return'], explore: ['Earn'] };
  assert.equal(lb.nextPick({ counts: { explore: 3 }, states, evolve: null, runs: after, verbs: v }).area, 'chronicle', 'the rotation turn');
  assert.equal(lb.nextPick({ counts: { explore: 3 }, states, evolve: 'chronicle', runs: after, verbs: v }).area, 'evolve chronicle', 'a due evolve first (LB2b)');
  assert.equal(lb.nextPick({ counts: { explore: 3 }, states, evolve: null, runs: after.slice(0, 2), verbs: v }).area, 'explore', 'the reset turn: as before');
});

test('loop-budget audit 8: while any area is unswept, only an area\'s first sweep is a rotation', () => {
  const areas = ['chronicle', 'explore', 'gallery'];
  const runs = [sweepLine('chronicle', '2026-11-11'), sweepLine('explore', '2026-11-12'), sweepLine('chronicle', '2026-11-13')];
  assert.equal(lb.lastWasRotation(runs, areas), false, 'gallery waits: chronicle again is no rotation');
});

test('LB2: next prints the rotation\'s pick on the rotation turn, from this checkout\'s run log', () => {
  const features = createRequire(__filename)(join(ROOT, 'scripts', 'features.js')) as { FEATURES: { name: string; verbs?: string[] }[] };
  const runs = read('.claude/skills/tend/runs.jsonl').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const areas = features.FEATURES.filter((f) => f.name !== 'arch');
  const out = spawnSync(process.execPath, [join(ROOT, 'scripts', 'tend.js'), 'next', '--here'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(out.status, 0, out.stderr);
  if (!lb.lastWasRotation(runs, areas.map((f) => f.name))) {
    const want = lb.rotationArea(runs, Object.fromEntries(areas.map((f) => [f.name, f.verbs ?? []])));
    assert.ok(out.stdout.trim() === want || /^evolve /.test(out.stdout.trim()), `${out.stdout.trim()} is the rotation's ${want}`);
  } else assert.match(out.stdout.trim(), /^[a-z-]+|^evolve |^none/);
});

const answerLine = (answers: unknown[], extra = {}) => ({ mode: 'inbox', deploy: 'main', base: 'abc1234', answerLog: '0235', answers, ...extra });
const owner = { by: 'owner', pick: 'recommended', words: 'Yes, queue it (Recommended)' };

test('LB3: a line the script marks holds every answer to by and pick; an older line reads as it was', () => {
  assert.match(lb.logProblems(answerLine([{ entry: 'T3', answer: 'yes' }])).join(), /by/);
  assert.match(lb.logProblems(answerLine([{ entry: 'T3', answer: 'yes', by: 'owner', words: 'Yes' }])).join(), /pick/);
  assert.deepEqual(lb.logProblems(answerLine([{ entry: 'T3', answer: 'yes', ...owner }])), []);
  assert.deepEqual(lb.logProblems(answerLine([{ entry: 'T4', answer: 'no', by: 'owner', pick: 'no', words: 'No: too busy' }])), []);
  assert.match(lb.logProblems(answerLine([{ entry: 'T4', answer: 'no', ...owner }])).join(), /pick/, 'a no is picked no');
  assert.match(lb.logProblems(answerLine([{ entry: 'T4', answer: 'yes', by: 'someone', pick: 'other' }])).join(), /owner or proxy/);
  assert.match(lb.logProblems(answerLine([{ entry: 'T4', answer: 'no', by: 'proxy', pick: 'no' }])).join(), /proxy/, 'the proxy never says no (0157)');
  assert.deepEqual(lb.logProblems({ mode: 'inbox', deploy: 'main', base: 'abc1234', answers: [{ entry: 'T3', answer: 'yes' }] }), [], 'LB3b: no marker, read as it was');
});

test('LB3: tend:log refuses an answer without by and pick, and the marker is the script\'s', () => {
  const r = repo();
  const base = r.git('rev-parse', 'HEAD');
  const json = { mode: 'inbox', deploy: 'main', base: base.slice(0, 8), filed: { T: [], G: [] }, answers: [{ entry: 'T3', answer: 'yes' }] };
  const bare = r.tendJs('log', `${base}..HEAD`, JSON.stringify(json));
  assert.equal(bare.status, 1);
  assert.match(bare.stderr, /by/);
  assert.equal(r.tendJs('log', `${base}..HEAD`, JSON.stringify({ ...json, answerLog: '0235' })).status, 1, 'the marker is the script\'s to write');
  const ok = r.tendJs('log', `${base}..HEAD`, JSON.stringify({ ...json, answers: [{ entry: 'T3', answer: 'yes', ...owner }] }));
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(readFileSync(join(r.root, '.claude/skills/tend/runs.jsonl'), 'utf8'), /"answerLog":"0235"/);
});

test('loop-budget audit 2: the owner\'s answer carries the owner\'s words; a keep of a proxy yes is a confirms, never take-up', () => {
  assert.match(lb.logProblems(answerLine([{ entry: 'G9', answer: 'yes', by: 'owner', pick: 'recommended' }])).join(), /words/);
  assert.match(lb.logProblems(answerLine([{ entry: 'G9', answer: 'yes', by: 'owner', pick: 'recommended', words: ' ' }])).join(), /words/);
  assert.deepEqual(lb.logProblems(answerLine([{ entry: 'G9', answer: 'yes', ...owner, confirms: '2026-11-20' }])), []);
  assert.match(lb.logProblems(answerLine([{ entry: 'G9', answer: 'yes', by: 'proxy', pick: 'recommended', confirms: '2026-11-20' }])).join(), /confirms/);
  const runs = [{ date: '2026-11-20', answers: [{ entry: 'G9', answer: 'yes', by: 'proxy', pick: 'recommended' }] }];
  assert.deepEqual(lb.confirmProblems([{ entry: 'G9', answer: 'yes', ...owner, confirms: '2026-11-20' }], runs), []);
  assert.match(lb.confirmProblems([{ entry: 'G9', answer: 'yes', ...owner, confirms: '2026-11-21' }], runs).join(), /G9/);
});

test('loop-budget audit 12: the proxy never answers an [arch] or a [phone] entry', () => {
  assert.deepEqual(lb.logProblems(answerLine([{ entry: 'T3', answer: 'yes', by: 'proxy', pick: 'recommended', class: 'T [owner]' }])), []);
  for (const c of ['T [arch]', 'T [phone]']) assert.match(lb.logProblems(answerLine([{ entry: 'T3', answer: 'yes', by: 'proxy', pick: 'recommended', class: c }])).join(), /proxy/, c);
});

test('LB4: the balance reads the owner\'s take-up by class and the proxy\'s yeses not confirmed, over 30 days', () => {
  const runs = [
    { date: '2026-10-01', answerLog: '0235', answers: [{ entry: 'T1', answer: 'yes', ...owner, class: 'T [owner]' }] },
    { date: '2026-11-19', answers: [{ entry: 'T40', answer: 'yes' }] },
    { date: '2026-11-20', answerLog: '0235', answers: [{ entry: 'T50', answer: 'yes', ...owner, class: 'T [owner]' }, { entry: 'G9', answer: 'yes', by: 'proxy', pick: 'recommended', class: 'G' }] },
    { date: '2026-11-21', answerLog: '0235', answers: [{ entry: 'T51', answer: 'yes', by: 'owner', pick: 'other', words: 'The other one', class: 'T [owner]' }, { entry: 'G10', answer: 'reshape', by: 'owner', pick: 'reshape', words: 'Yes, but smaller', class: 'G' }] },
  ];
  const t = lb.answerTakeUp(runs, '2026-11-26');
  assert.equal(t.days, 30);
  assert.deepEqual(t.byClass['T [owner]'], { owner: 2, recommended: 1, other: 1, reshape: 0, no: 0 }, 'the line of Oct 1 is outside the window');
  assert.deepEqual(t.byClass.G, { owner: 1, recommended: 0, other: 0, reshape: 1, no: 0 });
  assert.deepEqual(t.proxy, { yeses: 1, unconfirmed: ['G9'], confirmed: 0 });
  assert.equal(t.unlogged, 1);
  const kept = lb.answerTakeUp([...runs, { date: '2026-11-22', answerLog: '0235', answers: [{ entry: 'G9', answer: 'yes', ...owner, confirms: '2026-11-20', class: 'G' }] }], '2026-11-26');
  assert.deepEqual(kept.proxy, { yeses: 1, unconfirmed: [], confirmed: 1 });
  assert.deepEqual(kept.byClass.G, t.byClass.G, 'a keep is not the owner\'s take-up');
  const json = lb.balanceJson({ r: { areas: {}, unseen: [], firstSweep: {}, states: {}, share: {}, open: {}, inbox: {}, unattributed: [], unrated: 0, reading: 'in step', propose: false, why: '', evolve: null }, t: { slices: [], growth: 0, refinement: 0, other: 0 }, days: 14, runs, today: '2026-11-26' });
  assert.deepEqual(json.answers, t, 'balance prints it');
});

test('loop-budget audit 3: an entry\'s yes logged twice counts once', () => {
  const yes = { entry: 'G13', answer: 'yes', ...owner, class: 'G' };
  const t = lb.answerTakeUp([{ date: '2026-11-25', answerLog: '0235', answers: [yes] }, { date: '2026-11-26', answerLog: '0235', answers: [yes] }], '2026-11-26');
  assert.equal(t.byClass.G.owner, 1);
});

const AGE_STATUS = [
  '# Status',
  '',
  '## Needs the owner',
  '',
  '### From /tend',
  '',
  '- **T5 [owner] An old question** (2026-10-20)',
  '  Area: map.',
  '- **T6 [owner] Answered** (2026-10-20)',
  "  Nov 1: the owner's yes.",
  '- **T7 [phone] On a device** (2026-10-01)',
  '- **T8 [owner] A fresh one** (2026-11-20)',
  '- **T9 [owner] Three weeks** (2026-11-05)',
  '',
  "### From the journal's audit (2026-10-15, `specs/x/spec.md`)",
  '',
  '- An item with no date of its own',
  '',
  '### From /slice x',
  '',
  '- No date anywhere',
  '- A partial answer (2026-10-10)',
  '  - ~~5. The pin, answered Nov 11~~',
  '',
  '### Last tend',
  '',
  '- The last run (2026-10-01)',
  '',
  '### Open before the loop',
  '',
  '- An edit for your hand (2026-10-01)',
  '',
  '## In flight',
  '',
].join('\n');

test('LB5: inbox age lists what waited 14 days, marks 30 to move, and says the undated and the phone\'s apart', () => {
  const a = lb.inboxAge(AGE_STATUS, '2026-11-26');
  const ids = (xs: Age[]) => xs.map((x) => x.id ?? x.text.split('\n')[0]);
  assert.deepEqual(ids(a.wait), ['T9'], 'fourteen days or more, under thirty');
  assert.ok(a.move.some((x) => x.id === 'T5' && x.age === 37));
  assert.ok(!ids([...a.wait, ...a.move]).includes('T6'), 'an answered item does not age');
  assert.ok(!ids([...a.wait, ...a.move]).includes('T8'));
  assert.deepEqual(ids(a.phone), ['T7']);
  assert.ok(ids(a.undated).includes('No date anywhere'));
  assert.deepEqual(a.move.map((x) => x.age), [...a.move.map((x) => x.age)].sort((x, y) => y - x), 'oldest first');
  assert.ok(![...a.wait, ...a.move, ...a.hand, ...a.undated].some((x) => /The last run/.test(x.text)), '"Last tend" is no item');
});

test('loop-budget audit 6: "Open before the loop" is listed with its age, never moved, and its area reads the same', () => {
  const a = lb.inboxAge(AGE_STATUS, '2026-11-26');
  assert.deepEqual(a.hand.map((x) => [x.text, x.age]), [['- An edit for your hand (2026-10-01)'.slice(2), 56]]);
  assert.ok(!a.move.some((x) => x.section === 'Open before the loop'));
  assert.deepEqual(lb.beforeItems(AGE_STATUS).map((i) => i.title), ['An edit for your hand (2026-10-01)'], 'it still waits on the owner\'s hand, so its area cannot read finished');
});

test('loop-budget audit 7: an item takes its heading\'s date when it has none of its own', () => {
  const a = lb.inboxAge(AGE_STATUS, '2026-11-26');
  const it = a.move.find((x) => /no date of its own/.test(x.text));
  assert.ok(it);
  assert.equal(it.date, '2026-10-15');
});

test('loop-budget audit 14: a word of an answer in a struck-through sub-item does not answer the whole item', () => {
  const a = lb.inboxAge(AGE_STATUS, '2026-11-26');
  assert.ok(a.move.some((x) => /A partial answer/.test(x.text)));
});

const LEASE_STATUS = (from: string, session = 'session_abc') => [
  '## In flight',
  '',
  '| Session | Branch | Doing |',
  '|---|---|---|',
  `| Lease: the loop's scripts (G8) | \`tend/inbox-x\` | holds \`scripts/tend.js\`, \`.claude/skills/tend/SKILL.md\`, \`src/app/walk.tsx\` from ${from}, session ${session} |`,
  '| A slice | `claude/x` | built |',
  '',
].join('\n');

test('LB6: a lease holds its process files for 24 h against every other session', () => {
  const rows = lb.leaseRows(LEASE_STATUS('2026-11-26T06:00Z'));
  assert.deepEqual(rows, [{ files: ['scripts/tend.js', '.claude/skills/tend/SKILL.md'], from: '2026-11-26T06:00Z', session: 'session_abc', branch: 'tend/inbox-x' }], 'a file that is no process file is not held');
  assert.equal(lb.leaseProblems({ files: ['scripts/tend.js'], date: '2026-11-26T10:00:00Z', session: 'session_other', rows }).length, 1);
  assert.match(lb.leaseProblems({ files: ['scripts/tend.js'], date: '2026-11-26T10:00:00Z', session: 'session_other', rows })[0], /tend\/inbox-x/);
  assert.deepEqual(lb.leaseProblems({ files: ['scripts/tend.js'], date: '2026-11-26T10:00:00Z', session: 'session_abc', rows }), [], 'the holder');
  assert.deepEqual(lb.leaseProblems({ files: ['scripts/tend.js'], date: '2026-11-27T06:00:00Z', session: 'session_other', rows }), [], 'LB6b: lapsed after 24 h');
  assert.deepEqual(lb.leaseProblems({ files: ['src/app/walk.tsx', 'scripts/records.js'], date: '2026-11-26T10:00:00Z', session: 'session_other', rows }), []);
});

test('loop-budget audit 13: a lease row is removed by its holder, after it lapsed, or with the owner\'s words quoted', () => {
  const removed = lb.leaseRows(LEASE_STATUS('2026-11-26T06:00Z'));
  const at = '2026-11-26T10:00:00Z';
  assert.equal(lb.leaseRemovalProblems({ removed, date: at, session: 'session_other', message: 'Records-Op: inflight remove x --reason "cleared"' }).length, 1);
  assert.deepEqual(lb.leaseRemovalProblems({ removed, date: at, session: 'session_abc', message: '' }), []);
  assert.deepEqual(lb.leaseRemovalProblems({ removed, date: '2026-11-27T07:00:00Z', session: 'session_other', message: '' }), []);
  assert.deepEqual(lb.leaseRemovalProblems({ removed, date: at, session: 'session_other', message: 'Records-Op: inflight remove x --reason "the owner cleared the lease, 2026-11-26: \\"Clear it\\""' }), []);
});

test('LB6: check:tend refuses another session\'s commit to a held file, in a scratch repository', () => {
  const r = repo();
  const from = new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16) + 'Z';
  mkdirSync(join(r.root, 'docs'), { recursive: true });
  r.commit({ 'docs/STATUS.md': LEASE_STATUS(from) }, 'The owner takes a lease, by hand');
  const base = r.git('rev-parse', 'HEAD');
  r.commit({ 'scripts/tend.js': '// another session\n' }, `Something: an edit (XX1)${AGENT}`);
  const refused = r.tendJs('commits', '--loop-only', `${base}..HEAD`);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /lease/);
  r.commit({ 'docs/STATUS.md': LEASE_STATUS(from, 'session_test') }, 'The lease is the test session\'s, by hand');
  const mine = r.git('rev-parse', 'HEAD');
  r.commit({ 'scripts/tend.js': '// the holder\n' }, `Something: an edit (XX1)${AGENT}`);
  assert.equal(r.tendJs('commits', '--loop-only', `${mine}..HEAD`).status, 0, 'the holder\'s own commit');
});

test('LB8: tend, ship, the orchestrator and its briefs say the same of the budget, rotation, answers, age and lease', { todo: 'test first' }, () => {
  const skill = flat(read('.claude/skills/tend/SKILL.md'));
  const ship = flat(read('.claude/skills/ship.md'));
  const orch = flat(read('.claude/skills/tend-orchestrator/SKILL.md'));
  const briefs = flat(read('.claude/skills/tend-orchestrator/briefs.md'));
  for (const [name, text] of Object.entries({ skill, ship, orch, briefs })) {
    assert.match(text, /one review fix per fix/, `${name}: the budget`);
    assert.match(text, /Regression: <sha>/, `${name}: the run's own regression`);
    assert.match(text, /Severity: high/, `${name}: highs always fixed`);
  }
  assert.match(skill, /alternates/);
  for (const text of [skill, orch, briefs]) assert.match(text, /"by"[^.]*"pick"/);
  for (const text of [skill, orch]) assert.match(text, /inbox age/);
  assert.match(orch, /four oldest/);
  assert.match(orch, /confirms/);
  for (const text of [ship, briefs]) assert.match(text, /Lease:/);
});

test('loop-budget audit 9: no skill says "medium and above" are fixed beside the budget', { todo: 'test first' }, () => {
  for (const f of ['.claude/skills/tend/SKILL.md', '.claude/skills/ship.md', '.claude/skills/tend-orchestrator/SKILL.md', '.claude/skills/tend-orchestrator/briefs.md']) {
    assert.doesNotMatch(flat(read(f)), /[Mm]edium and above (are )?fixed|Fixes in the run: medium and above/, f);
  }
});

test('loop-budget audit 1, 2: tend:log holds the review\'s accepted findings and a keep\'s line, end to end', () => {
  const r = repo();
  const json = { ...sweep, area: 'memories', expectations: { lines: [{ id: 'E-memories-1', is: 'lacking' }] }, compass, review: { accepted: 1, rejected: 0, deferred: 0 } };
  const unfiled = r.tendJs('log', 'HEAD..HEAD', JSON.stringify(json));
  assert.equal(unfiled.status, 1);
  assert.match(unfiled.stderr, /review\.accepted is 1/);
  mkdirSync(join(r.root, 'docs'), { recursive: true });
  writeFileSync(join(r.root, 'docs/DEFERRED.md'), '# Deferred\n\n## Memories (/tend memories)\n\n- [loop] The preview\'s caption is cut at 320 px (low)\n');
  const filed = r.tendJs('log', 'HEAD..HEAD', JSON.stringify(json));
  assert.equal(filed.status, 0, filed.stderr);
  const keep = { mode: 'inbox', deploy: 'main', base: 'abc1234', filed: { T: [], G: [] }, answers: [{ entry: 'G9', answer: 'yes', ...owner, confirms: '2020-01-01' }] };
  const stray = r.tendJs('log', 'HEAD..HEAD', JSON.stringify(keep));
  assert.equal(stray.status, 1);
  assert.match(stray.stderr, /confirms 2020-01-01/);
});

test('loop-budget audit 12: tend:log reads an answer\'s class from the base and refuses the proxy on an [arch] entry', () => {
  const r = repo();
  mkdirSync(join(r.root, 'docs'), { recursive: true });
  r.commit({ 'docs/STATUS.md': '# Status\n\n## Needs the owner\n\n### From /tend\n\n- **T3 [arch] A new dependency** (2026-11-20)\n  Area: map.\n- **T4 [owner] A word** (2026-11-20)\n  Area: map.\n' }, 'the inbox, by hand');
  const base = r.git('rev-parse', 'HEAD');
  const json = (entry: string) => ({ mode: 'inbox', deploy: 'main', base: base.slice(0, 8), filed: { T: [], G: [] }, answers: [{ entry, answer: 'yes', by: 'proxy', pick: 'recommended' }] });
  const arch = r.tendJs('log', `${base}..HEAD`, JSON.stringify(json('T3')));
  assert.equal(arch.status, 1);
  assert.match(arch.stderr, /never answers an \[arch\]/);
  const ok = r.tendJs('log', `${base}..HEAD`, JSON.stringify(json('T4')));
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(readFileSync(join(r.root, '.claude/skills/tend/runs.jsonl'), 'utf8'), /"class":"T \[owner\]"/);
});
