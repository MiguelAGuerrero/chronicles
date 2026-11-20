/// <reference types="node" />
// Replay ceremony, opening and closing (specs/replay-ceremony/spec.md, RC23-RC27; decision 0206), written before the
// code: what is not built yet is reached through casts and a guarded load (`walks.ts`), so the typecheck holds while
// each test fails for its own reason. What the screen shows of it (RC23-RC27) is the `replay` journey's too.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { rhythm } from '../../ceremony/rhythm';
import { distanceM } from '../../geo';
import * as tokens from '../../motionTokens';
import * as replay from '../../replay';
import type { LngLat } from '../../types';
import { walkStory, type WalkInput } from '../../ceremony/story';
import { at, boxOf, built, cam, cap, dayOf, endT, field, fitCamera, frameAt, input, line, MIN, mod, O, optsOf, overlaysOf, PHONE, planOf, project, segOf, segsOf, SMALL, SRC, token, walkOf, wholeOf, type Box, type Edges, type Screen } from './walks';

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
/** Where the corners of a box land on a screen under a camera: [left, top, right, bottom]. */
function boxOn(s: Screen, c: { center: LngLat; zoom: number }, b: Box): [number, number, number, number] {
  const nw = project(s, c, [b[0], b[3]]);
  const se = project(s, c, [b[2], b[1]]);
  return [nw[0], nw[1], se[0], se[1]];
}
const near = (a: number, b: number, by = 0.5) => Math.abs(a - b) <= by;
/** Two cameras show the same view: the same zoom, the one's centre at the middle of the other's screen. */
const sameCam = (a: { center: LngLat; zoom: number }, b: { center: LngLat; zoom: number }, s: Screen = PHONE) => {
  const p = project(s, a, b.center);
  return Math.abs(a.zoom - b.zoom) < 1e-6 && Math.hypot(p[0] - s.width / 2, p[1] - s.height / 2) < 0.01;
};

// ---------------------------------------------------------------- the one fit (RC23)

test('RC23: one fit frames the whole for the first beat, the close and the card, as a map fits bounds', () => {
  const b = boxOf([O, at(900, 300)], 60);
  for (const s of [PHONE, SMALL]) {
    for (const pad of [{ top: 48, right: 48, bottom: 48, left: 48 }, { top: 48, right: 32, bottom: 284, left: 32 }] as Edges[]) {
      const c = fitCamera(s, b, pad, 17)!;
      const [l, t, r, bt] = boxOn(s, c, b);
      // Inside the room the edges leave, touching it one way, its middle at the room's middle: MapLibre's own fit.
      assert.ok(l >= pad.left - 0.5 && r <= s.width - pad.right + 0.5 && t >= pad.top - 0.5 && bt <= s.height - pad.bottom + 0.5, `the box is at ${[l, t, r, bt].map(Math.round)}`);
      assert.ok(near(r - l, s.width - pad.left - pad.right) || near(bt - t, s.height - pad.top - pad.bottom), 'it fills the room one way');
      assert.ok(near((l + r) / 2, (pad.left + s.width - pad.right) / 2) && near((t + bt) / 2, (pad.top + s.height - pad.bottom) / 2), 'its middle is the room\'s');
    }
  }
  // A walk of a few metres is framed no closer than the map's own cap; no room at all is no view.
  assert.equal(fitCamera(PHONE, boxOf([O, at(8)]), { top: 48, right: 48, bottom: 48, left: 48 }, 17)!.zoom, 17);
  assert.equal(fitCamera(PHONE, b, { top: 500, right: 0, bottom: 500, left: 0 }, 17), null);
  // The screens say the room and work out no view: the ceremony fits it, with the room the map's own fits use.
  for (const f of ['app/replay/[id].tsx', 'app/day/[key].tsx']) {
    const src = read(f);
    assert.match(src, /whole/, `${f} says the whole and its room`);
    assert.match(src, /FIT_PADDING/, `${f} opens on the map's own room`);
    assert.doesNotMatch(src, /ceremony\/camera|fitCamera\(/, `${f} works out a view`);
  }
});

// ---------------------------------------------------------------- the opening (RC23)

test('RC23: a walk\'s path begins from the first beat\'s own view and dives to the walker\'s start in 2.2 s, no cut and no second overview', () => {
  assert.equal(token('dive'), 2200);
  const { story, bounds } = walkOf();
  const whole = wholeOf(bounds);
  const p = planOf(story, { whole });
  const intro = segOf(p, 'intro');
  assert.equal(intro.t1 - intro.t0, 2200, 'the opening is the dive');
  // Its first frame is the first beat's view, to the pixel: nothing cuts.
  const open = fitCamera(PHONE, bounds, whole.open, 17)!;
  assert.ok(sameCam(cam(frameAt(p, 0)), open), `the first frame is at ${JSON.stringify(cam(frameAt(p, 0)))}, the first beat at ${JSON.stringify(open)}`);
  // It only ever closes in, and the walker's start goes straight to where the camera keeps the walker.
  let zoom = open.zoom;
  let last = project(PHONE, cam(frameAt(p, 0)), O);
  const from = last;
  const focus: [number, number] = [PHONE.width / 2, PHONE.height * token('focusY')];
  for (let ms = 20; ms <= 2200; ms += 20) {
    const c = cam(frameAt(p, ms));
    assert.ok(c.zoom >= zoom - 1e-9, `the camera pulled back at ${ms} ms: a second overview`);
    zoom = c.zoom;
    const now = project(PHONE, c, O);
    assert.ok(Math.hypot(now[0] - last[0], now[1] - last[1]) < 12, `the start leapt ${Math.hypot(now[0] - last[0], now[1] - last[1]).toFixed(1)} px in one frame at ${ms} ms`);
    // On the straight way from where the whole showed it to the focus.
    const off = Math.abs((focus[0] - from[0]) * (from[1] - now[1]) - (from[0] - now[0]) * (focus[1] - from[1])) / (Math.hypot(focus[0] - from[0], focus[1] - from[1]) || 1);
    assert.ok(off < 1, `the start is ${off.toFixed(1)} px off its straight way at ${ms} ms`);
    last = now;
  }
  const end = cam(frameAt(p, 2200));
  assert.ok(near(end.zoom, token('baseZoom'), 1e-6) && Math.hypot(last[0] - focus[0], last[1] - focus[1]) < 1, `it ends on the walker at the walking zoom (${JSON.stringify(end)})`);
  // The walker stands at the start through it, and sets off only when it is over.
  assert.ok(distanceM(frameAt(p, 2190).walker!, O) < 1 && distanceM(frameAt(p, 2600).walker!, O) > 1);
  // The old opening is gone: no zoom-in from a second, nearer overview.
  assert.ok(!('introZoomOut' in tokens.REPLAY_RHYTHM) && !('intro' in tokens.REPLAY_RHYTHM), 'the old zoom-in is still a token');
});

test('RC23: the day\'s replay, which has no first beat, shows the whole day for 2 s and dives', () => {
  assert.equal(token('openHold'), 2000);
  const { story, bounds, morning } = dayOf();
  const whole = wholeOf(bounds, 200);
  const p = planOf(story, { whole, holdOpen: true });
  const intro = segOf(p, 'intro');
  assert.equal(intro.t1 - intro.t0, 2000 + 2200);
  const open = fitCamera(PHONE, bounds, whole.open, 17)!;
  for (const ms of [0, 700, 1999]) assert.ok(sameCam(cam(frameAt(p, ms)), open), `the whole day holds at ${ms} ms`);
  assert.ok(cam(frameAt(p, 2600)).zoom > open.zoom + 0.2, 'then it dives');
  const start: LngLat = [morning.lon!, morning.lat!];
  const landed = project(PHONE, cam(frameAt(p, 4200)), start);
  assert.ok(near(cam(frameAt(p, 4200)).zoom, token('baseZoom'), 1e-6) && Math.hypot(landed[0] - PHONE.width / 2, landed[1] - PHONE.height * token('focusY')) < 1, 'onto the day\'s first moment');
  // A walk's own telling holds nothing first: its first beat already showed the walk.
  const w = walkOf();
  assert.equal(segOf(planOf(w.story, { whole: wholeOf(w.bounds) }), 'intro').t1, 2200);
});

test('RC23: the first beat keeps no interval that renders the screen: the map lights the streets itself', () => {
  const walk = read('app/replay/[id].tsx');
  assert.doesNotMatch(walk, /setInterval\(/, 'the walk\'s replay still keeps an interval');
  assert.doesNotMatch(walk, /setNow\(|FRAME_MS/, 'it still keeps a clock of its own');
  assert.match(walk, /lightUp=/, 'it asks the map to light the streets');
  // How many streets are lit at a time is core: in the order walked, all of them by the end, none before the start.
  const lit = built<(n: number, elapsed: number, over: number) => number>(replay, 'litStreets');
  assert.deepEqual([lit(40, -5, 3200), lit(40, 0, 3200), lit(40, 1600, 3200), lit(40, 3200, 3200), lit(40, 9000, 3200), lit(0, 100, 3200), lit(7, 100, 0)], [0, 0, 20, 40, 40, 0, 7]);
  for (const f of ['components/map/WalkMap.web.tsx', 'components/map/WalkMap.native.tsx']) assert.match(read(f), /litStreets\(/, `${f} lights the streets`);
});

// ---------------------------------------------------------------- the close (RC24)

test('RC24: after the last moment the walker stands 1.6 s, the clock where it stopped', () => {
  assert.equal(token('rest'), 1600);
  const { story, bounds, note } = walkOf();
  // The walk was stopped a quarter of an hour after its last fix: the clock does not leap there.
  const late = { ...story, end: story.end + 15 * 60_000 };
  const p = planOf(late, { whole: wholeOf(bounds) });
  const rest = segOf(p, 'rest');
  assert.equal(rest.t1 - rest.t0, 1600);
  assert.equal(segsOf(p)[segsOf(p).indexOf(rest) + 1]?.k, 'close', 'the close follows');
  const before = frameAt(p, rest.t0 - 1);
  for (const ms of [rest.t0, rest.t0 + 800, rest.t1 - 1]) {
    const f = frameAt(p, ms);
    assert.ok(distanceM(f.walker!, [note.lon!, note.lat!]) < 1, 'the walker stands at the end');
    assert.deepEqual(f.camera, before.camera, 'and so does the camera');
    assert.ok(Math.abs(f.clock! - before.clock!) < 1000, `the clock leapt from ${before.clock} to ${f.clock}`);
    assert.equal(f.clock, frameAt(p, rest.t0).clock, 'and stands still');
    assert.equal(f.clockFade, 1);
  }
  // The clock never runs back through the telling's end (a rebuilt telling finds its place by it).
  let clock = 0;
  for (let ms = 0; ms < p.total; ms += 50) {
    const c = frameAt(p, ms).clock;
    assert.ok(c != null && c >= clock, `the clock ran back at ${ms} ms`);
    clock = c;
  }
});

test('RC24: the camera then pulls back in 3 s to the view the card uses and holds it 2 s, so the card arrives on a map that does not move', () => {
  assert.deepEqual([token('close'), token('closeHold')], [3000, 2000]);
  for (const s of [PHONE, SMALL]) {
    const { story, bounds } = walkOf();
    const whole = wholeOf(bounds, s === PHONE ? 300 : 240);
    const p = planOf(story, { whole, screen: s });
    const close = segOf(p, 'close');
    assert.equal(close.t1 - close.t0, 5000);
    assert.equal(close.t1, p.total, 'the telling ends on the held view');
    const card = fitCamera(s, bounds, whole.close, 17)!;
    // From the walking zoom, out only, to the card's own view by 3 s.
    let zoom = cam(frameAt(p, close.t0)).zoom;
    assert.ok(near(zoom, token('baseZoom'), 1e-6));
    for (let ms = close.t0 + 20; ms <= close.t0 + 3000; ms += 20) {
      const z = cam(frameAt(p, ms)).zoom;
      assert.ok(z <= zoom + 1e-9, `the camera closed in at ${ms - close.t0} ms of the pull-back`);
      zoom = z;
    }
    // Held to the telling's last frame: the view the card's own fit asks for, so that fit moves nothing.
    for (const ms of [close.t0 + 3000, close.t0 + 4000, p.total - 1]) assert.ok(sameCam(cam(frameAt(p, ms)), card, s), `at ${ms - close.t0} ms the camera is ${JSON.stringify(cam(frameAt(p, ms)))}, the card's view ${JSON.stringify(card)}`);
    // The whole walk is in that view, above the card's sheet.
    const [l, t, r, b] = boxOn(s, card, bounds);
    assert.ok(l >= 0 && r <= s.width && t >= 0 && b <= s.height - whole.close.bottom + 0.5, `the walk is at ${[l, t, r, b].map(Math.round)} on a ${s.width} by ${s.height} screen`);
  }
  // The telling says the same through its one way in (0086): a screen passes the whole and its room, nothing else.
  const { story, bounds } = walkOf();
  const whole = wholeOf(bounds);
  const shown = rhythm.show(story, optsOf({ whole }));
  assert.ok(sameCam(cam(shown.frame(shown.total - 1)), fitCamera(PHONE, bounds, whole.close, 17)!));
});

test('RC24: with reduce motion the close lasts as long and the map is not moved', () => {
  const { story, bounds } = walkOf();
  const whole = wholeOf(bounds);
  const moving = planOf(story, { whole });
  const still = planOf(story, { whole, reduceMotion: true });
  assert.equal(still.total, moving.total);
  assert.equal(segOf(still, 'close').t0, segOf(moving, 'close').t0);
  for (const ms of [0, 1000, segOf(still, 'close').t0 + 1500, still.total - 1]) assert.deepEqual(frameAt(still, ms).camera, { center: null, zoom: null });
  // And with no whole to frame (a day of moments with no place), the timing is the same and the camera stays down.
  const bare = planOf(story);
  assert.equal(bare.total, moving.total, 'the timing never depends on the frame of the whole');
  assert.ok(near(cam(frameAt(bare, bare.total - 1)).zoom, token('baseZoom'), 1e-6));
});

// ---------------------------------------------------------------- what the last view says (RC25, RC26)

test('RC25: on a walk\'s last view each place passed without stopping is named beside it at full strength; more than two as the card\'s one line', () => {
  // Two places with room beside them: far apart, a few metres off the way, no picture standing near. (Where the
  // names have no such room they are said as one line: `replay-ceremony ui 14`, ui.test.ts.)
  const fixes = line(O, at(600), 9 * 60 * MIN);
  const two = { places: [{ name: 'Hessian Memorial', generic: false, at: at(150, 6), t: fixes[21].t }, { name: 'Sun Inn', generic: false, at: at(450, -6), t: fixes[64].t }] };
  const story = walkStory(input(fixes, [cap('text', endT(fixes), at(600), 'Here.')], { passed: two.places as WalkInput['passed'] }));
  const p = planOf(story, { whole: wholeOf(boxOf([O, at(600)], 60)), namePassed: true });
  const close = segOf(p, 'close');
  // Not before the walk is whole again; then each by the words it was passed with, where it stands.
  assert.deepEqual(overlaysOf(frameAt(p, close.t0 + 1000), 'passed'), []);
  const named = overlaysOf(frameAt(p, p.total - 1), 'passed');
  assert.deepEqual(named.map((o) => o.text), ['Passed Hessian Memorial without stopping', 'Passed Sun Inn without stopping']);
  assert.deepEqual(named.map((o) => o.at), two.places.map((x) => x.at));
  assert.ok(named.every((o) => o.opacity === 1), 'at full strength');
  const coming = overlaysOf(frameAt(p, close.t0 + token('closeSay') + token('closeSayIn') / 2), 'passed');
  assert.ok(coming.length === 2 && coming.every((o) => (o.opacity as number) > 0.2 && (o.opacity as number) < 0.8), 'they come as the view settles');
  // More than two: the card's one line (RP19), said once, beside no one place.
  const many = walkOf(['Hessian Memorial', 'Moravian Book Shop', 'Sun Inn', 'Kemerer Museum']);
  const last = planOf(many.story, { whole: wholeOf(many.bounds), namePassed: true });
  assert.deepEqual(overlaysOf(frameAt(last, last.total - 1), 'passed').map((o) => [o.text, o.at]), [['Passed a few places without stopping', null]]);
  // Body ink at full strength, no larger than body text: read from the view that draws them.
  const view = read('components/ceremony/Whispers.tsx');
  const style = /passed: \{([^}]*)\}/.exec(view)?.[1] ?? '';
  assert.match(style, /color: theme\.ink/, `the names are drawn as ${style}`);
  assert.ok(Number(/fontSize: (\d+)/.exec(style)?.[1]) <= 16, 'no larger than body text');
  assert.doesNotMatch(style, /theme\.(muted|accent)|opacity/);
});

test('RC25: the day\'s last view names none, as the day\'s card carries none', () => {
  const d = dayOf(['Hessian Memorial', 'Sun Inn']);
  const p = planOf(d.story, { whole: wholeOf(d.bounds, 200), holdOpen: true });
  segOf(p, 'close');
  assert.deepEqual(overlaysOf(frameAt(p, p.total - 1), 'passed'), []);
  // The screens say which: the walk's replay names them, the day's does not.
  assert.match(read('app/replay/[id].tsx'), /namePassed: true/);
  assert.doesNotMatch(read('app/day/[key].tsx'), /namePassed/);
  assert.match(read('app/day/[key].tsx'), /holdOpen: true/);
});

test('RC26: the last view shows the date, and nothing on it is a figure larger than body text or in the accent', () => {
  const { story, bounds } = walkOf();
  const p = planOf(story, { whole: wholeOf(bounds) });
  const close = segOf(p, 'close');
  // No date while the walk is told; on the last view, the day it was walked, in full.
  assert.equal(field<number | null>(frameAt(p, close.t0 - 10), 'date'), null);
  const end = frameAt(p, p.total - 1);
  assert.equal(field<number | null>(end, 'date'), story.start);
  assert.equal(field<number>(end, 'dateOpacity'), 1);
  // The clock's figures, the one thing on the stage larger than body text, are gone before the view settles.
  assert.equal(frameAt(p, close.t0 + token('closeClock')).clockFade, 0);
  assert.equal(end.clockFade, 0);
  assert.ok(end.clock != null, 'the clock keeps its time under the fade (a rebuilt telling finds its place by it)');
  // The day's too.
  const d = dayOf();
  const dp = planOf(d.story, { whole: wholeOf(d.bounds, 200), holdOpen: true });
  assert.equal(field<number | null>(frameAt(dp, dp.total - 1), 'date'), d.story.start);
  // The stage draws the date in body ink no larger than body text, and takes the clock down when it has faded out.
  const stage = read('components/ceremony/Stage.tsx');
  const style = /date: \{([^}]*)\}/.exec(stage)?.[1] ?? '';
  assert.match(style, /color: theme\.ink/, `the date is drawn as ${style}`);
  assert.ok(Number(/fontSize: (\d+)/.exec(style)?.[1]) <= 16);
  assert.match(stage, /clockFade \?\? 1\) > 0/, 'a clock faded out is not drawn');
  for (const f of readdirSync(join(SRC, 'components/ceremony'))) assert.doesNotMatch(read(`components/ceremony/${f}`), /theme\.accent/, `${f} lights something in the accent`);
  // The date stands where the clock stood, in the top row, always one line; and the whole is framed under that row by
  // a standing picture's height, on the last view and so on the card: no control and no date sits on the walk.
  const layout = mod('components/ceremony/layout.ts');
  const dateOf = built<(t: number, room?: number) => string>(layout, 'dateOf');
  const day = new Date(2026, 8, 30, 12).getTime();
  assert.ok(dateOf(day).length > dateOf(day, 200).length && dateOf(day, 200).length > dateOf(day, 140).length, `${dateOf(day)} | ${dateOf(day, 200)} | ${dateOf(day, 140)}`);
  assert.match(stage, /numberOfLines=\{1\}[^>]*>\{dateOf\(day, room\)\}/);
  const top = built<number>(layout, 'WHOLE_TOP');
  assert.ok(built<number>(layout, 'DATE_TOP') === 12 && top >= 12 + 48 + 8 + 48, `the whole starts ${top} px down`);
  for (const f of ['app/replay/[id].tsx', 'app/day/[key].tsx']) assert.match(read(f), /top: insetTop \+ WHOLE_TOP/, `${f} frames the whole under the date`);
});

// ---------------------------------------------------------------- Skip (RC27)

test('RC27: Skip goes to the card at once, never through the close', () => {
  const walk = read('app/replay/[id].tsx');
  assert.match(walk, /testID="skip"[^>]*onPress=\{\(\) => go\('card'\)\}/, 'the walk\'s Skip goes straight to the card');
  const day = read('app/day/[key].tsx');
  const skip = day.slice(day.indexOf('testID="day-skip"'), day.indexOf('testID="day-skip"') + 260);
  assert.match(skip, /toCard\(\)/, 'the day\'s Skip goes straight to its card');
  // The close is the telling's own last part: a screen that leaves the path leaves it too, and the card's map is
  // fitted by the room the close was told (so a skipped replay's card looks as a watched one's).
  const { story, bounds } = walkOf();
  const p = planOf(story, { whole: wholeOf(bounds) });
  assert.equal(frameAt(p, p.total).done, true);
  assert.equal(segsOf(p).at(-1)?.k, 'close');
  for (const src of [walk, day]) assert.match(src, /close: sheetPad/, 'the card\'s fit and the close share one room');
});
