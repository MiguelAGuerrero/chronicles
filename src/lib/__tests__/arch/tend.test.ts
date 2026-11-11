// @tree-wide: the tending loop's script, its ledger and the skills it routes through
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';

// The loop's mechanical reads (decisions 0128-0130): growth against refinement, and what a loop commit carries.

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
type Reading = { reading: string; propose: boolean; why: string };
type File = { status: string; path: string };
const tend = createRequire(__filename)(join(ROOT, 'scripts', 'tend.js')) as {
  STATES: string[];
  classify(subject: string, o?: { files?: string[]; known?: Set<string> }): 'growth' | 'refinement' | 'other';
  criteriaPrefixes(subject: string, known?: Set<string>): string[];
  tally(commits: { subject: string; files?: string[] }[], known?: Set<string>): { growth: number; refinement: number; other: number; slices: string[] };
  areasByState(areas: Record<string, { state: string }>, changed?: Record<string, boolean>): Record<string, string[]>;
  readStatus(text: string): { openT: number; phoneT: number; openG: number };
  reading(input: { slices: number; rough: number; openT: number; openG: number; inProgress: number }): Reading;
  nextArea(counts: Record<string, number>): string | null;
  tendCommitProblems(c: { subject: string; body: string; files: File[]; added?: string }): string[];
};
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
  const base = { slices: 2, rough: 1, openT: 2, openG: 1, inProgress: 1 };
  assert.equal(tend.reading(base).reading, 'in step');
  assert.equal(tend.reading(base).propose, false);
  assert.deepEqual([tend.reading({ ...base, slices: 0 }).reading, tend.reading({ ...base, slices: 0 }).propose], ['settling', true]);
  assert.equal(tend.reading({ ...base, openG: 0, inProgress: 0 }).reading, 'settling');
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

test('tend round 1: an area changed since its sweep is rough whatever the ledger says', () => {
  assert.deepEqual(tend.STATES, ['rough', 'settling', 'polished', 'resting']);
  const areas = { replay: { state: 'polished' }, map: { state: 'rough' }, memories: { state: 'resting' } };
  assert.deepEqual(tend.areasByState(areas), { rough: ['map'], settling: [], polished: ['replay'], resting: ['memories'] });
  assert.deepEqual(tend.areasByState(areas, { replay: true, memories: true }), { rough: ['map', 'memories', 'replay'], settling: [], polished: [], resting: [] });
});

test('tend round 1: with no area named, the one changed most since its sweep is next', () => {
  assert.equal(tend.nextArea({ map: 2, replay: 5, memories: 5, tabs: 0 }), 'memories');
  assert.equal(tend.nextArea({ map: 0 }), null);
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
  assert.deepEqual(tend.tendCommitProblems({ ...ok, subject: 'tend memories audit 1: Undo keeps its name after a reload', body: '' }), [], 'an audit fix answers a failing input, not a source');
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
    assert.match(ship, new RegExp(`^## ${h}$`, 'm'), `ship.md keeps the heading "${h}" the skills name`);
  }
  assert.match(read('.claude/skills/slice/SKILL.md'), /--from=G<n>/);
  assert.doesNotMatch(read('.claude/skills/tend/SKILL.md'), /--from=T/, 'only a proposal with criteria skips the plan review (decision 0130)');
  assert.match(read('package.json'), /"check:tend"/);
});
