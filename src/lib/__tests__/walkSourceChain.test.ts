/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { overpassQuery, waysFromOverpass } from '../walk/overpass';
import { chain } from '../walk/chain';
import { bandOf } from '../walk/bands';
import type { TileFacts, WalkSource } from '../walk/types';

// Walkability (WK1b, WK8b), written from specs/walkability/spec.md before the code.

const facts = (from: TileFacts['from']): TileFacts => ({ x: 1, y: 2, from, ways: [] });
const source = (r: TileFacts | null | 'throw'): WalkSource & { calls: number } => ({
  calls: 0,
  async read() {
    this.calls++;
    if (r === 'throw') throw new Error('offline');
    return r;
  },
});

test('WK1b: Overpass answers only when Overture can\'t, and the tile says where it came from', async () => {
  const o = source(facts('overture'));
  const p = source(facts('overpass'));
  assert.equal((await chain(o, p).read(1, 2))?.from, 'overture');
  assert.equal(p.calls, 0, 'Overpass is not asked when Overture answered');
  for (const failing of [source(null), source('throw')]) {
    const p2 = source(facts('overpass'));
    assert.equal((await chain(failing, p2).read(1, 2))?.from, 'overpass');
    assert.equal(p2.calls, 1);
  }
  assert.equal(await chain(source(null), source('throw')).read(1, 2), null, 'both fail: nothing, never a throw');
});

test('WK1: the Overpass query carries the tile\'s bounds and nothing else', () => {
  const q = overpassQuery(40.69, -75.2, 40.7, -75.18);
  assert.match(q, /^\[out:json\]\[timeout:\d+\];way\["highway"\]\(40\.69,-75\.2,40\.7,-75\.18\);out tags geom;$/);
  assert.ok(!/key|user|device|email/i.test(q));
});

test('WK8b: Overpass tags give what Overture can\'t: explicit sidewalks, none, speeds, bridges', () => {
  const ways = waysFromOverpass({
    elements: [
      { type: 'way', id: 1, tags: { highway: 'secondary', 'sidewalk:both': 'no', maxspeed: '45 mph' }, geometry: [{ lat: 40.69, lon: -75.19 }, { lat: 40.691, lon: -75.19 }] },
      { type: 'way', id: 2, tags: { highway: 'residential', sidewalk: 'both', maxspeed: '30' }, geometry: [{ lat: 40.69, lon: -75.19 }, { lat: 40.691, lon: -75.19 }] },
      { type: 'way', id: 3, tags: { highway: 'residential', 'sidewalk:left': 'yes', 'sidewalk:right': 'no' }, geometry: [{ lat: 40.69, lon: -75.19 }, { lat: 40.691, lon: -75.19 }] },
      { type: 'way', id: 4, tags: { highway: 'footway', footway: 'crossing' }, geometry: [{ lat: 40.69, lon: -75.19 }, { lat: 40.6901, lon: -75.19 }] },
      { type: 'way', id: 5, tags: { highway: 'primary_link', bridge: 'yes' }, geometry: [{ lat: 40.69, lon: -75.19 }, { lat: 40.6901, lon: -75.19 }] },
      { type: 'way', id: 6, tags: { highway: 'residential', sidewalk: 'separate' }, geometry: [{ lat: 40.69, lon: -75.19 }, { lat: 40.6901, lon: -75.19 }] },
      { type: 'way', id: 7, tags: { highway: 'residential' }, geometry: [{ lat: 40.69, lon: -75.19 }] },
      { type: 'node', id: 8, tags: {} },
    ],
  });
  assert.equal(ways.length, 6, 'a one-point way and a node are dropped');
  const [a, b, c, d, e, f] = ways;
  assert.equal(a.sidewalk, 'none');
  assert.equal(a.speedKmh, 72);
  assert.equal(bandOf(a, { path: false }), 'car', 'secondary, mapped with none');
  assert.equal(b.sidewalk, 'both');
  assert.equal(b.speedKmh, 30);
  assert.equal(c.sidewalk, 'left', 'left=yes, right=no is a sidewalk on the left');
  assert.equal(d.sub, 'crosswalk');
  assert.equal(e.cls, 'primary');
  assert.equal(e.sub, 'link');
  assert.equal(e.level, 1);
  assert.equal(f.sidewalk, 'separate');
});
