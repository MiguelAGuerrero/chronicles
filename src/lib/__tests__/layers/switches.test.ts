/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Smooth neighborhood switches (SS4, SS7, SS8), written from specs/smooth-switches/spec.md before the code.

type Row = { key: string; centre: [number, number] };
type Hold = { at: [number, number]; m: number };
type Api = {
  busyHold: (town: [number, number], hoods: [number, number][]) => Hold;
  drawnAreas: (rows: Row[], centre: [number, number] | null, hold: Hold | null) => Row[];
  triedAfter: (outcome: 'read' | 'failed' | 'cut') => boolean;
  needsListing: (p: { listed: number | null; version: number }) => boolean;
};
const api = async () => (await import('../../layers/state')) as unknown as Api;

test('SS4: on a town\'s page the areas drawn are the same for every neighborhood, an outer one\'s included', async () => {
  const { busyHold, drawnAreas } = await api();
  // 100 m units east and north of the town's point, at about 40.6 N.
  const P = (x: number, y: number): [number, number] => [-75.4 + x / 846, 40.6 + y / 1105];
  const town = P(0, 0);
  const hoods = [P(-12, 2), P(12, 4), P(-24, 0)];
  const rows: Row[] = [{ key: 'town', centre: P(0, 0) }, { key: 'far', centre: P(-24, 0) }, { key: 'depot', centre: P(12, 4) }, { key: 'away', centre: P(90, 0) }];
  const hold = busyHold(town, hoods);
  const keys = (at: [number, number]) => drawnAreas(rows, at, hold).map((r) => r.key).join(',');
  // Every neighborhood selected on the page draws the same areas: switching never takes lines away.
  assert.equal(keys(hoods[0]), 'town,far,depot');
  assert.equal(keys(hoods[1]), keys(hoods[0]));
  assert.equal(keys(hoods[2]), keys(hoods[0]), 'the outer neighborhood, 2.4 km out, too');
  // An area past every neighborhood's reach is not drawn; off the page, the areas near the centre alone, as before.
  assert.ok(!keys(hoods[1]).includes('away'));
  assert.equal(drawnAreas(rows, hoods[1], null).map((r) => r.key).join(','), 'town,depot');
});

test('SS7: a read cut short is not tried; selected again it reads', async () => {
  const { triedAfter } = await api();
  assert.equal(triedAfter('read'), true);
  assert.equal(triedAfter('failed'), true, 'a failure waits for a toggle or a move of about 1 km (ML9)');
  assert.equal(triedAfter('cut'), false, 'a switch away cut it: the next selection of that area reads it');
});

test('SS8: the remembered areas are listed at the start, after a read and on reload only', async () => {
  const { needsListing } = await api();
  assert.equal(needsListing({ listed: null, version: 0 }), true, 'the layer coming on lists them');
  assert.equal(needsListing({ listed: 0, version: 0 }), false, 'a switch alone lists nothing');
  assert.equal(needsListing({ listed: 0, version: 1 }), true, 'a read finished, or a reload, lists again');
});
