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

test('TF27: the app reads Stowe\'s and Marfa\'s fixtures from the published pack through its adapter: the tourist office where OpenStreetMap has one, the town hall, the library, nothing outside the list', { todo: 'waits on the published pack (chronicles-data\'s first fixtures build)' }, async () => {
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
    const kinds = new Set(got.map((f: any) => f.kind));
    for (const k of kinds) assert.ok(FIXTURE_KINDS.includes(k), `${town}: ${k} is on the list`);
    assert.ok(kinds.has('town_hall'), `${town}'s town hall`);
    assert.ok(kinds.has('library'), `${town}'s library`);
    for (const k of rec.expect?.[town]?.kinds ?? []) assert.ok(kinds.has(k), `${town}'s ${k}, as OpenStreetMap has it`);
    assert.deepEqual(got.map((f: any) => `${f.kind}:${f.name ?? ''}`).sort(), [...rec.read[town].map((f: any) => `${f.kind}:${f.name ?? ''}`)].sort(), `${town}: what the web read path read on the day`);
  }
});
