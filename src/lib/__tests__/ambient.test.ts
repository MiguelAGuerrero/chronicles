/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AMBIENT_RULES, ambientCheck, ambientText, headingOfFixes, walkSilent } from '../discovery/ambient';
import { placeKey } from '../discovery/places';
import { isRevealed, marksFromScan } from '../discovery/scan';
import { decodeTile } from '../discovery/tileDecode';
import { placesFromTilePois } from '../discovery/tilePois';
import type { CategoryId, Offered, Place } from '../discovery/types';
import { tileAt } from '../tileMath';
import type { LngLat, StreetSegment, TracePoint } from '../types';
import { encodeTile, type FixtureFeature } from './mvtFixture';

// Slice 3 of v1 (ambient), written from criteria A2-A11 before the code.

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
const T0 = Date.UTC(2026, 9, 31, 15);
const place = (name: string, category: CategoryId, at: LngLat): Place => ({ key: placeKey(category, name, at), name, category, at, generic: false, build: 'b1' });
/** Walking north along x = 0 at 1.25 m/s, one fix every 4 s (5 m apart), ending at (0, 0). */
const walkNorth = (n = 12, over: Partial<TracePoint> = {}): TracePoint[] =>
  Array.from({ length: n }, (_, i) => {
    const [lon, lat] = m(0, -(n - 1 - i) * 5);
    return { walk_id: 'w1', t: T0 + i * 4000, lat, lon, accuracy_m: 5, speed: 1.25, course: null, ...over };
  });
/** A street piece nobody has walked, running east-west through y. */
const street = (y: number, x0 = -200, x1 = 200): StreetSegment => ({
  id: `s${y}`, name: 'Hope Street', kind_detail: 'residential', length_m: x1 - x0, build: 'b1', geometry: [[m(x0, y), m(x1, y)]],
});
/** A walk id the 25% draw lets through. */
const LIVE_WALK = (() => {
  for (let i = 0; ; i++) if (!walkSilent(`w${i}`)) return `w${i}`;
})();
const check = (over: Partial<Parameters<typeof ambientCheck>[0]> = {}) =>
  ambientCheck({
    enabled: true,
    quiet: false,
    walkId: LIVE_WALK,
    startedAt: T0 - 1000,
    pauses: [],
    fixes: walkNorth(),
    places: [place('Coffee Exchange', 'food', m(0, 100))],
    unwalked: [street(100)],
    offered: [],
    fired: { count: 0, lastAt: null },
    now: T0 + 60_000,
    pursuing: false,
    random: () => 0.1,
    ...over,
  });

test('ambient: the rules live in AMBIENT_RULES (A6)', () => {
  assert.equal(AMBIENT_RULES.reachM, 150);
  assert.equal(AMBIENT_RULES.coneDeg, 45);
  assert.equal(AMBIENT_RULES.streetM, 30);
  assert.equal(AMBIENT_RULES.perWalk, 3);
  assert.equal(AMBIENT_RULES.gapMs, 10 * 60_000);
  assert.equal(AMBIENT_RULES.silentWalkP, 0.25);
  assert.equal(AMBIENT_RULES.coinP, 0.5);
  assert.equal(AMBIENT_RULES.revealM, 30);
});

test('ambient: off by default; quiet walk silences it (A2)', () => {
  assert.ok(check());
  assert.equal(check({ enabled: false }), null);
  assert.equal(check({ quiet: true }), null);
});

test('ambient: the gate reads accepted fixes only (A3)', () => {
  // The last fix is a 90 m-accuracy jump toward a place off to the east: dropped, so the heading stays north.
  const fixes = walkNorth();
  const [lon, lat] = m(30, 5);
  fixes.push({ walk_id: 'w1', t: T0 + 48_000, lat, lon, accuracy_m: 90, speed: 1.25, course: null });
  const east = place('East Cafe', 'food', m(120, 5));
  assert.equal(check({ fixes, places: [east], unwalked: [street(5)] }), null);
});

test('ambient: within 150 m and ±45° ahead; course, else a fix 20-30 m back; none, no alert (A4)', () => {
  assert.ok(check({ places: [place('Near', 'food', m(0, 140))], unwalked: [street(140)] }));
  assert.equal(check({ places: [place('Far', 'food', m(0, 160))], unwalked: [street(160)] }), null, 'beyond 150 m');
  assert.equal(check({ places: [place('Side', 'food', m(100, 50))], unwalked: [street(50)] }), null, 'over 45° off');
  assert.equal(check({ places: [place('Behind', 'food', m(0, -100))], unwalked: [street(-100)] }), null, 'behind');
  // The heading: the device's course when it has one.
  const east = walkNorth(12, { course: 90 });
  assert.equal(headingOfFixes(east), 90);
  // Else the bearing from a fix 20-30 m back: north here.
  assert.ok(Math.abs(headingOfFixes(walkNorth())! - 0) < 1);
  // Only 10 m walked: no fix 20 m back, so no heading and no alert.
  assert.equal(headingOfFixes(walkNorth(3)), null);
  assert.equal(check({ fixes: walkNorth(3) }), null);
  // Standing still for a while then walking: a fix more than 30 m back doesn't stand in.
  const gap = walkNorth(2);
  gap.unshift({ ...gap[0], t: gap[0].t - 60_000, lat: m(0, -45)[1] });
  assert.equal(headingOfFixes(gap), null);
});

test('ambient: a walked street or an offered place disqualifies (A5)', () => {
  const p = place('Coffee Exchange', 'food', m(0, 100));
  assert.equal(check({ unwalked: [] }), null, 'no unwalked street beside it');
  assert.equal(check({ unwalked: [street(140)] }), null, 'the street is 40 m away');
  const offered: Offered[] = [{ key: p.key, name: p.name, category: p.category, at: p.at, generic: false, offered_at: 1, origin: 'scan' }];
  assert.equal(check({ offered }), null);
});

test('ambient: 3 a walk, 10 min apart; a quarter of walks have none; a coin for each (A6)', () => {
  assert.equal(check({ fired: { count: 3, lastAt: T0 - 3_600_000 } }), null);
  assert.equal(check({ fired: { count: 1, lastAt: T0 + 60_000 - 9 * 60_000 } }), null);
  assert.ok(check({ fired: { count: 1, lastAt: T0 + 60_000 - 10 * 60_000 } }));
  assert.equal(check({ random: () => 0.9 }), null, 'the coin');
  let silent = 0;
  for (let i = 0; i < 4000; i++) if (walkSilent(`walk-${i}`)) silent++;
  assert.ok(Math.abs(silent / 4000 - 0.25) < 0.03, `${silent / 4000}`);
  assert.equal(walkSilent('walk-7'), walkSilent('walk-7'), 'the same walk draws the same, across restarts');
  const quietWalk = (() => {
    for (let i = 0; ; i++) if (walkSilent(`q${i}`)) return `q${i}`;
  })();
  assert.equal(check({ walkId: quietWalk }), null);
});

test('ambient: the words give category, distance and side, never the name (A7)', () => {
  assert.equal(ambientText('art', 123, 'left'), 'Some art, 120 m ahead, on your left');
  assert.equal(ambientText('food', 87, 'ahead'), 'Somewhere to eat, 90 m ahead');
  const got = check({ places: [place('Coffee Exchange', 'food', m(20, 100))], unwalked: [street(100)] })!;
  assert.equal(got.side, 'right');
  assert.ok(!got.text.includes('Coffee'));
  assert.equal(got.text, 'Somewhere to eat, 100 m ahead, on your right');
});

test('ambient: silent while a scan mark is pursued or an ambient mark is open (A8)', () => {
  assert.equal(check({ pursuing: true }), null);
});

test('ambient: an alert is an ambient mark, revealed at 30 m (A9, A10)', () => {
  const got = check()!;
  const [mark] = marksFromScan([got.place], { walkId: LIVE_WALK, now: T0, newId: () => 'a1', origin: 'ambient' });
  assert.equal(mark.origin, 'ambient');
  assert.equal(isRevealed(mark, [m(0, 100 - 35)]), false, 'a scan mark would show at 35 m; an ambient one waits');
  assert.equal(isRevealed(mark, [m(0, 100 - 25)]), true);
});

test('ambient: a decoded tile yields the same places as the map read (A11)', () => {
  const t = tileAt(O);
  const pois: FixtureFeature[] = [
    { layer: 'poi', props: { class: 'cafe', subclass: 'cafe', name: 'Coffee Exchange' }, coords: m(12.3, 20.7) },
    { layer: 'poi', props: { class: 'art_gallery', subclass: 'artwork' }, coords: m(-40.2, 60.1) },
    { layer: 'poi', props: { class: 'bus', subclass: 'bus_stop', name: 'Wickenden at Hope' }, coords: m(5, 5) },
  ];
  const road: FixtureFeature = { layer: 'transportation', props: { class: 'minor' }, coords: [m(-100, 0), m(100, 0)] };
  const name: FixtureFeature = { layer: 'transportation_name', props: { class: 'minor', name: 'Hope Street' }, coords: [m(-100, 0), m(100, 0)] };
  const bytes = encodeTile([...pois, road, name], 14, t.x, t.y);
  const got = decodeTile(bytes, 14, t.x, t.y);
  assert.equal(got.roads.length, 1);
  assert.equal(got.names.length, 1);
  const fromTile = placesFromTilePois(got.pois, 'b1');
  const fromMap = placesFromTilePois(
    pois.map((p) => ({ geometry: { type: 'Point', coordinates: p.coords as LngLat }, properties: p.props })),
    'b1',
  );
  assert.deepEqual(fromTile.map((p) => `${p.category}:${p.name}`).sort(), fromMap.map((p) => `${p.category}:${p.name}`).sort());
  for (const p of fromTile) {
    const q = fromMap.find((x) => x.name === p.name)!;
    assert.ok(Math.abs(p.at[0] - q.at[0]) < 1e-5 && Math.abs(p.at[1] - q.at[1]) < 1e-5, 'within a metre');
  }
});
