/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { face, foldRows, placeAt, type JoinedRow } from '../../moment';
import type { Capture, CaptureKind, Moment, StreetSegment, TracePoint } from '../../types';

// Moment table (MT4, MT5, MT10, decision 0106): a moment holds its media. The pure helpers over it.

type Row = JoinedRow;
const mod = async () => ({ face, foldRows, placeAt });
const piece = (id: string, moment_id: string, t: number, kind: CaptureKind): Capture => ({ id, moment_id, t, kind, file_path: `${id}.x`, body: null });
const moment = (id: string, pieces: Capture[]): Moment => ({ id, walk_id: 'w', t: pieces[0]?.t ?? 0, lat: 41.8, lon: -71.4, segment_id: null, pieces });

test('MT10: face is the first photo or video, else the first piece', async () => {
  const { face } = await mod();
  assert.equal(face(moment('m', [piece('a', 'm', 1, 'voice'), piece('b', 'm', 2, 'video'), piece('c', 'm', 3, 'photo')])).id, 'b');
  assert.equal(face(moment('m', [piece('a', 'm', 1, 'text'), piece('b', 'm', 2, 'voice')])).id, 'a');
  assert.equal(face(moment('m', [piece('a', 'm', 1, 'photo')])).id, 'a');
});

test('MT4: foldRows folds joined rows into moments, each once, its pieces in capture order', async () => {
  const { foldRows } = await mod();
  const row = (m: string, t: number, p: string, pt: number): Row => ({
    id: m, walk_id: 'w', t, lat: 41.8, lon: -71.4, segment_id: null,
    p_id: p, p_t: pt, p_kind: 'photo', p_file_path: `${p}.jpg`, p_body: null, p_caption: null, p_caption_y: null, p_thumb_path: null, p_edit: null,
  });
  const got = foldRows([row('m1', 1, 'a', 1), row('m1', 1, 'b', 5), row('m2', 2, 'c', 2)]);
  assert.deepEqual(got.map((m) => [m.id, m.pieces.map((p) => p.id)]), [['m1', ['a', 'b']], ['m2', ['c']]]);
  assert.equal(got[0].pieces[1].moment_id, 'm1');
  assert.equal(got[0].pieces[1].t, 5);
  assert.deepEqual(foldRows([]), []);
});

test('MT5: placeAt puts a moment on the trace at its time, at a pause\'s start inside one, keeps a stamped place, and names the street within 40 m', async () => {
  const { placeAt } = await mod();
  const fix = (t: number, lon: number): TracePoint => ({ walk_id: 'w', t, lat: 41.8, lon, accuracy_m: 5, speed: 1, course: null });
  const fixes = [fix(0, -71.4), fix(100, -71.399), fix(200, -71.398)];
  const street: StreetSegment = { id: 's1', name: 'Main St', kind_detail: 'residential', length_m: 80, geometry: [[[-71.399, 41.8]]], build: 'b1' };
  const onTrace = placeAt({ t: 100, lat: null, lon: null }, fixes, [], [street]);
  assert.deepEqual(onTrace, { lat: 41.8, lon: -71.399, segment_id: 's1' });
  const paused = placeAt({ t: 150, lat: null, lon: null }, fixes, [{ started_at: 0, ended_at: 180 }], [street]);
  assert.equal(paused?.lon, -71.4);
  const stamped = placeAt({ t: 200, lat: 41.9, lon: -71.3 }, fixes, [], [street]);
  assert.deepEqual(stamped, { lat: 41.9, lon: -71.3, segment_id: null });
  assert.equal(placeAt({ t: 5, lat: null, lon: null }, [], [], []), null);
});

test('MT10: moment.ts is a core module', () => {
  const src = readFileSync(join(__dirname, '../../moment.ts'), 'utf8');
  assert.match(src.split('\n')[0], /^\/\/ @layer core$/);
});

// ---- Moment stacks, round 1 (MS8, MS13; decision 0106). Test first: the new helpers are reached by name.
type Round1 = { withPiece(m: Moment, p: Capture): Moment; withoutPiece(m: Moment, id: string): Moment | null; hasMore(m: Pick<Moment, 'pieces'>): boolean };
const round1 = () => import('../../moment' + '') as unknown as Promise<Round1>;

test('MS8: a stacked moment\'s face is its first photo or video, and it says it holds more', async () => {
  const { withPiece, hasMore } = await round1();
  const m = moment('m', [piece('m', 'm', 1, 'text')]);
  assert.equal(hasMore(m), false);
  const two = withPiece(withPiece(m, piece('v', 'm', 5, 'voice')), piece('p', 'm', 3, 'photo'));
  assert.deepEqual(two.pieces.map((p) => p.id), ['m', 'p', 'v'], 'pieces in capture order');
  assert.equal(face(two).id, 'p');
  assert.equal(hasMore(two), true);
  assert.equal(two.t, 1, 'the moment keeps its own time');
});

test('MS13: removing a piece keeps the rest and gives the next face; removing the last gives no moment', async () => {
  const { withoutPiece } = await round1();
  const m = moment('m', [piece('m', 'm', 1, 'text'), piece('p', 'm', 3, 'photo'), piece('q', 'm', 4, 'photo')]);
  const left = withoutPiece(m, 'p')!;
  assert.deepEqual(left.pieces.map((p) => p.id), ['m', 'q']);
  assert.equal(face(left).id, 'q');
  assert.equal(withoutPiece(moment('o', [piece('o', 'o', 1, 'text')]), 'o'), null);
});

test('MS11: a moment shown at its face reads the face\'s patched fields, not its stale pieces copy', async () => {
  const { facedAt, faced } = (await import('../../moment')) as typeof import('../../moment');
  const f = faced(moment('m', [piece('m', 'm', 1, 'photo'), piece('n', 'm', 2, 'text')]));
  const patched = { ...f, edit: { v: 1 as const, rotate: 90 as const, crop: null, filter: 'mono' as const, strokes: [], trim: null } };
  assert.equal(facedAt(patched, 'm').edit?.rotate, 90, 'the edit patched on the face shows');
  assert.equal(facedAt(patched, 'n').kind, 'text');
  assert.equal(facedAt(patched, 'n').edit, null, 'another piece shows its own media');
});
