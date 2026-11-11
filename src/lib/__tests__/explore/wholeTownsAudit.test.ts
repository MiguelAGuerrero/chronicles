/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BORDER, RING_COLOR, WAITING_DOT_EDGE } from '../../../components/map/types';
import { hoodAllowed, type OutlineSet } from '../../areas/outlines';
import { AREA_RULES } from '../../areas/rules';
import type { PlaceCandidate, TownOutline } from '../../areas/types';
import { ATLAS_CODE, NEAR_KEPT, needsNear, townNeighborhoods, withNear, type AtlasArea, type AtlasMark, type NearRead } from '../../atlas/atlas';
import { borderReach, isWard } from '../../atlas/hoods';
import { areaMapMarks, dotAt, metresPerPx, PIN_ROOM, roomZoom, tapDoes, underPin, viewOf, waitingLabel, waitingPins } from '../../atlas/waitingPins';
import type { LngLat } from '../../types';

// The whole-towns audit (specs/whole-towns/spec.md, "Audit"): one regression test per accepted finding.

const O: LngLat = [-75.47, 40.6];
const east = (m: number, from: LngLat = O): LngLat => [from[0] + m / (111320 * Math.cos((from[1] * Math.PI) / 180)), from[1]];
const north = (m: number, from: LngLat = O): LngLat => [from[0], from[1] + m / 110574];
const row = (name: string, at: LngLat, o: Partial<AtlasArea> = {}): AtlasArea => ({
  key: name, level: 'neighborhood', name, at, reachM: 1000, build: 'b1', code: ATLAS_CODE, listed_at: 1, read_at: null, failed_at: null, profile: null, ...o,
});
const mark = (key: string, at: LngLat, category: AtlasMark['category'] = 'art'): AtlasMark => ({ key, category, at });
const tileOf = ([lon, lat]: LngLat, z: number): [number, number] => {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
};
const lonOf = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const rect = (w: number, s: number, e: number, n: number): LngLat[][] => [[[w, s], [e, s], [e, n], [w, n], [w, s]]];

test('whole-towns audit 1: a neighborhood inside the border but past the z10 tile edge of the town\'s point is listed', () => {
  const [x, y] = tileOf(O, 10);
  const edge = lonOf(x + 1, 10);
  // The city runs 3 km past the east edge of its point's tile; the first read is cut at the edge.
  const cut: TownOutline = { id: 'a', name: 'Allentown', at: O, polygons: [rect(O[0] - 0.05, O[1] - 0.03, edge, O[1] + 0.03)], bbox: [O[0] - 0.05, O[1] - 0.03, edge, O[1] + 0.03], areaM2: 1e8 };
  const first: OutlineSet = { tiles: new Set([`10/${x}/${y}`]), towns: [cut] };
  const beyond = borderReach({ name: 'Allentown', at: O }, first);
  assert.equal(beyond.length, 1, 'one spot past the cut edge');
  assert.deepEqual(tileOf(beyond[0], 10), [x + 1, y], 'in the tile east of it');
  // Read on: the whole border, and the neighborhood across the edge is the town's.
  const whole: TownOutline = { ...cut, polygons: [rect(cut.bbox[0], cut.bbox[1], edge + 0.04, cut.bbox[3])], bbox: [cut.bbox[0], cut.bbox[1], edge + 0.04, cut.bbox[3]] };
  const both: OutlineSet = { tiles: new Set([`10/${x}/${y}`, `10/${x + 1}/${y}`]), towns: [whole] };
  const big = row('Allentown', O, { level: 'town', reachM: 10_000 });
  const across: LngLat = [edge + 0.01, O[1]];
  assert.deepEqual(townNeighborhoods([row('Across', across), big], big, [big], O, 'b1', null, both).map((l) => l.area.name), ['Across']);
  assert.deepEqual(borderReach({ name: 'Allentown', at: O }, both), [], 'a whole border reads nothing more');
});

test('whole-towns audit 2: a dot\'s tap reach is 44 px at a town\'s whole-town zoom', () => {
  const mpp = metresPerPx(12, O[1]);
  const at30px = east(30 * mpp);
  assert.ok(30 * mpp > 150, 'past the old 150 m cap');
  assert.equal(dotAt(O, 12, [mark('d', at30px)])?.key, 'd', 'a dot 30 px off is tapped');
  assert.equal(dotAt(O, 12, [mark('d', east(60 * mpp))]), null, 'one 60 px off is not');
});

test('whole-towns audit 3: the "?" drawn for a town at z17 are at most those in view', () => {
  // 200 places across 4 km; a phone's view at z17 is a few hundred metres.
  const marks = Array.from({ length: 200 }, (_, i) => mark(`m${i}`, east((i % 20) * 200 - 2000, north(Math.floor(i / 20) * 200 - 1000))));
  const view = viewOf(O, 17, { width: 390, height: 600 });
  const { pins, dots } = waitingPins(marks, O, 17, O[1], view);
  assert.ok(pins.length > 0 && pins.length <= 12, `a handful of "?" (${pins.length})`);
  const inView = (p: LngLat) => Math.abs((p[0] - O[0]) * 111320 * Math.cos((O[1] * Math.PI) / 180)) <= view.halfWm && Math.abs((p[1] - O[1]) * 110574) <= view.halfHm;
  assert.ok(pins.every((p) => inView(p.at)), 'every "?" is in view');
  assert.equal(pins.length + dots.length, 200, 'the rest are dots (one layer)');
});

test('whole-towns audit 4: no dot lies hidden under a "?" that does not say so; a crowded "?" clears by zooming in', () => {
  const zoom = 15;
  const mpp = metresPerPx(zoom, O[1]);
  // A place 20 px north of another: under its pin's drawn box (the pin stands above its point).
  const a = mark('a', O);
  const b = mark('b', north(20 * mpp));
  assert.equal(underPin(a.at, b.at, mpp), true);
  const out = waitingPins([a, b], O, zoom, O[1]);
  assert.deepEqual(out.pins.map((p) => [p.key, !!p.crowded]), [['a', true]], 'the "?" says a place is under it');
  for (const z of [11, 13, 15, 17]) {
    const s = waitingPins([a, b, mark('c', east(15 * mpp)), mark('d', north(-30 * mpp))], O, z, O[1]);
    const m = metresPerPx(z, O[1]);
    for (const p of s.pins) if (!p.crowded) assert.ok(!s.dots.some((d) => underPin(p.at, d.at, m)), `no dot hidden under a plain "?" at ${z}`);
  }
  const z = roomZoom(a, [a, b], O[1]);
  assert.ok(z > zoom, `zooms in (${z})`);
  assert.ok(!waitingPins([a, b], O, z, O[1]).pins.find((p) => p.key === 'a')!.crowded, 'at that zoom nothing is under it');
  const same = [mark('x', O), mark('y', O, 'history')];
  assert.equal(roomZoom(same[0], same, O[1]), PIN_ROOM.maxZoom, 'two places on one spot: the closest zoom, then the card');
});

test('whole-towns audit 7: walks are placed in a hamlet only inside the town border that decided the piece', () => {
  assert.equal(AREA_RULES, '4', 'every walk is placed again');
  const town: TownOutline = { id: 't', name: 'Allentown', at: O, polygons: [rect(O[0] - 0.05, O[1] - 0.03, O[0] + 0.05, O[1] + 0.03)], bbox: [O[0] - 0.05, O[1] - 0.03, O[0] + 0.05, O[1] + 0.03], areaM2: 1e8 };
  const set: OutlineSet = { tiles: new Set(['12/1191/1543', '12/1192/1543', '12/1191/1544', '12/1192/1544']), towns: [town] };
  const c: PlaceCandidate = { level: 'town', name: 'Allentown', at: O, reachM: 10_000, outline: town };
  const hamlet = (at: LngLat): PlaceCandidate => ({ level: 'neighborhood', name: 'Hanover Acres', at, reachM: 1000, kind: 'hamlet' });
  const coveredSet = (p: LngLat): OutlineSet => ({ ...set, tiles: new Set([`12/${tileOf(p, 12).join('/')}`, ...set.tiles]) });
  assert.equal(hoodAllowed(hamlet(east(500)), { c, by: 'outline' }, coveredSet(east(500))), true, 'inside the border');
  assert.equal(hoodAllowed(hamlet(east(500)), { c, by: 'point' }, coveredSet(east(500))), false, 'a town by its point: no hamlet');
  assert.equal(hoodAllowed(hamlet(east(500)), null, null), false, 'out of town: never');
  const outside = east(6000);
  assert.equal(hoodAllowed(hamlet(outside), { c, by: 'outline' }, coveredSet(outside)), false, 'outside the border');
});

test('whole-towns audit 8: a border-only town read does not satisfy a near-you read', () => {
  const townRead: NearRead = { at: O, build: 'b1', code: ATLAS_CODE, radiusM: 5000, town: 'Allentown' };
  assert.equal(needsNear([townRead], O, 'b1', 2500), true);
  assert.equal(needsNear([townRead], O, 'b1', 5000, 'Allentown'), false, 'it still stands for the town\'s page');
});

test('whole-towns audit 9: a tap that closes the Layers panel does nothing else', () => {
  assert.equal(tapDoes({ panelOpen: true, spot: true, dot: true }), 'close-panel');
  assert.equal(tapDoes({ panelOpen: false, spot: true, dot: true }), 'clear-spot');
  assert.equal(tapDoes({ panelOpen: false, spot: false, dot: true }), 'zoom');
  assert.equal(tapDoes({ panelOpen: false, spot: false, dot: false }), 'none');
});

test('whole-towns audit 10: ward names', () => {
  for (const n of ['Ward One', 'Ward twenty', 'Thirtieth Ward', 'Fortieth Ward', 'Ward 5A', 'Forty-second Ward']) assert.equal(isWard(n), true, n);
  for (const n of ['Lower Ninth Ward', 'Wardlow', 'Ward Hill', 'Edward Park']) assert.equal(isWard(n), false, n);
});

test('whole-towns audit 13: a town listed this build is not re-read after twelve near reads', () => {
  let reads = withNear([], { at: O, build: 'b1', code: ATLAS_CODE, radiusM: 5000, town: 'Allentown' });
  for (let i = 0; i < NEAR_KEPT + 5; i++) reads = withNear(reads, { at: east(i * 1500), build: 'b1', code: ATLAS_CODE, radiusM: 2500 });
  assert.equal(needsNear(reads, O, 'b1', 5000, 'Allentown'), false);
  assert.equal(reads.filter((r) => !r.town).length, NEAR_KEPT);
});

test('whole-towns audit 14: a town at its own scale shows every findable place as the same dot, found or not', () => {
  const marks = [mark('a', O), mark('b', east(400)), mark('c', east(900), 'parks')];
  const found = new Set(['b']);
  const far = areaMapMarks('town', marks, found, new Set(), O, 12, O[1]);
  assert.deepEqual(far.pins, [], 'no "?" at town scale');
  assert.deepEqual(far.dots.map((m) => m.key).sort(), ['a', 'b', 'c'], 'found or not, the same dot: the field never thins');
  assert.deepEqual(areaMapMarks('town', marks, new Set(), new Set(), O, 12, O[1]).dots.map((m) => m.key).sort(), ['a', 'b', 'c'], 'a find changes no dot');
  const near = areaMapMarks('town', marks, found, new Set(), O, PIN_ROOM.townPinZoom, O[1]);
  assert.ok(![...near.pins, ...near.dots].some((m) => m.key === 'b'), 'zoomed in: "?" for the unfound only, a find not drawn');
  assert.ok(near.pins.length > 0);
});

test('whole-towns audit 15: the spoken line is "Waiting in", never an errand list', () => {
  const said = waitingLabel('Wickenden', [mark('a', O), mark('b', O, 'parks')]);
  assert.equal(said, 'Waiting in Wickenden: art, green');
  assert.ok(!/to find|left|remaining/i.test(said));
});

test('whole-towns audit 18: a dot\'s dark edge is 3:1 or more on every ground the map has', () => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = (c: number[]) => {
    const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const over = (top: string, alpha: number, ground: string) => rgb(top).map((t, i) => t * alpha + rgb(ground)[i] * (1 - alpha));
  const ratio = (a: number[], b: number[]) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  const edge = rgb(WAITING_DOT_EDGE);
  const grounds = ['#ffffff', '#eeeae4', '#f2efe9', '#d3cec5'].flatMap((g) => [rgb(g), over(RING_COLOR, 0.12, g), over(BORDER.color, BORDER.fillOpacity, g), over(BORDER.color, BORDER.fillOpacity * 2, g)]);
  for (const g of grounds) assert.ok(ratio(edge, g) >= 3, `edge on ${g.map((v) => Math.round(v * 255)).join(',')}: ${ratio(edge, g).toFixed(2)}`);
});
