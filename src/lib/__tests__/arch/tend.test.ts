// @tree-wide: the tending loop's script, its ledger and the skills it routes through
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
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
  classify(subject: string, o?: { files?: string[]; known?: Set<string> }): 'growth' | 'refinement' | 'other';
  criteriaPrefixes(subject: string, known?: Set<string>): string[];
  tally(commits: { subject: string; files?: string[] }[], known?: Set<string>): { growth: number; refinement: number; other: number; slices: string[] };
  areasByState(areas: Record<string, { state: string }>, changed?: Record<string, boolean>): Record<string, string[]>;
  readStatus(text: string): { openT: number; phoneT: number; openG: number };
  reading(input: { slices: number; rough: number; openT: number }): Reading;
  nextArea(counts: Record<string, number>, areas?: Record<string, { state: string }>): string | null;
  isLoops(subject: string): boolean;
  dropBoundary<T extends { sha: string }>(commits: T[], boundary: Set<string>): T[];
  testName(subject: string): string | null;
  tendCommitProblems(c: { subject: string; body: string; files: File[]; added?: string; rewritesLog?: boolean; rewritesRules?: string[] }): string[];
  citedOwnEdits(commits: { subject: string; body: string; files: File[] }[]): { subject: string; problem: string }[];
  rewritesBaseLines(removed: string[], base: string): boolean;
  mainOrHere(rel: string, show: (rel: string) => string | null, here: (rel: string) => string): string;
  logProblems(given: unknown): string[];
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
  const areas = { replay: { state: 'polished' }, map: { state: 'rough' }, memories: { state: 'resting' } };
  assert.deepEqual(tend.areasByState(areas), { rough: ['map'], settling: [], polished: ['replay'], resting: ['memories'] });
  assert.deepEqual(tend.areasByState(areas, { replay: true, memories: true }), { rough: ['map', 'memories', 'replay'], settling: [], polished: [], resting: [] });
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

const person = 'A person who wanders a town to notice, using Memories, would reasonably expect';
const expectations = [{
  feature: 'memories',
  lines: [
    { line: `${person} each moment to say where and when it was kept`, is: 'met' },
    { line: `${person} a deleted moment to come back with Undo`, is: 'failed' },
    { line: `${person} to find a moment again by a word in it`, is: 'lacking' },
  ],
  dropped: [{ line: `${person} to see how many moments they kept this week`, never: 'Scores, streaks, completion, coverage, levels, badges, leaderboards' }],
}];

const sweep = {
  mode: 'sweep', area: 'chronicle', deploy: 'main', base: '83a3f257b6c6',
  lenses: { whole: false, skipped: ['2: 320 px and 200% text not pictured'] },
  found: { loop: { high: 0, medium: 2, low: 9 }, owner: 2, arch: 1, phone: 0, out: 0 },
  filed: { T: ['T1', 'T2', 'T3'], G: [] }, review: { accepted: 1, rejected: 1, deferred: 0 }, state: { from: null, to: 'rough' },
  expectations,
};

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

test('tend 0231: a sweep or a build logs what a person would reasonably expect, and which the feature meets, fails or lacks', () => {
  const base = { deploy: 'main', base: 'abc1234' };
  const build = { ...base, mode: 'inbox', answers: [{ entry: 'T3', answer: 'yes' }], expectations };
  assert.deepEqual(tend.logProblems(sweep), []);
  assert.deepEqual(tend.logProblems(build), []);
  assert.deepEqual(tend.logProblems({ ...base, mode: 'evolve', expectations }), [], 'an evolve run may log them');
  assert.deepEqual(tend.logProblems({ ...base, mode: 'evolve' }), [], 'only sweeps and builds are held to them');
  assert.deepEqual(tend.logProblems({ ...base, mode: 'inbox', answers: [{ entry: 'T3', answer: 'no' }] }), [], 'an inbox run that builds nothing');
  assert.deepEqual(tend.logProblems({ ...sweep, expectations: undefined, date: '2026-11-19' }), [], 'a line logged before the lens reads as it was');
  assert.deepEqual(tend.logProblems({ ...sweep, expectations: undefined, backfilled: true }), [], 'a backfilled line says only what the record says');
  const [feature] = expectations;
  assert.deepEqual(tend.logProblems({ ...sweep, expectations: [{ ...feature, lines: feature.lines.slice(0, 2) }] }), [], 'a line the steward dropped still counts among the three to five written');
  const bad = (g: unknown) => tend.logProblems(g).length > 0;
  assert.ok(bad({ ...sweep, expectations: undefined }), 'a sweep says its expectations');
  assert.ok(bad({ ...build, expectations: undefined }), 'a build says its expectations');
  assert.ok(bad({ ...sweep, expectations: undefined, date: '2026-11-20' }), 'a line logged once the lens holds says them');
  assert.ok(bad({ ...sweep, expectations: [] }));
  assert.ok(bad({ ...sweep, expectations: 'met' }));
  assert.ok(bad({ ...sweep, expectations: [{ ...feature, feature: '' }] }), 'each names its feature');
  assert.ok(bad({ ...sweep, expectations: [{ ...feature, lines: feature.lines.slice(0, 2), dropped: [] }] }), 'three lines at least');
  assert.ok(bad({ ...sweep, expectations: [{ ...feature, lines: [...feature.lines, ...feature.lines] }] }), 'five lines at most');
  assert.ok(bad({ ...sweep, expectations: [{ ...feature, lines: [{ ...feature.lines[0], is: 'partly' }, ...feature.lines.slice(1)] }] }), 'met, failed or lacking');
  assert.ok(bad({ ...sweep, expectations: [{ ...feature, lines: [{ line: 'Undo after a delete', is: 'failed' }, ...feature.lines.slice(1)] }] }), 'a line in the lens\'s form');
  assert.ok(bad({ ...sweep, expectations: [{ ...feature, dropped: [{ line: feature.dropped[0].line }] }] }), 'a dropped line names the Never line it breaks');
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
  const balance = src.slice(src.indexOf('function balance('), src.indexOf('\n}\n', src.indexOf('function balance(')));
  assert.match(balance, /mainOrHere\('docs\/STATUS\.md'/, 'the open entries are main\'s');
  assert.match(balance, /mainOrHere\(LEDGER_REL/, 'the areas\' states are main\'s');
  assert.doesNotMatch(balance, /readFileSync\(path\.join\(ROOT, 'docs', 'STATUS\.md'\)/);
  assert.match(balance, /log\(`--since=\$\{days\} days ago`, 'origin\/main'\)/, 'the commits are main\'s');
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
  const areas = { 'walk-screen': { state: 'polished' }, replay: { state: 'settling' } };
  const commits = [
    { subject: 'fix walk: a copy change', files: [edit('src/components/walk/Bar.tsx', '<Text>Paused</Text>', '<Text>Pause</Text>')] },
    { subject: 'Walk: a new route file (WK9)', files: [{ status: 'A', path: 'src/app/replay/all.tsx', plus: '' }] },
  ];
  const changed = { 'walk-screen': commits.some((c) => tend.resetsArea(c, owns)) };
  assert.deepEqual(tend.areasByState(areas, changed), { rough: [], settling: ['replay'], polished: ['walk-screen'], resting: [] });
  const more = [...commits, { subject: 'Walk: a Stop (WK10)', files: [edit('src/components/walk/Bar.tsx', '<Pressable onPress={stop}>')] }];
  assert.deepEqual(tend.areasByState(areas, { 'walk-screen': more.some((c) => tend.resetsArea(c, owns)) }).rough, ['walk-screen']);
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
  const body = src.slice(src.indexOf('function changesByArea('), src.indexOf('\n}\n', src.indexOf('function changesByArea(')));
  assert.match(body, /resetsArea\(/, 'the count is of commits that reset the area');
  assert.doesNotMatch(body, /c\.files\.some\(\(p\) => isAppSource\(p\)/, 'not of every commit that touched its source');
  assert.match(src, /function next\(\) \{[^}]*changesByArea\(/, 'next ranks by it');
  assert.match(src.slice(src.indexOf('function balance(')), /changesByArea\(sweptAt\(ledger\)\)/, 'the balance reads it');
});
