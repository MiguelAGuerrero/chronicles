/// <reference types="node" />
// Replay ceremony, the UI review's findings (specs/replay-ceremony/spec.md, "The UI review and the cold find", U1 and
// U3-U6) and three things the owner's looks left, accepted on Nov 19 ("Proceed with your work"). Each is a regression
// test named `replay-ceremony ui N`, written before its fix: what is not built yet is reached through casts and a
// guarded load (`walks.ts`), so each fails for its own reason. What the screen shows of them is the `replay` and
// `stacks` journeys' too.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as mapTypes from '../../../components/map/types';
import * as compass from '../../compass';
import * as quiet from '../../quietLines';
import type { Faced } from '../../moment';
import type { WalkInput } from '../../ceremony/story';
import { walkStory } from '../../ceremony/story';
import type { Frame } from '../../ceremony/types';
import type { LngLat, TracePoint } from '../../types';
import { at, built, cap, dayOf, endT, field, fitCamera, frameAt, input, line, MIN, mod, O, overlaysOf, PHONE, planOf, project, screenOf, SMALL, SRC, token, walkOf, wholeOf, type Cam, type Screen } from './walks';

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const roomMod = mod('lib/ceremony/room.ts');
const gridMod = mod('lib/ceremony/grid.ts');
const liveMod = mod('lib/ceremony/live.ts');
const stackMod = mod('lib/ceremony/stack.ts');
const layoutMod = mod('components/ceremony/layout.ts');
type Pose = { left?: number; top?: number; opacity?: number };
type Ctx = Screen & { live: null; held: boolean; paused: boolean; reduceMotion: boolean; open(): void; wait(): void };
const ctxOf = (s: Screen): Ctx => ({ ...s, live: null, held: false, paused: false, reduceMotion: false, open() {}, wait() {} });
const STACK = () => built<{ w: number; h: number; pitch: number; right: number; top: number; gap: number; hit?: number }>(roomMod, 'STACK');
const PICTURE = () => built<{ size: number; lift: number; apart: number; hit?: number }>(roomMod, 'PICTURE');
type Card = { capture: Faced; t0: number; t1: number };
const cardsOf = (p: ReturnType<typeof planOf>) => p.cards as unknown as Card[];
/** The contrast of two colours (WCAG 2.2), from their hex. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------- ui 1 (U1): a standing picture opens its moment

test('replay-ceremony ui 1: a picture standing on the map opens its moment, a 44 pt control; one under a later picture or under a card takes no tap', { todo: 'test first' }, () => {
  const P = PICTURE();
  assert.ok((P.hit ?? 0) >= 44, `its hit area is ${P.hit} px around the ${P.size} px tile`);
  const view = read('components/ceremony/Pictures.tsx');
  assert.equal([...view.matchAll(/<Pressable\b/g)].length, 1, 'one control a picture');
  assert.match(view, /accessibilityRole="button"/);
  const name = /accessibilityLabel="([^"]*)"/.exec(view)?.[1] ?? '';
  assert.equal(name, 'Open this moment');
  assert.doesNotMatch(name, /\d/, 'its name counts nothing');
  assert.match(view, /ctx\.open\(\[o\.capture\]\)/, 'it opens that moment, through the stage\'s own way into the viewer (the replay holds meanwhile, RR13)');
  assert.match(view, /PICTURE\.hit/, 'its hit area is the room\'s number');
  // Still placed every frame with no render, and no listener on the map: whether it takes a tap is one flag.
  assert.match(view, /useLiveStyle\(ctx\.live/);
  assert.match(view, /useLive\(ctx\.live/);
  assert.doesNotMatch(view, /\buseState\b|\buseEffect\b|addEventListener|\.on\(/, 'a picture keeps state or listens to the map');
  // Which pictures take a tap: one that shows, where the camera puts it, with no card over it.
  const taps = built<(f: Frame, p: unknown, c: Ctx) => boolean>(layoutMod, 'pictureTaps');
  const { story } = walkOf();
  const p = planOf(story);
  const card = cardsOf(p)[0];
  const f = frameAt(p, card.t1 + 600);
  const picture = overlaysOf(f, 'picture')[0];
  assert.ok(picture && picture.shown === true, 'the photo stands as its picture once its card has gone');
  const ctx = ctxOf(PHONE);
  assert.equal(taps(f, picture, ctx), true, 'a picture that shows takes a tap');
  assert.equal(taps(f, { ...picture, shown: false }, ctx), false, 'one under a later picture takes none: the one showing does');
  assert.equal(taps({ ...f, camera: { center: null, zoom: null }, still: null }, picture, ctx), false, 'nor one that nothing places');
  // A card at rest over it: the tap is the card's (it holds the replay), never a picture's nobody can see.
  const over = { kind: 'card', key: 'k', capture: picture.capture, from: null, grow: 1, tuck: 0, playing: false, progress: 0, fade: false };
  const under = { ...f, camera: { center: picture.at as LngLat, zoom: 15 }, overlays: [picture, over] } as unknown as Frame;
  assert.equal(taps(under, picture, ctx), false, 'a picture under a card takes no tap');
  assert.equal(taps({ ...under, overlays: [picture] } as unknown as Frame, picture, ctx), true, 'and takes it again once the card has gone');
});

// ---------------------------------------------------------------- ui 2 (U3): the stack, Next and Android

test('replay-ceremony ui 2: the stack starts 12 px under Next\'s foot, and its hit width is 48 on Android with the drawing unchanged', { todo: 'test first' }, () => {
  const S = STACK();
  // Skip, 12 in and 48 tall; Next under it, 8 apart and 48 tall; then 12 to spare.
  assert.equal(S.top, 12 + 48 + 8 + 48 + 12, `the stack's top bound is ${S.top - (12 + 48 + 8 + 48)} px under Next`);
  const stackBound = built<(s: Screen) => number>(stackMod, 'stackBound');
  for (const s of [PHONE, SMALL, screenOf(390, 844, 47)]) {
    const n = stackBound(s);
    const top = s.height - s.insets.bottom - 44 - S.h - (n - 1) * S.pitch;
    assert.ok(top - (s.insets.top + 12 + 48 + 8 + 48) >= 12, `${s.width}x${s.height}: the highest entry stands ${top - (s.insets.top + 116)} px under Next`);
  }
  // The drawing is 44 wide as it was; Android's 48 dp comes from a slop either side, and no other platform gets one.
  assert.equal(S.w, 44);
  const slop = built<(os: string) => { left: number; right: number } | undefined>(roomMod, 'stackSlop');
  const android = slop('android');
  assert.ok(android && S.w + android.left + android.right >= 48, `on Android it is hit ${android ? S.w + android.left + android.right : S.w} px wide`);
  assert.equal(slop('ios'), undefined);
  assert.equal(slop('web'), undefined);
  const view = read('components/ceremony/Stack.tsx');
  assert.match(view, /hitSlop=\{stackSlop\(Platform\.OS\)\}/);
  assert.match(view, /stack: \{ position: 'absolute', width: STACK\.w \}/, 'the stack is drawn as wide as it was');
});

// ---------------------------------------------------------------- ui 3 (U4): words end short of the stack

test('replay-ceremony ui 3: a whisper and the last view\'s passed-place name end short of the stack\'s column while the stack is up, at 320 px too', { todo: 'test first' }, () => {
  const S = STACK();
  const stackEdge = built<(s: Screen) => number>(roomMod, 'stackEdge');
  const stackUp = built<(f: Frame | null) => boolean>(liveMod, 'stackUp');
  const passedPose = built<(o: unknown, c: Ctx, camera: Cam, above: boolean, index: number, stack: boolean) => Pose>(layoutMod, 'passedPose');
  const passedWidth = built<(c: Screen, stack: boolean) => number>(layoutMod, 'passedWidth');
  const whisperPose = built<(o: unknown, c: Ctx, camera: Cam, stack: boolean) => Pose>(layoutMod, 'whisperPose');
  const WHISPER = built<{ width: number }>(layoutMod, 'WHISPER');
  for (const s of [SMALL, PHONE]) {
    assert.equal(stackEdge(s), s.width - s.insets.right - S.right - S.w - S.gap, 'the column begins a gap short of the stack');
    assert.ok(passedWidth(s, true) <= stackEdge(s) - 8, `${s.width} px: a name's room is ${passedWidth(s, true)} px wide beside the stack`);
    assert.ok(passedWidth(s, false) >= passedWidth(s, true), 'and no narrower with no stack up');
  }
  // A small phone, nineteen photos and a place passed: on the last view the stack is at its bound.
  const w = walkOf(['Old Mill'], (fixes: TracePoint[]) => Array.from({ length: 19 }, (_, i) => cap('photo', fixes[20 + i * 3].t, at(140 + i * 21))));
  const whole = wholeOf(w.bounds);
  const p = planOf(w.story, { screen: SMALL, whole, namePassed: true });
  const last = frameAt(p, p.total - 1);
  const stack = overlaysOf(last, 'stack')[0] as unknown as { entries: unknown[] };
  assert.equal(stack.entries.length, built<(s: Screen) => number>(stackMod, 'stackBound')(SMALL), 'the stack is at its bound');
  assert.equal(stackUp(last), true);
  assert.equal(stackUp(frameAt(p, 100)), false, 'no stack before the first card lands');
  const ctx = ctxOf(SMALL);
  const edge = stackEdge(SMALL);
  const view = fitCamera(SMALL, whole.bounds, whole.close, whole.maxZoom)!;
  const named = overlaysOf(last, 'passed');
  assert.equal(named.length, 1);
  // Wherever its place is on the walk, over it or under it, the name's room ends short of the column; with no stack it may not.
  let reached = 0;
  for (let m = 0; m <= 600; m += 50) {
    for (const above of [false, true]) {
      const o = { ...named[0], at: at(m, 40) };
      const pose = passedPose(o, ctx, view, above, 0, true);
      assert.ok(pose.left! >= 8 && pose.left! + passedWidth(SMALL, true) <= edge, `a place ${m} m along: its name runs ${Math.round(pose.left!)} to ${Math.round(pose.left! + passedWidth(SMALL, true))}, the stack's column begins at ${edge}`);
      if (passedPose(o, ctx, view, above, 0, false).left! + passedWidth(SMALL, false) > edge) reached++;
    }
  }
  assert.ok(reached > 0, 'with no stack up a name still has the whole width');
  // The one line for more than two, beside no place: in the middle of what the stack leaves.
  const lone = passedPose({ ...named[0], at: null }, ctx, view, false, 0, true);
  assert.ok(lone.left! >= 8 && lone.left! + passedWidth(SMALL, true) <= edge);
  // A whisper, as the camera walks at its zoom: its box ends short of the column too.
  const walking: Cam = { center: at(300), zoom: 15 };
  for (let m = 100; m <= 500; m += 25) {
    for (const above of [false, true]) {
      const o = { kind: 'whisper', key: 'w', text: 'Passed Old Mill without stopping', at: at(m, 20), opacity: 1, above };
      const pose = whisperPose(o, ctx, walking, true);
      assert.ok(pose.left! >= 8 && pose.left! + WHISPER.width <= edge, `a whisper ${m} m along runs ${Math.round(pose.left!)} to ${Math.round(pose.left! + WHISPER.width)}, the column begins at ${edge}`);
    }
  }
  // The views read whether the stack is up from the frame, as one flag.
  assert.match(read('components/ceremony/Whispers.tsx'), /stackUp\(f\)/);
});

// ---------------------------------------------------------------- ui 4 (U5): a grid's last row, and its word

test('replay-ceremony ui 4: a grid\'s last row fills, its pieces spanning the row, and the card\'s strip names a grid in the plural', { todo: 'test first' }, () => {
  const rowShare = built<(n: number, index: number) => number>(gridMod, 'rowShare');
  const shares = (n: number) => Array.from({ length: n }, (_, i) => rowShare(n, i));
  assert.deepEqual(shares(1), [1]);
  assert.deepEqual(shares(2), [2, 2]);
  assert.deepEqual(shares(3), [2, 2, 1], 'a grid of three: the third spans the row, no empty cell');
  assert.deepEqual(shares(4), [2, 2, 2, 2]);
  assert.deepEqual(shares(5), [3, 3, 3, 2, 2]);
  assert.deepEqual(shares(6), [3, 3, 3, 3, 3, 3]);
  assert.deepEqual(shares(7), [3, 3, 3, 3, 3, 3, 1]);
  assert.deepEqual(shares(8).slice(6), [2, 2]);
  assert.deepEqual(shares(9).slice(6), [3, 3, 3]);
  // Past nine it scrolls, three across: its own last row fills the same way.
  assert.deepEqual(shares(14).slice(9), [3, 3, 3, 2, 2]);
  assert.deepEqual(shares(10).slice(9), [1]);
  // Every row is as wide as the grid: the widths of a row's cells and the gaps between them add up to it.
  for (let n = 1; n <= 14; n++) {
    const width = 257;
    let row = 0;
    for (let i = 0; i < n; ) {
      const k = rowShare(n, i);
      row = k * ((width - 4 * (k - 1)) / k) + 4 * (k - 1);
      assert.ok(Math.abs(row - width) < 1e-9, `${n} pieces: the row from piece ${i + 1} is ${row} px of ${width}`);
      i += k;
    }
  }
  assert.match(read('components/ceremony/Grid.tsx'), /rowShare\(pieces\.length, i\)/, 'the grid draws each cell as wide as its row gives it');
  // The strip under a grid says what it holds in the plural: a word, never a count.
  const gridLabel = built<(pieces: number) => string>(quiet, 'gridLabel');
  assert.equal(gridLabel(3), 'Photos');
  assert.equal(gridLabel(2), 'Photos');
  assert.equal(gridLabel(1), 'Photo', 'a grid of one (a moment with videos and one photo) is a photo');
  for (let n = 1; n <= 12; n++) assert.doesNotMatch(gridLabel(n), /\d/);
  assert.match(read('components/ceremony/Cards.tsx'), /gridLabel\(/);
});

// ---------------------------------------------------------------- ui 5 (U6): a whisper's ground and side

test('replay-ceremony ui 5: a whisper stands on a solid ground, lighter than the last view\'s name, over or under its place and clear of the walker', { todo: 'test first' }, () => {
  const view = read('components/ceremony/Whispers.tsx');
  const style = (name: string) => new RegExp(`\\b${name}: \\{([^}]*)\\}`).exec(view.slice(view.indexOf('StyleSheet.create')))?.[1] ?? '';
  const whisper = style('whisper');
  const passed = style('passed');
  assert.match(whisper, /backgroundColor: theme\.glass/, 'the ground the last view\'s name has (V4, X1)');
  assert.match(passed, /backgroundColor: theme\.glass/);
  assert.doesNotMatch(view, /textShadow/, 'a halo is no ground');
  const weight = (s: string) => Number(/fontWeight: '(\d+)'/.exec(s)?.[1] ?? NaN);
  assert.ok(weight(whisper) < weight(passed), `a whisper is lighter (${weight(whisper)}) than the name on the last view (${weight(passed)})`);
  // Which side it stands on is the telling's to say, once: over a place north of the walker as it is passed, under one south.
  const fixes = line(O, at(600), 9 * 60 * MIN);
  const places = [{ name: 'North Gate', generic: false, at: at(200, 40), t: fixes[30].t }, { name: 'South Gate', generic: false, at: at(400, -40), t: fixes[58].t }];
  const story = walkStory(input(fixes, [cap('text', endT(fixes), at(600), 'Here.')], { passed: places as WalkInput['passed'] }));
  const p = planOf(story);
  const seen = new Map<string, { above: boolean; f: Frame }>();
  for (let ms = 0; ms < p.total; ms += 40) {
    const f = frameAt(p, ms);
    for (const o of overlaysOf(f, 'whisper')) {
      assert.equal(typeof o.above, 'boolean', 'a whisper says which side of its place it stands on');
      const was = seen.get(o.text as string);
      if (was) assert.equal(o.above, was.above, 'and keeps to it while it is up');
      else seen.set(o.text as string, { above: o.above as boolean, f });
    }
  }
  assert.equal(seen.get('Passed North Gate without stopping')?.above, true);
  assert.equal(seen.get('Passed South Gate without stopping')?.above, false);
  // Where it stands: centred on its place, its box wholly over it or wholly under it, a gap clear of the place, so
  // it lies on neither the walker's dot nor the line, which pass on the other side.
  const WHISPER = built<{ width: number; height: number; gap: number }>(layoutMod, 'WHISPER');
  const whisperPose = built<(o: unknown, c: Ctx, camera: Cam, stack: boolean) => Pose>(layoutMod, 'whisperPose');
  assert.ok(WHISPER.gap >= 12, `it keeps ${WHISPER.gap} px from its place`);
  const ctx = ctxOf(PHONE);
  for (const [text, { above, f }] of seen) {
    const o = overlaysOf(f, 'whisper').find((x) => x.text === text)!;
    const cam = f.camera as Cam;
    const place = project(PHONE, cam, o.at as LngLat);
    const walker = project(PHONE, cam, f.walker!);
    const pose = whisperPose(o, ctx, cam, false);
    const box = { left: pose.left!, top: pose.top!, right: pose.left! + WHISPER.width, bottom: pose.top! + WHISPER.height };
    assert.ok(Math.abs((box.left + box.right) / 2 - place[0]) < 1 || box.left === 8 || box.right === PHONE.width - 8, `${text}: centred on its place`);
    if (above) assert.ok(box.bottom <= place[1] - WHISPER.gap + 0.001 && walker[1] > box.bottom, `${text}: over its place, the walker under it`);
    else assert.ok(box.top >= place[1] + WHISPER.gap - 0.001 && walker[1] < box.top, `${text}: under its place, the walker over it`);
  }
  // With nothing to place it by (reduce motion: the map is not the camera's), under the clock, as before.
  const none = whisperPose({ kind: 'whisper', key: 'w', text: 't', at: at(100), opacity: 0.6, above: true }, ctx, { center: null, zoom: null }, false);
  assert.deepEqual(none, { left: (PHONE.width - WHISPER.width) / 2, top: 100, opacity: 0.6 });
});

// ---------------------------------------------------------------- ui 6: a hop's dots over a walked street

test('replay-ceremony ui 6: while a replay is told a hop\'s dots stand on a white edge, each dot in its own disc, so they read on the land and on a lit street; other maps\' gap links are as they were', { todo: 'test first' }, () => {
  const T = mapTypes as unknown as Record<string, unknown>;
  const edge = built<{ color: string; width: number; dash: number[]; opacity: number }>(T, 'HOP_EDGE');
  const dash = mapTypes.GAP_LINK_DASH;
  const DOT = 3;
  assert.ok(edge.width > DOT + 2, `the edge is ${edge.width} px under a ${DOT} px dot`);
  // One disc a dot: the same period along the line, so the edge is a ring round each dot, never a second row of marks.
  assert.ok(Math.abs(edge.width * (edge.dash[0] + edge.dash[1]) - DOT * (dash[0] + dash[1])) < 1e-9, 'the edge keeps the dots\' own spacing');
  assert.ok(edge.width < DOT * (dash[0] + dash[1]), 'and its discs do not run together into a line');
  // It reads where the dots did not: on a lit walked street; and the dot reads on it.
  assert.ok(contrast(edge.color, mapTypes.COLORS.walked) >= 3, `the edge on a lit street: ${contrast(edge.color, mapTypes.COLORS.walked).toFixed(2)}:1`);
  assert.ok(contrast(mapTypes.FOG_BOLD, edge.color) >= 3, `a dot on its edge: ${contrast(mapTypes.FOG_BOLD, edge.color).toFixed(2)}:1`);
  assert.ok(contrast(mapTypes.FOG_BOLD, mapTypes.COLORS.walked) < 3, 'which a bare dot on a lit street does not');
  // Only while a replay is told: every other map's gap links have no edge at all.
  const hopEdgeOpacity = built<(told: boolean) => number>(T, 'hopEdgeOpacity');
  assert.equal(hopEdgeOpacity(false), 0);
  assert.equal(hopEdgeOpacity(true), edge.opacity);
  assert.ok(edge.opacity > 0.5);
  // Both maps draw it under the dots, from the dots' own source; the stage holds no colour of its own for it.
  const web = read('components/map/WalkMap.web.tsx');
  assert.match(web, /id: 'gap-links-edge', type: 'line', source: 'gap-links'[^\n]*\n[^\n]*\n?\s*map\.addLayer\(\{ id: 'gap-links',/, 'the edge is added just before the dots');
  assert.match(web, /setPaintProperty\('gap-links-edge', 'line-opacity', hopEdgeOpacity\(replayOn\)\)/);
  const native = read('components/map/WalkMap.native.tsx');
  assert.match(native, /<Layer id="gap-links-edge"[\s\S]{0,400}<Layer id="gap-links"/);
  assert.doesNotMatch(web.slice(web.indexOf("id: 'gap-links-edge'"), web.indexOf("id: 'gap-links',")), /#[0-9a-fA-F]{3,8}/, 'the edge\'s colour is the map\'s token');
});

// ---------------------------------------------------------------- ui 7: the opening does not cut

test('replay-ceremony ui 7: through the dive the first beat\'s faint trace fades out and the walker fades in; with reduce motion each is a step', { todo: 'test first' }, () => {
  const { story, bounds } = walkOf();
  const whole = wholeOf(bounds);
  const dive = token('dive');
  const out = token('diveTraceOut');
  const markIn = token('diveMarkIn');
  assert.ok(out > 0 && out <= dive && token('diveMark') + markIn <= dive, 'both fades are over when the dive is');
  const p = planOf(story, { whole });
  const first = frameAt(p, 0);
  assert.equal(field<number>(first, 'wholeTrace'), 1, 'the path\'s first frame shows the whole trace as the first beat left it: no cut');
  assert.equal(field<number>(first, 'walkerFade'), 0);
  let trace = 1;
  let mark = 0;
  for (let ms = 0; ms <= dive + 400; ms += 10) {
    const f = frameAt(p, ms);
    const t = field<number>(f, 'wholeTrace');
    const m = field<number>(f, 'walkerFade');
    assert.ok(t <= trace + 1e-9 && trace - t <= 10 / out + 1e-9, `the trace fades, never steps (${trace} to ${t} at ${ms} ms)`);
    assert.ok(m >= mark - 1e-9 && m - mark <= 10 / markIn + 1e-9, `the walker fades in, never steps (${mark} to ${m} at ${ms} ms)`);
    // The dot is on the map from the moment any of it shows.
    assert.equal(f.walker != null, m > 0 || ms >= token('diveMark'), `the walker at ${ms} ms (fade ${m})`);
    trace = t;
    mark = m;
  }
  assert.equal(field<number>(frameAt(p, out), 'wholeTrace'), 0, 'the faint trace is gone before the dive is over');
  assert.equal(field<number>(frameAt(p, token('diveMark')), 'walkerFade'), 0);
  assert.equal(field<number>(frameAt(p, dive), 'walkerFade'), 1, 'the walker is whole as the dive ends');
  for (let ms = dive; ms < p.total; ms += 250) {
    const f = frameAt(p, ms);
    assert.deepEqual([field<number>(f, 'wholeTrace'), field<number>(f, 'walkerFade')], [0, 1], `past the dive, at ${ms} ms`);
  }
  // Reduce motion: each is there or not, as elsewhere (RR18).
  const still = planOf(story, { whole, reduceMotion: true });
  const steps = new Set<number>();
  for (let ms = 0; ms <= dive + 200; ms += 10) {
    const f = frameAt(still, ms);
    steps.add(field<number>(f, 'wholeTrace'));
    steps.add(field<number>(f, 'walkerFade'));
  }
  assert.deepEqual([...steps].sort(), [0, 1], 'with reduce motion nothing fades');
  // A day's telling has no beat before it and left no faint trace to fade: its walker fades in as the dive ends.
  const day = dayOf();
  const d = planOf(day.story, { whole: wholeOf(day.bounds), holdOpen: true });
  const hold = token('openHold');
  for (let ms = 0; ms < hold + dive; ms += 100) assert.equal(field<number>(frameAt(d, ms), 'wholeTrace'), 0, `a day's opening at ${ms} ms`);
  assert.equal(field<number>(frameAt(d, hold + token('diveMark')), 'walkerFade'), 0);
  assert.ok(Math.abs(field<number>(frameAt(d, hold + token('diveMark') + markIn / 2), 'walkerFade') - 0.5) < 0.02);
  // The frame hands both to the map, which writes them with no render; the screen keeps giving the map the trace it
  // showed in the first beat, so there is something to fade.
  assert.match(read('components/ceremony/useCeremonyLoop.ts'), /wholeTrace: f\.wholeTrace, walkerFade: f\.walkerFade/);
  const web = read('components/map/WalkMap.web.tsx');
  assert.match(web, /f\.wholeTrace/);
  assert.match(web, /f\.walkerFade/);
  assert.match(read('components/map/WalkMap.native.tsx'), /walkerFade/);
  const screen = read('app/replay/[id].tsx');
  assert.doesNotMatch(screen, /trace=\{telling \|\|/, 'the walk\'s replay takes the trace off the map as the path begins');
});

// ---------------------------------------------------------------- ui 8: north-up from the first beat

test('replay-ceremony ui 8: the first beat\'s fit turns a map turned by hand north-up, so the path never snaps it', { todo: 'test first' }, () => {
  const fitBearing = built<(o: { north: boolean; northEasing: boolean; bearing: number }) => number>(compass, 'fitBearing');
  // A fit keeps the bearing the map has (CP1), unless it is asked north-up, or the compass is easing it there.
  assert.equal(fitBearing({ north: false, northEasing: false, bearing: 40 }), 40);
  assert.equal(fitBearing({ north: false, northEasing: true, bearing: 40 }), 0);
  assert.equal(fitBearing({ north: true, northEasing: false, bearing: 40 }), 0, 'the replay\'s first beat: north-up from its start');
  assert.equal(fitBearing({ north: true, northEasing: false, bearing: 0 }), 0);
  // The walk's replay asks it of the fit that opens a watch, and of no other; the maps obey.
  const screen = read('app/replay/[id].tsx');
  assert.match(screen, /fitNorth=\{beat === 'reading' \|\| beat === 'fog'\}/);
  const web = read('components/map/WalkMap.web.tsx');
  assert.match(web, /bearing: fitBearing\(\{ north: !!props\.fitNorth, northEasing: northAsked\.current, bearing: map\?\.getBearing\(\) \?\? 0 \}\)/);
  assert.match(read('components/map/WalkMap.native.tsx'), /props\.fitNorth/);
  assert.match(read('components/map/types.ts'), /fitNorth\?: boolean;/);
});
