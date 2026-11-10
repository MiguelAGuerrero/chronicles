/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { CaptureKind, StreetSegment, TracePoint } from '../../types';

// Moment table (MT4, MT5, MT10, decision 0106): a moment holds its media. The pure helpers over it.
// Test first: the module is loaded by name so this file runs before it exists.

type Piece = { id: string; moment_id: string; t: number; kind: CaptureKind; file_path: string | null; body: string | null };
type Moment = { id: string; walk_id: string | null; t: number; lat: number | null; lon: number | null; segment_id: string | null; pieces: Piece[] };
type Row = Omit<Moment, 'pieces'> & { [k: `p_${string}`]: unknown };
type Mod = {
  face(m: Moment): Piece;
  foldRows(rows: Row[]): Moment[];
  placeAt(
    m: { t: number; lat: number | null; lon: number | null },
    fixes: TracePoint[],
    pauses: { started_at: number; ended_at: number | null }[],
    segments: StreetSegment[],
  ): { lat: number; lon: number; segment_id: string | null } | null;
};
const mod = () => import('../../moment' + '') as Promise<Mod>;

const piece = (id: string, moment_id: string, t: number, kind: CaptureKind): Piece => ({ id, moment_id, t, kind, file_path: `${id}.x`, body: null });
const moment = (id: string, pieces: Piece[]): Moment => ({ id, walk_id: 'w', t: pieces[0]?.t ?? 0, lat: 41.8, lon: -71.4, segment_id: null, pieces });

test('MT10: face is the first photo or video, else the first piece', { todo: 'test first' }, async () => {
  const { face } = await mod();
  assert.equal(face(moment('m', [piece('a', 'm', 1, 'voice'), piece('b', 'm', 2, 'video'), piece('c', 'm', 3, 'photo')])).id, 'b');
  assert.equal(face(moment('m', [piece('a', 'm', 1, 'text'), piece('b', 'm', 2, 'voice')])).id, 'a');
  assert.equal(face(moment('m', [piece('a', 'm', 1, 'photo')])).id, 'a');
});

test('MT4: foldRows folds joined rows into moments, each once, its pieces in capture order', { todo: 'test first' }, async () => {
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

test('MT5: placeAt puts a moment on the trace at its time, at a pause\'s start inside one, keeps a stamped place, and names the street within 40 m', { todo: 'test first' }, async () => {
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

test('MT10: moment.ts is a core module', { todo: 'test first' }, () => {
  const src = readFileSync(join(__dirname, '../../moment.ts'), 'utf8');
  assert.match(src.split('\n')[0], /^\/\/ @layer core$/);
});
