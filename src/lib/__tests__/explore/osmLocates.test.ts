/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { PlaceCandidate } from '../../areas/types';
import { mergePlaces } from '../../discovery/archiveMerge';
import { archivePlace, placesFromArchive, UNNAMED_LABEL } from '../../discovery/archivePois';
import { isMarkable } from '../../discovery/noise';
import { buildChecklists, findFor } from '../../explore/explore';

// OpenStreetMap locates places (specs/osm-locates, decision 0142), the app's side: OL10-OL12. OL1-OL9 are the build's,
// proven in chronicles-data (test/osmLocates.test.ts, the same ids).

const C = join(__dirname, 'contract');
const read = (p: string) => JSON.parse(readFileSync(join(C, p), 'utf8'));
const pt = (lon: number, lat: number, props: Record<string, unknown>) => ({ geometry: { type: 'Point' as const, coordinates: [lon, lat] }, properties: props });
// Near Division Street and North 4th Street, Harrisburg; a stand-in for the obelisk the walker passed.
const OBELISK: [number, number] = [-76.8872, 40.2688];
const fox: PlaceCandidate = { level: 'neighborhood', name: 'Midtown', at: OBELISK, reachM: 1000 };

test('OL10: the app pins contract v3: a place may have no name, and the new source is one that locates', () => {
  for (const f of ['places.schema.json', 'sources.json', 'manifest.schema.json']) assert.equal(read(f).contractVersion, 3, f);
  const feature = read('places.schema.json').feature;
  assert.ok(!(feature.required ?? []).includes('name'), 'a feature may have no name');
  assert.deepEqual(Object.keys(feature.properties).sort(), ['class', 'id', 'name', 'src']);
  assert.equal(feature.additionalProperties, false);
  const osmPlaces = read('sources.json').sources.find((s: { name: string }) => s.name === 'osm-places');
  assert.equal(osmPlaces?.role, 'locates');
  assert.equal(osmPlaces?.licenseFamily, 'odbl');
});

test('OL11: an unnamed archive place is a mark whose card calls it A monument, never unnamed and never a count', () => {
  const [p] = placesFromArchive([pt(OBELISK[0], OBELISK[1], { class: 'monument', src: 'osmp', id: 'p_0000000000000001' })], 'v1');
  assert.equal(p.name, UNNAMED_LABEL);
  assert.equal(UNNAMED_LABEL, 'A monument');
  assert.equal(p.generic, true);
  assert.deepEqual([p.category, p.kind, p.markable], ['history', 'monuments', true]);
  assert.equal(isMarkable(p), true);
  assert.ok(!/unnamed|\d/i.test(p.name));
  // The same classes OpenStreetMap's monuments and memorials come in; any other class still needs a name.
  for (const cls of ['memorial', 'statue']) assert.ok(archivePlace('', cls, OBELISK, 'v1'), cls);
  for (const cls of ['folly', 'church', 'mural']) assert.equal(archivePlace('', cls, OBELISK, 'v1'), null, cls);
  // A named place is unchanged, and an unnamed one is keyed by its position, so two apart are two places.
  assert.equal(archivePlace('Hessian Monument', 'monument', OBELISK, 'v1')?.generic, false);
  const two = placesFromArchive([pt(OBELISK[0], OBELISK[1], { class: 'monument' }), pt(OBELISK[0] + 0.01, OBELISK[1], { class: 'monument' })], 'v1');
  assert.equal(new Set(two.map((x) => x.key)).size, 2);
});

test('OL12: an OpenStreetMap-only obelisk in an archive tile is a mark within 60 m of a capture, and finds it', () => {
  const archive = placesFromArchive([pt(OBELISK[0], OBELISK[1], { class: 'monument', src: 'osmp', id: 'p_0000000000000001' })], 'v20261111');
  const built = buildChecklists({ places: mergePlaces([], archive), candidates: [fox], centre: OBELISK, build: 'b1', now: 1, archive: 'v20261111' });
  assert.equal(built.items.length, 1, 'the unnamed obelisk is on the area\'s checklist');
  const capture: [number, number] = [OBELISK[0] + 0.0004, OBELISK[1]]; // about 33 m east
  const found = findFor(capture, built.items, new Set());
  assert.equal(found?.name, 'A monument');
  assert.equal(found?.kind, 'monuments');
  assert.equal(findFor([OBELISK[0] + 0.002, OBELISK[1]], built.items, new Set()), null, 'a capture 170 m away finds nothing');
});
