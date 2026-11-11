import assert from 'node:assert/strict';
import test from 'node:test';
import { COMPLEX_KINDS, type Complex } from '../../complexes/types';
import { complexesFrom, MIN_GO } from '../../complexes/rule';
import { fixture, piecesOf, placesOf, RELEASE, tilesOf } from './fixtures';

// Complexes (specs/complexes): the rule on the real fixtures. Strawberry Square and the Lehigh Valley Mall must be found.

const h = fixture('harrisburg');
const w = fixture('whitehall');
const run = (r: typeof h, tiles = tilesOf(r)) => complexesFrom(piecesOf(r), placesOf(r), tiles, RELEASE);
const named = (cs: Complex[], n: string) => cs.filter((c) => c.name === n);

test('CX1: Strawberry Square and Lehigh Valley Mall are complexes; a bank building, a garage, a church and a cinema are not', { todo: 'test first' }, () => {
  const hc = run(h);
  const wc = run(w);
  assert.equal(named(hc, 'Strawberry Square').length, 1);
  assert.equal(named(wc, 'Lehigh Valley Mall').length, 1);
  for (const n of ['Fulton Bank Building', 'Penn National Insurance Parking Garage', 'Brick Building', 'Midtown Cinema', 'St. Michael Lutheran Church']) assert.equal(named(hc, n).length, 0, n);
  assert.ok(MIN_GO >= 6, 'the minimum is a gate for "made of other places"');
});

test('CX2: no named polygon, no complex; the outline is the source\'s, never altered; the Capitol\'s buildings are not joined', { todo: 'test first' }, () => {
  // Shops with no polygon around them: nothing.
  assert.deepEqual(complexesFrom([], placesOf(w), tilesOf(w), RELEASE), []);
  // The outline of the mall is exactly the union of its pieces' polygons.
  const lvm = named(run(w), 'Lehigh Valley Mall')[0];
  const source = piecesOf(w).filter((p) => p.id === lvm.id).flatMap((p) => p.polygons);
  assert.deepEqual(JSON.stringify([...lvm.polygons].sort()), JSON.stringify([...source].sort()));
  // The Capitol's separate buildings stay separate, and none becomes a complex.
  const hc = run(h);
  for (const n of ['Capitol Building', 'Finance Building', 'North Office Building', 'Health and Welfare Building']) assert.equal(named(hc, n).length, 0, n);
  assert.equal(hc.filter((c) => /capitol complex/i.test(c.name)).length, 0);
});

test('CX3: every complex has one of the five kinds, told by the one table', { todo: 'test first' }, () => {
  const hc = run(h);
  const wc = run(w);
  const kind = (cs: Complex[], n: string) => named(cs, n)[0]?.kind;
  assert.equal(kind(hc, 'Strawberry Square'), 'shopping');
  assert.equal(kind(wc, 'Lehigh Valley Mall'), 'shopping');
  assert.equal(kind(hc, 'Asia Mall'), 'shopping');
  assert.equal(kind(hc, "West Shore Farmer's Market"), 'markets');
  assert.equal(kind(hc, 'Stone Building'), 'markets');
  assert.equal(kind(hc, 'Harrisburg Transportation Center'), 'stations');
  assert.equal(kind(hc, 'Penn State Health Holy Spirit Medical Center'), 'campuses');
  assert.equal(kind(hc, 'Harrisburg University of Science and Technology'), 'campuses');
  assert.equal(kind(hc, 'Rev. Dr. Martin Luther King, Jr. City Government Center'), 'civic');
  assert.equal(kind(hc, 'Dauphin County Courthouse'), 'civic');
  // A parking garage is not a station; a clinic is not a campus; a polygon that fits none is dropped.
  for (const n of ['Walnut St. Garage', "UPMC Children's Community Pediatrics", 'Hamilton Health Center']) assert.equal(named(hc, n).length, 0, n);
  for (const c of [...hc, ...wc]) assert.ok(COMPLEX_KINDS.includes(c.kind), c.name);
});

test('CX14: a complex cut by a tile is one complex, judged only once every tile holding a vertex is read', { todo: 'test first' }, () => {
  // Lehigh Valley Mall has pieces in two tiles: one complex, one outline.
  const all = run(w);
  assert.equal(named(all, 'Lehigh Valley Mall').length, 1);
  assert.equal(new Set(piecesOf(w).filter((p) => p.name === 'Lehigh Valley Mall').map((p) => p.tile.join('/'))).size >= 2, true);
  // With one of its tiles unread it is missing, never a partial outline.
  const only = tilesOf(w).filter(([x, y]) => !(x === 4756 && y === 6165));
  assert.equal(named(run(w, only), 'Lehigh Valley Mall').length, 0);
  // Strawberry Square is whole in one tile; a fragment in the next one west must not drop it when that tile is not read.
  const east = tilesOf(h).filter(([x]) => x === 4693);
  assert.equal(named(complexesFrom(piecesOf(h).filter((p) => p.tile[0] === 4693), placesOf(h), east, RELEASE), 'Strawberry Square').length, 1);
});
