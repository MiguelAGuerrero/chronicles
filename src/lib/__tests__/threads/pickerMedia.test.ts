import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { pieceKey } from '../../moment';
import { at, mo, NOW, walk } from '../gallery/fixtures';

// Picker media (specs/picker-media, MP1-MP19): the gallery's grid inside the two moment pickers. Core only here; the
// screens are `scripts/e2e/journeys/pickermedia.js`. The module is imported inside each test so a missing one fails
// the test, not the file.
const core = () => import('../../threads/pickerMedia');
const none = new Set<string>();

const moments = () => [
  mo('stack', [['photo', at(2026, 11, 10, 9)], ['photo', at(2026, 11, 10, 9, 1)], ['video', at(2026, 11, 10, 9, 2)]], 'w1'),
  mo('memo', [['voice', at(2026, 11, 11, 8)]]),
  mo('note', [['text', at(2026, 11, 11, 7)]]),
  mo('self', [['photo', at(2026, 11, 9, 9)]]),
  mo('wait', [['photo', at(2026, 11, 8, 9)]]),
  mo('open', [['photo', at(2026, 11, 8, 10)]], 'w2'),
  mo('late', [['photo', at(2026, 11, 7, 10)], ['voice', at(2026, 11, 7, 11)]]),
];
const walks = () => [walk('w1', at(2026, 11, 10, 8)), walk('w2', at(2026, 11, 8, 9), { open: true, ended_at: null })];

test('MP4: one tile per photo, video and memo piece, newest first; a note has none; the moment in hand, one waiting in Undo and an open walk\'s are left out', async () => {
  const { pickerTiles } = await core();
  const tiles = pickerTiles(moments(), walks(), { hidden: new Set(['wait']), self: 'self', show: 'all', order: 'newest' });
  assert.deepEqual(tiles.map((t) => t.key), ['memo', 'stack.2', 'stack.1', 'stack', 'late.1', 'late']);
  const piece = pickerTiles(moments(), walks(), { hidden: new Set([pieceKey('stack.1')]), self: 'self', show: 'all', order: 'newest' });
  assert.ok(!piece.some((t) => t.key === 'stack.1'), 'a piece waiting in Undo is left out');
  assert.ok(piece.some((t) => t.key === 'stack'), 'its moment\'s other pieces stay');
});

test('MP6: a kind keeps only its tiles', async () => {
  const { pickerTiles } = await core();
  const o = { hidden: none, self: 'self', order: 'newest' as const };
  assert.deepEqual(pickerTiles(moments(), walks(), { ...o, show: 'video' }).map((t) => t.key), ['stack.2']);
  assert.deepEqual(pickerTiles(moments(), walks(), { ...o, show: 'voice' }).map((t) => t.key), ['memo', 'late.1']);
  assert.ok(pickerTiles(moments(), walks(), { ...o, show: 'photo' }).every((t) => t.kind === 'photo'));
});

test('MP8: no tiles gives the gallery\'s empty line, a kind its own; tiles give none', async () => {
  const { pickerEmpty, pickerTiles } = await core();
  const o = { hidden: none, self: 'self', order: 'newest' as const };
  assert.equal(pickerEmpty([], 'all'), 'Photos, videos and voice memos you keep show here.');
  assert.equal(pickerEmpty([], 'video'), 'No videos kept yet.');
  assert.equal(pickerEmpty(pickerTiles(moments(), walks(), { ...o, show: 'all' }), 'all'), null);
});

test('MP9: marking a tile marks every tile of its moment; the bar says place, date, time, walk and its words or its kind', async () => {
  const { markedKeys, pickBar, pickerTiles } = await core();
  const tiles = pickerTiles(moments(), walks(), { hidden: none, self: 'self', show: 'all', order: 'newest' });
  assert.deepEqual([...markedKeys(tiles, 'stack')].sort(), ['stack', 'stack.1', 'stack.2']);
  assert.equal(markedKeys(tiles, null).size, 0, 'nothing marked, nothing ringed');
  const bar = pickBar({ kind: 'photo', words: '  The harbor at dusk  ', place: 'Hope Street', t: at(2026, 11, 10, 9, 41), walkLine: 'a morning walk in Alfama', time: '9:41 AM', now: NOW });
  assert.equal(bar.context, 'Hope Street, Nov 10, 9:41 AM · a morning walk in Alfama');
  assert.equal(bar.words, 'The harbor at dusk');
  assert.equal(pickBar({ kind: 'voice', words: null, place: null, t: at(2025, 3, 2, 10), walkLine: null, time: '10:00 AM', now: NOW }).context, 'Mar 2, 2025, 10:00 AM');
  assert.equal(pickBar({ kind: 'voice', words: null, place: null, t: 1, walkLine: null, time: '10:00 AM', now: NOW }).words, 'Voice memo');
  assert.equal(pickBar({ kind: 'video', words: '', place: null, t: 1, walkLine: null, time: '10:00 AM', now: NOW }).words, 'Video');
});

test('MP1, MP9: the switch\'s words are List and Media, and the one action is Connect or Mention', async () => {
  const { PICKER_ACTION, PICKER_TABS } = await core();
  assert.deepEqual(PICKER_TABS, { list: 'List', media: 'Media' });
  assert.deepEqual(PICKER_ACTION, { thread: 'Connect', mention: 'Mention' });
});

test('MP14, MP16: the rows come from Chronicle\'s own layout, each with its offset and height, for Days, Months and Years', async () => {
  const { pickerRows, pickerTiles } = await core();
  const tiles = pickerTiles(moments(), walks(), { hidden: none, self: 'self', show: 'all', order: 'newest' });
  for (const zoom of ['days', 'months', 'years'] as const) {
    const rows = pickerRows(tiles, walks(), {}, NOW, { zoom, width: 390, size: 0, fontScale: 1 });
    assert.ok(rows.length > 0, zoom);
    let off = 0;
    for (const r of rows) {
      assert.equal(r.offset, off, `${zoom}: every row's offset is known`);
      assert.ok(r.height > 0);
      off += r.height;
    }
  }
  const months = pickerRows(tiles, walks(), {}, NOW, { zoom: 'months', width: 390, size: 0, fontScale: 1 });
  assert.ok(months.every((r) => r.kind === 'block'), 'a month is a block, never a tile to pick');
});

test('MP2, MP12: both pickers show the one PickerMedia; Notes that mention it has no switch', () => {
  const picker = readFileSync('src/components/threads/MomentPicker.tsx', 'utf8');
  const add = readFileSync('src/components/threads/AddToThread.tsx', 'utf8');
  assert.match(picker, /PickerMedia/);
  assert.match(add, /PickerMedia/);
  assert.match(picker, /!props\.only[\s\S]*PickerTabs|PickerTabs[\s\S]*!props\.only/, 'the switch only without `only`');
});

test('MP15: the picker never writes the gallery\'s view', () => {
  const src = readFileSync('src/components/threads/PickerMedia.tsx', 'utf8');
  assert.doesNotMatch(src, /gallery\.setView|setMeta|gallery\.setShow|gallery\.setZoom/);
});
