import assert from 'node:assert/strict';
import { test } from 'node:test';
import { knownFacets, matches, mergeFacets, type Want } from '../../outing/candidates';

const want = (id: string, match: Want['match']): Want => ({ id, label: id, aliases: [], match, slotWord: 'a place' });

test('QC38: picking within a dimension widens, across dimensions narrows', () => {
  const within = mergeFacets([want('a', { what: ['antiques'] }), want('b', { what: ['books'] })]);
  assert.equal(matches(within, { facets: { what: ['books'] } }), true);
  assert.equal(matches(within, { facets: { what: ['antiques'] } }), true);
  assert.equal(matches(within, { facets: { what: ['maps'] } }), false);
  const across = mergeFacets([want('a', { what: ['books'] }), want('t', { how: ['thrift'] })]);
  assert.equal(matches(across, { facets: { what: ['books'], how: ['thrift'] } }), true);
  assert.equal(matches(across, { facets: { what: ['books'], how: ['new'] } }), false, 'all dimensions must match');
  assert.equal(matches(across, { facets: { what: ['books'] } }), false, 'a missing dimension does not match');
});

test('QC38: an empty match matches nothing', () => {
  assert.equal(matches({}, { facets: { what: ['books'] } }), false);
});

test('QC37: the core holds no word of any dimension or kind of place', async () => {
  const { readFileSync } = await import('node:fs');
  for (const f of ['candidates', 'pick', 'plan', 'swap', 'dest', 'arrival']) {
    const src = readFileSync(new URL(`../../outing/${f}.ts`, import.meta.url), 'utf8');
    assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /antiques|books|thrift|vintage|\bshop\b|store/i, f);
  }
});

test('QC40: unknown dimensions and values are ignored, never an error', () => {
  const dims = { what: ['antiques', 'books'] };
  assert.deepEqual(knownFacets({ what: ['books', 'teapots'], mood: ['calm'] }, dims), { what: ['books'] });
  assert.deepEqual(knownFacets({ mood: ['calm'] }, dims), {});
  assert.deepEqual(knownFacets(null, dims), {});
});

test('QC39: the first proposal needs one pick whatever dimensions the data holds; the vocabulary does not change with them', { todo: 'test first' }, () => {
  assert.fail('written with its code');
});
