/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { MARKS_EXPLAINED, marksExplained } from '../../atlas/atlas';
import { shapedHoods, shapeUnread } from '../../atlas/hoods';
import { GROUND_COLOR, groundGeoJSON } from '../../areas/groundDraw';
import { groundOf, hoodExtent, hoodGround, hoodProbe, lookAgain, withHoods } from '../../areas/hoods';
import { inOutline, outlineSet, tileCurrent, withOutlines } from '../../areas/outlines';
import { areaFor } from '../../explore/explore';
import { distanceM } from '../../geo';
import { shouldDrawRing } from '../../atlas/carousel';
import type { PlaceCandidate } from '../../areas/types';
import type { LngLat } from '../../types';
import { at, baltimorePoints, baltimoreSet, baltimoreTown, hoodPoint, overturePoint, square, squaresTile, townPoint, townWith } from './hoodFixture';
import { stepToward } from '../../geo';

// Neighborhood boundaries, the audit's regression tests (decision 0074): `neighborhood-boundaries audit N`.

const names = (cs: PlaceCandidate[]) => cs.map((c) => `${c.level}:${c.name}`).sort();

test('neighborhood-boundaries audit 1: Explore lists neighborhoods as placing knows them: a name inside a shape is not a row, a shape with no point is', () => {
  const set = baltimoreSet();
  const mv = overturePoint('Mount Vernon');
  const chinatown = stepToward(mv, overturePoint('Seton Hill'), 150);
  const listed = shapedHoods([hoodPoint('Mount Vernon'), hoodPoint('Chinatown', chinatown), hoodPoint('Seton Hill')], set, () => true);
  assert.ok(!listed.some((c) => c.name === 'Chinatown'), 'dropped: no card for a name no walk can land in');
  assert.ok(listed.some((c) => c.name === 'Downtown West' && c.hoodOutline), 'a shape with no tile point is a row');
  // The caller's keep-test limits the shape-only rows to the page's own ground.
  assert.ok(!shapedHoods([hoodPoint('Mount Vernon')], set, (c) => c.kind !== 'polygon').some((c) => c.kind === 'polygon'));
  // No shapes known: the list is the points, as before.
  assert.deepEqual(shapedHoods([hoodPoint('Chinatown', chinatown)], null, () => true).map((c) => c.name), ['Chinatown']);
});

test('neighborhood-boundaries audit 2: joining shapes is idempotent and does not depend on order (towns too)', () => {
  const set = baltimoreSet();
  const c = [baltimoreTown(), ...baltimorePoints()];
  const once = withOutlines(c, set);
  assert.deepEqual(names(withOutlines(once, set)), names(once));
  assert.deepEqual(withOutlines(once, set).map((x) => x.at), once.map((x) => x.at), 'the tile point stays the area\'s point');
  // A neighborhood and a macrohood of one name, either order of shapes in the set.
  const a = { id: 'a', name: 'Downtown', subtype: 'neighborhood' as const, polygons: square(-5, -5, 5, 5) };
  const b = { id: 'b', name: 'Downtown', subtype: 'macrohood' as const, polygons: square(-20, -20, 20, 20) };
  const cands = [townPoint('Squareton', at(0, 0), 3000), hoodPoint('Downtown', at(1, 1))];
  const ab = names(withHoods(cands, townWith([a, b])));
  const ba = names(withHoods(cands, townWith([b, a])));
  assert.deepEqual(ab, ba);
  assert.deepEqual(names(withHoods(withHoods(cands, townWith([a, b])), townWith([a, b]))), ab);
  // A town's outline, joined twice, is one town.
  const t = outlineSet([squaresTile({ towns: [{ id: 't', name: 'Squareton', polygons: square(-60, -60, 60, 60) }] })]);
  const tc = withOutlines([townPoint('Squareton', at(0, 0), 3000)], t);
  assert.deepEqual(names(withOutlines(tc, t)), names(tc));
});

test('neighborhood-boundaries audit 3: a place in a big shape but past its point\'s reach is the town\'s or an orphan, never dropped', () => {
  const set = townWith([{ id: 'big', name: 'Big', subtype: 'macrohood', polygons: square(-40, -40, 40, 40) }]);
  const cands = [townPoint('Squareton', at(0, 0), 3000), hoodPoint('Big', at(0, 0))];
  assert.equal(areaFor(at(5, 5), cands, set)?.name, 'Big', 'near its point: the neighborhood');
  const far = areaFor(at(20, 20), cands, set); // 2.8 km from its point, inside its shape and the tile
  assert.notEqual(far?.level, 'neighborhood', 'its checklist cannot see this far');
});

test('neighborhood-boundaries audit 4: a card counts across the ground drawn, a shape-less neighborhood too; a failed read is tried again; the probe covers the neighbors', () => {
  const set = townWith([{ id: 'p', name: 'Shaped', polygons: square(0, -3, 4, 3) }]);
  const cands = [townPoint('Squareton', at(0, 0), 3000), hoodPoint('Shaped', at(2, 0)), hoodPoint('Pointy', at(8, 0))];
  const share = hoodExtent({ level: 'neighborhood', name: 'Pointy', at: at(8, 0) }, cands, set)!;
  assert.ok(share && inOutline(at(6, 0), share.outline) && !inOutline(at(2, 0), share.outline), 'the share, without the shape\'s ground');
  const shape = hoodExtent({ level: 'neighborhood', name: 'Shaped', at: at(2, 0) }, cands, set)!;
  assert.ok(inOutline(at(2, 0), shape.outline));
  assert.equal(hoodExtent({ level: 'neighborhood', name: 'Pointy', at: at(8, 0) }, cands, null), null, 'tiles not read: the ring');
  assert.equal(shapeUnread(null, null), true, 'a failed read');
  assert.equal(shapeUnread({ complete: false }, null), true);
  assert.equal(shapeUnread({ complete: true }, null), false, 'read, and no shape here');
  assert.equal(shapeUnread({ complete: false }, share), false);
  const probes = hoodProbe([-76.6, 39.29]);
  assert.equal(probes.length, 5);
  assert.ok(probes.slice(1).every((p) => distanceM(p, [-76.6, 39.29]) > 1000 && distanceM(p, [-76.6, 39.29]) < 2000));
});

test('neighborhood-boundaries audit 5: the ring is drawn only while the card counts across a ring; the ground is looked for again until the neighbors are kept', () => {
  assert.equal(shouldDrawRing(null, undefined), true, 'nothing read yet: the ring, as before');
  assert.equal(shouldDrawRing('ring', undefined), true);
  assert.equal(shouldDrawRing('shape', undefined), false, 'the card counts across a shape: no ring over it');
  assert.equal(shouldDrawRing('shape', { polygons: [] }), false);
  assert.equal(shouldDrawRing('ring', { polygons: square(0, 0, 1, 1) }), false, 'a ground replaces it');
  const probes = [at(0, 0), at(10, 0)];
  assert.equal(lookAgain(outlineSet([]), probes, 0), true);
  assert.equal(lookAgain(townWith([]), probes, 0), false, 'every probe covered');
  assert.equal(lookAgain(outlineSet([]), probes, 8), false, 'tries are finite');
  // A neighbor's shape arriving changes the share.
  const cands = [townPoint('Squareton', at(0, 0), 3000), hoodPoint('A', at(0, 0)), hoodPoint('B', at(3, 0))];
  const before = groundOf({ level: 'neighborhood', name: 'A', at: at(0, 0) }, cands, townWith([]))!;
  const after = groundOf({ level: 'neighborhood', name: 'A', at: at(0, 0) }, cands, townWith([{ id: 'n', name: 'Neighbor', polygons: square(1, -5, 6, 5) }]))!;
  assert.ok(inOutline(at(1.4, 0), before) && !inOutline(at(1.4, 0), after), 'the neighbor\'s shape takes its ground');
});

test('neighborhood-boundaries audit 6: a share over many candidates and a big town ring is found within a budget', () => {
  const ring: LngLat[] = [];
  for (let i = 0; i < 5000; i++) { const a = (i / 5000) * 2 * Math.PI; ring.push(at(55 * Math.cos(a), 55 * Math.sin(a))); }
  ring.push(ring[0]);
  const set = outlineSet([squaresTile({ towns: [{ id: 't', name: 'Bigton', polygons: [[ring]] }] })]);
  const cands: PlaceCandidate[] = [townPoint('Bigton', at(0, 0), 3000)];
  for (let i = 0; i < 200; i++) cands.push(hoodPoint(`H${i}`, at(((i * 37) % 100) - 50, ((i * 53) % 100) - 50)));
  const me = cands[1];
  const t0 = Date.now();
  const g = hoodGround(me, withOutlines(cands, set), set);
  const ms = Date.now() - t0;
  console.log(`# audit 6: the share took ${ms} ms`);
  assert.ok(g, 'some ground');
  assert.ok(ms < 1500, `the share took ${ms} ms`);
});

test('neighborhood-boundaries audit 7: a smaller shape that pokes out of its host is not cut out of it', () => {
  // Its middle is inside the host, its right end is not: it overlaps in part, as Baltimore's Inner Harbor and Otterbein do.
  const set = townWith([{ id: 'h', name: 'Host', polygons: square(0, 0, 10, 10) }, { id: 'p', name: 'Pokes', polygons: square(5, 5, 12, 7) }]);
  const c = withHoods([townPoint('Squareton', at(0, 0), 3000), hoodPoint('Host', at(2, 2)), hoodPoint('Pokes', at(8, 6))], set);
  const g = hoodGround(c.find((x) => x.name === 'Host')!, c, set)!;
  for (const rings of g.polygons) for (const hole of rings.slice(1)) {
    assert.ok(hole.every((v) => inOutline(v, { polygons: [[rings[0]]], bbox: g.bbox })), 'every hole is inside its host\'s outer ring');
  }
  // A whole shape inside still is.
  const nested = townWith([{ id: 'b', name: 'Big', subtype: 'macrohood', polygons: square(-20, -20, 20, 20) }, { id: 's', name: 'Small', polygons: square(-3, -3, 3, 3) }]);
  const nc = withHoods([townPoint('Squareton', at(0, 0), 3000), hoodPoint('Big', at(10, 10)), hoodPoint('Small', at(0, 0))], nested);
  assert.equal(hoodGround(nc.find((x) => x.name === 'Big')!, nc, nested)!.polygons[0].length, 2);
});

test('neighborhood-boundaries audit 8: a z10 border tile kept before the shapes were cut is not read again', () => {
  assert.equal(tileCurrent({ release: '2026-10-21.0#sub1', z: 10 }), true);
  assert.equal(tileCurrent({ release: '2026-10-21.0#sub1', z: 12 }), false, 'only a z12 tile holds shapes');
  assert.equal(tileCurrent({ release: '2026-10-21.0#sub2', z: 12 }), true);
  assert.equal(tileCurrent({ release: '2026-10-21.0', z: 10 }), false);
});

test('neighborhood-boundaries audit 9: the line is the app\'s ink, not an accent', () => {
  const ui = readFileSync(new URL('../../../components/ui.tsx', import.meta.url), 'utf8');
  const ink = /\bink:\s*'(#[0-9a-fA-F]{6})'/.exec(ui)?.[1];
  const accent = /\baccent:\s*'(#[0-9a-fA-F]{6})'/.exec(ui)?.[1];
  assert.ok(ink && accent);
  assert.equal(GROUND_COLOR.toLowerCase(), ink!.toLowerCase());
  assert.notEqual(GROUND_COLOR.toLowerCase(), accent!.toLowerCase());
});

test('neighborhood-boundaries audit 11: how a neighborhood is counted is said without a comparison or a digit', () => {
  const lines = marksExplained({ extent: 'shape' });
  const last = lines[lines.length - 1];
  assert.ok(!/\d/.test(last) && !/same[^.]*anywhere/i.test(last), last);
  assert.deepEqual(lines.slice(0, -1), MARKS_EXPLAINED.slice(0, -1));
  assert.match(last, /ground|shape/i);
});

test('neighborhood-boundaries audit 12: a selection draws exactly one feature, nested shapes as holes of it', () => {
  const set = townWith([{ id: 'b', name: 'Big', subtype: 'macrohood', polygons: square(-20, -20, 20, 20) }, { id: 's', name: 'Small', polygons: square(-3, -3, 3, 3) }, { id: 't', name: 'Tiny', polygons: square(8, 8, 10, 10) }]);
  const c = withHoods([townPoint('Squareton', at(0, 0), 3000), hoodPoint('Big', at(15, 15)), hoodPoint('Small', at(0, 0)), hoodPoint('Tiny', at(9, 9))], set);
  const g = hoodGround(c.find((x) => x.name === 'Big')!, c, set)!;
  const fc = groundGeoJSON(g);
  assert.equal(fc.features.length, 1);
  assert.equal(fc.features[0].geometry.type, 'MultiLineString');
  assert.equal(g.polygons.length, 1);
  assert.equal(g.polygons[0].length, 3, 'its outer ring and two holes');
});

test('neighborhood-boundaries audit 13: nothing in the map is labelled or titled from the ground', () => {
  for (const f of ['WalkMap.web.tsx', 'WalkMap.native.tsx']) {
    const src = readFileSync(new URL(`../../../components/map/${f}`, import.meta.url), 'utf8');
    for (const line of src.split('\n').filter((l) => /props\.ground|\bground\b/.test(l))) {
      assert.ok(!/aria-|accessibilityLabel|accessibilityHint|title=|\.title\b|label/i.test(line.replace(/data-ground/g, '')), `${f}: ${line.trim().slice(0, 120)}`);
    }
  }
  // The canvas's label is the map's alone: it takes no ground.
  const free = readFileSync(new URL('../../atlas/freeLook.ts', import.meta.url), 'utf8');
  assert.match(free, /export function mapLabel\(free: boolean\)/);
  assert.ok(!/ground/i.test(/export function mapLabel[\s\S]*?\n}/.exec(free)?.[0] ?? ''));
});
