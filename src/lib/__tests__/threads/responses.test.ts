import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { facedOf, type Faced } from '../../moment';
import { fromLine, poolWithOpenWalks, toMomentViews } from '../../resurface/views';
import { responsesWord, sizeWord } from '../../threads/lines';
import { responseRows, responsesOf } from '../../threads/responses';
import { visibleThreads } from '../../threads/rules';
import type { Link } from '../../threads/types';
import type { Walk } from '../../types';

// Response thread (specs/response-thread, decision 0128): a moment's responses in a sheet over the viewer.

const link = (from_id: string, to_id: string, created_at = 1): Link => ({ from_id, to_id, created_at });
const m = (id: string, t: number) => ({ id, t });
const byId = (...ms: { id: string; t: number }[]) => new Map(ms.map((x) => [x.id, x]));

test('RT1: a moment answered, directly or through a response, has responses; one never answered has none', () => {
  const links = [link('r1', 'm'), link('r2', 'r1'), link('x', 'other')];
  assert.deepEqual(responsesOf('m', links).sort(), ['r1', 'r2']);
  assert.deepEqual(responsesOf('r1', links), ['r2'], 'a response has its own responses');
  assert.deepEqual(responsesOf('lonely', links), []);
  assert.deepEqual(responsesOf('m', [link('m', 'm')]), [], 'a moment never answers itself');
  assert.deepEqual(responsesOf('a', [link('b', 'a'), link('a', 'b')]), ['b'], 'a cycle ends');
});

test('RT4: the moment first, then every response oldest first; a response to a response says which it answers', () => {
  const root = m('m', 1);
  const rows = responseRows(root, byId(root, m('r1', 5), m('r2', 9), m('r3', 7)), [link('r1', 'm'), link('r2', 'r1'), link('r3', 'm')]);
  assert.deepEqual(rows.map((r) => r.moment.id), ['m', 'r1', 'r3', 'r2'], 'by time, a response to a response among the others');
  assert.deepEqual(rows.map((r) => r.answering?.id ?? null), [null, null, null, 'r1'], 'only a response to a response says what it answers');
});

test('RT8: a response gone (or waiting in Undo) leaves, and the responses that answered only it go with it', () => {
  const data = { threads: [{ id: 't', name: null, created_at: 1 }], members: ['m', 'r1', 'r2', 'r3'].map((id) => ({ thread_id: 't', moment_id: id, added_at: 1 })), links: [link('r1', 'm'), link('r2', 'r1'), link('r3', 'm')] };
  const shown = visibleThreads(data, new Set(['r1']));
  assert.deepEqual(responsesOf('m', shown.links), ['r3'], 'r1 waits in Undo, and r2 answered only it');
  assert.deepEqual(responsesOf('m', visibleThreads(data, new Set()).links).sort(), ['r1', 'r2', 'r3'], 'Undo brings both back');
  const root = m('m', 1);
  assert.deepEqual(responseRows(root, byId(root, m('r3', 4)), [link('r1', 'm'), link('r3', 'm')]).map((r) => r.moment.id), ['m', 'r3'], 'a response not kept is not listed');
  assert.deepEqual(responsesOf('m', visibleThreads(data, new Set(['r1', 'r3'])).links), [], 'the last one gone, none is left');
});

test('RT9: the size words are the fixed set and no digit leaves responsesWord', () => {
  const words = new Set<string>();
  for (let n = 1; n <= 40; n++) words.add(responsesWord(n));
  assert.deepEqual([...words], ['a response', 'a couple of responses', 'a few responses', 'several responses', 'many responses']);
  for (const w of words) assert.ok(!/\d/.test(w), w);
  const sizes = new Set<string>();
  for (let n = 1; n <= 40; n++) sizes.add(sizeWord(n));
  assert.equal(sizes.size, 4, 'the thread size set is unchanged');
});

test('RT13: a response on a walk still open is in the pool the sheet reads, with its walk line from its start', () => {
  const walk = (o: Partial<Walk>): Walk => ({ id: 'w', started_at: new Date(2026, 10, 11, 9).getTime(), ended_at: 2, title: null, epilogue: null, open: false, area: null, snapped_build: null, ...o });
  const cap = (o: Partial<Faced>): Faced => facedOf({ id: 'c', walk_id: null, t: 1, lat: null, lon: null, kind: 'text', file_path: null, body: 'x', segment_id: null, ...o });
  const walks = [walk({}), walk({ id: 'open', open: true, ended_at: null })];
  const caps = [cap({ id: 'a', walk_id: 'w' }), cap({ id: 'r', walk_id: 'open' }), cap({ id: 'loose' })];
  assert.deepEqual(poolWithOpenWalks(caps, walks).map((v) => v.id).sort(), ['a', 'loose', 'r']);
  assert.deepEqual(toMomentViews(caps, walks).map((v) => v.id).sort(), ['a', 'loose'], 'the feed still leaves it out (RM17)');
  assert.match(fromLine(walks[1])!, /^From \w+ morning walk$/, 'its line is from its start, never a made-up name');
});

test('RT14: responses reads only moment_link', () => {
  const src = readFileSync(join(__dirname, '../../threads/responses.ts'), 'utf8');
  const imports = [...src.matchAll(/from '([^']+)'/g)].map((x) => x[1]);
  assert.deepEqual(imports, ['./types']);
  assert.ok(!/thread_member|resurface|Signal/.test(src.replace(/\/\*\*[\s\S]*?\*\//g, '')), 'no membership, no derived threads');
});
