/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hoodAt, withHoods } from '../../areas/hoods';
import { inOutline, outlineSet, withOutlines } from '../../areas/outlines';
import { areaKey } from '../../areas/assign';
import { assignAreas } from '../../areas/assign';
import { stepToward } from '../../geo';
import type { LngLat } from '../../types';
import { at, baltimorePoints, baltimoreSet, baltimoreTown, hoodNameAt, hoodPoint, overturePoint, square, squaresTile, testBoundaries, townPoint, townWith, walk } from './hoodFixture';

// Neighborhood boundaries, who owns a point (HB2-HB6), on real Baltimore shapes and on squares.

const baltimoreCands = () => [baltimoreTown(), ...baltimorePoints()];

test('HB2: the smallest shape holding a point owns it, never two (real Baltimore and nested squares)', { todo: 'test first' }, () => {
  const set = baltimoreSet();
  const cands = baltimoreCands();
  assert.equal(hoodNameAt(overturePoint('Mount Vernon'), cands, set), 'Mount Vernon');
  assert.equal(hoodNameAt(overturePoint('Seton Hill'), cands, set), 'Seton Hill');
  assert.equal(hoodNameAt(overturePoint('Downtown West'), cands, set), 'Downtown West');
  // Ground only the Downtown macrohood holds is the macrohood's.
  assert.equal(hoodNameAt([-76.6236, 39.2904], cands, set), 'Downtown');
  // The real sliver where Inner Harbor and Otterbein overlap: one owner, the smaller shape.
  const [ih, ot] = ['Inner Harbor', 'Otterbein'].map((n) => set.hoods!.find((h) => h.name === n)!);
  let sliver: LngLat | null = null;
  for (let x = ih.bbox[0]; x < ih.bbox[2] && !sliver; x += 0.00005) for (let y = ih.bbox[1]; y < ih.bbox[3]; y += 0.00005) if (inOutline([x, y], ih) && inOutline([x, y], ot)) { sliver = [x, y]; break; }
  assert.ok(sliver, 'the fixture holds the overlap');
  assert.equal(hoodNameAt(sliver!, cands, set), (ih.areaM2 <= ot.areaM2 ? ih : ot).name);
  // Nested squares: a point in both is the small one's; a point only in the big one is the big one's.
  const sq = townWith([
    { id: 'big', name: 'Big', subtype: 'macrohood', polygons: square(-20, -20, 20, 20) },
    { id: 'small', name: 'Small', polygons: square(-3, -3, 3, 3) },
  ]);
  const c = [townPoint('Squareton', at(0, 0), 3000), hoodPoint('Small', at(0, 0)), hoodPoint('Big', at(10, 10))];
  assert.equal(hoodNameAt(at(0, 0), c, sq), 'Small');
  assert.equal(hoodNameAt(at(12, 12), c, sq), 'Big');
});

test('HB3: a shape counts only inside the point\'s town, and a point in no town takes none by shape', { todo: 'test first' }, () => {
  const set = outlineSet([squaresTile({
    towns: [{ id: 'a', name: 'A', polygons: square(-20, -20, 0, 20) }, { id: 'b', name: 'B', polygons: square(0, -20, 20, 20) }],
    hoods: [{ id: 'h', name: 'Straddler', polygons: square(-5, -5, 15, 5) }], // its middle is in B
  })]);
  const cands = [townPoint('A', at(-10, 0), 3000), townPoint('B', at(10, 0), 3000), hoodPoint('Straddler', at(5, 0))];
  assert.equal(hoodNameAt(at(5, 0), cands, set), 'Straddler', 'in town B, whose outline holds its middle');
  assert.equal(hoodNameAt(at(-3, 0), cands, set), null, 'the part across the border, in town A, is not the neighborhood\'s');
  const none = outlineSet([squaresTile({ hoods: [{ id: 'h', name: 'Straddler', polygons: square(-5, -5, 15, 5) }] })]);
  assert.equal(hoodNameAt(at(5, 0), [hoodPoint('Straddler', at(5, 0))], none), null, 'a point in no town takes no neighborhood by shape');
});

test('HB4: where no shape holds a point the nearest neighborhood point within 1 km takes it; a shaped neighborhood never takes ground outside its shape', { todo: 'test first' }, () => {
  const set = townWith([{ id: 'p', name: 'Shaped', polygons: square(0, 0, 4, 4) }]);
  const c = [townPoint('Squareton', at(0, 0), 3000), hoodPoint('Shaped', at(2, 2)), hoodPoint('Pointy', at(8, 2))];
  assert.equal(hoodNameAt(at(5, 2), c, set), 'Pointy', 'unclaimed ground goes to the nearest point');
  assert.equal(hoodNameAt(at(4.5, 2), c, set), 'Pointy', 'Shaped\'s point is nearer, but its shape ends at 4');
  assert.equal(hoodNameAt(at(2, 2), c, set), 'Shaped');
  assert.equal(hoodNameAt(at(40, 2), c, set), null, 'past 1 km of every point, nobody');
  // Where the shapes were never read, the points decide as before.
  const unread = outlineSet([]);
  assert.equal(hoodNameAt(at(4.5, 2), c, unread), 'Shaped');
});

test('HB5: a shape and a tile point of one name are one candidate and keep the area key; a shape alone is a neighborhood at a point inside it', { todo: 'test first' }, () => {
  const set = baltimoreSet();
  const cands = withHoods([baltimoreTown(), hoodPoint('Mount Vernon')], set);
  const mv = cands.filter((c) => c.name === 'Mount Vernon');
  assert.equal(mv.length, 1);
  assert.deepEqual(mv[0].at, overturePoint('Mount Vernon'), 'the tile\'s point stands');
  assert.ok(mv[0].hoodOutline, 'joined to its shape');
  const dw = cands.find((c) => c.name === 'Downtown West')!;
  assert.ok(dw && dw.level === 'neighborhood' && dw.hoodOutline, 'a shape with no tile point is a neighborhood of its own');
  assert.ok(inOutline(dw.at, dw.hoodOutline!), 'at a point inside it');
  // A walk placed in Mount Vernon by its point and by its shape is in the same area.
  const p = overturePoint('Mount Vernon');
  const path = [p, stepToward(p, [p[0] + 0.01, p[1]], 120)];
  const withShapes = assignAreas('w', walk(path), [], [baltimoreTown(), hoodPoint('Mount Vernon')], testBoundaries, null, [], [], set);
  const without = assignAreas('w', walk(path), [], [baltimoreTown(), hoodPoint('Mount Vernon')], testBoundaries);
  const keyOf = (r: typeof withShapes) => r.rows.map((x) => r.areas.get(x.area_key)!).find((a) => a.level === 'neighborhood')!.key;
  assert.equal(keyOf(withShapes), keyOf(without));
  assert.equal(keyOf(withShapes), areaKey('neighborhood', 'Mount Vernon', areaKey('town', 'Baltimore', areaKey('state', 'Maryland', areaKey('country', 'United States', null)))));
});

test('HB6: a point-only neighborhood inside another\'s shape is dropped where shapes were read; elsewhere it stays', { todo: 'test first' }, () => {
  const set = baltimoreSet();
  const mv = overturePoint('Mount Vernon');
  const chinatownAt = stepToward(mv, overturePoint('Seton Hill'), 150);
  assert.ok(inOutline(chinatownAt, set.hoods!.find((h) => h.name === 'Mount Vernon')!), 'the fixture\'s Chinatown lies inside Mount Vernon');
  const cands = [baltimoreTown(), hoodPoint('Mount Vernon'), hoodPoint('Chinatown', chinatownAt)];
  const joined = withOutlines(cands, set);
  assert.ok(!joined.some((c) => c.name === 'Chinatown'), 'dropped: Mount Vernon\'s shape stands');
  assert.equal(hoodNameAt(chinatownAt, cands, set), 'Mount Vernon');
  // Without the shapes read, it is a neighborhood as before.
  assert.ok(withHoods(cands, null).some((c) => c.name === 'Chinatown'));
  // On unclaimed ground a point-only name stays.
  const sq = townWith([{ id: 'p', name: 'Shaped', polygons: square(0, 0, 4, 4) }]);
  const kept = withOutlines([townPoint('Squareton', at(0, 0), 3000), hoodPoint('Pointy', at(8, 2))], sq);
  assert.ok(kept.some((c) => c.name === 'Pointy'));
  // And a walk through Chinatown's point is in Mount Vernon, with no Chinatown row.
  const r = assignAreas('w', walk([chinatownAt, stepToward(chinatownAt, mv, 60)]), [], cands, testBoundaries, null, [], [], set);
  assert.deepEqual(r.rows.map((x) => r.areas.get(x.area_key)!).filter((a) => a.level === 'neighborhood').map((a) => a.name), ['Mount Vernon']);
});
