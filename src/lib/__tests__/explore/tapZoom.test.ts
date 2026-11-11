import assert from 'node:assert/strict';
import test from 'node:test';
import type { AtlasMark } from '../../atlas/atlas';
import { areaMapMarks, halfZoom, PIN_ROOM, roomZoom, tapZoom } from '../../atlas/waitingPins';
import type { LngLat } from '../../types';

// tend explore 7: WT13, a tap on a dot eases the map in "to the zoom at which it has room to be a '?'". A town under
// `townPinZoom` (14) is all dots whatever the room, so easing a town's dot to its room zoom (13 here) left it a dot,
// and only a second tap made it a "?".

const O: LngLat = [-75.47, 40.6];
const east = (m: number): LngLat => [O[0] + m / (111320 * Math.cos((O[1] * Math.PI) / 180)), O[1]];
const mark = (key: string, at: LngLat, category: AtlasMark['category'] = 'art'): AtlasMark => ({ key, category, at });

test('tend explore 7: one tap on a town\'s dot eases in far enough for it to be a "?"', () => {
  const marks = [mark('a', O), mark('b', east(400)), mark('c', east(-900), 'parks')];
  const room = roomZoom(marks[0], marks, O[1]);
  assert.ok(room < PIN_ROOM.townPinZoom, `the fixture's room zoom (${room}) is under the town's pin zoom, as in the finding`);
  const z = tapZoom('town', room, 11);
  const after = areaMapMarks('town', marks, new Set(), new Set(), O, halfZoom(z), O[1]);
  assert.ok(after.pins.some((p) => p.key === 'a'), `at zoom ${z} the tapped place is a "?"`);
});

test('tend explore 7: a neighborhood eases to its room zoom as before, always at least a half level in, at most the cap', () => {
  assert.equal(tapZoom('neighborhood', 13, 11), 13);
  assert.equal(tapZoom('neighborhood', 12, 12), 13);
  assert.equal(tapZoom('town', 20, 12), PIN_ROOM.maxZoom);
});

// tend explore audit 3: a found place is a dot at a town's scale (whole-towns audit 14) and is never drawn from zoom 14 (WT10),
// so easing its dot to the town's pin zoom made the tapped place vanish. A find eases to its room, as before.
test('tend explore audit 3: a found place\'s dot at a town\'s scale is not sent to where finds are not drawn', () => {
  const marks = [mark('a', O), mark('b', east(400)), mark('c', east(-900), 'parks')];
  const room = roomZoom(marks[0], marks, O[1]);
  const z = tapZoom('town', room, 11, false);
  assert.ok(z < PIN_ROOM.townPinZoom, `a find eases to ${z}, under the zoom where it would vanish`);
  const after = areaMapMarks('town', marks, new Set(['a']), new Set(), O, halfZoom(z), O[1]);
  assert.ok(after.dots.some((d) => d.key === 'a'), 'the tapped find is still on the map');
  assert.equal(tapZoom('town', room, 11, true), tapZoom('town', room, 11), 'a place still waiting goes to the pin zoom (tend explore 7)');
});
