/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renamePatch, TITLE_MAX, EPILOGUE_MAX } from '../../rename';
import { suggestTitle } from '../../walkTitle';
import type { Walk } from '../../types';

// Quality of life round 3 (QL22, QL23): rename a walk later, written from the
// criteria before the code.

const walk = (over: Partial<Walk> = {}): Walk => ({
  id: 'w', started_at: new Date(2026, 10, 3, 18, 30).getTime(), ended_at: new Date(2026, 10, 3, 19).getTime(),
  title: 'Old title', epilogue: 'Old line', open: false, area: 'Fox Point', snapped_build: null, ...over,
});

test('QL23: the title and the line are trimmed', () => {
  assert.deepEqual(renamePatch(walk(), '  Down to the river  ', '  The light on the water \n'), {
    title: 'Down to the river', epilogue: 'The light on the water',
  });
});

test('QL23, tend chronicle T1: an empty title becomes no title, shown as the suggestion', () => {
  const w = walk();
  assert.equal(renamePatch(w, '', 'x').title, null);
  assert.equal(renamePatch(w, '   \n ', 'x').title, null);
  assert.equal(renamePatch(w, '', null).title, null);
  assert.equal(renamePatch(walk({ area: null }), ' ', '').title, null);
});

test('tend chronicle T1: the suggested title kept as it was is no title, so it follows the walk', () => {
  // Named before its area was read: the field showed "… evening walk" and Keep it stored nothing.
  const before = walk({ title: null, area: null });
  assert.equal(renamePatch(before, suggestTitle(before), '').title, null);
  assert.equal(renamePatch(before, `  ${suggestTitle(before)} `, '').title, null);
  // Once finish.ts reads Fox Point, the walk is shown with the suggestion that names it.
  const after = { ...before, ...renamePatch(before, suggestTitle(before), ''), area: 'Fox Point' };
  assert.equal(after.title ?? suggestTitle(after), suggestTitle(after));
  assert.match(after.title ?? suggestTitle(after), /Fox Point/);
});

test('tend chronicle T1: words that differ from the suggestion are stored, a frozen old title too', () => {
  const w = walk({ title: null });
  assert.equal(renamePatch(w, `${suggestTitle(w)}!`, '').title, `${suggestTitle(w)}!`);
  // A walk saved before keeps its stored words when they are saved unchanged.
  const old = walk({ title: 'Tuesday evening walk', area: 'Fox Point' });
  assert.notEqual(suggestTitle(old), 'Tuesday evening walk');
  assert.equal(renamePatch(old, old.title, '').title, 'Tuesday evening walk');
});

test('QL23: an empty line becomes none', () => {
  assert.equal(renamePatch(walk(), 'T', '').epilogue, null);
  assert.equal(renamePatch(walk(), 'T', '   ').epilogue, null);
  assert.equal(renamePatch(walk(), 'T', null).epilogue, null);
});

test('QL23: the title is cut to 60 characters and the line to 200', () => {
  assert.equal(TITLE_MAX, 60);
  assert.equal(EPILOGUE_MAX, 200);
  const p = renamePatch(walk(), 'a'.repeat(90), 'b'.repeat(250));
  assert.equal(p.title, 'a'.repeat(60));
  assert.equal(p.epilogue, 'b'.repeat(200));
  // Trimmed before it is cut, so leading spaces never use up the room.
  assert.equal(renamePatch(walk(), `   ${'c'.repeat(60)}`, '').title, 'c'.repeat(60));
});

test('QL23: the patch holds only the title and the line', () => {
  assert.deepEqual(Object.keys(renamePatch(walk(), 'T', 'L')).sort(), ['epilogue', 'title']);
});

test('tend chronicle audit 2: a suggestion longer than the title field, kept unchanged, stores no title', () => {
  const w = walk({ title: null, area: 'Royal Borough of Kensington and Chelsea and Somewhere Else' });
  assert.ok(suggestTitle(w).length > TITLE_MAX);
  assert.equal(renamePatch(w, suggestTitle(w), '').title, null);
  // As the web field shows a value set from code whole, and a phone's field may cut it.
  assert.equal(renamePatch(w, suggestTitle(w).slice(0, TITLE_MAX), '').title, null);
});
