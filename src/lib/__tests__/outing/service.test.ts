import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WANTS } from '../../outing/wants';
import { createOutingService, READ_M } from '../../outing/service';
import { memoryStores, type StoresSource } from '../../outing/storesRead';
import type { Store } from '../../outing/stores';
import { fakePorts } from '../fakes';
import { at, segs } from '../walk-planner/grid';
import { FROM } from './fixtures';

// The outing's shell (QC29, QC24): over fakePorts, with no db or meta write, no pack read before a pick, the tile path only.

const books = WANTS.filter((w) => w.id === 'books');
const store = (id: string, e: number, n: number, name: string): Store => ({ id, name, at: at(e, n), facets: { what: ['books'] }, src: 'osm' });
const STORES = [store('s_1', 360, 120, 'Half Price Books'), store('s_2', 600, 360, 'Starred Books'), store('s_3', 240, 480, 'Page Turner')];

function harness(stores: readonly Store[] = STORES) {
  const ports = fakePorts();
  const log = { reads: [] as [number, number][], packReads: 0 };
  const source: StoresSource = {
    read: async (p, r) => {
      log.packReads++;
      return memoryStores(stores).read(p, r);
    },
  };
  const service = createOutingService({
    read: async (p) => (log.reads.push(p), { shops: [], segments: segs }),
    stores: source,
  });
  return { ports, log, service };
}

test('QC29: opening the page and planning write nothing and read no pack before an entry is picked', async () => {
  const { ports, log, service } = harness();
  assert.equal(await service.open(FROM, []), null, 'nothing picked: no session');
  assert.equal(log.reads.length + log.packReads, 0, 'no tile read and no pack read before a pick');
  assert.equal(await service.open(null, books), null, 'no position: nothing is read');
  assert.equal(log.reads.length + log.packReads, 0);
  const session = await service.open(FROM, books);
  assert.ok(session);
  assert.equal(log.packReads, 1, 'the pack is read once, after the pick');
  const a = service.plan({ session: session!, picked: books, mode: 'oneway', ceilingM: 3500, chains: false });
  service.plan({ session: session!, picked: books, mode: 'loop', ceilingM: 3500, chains: false });
  assert.equal(log.packReads, 1, 'planning again reads nothing');
  assert.ok(a.outing, 'Books is served by the pack alone');
  assert.deepEqual(ports.log.effects(), [], 'no db, meta or recorder call');
});

test('QC24: a stop is named from the data at a tap or at arrival, and the name is not stored', async () => {
  const { ports, service } = harness();
  const session = (await service.open(FROM, books))!;
  const answer = service.plan({ session, picked: books, mode: 'oneway', ceilingM: 3500, chains: false });
  const stop = answer.outing!.stops[0];
  assert.equal(JSON.stringify(answer.outing!.stops.map((s) => ({ id: s.id, at: s.at, facets: s.facets }))).includes('Books'), false, 'the plan\'s stops hold positions, not names');
  const name = await service.nameNear(stop.at, false);
  assert.ok(STORES.some((s) => s.name === name), `looked up from the pack (${name})`);
  assert.equal(await service.nameNear(at(5000, 5000), false), null, 'nothing near, nothing said');
  assert.deepEqual(ports.log.effects(), [], 'nothing stored');
});

test('QC29: the pack request holds the tile path and nothing else', async () => {
  const seen: unknown[][] = [];
  const service = createOutingService({
    read: async () => ({ shops: [], segments: segs }),
    stores: { read: async (...args) => (seen.push(args), []) },
  });
  await service.open(FROM, books);
  assert.equal(seen.length, 1);
  // The source gets a position and a radius only: no identifier, no picks, no setting; READ_M is the tile area read.
  assert.deepEqual(seen[0], [FROM, READ_M]);
});
