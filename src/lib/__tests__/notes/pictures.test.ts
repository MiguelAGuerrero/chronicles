/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { emptyEdit, rotateBy } from '../../mediaEdit';
import { NOTE_CSP } from '../../notePage/csp';
import { createPictureStore } from '../../notePage/pictureStore';
import { pictureKey, pictureKind, picturesWanted, pictureSpoken, showsContext } from '../../notePage/pictures';
import { toBody, toDoc } from '../../notePage/schema';

// Note pictures NI1-NI18 (specs/note-pictures): a mention of a photo or a video is drawn as its picture.

const T = (d: number, h = 11, m = 46) => new Date(2026, 10, d, h, m).getTime();

test('NI1: a photo is drawn as a picture', () => {
  assert.equal(pictureKind('photo'), 'photo');
});

test('NI3: a video is drawn as its still, as a video', () => {
  assert.equal(pictureKind('video'), 'video');
});

test('NI9: a note, a voice memo and a text moment are not pictures', () => {
  assert.equal(pictureKind('text'), null);
  assert.equal(pictureKind('voice'), null);
});

test('NI9: a photo with no file keeps its card, never a broken picture', () => {
  const views = new Map([['a', { kind: 'photo' as const, hasMedia: false }], ['b', { kind: 'text' as const, hasMedia: true }]]);
  assert.deepEqual(picturesWanted(['a', 'b'], views, new Set(), true).map((w) => w.how), ['card', 'card']);
});

test('NI6: a page with a picture is stored as the same mention token, unchanged', () => {
  const body = 'Then @[ph_1|A photo] by the door.';
  assert.equal(toBody(toDoc(body, 'md')), body);
});

test('NI7: the page may load nothing: no network, no image from a URL', () => {
  assert.match(NOTE_CSP, /connect-src 'none'/);
  assert.match(NOTE_CSP, /img-src data: blob:(;|$)/);
  assert.doesNotMatch(NOTE_CSP, /https?:/);
  assert.match(NOTE_CSP, /frame-src 'none'/);
});

test('NI8: a moment gone or waiting in Undo is gone, not a picture; none is called gone while loading', () => {
  const views = new Map([['a', { kind: 'photo' as const, hasMedia: true }], ['b', { kind: 'photo' as const, hasMedia: true }]]);
  assert.deepEqual(picturesWanted(['a', 'b', 'zz'], views, new Set(['b']), true).map((w) => w.how), ['picture', 'gone', 'gone']);
  assert.deepEqual(picturesWanted(['a', 'b'], views, new Set(), false).map((w) => w.how), ['wait', 'wait']);
});

test('NI10: the spoken name is the kind, then the card\'s line; the camera\'s own words are not said twice', () => {
  const line = 'Nov 16, near the bridge, on your walk';
  assert.equal(pictureSpoken('photo', 'A photo', line), `Photo. ${line}`);
  assert.equal(pictureSpoken('video', 'A video', line), `Video. ${line}`);
  assert.equal(pictureSpoken('photo', 'The blue door', line), `Photo: The blue door. ${line}`);
  assert.equal(pictureSpoken('photo', null, line), `Photo. ${line}`);
});

test('NI15: a picture changes with its edit and is otherwise the same (the key NI11 holds it by)', () => {
  const e = emptyEdit();
  assert.equal(pictureKey({ piece_id: 'p', edit: e }), pictureKey({ piece_id: 'p', edit: emptyEdit() }));
  assert.notEqual(pictureKey({ piece_id: 'p', edit: e }), pictureKey({ piece_id: 'p', edit: { ...e, rotate: rotateBy(0) } }));
  assert.notEqual(pictureKey({ piece_id: 'p', edit: null }), pictureKey({ piece_id: 'p', edit: { ...e, filter: 'mono' as never } }));
  assert.notEqual(pictureKey({ piece_id: 'p' }), pictureKey({ piece_id: 'q' }));
});

test('NI11: each picture is made once per photo and edit, not once per ask', async () => {
  let made = 0;
  const store = createPictureStore(async (c) => { made++; return `data:image/jpeg;base64,${c.piece_id}`; });
  const c = { piece_id: 'p', edit: null };
  const [a, b] = await Promise.all([store.ask(c, undefined), store.ask(c, undefined)]);
  await store.ask(c, undefined);
  assert.equal(made, 1);
  assert.equal(a, b);
  assert.equal(store.peek(c), a);
  await store.ask({ piece_id: 'p', edit: { ...emptyEdit(), rotate: 90 } }, undefined);
  assert.equal(made, 2);
});

test('NI11: a picture that cannot be made is remembered as none, not tried on every keystroke', async () => {
  let made = 0;
  const store = createPictureStore(async () => { made++; return null; });
  const c = { piece_id: 'p', edit: null };
  await store.ask(c, undefined);
  await store.ask(c, undefined);
  assert.equal(made, 1);
  assert.equal(store.peek(c), null);
});

test('NI16: a line says where a photo is from only when it is from another day or another walk', () => {
  const page = { t: T(16), walkId: 'w1' };
  assert.equal(showsContext({ t: T(16, 11, 30), walkId: 'w1' }, page), false);
  assert.equal(showsContext({ t: T(16, 9, 0), walkId: 'w2' }, page), true);
  assert.equal(showsContext({ t: T(10), walkId: 'w1' }, page), true);
  assert.equal(showsContext({ t: T(16, 10, 0), walkId: null }, { t: T(16), walkId: null }), false);
  assert.equal(showsContext({ t: T(16, 10, 0), walkId: null }, page), true);
});

test('NI17: every mentioned photo and video is drawn, in the order written; none is hidden or collapsed', () => {
  const ids = Array.from({ length: 12 }, (_, i) => `m${i}`);
  const views = new Map(ids.map((id, i) => [id, { kind: (i % 2 ? 'video' : 'photo') as 'photo' | 'video', hasMedia: true }]));
  const w = picturesWanted(ids, views, new Set(), true);
  assert.deepEqual(w.map((x) => x.id), ids);
  assert.ok(w.every((x) => x.how === 'picture'));
  assert.deepEqual(w.map((x) => x.kind), ids.map((_, i) => (i % 2 ? 'video' : 'photo')));
});

test('NI18: the owner\'s Nov 16 call is on record, and what stays out of a page is said', () => {
  const deferred = readFileSync('docs/DEFERRED.md', 'utf8');
  const line = deferred.split('\n').find((l) => /photos inline/i.test(l)) ?? '';
  assert.match(line, /mention/i, 'the DEFERRED line says a mention drawn as its picture is allowed');
  const records = readdirSync('docs/decisions').filter((f) => /^\d{4}-.*picture/i.test(f));
  assert.ok(records.length >= 1 && records.every((f) => existsSync(`docs/decisions/${f}`)), 'a decision record on note pictures');
});
