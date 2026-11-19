// @tree-wide: the expectation store (scripts/expectations.js, docs/expectations/) and the docs check that holds it
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Decision 0234: what a person would reasonably expect of each feature, drafted by /tend's lens 0, ratified once by
// the owner, each line naming the check that shows it. The script decides what it can, deterministically.

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

type Entry = { id: string; n: number; status: string; date?: string; by?: string; text: string; amends?: string; check: string; grounds: string; answer?: string };
type Store = { feature: string; head: string; entries: Entry[]; problems: string[] };
type Draft = { text: string; check: string; grounds: string; amends?: string };
type Op = { store: Store; ids: string[]; problems: string[] };
type Index = { journeys: Record<string, string>; tests: Record<string, 'ok' | 'todo'> };
type RefOptions = { exists?: (p: string) => boolean; shots?: string; area?: string };
type Expectations = {
  ID: RegExp;
  parseStore(text: string, feature: string): Store;
  formatStore(store: Store): string;
  parseDraft(text: string): { lines: Draft[]; problems: string[] };
  draft(store: Store, lines: Draft[]): Op;
  amend(store: Store, id: string, line: Draft): Op;
  answer(store: Store, ids: string[], o: { as: 'ratified' | 'declined'; by: string; date: string; answer: string }): Op;
  setCheck(store: Store, id: string, check: string): Op;
  parseCheck(check: string): { kind: string; journey?: string; text?: string; name?: string } | null;
  indexOf(files: { journeys: Record<string, string>; tests: Record<string, string>; features?: Record<string, string[]> }): Index;
  resolveCheck(check: string, index: Index, feature?: string): 'ok' | 'pending' | 'todo' | 'missing';
  checkProblems(stores: Store[], index: Index, features: string[]): { message: string }[];
  due(stores: Store[], features: string[]): string[];
  listText(stores: Store[], index: Index): string;
  editProblems(before: string, after: string, feature: string): string[];
  logRefProblems(lines: { id: string; is: string; evidence?: string; provisional?: boolean }[], stores: Store[], index: Index, o?: RefOptions): string[];
  check(root: string): { message: string }[];
  writeProblems(store: Store): string[];
};
const ex = createRequire(__filename)(join(ROOT, 'scripts', 'expectations.js')) as Expectations;

const person = 'A person who wanders a town to notice, using memories, would reasonably expect';
const STORE = [
  '# Expectations: memories',
  '',
  'What a person would reasonably expect of memories (decision 0234).',
  '',
  `- E-memories-1 [ratified 2026-11-20] ${person} a capture to come back when they pass its place again.`,
  '  Check: memories:"a later walk passing a flagged capture brings it back"',
  '  Grounds: VISION "Who it is for"; adjacent-apps "Moments that come back" (Day One, Apple Photos)',
  '  Answer: "Ratify as drafted" (the owner, 2026-11-20)',
  `- E-memories-2 [proposed] ${person} each memory pin to say it is a memory.`,
  '  Check: test:"memories MR7: a capture whose reminder card is showing has no memory pin"',
  '  Grounds: VISION "Who it is for"; not yet recorded',
  `- E-memories-3 [proposed] ${person} to find a memory again by a word in it.`,
  '  Check: pending "a word typed finds the moment that holds it"',
  '  Grounds: VISION "Who it is for"; adjacent-apps "Search" (Day One)',
  '',
].join('\n');

const JOURNEY = [
  "check(reminded, 'a later walk passing a flagged capture brings it back');",
  "await shot(page, '13-reminder');",
  "check.todo(false, 'a word typed finds the moment that holds it');",
  "check(true, 'a star\\u2019s Walk here starts a walk');",
].join('\n');
const TESTS = [
  "test('memories MR7: a capture whose reminder card is showing has no memory pin', () => {});",
  "test('memories MR8: the walker\\'s area is read again', () => {});",
  "test.todo('memories MR9: later');",
].join('\n');
const index = () =>
  ex.indexOf({ journeys: { memories: JOURNEY, threads: "await shot(page, 'threads-01');" }, tests: { 'src/lib/__tests__/memories/memories.test.ts': TESTS }, features: { memories: ['memories'], threads: ['threads'] } });
const store = () => ex.parseStore(STORE, 'memories');
const line = (what: string, check = 'pending "it shows"'): Draft => ({ text: `${person} ${what}`, check, grounds: 'VISION "Who it is for"; not yet recorded' });

/** A checkout of its own: the feature map, a journey, a test file and the store, for the script to run in. */
function tempRoot(stores: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'expectations-'));
  for (const d of ['scripts/e2e/journeys', 'src/lib/__tests__/memories', 'docs/expectations']) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, 'scripts/features.js'), "module.exports = { FEATURES: [{ name: 'memories', journeys: ['memories'] }, { name: 'threads', journeys: ['threads'] }] };\n");
  writeFileSync(join(root, 'scripts/e2e/journeys/memories.js'), JOURNEY);
  writeFileSync(join(root, 'src/lib/__tests__/memories/memories.test.ts'), TESTS);
  for (const [name, text] of Object.entries(stores)) writeFileSync(join(root, 'docs/expectations', name), text);
  return root;
}

test('expectations audit 10: a store reads with CRLF line ends and blank lines between entries; README.md is no store; a problem names its line in the file', () => {
  const crlf = ex.parseStore(STORE.replace(/\n/g, '\r\n'), 'memories');
  assert.deepEqual(crlf.problems, []);
  assert.deepEqual(crlf.entries, store().entries);
  const spaced = ex.parseStore(STORE.replace('- E-memories-2', '\n- E-memories-2'), 'memories');
  assert.deepEqual(spaced.problems, []);
  assert.equal(spaced.entries.length, 3);
  assert.deepEqual(ex.parseDraft('- A person x\r\n  Check: pending "x"\r\n  Grounds: y\r\n').lines[0].grounds, 'y');
  const bad = ex.parseStore(STORE.replace('  Check: test:"memories MR7', '  Bogus: test:"memories MR7'), 'memories');
  assert.ok(bad.problems.some((p) => /^line 10: Bogus is no key/.test(p)), bad.problems.join('\n'));
  assert.deepEqual(ex.check(tempRoot({ 'README.md': '# The expectation stores\n\nOne file per feature.\n', 'memories.md': STORE })), []);
});

const cli = (root: string, ...args: string[]) =>
  spawnSync(process.execPath, [join(ROOT, 'scripts', 'expectations.js'), ...args], { cwd: root, env: { ...process.env, EXPECTATIONS_ROOT: root }, encoding: 'utf8' });

test('expectations audit 4: no write leaves a store that reads otherwise: an answer on two lines is refused, and the file stays as it was', () => {
  const owner = { as: 'ratified' as const, by: 'owner', date: '2026-11-21' };
  for (const answer of ['Ratify\nas drafted', 'Ratify\r as drafted', 'yes\n- E-memories-9 [ratified 2026-11-21] A person would reasonably expect x']) {
    assert.ok(ex.answer(store(), ['E-memories-2'], { ...owner, answer }).problems.some((p) => /one line/.test(p)), JSON.stringify(answer));
  }
  assert.deepEqual(ex.writeProblems(store()), []);
  const [first] = store().entries;
  assert.ok(ex.writeProblems({ ...store(), entries: [{ ...first, text: `${first.text}\n  Answer: "yes" (the owner, 2026-11-21)` }] }).length > 0, 'a store that writes and reads back otherwise');
  assert.ok(ex.writeProblems({ ...store(), entries: [{ ...first, grounds: '' }] }).length > 0, 'a store that writes and reads back with problems');
  const root = tempRoot({ 'memories.md': STORE });
  const r = cli(root, 'ratify', 'E-memories-2', '--by', 'owner', '--date', '2026-11-21', '--answer', 'Ratify\nas drafted');
  assert.equal(r.status, 1);
  assert.equal(readFileSync(join(root, 'docs/expectations/memories.md'), 'utf8'), STORE);
});

test('expectations audit 5: a store that does not read is written by no operation, and any agent change to it is refused', () => {
  const BROKEN = STORE.replace('  Grounds: VISION "Who it is for"; not yet recorded\n', '');
  const broken = ex.parseStore(BROKEN, 'memories');
  assert.ok(broken.problems.length > 0);
  const owner = { as: 'ratified' as const, by: 'owner', date: '2026-11-21', answer: 'yes' };
  for (const r of [
    ex.draft(broken, [line('a day of walks in order.')]),
    ex.amend(broken, 'E-memories-1', line('x.')),
    ex.answer(broken, ['E-memories-3'], owner),
    ex.setCheck(broken, 'E-memories-3', 'picture:13-reminder'),
  ]) {
    assert.ok(r.problems.some((p) => /does not read/.test(p)), r.problems.join('\n'));
    assert.deepEqual(r.ids, []);
  }
  const root = tempRoot({ 'memories.md': BROKEN });
  writeFileSync(join(root, 'lines.md'), `- ${person} a day of walks in order.\n  Check: pending "x"\n  Grounds: VISION "Who it is for"; not yet recorded\n`);
  assert.equal(cli(root, 'draft', 'memories', '--file', join(root, 'lines.md')).status, 1);
  assert.equal(readFileSync(join(root, 'docs/expectations/memories.md'), 'utf8'), BROKEN, 'nothing dropped');
  assert.deepEqual(ex.editProblems(BROKEN, BROKEN, 'memories'), [], 'left as it is');
  assert.ok(ex.editProblems(BROKEN, BROKEN.replace(/- E-memories-3[\s\S]*$/, ''), 'memories').some((p) => /does not read/.test(p)), 'a line of a broken store removed');
  assert.ok(ex.editProblems(BROKEN, STORE, 'memories').some((p) => /does not read/.test(p)), 'even mended: the owner mends it by hand');
});

test('expectations audit 11: a line has one open amendment at a time, and an amendment is ratified only over a ratified line', () => {
  const once = ex.amend(store(), 'E-memories-1', line('a capture to come back within 100 m of its place.'));
  assert.deepEqual(once.problems, []);
  assert.ok(ex.amend(once.store, 'E-memories-1', line('a capture to come back on the same street.')).problems.some((p) => /E-memories-4/.test(p)), 'the open amendment named');
  const odd = ex.parseStore(`${STORE}- E-memories-4 [proposed] ${person} a pin to say it is a memory, in words.\n  Amends: E-memories-2\n  Check: pending "y"\n  Grounds: VISION "Who it is for"; not yet recorded\n`, 'memories');
  assert.deepEqual(odd.problems, []);
  const r = ex.answer(odd, ['E-memories-4'], { as: 'ratified', by: 'owner', date: '2026-11-21', answer: 'yes' });
  assert.ok(r.problems.some((p) => /E-memories-2 is proposed/.test(p)), r.problems.join('\n'));
  const both = ex.answer(once.store, ['E-memories-4'], { as: 'ratified', by: 'owner', date: '2026-11-21', answer: 'yes' });
  assert.deepEqual(both.problems, []);
  assert.equal(both.store.entries.filter((e) => e.status === 'ratified' || (e.status === 'proposed' && !e.amends)).length, 3, 'the lines in force stay three');
});

test('expectations audit 3: met rests on a check that tests the line: a whole check message, a real test, the feature\'s own picture; a todo check meets nothing', () => {
  const journey = [
    JOURNEY,
    "const label = 'only a label in the code';",
    'check(',
    "  (await page.locator('x').count()) === 0 && /a,b\\)/.test(s) && f('(', \"'\"),",
    "  'a check over three lines',",
    ');',
    'check(ok, `tend 3 (${n})`);',
  ].join('\n');
  const tests = [
    TESTS,
    "expect.test('memories MR10: not a test', () => {});",
    "test('memories MR11: later', { todo: 'x' }, () => {});",
    "test('memories MR13: skipped', { skip: true }, () => {});",
    "it('memories MR12: an it', () => {});",
  ].join('\n');
  const i = ex.indexOf({ journeys: { memories: journey, threads: "await shot(page, 'threads-01');" }, tests: { 'a.test.ts': tests }, features: { memories: ['memories'], threads: ['threads'] } });
  assert.equal(ex.resolveCheck('memories:"a later walk"', i), 'missing', 'a part of a message is no check');
  assert.equal(ex.resolveCheck('memories:"const"', i), 'missing');
  assert.equal(ex.resolveCheck('memories:"only a label in the code"', i), 'missing', 'a string that is no check\'s message');
  assert.equal(ex.resolveCheck('memories:"a check over three lines"', i), 'ok');
  assert.equal(ex.resolveCheck('memories:"tend 3 ("', i), 'missing', 'a message built at run time is named by no check');
  assert.equal(ex.resolveCheck('test:"memories MR10: not a test"', i), 'missing', 'a method called test is no test');
  assert.equal(ex.resolveCheck('test:"memories MR11: later"', i), 'todo');
  assert.equal(ex.resolveCheck('test:"memories MR13: skipped"', i), 'todo');
  assert.equal(ex.resolveCheck('test:"memories MR12: an it"', i), 'ok');
  assert.equal(ex.resolveCheck('picture:threads-01', i, 'memories'), 'missing', 'another feature\'s picture');
  assert.equal(ex.resolveCheck('picture:threads-01', i, 'threads'), 'ok');
  assert.ok(ex.setCheck(store(), 'E-memories-2', 'pending "x"').problems.some((p) => /pending/.test(p)), 'a checkable line never goes back to pending');
  assert.deepEqual(ex.setCheck(store(), 'E-memories-3', 'pending "a word typed finds it"').problems, []);
  const todo = [ex.parseStore(STORE.replace('pending "a word typed finds the moment that holds it"', 'memories:"a word typed finds the moment that holds it"'), 'memories')];
  const o = { exists: () => true, shots: '/tmp/shots' };
  const refs = (l: Parameters<Expectations['logRefProblems']>[0], st = todo) => ex.logRefProblems(l, st, index(), o);
  assert.ok(refs([{ id: 'E-memories-3', is: 'met', evidence: 'picture:/tmp/shots/search.png', provisional: true }]).length > 0, 'a todo check meets nothing, a picture included');
  assert.ok(refs([{ id: 'E-memories-3', is: 'met', evidence: 'memories:"a word typed finds the moment that holds it"', provisional: true }]).length > 0);
  assert.deepEqual(refs([{ id: 'E-memories-3', is: 'lacking', provisional: true }]), []);
  assert.ok(refs([{ id: 'E-memories-3', is: 'met', evidence: 'picture:/elsewhere/search.png', provisional: true }], [store()]).length > 0, 'a picture from the run\'s shots');
  assert.ok(refs([{ id: 'E-memories-3', is: 'met', evidence: 'picture:/tmp/shots/search.jpg', provisional: true }], [store()]).length > 0, 'a .png');
  assert.ok(refs([{ id: 'E-memories-3', is: 'met', evidence: 'picture:/tmp/shots/../x/search.png', provisional: true }], [store()]).length > 0, 'under the folder, not beside it');
  assert.deepEqual(refs([{ id: 'E-memories-3', is: 'met', evidence: 'picture:13-reminder', provisional: true }], [store()]), [], 'a shot of the feature\'s own journey');
  assert.ok(refs([{ id: 'E-memories-3', is: 'met', evidence: 'picture:threads-01', provisional: true }], [store()]).length > 0, 'not another feature\'s');
});

test('expectations 0234: a store file reads into lines with their status, check and grounds, and writes back the same', () => {
  const s = store();
  assert.deepEqual(s.problems, []);
  assert.deepEqual(s.entries.map((e) => [e.id, e.status]), [['E-memories-1', 'ratified'], ['E-memories-2', 'proposed'], ['E-memories-3', 'proposed']]);
  assert.equal(s.entries[0].date, '2026-11-20');
  assert.equal(s.entries[0].answer, '"Ratify as drafted" (the owner, 2026-11-20)');
  assert.equal(s.entries[2].check, 'pending "a word typed finds the moment that holds it"');
  assert.equal(ex.formatStore(s), STORE, 'the file is its own canonical form');
  assert.ok(ex.parseStore(STORE.replace('E-memories-2 [proposed]', 'E-memories-2 [maybe]'), 'memories').problems.length > 0, 'an unknown status');
  assert.ok(ex.parseStore(STORE.replace('E-memories-2', 'E-threads-2'), 'memories').problems.length > 0, 'an id of another feature');
  assert.ok(ex.parseStore(STORE.replace('  Grounds: VISION "Who it is for"; not yet recorded\n', ''), 'memories').problems.length > 0, 'a line without its grounds');
});

test('expectations 0234: a draft adds proposed lines numbered on, and refuses a duplicate, a line not in the form, or a sixth', () => {
  const d = ex.draft(store(), [line('a day of walks to read in the order they happened.'), line('a deleted memory to come back with Undo.', 'memories:"a later walk passing a flagged capture brings it back"')]);
  assert.deepEqual(d.problems, []);
  assert.deepEqual(d.ids, ['E-memories-4', 'E-memories-5']);
  assert.deepEqual(d.store.entries.slice(3).map((e) => e.status), ['proposed', 'proposed']);
  assert.ok(ex.draft(store(), [line('a capture to come back when they pass its place again.')]).problems.some((p) => /already/.test(p)), 'a duplicate');
  assert.ok(ex.draft(store(), [{ ...line('x'), text: 'Undo after a delete' }]).problems.length > 0, 'the form');
  assert.ok(ex.draft(store(), [{ ...line('x'), grounds: 'Day One' }]).problems.length > 0, 'grounds in VISION first');
  assert.ok(ex.draft(store(), [line('x.', 'memories:unquoted')]).problems.length > 0, 'a check in one of the forms');
  assert.ok(ex.draft(store(), [line('a.'), line('b.'), line('c.')]).problems.some((p) => /five/.test(p)), 'five lines in force at most');
  const empty = ex.parseStore('', 'threads');
  assert.ok(ex.draft(empty, [line('a.'), line('b.')]).problems.some((p) => /three/.test(p)), 'a first draft has three lines at least');
  assert.deepEqual(ex.draft(empty, [line('a.'), line('b.'), line('c.')]).ids, ['E-threads-1', 'E-threads-2', 'E-threads-3']);
});

test('expectations 0234: an amendment is a new proposed line; only the owner\'s answer ratifies, and a ratified amendment supersedes', () => {
  const a = ex.amend(store(), 'E-memories-1', line('a capture to come back when they pass within 100 m of its place.'));
  assert.deepEqual(a.problems, []);
  assert.deepEqual(a.ids, ['E-memories-4']);
  assert.equal(a.store.entries[3].amends, 'E-memories-1');
  assert.deepEqual(a.store.entries[0], store().entries[0], 'the ratified line stands as it was');
  assert.ok(ex.amend(store(), 'E-memories-2', line('x.')).problems.length > 0, 'only a ratified line is amended');
  assert.ok(ex.amend(store(), 'E-memories-9', line('x.')).problems.length > 0);
  const owner = { as: 'ratified' as const, by: 'owner', date: '2026-11-21', answer: 'Ratify as drafted' };
  const r = ex.answer(a.store, ['E-memories-4'], owner);
  assert.deepEqual(r.problems, []);
  assert.equal(r.store.entries[3].status, 'ratified');
  assert.equal(r.store.entries[3].answer, '"Ratify as drafted" (the owner, 2026-11-21)');
  assert.equal(r.store.entries[0].status, 'superseded');
  assert.match(ex.formatStore(r.store), /E-memories-1 \[superseded 2026-11-21 by E-memories-4\]/);
  assert.ok(ex.answer(store(), ['E-memories-2'], { ...owner, by: 'proxy' }).problems.some((p) => /owner/.test(p)), 'never the proxy');
  assert.ok(ex.answer(store(), ['E-memories-2'], { ...owner, date: 'today' }).problems.length > 0);
  assert.ok(ex.answer(store(), ['E-memories-2'], { ...owner, answer: ' ' }).problems.length > 0, 'the answer is recorded verbatim');
  assert.ok(ex.answer(store(), ['E-memories-1'], owner).problems.length > 0, 'a ratified line is answered once');
  assert.equal(ex.answer(store(), ['E-memories-3'], { ...owner, as: 'declined' }).store.entries[2].status, 'declined');
  const c = ex.setCheck(store(), 'E-memories-3', 'memories:"a later walk passing a flagged capture brings it back"');
  assert.deepEqual(c.problems, []);
  assert.equal(c.store.entries[2].check, 'memories:"a later walk passing a flagged capture brings it back"');
  assert.ok(ex.setCheck(store(), 'E-memories-3', 'whatever').problems.length > 0);
});

test('expectations 0234: a check names a journey check, a test or a picture that exists; pending and todo checks are said, not passed', () => {
  assert.deepEqual(ex.parseCheck('memories:"a later walk"'), { kind: 'journey', journey: 'memories', text: 'a later walk' });
  assert.deepEqual(ex.parseCheck('test:"memories MR7: x"'), { kind: 'test', name: 'memories MR7: x' });
  assert.deepEqual(ex.parseCheck('picture:13-reminder'), { kind: 'picture', name: '13-reminder' });
  assert.deepEqual(ex.parseCheck('pending "it shows"'), { kind: 'pending', text: 'it shows' });
  assert.equal(ex.parseCheck('memories: a later walk'), null);
  const i = index();
  assert.equal(ex.resolveCheck('memories:"a later walk passing a flagged capture brings it back"', i), 'ok');
  assert.equal(ex.resolveCheck('memories:"a star’s Walk here starts a walk"', i), 'ok', 'an escape in the source reads as its character');
  assert.equal(ex.resolveCheck('memories:"a word typed finds the moment that holds it"', i), 'todo');
  assert.equal(ex.resolveCheck('memories:"nothing like it"', i), 'missing');
  assert.equal(ex.resolveCheck('threads:"a later walk passing a flagged capture brings it back"', i), 'missing', 'in its own journey');
  assert.equal(ex.resolveCheck('test:"memories MR7: a capture whose reminder card is showing has no memory pin"', i), 'ok');
  assert.equal(ex.resolveCheck('test:"memories MR8: the walker\'s area is read again"', i), 'ok');
  assert.equal(ex.resolveCheck('test:"memories MR9: later"', i), 'todo');
  assert.equal(ex.resolveCheck('test:"memories MR1"', i), 'missing', 'a whole name, not a part');
  assert.equal(ex.resolveCheck('picture:13-reminder', i, 'memories'), 'ok');
  assert.equal(ex.resolveCheck('picture:14-nothing', i, 'memories'), 'missing');
  assert.equal(ex.resolveCheck('pending "it shows"', i), 'pending');
  const problems = ex.checkProblems([store(), ex.parseStore(STORE.replace(/MR7: a capture[^"]*/, 'MR7: gone').replace(/memories/g, 'threads'), 'threads')], i, ['memories', 'threads']);
  assert.equal(problems.length, 2, problems.map((p) => p.message).join('\n'));
  assert.ok(problems.every((p) => /E-threads-[12]/.test(p.message)));
  assert.ok(ex.checkProblems([ex.parseStore(STORE.replace(/memories/g, 'nowhere'), 'nowhere')], i, ['memories']).some((p) => /nowhere/.test(p.message)), 'a store of no feature');
});

test('expectations 0234: due names the features a run touches with no ratified line; list says each line and its check', () => {
  const threads = ex.parseStore(STORE.replace(/memories/g, 'threads').replace('[ratified 2026-11-20]', '[proposed]').replace(/  Answer:.*\n/, ''), 'threads');
  assert.deepEqual(ex.due([store(), threads], ['memories', 'threads', 'gallery']), ['threads', 'gallery']);
  assert.equal(
    ex.listText([store()], index()),
    [
      'memories',
      `  E-memories-1 ratified 2026-11-20  ${person} a capture to come back when they pass its place again.`,
      '    check ok: memories:"a later walk passing a flagged capture brings it back"',
      `  E-memories-2 proposed  ${person} each memory pin to say it is a memory.`,
      '    check ok: test:"memories MR7: a capture whose reminder card is showing has no memory pin"',
      `  E-memories-3 proposed  ${person} to find a memory again by a word in it.`,
      '    check pending: pending "a word typed finds the moment that holds it"',
      '',
    ].join('\n'),
  );
});

test('expectations 0234: a loop commit adds proposed lines and fills a check; it never changes, removes, ratifies or declines a line', () => {
  const added = ex.formatStore(ex.draft(store(), [line('a day of walks in order.')]).store);
  assert.deepEqual(ex.editProblems(STORE, added, 'memories'), []);
  assert.deepEqual(ex.editProblems(STORE, ex.formatStore(ex.amend(store(), 'E-memories-1', line('x.')).store), 'memories'), []);
  assert.deepEqual(ex.editProblems(STORE, ex.formatStore(ex.setCheck(store(), 'E-memories-3', 'picture:13-reminder').store), 'memories'), [], 'a check is evidence, filled in');
  assert.deepEqual(ex.editProblems('', STORE.replace(/\[ratified[^\]]*\]/, '[proposed]').replace(/  Answer:.*\n/, ''), 'memories'), [], 'a new store of proposed lines');
  const one = (after: string) => ex.editProblems(STORE, after, 'memories');
  assert.ok(one(STORE.replace('its place again', 'its street again')).some((p) => /E-memories-1/.test(p)), 'a ratified line reworded');
  assert.ok(one(STORE.replace(/- E-memories-1[\s\S]*?(?=- E-memories-2)/, '')).some((p) => /E-memories-1/.test(p)), 'a ratified line removed');
  assert.ok(one(ex.formatStore(ex.answer(store(), ['E-memories-2'], { as: 'ratified', by: 'owner', date: '2026-11-21', answer: 'yes' }).store)).some((p) => /E-memories-2/.test(p)), 'a line marked ratified');
  assert.ok(one(STORE.replace(/- E-memories-3[\s\S]*$/, '')).some((p) => /E-memories-3/.test(p)), 'a proposal waits for the owner');
  assert.ok(one(STORE + `- E-memories-4 [ratified 2026-11-21] ${person} x.\n  Check: pending "x"\n  Grounds: VISION "Who it is for"; not yet recorded\n  Answer: "yes" (the owner, 2026-11-21)\n`).some((p) => /E-memories-4/.test(p)), 'a line added as ratified');
  assert.ok(one('').length > 0, 'the store removed');
});

test('expectations 0234: a run log line names lines by id; met names its check, or a picture where the check is still pending', () => {
  const stores = [store()];
  const ok = (lines: Parameters<Expectations['logRefProblems']>[0]) => ex.logRefProblems(lines, stores, index(), { exists: () => true, shots: '/tmp/shots' });
  assert.deepEqual(ok([
    { id: 'E-memories-1', is: 'met', evidence: 'memories:"a later walk passing a flagged capture brings it back"' },
    { id: 'E-memories-2', is: 'failed', provisional: true },
    { id: 'E-memories-3', is: 'met', evidence: 'picture:/tmp/shots/memories-search.png', provisional: true },
  ]), []);
  assert.ok(ok([{ id: 'E-memories-9', is: 'lacking' }]).length > 0, 'a line the store holds');
  assert.ok(ok([{ id: 'E-memories-1', is: 'met' }]).length > 0, 'met names its evidence');
  assert.ok(ok([{ id: 'E-memories-1', is: 'met', evidence: 'test:"memories MR7: a capture whose reminder card is showing has no memory pin"' }]).length > 0, 'its own check');
  assert.ok(ok([{ id: 'E-memories-2', is: 'lacking' }]).length > 0, 'a proposed line is provisional');
  assert.ok(ok([{ id: 'E-memories-1', is: 'lacking', provisional: true }]).length > 0, 'a ratified line is not');
  assert.ok(ex.logRefProblems([{ id: 'E-memories-3', is: 'met', evidence: 'picture:/tmp/shots/gone.png', provisional: true }], stores, index(), { exists: () => false, shots: '/tmp/shots' }).length > 0, 'the picture exists');
  assert.ok(ok([{ id: 'E-memories-3', is: 'met', evidence: 'pending "a word typed finds the moment that holds it"', provisional: true }]).length > 0, 'a pending check is no evidence');
});

test('expectations 0234: the docs check holds the store, and the script prints the same thing for the same store', () => {
  assert.match(read('scripts/check-docs.js'), /require\('\.\/expectations'\)\.check\(ROOT\)/);
  assert.deepEqual(ex.check(ROOT), [], 'the repo\'s own store holds');
  assert.equal(JSON.parse(read('package.json')).scripts.expectations, 'node scripts/expectations.js');
  const root = mkdtempSync(join(tmpdir(), 'expectations-'));
  for (const d of ['scripts/e2e/journeys', 'src/lib/__tests__/memories', 'docs/expectations']) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, 'scripts/features.js'), "module.exports = { FEATURES: [{ name: 'memories' }, { name: 'threads' }] };\n");
  writeFileSync(join(root, 'scripts/e2e/journeys/memories.js'), JOURNEY);
  writeFileSync(join(root, 'src/lib/__tests__/memories/memories.test.ts'), TESTS);
  writeFileSync(join(root, 'lines.md'), [
    `- ${person} a capture to come back when they pass its place again.`,
    '  Check: memories:"a later walk passing a flagged capture brings it back"',
    '  Grounds: VISION "Who it is for"; adjacent-apps "Moments that come back" (Day One)',
    `- ${person} each memory pin to say it is a memory.`,
    '  Check: test:"memories MR7: a capture whose reminder card is showing has no memory pin"',
    '  Grounds: VISION "Who it is for"; not yet recorded',
    `- ${person} to find a memory again by a word in it.`,
    '  Check: memories:"a word nobody checks"',
    '  Grounds: VISION "Who it is for"; not yet recorded',
    '',
  ].join('\n'));
  const run = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'expectations.js'), ...args], { cwd: root, env: { ...process.env, EXPECTATIONS_ROOT: root }, encoding: 'utf8' });
  const drafted = run('draft', 'memories', '--file', join(root, 'lines.md'));
  assert.equal(drafted.status, 0, drafted.stderr);
  assert.equal(drafted.stdout, 'draft memories: E-memories-1, E-memories-2, E-memories-3 proposed in docs/expectations/memories.md\n');
  assert.equal(run('draft', 'memories', '--file', join(root, 'lines.md')).status, 1, 'the same lines twice');
  const checked = run('check');
  assert.equal(checked.status, 1);
  assert.equal(checked.stderr, 'expectations check: E-memories-3 names memories:"a word nobody checks", which no journey check holds: fix the check (npm run expectations -- set-check) or add it\n');
  assert.equal(run('ratify', 'E-memories-1', '--by', 'proxy', '--date', '2026-11-21', '--answer', 'yes').status, 1, 'never the proxy');
  const ratified = run('ratify', 'E-memories-1', 'E-memories-2', '--by', 'owner', '--date', '2026-11-21', '--answer', 'Ratify as drafted');
  assert.equal(ratified.stdout, 'ratify: E-memories-1, E-memories-2 ratified 2026-11-21 ("Ratify as drafted")\n');
  assert.equal(run('due', 'memories', 'threads').stdout, 'threads\n');
  assert.equal(run('set-check', 'E-memories-3', '--check', 'pending "a word typed finds it"').status, 0);
  assert.equal(run('check').stdout, 'expectations check: 3 lines, 2 checks found, 1 pending, 0 missing\n');
  assert.equal(run('list', 'memories').stdout, run('list', 'memories').stdout);
  assert.match(read('.claude/skills/tend/expectations.md'), /npm run expectations/);
});
