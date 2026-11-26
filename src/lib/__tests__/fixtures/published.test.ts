/// <reference types="node" />
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { PMTiles, type RangeResponse, type Source } from 'pmtiles';
import { createPlacesArchive } from '../../discovery/archive/shell';
import { PLACES_BASE } from '../../discovery/archiveManifest';
import { fakePorts } from '../fakes';

// TF27: the published fixtures pack, read on the web build's read path. published/stowe-marfa.json is a recording of the
// byte ranges that path (net/shell.ts's `source`, the places archive's shell, fixtures/pack.ts) asked of the pack on the
// Pages site for Stowe and Marfa, with the manifest's entry it read; replayed here offline, a range it lacks fails.

const REC = join(__dirname, 'published/stowe-marfa.json');
/* eslint-disable @typescript-eslint/no-explicit-any */
const load = (p: string): Promise<any> => import(String(p));
const TOWNS: Record<string, [number, number, number, number]> = {
  Stowe: [-72.7, 44.455, -72.675, 44.475],
  Marfa: [-104.035, 30.3, -104.008, 30.32],
};
/**
 * town-fixtures audit 10: what OpenStreetMap holds in each view, looked up by a person before the recording (an Overpass
 * query of the thirteen tags over these boxes, the maps.mail.ru mirror, OSM base 2026-11-26T05:13Z), never written by the
 * recorder. Stowe: way 160843429 "Stowe Town Hall" (amenity=townhall), node 366667280 "Stowe Free Library"
 * (amenity=library, wikidata=Q69517895), node 366666797 "Helen Day Art Center" (amenity=library), node 356556082
 * "Stowe Post Office"; no information=office in the view, so no tourist office is asked of Stowe. Marfa: way 1072170098
 * "Marfa Visitor Center / USO" (tourism=information, information=office), way 294564810 "City Hall" (amenity=townhall),
 * way 788794107 "Marfa Public Library", way 294569771 "Presidio County Courthouse" (wikidata=Q7241528), way 294564808
 * "Marfa Post Office". An element renamed or retagged since is a reason to look again, not to loosen this.
 */
const EXPECT: Record<string, { kind: string; name: string }[]> = {
  Stowe: [
    { kind: 'town_hall', name: 'Stowe Town Hall' },
    { kind: 'library', name: 'Stowe Free Library' },
    { kind: 'post_office', name: 'Stowe Post Office' },
  ],
  Marfa: [
    { kind: 'tourist_office', name: 'Marfa Visitor Center / USO' },
    { kind: 'town_hall', name: 'City Hall' },
    { kind: 'library', name: 'Marfa Public Library' },
    { kind: 'courthouse', name: 'Presidio County Courthouse' },
    { kind: 'post_office', name: 'Marfa Post Office' },
  ],
};

test('TF27, town-fixtures audit 10: the app reads Stowe\'s and Marfa\'s fixtures from the published pack through its adapter: the tourist office where OpenStreetMap has one, the town hall, the library, nothing outside the list', { todo: 'waits on the published pack (chronicles-data\'s first fixtures build)' }, async () => {
  assert.ok(existsSync(REC), 'the recording of the published pack');
  const rec = JSON.parse(readFileSync(REC, 'utf8'));
  const { createFixturesPack } = await load('../../fixtures/pack');
  const { decodeFixturesTile, readFixtures } = await load('../../fixtures/read');
  const { FIXTURE_KINDS } = await load('../../fixtures/kinds');
  const open = (url: string) => {
    const src: Source = {
      getKey: () => url,
      getBytes: async (offset: number, length: number): Promise<RangeResponse> => {
        const r = (rec.ranges[url] ?? []).find((x: any) => x.offset === offset && x.length === length);
        if (!r) throw new Error(`not in the recording: ${url} ${offset}+${length}`);
        return { data: new Uint8Array(Buffer.from(r.data, 'base64')).buffer as ArrayBuffer };
      },
    };
    return new PMTiles(src);
  };
  const archive = createPlacesArchive({ ...fakePorts(), io: { base: PLACES_BASE, fetchText: async () => JSON.stringify(rec.manifest), open, decode: () => [] } });
  const pack = createFixturesPack({ manifest: archive, io: { base: PLACES_BASE, open, decode: decodeFixturesTile } });
  assert.match(rec.manifest.regions[0].fixtures.current.file, /^fixtures-us-\d{8}\.\d+\.pmtiles$/);
  for (const [town, view] of Object.entries(TOWNS)) {
    const got = await readFixtures(pack, view);
    for (const f of got) assert.ok(FIXTURE_KINDS.includes(f.kind), `${town}: ${f.kind} is on the list`);
    for (const e of EXPECT[town]) assert.ok(got.some((f: any) => f.kind === e.kind && f.name === e.name), `${town}'s ${e.kind}, ${e.name}, as OpenStreetMap has it`);
    assert.ok(got.some((f: any) => f.kind === 'town_hall') && got.some((f: any) => f.kind === 'library'), `${town}'s town hall and library`);
    assert.equal(got.some((f: any) => f.kind === 'tourist_office'), town === 'Marfa', `${town}'s tourist office, where OpenStreetMap has one`);
  }
});
