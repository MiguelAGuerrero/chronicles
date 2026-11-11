import assert from 'node:assert/strict';
import test from 'node:test';
import type { AtlasMark } from '../../atlas/atlas';
import { areaMapMarks, PIN_ROOM, waitingLabel } from '../../atlas/waitingPins';
import type { LngLat } from '../../types';

// tend explore 5: a town at its own scale draws every findable place as a dot, found or not (whole-towns audit 14), and the
// spoken line was built from those dots, so it said "Waiting in Whitehall: art" for art already found, while the card it
// opens has no art under "Waiting to be found". WT11: the line names "the kinds waiting".

const O: LngLat = [-75.47, 40.6];
const east = (m: number): LngLat => [O[0] + m / (111320 * Math.cos((O[1] * Math.PI) / 180)), O[1]];
const mark = (key: string, at: LngLat, category: AtlasMark['category'] = 'art'): AtlasMark => ({ key, category, at });

test('tend explore 5: a town\'s spoken line names only the kinds still waiting, though found places stay dots', () => {
  const marks = [mark('art1', O), mark('park1', east(600), 'parks')];
  const found = new Set(['art1']);
  const town = areaMapMarks('town', marks, found, new Set(), O, 12, O[1]);
  assert.deepEqual(town.dots.map((m) => m.key).sort(), ['art1', 'park1'], 'the found art is still a dot (audit 14)');
  assert.equal(waitingLabel('Whitehall', [...town.pins, ...town.dots], found), 'Waiting in Whitehall: green');
});

test('tend explore 5: with every place found, nothing is said to be waiting', () => {
  const marks = [mark('art1', O)];
  const found = new Set(['art1']);
  const town = areaMapMarks('town', marks, found, new Set(), O, 12, O[1]);
  assert.equal(waitingLabel('Whitehall', [...town.pins, ...town.dots], found), '');
});

test('tend explore 5: zoomed in, where finds are not drawn, the line is as before', () => {
  const marks = [mark('art1', O), mark('park1', east(600), 'parks')];
  const near = areaMapMarks('town', marks, new Set(), new Set(), O, PIN_ROOM.townPinZoom, O[1]);
  assert.equal(waitingLabel('Whitehall', [...near.pins, ...near.dots], new Set()), 'Waiting in Whitehall: art, green');
});
