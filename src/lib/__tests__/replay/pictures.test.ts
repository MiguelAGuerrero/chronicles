/// <reference types="node" />
// Replay ceremony, what stays on the map (specs/replay-ceremony/spec.md, RC28, RC34; decision 0206), written before the
// code: what is not built yet is reached through casts and a guarded load (`walks.ts`). What the screen shows of it is
// the `replay` journey's too.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Faced } from '../../moment';
import type { LngLat, TracePoint } from '../../types';
import { at, built, cam, cap, fitCamera, frameAt, mod, overlaysOf, PHONE, planOf, project, segOf, several, SRC, walkOf, wholeOf, type Cam, type Screen } from './walks';

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const picturesMod = mod('lib/ceremony/pictures.ts');
const roomMod = mod('lib/ceremony/room.ts');
const layoutMod = mod('components/ceremony/layout.ts');
type Standing = { shown: boolean; layered: boolean };
const standing = (places: LngLat[], several: boolean[], zoom: number, apart: number) => built<(places: LngLat[], several: boolean[], zoom: number, apart: number) => Standing[]>(picturesMod, 'standing')(places, several, zoom, apart);
const PICTURE = () => built<{ size: number; lift: number; apart: number }>(roomMod, 'PICTURE');
type Picture = { kind: string; key: string; capture: Faced; at: LngLat; shown: boolean; layered: boolean; video: boolean };
const picturesOf = (f: ReturnType<typeof frameAt>) => overlaysOf(f, 'picture') as unknown as Picture[];
type Card = { capture: Faced; t0: number; t1: number };
const cardsOf = (p: ReturnType<typeof planOf>) => p.cards as unknown as Card[];
type Pose = { left?: number; top?: number; opacity?: number; scale?: number; rotate?: number };

/** Photos at these metres along the walk of `walks.ts` (its own photo is 119 m in), a video among them. */
function photosAt(metres: number[], video: number | null = null) {
  const kept: Faced[] = [];
  const w = walkOf([], (fixes: TracePoint[]) => {
    for (const m of metres) kept.push(cap('photo', fixes[Math.round(m / 7)].t, at(m)));
    if (video != null) kept.push(cap('video', fixes[Math.round(video / 7)].t, at(video), '4000'));
    return kept;
  });
  return { ...w, kept };
}

// ---------------------------------------------------------------- the card goes to its place (RC28)

test('RC28: a card shrinks onto its own place on the map, where its picture then stands, not into a corner', () => {
  const { story, photo } = walkOf();
  const p = planOf(story);
  const card = cardsOf(p)[0];
  const P = PICTURE();
  const cardPose = built<(o: unknown, c: unknown, camera: Cam, w: number, h: number) => Pose>(layoutMod, 'cardPose');
  const cardSize = built<(s: Screen) => { w: number; h: number }>(roomMod, 'cardSize');
  const { w, h } = cardSize(PHONE);
  const ctx = { ...PHONE, live: null, held: false, paused: false, reduceMotion: false, open() {}, wait() {} };
  const poseAt = (ms: number) => {
    const f = frameAt(p, ms);
    const o = overlaysOf(f, 'card')[0];
    assert.ok(o, `the card is up at ${ms - card.t0} ms`);
    return { pose: cardPose(o, ctx, f.camera, w, h), f };
  };
  // Its last frame: over its own place, the size of the picture that will stand there, upright.
  const { pose, f } = poseAt(card.t1 - 1);
  const place = project(PHONE, cam(f), [photo.lon!, photo.lat!]);
  const centre = [pose.left! + w / 2, pose.top! + h / 2];
  assert.ok(Math.hypot(centre[0] - place[0], centre[1] - (place[1] - P.lift)) < 3, `it ends at ${centre.map(Math.round)}, its place is ${place.map(Math.round)}`);
  assert.ok(Math.abs(pose.scale! * w - P.size) < 2, `it ends ${Math.round(pose.scale! * w)} px wide`);
  assert.ok(Math.abs(pose.rotate ?? 0) < 0.5, 'upright');
  // Not a corner: nowhere near where the pile was.
  assert.ok(centre[0] < PHONE.width - 80, 'it went to the corner');
  // And the picture stands there from the next frame on, at the moment's place.
  assert.deepEqual(picturesOf(frameAt(p, card.t1 - 1)), []);
  const stood = picturesOf(frameAt(p, card.t1));
  assert.equal(stood.length, 1);
  assert.deepEqual([stood[0].key, stood[0].at, stood[0].shown, stood[0].video], [photo.id, [photo.lon, photo.lat], true, false]);
  // The picture's own pose puts it there too: the two meet.
  const picturePose = built<(o: unknown, c: unknown, camera: Cam) => Pose>(layoutMod, 'picturePose');
  const pp = picturePose(stood[0], ctx, frameAt(p, card.t1).camera);
  assert.ok(Math.hypot(pp.left! + P.size / 2 - place[0], pp.top! + P.size / 2 - (place[1] - P.lift)) < 1.5 && pp.opacity === 1);
  // With reduce motion the card fades where it rests, as before, and the picture is there after it.
  const still = planOf(story, { reduceMotion: true, whole: wholeOf(walkOf().bounds) });
  assert.equal(picturesOf(frameAt(still, cardsOf(still)[0].t1)).length, 1);
});

// ---------------------------------------------------------------- each moment stands as its picture (RC34)

test('RC34: where two pictures would overlap the later one shows, with a layered edge', () => {
  const apart = PICTURE().apart;
  const m = (zoom: number) => 1 / ((512 * 2 ** zoom) / (40075016.686 * Math.cos((41.812 * Math.PI) / 180)));
  const z = 15;
  const far = (apart * 1.5) * m(z);
  const close = (apart * 0.6) * m(z);
  // Apart: both stand. Close: the later one, layered; the earlier is under it.
  assert.deepEqual(standing([at(0), at(far)], [false, false], z, apart), [{ shown: true, layered: false }, { shown: true, layered: false }]);
  assert.deepEqual(standing([at(0), at(close)], [false, false], z, apart), [{ shown: false, layered: false }, { shown: true, layered: true }]);
  // A moment of several pieces has a layered edge wherever it stands.
  assert.deepEqual(standing([at(0), at(far)], [true, false], z, apart), [{ shown: true, layered: true }, { shown: true, layered: false }]);
  // It is the map's zoom that says: the same two stand apart closer in, and one covers the other farther out.
  assert.deepEqual(standing([at(0), at(far)], [false, false], z - 1, apart).map((s) => s.shown), [false, true]);
  assert.deepEqual(standing([at(0), at(close)], [false, false], z + 1.5, apart).map((s) => s.shown), [true, true]);
  // Three in a row, each covering only its neighbour: the last shows, the middle is under it, and the first, which
  // nothing shown covers, stands too.
  const step = (apart * 0.7) * m(z);
  assert.deepEqual(standing([at(0), at(step), at(2 * step)], [false, false, false], z, apart).map((s) => s.shown), [true, false, true]);
  // North and south count as east and west do.
  assert.deepEqual(standing([at(0, 0), at(0, close)], [false, false], z, apart).map((s) => s.shown), [false, true]);
  // Hundreds at once, in no time to speak of: every frame of a rise asks.
  const many = Array.from({ length: 600 }, (_, i) => at((i % 40) * 30, Math.floor(i / 40) * 30));
  const before = process.hrtime.bigint();
  const all = standing(many, many.map(() => false), 14, apart);
  const took = Number(process.hrtime.bigint() - before) / 1e6;
  const shown = all.filter((s) => s.shown).length;
  // 30 m apart is about 8 px at zoom 14: a few dozen stand, a few px over `apart` from each other, the rest under them.
  assert.ok(took < 50 && shown >= 20 && shown < 120, `${shown} of 600 stand, worked out in ${took.toFixed(1)} ms`);
  // Core, with no hidden input.
  const src = read('lib/ceremony/pictures.ts');
  assert.match(src, /^\/\/ @layer core/);
  assert.doesNotMatch(src, /Date\.now|Math\.random|^let |^var /m);
});

test('RC34: through the path and on the last view each moment that had a picture or a video stands as that picture at its place, drawn by the replay', () => {
  // Photos 119, 210 and 224 m along (the last two 14 m apart: one place at any zoom the telling uses), a video at 400 m.
  const { story, photo, kept, bounds } = photosAt([210, 224], 400);
  const whole = wholeOf(bounds);
  const p = planOf(story, { whole });
  const cards = cardsOf(p);
  // Each from when its card has reached its place, in the order they came, the first in the frame's overlays.
  for (let k = 0; k < cards.length; k++) {
    const f = frameAt(p, cards[k].t1 + 1);
    assert.deepEqual(picturesOf(f).map((x) => x.key), cards.slice(0, k + 1).map((c) => c.capture.id));
    assert.deepEqual((f.overlays as unknown as { kind: string }[]).slice(0, k + 1).map((o) => o.kind), Array(k + 1).fill('picture'), 'they come first: the lowest on the stage');
  }
  // (Read as the video's card lands: the camera is settled there at the walking zoom.)
  const walking = picturesOf(frameAt(p, cards[3].t1 + 1));
  assert.deepEqual(walking.map((x) => [x.shown, x.layered, x.video]), [[true, false, false], [false, false, false], [true, true, false], [true, false, true]], 'the later of two at one place shows, layered; a video is marked');
  // On the last view, the walk whole: still there, and nearer ones have closed up (119 and 224 m are 21 px apart).
  const last = frameAt(p, p.total - 1);
  const stood = picturesOf(last);
  assert.equal(stood.length, 4);
  const lastCam = fitCamera(PHONE, bounds, whole.close, 17)!;
  const px = (a: Faced, b: Faced) => { const A = project(PHONE, lastCam, [a.lon!, a.lat!]); const B = project(PHONE, lastCam, [b.lon!, b.lat!]); return Math.hypot(A[0] - B[0], A[1] - B[1]); };
  assert.equal(stood[0].shown, px(photo, kept[1]) >= PICTURE().apart, `the first is ${px(photo, kept[1]).toFixed(0)} px from the third`);
  assert.ok(stood[2].shown && stood[2].layered && stood[3].shown);
  // The map's own pins for those moments wait until the card: a frame asks only for the others'.
  const noteId = story.captures.find((c) => c.kind === 'text')!.id;
  const rest = segOf(p, 'rest');
  assert.deepEqual(frameAt(p, rest.t0 + 10).pins, [noteId], 'only the note\'s pin is on the map');
  assert.equal(frameAt(p, p.total).pins.length, story.captures.length, 'the card has them all');
  // With reduce motion the map is not moved, and the pictures stand on it where the first beat left it.
  const still = planOf(story, { whole, reduceMotion: true });
  const sf = frameAt(still, still.total - 1);
  assert.deepEqual(sf.camera, { center: null, zoom: null });
  const open = fitCamera(PHONE, bounds, whole.open, 17)!;
  const stillView = (sf as unknown as { still?: Cam }).still;
  assert.ok(stillView && stillView.zoom === open.zoom, 'the frame says where the still map stands');
  assert.equal(picturesOf(sf).length, 4);
});

test('RC34: a moment of several pieces stands as one picture with a layered edge, and every other map keeps its pins as they are', () => {
  let market!: Faced;
  const { story } = walkOf([], (fixes) => [(market = several(['photo', 'photo', 'voice'], fixes[50].t, at(350)))]);
  const p = planOf(story);
  const stood = picturesOf(frameAt(p, p.total - 1));
  assert.deepEqual(stood.map((x) => [x.key === market.id, x.layered]), [[false, false], [true, true]]);
  // The stage draws them: a Picture each, placed by the frame's camera with a style write, no map listener, no state.
  const view = read('components/ceremony/Pictures.tsx');
  assert.match(view, /useLiveStyle\(/);
  assert.match(view, /picturePose\(/);
  assert.doesNotMatch(view, /useState\(|map\.on\(|addEventListener\(/, 'a picture is placed by a listener or by state');
  assert.doesNotMatch(view, /from 'react-native'[^\n]*\bImage\b|useVideoPlayer/);
  // The map's pins are not changed (0154): neither map, nor the pin's view, knows the replay's pictures.
  for (const f of ['components/CapturePinView.tsx', 'components/map/WalkMap.web.tsx', 'components/map/WalkMap.native.tsx', 'lib/pins.ts']) assert.doesNotMatch(read(f), /ceremony\/pictures|PictureOverlay|picturePose/, `${f} knows the replay's pictures`);
});
