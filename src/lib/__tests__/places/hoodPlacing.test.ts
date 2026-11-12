/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assignAreas, placesRead } from '../../areas/assign';
import { AREA_RULES } from '../../areas/rules';
import { stepToward } from '../../geo';
import { areaFor } from '../../explore/explore';
import type { LngLat } from '../../types';
import { at, baltimorePoints, baltimoreSet, baltimoreTown, overturePoint, square, testBoundaries, townPoint, townWith, walk, hoodPoint } from './hoodFixture';

// Neighborhood boundaries, placing and agreeing (HB7, HB8, HB13, HB16).

const cands = () => [baltimoreTown(), ...baltimorePoints()];
const hoodNames = (r: ReturnType<typeof assignAreas>) => r.rows.map((x) => r.areas.get(x.area_key)!).filter((a) => a.level === 'neighborhood').map((a) => a.name).sort();

test('HB7: AREA_RULES is 5, so every walk is placed again; a walk whose shapes could not be read is placed by points and tried again', () => {
  assert.equal(AREA_RULES, '5');
  const mv = overturePoint('Mount Vernon');
  const r = assignAreas('w', walk([mv, stepToward(mv, [mv[0] + 0.01, mv[1]], 120)]), [], cands(), testBoundaries, null, [], [], baltimoreSet());
  assert.ok([...r.areas.values()].every((a) => a.rules.startsWith('5/')), 'rows carry the new rules tag');
  // The shapes unread: placed by points as before, and not done (placesRead is false) so it is tried again.
  const byPoints = assignAreas('w', walk([mv, stepToward(mv, [mv[0] + 0.01, mv[1]], 120)]), [], cands(), testBoundaries, null, [], [], null);
  assert.deepEqual(hoodNames(byPoints), ['Mount Vernon']);
  assert.equal(placesRead({ needed: true, placed: true, outlinesRead: false }), false);
});

test('HB8: Explore\'s area for a point and the neighborhood a walk piece there is placed in are the same function', () => {
  const set = baltimoreSet();
  const c = cands();
  const names = ['Mount Vernon', 'Seton Hill', 'Downtown West', 'Federal Hill', 'Little Italy', 'Otterbein', 'Upton'];
  let checked = 0;
  for (const n of names) {
    const p = overturePoint(n);
    for (const [dx, dy] of [[0, 0], [0.0015, 0.001], [-0.002, 0.0005], [0.001, -0.002]]) {
      const q: LngLat = [p[0] + dx, p[1] + dy];
      const a = stepToward(q, [q[0] - 0.01, q[1]], 25);
      const b = stepToward(q, [q[0] + 0.01, q[1]], 25);
      const r = assignAreas('w', walk([a, b]), [], c, testBoundaries, null, [], [], set);
      // Ask Explore at the very point the piece was placed at.
      const rows = r.rows.filter((x) => r.areas.get(x.area_key)!.level === 'neighborhood');
      const row = rows[0] ?? r.rows.find((x) => r.areas.get(x.area_key)!.level === 'town');
      if (!row) continue;
      const ex = areaFor([row.lon, row.lat], c, set);
      assert.equal(ex?.level === 'neighborhood' ? ex.name : null, rows.length ? r.areas.get(rows[0].area_key)!.name : null, `at ${row.lon},${row.lat}`);
      checked++;
    }
  }
  assert.ok(checked >= 28);
  // Ground only a shape knows (the Downtown macrohood has no tile point here): both say Downtown.
  const downtown: LngLat = [-76.6236, 39.2904];
  const piece = assignAreas('w', walk([stepToward(downtown, [downtown[0] - 0.01, downtown[1]], 25), stepToward(downtown, [downtown[0] + 0.01, downtown[1]], 25)]), [], c, testBoundaries, null, [], [], set);
  assert.deepEqual(hoodNames(piece), ['Downtown']);
  assert.equal(areaFor(downtown, c, set)?.name, 'Downtown');
});

test('HB13: every walk that had a place before still has one after, its neighborhood or its town, never none; nothing is written onto a capture or walk', () => {
  const set = baltimoreSet();
  // From Federal Hill through Downtown ground to Seton Hill and out to unclaimed ground.
  const path = [overturePoint('Federal Hill'), [-76.6236, 39.2904] as LngLat, overturePoint('Seton Hill'), stepToward(overturePoint('Seton Hill'), [-76.7, 39.3], 1500)];
  const before = assignAreas('w', walk(path), [], cands(), testBoundaries, null, [], [], null);
  const after = assignAreas('w', walk(path), [], cands(), testBoundaries, null, [], [], set);
  assert.ok(before.title && after.title, 'a title either way');
  assert.ok(hoodNames(after).includes('Downtown'), 'the stretch of macrohood ground is named, by its shape');
  assert.ok(after.rows.some((x) => after.areas.get(x.area_key)!.level === 'town'), 'the town stands where no neighborhood holds');
  // The placement is the whole result: areas and WalkArea rows and a title, never a capture's or walk's field.
  assert.deepEqual(Object.keys(after).sort(), ['areas', 'rows', 'title']);
  assert.deepEqual(Object.keys(after.rows[0]).sort(), ['area_key', 'first_t', 'last_t', 'lat', 'lon', 'metres', 'walk_id']);
});

test('HB16: a walk\'s neighborhood is the one placing says; a macrohood names it only where no neighborhood shape holds the pieces', () => {
  const sq = townWith([
    { id: 'big', name: 'Big', subtype: 'macrohood', polygons: square(-20, -20, 20, 20) },
    { id: 'small', name: 'Small', polygons: square(-3, -3, 3, 3) },
  ]);
  const c = [townPoint('Squareton', at(0, 0), 3000), hoodPoint('Small', at(0, 0)), hoodPoint('Big', at(10, 10))];
  const inSmall = assignAreas('w', walk([at(-2, 0), at(2, 0)]), [], c, testBoundaries, null, [], [], sq);
  assert.deepEqual(hoodNames(inSmall), ['Small']);
  const inBig = assignAreas('w', walk([at(8, 8), at(14, 8)]), [], c, testBoundaries, null, [], [], sq);
  assert.deepEqual(hoodNames(inBig), ['Big']);
  // Inside Big's shape but 2.5 km from every point: only the shape can name it.
  const far = assignAreas('w', walk([at(-16, -16), at(-12, -16)]), [], c, testBoundaries, null, [], [], sq);
  assert.deepEqual(hoodNames(far), ['Big']);
  // The real map: a walk along Mount Vernon is Mount Vernon's alone.
  const mv = overturePoint('Mount Vernon');
  const real = assignAreas('w', walk([mv, stepToward(mv, overturePoint('Seton Hill'), 100)]), [], cands(), testBoundaries, null, [], [], baltimoreSet());
  assert.deepEqual(hoodNames(real), ['Mount Vernon']);
});
