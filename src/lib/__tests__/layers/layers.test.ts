/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { LAYERS, type LayerDef } from '../../layers/registry';
import { STOREFRONTS_READ_M, decodeLayers, encodeLayers, layerDefaults, needsStorefrontsRead } from '../../layers/state';
import { createLayers } from '../../layers/shell';
import { layerNotes } from '../../layers/notes';
import { fakePorts } from '../fakes';

// Map layers (ML1, ML2, ML5, ML6, ML7, ML9), written from specs/map-layers/spec.md before the code.

test('ML1, ML2: a layer is data, the three layers have their defaults', () => {
  assert.deepEqual(LAYERS.map((l) => l.id), ['walkability', 'storefronts', 'borders']);
  assert.deepEqual(layerDefaults(), { walkability: false, storefronts: false, borders: false });
  for (const l of LAYERS) {
    assert.ok(l.name.length > 0 && l.icon.length > 0, l.id);
    assert.ok(l.legend.length > 0, `${l.id} has legend rows`);
    for (const r of l.legend) assert.ok(r.key && r.text && r.swatch, `${l.id}/${r.key}`);
  }
});

test('ML1: the state is built from the list, so a layer added later gets its default and nothing else changes', () => {
  const extra: LayerDef[] = [...LAYERS, { id: 'transit', name: 'Transit', icon: 'bus-outline', defaultOn: true, legend: [{ key: 't', text: 'Stops', swatch: 'hotspot' }] }];
  assert.equal(layerDefaults(extra).transit, true);
  const stored = decodeLayers(JSON.stringify({ walkability: true, storefronts: false, borders: true }), null, extra);
  assert.deepEqual(stored, { walkability: true, storefronts: false, borders: true, transit: true });
});

test('ML7: one stored setting; junk, missing parts and unknown layers read as defaults; the old walkability switch is read in once', () => {
  assert.deepEqual(decodeLayers(null, null), layerDefaults());
  assert.deepEqual(decodeLayers('{not json', null), layerDefaults());
  assert.deepEqual(decodeLayers('[1,2]', null), layerDefaults());
  assert.deepEqual(decodeLayers(JSON.stringify({ storefronts: true, nope: true, borders: 'yes' }), null), { walkability: false, storefronts: true, borders: false });
  // Someone who turned walkability on before layers existed keeps it on; a stored setting wins over the old one.
  assert.equal(decodeLayers(null, '1').walkability, true);
  assert.equal(decodeLayers(null, '0').walkability, false);
  assert.equal(decodeLayers(JSON.stringify({ walkability: false }), '1').walkability, false);
  assert.deepEqual(decodeLayers(encodeLayers({ walkability: true, storefronts: true, borders: true }), null), { walkability: true, storefronts: true, borders: true });
});

test('ML5, ML7: switching a layer changes the store at once, is kept, survives a reload, and moves no other layer', async () => {
  const p = fakePorts();
  const a = createLayers(p);
  assert.equal(a.store.get().loaded, false);
  assert.equal(a.store.get().open, false);
  assert.deepEqual(a.store.get().on, layerDefaults(), 'until loaded, the defaults');
  await a.load();
  assert.equal(a.store.get().loaded, true);
  await a.set('storefronts', true);
  assert.equal(a.store.get().on.storefronts, true);
  assert.equal(a.store.get().on.borders, false);
  const b = createLayers(p);
  await b.load();
  assert.deepEqual(b.store.get().on, { walkability: false, storefronts: true, borders: false });
  await b.set('borders', true);
  const c = createLayers(p);
  await c.load();
  assert.deepEqual(c.store.get().on, { walkability: false, storefronts: true, borders: true });
});

test('ML7: the old walkability switch is read in on load, so nobody who turned it on has it turned off', async () => {
  const p = fakePorts();
  await p.db.setMeta('walk_layer', '1');
  const l = createLayers(p);
  await l.load();
  assert.equal(l.store.get().on.walkability, true);
  // Once a layer is switched, the new setting is the one that counts.
  await l.set('walkability', false);
  const again = createLayers(p);
  await again.load();
  assert.equal(again.store.get().on.walkability, false);
});

test('ML6: nothing in a layer\'s name or legend is a number, a count or a percentage', () => {
  for (const l of LAYERS) for (const t of [l.name, l.note ?? '', ...l.legend.flatMap((r) => [r.text, r.tip ?? ''])]) assert.ok(!/\d|%/.test(t), `${l.id}: ${t}`);
});

test('ML9: Busy streets are read once, only where nothing remembered lies within 1.5 km', () => {
  const at: LngLat = [-75.47, 40.6];
  const east = (m: number): LngLat => [at[0] + m / (111_320 * Math.cos((at[1] * Math.PI) / 180)), at[1]];
  assert.equal(STOREFRONTS_READ_M, 1500);
  assert.equal(needsStorefrontsRead([], at), true);
  assert.equal(needsStorefrontsRead([{ centre: east(1400) }], at), false);
  assert.equal(needsStorefrontsRead([{ centre: east(1600) }], at), true);
  assert.equal(needsStorefrontsRead([{ centre: east(5000) }, { centre: east(800) }], at), false);
});

test('ML4: the panel opens and closes on the button, and a tap on the map closes it; a layer\'s switch leaves it open', async () => {
  const l = createLayers(fakePorts());
  await l.load();
  assert.equal(l.store.get().open, false);
  l.togglePanel();
  assert.equal(l.store.get().open, true);
  await l.set('storefronts', true);
  assert.equal(l.store.get().open, true, 'switching a layer does not close the panel');
  l.closePanel();
  assert.equal(l.store.get().open, false);
  l.closePanel();
  assert.equal(l.store.get().open, false, 'closing a closed panel changes nothing');
  l.togglePanel();
  l.togglePanel();
  assert.equal(l.store.get().open, false);
});

// Where I've been (specs/where-ive-been WB4, WB10-WB12), written before the code: the layer is found by its id and the
// notes' new field reached through a cast, so the typecheck holds while the tests fail.
const pastLayer = () => LAYERS.find((l) => l.id === 'past');
type PastStatus = 'off' | 'waiting' | 'preparing' | 'none' | 'ready';
const notesWith = (past: PastStatus) =>
  (layerNotes as unknown as (s: Record<string, unknown>) => Record<string, string | null>)({ walkability: 'off', storefrontsReading: false, storefrontsFailed: false, past });

test('WB4: the panel lists "Where I\'ve been", off by default, after the three before it', { todo: 'test first' }, () => {
  const l = pastLayer();
  assert.ok(l, 'a layer with the id past');
  assert.equal(l.name, 'Where I\'ve been');
  assert.equal(l.defaultOn, false);
  assert.equal(layerDefaults().past, false);
  assert.deepEqual(LAYERS.map((x) => x.id), ['walkability', 'storefronts', 'borders', 'past']);
  assert.ok(l.icon.length > 0);
});

test('WB10: nothing in its name, legend or notes is a number, a percentage, a date or a tally of coverage', { todo: 'test first' }, () => {
  const l = pastLayer();
  assert.ok(l);
  const words = [l.name, l.note ?? '', ...l.legend.flatMap((r) => [r.text, r.tip ?? '']), ...(['waiting', 'preparing', 'none'] as const).map((s) => notesWith(s).past ?? '')];
  for (const w of words) {
    assert.doesNotMatch(w, /\d|%/, `no number (${w})`);
    assert.doesNotMatch(w, /\b(explored|covered|coverage|complete|of all|january|february|march|april|may|june|july|august|september|october|november|december|yesterday|today|ago)\b/i, `no tally or date (${w})`);
  }
});

test('WB11: its legend is one row in words, "Your earlier walks", on its own swatch', { todo: 'test first' }, () => {
  const l = pastLayer();
  assert.ok(l);
  assert.deepEqual(l.legend.map((r) => [r.text, r.swatch]), [['Your earlier walks', 'past']]);
});

test('WB12: on but with nothing to draw, it says why in words; off or drawing, nothing', { todo: 'test first' }, () => {
  assert.equal(notesWith('waiting').past, 'Waiting for your position');
  assert.equal(notesWith('preparing').past, 'Getting your walks ready…');
  assert.equal(notesWith('none').past, 'None of your walks pass here');
  assert.equal(notesWith('off').past, null);
  assert.equal(notesWith('ready').past, null);
});
