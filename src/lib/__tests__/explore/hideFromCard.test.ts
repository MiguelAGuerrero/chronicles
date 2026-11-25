// Hide a kind of place from its card, and clock towers apart from water towers (specs/poi-hide-from-card HK1-HK10,
// decision 0254; poi-hide-from-card audit 1-7, the plan review). The card's head, the sheet's rows, the switches they
// share with What I'm into, the page's row to open at, the split of the towers and a tower kept before it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isKindHidden } from '../../discovery/refinements';
import { isSubtype } from '../../discovery/subtypes';
import type { Kind } from '../../discovery/types';
import { KINDS, kindOf, parseHidden, visibleMarks, foundLine, type ChecklistItem } from '../../explore/explore';
import { withKind } from '../../explore/settingsChange';
import type { ExploreSettings } from '../../explore/settings';
import { classesOfArchive, subsetOf } from '../../presence/presence';

const DEFAULT_SETTINGS: ExploreSettings = { hidden: new Set(), rangeM: 100, passM: 8, haptic: false };

// Loaded in each test, so a todo fails for its own reason while the module lacks what it names.
const card = () => import('../../explore/placeCard');
const into = () => import('../../explore/intoPage');
const gate = () => import('../../intoGate');

const item = (key: string, kind: Kind, at: [number, number] = [0, 0.0003]): ChecklistItem => ({
  key, area_key: null, name: key, category: kindOf(kind).category, kind, at, generic: false,
});
const shownKeys = (items: ChecklistItem[], hidden: Set<Kind>, found = new Set<string>()) =>
  visibleMarks({ items, here: [0, 0], rangeM: 300, found, hidden, revealed: new Set() }).map((m) => m.item.key).sort();

test('HK1: an unfound card\'s muted line names its kind and its subtype, from the kinds\' own names', async () => {
  const { cardKinds, cardHead } = await card();
  assert.equal(cardKinds('plaques').line, 'Monuments and memorials · Plaques');
  assert.equal(cardKinds('museums').line, 'Museums and galleries');
  assert.equal(cardKinds('community_parks').line, 'Parks and gardens · Community parks');
  // The words are the tables' own, never a literal: every kind's line is built from KINDS' labels.
  for (const k of KINDS) {
    const { title, subtitle, line } = cardKinds(k.id);
    assert.equal(line, subtitle ? `${kindOf(title).label} · ${kindOf(subtitle).label}` : kindOf(title).label, k.id);
  }
  const head = cardHead({ name: 'Founders Plaque', kind: 'plaques', named: true, found: false });
  assert.deepEqual(head, { title: 'Founders Plaque', line: 'Monuments and memorials · Plaques', more: true });
});

test('poi-hide-from-card audit 1: a ? card\'s head reads A place to find alone; its kind and subtype only in its sheet', async () => {
  const { cardHead, kindsSheet } = await card();
  const head = cardHead({ name: 'Founders Plaque', kind: 'plaques', named: false, found: false });
  assert.deepEqual(head, { title: 'A place to find', line: null, more: true });
  assert.deepEqual(kindsSheet('plaques', new Set()).rows.map((r) => r.label), ['Monuments and memorials', 'Plaques']);
});

test('HK2: the sheet\'s rows are the kind as a title and its subtype as a subtitle; a kind with no subtype has its title alone', async () => {
  const { kindsSheet, KINDS_SHEET_TITLE } = await card();
  assert.equal(KINDS_SHEET_TITLE, 'Show on the map');
  const s = kindsSheet('plaques', new Set());
  assert.deepEqual(s.rows.map((r) => [r.id, r.label, r.depth, r.heavy]), [['monuments', 'Monuments and memorials', 0, true], ['plaques', 'Plaques', 1, false]]);
  assert.equal(s.at, 'monuments');
  assert.deepEqual(kindsSheet('museums', new Set()).rows.map((r) => r.id), ['museums']);
  assert.deepEqual(kindsSheet('monuments', new Set()).rows.map((r) => r.id), ['monuments']);
});

test('HK3: each switch is What I\'m into\'s: the subtype off hides only it, the kind off hides it and its subtypes, on brings them back', async () => {
  const { kindsSheet } = await card();
  const items = [item('plaque', 'plaques'), item('memorial', 'war_memorials'), item('museum', 'museums')];
  let s = { ...DEFAULT_SETTINGS, hidden: new Set<Kind>() };
  const flip = (id: Kind, on: boolean) => {
    s = withKind(s, id, on)!;
  };
  assert.deepEqual(shownKeys(items, s.hidden), ['memorial', 'museum', 'plaque']);
  flip('plaques', false);
  assert.deepEqual(shownKeys(items, s.hidden), ['memorial', 'museum']);
  assert.deepEqual(kindsSheet('plaques', s.hidden).rows.map((r) => r.on), [true, false]);
  flip('monuments', false);
  assert.deepEqual(shownKeys(items, s.hidden), ['museum']);
  flip('monuments', true);
  flip('plaques', true);
  assert.deepEqual(shownKeys(items, s.hidden), ['memorial', 'museum', 'plaque']);
});

test('poi-hide-from-card audit 3: a found place of a hidden kind stays drawn, and on in What I\'m into brings the rest back', async () => {
  const { kindsSheet } = await card();
  const items = [item('plaque', 'plaques'), item('found plaque', 'plaques', [0, 0.0004])];
  const off = withKind({ ...DEFAULT_SETTINGS, hidden: new Set() }, 'plaques', false)!;
  assert.deepEqual(shownKeys(items, off.hidden, new Set(['found plaque'])), ['found plaque']);
  // What I'm into's page turns the same switch back on (`useExploreSettings`' setKind is `withKind`).
  const back = withKind(off, 'plaques', true)!;
  assert.deepEqual(shownKeys(items, back.hidden, new Set(['found plaque'])), ['found plaque', 'plaque']);
  assert.deepEqual(kindsSheet('plaques', back.hidden).rows.map((r) => r.on), [true, true]);
});

test('poi-hide-from-card audit 6: with its kind off the subtype\'s row stays in place, off and dimmed, spoken Part of its kind', async () => {
  const { kindsSheet } = await card();
  const s = kindsSheet('plaques', new Set<Kind>(['monuments']));
  assert.deepEqual(s.rows.map((r) => [r.id, r.on, r.locked]), [['monuments', false, false], ['plaques', false, true]]);
  assert.equal(s.rows[1].hint, 'Part of Monuments and memorials');
});

test('HK4: a ? card\'s sheet and line name its kind and subtype, never the place', async () => {
  const { kindsSheet, cardHead, KINDS_SHEET_TITLE } = await card();
  const name = 'Hessian Memorial';
  const head = cardHead({ name, kind: 'war_memorials', named: false, found: false });
  const words = [head.title, head.line ?? '', KINDS_SHEET_TITLE, ...kindsSheet('war_memorials', new Set()).rows.flatMap((r) => [r.label, r.hint ?? ''])].join(' ');
  assert.ok(!words.includes(name), words);
  assert.match(words, /Monuments and memorials/);
  assert.match(words, /War memorials/);
});

test('HK5: a found card has no More and no kind line; its head is today\'s name · kind', async () => {
  const { cardHead } = await card();
  assert.deepEqual(cardHead({ name: 'Hessian Memorial', kind: 'war_memorials', named: true, found: true }), { title: 'Hessian Memorial · War memorials', line: null, more: false });
});

test('HK6: the page opens at a kind\'s row: the param is read as a kind, and the scroll stands it under its heading', async () => {
  const { intoAt, intoScrollY, intoSections, intoChildren } = await into();
  assert.equal(intoAt('monuments'), 'monuments');
  assert.equal(intoAt('towers'), null);
  assert.equal(intoAt('nonsense'), null);
  assert.equal(intoAt(undefined), null);
  const { children } = intoChildren(intoSections(KINDS, new Set()), []);
  const heights = children.map((c) => (c.type === 'heading' ? 52 : 48));
  const i = children.findIndex((c) => c.type === 'row' && c.row.id === 'monuments');
  const top = heights.slice(0, i).reduce((a, b) => a + b, 0);
  assert.equal(intoScrollY(children, heights, 'monuments', () => 52), top - 52);
  // Not until every child above the row has its height.
  const partial: (number | undefined)[] = [...heights];
  partial[1] = undefined;
  assert.equal(intoScrollY(children, partial, 'monuments', () => 52), null);
  // The way in names the row: `/into?from=walk&at=monuments`.
  const { createIntoNav } = await gate();
  const pushed: unknown[] = [];
  const nav = createIntoNav({ push: (h) => pushed.push(h), now: () => 0 });
  (nav.open as (from: 'walk' | 'ready', at?: Kind) => boolean)('walk', 'monuments');
  assert.deepEqual(pushed, [{ pathname: '/into', params: { from: 'walk', at: 'monuments' } }]);
});

test('HK8, poi-hide-from-card audit 4: no numeral in the card\'s kind line or the sheet\'s words', async () => {
  const { cardKinds, kindsSheet, KINDS_SHEET_TITLE } = await card();
  for (const k of KINDS) {
    const words = [cardKinds(k.id).line, KINDS_SHEET_TITLE, ...kindsSheet(k.id, new Set()).rows.flatMap((r) => [r.label, r.hint ?? ''])].join(' ');
    assert.ok(!/\d/.test(words), `${k.id}: ${words}`);
  }
});

test('poi-hide-from-card audit 5: the sheet\'s rows draw no icon; Water towers has the plain dot on What I\'m into', async () => {
  const { kindsSheet } = await card();
  for (const r of kindsSheet('water_towers' as Kind, new Set()).rows) assert.equal('icon' in r, false, r.id);
  assert.equal(KINDS.find((k) => k.id === ('water_towers' as Kind))?.icon, 'ellipse-outline');
  assert.equal(KINDS.find((k) => k.id === ('clock_towers' as Kind))?.icon, 'time-outline');
});

test('HK9: Clock towers and Water towers are two rows, both on; the shared switch off keeps both off', () => {
  const ids = KINDS.map((k) => k.id as string);
  assert.ok(!ids.includes('towers'), 'no shared row');
  const i = ids.indexOf('clock_towers');
  assert.ok(i > ids.indexOf('structures') && ids[i + 1] === 'water_towers', 'after one another under Buildings and structures');
  assert.equal(kindOf('clock_towers' as Kind).label, 'Clock towers');
  assert.equal(kindOf('water_towers' as Kind).label, 'Water towers');
  const fresh = parseHidden(null, null);
  assert.ok(!fresh.has('clock_towers' as Kind) && !fresh.has('water_towers' as Kind), 'both on by default');
  const knewBefore = JSON.stringify(KINDS.map((k) => k.id).filter((k) => !['clock_towers', 'water_towers'].includes(k)).concat(['towers' as Kind]));
  const off = parseHidden(JSON.stringify(['towers']), knewBefore);
  assert.ok(off.has('clock_towers' as Kind) && off.has('water_towers' as Kind), 'the shared switch off keeps both off');
  const on = parseHidden(JSON.stringify([]), knewBefore);
  assert.ok(!on.has('clock_towers' as Kind) && !on.has('water_towers' as Kind), 'the shared switch on keeps both on');
  // A reader who has seen the new rows keeps their own choice.
  const seen = parseHidden(JSON.stringify(['water_towers']), JSON.stringify(KINDS.map((k) => k.id)));
  assert.ok(seen.has('water_towers' as Kind) && !seen.has('clock_towers' as Kind));
  // Presence: each class to its own subtype; nothing else of the class moved.
  assert.equal(subsetOf(classesOfArchive('clock_tower')), 'clock_towers');
  assert.equal(subsetOf(classesOfArchive('water_tower')), 'water_towers');
});

test('HK10, poi-hide-from-card audit 2: a tower kept before the split reads as Buildings and structures, hidden when its parent or both new switches are off, and a find of one reads Water and clock towers', async () => {
  const { cardKinds, kindsSheet } = await card();
  const old = 'towers' as Kind;
  assert.equal(cardKinds(old).line, 'Buildings and structures');
  assert.deepEqual(kindsSheet(old, new Set()).rows.map((r) => r.id), ['structures']);
  assert.equal(isKindHidden(new Set<Kind>(['clock_towers' as Kind]), old), false);
  assert.equal(isKindHidden(new Set<Kind>(['clock_towers', 'water_towers'] as Kind[]), old), true);
  assert.equal(isKindHidden(new Set<Kind>(['structures']), old), true);
  assert.equal(foundLine({ name: 'Town Hall Clock', category: 'history', generic: false, kind: old }), 'Found: Town Hall Clock · Water and clock towers');
  // Still a subtype to the planner, the scenic routes and the outing (`p.generic && isSubtype(p.kind)`), as it was.
  assert.equal(isSubtype(old), true);
});

test('HK10: closed with its place\'s kind off, the sheet leaves no card; a found place\'s card stays', async () => {
  const { cardGoes } = await card();
  assert.equal(cardGoes({ kind: 'plaques', found: false }, new Set<Kind>(['plaques'])), true);
  assert.equal(cardGoes({ kind: 'plaques', found: false }, new Set<Kind>(['monuments'])), true);
  assert.equal(cardGoes({ kind: 'plaques', found: false }, new Set<Kind>(['war_memorials'])), false);
  assert.equal(cardGoes({ kind: 'plaques', found: true }, new Set<Kind>(['plaques'])), false);
});

test('HK10, poi-hide-from-card audit 7: the sheet draws no switch before the settings are read, and a failed read says What I\'m into\'s sentence', async () => {
  const { kindsSheetBody } = await card();
  const { INTO_UNREAD } = await into();
  assert.deepEqual(kindsSheetBody(null, false), { rows: false, line: null });
  assert.deepEqual(kindsSheetBody(null, true), { rows: false, line: INTO_UNREAD });
  assert.deepEqual(kindsSheetBody({ hidden: new Set() }, false), { rows: true, line: null });
});
