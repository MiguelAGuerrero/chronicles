/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../geo';
import { placeKey } from '../discovery/places';
import {
  SCAN_RULES,
  adoptable,
  candidatesFrom,
  drawWeighted,
  foundBy,
  isRevealed,
  marksFromScan,
  pickMarks,
  scanNote,
  scanSummary,
  toReplace,
  type Prefs,
} from '../discovery/scan';
import type { CategoryId, Mark, Offered, Place } from '../discovery/types';
import type { LngLat } from '../types';

// Slice 2 of v1 (scan), written from criteria S2-S15 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** A point x metres east and y metres north of O. */
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const place = (name: string, category: CategoryId, at: LngLat, generic = false): Place => ({
  key: placeKey(category, generic ? null : name, at), name, category, at, generic, build: 'b1',
});
/** A seeded random source, so draws repeat. */
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const ALL_NORMAL: Prefs = {};
const CATS: CategoryId[] = ['art', 'food', 'shops', 'history', 'parks', 'culture', 'viewpoints', 'nightlife'];
/** A ring of places, 150 m apart around a 300 m circle, cycling through the categories. */
const ring = (n = 12, r = 300): Place[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return place(`Spot ${i}`, CATS[i % CATS.length], m(r * Math.cos(a), r * Math.sin(a)));
  });

test('scan: the rules live in SCAN_RULES (S3)', () => {
  assert.equal(SCAN_RULES.radiusM, 500);
  assert.equal(SCAN_RULES.count, 6);
  assert.equal(SCAN_RULES.spacingM, 100);
  assert.equal(SCAN_RULES.clearM, 60);
  assert.equal(SCAN_RULES.revealM, 60);
  assert.equal(SCAN_RULES.homeDays, 14);
});

test('scan: only places inside 500 m are candidates (S2)', () => {
  const inside = ring(12, 300);
  const outside = [place('Far Cafe', 'food', m(520, 0)), place('Far Park', 'parks', m(0, -700))];
  for (let seed = 1; seed < 30; seed++) {
    const got = pickMarks({ candidates: [...inside, ...outside], center: O, offered: [], prefs: ALL_NORMAL, random: rng(seed) });
    assert.ok(got.picked.every((p) => distanceM(p.at, O) <= 500), `seed ${seed}`);
  }
});

test('scan: 6 marks when there are enough places; weights 2, 1, 0.5 (S3)', () => {
  const got = pickMarks({ candidates: ring(16, 400), center: O, offered: [], prefs: ALL_NORMAL, random: rng(7) });
  assert.equal(got.picked.length, 6);
  assert.equal(got.outcome, 'full');
  // The weighted draw, over 10k draws.
  const r = rng(3);
  const n: Record<string, number> = { more: 0, normal: 0, less: 0 };
  for (let i = 0; i < 10_000; i++) n[drawWeighted([['more', 2], ['normal', 1], ['less', 0.5]], r)!]++;
  assert.ok(Math.abs(n.more / n.normal - 2) < 0.2, `more/normal ${n.more / n.normal}`);
  assert.ok(Math.abs(n.less / n.normal - 0.5) < 0.08, `less/normal ${n.less / n.normal}`);
  assert.equal(drawWeighted([], r), null);
});

test('scan: 1-2 wildcards ignore preferences (S3)', () => {
  // Every category but parks is "less"; one park far from the rest. Over many
  // scans the park, drawn by weight 2 on its own, shows up, and the "less"
  // places still fill the wildcard slots.
  const prefs: Prefs = Object.fromEntries(CATS.map((c) => [c, c === 'food' ? 'more' : 'less']));
  let art = 0;
  let scans = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const cands = [
      ...Array.from({ length: 10 }, (_, i) => place(`Cafe ${i}`, 'food', m(-400 + i * 110, 200))),
      ...Array.from({ length: 10 }, (_, i) => place(`Art ${i}`, 'art', m(-400 + i * 110, -200))),
    ];
    const got = pickMarks({ candidates: cands, center: O, offered: [], prefs, random: rng(seed) });
    if (got.picked.length === 6) {
      scans++;
      // At least the two wildcards can land on art; with art at "less" alone it would be rarer.
      art += got.picked.filter((p) => p.category === 'art').length;
    }
  }
  assert.ok(scans > 150);
  // With weights alone, art would be 0.5 / 2.5 = 20% of slots; wildcards (two of six, half on art) lift it.
  assert.ok(art / (scans * 6) > 0.25, `${art / (scans * 6)}`);
});

test('scan: a mark does not tell a wildcard from a match (S4)', () => {
  const got = pickMarks({ candidates: ring(16, 400), center: O, offered: [], prefs: ALL_NORMAL, random: rng(5) });
  const marks = marksFromScan(got.picked, { walkId: 'w1', now: 1000, newId: (() => { let i = 0; return () => `m${i++}`; })() });
  const shapes = new Set(marks.map((x) => Object.keys(x).sort().join(',')));
  assert.equal(shapes.size, 1);
  assert.ok(marks.every((x) => !('wildcard' in x)));
  assert.ok(marks.every((x) => x.state === 'open' && x.origin === 'scan' && x.walk_id === 'w1'));
});

test('scan: marks 100 m apart, none within 60 m of the center (S5)', () => {
  // A dense grid every 30 m, so spacing is what limits the picks.
  const dense: Place[] = [];
  for (let x = -450; x <= 450; x += 30) for (let y = -300; y <= 300; y += 30) dense.push(place(`P${x},${y}`, CATS[(x + y) & 7 & 7], m(x, y)));
  for (let seed = 1; seed < 40; seed++) {
    const { picked } = pickMarks({ candidates: dense, center: O, offered: [], prefs: ALL_NORMAL, random: rng(seed) });
    assert.equal(picked.length, 6);
    for (const p of picked) assert.ok(distanceM(p.at, O) > 60, 'clear of the center');
    for (let i = 0; i < picked.length; i++)
      for (let j = i + 1; j < picked.length; j++) assert.ok(distanceM(picked[i].at, picked[j].at) >= 100, 'spaced');
  }
});

test('scan: offered places never return (S6)', () => {
  const cands = ring(8, 300);
  const offered: Offered[] = cands.slice(0, 5).map((p) => ({ ...p, offered_at: 1, origin: 'scan' }));
  for (let seed = 1; seed < 20; seed++) {
    const { picked } = pickMarks({ candidates: cands, center: O, offered, prefs: ALL_NORMAL, random: rng(seed) });
    assert.ok(picked.every((p) => !offered.some((o) => o.key === p.key)));
  }
  // A same-named place nudged 30 m counts as offered (D6).
  const moved = place('Spot 0', cands[0].category, [cands[0].at[0] + 30 * dLon, cands[0].at[1]]);
  const { picked } = pickMarks({ candidates: [moved], center: O, offered, prefs: ALL_NORMAL, random: rng(1) });
  assert.equal(picked.length, 0);
});

test('scan: a "?" mark is revealed within 60 m of an accepted fix (S7)', () => {
  const [p] = ring(1, 300);
  const [mark] = marksFromScan([p], { walkId: 'w1', now: 0, newId: () => 'm' });
  assert.equal(isRevealed(mark, [m(300 - 55, 0)]), true);
  assert.equal(isRevealed(mark, [m(300 - 70, 0)]), false);
  assert.equal(isRevealed({ ...mark, state: 'found' }, []), true, 'a found mark stays revealed');
});

test('scan: a capture within 60 m resolves the nearer open mark as found (S8)', () => {
  const marks = marksFromScan([place('A', 'food', m(100, 0)), place('B', 'art', m(140, 0))], { walkId: 'w1', now: 0, newId: (() => { let i = 0; return () => `m${i++}`; })() });
  assert.equal(foundBy(m(125, 0), marks)?.name, 'B');
  assert.equal(foundBy(m(110, 0), marks)?.name, 'A');
  assert.equal(foundBy(m(250, 0), marks), null);
  assert.equal(foundBy(m(100, 0), marks.map((x) => (x.name === 'A' ? { ...x, state: 'dismissed' as const } : x)))?.name, 'B', 'only open marks');
});

test('scan: a re-scan replaces the walk’s open marks and keeps resolved ones (S10)', () => {
  const base = { key: 'k', name: 'n', category: 'food' as const, at: O, generic: false, origin: 'scan' as const, created_at: 0, resolved_at: null, capture_id: null };
  const marks: Mark[] = [
    { ...base, id: 'a', walk_id: 'w1', state: 'open' },
    { ...base, id: 'b', walk_id: 'w1', state: 'found' },
    { ...base, id: 'c', walk_id: 'w1', state: 'dismissed' },
    { ...base, id: 'd', walk_id: 'w2', state: 'open' },
  ];
  assert.deepEqual(toReplace(marks, 'w1'), ['a']);
});

test('scan: home marks attach to the next walk, and expire after 14 days (S11)', () => {
  const day = 86_400_000;
  const base = { key: 'k', name: 'n', category: 'food' as const, at: O, generic: false, origin: 'scan' as const, resolved_at: null, capture_id: null, walk_id: null };
  const now = 30 * day;
  const marks: Mark[] = [
    { ...base, id: 'fresh', state: 'open', created_at: now - 2 * day },
    { ...base, id: 'old', state: 'open', created_at: now - 15 * day },
    { ...base, id: 'done', state: 'found', created_at: now - day },
    { ...base, id: 'walked', state: 'open', created_at: now - day, walk_id: 'w0' },
  ];
  assert.deepEqual(adoptable(marks, now), ['fresh']);
});

test('scan: the card counts finds by category, found and dismissed (S13)', () => {
  const base = { key: 'k', name: 'n', at: O, generic: false, origin: 'scan' as const, created_at: 0, resolved_at: 1, capture_id: null, walk_id: 'w1' };
  const marks: Mark[] = [
    { ...base, id: '1', category: 'food', state: 'found' },
    { ...base, id: '2', category: 'food', state: 'found' },
    { ...base, id: '3', category: 'art', state: 'found' },
    { ...base, id: '4', category: 'parks', state: 'dismissed' },
    { ...base, id: '5', category: 'parks', state: 'open' },
    { ...base, id: '6', category: 'parks', state: 'replaced' },
  ];
  assert.deepEqual(scanSummary(marks), { finds: '2 food & drink · 1 art', found: 3, dismissed: 1 });
  assert.equal(scanSummary([]), null);
});

test('scan: too few, none and failed reads (S15)', () => {
  const two = [place('A', 'food', m(200, 0)), place('B', 'art', m(-200, 0))];
  const few = pickMarks({ candidates: two, center: O, offered: [], prefs: ALL_NORMAL, random: rng(1) });
  assert.equal(few.picked.length, 2);
  assert.equal(few.outcome, 'few');
  assert.equal(scanNote(few.outcome, 2), 'Only 2 spots nearby');
  const none = pickMarks({ candidates: [], center: O, offered: [], prefs: ALL_NORMAL, random: rng(1) });
  assert.equal(none.outcome, 'none');
  assert.equal(scanNote('none', 0), 'Nothing to find here yet');
  assert.equal(scanNote('failed', 0), 'Couldn’t read the map here');
  assert.equal(scanNote('full', 6), null);
  assert.equal(scanNote('few', 1), 'Only 1 spot nearby');
});

// Audit regressions (slice 1, as they bear on the scan).

test('scan: one place keyed twice across a rounding line is offered once (audit 3)', () => {
  // Either side of -71.40005: two keys for one café 0.3 m apart.
  const a = place('Twin Cafe', 'food', [-71.400052, 41.8145]);
  const b = place('Twin Cafe', 'food', [-71.400048, 41.8145]);
  assert.notEqual(a.key, b.key);
  for (let seed = 1; seed < 10; seed++) {
    const { picked } = pickMarks({ candidates: [a, b], center: O, offered: [], prefs: {}, random: rng(seed) });
    assert.equal(picked.length, 1);
  }
});

test('scan: cached places from another build are not candidates (audit 7)', () => {
  const read = [place('New', 'food', m(200, 0))];
  const cached = [{ ...place('Old', 'art', m(-200, 0)), build: 'b0' }, place('Kept', 'parks', m(0, 200))];
  assert.deepEqual(candidatesFrom(read, cached, 'b1').map((p) => p.name).sort(), ['Kept', 'New']);
});
