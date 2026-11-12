import assert from 'node:assert/strict';
import test from 'node:test';
import { lookWords, moveMapLabel, showHereLabel, mapLabel, centreOf, youFresh, lookedList, listedAround, lookPage, emptyLook } from '../../atlas/freeLook';
import { layerCentre } from '../../atlas/carousel';
import { withNear, type AtlasArea, type Listed, type NearRead } from '../../atlas/atlas';
import { exploreSlots, SCALE_H } from '../../atlas/overlaySlots';
import { FRESH_FIX_MS } from '../../startPlan';
import type { LngLat } from '../../types';

// Free look (specs/free-look): written first, as todos, each failing until its code ("free-look: not built").
// Camp Hill, Pennsylvania, and Carlisle 25 km to the west.
const CAMP_HILL: LngLat = [-76.92, 40.24];
const CARLISLE: LngLat = [-77.19, 40.2];

const area = (name: string, at: LngLat, level: AtlasArea['level'] = 'town'): AtlasArea =>
  ({ key: `${level}:${name}`, name, level, at, reachM: 4000 } as unknown as AtlasArea);
const listed = (name: string, at: LngLat, distanceM: number, here = false): Listed => ({ area: area(name, at), distanceM, here });
const read = (o: Partial<NearRead> & { at: LngLat }): NearRead => ({ build: 'b1', code: 'a9', ...o });


test('FL2: the toggle names what it does and says its state in words', { todo: 'test first' }, () => {
  const off = moveMapLabel(false);
  const on = moveMapLabel(true);
  assert.equal(off.pressed, false);
  assert.equal(on.pressed, true);
  assert.match(off.label, /move map/i);
  assert.match(on.label, /move map/i);
  assert.notEqual(off.hint, on.hint, 'the hint says what a press will do, so it differs by state');
});

test('FL6: centreOf is the map\'s settled middle, null before one is known', { todo: 'test first' }, () => {
  assert.equal(centreOf(null), null);
  assert.deepEqual(centreOf({ center: CARLISLE, zoom: 13 }), CARLISLE);
});

test('FL6 (free-look audit 7): a looked row is in plain distance order from the looked point, whatever outline holds it', { todo: 'test first' }, () => {
  // nearList would move the town whose outline holds the point to the front (`here`); a look does not.
  const list = [listed('Mechanicsburg', [-77.0, 40.21], 15000, true), listed('Carlisle', CARLISLE, 400), listed('Shiremanstown', [-76.97, 40.23], 20000)];
  const out = lookedList(list, CARLISLE, CAMP_HILL);
  assert.deepEqual(out.map((l) => l.area.name), ['Carlisle', 'Mechanicsburg', 'Shiremanstown']);
});

test('FL6 (free-look audit 2): each look is its own page, so a second look frames again', { todo: 'test first' }, () => {
  assert.notEqual(lookPage(CARLISLE), lookPage([-77.0, 40.21]));
  assert.equal(lookPage(CARLISLE), lookPage([CARLISLE[0], CARLISLE[1]]), 'the same point is the same page');
});

test('FL7: a looked list says "here" nowhere', { todo: 'test first' }, () => {
  const list = [listed('Carlisle', CARLISLE, 0, true), listed('Camp Hill', CAMP_HILL, 25000)];
  const out = lookedList(list, CARLISLE, CAMP_HILL);
  assert.ok(out.every((l) => l.here === false));
});

test('FL7 (free-look audit 11): the words say what the page is around and never where the reader is', { todo: 'test first' }, () => {
  const w = lookWords();
  assert.match(w.title, /around the middle of the map/i);
  for (const s of [w.title, w.subtitle, w.announcement, w.empty]) {
    assert.doesNotMatch(s, /not around you|you.?re here|near you|your/i, s);
  }
});

test('FL11 (free-look audit 16): no digit and no rank word in any string the slice adds', { todo: 'test first' }, () => {
  const w = lookWords();
  const strings = [
    w.title, w.subtitle, w.announcement, w.empty, showHereLabel(), mapLabel(true), mapLabel(false),
    moveMapLabel(true).label, moveMapLabel(true).hint, moveMapLabel(false).label, moveMapLabel(false).hint,
  ];
  for (const s of strings) {
    assert.ok(s.length > 0, 'a string is said');
    assert.doesNotMatch(s, /\d/, `no digit in "${s}"`);
    assert.doesNotMatch(s, /\b(top|best|closest|nearest|most|first|ranked?)\b/i, `no rank word in "${s}"`);
  }
});

test('FL12: a looked card measures from a fresh fix of yours', { todo: 'test first' }, () => {
  const list = [listed('Carlisle', CARLISLE, 400), listed('Camp Hill', CAMP_HILL, 25000)];
  const out = lookedList(list, CARLISLE, CAMP_HILL);
  const camp = out.find((l) => l.area.name === 'Camp Hill')!;
  assert.ok(camp.distanceM < 1000, 'Camp Hill is about where you stand');
  assert.ok(out.find((l) => l.area.name === 'Carlisle')!.distanceM > 15000, 'Carlisle is far from you, not from the looked point');
  assert.ok(out.every((l) => !l.unplaced));
});

test('FL12 (free-look audit 4, 13): with no fresh fix a looked card has no distance', { todo: 'test first' }, () => {
  const list = [listed('Carlisle', CARLISLE, 400)];
  const out = lookedList(list, CARLISLE, null);
  assert.equal(out[0].unplaced, true);
});

test('FL12 (free-look audit 4): a fix is you only while it is fresh', { todo: 'test first' }, () => {
  const now = 10_000_000;
  assert.deepEqual(youFresh({ at: CAMP_HILL, t: now - 1000 }, now), CAMP_HILL);
  assert.equal(youFresh({ at: CAMP_HILL, t: now - FRESH_FIX_MS - 1 }, now), null, 'older than the window: no longer you');
  assert.equal(youFresh(null, now), null);
});

test('FL13: a look is announced in words each time it is made, with no count', { todo: 'test first' }, () => {
  assert.match(lookWords().announcement, /showing areas around the middle of the map/i);
  assert.match(mapLabel(true), /arrow keys pan/i);
  assert.match(mapLabel(false), /arrow keys move between areas/i);
});

test('FL15 (free-look audit 1): a read made for a look never stands for the page around you', { todo: 'test first' }, () => {
  const reads = [
    read({ at: CARLISLE, radiusM: 2500, look: true }),
    read({ at: CAMP_HILL, radiusM: 2500 }),
  ];
  assert.deepEqual(listedAround(reads, 2500)?.at, CAMP_HILL);
  assert.equal(listedAround([read({ at: CARLISLE, radiusM: 2500, look: true })], 2500), null);
});

test('FL15 (free-look audit 1): looks do not push out the reads around you', { todo: 'test first' }, () => {
  let reads: NearRead[] = [read({ at: CAMP_HILL, radiusM: 2500 })];
  for (let i = 0; i < 30; i++) reads = withNear(reads, read({ at: [CARLISLE[0] + i * 0.01, CARLISLE[1]], radiusM: 2500, look: true }));
  assert.ok(reads.some((r) => !r.look && r.at === CAMP_HILL), 'the read around you is still kept');
});

test('FL18: the layers centre on the looked page\'s selected area, never on you', { todo: 'test first' }, () => {
  const carlisle = listed('Carlisle', CARLISLE, 400);
  // `from` is the point the page lists around (the look); a looked list never marks "here".
  assert.deepEqual(layerCentre(lookedList([carlisle], CARLISLE, CAMP_HILL)[0], CARLISLE), CARLISLE);
  assert.deepEqual(layerCentre(null, CARLISLE), CARLISLE);
});

test('FL20: a settled look with nothing around it says so, and a busy one says nothing', { todo: 'test first' }, () => {
  assert.match(emptyLook(0, 'idle') ?? '', /no towns or neighborhoods are mapped/i);
  assert.equal(emptyLook(3, 'idle'), null);
  assert.equal(emptyLook(0, 'listing'), null, 'still reading: no claim yet');
  assert.equal(emptyLook(0, 'offline'), null, 'a failed read is no claim about the map');
});

test('FL21 (free-look audit 9): the overlays never overlap in any combination at their own heights', { todo: 'test first' }, () => {
  const PILL_H = 44;
  const OVERLAY_H = 44;
  for (const spot of [false, true]) for (const town of [false, true]) for (const free of [false, true]) {
    const s = exploreSlots({ spot, town, free });
    const boxes: [string, number, number][] = [['scale bar', s.scaleBottom, SCALE_H], ['overlay', s.overlayBottom, OVERLAY_H]];
    if (town) boxes.push(['towns pill', s.townBottom ?? NaN, PILL_H]);
    if (free) boxes.push(['show pill', s.showBottom ?? NaN, PILL_H]);
    for (const [, bottom] of boxes) assert.ok(Number.isFinite(bottom), `${JSON.stringify({ spot, town, free })}: every overlay has a place`);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const [an, ab, ah] = boxes[i];
      const [bn, bb, bh] = boxes[j];
      const apart = ab + ah <= bb || bb + bh <= ab;
      assert.ok(apart, `${JSON.stringify({ spot, town, free })}: ${an} (${ab}+${ah}) and ${bn} (${bb}+${bh}) overlap`);
    }
  }
});
