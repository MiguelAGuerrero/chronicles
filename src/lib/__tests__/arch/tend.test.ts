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
const tend = createRequire(__filename)(join(ROOT, 'scripts', 'tend.js')) as {
  STATES: string[];
  classify(subject: string): 'growth' | 'refinement' | 'other';
  criteriaPrefixes(subject: string): string[];
  tally(subjects: string[]): { growth: number; refinement: number; other: number; slices: string[] };
  areasByState(areas: Record<string, { state: string }>): Record<string, string[]>;
  readStatus(text: string): { openT: number; openG: number; inFlight: number };
  reading(input: { growth: number; rough: number; openT: number; openG: number; inFlight: number }): Reading;
  tendCommitProblems(c: { subject: string; body: string; files: string[] }): string[];
};

test('tend: a subject is growth by its criteria, refinement by fix, tend, audit or revert, else other', () => {
  assert.equal(tend.classify('Presence and kinds: a museum the data calls historic lights History (PK1-PK19) (#4)'), 'growth');
  assert.equal(tend.classify('Moment references: tests first (RF1-RF8, failing)'), 'growth');
  assert.equal(tend.classify('fix thread-log audit 7, 8, 9: a plain note and its time are one named group'), 'refinement');
  assert.equal(tend.classify('presence-and-kinds audit 8, 10: the owner\'s call'), 'refinement');
  assert.equal(tend.classify('tend memories 3: the Undo names what it restores'), 'refinement');
  assert.equal(tend.classify('Revert "Explore: a row of cards (EC1-EC20)"'), 'refinement');
  assert.equal(tend.classify('Merge origin/main into claude/x: the decision renumbered (PK1)'), 'other');
  assert.equal(tend.classify('Testing: choose the e2e journeys, not every one check:affected names'), 'other');
  assert.deepEqual(tend.criteriaPrefixes('Moment stacks: STATUS for the deploy (MT1-MT11, MS1-MS21)'), ['MS', 'MT']);
  assert.deepEqual(tend.criteriaPrefixes('fix x: decision 0125 and 1695 tests'), []);
});

test('tend: the tally counts each kind and names the slices that grew', () => {
  const t = tend.tally(['A slice (QL1-QL8)', 'A slice: docs (QL1-QL8)', 'fix a thing', 'Merge main', 'Another (RF1)']);
  assert.deepEqual(t, { growth: 3, refinement: 1, other: 1, slices: ['QL', 'RF'] });
});

test('tend: the reading holds back on a rough base before it asks for growth', () => {
  const base = { growth: 2, rough: 1, openT: 2, openG: 1, inFlight: 1 };
  assert.equal(tend.reading(base).reading, 'in step');
  assert.equal(tend.reading(base).propose, false);
  assert.deepEqual(
    [tend.reading({ ...base, growth: 0 }).reading, tend.reading({ ...base, growth: 0 }).propose],
    ['settling', true],
  );
  assert.equal(tend.reading({ ...base, openG: 0, inFlight: 0 }).reading, 'settling');
  // Four rough areas, or eleven unanswered entries: nothing new is proposed, even with no growth.
  assert.deepEqual(
    [tend.reading({ ...base, growth: 0, rough: 4 }).reading, tend.reading({ ...base, growth: 0, rough: 4 }).propose],
    ['outgrowing its base', false],
  );
  assert.equal(tend.reading({ ...base, openT: 11 }).reading, 'outgrowing its base');
  assert.equal(tend.reading({ ...base, rough: 3, openT: 10 }).reading, 'in step');
  assert.doesNotMatch(tend.reading({ ...base, rough: 4 }).why, /\d/, 'the reason is said in words');
});

test('tend: STATUS.md gives the open entries and the rows in flight', () => {
  const text = [
    '## Needs the owner', '', '- **T3 [owner] A thing** (2026-11-11)', '- **T4 [phone] Another**', '- **G1 [M] Search** · Return',
    '', '## In flight', '', 'Other sessions edit this table.', '', '| Session | Branch | Doing |', '|---|---|---|', '| a | b | c |', '| d | e | f |',
    '', '## Updating this file', '', '| not | a | row |',
  ].join('\n');
  assert.deepEqual(tend.readStatus(text), { openT: 2, openG: 1, inFlight: 2 });
  assert.deepEqual(tend.readStatus('## Needs the owner\n'), { openT: 0, openG: 0, inFlight: 0 });
  const live = tend.readStatus(read('docs/STATUS.md'));
  assert.ok(live.inFlight >= 0 && live.openT >= 0);
});

test('tend: areas are grouped by the four states', () => {
  assert.deepEqual(tend.STATES, ['rough', 'settling', 'polished', 'resting']);
  const by = tend.areasByState({ replay: { state: 'polished' }, map: { state: 'rough' }, memories: { state: 'rough' } });
  assert.deepEqual(by, { rough: ['map', 'memories'], settling: [], polished: ['replay'], resting: [] });
});

test('tend: a loop commit that changes code carries a test and names its source; docs alone need neither', () => {
  const ok = { subject: 'tend memories 2: Undo is a button with a name', body: 'Source: WCAG 2.2, 4.1.2 Name, Role, Value\n', files: ['src/components/Undo.tsx', 'src/lib/__tests__/memories/undo.test.ts'] };
  assert.deepEqual(tend.tendCommitProblems(ok), []);
  assert.deepEqual(tend.tendCommitProblems({ ...ok, files: ['src/components/Undo.tsx', 'scripts/e2e/journeys/memories.js'] }), []);
  assert.equal(tend.tendCommitProblems({ ...ok, files: ['src/components/Undo.tsx'] }).length, 1);
  assert.equal(tend.tendCommitProblems({ ...ok, body: 'It looked wrong.' }).length, 1);
  assert.deepEqual(tend.tendCommitProblems({ subject: 'tend memories: the rule file names the Undo', body: '', files: ['.claude/rules/memories.md', 'docs/STATUS.md'] }), []);
  assert.deepEqual(tend.tendCommitProblems({ subject: 'fix a thing', body: '', files: ['src/x.ts'] }), [], 'only loop commits are held to it');
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
  for (const h of ['Open the worktree', 'Hard stops', 'Review', 'Publish to main', 'Clean up', 'The result block']) {
    assert.match(ship, new RegExp(`^## ${h}$`, 'm'), `ship.md keeps the heading "${h}" the skills name`);
  }
  assert.match(read('.claude/skills/slice/SKILL.md'), /--from=G<n>/);
  assert.match(read('package.json'), /"check:tend"/);
});
