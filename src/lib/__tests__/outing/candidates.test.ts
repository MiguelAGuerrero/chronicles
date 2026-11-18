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

test('QC39: the first proposal needs one pick whatever dimensions the data holds; the vocabulary does not change with them', async () => {
  const { planOuting } = await import('../../outing/plan');
  const { WANTS } = await import('../../outing/wants');
  const { leg } = await import('../walk-planner/grid');
  const { FROM, SHOPS } = await import('./fixtures');
  // The same shops, with a second fixture dimension (how: vintage or thrift) on each: one pick on `what` alone still proposes.
  const rich = SHOPS.map((c, i) => ({ ...c, facets: { ...c.facets, how: [i % 2 ? 'thrift' : 'vintage'] } }));
  const one = mergeFacets(WANTS.filter((w) => w.id === 'antiques'));
  const plain = planOuting({ cands: SHOPS, match: one, from: FROM, mode: 'oneway', ceilingM: 3500 }, leg);
  const withHow = planOuting({ cands: rich, match: one, from: FROM, mode: 'oneway', ceilingM: 3500 }, leg);
  assert.ok(withHow.outing, 'no dimension is required: one pick makes a proposal');
  assert.deepEqual(withHow.outing!.stops.map((s) => s.id), plain.outing!.stops.map((s) => s.id), 'an extra dimension changes nothing for a pick that does not name it');
  // The first screen is the vocabulary's entries, however many dimensions candidates carry: they come from the table, not the data.
  assert.deepEqual(WANTS.map((w) => w.id), ['antiques', 'books', 'thrifting']);
  // Picking in the second dimension too narrows (QC38) and still plans from the same page.
  const narrowed = planOuting({ cands: rich, match: mergeFacets([...WANTS.filter((w) => w.id === 'antiques'), want('t', { how: ['thrift'] })]), from: FROM, mode: 'oneway', ceilingM: 3500 }, leg);
  assert.ok((narrowed.outing?.stops ?? []).every((s) => s.facets.how?.includes('thrift')));
});
