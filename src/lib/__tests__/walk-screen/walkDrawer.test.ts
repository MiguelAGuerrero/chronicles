/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCaptures, formatDistance, formatRange } from '../../format';

// The walk's drawer (specs/walk-drawer-sections WD1, WD4, WD5, WD7, WD9-WD12, WD17, WD18), written before the code:
// pulled up, "This walk" in words; the … a menu of four sections, each shown alone inside the drawer.

type SectionId = 'explore' | 'map' | 'reminders' | 'motion';
type DrawerState = 'down' | 'details' | 'menu' | SectionId;
type DrawerEvent = { type: 'pull' } | { type: 'more' } | { type: 'settings' } | { type: 'pick'; id: SectionId } | { type: 'back' } | { type: 'lower' };
type SectionInput = {
  exploring: boolean;
  rangeM: number;
  leanings: readonly ('green' | 'sights' | 'storefronts')[];
  notices: { recall: boolean; pause: boolean } | null;
  motion: 'on' | 'off' | 'denied' | 'unavailable';
  units: 'km' | 'mi';
};
type DetailsInput = {
  startedAt: number;
  elapsedMs: number;
  distanceM: number;
  rideM: number;
  pausedMs: number;
  street: string | null;
  heading: { label: string; distanceM: number } | null;
  kept: { photos: number; videos: number; voices: number; notes: number };
  gaps: readonly { ms: number; at: number }[];
  notRecording: boolean;
  units: 'km' | 'mi';
};
type Mod = {
  SECTIONS: readonly { id: SectionId; name: string }[];
  stepDrawer: (s: DrawerState, e: DrawerEvent) => DrawerState;
  sectionLine: (id: SectionId, i: SectionInput) => string;
  walkDetailLines: (i: DetailsInput) => { key: string; text: string }[];
  moreExpanded: (s: DrawerState) => boolean;
  numbersTail: (s: DrawerState) => string;
  ringShown: (s: DrawerState, exploring: boolean) => boolean;
  liftedHeight: (o: { areaH: number; rest: number; top: number; stack: number }) => number;
};
// Through a variable, so the typecheck passes before the module exists.
const PATH: string = '../../walkDrawer';
const mod = () => import(PATH) as Promise<Mod>;

const at = (h: number, m: number) => new Date(2026, 10, 19, h, m).getTime();
const base: DetailsInput = {
  startedAt: at(14, 14),
  elapsedMs: 34 * 60_000 + 12_000,
  distanceM: 1234,
  rideM: 0,
  pausedMs: 0,
  street: null,
  heading: null,
  kept: { photos: 0, videos: 0, voices: 0, notes: 0 },
  gaps: [],
  notRecording: false,
  units: 'km',
};
const settings: SectionInput = { exploring: false, rangeM: 400, leanings: [], notices: { recall: true, pause: true }, motion: 'on', units: 'km' };
const textOf = (lines: { key: string; text: string }[]) => lines.map((l) => l.text);

test('WD1: the … raises the drawer on the menu, four sections in order, and a row shows its section alone', { todo: 'test first' }, async () => {
  const { SECTIONS, stepDrawer } = await mod();
  assert.deepEqual(SECTIONS.map((s) => s.name), ['Explore', 'Map & routes', 'Reminders', 'Location & motion']);
  assert.equal(stepDrawer('down', { type: 'more' }), 'menu');
  for (const s of SECTIONS) assert.equal(stepDrawer('menu', { type: 'pick', id: s.id }), s.id, `${s.name} shows alone`);
});

test('WD1: each row\'s line says how its section is set now, in words', { todo: 'test first' }, async () => {
  const { sectionLine } = await mod();
  assert.equal(sectionLine('explore', settings), 'Off');
  assert.equal(sectionLine('explore', { ...settings, exploring: true }), `On, “?” within ${formatRange(400, 'km')}`);
  assert.equal(sectionLine('map', settings), 'The direct way');
  assert.equal(sectionLine('map', { ...settings, leanings: ['green', 'sights'] }), 'Leaning to green and sights');
  assert.equal(sectionLine('map', { ...settings, leanings: ['green', 'sights', 'storefronts'] }), 'Leaning to green, sights and storefronts');
  assert.equal(sectionLine('reminders', settings), 'On');
  assert.equal(sectionLine('reminders', { ...settings, notices: { recall: false, pause: false } }), 'Off');
  assert.equal(sectionLine('reminders', { ...settings, notices: { recall: true, pause: false } }), 'Remind me here on');
  assert.equal(sectionLine('reminders', { ...settings, notices: { recall: false, pause: true } }), 'Pause reminder on');
  assert.equal(sectionLine('motion', settings), 'Motion on');
  assert.equal(sectionLine('motion', { ...settings, motion: 'off' }), 'Motion off');
  assert.equal(sectionLine('motion', { ...settings, motion: 'denied' }), 'Motion blocked');
  assert.equal(sectionLine('motion', { ...settings, motion: 'unavailable' }), 'No motion here');
});

test('WD4: back steps a section to the menu; on the menu or This walk it lowers; a drag down lowers any view; the … lowers the settings', { todo: 'test first' }, async () => {
  const { SECTIONS, stepDrawer } = await mod();
  for (const s of SECTIONS) {
    assert.equal(stepDrawer(s.id, { type: 'back' }), 'menu');
    assert.equal(stepDrawer(s.id, { type: 'lower' }), 'down');
    assert.equal(stepDrawer(s.id, { type: 'more' }), 'down');
  }
  assert.equal(stepDrawer('menu', { type: 'back' }), 'down');
  assert.equal(stepDrawer('details', { type: 'back' }), 'down');
  assert.equal(stepDrawer('menu', { type: 'more' }), 'down');
  assert.equal(stepDrawer('details', { type: 'more' }), 'menu', 'the … on This walk shows the settings');
  assert.equal(stepDrawer('down', { type: 'back' }), 'down');
});

test('WD5: This walk in words, each line only when it has something to say', { todo: 'test first' }, async () => {
  const { walkDetailLines } = await mod();
  const walked = `${formatDistance(1234, 'km')} walked in 34 min`;
  assert.deepEqual(textOf(walkDetailLines(base)), ['Started at 2:14 pm', walked]);
  assert.deepEqual(textOf(walkDetailLines({ ...base, elapsedMs: 4 * 60_000 + 7_000 })), ['Started at 2:14 pm', `${formatDistance(1234, 'km')} walked in 4:07`], 'the strip\'s clock under ten minutes');
  const full = textOf(
    walkDetailLines({
      ...base,
      rideM: 3400,
      pausedMs: 6 * 60_000,
      street: 'Elm Street',
      heading: { label: 'the bakery', distanceM: 1200 },
      kept: { photos: 2, videos: 0, voices: 1, notes: 0 },
    }),
  );
  assert.deepEqual(full, [
    'Started at 2:14 pm',
    walked,
    `${formatDistance(3400, 'km')} by ride`,
    'Paused for 6 min',
    'On Elm Street',
    `Heading for the bakery, ${formatDistance(1200, 'km')} away`,
    formatCaptures({ photos: 2, videos: 0, voices: 1, notes: 0 }),
  ]);
});

test('WD7: no view says pace, speed, elevation, calories, a share, a goal, a countdown or a count in digits', { todo: 'test first' }, async () => {
  const { walkDetailLines, sectionLine, SECTIONS } = await mod();
  const banned = /pace|speed|\/km|\/mi|elevation|climb|calorie|kcal|heart|bpm|split|%|goal|target|to go|\bleft\b|remaining|\bof\b|streak|best/i;
  const all: string[] = [];
  for (const kept of [0, 1, 3, 12, 40]) {
    for (const gaps of [0, 1, 4]) {
      const lines = walkDetailLines({
        ...base,
        rideM: kept * 100,
        pausedMs: gaps * 60_000,
        street: kept ? 'Main Street' : null,
        heading: kept ? { label: 'the river', distanceM: kept * 300 } : null,
        kept: { photos: kept, videos: kept % 2, voices: kept % 3, notes: kept },
        gaps: Array.from({ length: gaps }, (_, k) => ({ ms: (k + 2) * 60_000, at: at(14, 30 + k) })),
        notRecording: gaps > 1,
      });
      for (const l of lines) {
        all.push(l.text);
        // A count is a word: only distances, times and clock times carry digits.
        if (l.key === 'kept' || l.key === 'recording') assert.doesNotMatch(l.text, /\d/, `${l.key}: ${l.text}`);
      }
    }
  }
  for (const s of SECTIONS) for (const exploring of [false, true]) all.push(s.name, sectionLine(s.id, { ...settings, exploring }));
  for (const t of all) assert.doesNotMatch(t, banned, t);
});

test('WD9, WD10: This walk\'s last row shows the menu; a raise after lowering starts fresh, never on a section', { todo: 'test first' }, async () => {
  const { stepDrawer } = await mod();
  assert.equal(stepDrawer('details', { type: 'settings' }), 'menu');
  assert.equal(stepDrawer('down', { type: 'pull' }), 'details');
  const lowered = stepDrawer(stepDrawer('menu', { type: 'pick', id: 'reminders' }), { type: 'lower' });
  assert.equal(stepDrawer(lowered, { type: 'pull' }), 'details');
  assert.equal(stepDrawer(lowered, { type: 'more' }), 'menu');
  assert.equal(stepDrawer('details', { type: 'pull' }), 'details', 'a pull on a raised drawer keeps its view');
});

test('WD11: the range ring shows on the Explore section only, and only when exploring', { todo: 'test first' }, async () => {
  const { ringShown } = await mod();
  assert.equal(ringShown('explore', true), true);
  assert.equal(ringShown('explore', false), false);
  for (const s of ['down', 'details', 'menu', 'map', 'reminders', 'motion'] as const) assert.equal(ringShown(s, true), false, s);
});

test('WD12: the numbers name the details; the … is expanded only on the settings', { todo: 'test first' }, async () => {
  const { numbersTail, moreExpanded } = await mod();
  assert.equal(numbersTail('down'), 'Walk details');
  for (const s of ['details', 'menu', 'explore'] as const) assert.equal(numbersTail(s), 'Lower the walk details', s);
  assert.equal(moreExpanded('menu'), true);
  assert.equal(moreExpanded('motion'), true);
  assert.equal(moreExpanded('details'), false);
  assert.equal(moreExpanded('down'), false);
});

test('WD17: the raised height leaves the riding captures clear of the top row, never taller than 60%', { todo: 'test first' }, async () => {
  const { liftedHeight } = await mod();
  const stack = 12 + 3 * 56 + 2 * 12;
  // A 667 pt phone: 20 pt of status bar, the 44 pt top row, 8 pt of air.
  const small = liftedHeight({ areaH: 667, rest: 69, top: 72, stack });
  assert.ok(small + stack <= 667 - 72, `667: ${small}`);
  assert.equal(liftedHeight({ areaH: 844, rest: 69 + 34, top: 47 + 52, stack }), Math.round(844 * 0.6), 'a tall phone keeps 60%');
  assert.ok(liftedHeight({ areaH: 400, rest: 69, top: 72, stack }) >= 69, 'never below the strip');
});

test('WD18: the lows stay in, in words', { todo: 'test first' }, async () => {
  const { walkDetailLines } = await mod();
  const one = textOf(walkDetailLines({ ...base, gaps: [{ ms: 6 * 60_000, at: at(14, 31) }] }));
  assert.ok(one.includes('No signal for 6 min, at 2:31 pm'), one.join(' | '));
  const three = textOf(walkDetailLines({ ...base, gaps: [4, 6, 4].map((m, k) => ({ ms: m * 60_000, at: at(14, 20 + k) })) }));
  assert.ok(three.includes('No signal three times, 14 min in all'), three.join(' | '));
  const two = textOf(walkDetailLines({ ...base, gaps: [3, 4].map((m, k) => ({ ms: m * 60_000, at: at(14, 20 + k) })) }));
  assert.ok(two.includes('No signal twice, 7 min in all'), two.join(' | '));
  assert.ok(textOf(walkDetailLines({ ...base, notRecording: true })).includes('Not recording now'));
  assert.ok(!textOf(walkDetailLines(base)).some((t) => /signal|recording/i.test(t)), 'nothing when neither happened');
});
