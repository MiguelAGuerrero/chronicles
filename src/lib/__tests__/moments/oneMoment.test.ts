/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';
import { buildDays } from '../../days';
import { memoriesNear } from '../../memories';
import { faced, facedAll } from '../../moment';
import { placedMoments } from '../../momentPins';
import { pinsFor } from '../../pins';
import { groupCaptures } from '../../replay';
import { toMomentViews } from '../../resurface/views';
import type { Capture, Moment, Walk } from '../../types';

// Moment stacks, MS7 and MS14 (decision 0106): a moment with several pieces is one entry wherever moments are read,
// and nothing merges two moments into one.

const LAT = 41.812, LON = -71.4;
const piece = (id: string, t: number, kind: Capture['kind']): Capture => ({ id, moment_id: 'm', t, kind, file_path: kind === 'text' ? null : `${id}.x`, body: kind === 'text' ? 'words' : null });
const stacked = (walk_id: string | null): Moment => ({
  id: 'm', walk_id, t: 1_000, lat: LAT, lon: LON, segment_id: null,
  pieces: [piece('m', 1_000, 'photo'), piece('p2', 30_000, 'photo'), piece('n', 60_000, 'text')],
});
const walk: Walk = { id: 'w', started_at: 0, ended_at: 3_600_000, title: null, epilogue: null, open: false, area: null, snapped_build: null };

test('MS7: a three-piece moment is one entry for every reader of moments', { todo: 'test first' }, () => {
  const loose = facedAll([stacked(null)]);
  const walked = facedAll([stacked('w')]);
  assert.equal(toMomentViews(loose, []).length, 1, 'Memories and the resurfaced card');
  const days = buildDays([walk], [...loose, ...facedAll([{ ...stacked('w'), id: 'm2', pieces: stacked('w').pieces.map((p) => ({ ...p, id: `${p.id}2`, moment_id: 'm2' })) }])]);
  assert.equal(days.reduce((n, d) => n + d.moments, 0), 2, 'a day counts moments, not pieces');
  assert.equal(memoriesNear({ pool: walked, here: [LON, LAT], walkId: null, hidden: new Set() }).length, 1, 'Memories here');
  assert.equal(placedMoments(loose).length, 1, 'moment pins');
  const pins = pinsFor(walked, 30);
  assert.equal(pins.length, 1);
  assert.equal(pins[0].captures.length, 1, 'a pin gathers moments, not pieces');
  const groups = groupCaptures(walked);
  assert.equal(groups.reduce((n, g) => n + g.captures.length, 0), 1, 'the replay: one event, one card');
  assert.equal(faced(stacked(null)).pieces.length, 3, 'and every piece is still there to open');
});

test('MS14: no store method merges moments, and a piece is only ever added to a moment that exists', { todo: 'test first' }, () => {
  const file = join(__dirname, '../../db/types.ts');
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const names: string[] = [];
  src.forEachChild((n) => {
    if (ts.isInterfaceDeclaration(n) && n.name.text === 'Db') for (const m of n.members) if (m.name && ts.isIdentifier(m.name)) names.push(m.name.text);
  });
  assert.ok(names.length > 10);
  assert.deepEqual(names.filter((n) => /merge|join|combine|move(Piece|Moment)/i.test(n)), []);
});
