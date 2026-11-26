// @tree-wide: the owner's walk notes (specs/walk-notes, decisions 0238, 0270): /walked, scripts/walks.js and the gate
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Every note here is invented and names no real place: "Quillmarsh", "Vellow Mere", "Brindlecombe" and "Ostravane" are
// in no gazetteer. A test that needs a real name picks one from the shipped pack at run time and commits none.

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const load = createRequire(__filename);

type Note = { day: string; area: string; kind: string; words: string };
type Trip = { class: string; words: string };
type Walks = {
  KINDS: string[];
  WALKS_REL: string;
  LANDED: string;
  fold(text: string): string;
  nameIndex(pack: { names: string[]; ascii: string[]; regions: string[]; countries: string[] }): unknown;
  placeProblems(words: string, names: unknown): Trip[];
  noteProblems(note: unknown, o: { areas: string[]; today: string; names: unknown }): string[];
  parseNotes(text: string): Note[];
  commitProblems(c: { subject: string; message: string; files: { status: string; path: string }[]; before: string; after: string; authorDate: string; committerDate: string; names: unknown; areas: string[] }): string[];
  lensNotes(walks: Note[], area: string, store: string): { day: string; grounds: string; where: string }[];
  keepsOf(walks: Note[], area: string): { note: Note; later: Note[] }[];
  walkReading(walks: Note[], today: string, o?: { said?: string | null; days?: number }): { notes: string[]; last: string | null; silence: string | null; gap: string };
};
const walks = () => load(join(ROOT, 'scripts', 'walks.js')) as Walks;
const PACK = { names: ['Quillmarsh', 'Vellow Mere', 'Of'], ascii: ['Quillmarsh', 'Vellow Mere', 'Of'], regions: ['Brindlecombe'], countries: ['Ostravane'] };
const AREAS = ['walk-screen', 'memories', 'explore', 'arch'];
const note = (o: Partial<Note> = {}): Note => ({ day: '2026-11-27', area: 'walk-screen', kind: 'got in the way', words: 'the strip hid the map while I looked for the way', ...o });
const classes = (words: string) => walks().placeProblems(words, walks().nameIndex(PACK)).map((t) => t.class);
const AGENT = '\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_test';
const skill = () => read('.claude/skills/walked/SKILL.md');
/** A skill's words with its line breaks read as spaces: a phrase may wrap. */
const flat = (rel: string) => read(rel).replace(/\s+/g, ' ');
const said = () => flat('.claude/skills/walked/SKILL.md');

/** A scratch checkout for walks.js and tend.js to read (TEND_ROOT): its own features, an invented pack, git. */
function repo() {
  const root = mkdtempSync(join(tmpdir(), 'walks-'));
  for (const d of ['.claude/skills/tend', 'scripts', 'assets/gazetteer', 'docs/expectations']) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, '.claude/skills/tend/runs.jsonl'), '');
  writeFileSync(join(root, 'scripts/features.js'), `module.exports = { FEATURES: ${JSON.stringify(AREAS.map((name) => ({ name, about: `about ${name}`, journeys: [] })))} };\n`);
  writeFileSync(join(root, 'assets/gazetteer/places.json'), JSON.stringify(PACK));
  const git = (...a: string[]) => spawnSync('git', a, { cwd: root, encoding: 'utf8' }).stdout.trim();
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  git('add', '-A');
  git('commit', '-q', '-m', 'the base, by hand');
  const env = { ...process.env, TEND_ROOT: root };
  const walksJs = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'walks.js'), ...args], { cwd: root, env, encoding: 'utf8' });
  const tendJs = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'tend.js'), ...args], { cwd: root, env, encoding: 'utf8' });
  const file = (name: string, text: string) => {
    const p = join(root, name);
    writeFileSync(p, text);
    return p;
  };
  const walksText = () => readFileSync(join(root, '.claude/skills/tend/walks.jsonl'), 'utf8');
  /** A commit with its dates given, as /walked makes it. */
  const commit = (message: string, date = '2026-11-27T00:00:00+0000') => {
    git('add', '-A');
    spawnSync('git', ['commit', '-q', '-m', message], { cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } });
    return git('rev-parse', 'HEAD');
  };
  return { root, git, walksJs, tendJs, file, walksText, commit };
}

test('WN1: /walked is the owner\'s, sorts into the three kinds, each with an area or app', () => {
  const s = skill();
  assert.match(s, /^---[\s\S]*?\ndisable-model-invocation: true\n[\s\S]*?---/, 'the model never invokes it');
  assert.match(s, /^name: walked$/m);
  for (const k of ['reached for', 'got in the way', 'keep']) assert.match(s, new RegExp(k), k);
  assert.match(s, /scripts\/walks\.js areas/);
  assert.match(s, /`app`/);
  assert.match(s, /screenshot/);
  assert.deepEqual(walks().KINDS, ['reached for', 'got in the way', 'keep']);
  const r = repo();
  const areas = r.walksJs('areas');
  assert.equal(areas.status, 0, areas.stderr);
  for (const a of [...AREAS, 'app']) assert.match(areas.stdout, new RegExp(`^${a}\\b`, 'm'), a);
});

test('WN2: /walked asks once, about what is missing, with nothing an option; one kind is a whole note', () => {
  const s = said();
  assert.match(s, /once, in one round/);
  assert.match(s, /"nothing"/);
  assert.match(s, /only one kind is a whole note/);
  assert.deepEqual(walks().noteProblems(note({ kind: 'keep', words: 'the quiet replay' }), { areas: AREAS, today: '2026-11-27', names: walks().nameIndex(PACK) }), [], 'a single keep is a whole note');
});

test('WN3: /walked shows the stored words first and commits no screenshot', () => {
  const s = said();
  assert.match(s, /exactly as (it|they) will be stored/);
  assert.match(s, /never (saved|committed)[^.]*screenshot|screenshot[^.]*never (saved|committed)/);
  assert.match(s, /walks\.jsonl` alone/);
});

test('WN3b: the note is committed day-dated and not pushed; /walked publish pushes only HEAD:main', () => {
  const s = said();
  assert.match(s, /GIT_AUTHOR_DATE="<day>T00:00:00\+0000"/);
  assert.match(s, /GIT_COMMITTER_DATE="<day>T00:00:00\+0000"/);
  assert.match(s, /walked: a note of <day>/);
  assert.match(s, /\/walked publish/);
  assert.match(s, /git push origin HEAD:main/);
  assert.match(s, /--committer-date-is-author-date/);
  assert.doesNotMatch(s.split('## Publish')[0], /git push/, 'nothing is pushed before the publish step (walk-notes audit: the whole of steps 1-5)');
  assert.ok(s.split('## Publish')[0].length > 3000, 'the steps before Publish are read whole');
});

test('WN4: add appends a clean note and refuses a street, a town, coordinates or a time of day with the words that tripped it; list reads the window', () => {
  const r = repo();
  const ok = r.walksJs('add', '--file', r.file('ok.jsonl', JSON.stringify(note()) + '\n'));
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(r.walksText(), JSON.stringify(note()) + '\n');
  for (const [words, tripped] of [
    ['the strip hid Quillmarsh Street', 'Quillmarsh Street'],
    ['lost near Quillmarsh', 'Quillmarsh'],
    ['the map jumped at 47.3769, 8.5417', '47.3769'],
    ['the replay was slow at 7:30', '7:30'],
  ]) {
    const bad = r.walksJs('add', '--file', r.file('bad.jsonl', JSON.stringify(note({ words })) + '\n'));
    assert.equal(bad.status, 1, words);
    assert.ok(bad.stderr.includes(tripped), `${words}: names ${tripped}: ${bad.stderr}`);
  }
  assert.equal(r.walksText(), JSON.stringify(note()) + '\n', 'nothing refused is written');
  const today = new Date().toISOString().slice(0, 10);
  const old = '2026-01-02';
  writeFileSync(join(r.root, '.claude/skills/tend/walks.jsonl'), [note({ day: old, words: 'an old one' }), note({ day: today, words: 'a new one' })].map((n) => JSON.stringify(n)).join('\n') + '\n');
  const list = r.walksJs('list');
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, /a new one/);
  assert.doesNotMatch(list.stdout, /an old one/, 'the window is 14 days');
  // The wiring of the shipped pack, with a town picked from it here and named nowhere in the repository.
  const pack = JSON.parse(read('assets/gazetteer/places.json')) as { names: string[] };
  const town = pack.names.find((n) => /^[A-Z][a-z]{6,}$/.test(n)) as string;
  const shipped = spawnSync(process.execPath, [join(ROOT, 'scripts', 'walks.js'), 'check', '--file', r.file('t.txt', `the card was slow in ${town}`)], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, TEND_ROOT: ROOT } });
  assert.equal(shipped.status, 1, 'a town of the shipped pack trips');
  assert.match(shipped.stderr, /a town/);
});

test('WN4: the place check, pattern by pattern, on invented names', () => {
  for (const w of ['Quillmarsh Street', 'by 5th Avenue', 'Rue de Quillmarsh', 'Calle Quillmarsh', 'the Quillmarshstrasse corner']) assert.ok(classes(w).includes('a street'), w);
  for (const w of ['Quillmarsh', 'in Vellow Mere', 'the vellow Mere side']) assert.ok(classes(w).includes('a town'), w);
  for (const w of ['47.3769', '47°22', '8FVC9G8F+6X', 'lat 47', 'geo:47,8']) assert.ok(classes(w).includes('coordinates'), w);
  for (const w of ['7:30', '14h30', '7pm', 'at 6 a.m.', "nine o'clock", 'this morning', 'at dusk', 'around noon']) assert.ok(classes(w).includes('a time of day'), w);
  for (const w of ['the strip hid the map', 'the way back was slow', 'The Way back was slow', 'a busy street', 'tapped Pause twice', 'the replay of the walk', 'it took 2.5 km', 'of the page, to the line']) assert.deepEqual(classes(w), [], w);
});

test('WN4b: an area, a kind, a day, the words and a link are refused too, and a file is all or nothing', () => {
  const w = walks();
  const o = { areas: AREAS, today: '2026-11-27', names: w.nameIndex(PACK) };
  assert.deepEqual(w.noteProblems(note({ area: 'app' }), o), []);
  assert.match(w.noteProblems(note({ area: 'nowhere' }), o).join(), /area/);
  assert.match(w.noteProblems(note({ kind: 'liked' }), o).join(), /kind/);
  assert.match(w.noteProblems(note({ day: '2026-13-01' }), o).join(), /day/);
  assert.match(w.noteProblems(note({ day: '2026-11-29' }), o).join(), /day/, 'after tomorrow');
  assert.deepEqual(w.noteProblems(note({ day: '2026-11-28' }), o), [], 'tomorrow, for a time zone ahead');
  assert.match(w.noteProblems(note({ words: '' }), o).join(), /words/);
  assert.match(w.noteProblems(note({ words: 'a\nb' }), o).join(), /words/);
  assert.match(w.noteProblems(note({ words: 'x'.repeat(281) }), o).join(), /280/);
  assert.match(w.noteProblems(note({ words: 'see https://example.com/x' }), o).join(), /a link/);
  assert.match(w.noteProblems({ ...note(), extra: 1 }, o).join(), /key/);
  const r = repo();
  const mixed = r.walksJs('add', '--file', r.file('m.jsonl', [note(), note({ words: 'near Quillmarsh' })].map((n) => JSON.stringify(n)).join('\n') + '\n'));
  assert.equal(mixed.status, 1);
  assert.match(mixed.stderr, /line 2/);
  assert.throws(() => readFileSync(join(r.root, '.claude/skills/tend/walks.jsonl'), 'utf8'), 'none written');
});

test('WN4c: commits holds an agent commit to walks.jsonl to appending clean lines, the file alone, day-dated', () => {
  const r = repo();
  const base = r.git('rev-parse', 'HEAD');
  const rel = '.claude/skills/tend/walks.jsonl';
  writeFileSync(join(r.root, rel), JSON.stringify(note()) + '\n');
  r.commit(`walked: a note of 2026-11-27${AGENT}`);
  const good = r.tendJs('commits', '--loop-only', `${base}..HEAD`);
  assert.equal(good.status, 0, good.stderr);
  const carried = r.tendJs('commits', `${base}..HEAD`);
  assert.equal(carried.status, 0, `a run's check:tend leaves a carried note to the walk gate: ${carried.stderr}`);
  const one = r.git('rev-parse', 'HEAD');
  writeFileSync(join(r.root, rel), JSON.stringify(note({ words: 'the strip was fine' })) + '\n');
  r.commit(`walked: a note of 2026-11-27${AGENT}`);
  const rewrite = r.tendJs('commits', '--loop-only', `${one}..HEAD`);
  assert.equal(rewrite.status, 1, 'a line changed');
  assert.match(rewrite.stderr, /append/);
  r.git('reset', '-q', '--hard', one);
  writeFileSync(join(r.root, rel), JSON.stringify(note()) + '\n' + JSON.stringify(note({ words: 'lost near Quillmarsh' })) + '\n');
  r.commit(`walked: a note of 2026-11-27${AGENT}`);
  const leak = r.tendJs('commits', '--loop-only', `${one}..HEAD`);
  assert.equal(leak.status, 1);
  assert.match(leak.stderr, /line 2: a town/);
  assert.doesNotMatch(leak.stderr, /Quillmarsh/, 'walk-notes audit 3: CI\'s log never shows the words');
  r.git('reset', '-q', '--hard', one);
  writeFileSync(join(r.root, rel), JSON.stringify(note()) + '\n' + JSON.stringify(note({ words: 'a later thought' })) + '\n');
  writeFileSync(join(r.root, 'shot.png'), 'not a picture');
  r.commit(`walked: a note of 2026-11-27${AGENT}`);
  assert.match(r.tendJs('commits', '--loop-only', `${one}..HEAD`).stderr, /alone/, 'a picture beside it');
  r.git('reset', '-q', '--hard', one);
  writeFileSync(join(r.root, rel), JSON.stringify(note()) + '\n' + JSON.stringify(note({ words: 'a later thought' })) + '\n');
  r.commit(`walked: a note of 2026-11-27${AGENT}`, '2026-11-27T18:42:10+0100');
  assert.match(r.tendJs('commits', '--loop-only', `${one}..HEAD`).stderr, /00:00:00 \+0000/, 'a time of day in its dates');
  r.git('reset', '-q', '--hard', one);
  writeFileSync(join(r.root, rel), '');
  r.commit(`walked: a line removed${AGENT}`);
  assert.match(r.tendJs('commits', '--loop-only', `${one}..HEAD`).stderr, /owner's words/, 'a removal without the owner\'s words');
});

test('WN4d: regions, countries, postcodes, more street prefixes, a two-decimal pair, what3words and the vague times are refused', () => {
  for (const w of ['in Brindlecombe', 'across Ostravane']) assert.ok(classes(w).includes('a town'), w);
  for (const w of ['SW9 9ZZ', 'K9Z 9Z9', '9999 ZZ', '99999-9999', 'code 99999']) assert.ok(classes(w).includes('a postcode'), w);
  for (const w of ['Rua Quillmarsh', 'Carrer de Quillmarsh', 'Avinguda Quillmarsh', 'Corso Quillmarsh', 'Paseo del Quillmarsh', 'Rambla Quillmarsh', 'Boulevard Quillmarsh', 'Avenue des Quillmarsh', 'Place du Quillmarsh']) assert.ok(classes(w).includes('a street'), w);
  assert.ok(classes('at 51.51, -0.13').includes('coordinates'));
  assert.ok(classes('///quill.marsh.mere').includes('coordinates'));
  for (const w of ['after dark', 'in rush hour', 'the golden hour', 'at lunch', 'after work', 'on my commute']) assert.ok(classes(w).includes('a time of day'), w);
});

test('WN5: a reach not yet cited is put to the lens, grounded seen on a walk <day>, which the store takes', () => {
  const w = walks();
  const notes = [note({ kind: 'reached for', area: 'memories', words: 'a way to find the capture I made before' }), note({ kind: 'keep', area: 'memories' })];
  const out = w.lensNotes(notes, 'memories', '# Memories\n');
  assert.equal(out.length, 1);
  assert.equal(out[0].grounds, 'VISION "Who it is for"; seen on a walk 2026-11-27');
  const ex = load(join(ROOT, 'scripts', 'expectations.js')) as { parseDraft?(text: string): { problems: string[] } };
  const draft = `- A person who wanders a town to notice, using memories, would reasonably expect to find a capture made before.\n  Check: pending "a capture made before is found"\n  Grounds: ${out[0].grounds}\n  Serves: Return\n`;
  assert.equal(typeof ex.parseDraft, 'function', 'the store\'s parser is there to read the line');
  assert.deepEqual(ex.parseDraft!(draft).problems, [], 'the store takes the grounds as they are');
  const cited = `- E-memories-1 [proposed] A person … would reasonably expect x.\n  Check: pending "x"\n  Grounds: VISION "Who it is for"; seen on a walk 2026-11-27\n  Serves: Return\n`;
  assert.deepEqual(w.lensNotes(notes, 'memories', cited), [], 'a line cites it: not put again');
  assert.match(flat('.claude/skills/tend/walks.md'), /put to the owner first, ahead of every model-drafted line/);
  assert.match(flat('.claude/skills/tend/expectations.md'), /seen on a walk/);
});

test('WN5b · walk-notes audit 8: a reach waits at five in force, and goes first in a first draft', () => {
  const w = walks();
  const reach = [note({ kind: 'reached for', area: 'memories', words: 'a way back' })];
  const line = (n: number, status = 'ratified 2026-11-20') => `- E-memories-${n} [${status}] A person … would reasonably expect x${n}.\n  Check: pending "x"\n  Grounds: VISION "Who it is for"; not yet recorded\n  Serves: Return\n`;
  assert.equal(w.lensNotes(reach, 'memories', '')[0].where, 'first draft');
  assert.equal(w.lensNotes(reach, 'memories', line(1) + line(2, 'proposed'))[0].where, 'draft');
  assert.equal(w.lensNotes(reach, 'memories', [1, 2, 3, 4, 5].map((n) => line(n)).join(''))[0].where, 'waits');
  assert.equal(w.lensNotes(reach, 'memories', [1, 2, 3, 4].map((n) => line(n)).join('') + line(5, 'declined 2026-11-21'))[0].where, 'draft', 'a declined line is not in force');
  assert.match(flat('.claude/skills/tend/walks.md'), /waits for the owner/);
});

test('WN7: a keep is listed with the later notes of its area, and the triage files a change to it [owner]', () => {
  const w = walks();
  const keep = note({ kind: 'keep', area: 'replay', words: 'the replay\'s quiet start' });
  const later = note({ kind: 'got in the way', area: 'replay', words: 'the start is too slow now', day: '2026-11-30' });
  const other = note({ kind: 'keep', area: 'memories', day: '2026-11-28' });
  const ks = w.keepsOf([keep, other, later], 'replay');
  assert.equal(ks.length, 1);
  assert.deepEqual(ks[0].note, keep);
  assert.deepEqual(ks[0].later, [later], 'a later note of the area, for the lens to read');
  const md = flat('.claude/skills/tend/walks.md');
  assert.match(md, /\[owner\]/);
  assert.match(md, /against the keep of <day> \(<area>\)/);
});

test('WN9: the skills map names /walked, and records audit 14\'s lists need no row for it', () => {
  const map = flat('.claude/skills/README.md');
  assert.match(map, /\| `\/walked` \| the owner only \|/);
  assert.match(map, /walks\.jsonl/);
  assert.doesNotMatch(skill(), /\b(STATUS|DEFERRED|NATIVE_UNVERIFIED)\.md/, 'it names no record document, so records audit 14 lists it neither as writer nor reader');
  const tendSkill = read('.claude/skills/tend/SKILL.md');
  assert.match(tendSkill, /walks\.md/);
  assert.ok(tendSkill.split('\n').length <= 500);
});

test('walk-notes audit 1: the confirmation says when the note is published, that GitHub shows the push, and that it is lost with the session', () => {
  const s = said();
  assert.match(s, /GitHub shows when/);
  assert.match(s, /lost if (this|the) session ends/);
  assert.match(s, /next `\/tend` run/);
});

test('walk-notes audit 2: a finding against a keep is the owner\'s alone, never the proxy\'s', () => {
  assert.match(flat('.claude/skills/tend-orchestrator/SKILL.md'), /against the keep of/);
  assert.match(flat('.claude/skills/README.md'), /a finding against a keep of the owner's walk notes/);
  assert.match(flat('.claude/skills/tend/walks.md'), /never the proxy/);
});

test('walk-notes audit 3: the gate runs before the note leaves the session, and a refusal there never echoes the words', () => {
  assert.match(said(), /node scripts\/tend\.js commits --loop-only origin\/main\.\.HEAD/);
  const w = walks();
  const p = w.commitProblems({
    subject: 'walked: a note of 2026-11-27',
    message: `walked: a note of 2026-11-27${AGENT}`,
    files: [{ status: 'A', path: w.WALKS_REL }],
    before: '',
    after: JSON.stringify(note({ words: 'lost near Quillmarsh at 7:30' })) + '\n',
    authorDate: '2026-11-27 00:00:00 +0000',
    committerDate: '2026-11-27 00:00:00 +0000',
    names: w.nameIndex(PACK),
    areas: AREAS,
  });
  assert.ok(p.length >= 2);
  assert.ok(p.some((x) => /line 1: a town/.test(x)));
  for (const x of p) assert.doesNotMatch(x, /Quillmarsh|7:30/, 'no words in a refusal CI prints');
});

test('walk-notes audit 4: the commit\'s subject and its dates are held by the gate', () => {
  const w = walks();
  const c = {
    subject: 'walked: a note of 2026-11-27',
    message: `walked: a note of 2026-11-27${AGENT}`,
    files: [{ status: 'A', path: w.WALKS_REL }],
    before: '',
    after: JSON.stringify(note()) + '\n',
    authorDate: '2026-11-27 00:00:00 +0000',
    committerDate: '2026-11-27 00:00:00 +0000',
    names: w.nameIndex(PACK),
    areas: AREAS,
  };
  assert.deepEqual(w.commitProblems(c), []);
  assert.match(w.commitProblems({ ...c, committerDate: '2026-11-27 21:04:00 +0000' }).join(), /00:00:00 \+0000/);
  assert.match(w.commitProblems({ ...c, subject: 'walked: a busy street at last' }).join(), /subject/);
  assert.match(w.commitProblems({ ...c, subject: 'walked: a note of 2026-11-26' }).join(), /day/, 'the subject\'s day is the note\'s');
  assert.match(w.commitProblems({ ...c, files: [...c.files, { status: 'A', path: 'shot.png' }] }).join(), /alone/);
  assert.match(w.commitProblems({ ...c, files: [{ status: 'D', path: w.WALKS_REL }] }).join(), /delete/);
  const removal = { ...c, subject: "walked: a line removed at the owner's word", before: c.after + JSON.stringify(note({ words: 'two' })) + '\n', after: c.after, authorDate: '2026-11-28 10:00:00 +0000', committerDate: '2026-11-28 10:00:00 +0000' };
  assert.match(w.commitProblems(removal).join(), /owner's words/);
  assert.deepEqual(w.commitProblems({ ...removal, message: `${removal.subject}\n\nThe owner: "remove the second line of the 27th"${AGENT}` }), [], 'decision 0270, S2');
  assert.match(w.commitProblems({ ...removal, before: c.after + 'x\ny\n', message: `${removal.subject}\n\nThe owner: "remove them"${AGENT}` }).join(), /one line/);
});

test('walk-notes audit 5: /walked pushes only HEAD:main, and never a session branch named from the words', () => {
  const s = said();
  assert.match(s, /only `HEAD:main`/);
  assert.match(s, /session branch/);
  assert.doesNotMatch(s, /git push (?!origin HEAD:main)/, 'no other push');
});

test('walk-notes audit 6 and 7: the silence is said once per gap, from the landing with no note, and the notes are listed with no count', () => {
  const w = walks();
  const day = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  assert.equal(w.walkReading([], day(w.LANDED, 13)).silence, null, 'no note, under 14 days since the landing');
  const none = w.walkReading([], day(w.LANDED, 14));
  assert.match(String(none.silence), new RegExp(w.LANDED));
  assert.equal(none.gap, w.LANDED);
  assert.equal(w.walkReading([], day(w.LANDED, 20), { said: w.LANDED }).silence, null, 'said once for the gap');
  const notes = [note({ day: '2026-12-01' }), note({ day: '2026-12-02', kind: 'keep', area: 'app' })];
  const r = w.walkReading(notes, '2026-12-05');
  assert.deepEqual(r.notes, ['2026-12-01 walk-screen got in the way', '2026-12-02 app keep'], 'day, area and kind; never the words');
  assert.equal(r.silence, null);
  assert.equal(r.last, '2026-12-02');
  assert.match(String(w.walkReading(notes, '2026-12-16', { said: w.LANDED }).silence), /2026-12-02/, 'a new gap is said again');
  assert.equal(w.walkReading(notes, '2026-12-17', { said: '2026-12-02' }).silence, null);
  assert.deepEqual(Object.keys(r).sort(), ['gap', 'last', 'notes', 'silence'], 'nothing but these');
  assert.ok(r.notes.every((x) => typeof x === 'string'), 'the notes are words, never a count by kind (decision 0020)');
  assert.ok(!Object.values(r).some((v) => typeof v === 'number'), 'no number');
});

test('walk-notes audit 9: a park, a station or a landmark is left to the skill, which says so, and a lowercase name too', () => {
  const s = said();
  assert.match(s, /park/);
  assert.match(s, /station/);
  assert.match(s, /landmark/);
  assert.match(s, /lowercase/);
  assert.match(walks().noteProblems(note({ words: 'lost near Quillmarsh' }), { areas: AREAS, today: '2026-11-27', names: walks().nameIndex(PACK) }).join(), /or rephrase/);
  assert.deepEqual(classes('lost near quillmarsh'), [], 'the town check reads names as written (J1)');
});

test('walk-notes audit 10: what a run files citing a note names its day, area and kind, and is checked for places', () => {
  const r = repo();
  const clean = r.walksJs('check', '--file', r.file('c.md', '- **T99 [owner] against the keep of 2026-11-27 (replay)**'));
  assert.equal(clean.status, 0, clean.stderr);
  const leak = r.walksJs('check', '--file', r.file('l.md', 'seen on a walk near Quillmarsh'));
  assert.equal(leak.status, 1);
  assert.match(flat('.claude/skills/tend/walks.md'), /never (its|the note's) words/);
  assert.match(flat('.claude/skills/tend/walks.md'), /walks\.js check --file/);
});

test('walk-notes audit 11: the owner\'s words are kept, each stripped span bracketed', () => {
  assert.match(said(), /verbatim/);
  assert.match(said(), /\[a busy street\]/);
  assert.deepEqual(classes('the strip hid [a busy street] while I looked'), []);
});

test('walk-notes audit 13: the notes and the test that holds their gate are in FORBIDDEN by name', () => {
  const tend = load(join(ROOT, 'scripts', 'tend.js')) as { FORBIDDEN: RegExp[]; isProcess(p: string): boolean };
  for (const p of ['.claude/skills/tend/walks.jsonl', 'src/lib/__tests__/arch/walks.test.ts']) {
    assert.ok(tend.FORBIDDEN.some((re) => re.test(p) && /walks/.test(re.source)), `${p} has its own line`);
  }
  assert.equal(tend.isProcess('.claude/skills/tend/walks.jsonl'), false, 'a note needs no lease (J6)');
  assert.equal(tend.isProcess('.claude/skills/walked/SKILL.md'), true);
});

// The diff review (the auditor, Nov 26; G8's own review, outside the budget, 0269): walk-notes audit 14-27.

const PACK_ALTS = { ...PACK, alts: [['Quillmarshia', 'Market', 'Walk'], [], []] };
const altClasses = (words: string) => walks().placeProblems(words, walks().nameIndex(PACK_ALTS)).map((t) => t.class);

test('walk-notes audit 14: the pack\'s other names trip too, but for the app\'s own words', { todo: 'test first' }, () => {
  assert.ok(altClasses('the map was slow near Quillmarshia').includes('a town'));
  assert.deepEqual(altClasses('Market was busy, Walk was slow'), [], 'an other name that is a word of the app\'s own pages is left out');
  const w = walks() as Walks & { ALT_COMMON: Set<string> | string[] };
  for (const word of ['walk', 'fog', 'market', 'town', 'loop']) assert.ok([...w.ALT_COMMON].includes(word), word);
  const pack = JSON.parse(read('assets/gazetteer/places.json')) as { names: string[]; ascii: string[]; alts: string[][] };
  const named = new Set([...pack.names, ...pack.ascii].map((n) => w.fold(n)));
  const alt = pack.alts.flat().find((a) => /^[A-Z][a-z]{7,}$/.test(a) && !named.has(w.fold(a)) && ![...w.ALT_COMMON].includes(w.fold(a))) as string;
  const r = repo();
  const shipped = spawnSync(process.execPath, [join(ROOT, 'scripts', 'walks.js'), 'check', '--file', r.file('alt.txt', `the card was slow near ${alt}`)], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, TEND_ROOT: ROOT } });
  assert.equal(shipped.status, 1, 'an other name of the shipped pack, picked here and named nowhere');
});

test('walk-notes audit 15: a possessive name trips', { todo: 'test first' }, () => {
  for (const w of ["slow in Quillmarsh's centre", 'slow in Quillmarsh’s centre', "Vellow Mere's edge"]) assert.ok(classes(w).includes('a town'), w);
});

test('walk-notes audit 16: the times of day the review found, NFKC first', { todo: 'test first' }, () => {
  for (const w of ['left at 7.30', 'left at 1930', 'left at 19h', '19.30', 'half past six', 'seven thirty', 'quarter to eight', 'left at 7 and the map was slow', 'left at six', 'around 6ish', 'at T19:30', 'left at １９:３０', '7 a m', 'before breakfast', 'after school', 'on the way home from work', 'at teatime', '19 h 30', 'T1930']) {
    assert.ok(classes(w).includes('a time of day'), w);
  }
  for (const w of ['it took 2.5 km', 'the 12.50 km loop', 'at one point the strip hid', 'two thirds of the map', 'at 7 km the card', 'the 5 minutes it took']) assert.ok(!classes(w).includes('a time of day'), w);
  assert.ok(classes('near Quill​marsh').includes('a town'), 'a zero-width space inside a name');
});

test('walk-notes audit 17: a walked: commit is held by the gate whatever its trailers', { todo: 'test first' }, () => {
  const r = repo();
  const base = r.git('rev-parse', 'HEAD');
  writeFileSync(join(r.root, '.claude/skills/tend/walks.jsonl'), JSON.stringify(note({ words: 'lost near Quillmarsh at 7:30' })) + '\n');
  r.commit('walked: a note of 2026-11-27', '2026-11-27T19:31:00+0100');
  for (const mode of [['--loop-only'], []]) {
    const out = r.tendJs('commits', ...mode, `${base}..HEAD`);
    assert.equal(out.status, 1, mode.join() || 'full');
    assert.match(out.stderr, /a town/);
  }
  const s = read('.claude/skills/walked/SKILL.md');
  assert.match(s, /^Co-Authored-By: Claude <noreply@anthropic\.com>$/m, 'the skill writes the trailers literally');
  assert.match(s, /^Claude-Session: /m);
});

test('walk-notes audit 18: a run carries a note only as its first commits, named on its run-log line; a keep or a got-in-the-way is never removed', { todo: 'test first' }, () => {
  const rel = '.claude/skills/tend/walks.jsonl';
  const runLine = (carried?: string[]) => JSON.stringify({ mode: 'inbox', deploy: 'main', base: 'abc1234', answerLog: '0235', answers: [], ...(carried ? { carried } : {}) }) + '\n';
  // A note authored inside a run: after its first tend commit.
  let r = repo();
  let base = r.git('rev-parse', 'HEAD');
  writeFileSync(join(r.root, '.claude/skills/tend/runs.jsonl'), runLine(['2026-11-27']));
  r.commit(`tend replay: the run's record${AGENT}`);
  writeFileSync(join(r.root, rel), JSON.stringify(note({ area: 'memories', kind: 'got in the way', words: 'the strip' })) + '\n');
  r.commit(`walked: a note of 2026-11-27${AGENT}`);
  let out = r.tendJs('commits', '--loop-only', `${base}..HEAD`);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /carried/);
  // Carried first, but no run-log line names it.
  r = repo();
  base = r.git('rev-parse', 'HEAD');
  writeFileSync(join(r.root, rel), JSON.stringify(note()) + '\n');
  r.commit(`walked: a note of 2026-11-27${AGENT}`);
  writeFileSync(join(r.root, '.claude/skills/tend/runs.jsonl'), runLine());
  r.commit(`tend replay: the run's record${AGENT}`);
  out = r.tendJs('commits', '--loop-only', `${base}..HEAD`);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /carried/);
  // Carried first and named: taken.
  r = repo();
  base = r.git('rev-parse', 'HEAD');
  writeFileSync(join(r.root, rel), JSON.stringify(note()) + '\n');
  r.commit(`walked: a note of 2026-11-27${AGENT}`);
  writeFileSync(join(r.root, '.claude/skills/tend/runs.jsonl'), runLine(['2026-11-27']));
  r.commit(`tend replay: the run's record${AGENT}`);
  out = r.tendJs('commits', '--loop-only', `${base}..HEAD`);
  assert.equal(out.status, 0, out.stderr);
  // A removal of a keep or a got-in-the-way is refused, and a removal names its line.
  const w = walks();
  const two = JSON.stringify(note({ kind: 'keep', words: 'the quiet start' })) + '\n' + JSON.stringify(note({ kind: 'reached for', words: 'a way back' })) + '\n';
  const c = { message: '', files: [{ status: 'M', path: w.WALKS_REL }], before: two, authorDate: '2026-11-28 10:00:00 +0000', committerDate: '2026-11-28 10:00:00 +0000', names: w.nameIndex(PACK), areas: AREAS };
  const owner = '\n\nThe owner: "remove it"';
  assert.match(w.commitProblems({ ...c, subject: "walked: line 1 removed at the owner's word", message: `walked: line 1 removed at the owner's word${owner}`, after: two.split('\n')[1] + '\n' }).join(), /keep/);
  assert.deepEqual(w.commitProblems({ ...c, subject: "walked: line 2 removed at the owner's word", message: `walked: line 2 removed at the owner's word${owner}`, after: two.split('\n')[0] + '\n' }), []);
  assert.match(w.commitProblems({ ...c, subject: "walked: line 1 removed at the owner's word", message: `walked: line 1 removed at the owner's word${owner}`, after: two.split('\n')[0] + '\n' }).join(), /line 2/, 'the subject names the line it removes');
  assert.match(read('docs/decisions/0270-a-walk-note-waits-to-be-published.md'), /not machine-checked/);
});

test('walk-notes audit 20: the full mode skips only a commit whose one file is walks.jsonl', { todo: 'test first' }, () => {
  const r = repo();
  const base = r.git('rev-parse', 'HEAD');
  writeFileSync(join(r.root, '.claude/skills/tend/walks.jsonl'), JSON.stringify(note()) + '\n');
  writeFileSync(join(r.root, 'scripts/tend2.js'), '// not a note\n');
  r.commit('walked: a note of 2026-11-27');
  const out = r.tendJs('commits', `${base}..HEAD`);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /alone/);
});

test('walk-notes audit 21: more street forms', { todo: 'test first' }, () => {
  for (const w of ['Quai Quillmarsh', 'on the Quai de Quillmarsh', 'Quillmarsh Straße', 'Quillmarsh Strasse', 'Quillmarsh-Straße', 'Quillmarsh Platz', 'Quillmarsh Laan', 'Quillmarsh Steig', 'stuck on Quillmarsh Str. again', 'stuck on Av. Quillmarsh', 'stuck on Avda. Quillmarsh', 'stuck on via Quillmarsh', 'stuck in calle de Quillmarsh', 'rue de Quillmarsh', 'stuck on strada Quillmarsh', 'ulica Quillmarsh', 'Quillmarshvej', 'Quillmarshgata', 'Quillmarshbrücke', 'Quillmarshring', 'Quillmarshdamm', 'Quillmarsh Walk', 'Quillmarsh Gardens', 'Quillmarsh Hill', 'Quillmarsh Market', 'Quillmarsh Bridge', 'Quillmarsh rd.', 'outside 12 quillmarsh street', '12 vellow lane']) {
    assert.ok(classes(w).includes('a street'), w);
  }
  for (const w of ['Start Walk was slow', 'Exploring the strip', 'Spring came', 'the walk was long', 'End Walk hid the map']) assert.ok(!classes(w).includes('a street'), w);
});

test('walk-notes audit 22: more postcodes and coordinate forms', { todo: 'test first' }, () => {
  for (const w of ['near sw9 9zz', 'near 99-950', 'near 9999-999', 'near 999-9999', 'near 999 99', 'near D99 X999']) assert.ok(classes(w).includes('a postcode'), w);
  for (const w of ['at 47,3769 8,5417', 'at 47,3769', '47.37 8.54', '47 degrees 22 minutes north', '47.37°N']) assert.ok(classes(w).includes('coordinates'), w);
  for (const w of ['it took 1,200 steps', 'a 12-15 minute walk', 'in 2026-11']) assert.deepEqual(classes(w), [], w);
});

test('walk-notes audit 23: a merge that changes walks.jsonl is refused', { todo: 'test first' }, () => {
  const r = repo();
  const base = r.git('rev-parse', 'HEAD');
  r.git('checkout', '-q', '-b', 'side');
  writeFileSync(join(r.root, 'z.txt'), 'z');
  r.commit(`tend replay: side${AGENT}`);
  r.git('checkout', '-q', '-');
  writeFileSync(join(r.root, '.claude/skills/tend/walks.jsonl'), JSON.stringify(note()) + '\n');
  r.commit(`walked: a note of 2026-11-27${AGENT}`);
  spawnSync('git', ['merge', '-q', '--no-ff', '--no-commit', 'side'], { cwd: r.root });
  writeFileSync(join(r.root, '.claude/skills/tend/walks.jsonl'), JSON.stringify(note()) + '\n' + JSON.stringify(note({ words: 'lost near Quillmarsh' })) + '\n');
  r.commit(`Merge side${AGENT}`);
  const out = r.tendJs('commits', '--loop-only', `${base}..HEAD`);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /merge/);
});

test('walk-notes audit 25: a refusal in the gate prints classes, never values', { todo: 'test first' }, () => {
  const w = walks();
  const c = { subject: 'walked: a note of 2026-11-27', message: `walked: a note of 2026-11-27${AGENT}`, files: [{ status: 'A', path: w.WALKS_REL }], before: '', authorDate: '2026-11-27 00:00:00 +0000', committerDate: '2026-11-27 00:00:00 +0000', names: w.nameIndex(PACK), areas: AREAS };
  for (const line of ['{"day":"2026-11-27","area":{"x":"Quillmarsh"},"kind":["Vellow Mere"],"words":"fine"}', '{"day":"2026-11-27","area":"x\\" near Quillmarsh","kind":"keep","words":"fine"}', '{"day":"2026-11-27","area":"walk-screen","kind":"Quillmarsh","words":"fine"}']) {
    const p = w.commitProblems({ ...c, after: line + '\n' });
    assert.ok(p.length, line);
    for (const x of p) {
      assert.doesNotMatch(x, /Quillmarsh|Vellow/, x);
      assert.doesNotMatch(x, /,,|none of,/, x);
    }
  }
});

test('walk-notes audit 26: ship.md\'s rebase keeps a carried note\'s dates', { todo: 'test first' }, () => {
  const ship = flat('.claude/skills/ship.md');
  const step2 = ship.slice(ship.indexOf('## Publish to main'), ship.indexOf('3. `main` is checked out elsewhere'));
  assert.match(step2, /--committer-date-is-author-date/);
});

test('walk-notes audit 27: the gate reads the pack at the push\'s base', { todo: 'test first' }, () => {
  const r = repo();
  const base = r.git('rev-parse', 'HEAD');
  writeFileSync(join(r.root, 'assets/gazetteer/places.json'), JSON.stringify({ names: [], ascii: [], regions: [], countries: [] }));
  r.commit('the pack, emptied by hand');
  writeFileSync(join(r.root, '.claude/skills/tend/walks.jsonl'), JSON.stringify(note({ words: 'lost near Quillmarsh' })) + '\n');
  r.commit(`walked: a note of 2026-11-27${AGENT}`);
  const out = r.tendJs('commits', '--loop-only', `${base}..HEAD`);
  assert.equal(out.status, 1, 'the base\'s pack still names it');
  assert.match(out.stderr, /a town/);
});
