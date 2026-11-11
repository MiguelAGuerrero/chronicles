import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockRows, cellSize, columnsFor, dayRows, galleryBlocks, galleryDays, galleryTiles, lengthLabel, rowAt, tileLabel, type Tile } from '../../gallery/layout';
import { at, mo, NOW, walk } from './fixtures';

// Media gallery (specs/media-gallery): the grid's tiles, days, blocks and rows, worked out from the moments.

const keys = (ts: Tile[]) => ts.map((t) => t.key);

test('MG3: one tile per photo, video and memo piece, newest first, no notes, no open walk', () => {
  const ms = [
    mo('a', [['photo', at(2026, 11, 10, 9)], ['photo', at(2026, 11, 10, 9, 1)], ['photo', at(2026, 11, 10, 9, 2)]]),
    mo('n', [['text', at(2026, 11, 10, 10)]]),
    mo('v', [['voice', at(2026, 11, 10, 11)], ['text', at(2026, 11, 10, 11, 1)]]),
    mo('o', [['photo', at(2026, 11, 11, 8)]], 'open'),
    mo('g', [['video', at(2026, 11, 9, 8)]], 'gone'),
    mo('w', [['video', at(2026, 11, 9, 9)]], 'w1'),
  ];
  const walks = [walk('open', at(2026, 11, 11, 7), { open: true, ended_at: null }), walk('w1', at(2026, 11, 9, 8))];
  const tiles = galleryTiles(ms, walks, 'all', 'newest');
  assert.deepEqual(keys(tiles), ['v', 'a.2', 'a.1', 'a', 'w'], 'three tiles for a moment of three photos; no note, no open or unknown walk');
  assert.equal(tiles[1].face.piece_id, 'a.2', 'a tile faces its own piece');
  // Ties by id.
  const tie = galleryTiles([mo('b', [['photo', 5]]), mo('a', [['photo', 5]])], [], 'all', 'newest');
  assert.deepEqual(keys(tie), ['b', 'a']);
});

test('MG4: a memo or video tile carries its length as m:ss, and nothing else in words', () => {
  const [v, p] = galleryTiles([mo('v', [['voice', 2, '42000']]), mo('p', [['photo', 1]])], [], 'all', 'newest');
  assert.equal(v.lengthMs, 42000);
  assert.equal(p.lengthMs, null);
  assert.equal(lengthLabel(42000), '0:42');
  assert.equal(lengthLabel(725_000), '12:05');
  assert.equal(lengthLabel(3_729_000), '1:02:09');
  const bad = galleryTiles([mo('x', [['voice', 1, 'not a length']])], [], 'all', 'newest');
  assert.equal(bad[0].lengthMs, null, 'an unreadable length shows none');
});

test('MG5: three across on a phone, more as it widens, a tile about the same size', () => {
  assert.equal(columnsFor(390, 0), 3);
  assert.equal(columnsFor(320, 0), 3);
  assert.equal(columnsFor(430, 0), 3);
  assert.ok(columnsFor(640, 0) >= 5, 'a tablet column shows more across');
  const phone = cellSize(390, columnsFor(390, 0));
  const wide = cellSize(1024, columnsFor(1024, 0));
  assert.ok(Math.abs(wide - phone) / phone < 0.2, `about the same size (${phone} vs ${wide})`);
  assert.equal(cellSize(390, 3), (390 - 2) / 3, 'hairline gaps of 1 pt');
});

test('MG6: a header per day, with the year off this year, and the place line from what is under it', () => {
  const walks = new Map([
    ['am', walk('am', at(2026, 11, 10, 8), { area: 'Alfama' })],
    ['pm', walk('pm', at(2026, 11, 10, 19), { area: 'Baixa' })],
    ['mum', walk('mum', at(2026, 11, 8, 15), { title: "Mum's last afternoon", area: 'Graça' })],
    ['x', walk('x', at(2026, 11, 7, 9))],
  ]);
  const ms = [
    mo('a', [['photo', at(2026, 11, 10, 9)]], 'am'),
    mo('b', [['photo', at(2026, 11, 10, 20)]], 'pm'),
    mo('c', [['photo', at(2026, 11, 8, 16)]], 'mum'),
    mo('d', [['photo', at(2026, 11, 7, 10)]], 'x'),
    mo('e', [['photo', at(2026, 11, 6, 10)]]),
    mo('f', [['photo', at(2025, 3, 4, 10)]]),
  ];
  const days = galleryDays(galleryTiles(ms, [...walks.values()], 'all', 'newest'), walks, { e: 'Hope Street' }, NOW);
  assert.equal(days[0].title, 'Yesterday');
  assert.equal(days[0].line, 'An evening walk in Baixa and a morning walk in Alfama', 'in the order its tiles appear, newest first');
  assert.equal(days[1].line, "Mum's last afternoon", "a walk's own title, as typed");
  assert.equal(days[2].line, 'A morning walk', 'no area: never a guessed place');
  assert.equal(days[3].line, 'Not on a walk, on Hope Street');
  assert.equal(days[4].line, 'Not on a walk', 'no street known');
  assert.match(days[4].title, /2025$/, 'the year when it is not this year');
  assert.doesNotMatch(days[2].title, /2026/);
  // More than three walks: the two first named, the rest in words; loose moments too.
  const many = new Map([0, 1, 2, 3].map((i) => [`w${i}`, walk(`w${i}`, at(2026, 11, 4, 6 + i * 4), { area: `A${'BCDE'[i]}` })]));
  const tiles = galleryTiles([0, 1, 2, 3].map((i) => mo(`m${i}`, [['photo', at(2026, 11, 4, 7 + i * 4)]], `w${i}`)).concat([mo('l', [['photo', at(2026, 11, 4, 23)]])]), [...many.values()], 'all', 'newest');
  assert.equal(galleryDays(tiles, many, { l: 'Elm Street' }, NOW)[0].line, 'An evening walk in AE, an afternoon walk in AD and two other walks, and outside a walk on Elm Street');
  // Under a filter the line names only what is shown.
  const only = galleryDays(galleryTiles([mo('p', [['photo', at(2026, 11, 3, 9)]], 'am'), mo('q', [['voice', at(2026, 11, 3, 20)]], 'pm')], [walk('am', at(2026, 11, 3, 8), { area: 'Alfama' }), walk('pm', at(2026, 11, 3, 19), { area: 'Baixa' })], 'voice', 'newest'), new Map([['am', walk('am', at(2026, 11, 3, 8), { area: 'Alfama' })], ['pm', walk('pm', at(2026, 11, 3, 19), { area: 'Baixa' })]]), {}, NOW);
  assert.equal(only[0].line, 'An evening walk in Baixa');
});

test('MG7: nothing counts: no digit leaves the headers, block lines or tile labels but dates, times and lengths', () => {
  const walks = [walk('w', at(2026, 11, 10, 8), { area: 'Alfama' })];
  const byId = new Map(walks.map((w) => [w.id, w]));
  const ms = Array.from({ length: 40 }, (_, i) => mo(`m${i}`, [['photo', at(2026, 11, 10, 9, i)]], i % 2 ? 'w' : null));
  const tiles = galleryTiles(ms, walks, 'all', 'newest');
  const days = galleryDays(tiles, byId, {}, NOW);
  const blocks = [...galleryBlocks(tiles, byId, {}, 'month', NOW), ...galleryBlocks(tiles, byId, {}, 'year', NOW)];
  for (const d of days) assert.doesNotMatch(d.line, /\d/, d.line);
  for (const b of blocks) {
    assert.doesNotMatch(b.line ?? '', /\d/, b.line ?? '');
    assert.doesNotMatch(b.coverPlace, /\d/);
  }
  for (const t of tiles) assert.doesNotMatch(tileLabel(t, 'TIME', byId, {}), /\d/);
  assert.doesNotMatch(blocks.find((b) => b.key === '2026-11')!.title, /\d/, 'a month this year is its name alone');
});

test('MG9: a kind shows only its tiles and the days that have them', () => {
  const ms = [mo('p', [['photo', at(2026, 11, 10)]]), mo('v', [['video', at(2026, 11, 9)]]), mo('s', [['photo', at(2026, 11, 8)], ['voice', at(2026, 11, 8, 13)]])];
  assert.deepEqual(keys(galleryTiles(ms, [], 'video', 'newest')), ['v']);
  assert.deepEqual(keys(galleryTiles(ms, [], 'voice', 'newest')), ['s.1']);
  assert.deepEqual(keys(galleryTiles(ms, [], 'photo', 'newest')), ['p', 's']);
  const days = galleryDays(galleryTiles(ms, [], 'video', 'newest'), new Map(), {}, NOW);
  assert.deepEqual(days.map((d) => d.key), ['2026-11-09']);
});

test("MG12: every row's offset is known; 5,000 pieces in one pass", () => {
  const ms = Array.from({ length: 5000 }, (_, i) => mo(`m${i}`, [['photo', at(2026, 1, 1) + i * 3_600_000]]));
  const began = performance.now();
  const days = galleryDays(galleryTiles(ms, [], 'all', 'newest'), new Map(), {}, NOW);
  const { rows } = dayRows(days, 390, 0);
  const took = performance.now() - began;
  assert.ok(took < 2000, `worked out in ${Math.round(took)} ms`);
  for (let i = 1; i < rows.length; i++) assert.equal(rows[i].offset, rows[i - 1].offset + rows[i - 1].height);
  for (const i of [0, 7, 1234, rows.length - 1]) assert.equal(rowAt(rows, rows[i].offset + 1), i);
  const blocks = blockRows(galleryBlocks(galleryTiles(ms, [], 'all', 'newest'), new Map(), {}, 'month', NOW), 390);
  for (let i = 1; i < blocks.length; i++) assert.equal(blocks[i].offset, blocks[i - 1].offset + blocks[i - 1].height);
});

test("MG15: a tile is spoken by its own walk or street, never the day's line", () => {
  const walks = new Map([['am', walk('am', at(2026, 11, 10, 8), { area: 'Alfama' })], ['pm', walk('pm', at(2026, 11, 10, 19), { title: 'Fado night' })]]);
  const tiles = galleryTiles([mo('a', [['photo', at(2026, 11, 10, 9)]], 'am'), mo('b', [['voice', at(2026, 11, 10, 20)]], 'pm'), mo('c', [['video', at(2026, 11, 10, 22)]]), mo('d', [['photo', at(2026, 11, 10, 23)]])], [...walks.values()], 'all', 'newest');
  const said = (k: string) => tileLabel(tiles.find((t) => t.key === k)!, '9:41 AM', walks, { c: 'Hope Street', d: null });
  assert.equal(said('a'), 'Photo, 9:41 AM, a morning walk in Alfama');
  assert.equal(said('b'), 'Voice memo, 9:41 AM, Fado night');
  assert.equal(said('c'), 'Video, 9:41 AM, on Hope Street');
  assert.equal(said('d'), 'Photo, 9:41 AM, not on a walk');
});

test('MG18: Oldest First reverses days, blocks and tiles', () => {
  const ms = [mo('a', [['photo', at(2026, 10, 1)]]), mo('b', [['photo', at(2026, 11, 1)], ['photo', at(2026, 11, 1, 13)]]), mo('c', [['photo', at(2026, 11, 2)]])];
  const old = galleryTiles(ms, [], 'all', 'oldest');
  assert.deepEqual(keys(old), ['a', 'b', 'b.1', 'c']);
  assert.deepEqual(keys(galleryTiles(ms, [], 'all', 'newest')), ['c', 'b.1', 'b', 'a']);
  assert.deepEqual(galleryDays(old, new Map(), {}, NOW).map((d) => d.key), ['2026-10-01', '2026-11-01', '2026-11-02']);
  assert.deepEqual(galleryBlocks(old, new Map(), {}, 'month', NOW).map((b) => b.key), ['2026-10', '2026-11']);
});

test('MG19: months and years with their cover and place in words', () => {
  const walks = new Map([
    ['w1', walk('w1', at(2026, 11, 2, 8), { area: 'Alfama' })],
    ['w2', walk('w2', at(2026, 11, 3, 8), { area: 'Alfama' })],
    ['w3', walk('w3', at(2026, 11, 4, 8), { title: 'Fado night' })],
    ['w4', walk('w4', at(2026, 11, 5, 8))],
    ['w5', walk('w5', at(2026, 11, 6, 8), { area: 'Graça' })],
    ['w6', walk('w6', at(2026, 11, 7, 8), { area: 'Baixa' })],
  ]);
  const ms = [
    mo('memo', [['voice', at(2026, 11, 8, 9)]]),
    mo('p6', [['photo', at(2026, 11, 7, 9)]], 'w6'),
    mo('p5', [['photo', at(2026, 11, 6, 9)]], 'w5'),
    mo('p4', [['photo', at(2026, 11, 5, 9)]], 'w4'),
    mo('p3', [['photo', at(2026, 11, 4, 9)]], 'w3'),
    mo('p2', [['photo', at(2026, 11, 3, 9)]], 'w2'),
    mo('p1', [['photo', at(2026, 11, 2, 9)]], 'w1'),
    mo('old', [['video', at(2025, 6, 2, 9)]]),
  ];
  const tiles = galleryTiles(ms, [...walks.values()], 'all', 'newest');
  const [nov, june] = galleryBlocks(tiles, walks, { memo: 'Hope Street' }, 'month', NOW);
  assert.equal(nov.title, 'November');
  assert.equal(june.title, 'June 2025');
  assert.equal(nov.cover.key, 'p6', "the month's first photo in the Sort's order, never a memo's glyph over a photo");
  assert.equal(nov.line, 'Baixa, Hope Street, Graça and other places', "the cover's place first, then in order, never repeated, untitled with no area left out, the rest in words");
  assert.equal(nov.coverPlace, 'a morning walk in Baixa');
  assert.equal(nov.firstDay, '2026-11-08');
  assert.equal(june.cover.key, 'old', 'with no photo, its first piece');
  assert.equal(june.line, 'Not on a walk');
  const oldestFirst = galleryBlocks(galleryTiles(ms, [...walks.values()], 'all', 'oldest'), walks, {}, 'month', NOW);
  assert.equal(oldestFirst[1].cover.key, 'p1', "under Oldest First the cover follows the Sort");
  const filtered = galleryBlocks(galleryTiles(ms, [...walks.values()], 'voice', 'newest'), walks, { memo: 'Hope Street' }, 'month', NOW);
  assert.equal(filtered[0].cover.key, 'memo', 'the cover is of the shown kinds');
  const years = galleryBlocks(tiles, walks, {}, 'year', NOW);
  assert.deepEqual(years.map((y) => [y.title, y.firstMonth]), [['2026', '2026-11'], ['2025', '2025-06']]);
  // Three names exactly: no "another place"; four: the fourth in words.
  const three = galleryBlocks(galleryTiles(ms.slice(1, 4), [...walks.values()], 'all', 'newest'), walks, {}, 'month', NOW);
  assert.equal(three[0].line, 'Baixa and Graça');
});

test('MG19: a month with moments outside a walk and no street says so', () => {
  const walks = new Map([['w', walk('w', at(2026, 11, 2, 8), { area: 'Alfama' })]]);
  const tiles = galleryTiles([mo('a', [['photo', at(2026, 11, 2, 9)]], 'w'), mo('l', [['photo', at(2026, 11, 3, 9)]])], [...walks.values()], 'all', 'newest');
  assert.equal(galleryBlocks(tiles, walks, {}, 'month', NOW)[0].line, 'Alfama, and outside a walk');
  assert.equal(galleryBlocks(tiles, walks, { l: 'Hope Street' }, 'month', NOW)[0].line, 'Hope Street and Alfama', 'a street read names it instead');
});

test('MG19: exactly one more place than three is "another place"', () => {
  const walks = new Map(['A', 'B', 'C', 'D'].map((a, i) => [a, walk(a, at(2026, 11, 2 + i, 8), { area: a })]));
  const tiles = galleryTiles(['A', 'B', 'C', 'D'].map((a, i) => mo(a, [['photo', at(2026, 11, 2 + i, 9)]], a)), [...walks.values()], 'all', 'newest');
  assert.equal(galleryBlocks(tiles, walks, {}, 'month', NOW)[0].line, 'D, C, B and another place');
});

test('fix gallery-header: a day header holds its title and two lines of place, at any text size', async () => {
  const { HEADER_TYPE, headerHeight, BLOCK_TYPE, blockTextHeight } = await import('../../gallery/layout');
  const need = (s: number) => HEADER_TYPE.padTop + HEADER_TYPE.padBottom + (HEADER_TYPE.titleLine + HEADER_TYPE.lines * HEADER_TYPE.lineLine) * s;
  for (const s of [1, 1.3, 2]) assert.ok(headerHeight(s) >= need(s), `${s}: ${headerHeight(s)} holds ${need(s)}`);
  assert.ok(HEADER_TYPE.titleLine >= HEADER_TYPE.titleSize * 1.2 && HEADER_TYPE.lineLine >= HEADER_TYPE.lineSize * 1.2, 'line heights hold their glyphs');
  for (const s of [1, 2]) assert.ok(blockTextHeight(s) >= BLOCK_TYPE.padTop + BLOCK_TYPE.padBottom + (BLOCK_TYPE.titleLine + BLOCK_TYPE.lineLine) * s);
  const days = galleryDays(galleryTiles([mo('a', [['photo', at(2026, 11, 10, 9)]])], [], 'all', 'newest'), new Map(), {}, NOW);
  assert.equal(dayRows(days, 390, 0, 1.5).rows[0].height, headerHeight(1.5), "the row is the header's own height");
  assert.equal(blockRows(galleryBlocks(galleryTiles([mo('a', [['photo', at(2026, 11, 10, 9)]])], [], 'all', 'newest'), new Map(), {}, 'month', NOW), 390, 2)[0].height, blockTextHeight(2) + 260 + 12);
});

test('fix gallery-header audit 2: a text-size change keeps the day at the top', async () => {
  const { anchorAfter } = await import('../../gallery/view');
  const days = galleryDays(galleryTiles(Array.from({ length: 90 }, (_, i) => mo(`m${i}`, [['photo', at(2026, 9, 1 + Math.floor(i / 3), 9, i)]])), [], 'all', 'newest'), new Map(), {}, NOW);
  const small = dayRows(days, 390, 0, 1).rows;
  const large = dayRows(days, 390, 0, 1.353).rows;
  const day = small.filter((r) => r.kind === 'header')[20];
  const to = anchorAfter(small, day.offset + 30, large);
  assert.equal(to, large.find((r) => r.kind === 'header' && r.day.key === (day.kind === 'header' ? day.day.key : ''))!.offset);
  assert.notEqual(to, day.offset, 'the offset moves with the taller rows above');
});

test('fix gallery-header audit 5: BLOCK_TYPE line heights hold their glyphs', async () => {
  const { BLOCK_TYPE } = await import('../../gallery/layout');
  assert.ok(BLOCK_TYPE.titleLine >= BLOCK_TYPE.titleSize * 1.2 && BLOCK_TYPE.lineLine >= BLOCK_TYPE.lineSize * 1.2);
});
