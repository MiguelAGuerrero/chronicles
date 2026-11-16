import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outingCandidates, type TileShop } from '../../outing/storesMerge';
import type { Store } from '../../outing/stores';

const store = (id: string, name: string, lon: number, lat: number, what: string[]): Store => ({ id, name, at: [lon, lat], facets: { what }, src: 'osm' });

test('QC15: a store in the pack and the same shop in the tiles are one stop, the pack kept by rule', () => {
  const out = outingCandidates([store('s_1', 'Old Door', -75.38, 40.62, ['antiques'])], [{ name: 'old door', at: [-75.3805, 40.6203], classes: ['antiques', 'boutique'] }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 's_1');
});

test('QC15: the pack wins whatever either record looks like (a popular-looking fixture changes nothing)', () => {
  const tile: TileShop & Record<string, unknown> = { name: 'Old Door', at: [-75.38, 40.62], classes: ['antiques'], rating: 5, popularity: 99 };
  const a = outingCandidates([store('s_1', 'Old Door', -75.38, 40.62, ['antiques'])], [tile]);
  const quiet: TileShop & Record<string, unknown> = { ...tile, rating: 1, popularity: 0 };
  const b = outingCandidates([store('s_1', 'Old Door', -75.38, 40.62, ['antiques'])], [quiet]);
  assert.deepEqual(a, b);
});

test('QC15: two shops of the same name more than 200 m apart are two stops', () => {
  const out = outingCandidates([store('s_1', 'Old Door', -75.38, 40.62, ['antiques'])], [{ name: 'Old Door', at: [-75.38, 40.6235], classes: ['antiques'] }]);
  assert.equal(out.length, 2);
});

test('QC14: with no pack the tiles serve the same table', () => {
  const out = outingCandidates([], [{ name: 'Old Door', at: [-75.38, 40.62], classes: ['antiques', 'boutique'] }, { name: 'Gift Box', at: [-75.381, 40.621], classes: ['boutique'] }]);
  assert.deepEqual(out.map((c) => c.name), ['Old Door']);
  assert.deepEqual(out[0].facets, { what: ['antiques'] });
});

test('QC13: a chain is never a stop', () => {
  const out = outingCandidates([store('s_9', 'Barnes & Noble', -75.38, 40.62, ['books'])], [{ name: 'Barnes & Noble', at: [-75.39, 40.63], classes: ['boutique'] }]);
  assert.deepEqual(out, []);
});

test('QC31: no store reaches marks, the archive or a checklist: only outing/ imports the stores modules', async () => {
  const { execSync } = await import('node:child_process');
  const hits = execSync(`grep -rlE "outing/(stores|storesRead|storesMerge)" src --include=*.ts --include=*.tsx || true`, { cwd: new URL('../../../../', import.meta.url), encoding: 'utf8' })
    .split('\n').filter(Boolean).filter((f) => !f.startsWith('src/lib/outing/') && !f.startsWith('src/lib/__tests__/outing/') && !f.startsWith('src/components/outing/'));
  assert.deepEqual(hits, []);
});
