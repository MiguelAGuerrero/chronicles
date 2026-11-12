/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groundGeoJSON, groundStyle } from '../../areas/groundDraw';
import { hoodExtentFor, hoodGround, withHoods } from '../../areas/hoods';
import { inOutline, outlineSet } from '../../areas/outlines';
import { distanceM } from '../../geo';
import { at, baltimoreSet, hoodPoint, overturePoint, square, squareWithHole, townPoint, townWith } from './hoodFixture';

// Neighborhood boundaries, the ground a map draws and a card counts across (HB9-HB11, HB14, HB15).

test('HB9: a shape\'s ground has the smaller shapes cut out; a point-only neighborhood\'s share never overlaps a neighbor, a shape, or its 1 km reach', { todo: 'test first' }, () => {
  const set = townWith([
    { id: 'big', name: 'Big', subtype: 'macrohood', polygons: square(-20, -20, 20, 20) },
    { id: 'small', name: 'Small', polygons: square(-3, -3, 3, 3) },
  ]);
  const c = withHoods([townPoint('Squareton', at(0, 0), 3000), hoodPoint('Small', at(0, 0)), hoodPoint('Big', at(10, 10))], set);
  const big = hoodGround(c.find((x) => x.name === 'Big')!, c, set)!;
  assert.ok(inOutline(at(12, 12), big) && !inOutline(at(0, 0), big), 'Big\'s ground has Small cut out');
  const small = hoodGround(c.find((x) => x.name === 'Small')!, c, set)!;
  assert.ok(inOutline(at(0, 0), small));
  // Shares: A at 0, B at 6, 100 m units; their edge is near x = 3, never more than 1 km from the point.
  const flat = townWith([]);
  const pts = [townPoint('Squareton', at(0, 0), 3000), hoodPoint('A', at(0, 0)), hoodPoint('B', at(6, 0))];
  const a = hoodGround(pts[1], pts, flat)!;
  const b = hoodGround(pts[2], pts, flat)!;
  assert.ok(inOutline(at(1, 0), a) && !inOutline(at(5, 0), a));
  assert.ok(inOutline(at(5, 0), b) && !inOutline(at(1, 0), b));
  for (let x = -14; x <= 20; x += 0.5) for (let y = -14; y <= 14; y += 0.5) {
    const p = at(x, y);
    assert.ok(!(inOutline(p, a) && inOutline(p, b)), `no point in both at ${x},${y}`);
    if (inOutline(p, a)) assert.ok(distanceM(p, at(0, 0)) <= 1000 + 30);
  }
  // A shape held by another is not in a share.
  const mixed = townWith([{ id: 'p', name: 'Shaped', polygons: square(0, -3, 4, 3) }]);
  const mc = withHoods([townPoint('Squareton', at(0, 0), 3000), hoodPoint('Shaped', at(2, 0)), hoodPoint('Pointy', at(8, 0))], mixed);
  const share = hoodGround(mc.find((x) => x.name === 'Pointy')!, mc, mixed)!;
  assert.ok(!inOutline(at(2, 0), share) && inOutline(at(6, 0), share));
  assert.equal(hoodGround({ level: 'town', name: 'Squareton', at: at(0, 0), reachM: 3000 }, [], outlineSet([])), null, 'only a neighborhood has ground');
  // The real Mount Vernon's ground is its shape.
  const rs = baltimoreSet();
  const rc = withHoods([hoodPoint('Mount Vernon')], rs);
  const mv = hoodGround(rc.find((x) => x.name === 'Mount Vernon')!, rc, rs)!;
  assert.ok(inOutline(overturePoint('Mount Vernon'), mv));
});

test('HB10: the ground carries no count, share, tint or name: lines with no properties', { todo: 'test first' }, () => {
  const g = { polygons: squareWithHole(-5, -5, 5, 5, [-1, -1, 1, 1]), bbox: [0, 0, 1, 1] as [number, number, number, number] };
  const fc = groundGeoJSON(g);
  assert.ok(fc.features.length > 0);
  for (const f of fc.features) {
    assert.deepEqual(f.properties ?? {}, {}, 'nothing about the neighborhood rides on the line');
    assert.ok(f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString', 'a line, never a filled polygon');
  }
  assert.equal(JSON.stringify(fc).match(/[A-Za-z]/g)?.join('').replace(/type|Feature|FeatureCollection|features|properties|geometry|LineString|MultiLineString|coordinates/g, ''), '');
  assert.deepEqual(groundGeoJSON(null).features, []);
});

test('HB11: a neighborhood\'s card counts across its shape with the smaller ones cut out, not an 800 m ring', { todo: 'test first' }, () => {
  const set = townWith([
    { id: 'big', name: 'Big', subtype: 'macrohood', polygons: square(-20, -20, 20, 20) },
    { id: 'small', name: 'Small', polygons: square(-3, -3, 3, 3) },
  ]);
  const e = hoodExtentFor({ level: 'neighborhood', name: 'Big', at: at(10, 10) }, set)!;
  assert.ok(inOutline(at(12, 12), e.outline) && !inOutline(at(0, 0), e.outline) && !inOutline(at(25, 25), e.outline), 'its ground, with Small cut out, and 2.5 km out is not in it');
  assert.equal(e.partial, false);
  assert.equal(hoodExtentFor({ level: 'neighborhood', name: 'Elsewhere', at: at(0, 0) }, set), null, 'no shape, the ring stays');
  assert.equal(hoodExtentFor({ level: 'town', name: 'Big', at: at(10, 10) }, set), null, 'towns have their own extent');
});

test('HB14: the line looks the same for every neighborhood and takes nothing from the walker', { todo: 'test first' }, () => {
  assert.equal(groundStyle.length, 0, 'no argument: nothing about a neighborhood or a walk can reach it');
  assert.deepEqual(groundStyle(), groundStyle());
  const s = groundStyle() as Record<string, unknown>;
  assert.deepEqual(Object.keys(s).sort(), ['color', 'width']);
});

test('HB15: a polygon\'s line and a share\'s line are drawn the same way', { todo: 'test first' }, () => {
  const set = townWith([{ id: 'p', name: 'Shaped', polygons: square(0, -3, 4, 3) }]);
  const c = withHoods([townPoint('Squareton', at(0, 0), 3000), hoodPoint('Shaped', at(2, 0)), hoodPoint('Pointy', at(8, 0))], set);
  const poly = groundGeoJSON(hoodGround(c.find((x) => x.name === 'Shaped')!, c, set));
  const share = groundGeoJSON(hoodGround(c.find((x) => x.name === 'Pointy')!, c, set));
  const look = (fc: GeoJSON.FeatureCollection) => [...new Set(fc.features.map((f) => `${f.geometry.type.replace('Multi', '')}${JSON.stringify(f.properties ?? {})}`))];
  assert.ok(poly.features.length && share.features.length);
  assert.deepEqual(look(poly), look(share));
});
