import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDeleteRunner } from '../../deletion/runner';
import { type Faced, facedOf, momentOf } from '../../moment';
import { editRefs, fromEditor, GONE, insertRef, mentioning, parseRefs, plainNote, plainRefs, refIds, refToken, toEditor, typedAt } from '../../refs';
import { fakePorts } from '../fakes';

// Moment references (specs/moment-references, decision 0125): a note mentions other moments with @.

const note = (id: string, body: string, t = 1): Faced => facedOf({ id, walk_id: null, t, lat: 41.8, lon: -71.4, kind: 'text', file_path: null, body, segment_id: null });
const words = (known: Record<string, string>) => (id: string) => known[id] ?? null;

test('RF2: a reference is a token in the note\'s body, and nothing else is written', async () => {
  const p = fakePorts();
  await p.db.addMoment(momentOf(note('pier', 'Someone said I looked strong at the pier.')));
  const before = await p.db.getMomentsByIds(['pier']);
  const body = `Again today ${refToken('pier')}, same spot.`;
  await p.db.addMoment(momentOf(note('again', body, 2)));
  assert.deepEqual(refIds(body), ['pier']);
  assert.deepEqual(parseRefs(body), [{ text: 'Again today ' }, { ref: 'pier', label: null }, { text: ', same spot.' }]);
  assert.deepEqual(parseRefs(refToken('pier', 'Pier, Sep 11')), [{ ref: 'pier', label: 'Pier, Sep 11' }], 'with the words it was written with');
  assert.equal(refToken('x', 'a ] b | c'), '@[x|a   b   c]', 'never a bracket or bar inside');
  const t = await p.db.listThreads();
  assert.deepEqual([t.threads.length, t.members.length, t.links.length], [0, 0, 0], 'no thread, membership or link');
  assert.deepEqual(await p.db.getMomentsByIds(['pier']), before, 'the referenced moment is untouched');
  assert.equal((await p.db.getMomentsByIds(['again']))[0].pieces[0].body, body, 'the token is the note\'s own text');
});

test('RF3: the editor shows a reference as words, removes it whole, and saving keeps every one the text still holds', () => {
  const w = words({ pier: 'Pier, Sep 11', bakery: 'Bakery, Aug 2' });
  const body = `Again ${refToken('pier', 'Pier, Sep 11')} and ${refToken('bakery', 'Bakery, Aug 2')}.`;
  const ed = toEditor(body, w);
  assert.equal(ed.text, 'Again @Pier, Sep 11 and @Bakery, Aug 2.', 'the same words as plain text, after an @');
  assert.equal(fromEditor(ed.text, ed.refs), body, 'opened and saved unchanged, the body is the same');
  // Words typed around it never break it.
  const typed = editRefs(ed.text, `Today: ${ed.text}`, ed.refs);
  assert.equal(fromEditor(typed.text, typed.refs), `Today: ${body}`);
  const after = editRefs(ed.text, ed.text.replace(' and ', ' and also '), ed.refs);
  assert.equal(fromEditor(after.text, after.refs), `Again ${refToken('pier', 'Pier, Sep 11')} and also ${refToken('bakery', 'Bakery, Aug 2')}.`);
  // One backspace at its end takes the whole reference.
  const end = ed.refs[0].end;
  const back = editRefs(ed.text, ed.text.slice(0, end - 1) + ed.text.slice(end), ed.refs);
  assert.equal(back.text, 'Again  and @Bakery, Aug 2.');
  assert.equal(fromEditor(back.text, back.refs), `Again  and ${refToken('bakery', 'Bakery, Aug 2')}.`);
  // Typing inside it takes it too: a reference never survives half typed over.
  const inside = editRefs(ed.text, ed.text.replace('Pier,', 'Pierx,'), ed.refs);
  assert.deepEqual(inside.refs.map((r) => r.id), ['bakery']);
  assert.ok(!inside.text.includes('Pier'));
  // An @ typed, then a pick, puts the reference at that point; dismissing leaves the @ as typed.
  const at = typedAt('Hi ', 'Hi @');
  assert.equal(at, 3);
  const picked = insertRef('Hi @', at!, [], 'pier', 'Pier, Sep 11');
  assert.equal(picked.text, 'Hi @Pier, Sep 11 ');
  assert.equal(fromEditor(picked.text, picked.refs), `Hi ${refToken('pier', 'Pier, Sep 11')} `);
  assert.equal(typedAt('Hi', 'Hi!'), null);
});

test('RF5: a reference to a moment no longer kept reads so and opens nothing; the text around it is unchanged', () => {
  const body = `Before ${refToken('gone')} after`;
  assert.equal(plainRefs(body, words({})), `Before ${GONE} after`);
  assert.equal(GONE, 'a moment no longer kept');
  assert.deepEqual(parseRefs(body).filter((p) => 'text' in p), [{ text: 'Before ' }, { text: ' after' }]);
});

test('RF6: plain text reads every reference as words, never a raw token, for a placeless and a deleted moment too', () => {
  const body = `${refToken('pier')} then ${refToken('home')} then ${refToken('gone')}`;
  const plain = plainRefs(body, words({ pier: 'Pier, Sep 11 · 40 minutes in', home: 'Oct 2 · not on a walk' }));
  assert.equal(plain, `Pier, Sep 11 · 40 minutes in then Oct 2 · not on a walk then ${GONE}`);
  assert.ok(!/@\[/.test(plain));
  // A reader with no lookup (rows, Lately, a reminder, the replay) says the words it was written with.
  assert.equal(plainNote(`See ${refToken('pier', 'Pier, Sep 11')} and ${refToken('old')}`), `See Pier, Sep 11 and ${GONE}`);
  assert.equal(plainNote(null), null);
});

test('RF7: what mentions a moment is read from notes, ordered by date, never by count', () => {
  const notes = [
    { id: 'b', t: 30, body: `${refToken('m')} ${refToken('m')} ${refToken('m')}` },
    { id: 'a', t: 10, body: `once ${refToken('m')}` },
    { id: 'c', t: 20, body: 'no mention' },
    { id: 'm', t: 5, body: `myself ${refToken('m')}` },
  ];
  assert.deepEqual(mentioning(notes, 'm').map((n) => n.id), ['a', 'b'], 'oldest first, each once, never itself');
});

test('RF8: deleting a referenced moment never edits the note; deleting the note takes its references', async () => {
  const p = fakePorts();
  const run = createDeleteRunner({ db: p.db, removeMedia: async () => 0, forgetRecalls: () => {} });
  const body = `See ${refToken('pier')}`;
  await p.db.addMoment(momentOf(note('pier', 'the pier')));
  await p.db.addMoment(momentOf(note('n', body, 2)));
  await run({ type: 'moment', captureId: 'pier' });
  assert.equal((await p.db.getMomentsByIds(['n']))[0].pieces[0].body, body, 'the note keeps its text');
  await run({ type: 'moment', captureId: 'n' });
  const left = await p.db.getMomentsByIds(['n', 'pier']);
  assert.equal(left.length, 0);
  assert.deepEqual(mentioning(left.map((m) => ({ id: m.id, t: m.t, body: m.pieces[0].body })), 'pier'), [], 'nothing mentions it any more');
});
