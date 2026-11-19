/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { LAYERS } from '../../layers/registry';
import { decodeLayers, encodeLayers } from '../../layers/state';

// Places layer (specs/places-layer PL1, PL8-PL10, PL12, PL13), written before the code. The "?" for places worth the stop
// are a layer of their own, on Explore's map only, on by default.

const ROOT = join(__dirname, '../../../..');
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const registry = async () => (await import('../../layers/registry')) as typeof import('../../layers/registry') & { layersFor?: (map: string) => readonly { id: string }[] };

test('PL1, PL9 (amended by MD13): "Places" is a layer of every map\'s panel since decision 0234', async () => {
  const { layersFor } = await registry();
  assert.ok(layersFor, 'layersFor(map) exists');
  for (const map of ['explore', 'navigate', 'walk']) assert.ok(layersFor(map).some((l) => l.id === 'places'), `${map} lists Places`);
  const places = LAYERS.find((l) => l.id === 'places');
  assert.equal(places?.name, 'Places');
  assert.equal(places?.defaultOn, true);
});

test('PL8: a setting saved without places reads as on; no other choice moves; an off Places survives', () => {
  const old = decodeLayers(JSON.stringify({ walkability: true, storefronts: false, borders: true, past: true }), null);
  assert.equal(old.places, true);
  assert.deepEqual({ ...old, places: undefined }, { walkability: true, storefronts: false, borders: true, past: true, places: undefined });
  const off = decodeLayers(encodeLayers({ ...old, places: false }), null);
  assert.equal(off.places, false);
});

test('PL10, PL7: the legend is a "?" and "A place worth the stop": words, no digit, none of find/left/remaining/unfound', () => {
  const l = LAYERS.find((x) => x.id === 'places');
  assert.ok(l, 'the layer exists');
  assert.deepEqual(l.legend.map((r) => r.text), ['A place worth the stop']);
  const words = [l.name, ...l.legend.flatMap((r) => [r.text, r.tip ?? '']), l.note ?? ''].join(' ');
  assert.ok(!/\d|find|found|left|remaining|unfound/i.test(words), words);
});

test('PL12: the panel and its key take their map (every map lists Places since MD13)', () => {
  const control = src('src/components/LayersControl.tsx');
  assert.ok(/layersFor\(/.test(control), 'LayersControl and LayersKey list layersFor(map)');
  assert.ok(!/LAYERS\.(filter|map|some)\(/.test(control), 'no host reads the whole list any more');
  assert.ok(/map="explore"/.test(src('src/app/(tabs)/explore.tsx')));
  assert.ok(/map="navigate"/.test(src('src/components/walk/useReady.tsx')));
  assert.ok(/map="walk"/.test(src('src/app/walk.tsx')));
  assert.ok(/map="walk"/.test(src('src/components/StartSettings.tsx')) || /map="navigate"/.test(src('src/components/StartSettings.tsx')), 'the key in the start settings names its map');
});

test('PL13: the layer sits above the kinds: a switched-off kind still hides its marks while Places is on', async () => {
  const { waitingMarks } = await import('../../atlas/atlas');
  const at: [number, number] = [-75.4, 40.6];
  const marks = [{ key: 'a', category: 'art' as const, kind: 'public_art' as never, at }, { key: 'h', category: 'history' as const, kind: 'monuments' as never, at }];
  assert.equal(waitingMarks(marks, new Set(), at, new Set(['public_art' as never]), { all: true }).length, 1);
  assert.ok(/layers\.on\.places/.test(src('src/app/(tabs)/explore.tsx')), 'the screen reads the layer in front of the kinds');
});

test('places-layer ui 1: the card\'s Sights line never says the "?" is on the map, since Places can be off', async () => {
  const { SIGHTS_LINE } = await import('../../atlas/atlas');
  assert.ok(!/on the map/i.test(SIGHTS_LINE), SIGHTS_LINE);
});
