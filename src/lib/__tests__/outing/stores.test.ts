import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIMENSIONS, isStore, asCandidate } from '../../outing/stores';
import { memoryStores, readStores, storesFromFeatures } from '../../outing/storesRead';

const good = { id: 's_0123456789abcdef', name: 'Old Door', at: [-75.38, 40.62], facets: { what: ['antiques'] }, src: 'osm' };

test('QC11: a store holds exactly an id, name, position, facets and source', () => {
  assert.equal(isStore(good), true);
  for (const extra of ['rating', 'reviews', 'stars', 'price', 'popularity', 'footTraffic', 'photo', 'openNow', 'hours', 'wikipedia']) {
    assert.equal(isStore({ ...good, [extra]: 1 }), false, extra);
  }
  assert.equal(isStore({ ...good, facets: { what: ['teapots'] } }), false, 'a value outside the closed list');
});

test('QC40: the contract has the what dimension; how is reserved, not read yet', () => {
  assert.deepEqual(Object.keys(DIMENSIONS), ['what']);
  assert.ok(DIMENSIONS.what.includes('antiques') && DIMENSIONS.what.includes('books'));
});

test('QC14: the reader takes the five properties and nothing else from a pack feature', () => {
  const out = storesFromFeatures([
    { lon: -75.38, lat: 40.62, props: { name: 'Old Door', id: 's_1', src: 'osm', what: 'antiques,books', rating: 4.9, reviews: 812, popularity: 9, hours: 'Mo-Fr 10:00-18:00' } },
  ]);
  assert.equal(out.length, 1);
  assert.deepEqual(Object.keys(out[0]).sort(), ['at', 'facets', 'id', 'name', 'src']);
  assert.deepEqual(out[0].facets, { what: ['antiques', 'books'] });
});

test('QC12: nothing is read from a rating, count or popularity field', () => {
  const a = storesFromFeatures([{ lon: 1, lat: 1, props: { name: 'A', id: 's_1', src: 'osm', what: 'books' } }]);
  const b = storesFromFeatures([{ lon: 1, lat: 1, props: { name: 'A', id: 's_1', src: 'osm', what: 'books', rating: 5, user_ratings_total: 9000, wikipedia: 'en:A', sitelinks: 40 } }]);
  assert.deepEqual(a, b);
});

test('QC40: an unknown dimension or value is dropped; a feature with no known facet is no store', () => {
  const out = storesFromFeatures([
    { lon: 1, lat: 1, props: { name: 'A', id: 's_1', src: 'osm', what: 'books,teapots', mood: 'calm' } },
    { lon: 2, lat: 2, props: { name: 'B', id: 's_2', src: 'osm', what: 'teapots' } },
    { lon: 3, lat: 3, props: { id: 's_3', src: 'osm', what: 'books' } },
  ]);
  assert.deepEqual(out.map((s) => s.id), ['s_1']);
  assert.deepEqual(out[0].facets, { what: ['books'] });
});

test('QC14: an in-memory source answers by distance; a failing or missing source leaves nothing and says nothing', async () => {
  const near = { ...good, at: [-75.38, 40.62] as [number, number] };
  const far = { ...good, id: 's_far', at: [-75.0, 40.9] as [number, number] };
  assert.deepEqual((await readStores(memoryStores([near, far]), [-75.38, 40.62], 1500)).map((s) => s.id), [near.id]);
  assert.deepEqual(await readStores(null, [0, 0], 1500), []);
  const failing = { read: async () => { throw new Error('offline'); } };
  assert.deepEqual(await readStores(failing, [0, 0], 1500), []);
  assert.equal(asCandidate(near).name, 'Old Door');
});
