/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import { inFormRegion } from '../../walk/formRegion';

// Where the line may show (specs/place-form PF18): the northeastern United States, where the places the rule was learned from and held to are.

const IN: Record<string, LngLat> = {
  Allentown: [-75.47, 40.6], Boston: [-71.06, 42.36], 'Portland ME': [-70.26, 43.66], Pittsburgh: [-79.99, 40.44], Baltimore: [-76.61, 39.29], Buffalo: [-78.88, 42.89],
  'Burlington VT': [-73.21, 44.48], 'Quaker City OH': [-81.3, 40.05], Alexandria: [-77.05, 38.8], 'Camden ME': [-69.07, 44.21], Albany: [-73.76, 42.65], 'Rochester NY': [-77.61, 43.16],
};
const OUT: Record<string, LngLat> = {
  Zurich: [8.54, 47.38], Toronto: [-79.38, 43.65], Hamilton: [-79.87, 43.25], Montreal: [-73.57, 45.5], Ottawa: [-75.7, 45.42], Chicago: [-87.63, 41.88], Columbus: [-83.0, 39.96],
  Richmond: [-77.43, 37.54], 'Los Angeles': [-118.24, 34.05], London: [-0.13, 51.5], Cleveland: [-81.7, 41.5], Atlanta: [-84.39, 33.75],
};

test('PF18: the line shows in the northeastern United States, where the fixtures are', () => {
  for (const [name, p] of Object.entries(IN)) assert.equal(inFormRegion(p), true, name);
});

test('PF18: it shows nowhere else: not Canada, not Europe, not the rest of the country', () => {
  for (const [name, p] of Object.entries(OUT)) assert.equal(inFormRegion(p), false, name);
});

test('PF18: every real place the rule was learned from or held to lies inside', async () => {
  const { loadSet } = await import('./placeFormFixtures');
  for (const set of [loadSet('Calibration'), loadSet('HeldOut')]) for (const p of set?.places ?? []) assert.equal(inFormRegion(p.at), true, `${p.id} ${p.at}`);
});
