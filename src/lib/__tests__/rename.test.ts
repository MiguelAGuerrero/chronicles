/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renamePatch, TITLE_MAX, EPILOGUE_MAX } from '../rename';
import { suggestTitle } from '../walkTitle';
import type { Walk } from '../types';

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

test('QL23: an empty title becomes the suggested one', () => {
  const w = walk();
  assert.equal(renamePatch(w, '', 'x').title, suggestTitle(w));
  assert.equal(renamePatch(w, '   \n ', 'x').title, suggestTitle(w));
  assert.match(renamePatch(w, '', null).title, /Fox Point/);
});

test('QL23: the suggested title follows the walk, without an area too', () => {
  const w = walk({ area: null });
  assert.equal(renamePatch(w, ' ', '').title, suggestTitle(w));
  assert.match(suggestTitle(w), /walk$/);
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
