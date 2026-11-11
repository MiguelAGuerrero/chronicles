import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellSize, columnsFor, dayRows, galleryDays, galleryTiles, MIN_TILE } from '../../gallery/layout';
import { anchorAfter, fitFor, pinchStep, zoomed } from '../../gallery/view';
import { at, mo, NOW } from './fixtures';

// Media gallery (specs/media-gallery): the saved view and the tile size.

test('MG20: three sizes, never under 44 pt, and the day at the top kept after a change', () => {
  assert.deepEqual([0, 1, 2].map((s) => columnsFor(390, s as 0 | 1 | 2)), [3, 5, 7]);
  for (const w of [320, 360, 390, 430, 640, 1024]) for (const s of [0, 1, 2] as const) assert.ok(cellSize(w, columnsFor(w, s)) >= MIN_TILE, `${w} at ${s}`);
  assert.ok(columnsFor(200, 2) < 7, 'a narrow window drops a column before a tile is under 44');
  assert.equal(zoomed(0, 'in'), null);
  assert.equal(zoomed(0, 'out'), 1);
  assert.equal(zoomed(2, 'in'), 1);
  assert.equal(zoomed(2, 'out'), null);
  assert.equal(pinchStep(100, 130), 'in', 'fingers spread: larger tiles');
  assert.equal(pinchStep(100, 75), 'out');
  assert.equal(pinchStep(100, 110), null, 'a small move does nothing');
  const days = galleryDays(galleryTiles(Array.from({ length: 60 }, (_, i) => mo(`m${i}`, [['photo', at(2026, 11, 1 + Math.floor(i / 12), 9, i)]])), [], 'all', 'newest'), new Map(), {}, NOW);
  const big = dayRows(days, 390, 0).rows;
  const small = dayRows(days, 390, 2).rows;
  const third = big.find((r) => r.kind === 'header' && r.day.key === '2026-11-03')!;
  const into = anchorAfter(big, third.offset + 150, small);
  const there = small.find((r) => r.kind === 'header' && r.day.key === '2026-11-03')!;
  assert.equal(into, there.offset, 'the day that was at the top is at the top again');
});

test('MG21: square or aspect, the cells stay square', () => {
  assert.equal(fitFor('square'), 'cover');
  assert.equal(fitFor('aspect'), 'contain');
  const days = galleryDays(galleryTiles([mo('a', [['photo', at(2026, 11, 1)]])], [], 'all', 'newest'), new Map(), {}, NOW);
  const { rows, cell } = dayRows(days, 390, 0);
  assert.equal(rows[1].height, cell + 1, 'a row is a square cell and its hairline, whatever the shape');
});

test('MG17: the recording bar keeps its camera on Media', async () => {
  const { barCamera } = await import('../../captureBand');
  assert.equal(barCamera('/', 'media'), true);
  assert.equal(barCamera('/', 'memories'), false, 'only Memories, whose band files into the walk');
});
