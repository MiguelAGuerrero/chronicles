/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankLookLayers, drawnFrom, scaleShown } from '../../scaleBar';

// T17 (the owner's yes, decision 0154): with no fix and nothing drawn the map shows no scale bar over a blank world, on
// Navigate and Explore. The notice's words are tested beside `locate/` (moments/locateNotice.test.ts, tend map audit 18).

test('tend map T17: with no fix and nothing drawn, no scale bar over a blank world; anything else keeps it', () => {
  // Navigate and Explore hide it over a blank world.
  assert.equal(scaleShown({ hideOnBlank: true, fix: false, drawn: false }), false);
  // Until the map has looked, it waits rather than flash "2,000 km".
  assert.equal(scaleShown({ hideOnBlank: true, fix: false, drawn: null }), false);
  assert.equal(scaleShown({ hideOnBlank: true, fix: false, drawn: true }), true);
  assert.equal(scaleShown({ hideOnBlank: true, fix: true, drawn: false }), true);
  assert.equal(scaleShown({ hideOnBlank: true, fix: true, drawn: null }), true);
  // Every other map (the walk, the replay, Chronicle) always draws its bar.
  for (const drawn of [false, null, true]) assert.equal(scaleShown({ hideOnBlank: false, fix: false, drawn }), true);
});

test('tend map audit 14: native counts drawn tiles from roads or water, not places alone', () => {
  // Sea, forest or farmland at z13-16: water or roads, and no place named in view.
  assert.equal(drawnFrom({ roads: 0, water: 3, places: 0 }), true);
  assert.equal(drawnFrom({ roads: 12, water: 0, places: 0 }), true);
  assert.equal(drawnFrom({ roads: 0, water: 0, places: 4 }), true);
  // Nothing loaded: a blank world.
  assert.equal(drawnFrom({ roads: 0, water: 0, places: 0 }), false);
});

test('tend map audit 15: the blank-world look queries only the base fill layers, never buildings', () => {
  const style = [
    { id: 'background', type: 'background' },
    { id: 'water', type: 'fill', 'source-layer': 'water' },
    { id: 'landcover-wood', type: 'fill', 'source-layer': 'landcover' },
    { id: 'building', type: 'fill', 'source-layer': 'building' },
    { id: 'road-primary', type: 'line', 'source-layer': 'transportation' },
    { id: 'place-city', type: 'symbol', 'source-layer': 'place' },
  ];
  assert.deepEqual(blankLookLayers(style), ['water', 'landcover-wood']);
  // A style of streets alone (the e2e's) is queried whole, never skipped.
  assert.deepEqual(blankLookLayers([{ id: 'bg', type: 'background' }, { id: 'roads', type: 'line' }]), ['roads']);
});
