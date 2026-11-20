/// <reference types="node" />
// Replay ceremony, the UI review's findings (specs/replay-ceremony/spec.md, "The UI review and the cold find", U1 and
// U3-U6) and three things the owner's looks left, accepted on Nov 19 ("Proceed with your work"). Each is a regression
// test named `replay-ceremony ui N`, written before its fix (a todo at 41039e08): what was not built then is reached
// through casts and a guarded load (`walks.ts`). What the screen shows of them is the `replay` and `stacks` journeys' too.
//
// `replay-ceremony ui 9` to `ui 14` are the owner's defaults, Nov 20 ("proceed with reasonable default for the rest of
// your concerns based on typical traditional user experience with regards to what can show on a screen component
// wise"): each is ordinary UI convention applied to a question the looks left open, written before its code as well.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as mapTypes from '../../../components/map/types';
import * as compass from '../../compass';
import { passedLine } from '../../explore/explore';
import * as replay from '../../replay';
import * as quiet from '../../quietLines';
import type { Faced } from '../../moment';
import type { WalkInput } from '../../ceremony/story';
import { walkStory } from '../../ceremony/story';
import type { Frame } from '../../ceremony/types';
import type { LngLat, TracePoint } from '../../types';
import { at, boxOf, built, cap, dayOf, endT, field, fitCamera, frameAt, input, line, MIN, mod, O, overlaysOf, PHONE, planOf, project, screenOf, SMALL, SRC, token, walkOf, wholeOf, type Cam, type Screen } from './walks';

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const roomMod = mod('lib/ceremony/room.ts');
const gridMod = mod('lib/ceremony/grid.ts');
const liveMod = mod('lib/ceremony/live.ts');
const stackMod = mod('lib/ceremony/stack.ts');
const layoutMod = mod('components/ceremony/layout.ts');
// The two writers by their files: a bare './liveStyle' is the phone's here and the web's to the bundler.
type Write = (node: unknown, s: { pointerEvents?: 'auto' | 'none'; opacity?: number }) => void;
const writeNative: Write = (n, st) => built<Write>(mod('components/ceremony/liveStyle.ts'), 'writeStyle')(n, st);
const writeWeb: Write = (n, st) => built<Write>(mod('components/ceremony/liveStyle.web.ts'), 'writeStyle')(n, st);
const saidMod = mod('lib/ceremony/said.ts');
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

test('replay-ceremony ui 1: a picture standing on the map opens its moment, a 44 pt control; one under a later picture or under a card takes no tap', () => {
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

test('replay-ceremony ui 2: the stack starts 12 px under Next\'s foot, and its hit width is 48 on Android with the drawing unchanged', () => {
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

test('replay-ceremony ui 3: a whisper and the last view\'s passed-place name end short of the stack\'s column while the stack is up, at 320 px too', () => {
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
      const o = { kind: 'whisper', key: 'w', text: 'Passed Old Mill without stopping', at: at(m, 20), opacity: 1, above, by: at(m) };
      const pose = whisperPose(o, ctx, walking, true);
      assert.ok(pose.left! >= 8 && pose.left! + WHISPER.width <= edge, `a whisper ${m} m along runs ${Math.round(pose.left!)} to ${Math.round(pose.left! + WHISPER.width)}, the column begins at ${edge}`);
    }
  }
  // The views read whether the stack is up from the frame, as one flag.
  assert.match(read('components/ceremony/Whispers.tsx'), /stackUp\(f\)/);
});

// ---------------------------------------------------------------- ui 4 (U5): a grid's last row, and its word

test('replay-ceremony ui 4: a grid\'s last row fills, its pieces spanning the row, and the card\'s strip names a grid in the plural', () => {
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

test('replay-ceremony ui 5: a whisper stands on a solid ground, lighter than the last view\'s name, under its place and clear of the walker, the line and what stands on it', () => {
  const view = read('components/ceremony/Whispers.tsx');
  const style = (name: string) => new RegExp(`\\b${name}: \\{([^}]*)\\}`).exec(view.slice(view.indexOf('StyleSheet.create')))?.[1] ?? '';
  const whisper = style('whisper');
  const passed = style('passed');
  assert.match(whisper, /backgroundColor: theme\.glass/, 'the ground the last view\'s name has (V4, X1)');
  assert.match(passed, /backgroundColor: theme\.glass/);
  assert.doesNotMatch(view, /textShadow/, 'a halo is no ground');
  const weight = (s: string) => Number(/fontWeight: '(\d+)'/.exec(s)?.[1] ?? NaN);
  assert.ok(weight(whisper) < weight(passed), `a whisper is lighter (${weight(whisper)}) than the name on the last view (${weight(passed)})`);
  // Where it stands is the telling's to say, once. Pins and pictures stand upward from the line, so a whisper stands
  // under its place and under the line, whichever side of the line the place is on. Only where the way runs down the
  // screen is it over them: behind the walker, who would otherwise walk on into it.
  const WHISPER = built<{ width: number; height: number; gap: number }>(layoutMod, 'WHISPER');
  const whisperPose = built<(o: unknown, c: Ctx, camera: Cam, stack: boolean) => Pose>(layoutMod, 'whisperPose');
  const PICTURE_ = PICTURE();
  assert.ok(WHISPER.gap >= 12, `it keeps ${WHISPER.gap} px from its place and the line`);
  const ctx = ctxOf(PHONE);
  /** Each whisper of a walk from O to `end` past `places`, as it first shows: its side, and where it, its place and the walker are on screen. */
  const whispersOf = (end: LngLat, places: { name: string; at: LngLat; fix: number }[]) => {
    const fixes = line(O, end, 9 * 60 * MIN);
    const passed = places.map((x) => ({ name: x.name, generic: false, at: x.at, t: fixes[x.fix].t }));
    const story = walkStory(input(fixes, [cap('text', endT(fixes), end, 'Here.')], { passed: passed as WalkInput['passed'] }));
    const p = planOf(story);
    const seen = new Map<string, { above: boolean; box: { left: number; top: number; right: number; bottom: number }; place: [number, number]; walker: [number, number] }>();
    for (let ms = 0; ms < p.total; ms += 40) {
      const f = frameAt(p, ms);
      for (const o of overlaysOf(f, 'whisper')) {
        const name = o.text as string;
        const was = seen.get(name);
        if (was) {
          assert.equal(o.above, was.above, 'a whisper keeps its side while it is up');
          continue;
        }
        const cam = f.camera as Cam;
        const pose = whisperPose(o, ctx, cam, false);
        seen.set(name, { above: o.above as boolean, box: { left: pose.left!, top: pose.top!, right: pose.left! + WHISPER.width, bottom: pose.top! + WHISPER.height }, place: project(PHONE, cam, o.at as LngLat), walker: project(PHONE, cam, f.walker!) });
      }
    }
    return seen;
  };
  // A walk east: one place north of the way, one south. Both whispers stand under the place and under the line.
  const east = whispersOf(at(600), [{ name: 'North Gate', at: at(200, 30), fix: 30 }, { name: 'South Gate', at: at(400, -30), fix: 58 }]);
  assert.deepEqual([...east.keys()], ['Passed North Gate without stopping', 'Passed South Gate without stopping']);
  for (const [name, w] of east) {
    assert.equal(w.above, false, name);
    assert.ok(Math.abs((w.box.left + w.box.right) / 2 - w.place[0]) < 1 || w.box.left === 8 || w.box.right === PHONE.width - 8, `${name}: centred on its place`);
    assert.ok(w.box.top >= Math.max(w.place[1], w.walker[1]) + WHISPER.gap - 0.5, `${name}: its box starts at ${Math.round(w.box.top)}, under its place (${Math.round(w.place[1])}) and the walker's line (${Math.round(w.walker[1])})`);
    // A picture standing on the line there (its tile from 12 to 48 px over it) is clear of it too.
    assert.ok(w.box.top > w.walker[1] - (PICTURE_.lift - PICTURE_.size / 2));
  }
  // A walk north (up the screen): under its place still, behind the walker, who walks on away from it.
  const north = whispersOf(at(0, 600), [{ name: 'East Gate', at: at(8, 200), fix: 29 }]).get('Passed East Gate without stopping')!;
  assert.equal(north.above, false);
  assert.ok(north.box.top >= Math.max(north.place[1], north.walker[1]) + WHISPER.gap - 0.5, 'under the place and the walker as it passes');
  // A walk south (down the screen): over its place, behind the walker again.
  const south = whispersOf(at(0, -600), [{ name: 'West Gate', at: at(-8, -200), fix: 29 }]).get('Passed West Gate without stopping')!;
  assert.equal(south.above, true);
  assert.ok(south.box.bottom <= Math.min(south.place[1], south.walker[1]) - WHISPER.gap + 0.5, 'over the place and the walker as it passes');
  // With nothing to place it by (reduce motion: the map is not the camera's), under the clock, as before.
  const none = whisperPose({ kind: 'whisper', key: 'w', text: 't', at: at(100), opacity: 0.6, above: false, by: at(100) }, ctx, { center: null, zoom: null }, false);
  assert.deepEqual(none, { left: (PHONE.width - WHISPER.width) / 2, top: 100, opacity: 0.6 });
});

// ---------------------------------------------------------------- ui 6: a hop's dots over a walked street

test('replay-ceremony ui 6: while a replay is told a hop\'s dots stand on a white edge, each dot in its own disc, so they read on the land and on a lit street; other maps\' gap links are as they were', () => {
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

test('replay-ceremony ui 7: through the dive the first beat\'s faint trace fades out and the walker fades in; with reduce motion each is a step', () => {
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
  // How a map draws the trace it is given: as the screen says, and while a replay is told only as far as the frames
  // say: the lines fade from the first beat's faint trace to nothing, the end markers come up to full, the links (the
  // replay's own hops then) are whole.
  const shown = built<(opacity: number, told: boolean, whole: number) => { line: number; marks: number; links: number }>(mapTypes as unknown as Record<string, unknown>, 'traceShown');
  const quiet = mapTypes.QUIET_TRACE_OPACITY;
  assert.deepEqual(shown(quiet, false, 0), { line: quiet, marks: quiet, links: quiet }, 'the first beat: faint, as the screen says');
  assert.deepEqual(shown(quiet, true, 1), { line: quiet, marks: quiet, links: 1 }, 'the path\'s first frame: the same trace, no cut');
  assert.deepEqual(shown(quiet, true, 0), { line: 0, marks: 1, links: 1 }, 'past the dive: the trace is the replay\'s own line');
  assert.ok(shown(quiet, true, 0.5).line === quiet / 2 && shown(quiet, true, 0.5).marks > quiet && shown(quiet, true, 0.5).marks < 1);
  assert.deepEqual(shown(1, false, 0), { line: 1, marks: 1, links: 1 }, 'the card, and every other map');
  assert.deepEqual(shown(0, false, 1), { line: 0, marks: 0, links: 0 }, 'hidden while navigating, as before');
  // The frame hands both to the map, which writes them with no render; the screen keeps giving the map the trace it
  // showed in the first beat, so there is something to fade.
  assert.match(read('components/ceremony/useCeremonyLoop.ts'), /wholeTrace: f\.wholeTrace, walkerFade: f\.walkerFade/);
  const web = read('components/map/WalkMap.web.tsx');
  assert.match(web, /f\.wholeTrace/);
  assert.match(web, /f\.walkerFade/);
  assert.match(read('components/map/WalkMap.native.tsx'), /walkerFade/);
  const screen = read('app/replay/[id].tsx');
  assert.doesNotMatch(screen, /trace=\{telling \|\|/, 'the walk\'s replay takes the trace off the map as the path begins');
  assert.match(screen, /traceOpacity=\{beat === 'fog' \|\| beat === 'reading' \|\| telling \? QUIET_TRACE_OPACITY : 1\}/, 'through the path the trace is the first beat\'s, for the frames to fade');
  assert.match(web, /paintTrace\(traceShown\(traceOpacity\.current, true, f\.wholeTrace\)\)/);
  assert.match(web, /p\.marker\.setOpacity\(String\(f\.walkerFade\)\)/, 'the dot\'s fade is written through its marker, which owns its element\'s opacity');
  assert.doesNotMatch(web, /p\.el\.style\.opacity/, 'a style set beside the marker\'s own lasts one frame');
});

// ---------------------------------------------------------------- ui 8: north-up from the first beat

test('replay-ceremony ui 8: the first beat\'s fit turns a map turned by hand north-up, so the path never snaps it', () => {
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

// ================================================================ the owner's defaults, Nov 20 (ui 9 to ui 14)

// ---------------------------------------------------------------- ui 9: a hop's halo is a hairline

test('replay-ceremony ui 9: a hop\'s edge is a hairline casing, a pixel or so wider each side of a dot, one mark a dot, so on plain land the dots read apart and never as a white ribbon', { todo: 'test first' }, () => {
  const edge = built<{ color: string; width: number; dash: number[]; opacity: number }>(mapTypes as unknown as Record<string, unknown>, 'HOP_EDGE');
  const dash = mapTypes.GAP_LINK_DASH;
  const dot = mapTypes.GAP_LINK_WIDTH;
  // A line's casing: about 1 px each side (2 wider), 3 wider at the most; never the 6 px disc it was.
  assert.ok(edge.width >= dot + 2 && edge.width <= dot + 3, `the edge is ${edge.width} px under a ${dot} px dot`);
  // A dash is counted in its line's own width: the same period along the line, so one edge mark a dot.
  const period = dot * (dash[0] + dash[1]);
  assert.ok(Math.abs(edge.width * (edge.dash[0] + edge.dash[1]) - period) < 1e-9, 'the edge keeps the dots\' own spacing');
  // With round caps a mark is its dash and its own width long. Between two edge marks the land shows: 1.5 px or more
  // (the 6 px discs left 0.6 and read as a ribbon), and the dots themselves stay further apart than they are wide.
  const mark = (width: number, d: number) => width * d + width;
  assert.ok(period - mark(edge.width, edge.dash[0]) >= 1.5, `land between two edge marks: ${(period - mark(edge.width, edge.dash[0])).toFixed(2)} px`);
  assert.ok(period - mark(dot, dash[0]) > dot);
  // It still does what ui 6 gave it: reads on a lit street, and the dot on it; only while a replay tells.
  assert.ok(contrast(edge.color, mapTypes.COLORS.walked) >= 3);
  assert.ok(contrast(mapTypes.FOG_BOLD, edge.color) >= 3);
  const hopEdgeOpacity = built<(told: boolean) => number>(mapTypes as unknown as Record<string, unknown>, 'hopEdgeOpacity');
  assert.deepEqual([hopEdgeOpacity(false), hopEdgeOpacity(true)], [0, edge.opacity]);
  // Both maps draw the edge from the one token, width and dash.
  assert.match(read('components/map/WalkMap.web.tsx'), /'line-width': HOP_EDGE\.width, 'line-opacity': 0, 'line-dasharray': \[\.\.\.HOP_EDGE\.dash\]/);
  assert.match(read('components/map/WalkMap.native.tsx'), /'line-width': HOP_EDGE\.width, 'line-opacity': hopEdgeOpacity\(hops != null\), 'line-dasharray': \[\.\.\.HOP_EDGE\.dash\]/);
});

// ---------------------------------------------------------------- ui 10: the words on the two buttons

test('replay-ceremony ui 10: the replay\'s buttons say Pause (Play while paused) and Skip to end; where the top row has no room for the longer word it says Skip and is spoken "Skip to the end"', { todo: 'test first' }, () => {
  const roomOf = roomMod as Record<string, unknown>;
  const T = built<{ edge: number; gap: number; clock: number; date: number; pause: number; skip: number; skipLong: number; side: number }>(roomOf, 'TOP_ROW');
  const topRow = built<(width: number) => { skip: string; skipSpoken: string; room: number }>(roomOf, 'topRow');
  // The row: a button 12 in from each edge, the clock (on the last view, the date) in the middle of the screen. The
  // longer word is shown wherever its button ends a gap short of both at their widest, and nowhere else.
  for (let w = 300; w <= 480; w += 1) {
    const r = topRow(w);
    const fits = w / 2 - T.edge - T.skipLong - T.gap >= Math.max(T.clock, T.date) / 2;
    assert.equal(r.skip, fits ? 'Skip to end' : 'Skip', `${w} px`);
    assert.equal(r.skipSpoken, fits ? 'Skip to end' : 'Skip to the end', 'its spoken name says the same, and begins with the word shown (WCAG 2.5.3)');
    // The room left for the line under the clock and for the date: between Pause and what stands at the right, in
    // the middle of the screen, never past either.
    const right = w - T.edge - (fits ? T.skipLong : T.skip) - T.gap;
    assert.ok(w / 2 + r.room / 2 <= right + 0.01 || r.room === 120, `${w} px: the room (${r.room}) ends short of the right-hand button`);
    assert.ok(w / 2 - r.room / 2 >= T.edge + T.pause + T.gap - 0.01 || r.room === 120, `${w} px: and of Pause`);
    if (!fits) assert.equal(r.room, Math.max(120, w - 2 * T.side), 'with the short word the row is as it was');
  }
  assert.equal(topRow(320).skip, 'Skip', 'a 320 px phone keeps the short word');
  assert.equal(topRow(390).skip, 'Skip to end');
  assert.ok(topRow(390).room >= 120);
  // Both replays word the buttons the same way; the walk screen's own Pause and Hold are not these.
  for (const f of ['app/replay/[id].tsx', 'app/day/[key].tsx']) {
    const src = read(f);
    assert.match(src, /label=\{play\.held \? 'Play' : 'Pause'\}/, `${f}: Pause, and Play while paused`);
    assert.match(src, /accessibilityHint=\{play\.held \? 'Goes on with the replay' : 'Pauses the replay where it is'\}/);
    assert.match(src, /label=\{top\.skip\}\s+spokenLabel=\{top\.skipSpoken\}/, `${f}: Skip's word is the top row's`);
    assert.match(src, /const top = topRow\(width\);/);
    assert.doesNotMatch(src, /'Hold'|label="Skip"|Holds the replay/);
  }
  const stage = read('components/ceremony/Stage.tsx');
  assert.match(stage, />Paused · tap to play</);
  assert.doesNotMatch(stage, /Held · tap/);
  // The line under the clock and the last view's date keep to the row's room.
  assert.equal([...stage.matchAll(/topRow\(ctx\.width\)\.room/g)].length, 2);
});

// ---------------------------------------------------------------- ui 11 (U2): the gap question on a short phone

test('replay-ceremony ui 11: where the gap question would leave the walk no room over the card\'s sheet it is asked inside the sheet, decided from the room and never from a device', { todo: 'test first' }, () => {
  const R = replay as unknown as Record<string, unknown>;
  const place = built<(o: { height: number; top: number; sheetH: number; askH: number }) => 'over' | 'sheet'>(R, 'keepAskPlace');
  const clear = built<number>(R, 'KEEP_ASK_CLEAR');
  assert.ok(clear >= 88 && clear <= 140, `the walk keeps ${clear} px of its room clear, or the question goes into the sheet`);
  // The UI review's U2: 320 by 568, the sheet from y 197, the question 170 px tall over it: nothing left of the map.
  assert.equal(place({ height: 568, top: 116, sheetH: 371, askH: 170 }), 'sheet');
  // 390 by 844 is as it was: the question floats over the map, the walk in view above it.
  assert.equal(place({ height: 844, top: 116, sheetH: 340, askH: 172 }), 'over');
  // By the room alone: what is left between the top of the walk's room and the question's head, the question 12 px
  // over the sheet. The same room on any screen gives the same answer.
  for (const height of [480, 568, 667, 740, 844, 932]) {
    for (const top of [116, 163]) {
      const at = (room: number) => place({ height, top, sheetH: height - top - room - 12 - 170, askH: 170 });
      assert.equal(at(clear), 'over', `${height} px tall, ${clear} px clear`);
      assert.equal(at(clear - 1), 'sheet', `${height} px tall, ${clear - 1} px clear`);
      assert.equal(at(-40), 'sheet');
    }
  }
  // Once it is inside, the sheet is taller for it: the answer stays inside.
  assert.equal(place({ height: 568, top: 116, sheetH: 398, askH: 170 }), 'sheet');
  // The screen asks once, in one place: inside the sheet as its first block, or over the map, never both; until the
  // question's height is known it is laid out unseen.
  const screen = read('app/replay/[id].tsx');
  assert.match(screen, /keepAskPlace\(\{ height, top: sheetPad\.top, sheetH, askH \}\)/);
  assert.equal([...screen.matchAll(/<KeepGapsCard\b/g)].length, 2, 'one over the map, one in the sheet');
  assert.match(screen, /askAt === 'sheet' && \(\s*<KeepGapsCard\s+inline/);
  assert.match(screen, /askAt !== 'sheet' && \(\s*<KeepGapsCard/);
  const sheet = screen.slice(screen.indexOf('<ScrollView'), screen.indexOf('</ScrollView>'));
  assert.ok(sheet.indexOf('<KeepGapsCard') >= 0 && sheet.indexOf('<KeepGapsCard') < sheet.indexOf('cardBody(false)'), 'the sheet\'s first block');
  const card = read('components/KeepGapsCard.tsx');
  assert.match(card, /inline\?: boolean/);
  // The same words and the same two buttons either way: one body, two frames.
  assert.equal([...card.matchAll(/testID="keep-gaps"/g)].length, 1);
  assert.equal([...card.matchAll(/testID="leave-gaps"/g)].length, 1);
});

// ---------------------------------------------------------------- ui 12: one whisper at a time

test('replay-ceremony ui 12: one passed-place whisper at a time: as a second arrives the first leaves by its own fade, started early, and two are never on screen at full strength', { todo: 'test first' }, () => {
  const whisperEnds = built<(starts: readonly number[], life: number, out: number) => number[]>(saidMod, 'whisperEnds');
  const life = token('whisper');
  const fadeIn = token('whisperIn');
  const out = token('whisperOut');
  assert.ok(fadeIn > 0 && out > 0 && fadeIn + out < life);
  // Far apart, each has its whole time; close together, the older is gone its fade after the newer arrives.
  assert.deepEqual(whisperEnds([0, 10_000], life, out), [life, 10_000 + life]);
  assert.deepEqual(whisperEnds([0, 1000], life, out), [1000 + out, 1000 + life]);
  assert.deepEqual(whisperEnds([1000, 0], life, out), [1000 + life, 1000 + out], 'whatever order they are listed in');
  assert.deepEqual(whisperEnds([0, 800, 1500], life, out), [800 + out, 1500 + out, 1500 + life]);
  assert.deepEqual(whisperEnds([0, life - out], life, out), [life, life - out + life], 'one already fading as the next arrives is not cut short');
  // Two that arrive together (both waited for one card): the later listed is the newer.
  assert.deepEqual(whisperEnds([500, 500], life, out), [500 + out, 500 + life]);
  assert.deepEqual(whisperEnds([], life, out), []);
  // Told: two places 28 m apart on one stretch, whose whispers used to stand on screen together.
  const fixes = line(O, at(600), 9 * 60 * MIN);
  const passed = [{ name: 'North Gate', generic: false, at: at(280, 20), t: fixes[40].t }, { name: 'South Gate', generic: false, at: at(308, -20), t: fixes[44].t }];
  const p = planOf(walkStory(input(fixes, [cap('text', endT(fixes), at(600), 'Here.')], { passed: passed as WalkInput['passed'] })));
  const [first, second] = p.whispers;
  assert.ok(second.tw > first.tw && second.tw - first.tw < life - out, `the second arrives ${Math.round(second.tw - first.tw)} ms after the first, inside its time`);
  let both = 0;
  let was = 0;
  for (let ms = first.tw - 100; ms <= second.tw + life + 200; ms += 10) {
    const up = overlaysOf(frameAt(p, ms), 'whisper') as unknown as { key: string; opacity: number }[];
    const a = up.find((o) => o.key === first.key)?.opacity ?? 0;
    const b = up.find((o) => o.key === second.key)?.opacity ?? 0;
    assert.ok(!(a >= 0.999 && b >= 0.999), `two at full strength at ${Math.round(ms)} ms`);
    if (a > 0 && b > 0) both++;
    if (ms >= second.tw) {
      // From the second's arrival the first only fades, at its own fade's pace, and is gone when that is over.
      assert.ok(a <= was + 1e-9, `the first comes back at ${Math.round(ms)} ms`);
      assert.ok(Math.abs(a - Math.min(a === 0 ? 0 : 1, Math.max(0, (second.tw + out - ms) / out), (ms - first.tw) / fadeIn)) < 1e-6 || a === 0);
      if (ms >= second.tw + out) assert.equal(a, 0, `the first is still up ${Math.round(ms - second.tw)} ms after the second arrived`);
    }
    was = a;
  }
  assert.ok(both > 0 && both * 10 <= out + 10, `they cross for ${both * 10} ms, the fade's own time at the most`);
  // The second has its whole time; a whisper alone is as it was.
  assert.ok(overlaysOf(frameAt(p, second.tw + life - out - 10), 'whisper').some((o) => o.key === second.key && o.opacity === 1));
  assert.equal(overlaysOf(frameAt(p, second.tw + life), 'whisper').length, 0);
  const lone = planOf(walkOf(['Old Mill']).story);
  const w = lone.whispers[0];
  assert.equal(overlaysOf(frameAt(lone, w.tw + life - out), 'whisper')[0]?.opacity, 1);
  assert.equal(overlaysOf(frameAt(lone, w.tw + life - 10), 'whisper').length, 1);
  // The decision is the core's: the frame asks it, with the rhythm's own times.
  assert.match(read('lib/ceremony/rhythm.ts'), /whisperEnds\(/);
  assert.doesNotMatch(read('components/ceremony/Whispers.tsx'), /whisperEnds|R\.whisper/);
});

// ---------------------------------------------------------------- ui 13: a whisper beside a way up or down the screen

type Said = { key: string; text: string; at: LngLat; by: LngLat; above: boolean; beside?: number; opacity: number };
/** Each frame a walk's first whisper is up: its overlay, its box by the pose, and where its place and the walker are. */
function whisperFrames(s: Screen, end: LngLat, place: LngLat, fix: number) {
  const whisperPose = built<(o: unknown, c: Ctx, camera: Cam, stack: boolean) => Pose>(layoutMod, 'whisperPose');
  const WHISPER = built<{ width: number; height: number }>(layoutMod, 'WHISPER');
  const fixes = line(O, end, 9 * 60 * MIN);
  const story = walkStory(input(fixes, [cap('text', endT(fixes), end, 'Here.')], { passed: [{ name: 'East Gate', generic: false, at: place, t: fixes[fix].t }] as WalkInput['passed'] }));
  const p = planOf(story, { screen: s });
  const out: { o: Said; box: { left: number; top: number; right: number; bottom: number }; place: [number, number]; by: [number, number]; walker: [number, number] }[] = [];
  for (let ms = 0; ms < p.total; ms += 40) {
    const f = frameAt(p, ms);
    const o = overlaysOf(f, 'whisper')[0] as unknown as Said | undefined;
    if (!o) continue;
    const cam = f.camera as Cam;
    const pose = whisperPose(o, ctxOf(s), cam, false);
    out.push({ o, box: { left: pose.left!, top: pose.top!, right: pose.left! + (o.beside ?? WHISPER.width), bottom: pose.top! + WHISPER.height }, place: project(s, cam, o.at), by: project(s, cam, o.by), walker: project(s, cam, f.walker!) });
  }
  return out;
}

test('replay-ceremony ui 13: where the way runs up or down the screen a whisper stands beside the line, on the side away from the stack, narrowed to the room there and never across the line', { todo: 'test first' }, () => {
  const WHISPER = built<{ width: number; height: number; gap: number; side: number; min: number }>(layoutMod, 'WHISPER');
  const P = PICTURE();
  assert.ok(WHISPER.min >= 120 && WHISPER.min < WHISPER.width, `it is never narrower than ${WHISPER.min} px`);
  // Clear of a picture standing on the line (its tile is half its size each side of it) and of the walker's dot.
  assert.ok(WHISPER.side >= P.size / 2 + 4, `it keeps ${WHISPER.side} px from the line`);
  for (const s of [PHONE, SMALL]) {
    for (const [end, place, name] of [[at(0, 600), at(8, 200), 'north'], [at(0, -600), at(-8, -200), 'south']] as const) {
      const frames = whisperFrames(s, end, place, 29);
      assert.ok(frames.length > 20, `${s.width} px, ${name}: the whisper is up`);
      const beside = frames[0].o.beside;
      assert.ok(typeof beside === 'number' && beside >= WHISPER.min && beside <= WHISPER.width, `${s.width} px, ${name}: it stands beside the line, ${beside} px wide`);
      for (const f of frames) {
        assert.equal(f.o.beside, beside, 'its side and its width are said once');
        // The line there is where the walker passes the place; the stack is at the right, so its room is at the left.
        const lineX = Math.min(f.place[0], f.by[0]);
        assert.ok(f.box.right <= lineX - WHISPER.side + 0.5, `${s.width} px, ${name}: its box ends at ${Math.round(f.box.right)}, the line is at ${Math.round(lineX)}`);
        assert.ok(f.box.left >= 8 - 0.5, `${s.width} px, ${name}: and begins on the screen (${Math.round(f.box.left)})`);
        // Beside its place, not above or below it: the place is level with its box.
        assert.ok(f.place[1] >= f.box.top - 0.5 && f.place[1] <= f.box.bottom + 0.5, `${s.width} px, ${name}: level with its place`);
        // Clear of the walker's dot (10 px about it) and of a picture standing anywhere on the line there.
        assert.ok(f.walker[0] - 10 >= f.box.right, `${s.width} px, ${name}: clear of the walker's dot`);
        assert.ok(f.by[0] - P.size / 2 >= f.box.right, `${s.width} px, ${name}: clear of a picture on the line`);
      }
    }
  }
  // A way across the screen, or one that slants: under its place (or over it), as ui 5 left it.
  for (const end of [at(600), at(-600), at(420, 420), at(300, -520)]) {
    const frames = whisperFrames(PHONE, end, [(O[0] + end[0]) / 2, (O[1] + end[1]) / 2 + 0.00005], 30);
    assert.ok(frames.length > 0);
    assert.equal(frames[0].o.beside, undefined, 'no way up or down the screen, no side');
  }
  // No room at the left (a place far to the left of the line, a narrow screen): today's placement, under its place.
  const far = whisperFrames(SMALL, at(0, 600), at(-160, 200), 29);
  assert.equal(far[0].o.beside, undefined, 'under 120 px of room: it keeps where it stood');
  assert.equal(far[0].o.above, false);
  assert.ok(far[0].box.top >= Math.max(far[0].place[1], far[0].by[1]) + WHISPER.gap - 0.5);
  // With nothing to place it by (reduce motion), under the clock as before, at its whole width.
  const fixes = line(O, at(0, 600), 9 * 60 * MIN);
  const still = planOf(walkStory(input(fixes, [cap('text', endT(fixes), at(0, 600), 'Here.')], { passed: [{ name: 'East Gate', generic: false, at: at(8, 200), t: fixes[29].t }] as WalkInput['passed'] })), { reduceMotion: true });
  assert.equal((still.whispers[0] as unknown as Said).beside, undefined);
  // The view draws what it is told: the room's width and the words at the edge by the line.
  const view = read('components/ceremony/Whispers.tsx');
  assert.match(view, /w\.beside/);
  assert.match(view, /fontSize: 13/, 'its words stay 13 px');
});

// ---------------------------------------------------------------- ui 14: the last view's names with no room

type Named = { key: string; text: string; at: LngLat | null; above?: boolean; top?: number };
test('replay-ceremony ui 14: names that cannot each stand clear of the walk\'s line and the pictures on it are said as the card\'s one line, clear of the walk: under it, or over it where there is no room under', { todo: 'test first' }, () => {
  const passedPose = built<(o: unknown, c: Ctx, camera: Cam, above: boolean, index: number, stack: boolean) => Pose>(layoutMod, 'passedPose');
  const passedWidth = built<(c: Screen, stack: boolean) => number>(layoutMod, 'passedWidth');
  const PASSED = built<{ height: number; gap: number }>(layoutMod, 'PASSED');
  const stackEdge = built<(s: Screen) => number>(roomMod, 'stackEdge');
  const P = PICTURE();
  const namedOn = (story: ReturnType<typeof walkStory>, screen: Screen, whole: ReturnType<typeof wholeOf>) => {
    const p = planOf(story, { screen, whole, namePassed: true });
    const view = fitCamera(screen, whole.bounds, whole.close, whole.maxZoom)!;
    return { names: overlaysOf(frameAt(p, p.total - 1), 'passed') as unknown as Named[], view };
  };
  /** A name's room on the last view, as the stage places it. */
  const roomOf = (o: Named, screen: Screen, view: Cam, stack: boolean) => {
    const pose = passedPose(o, ctxOf(screen), view, !!o.above, 0, stack);
    return { left: pose.left!, top: pose.top!, right: pose.left! + passedWidth(screen, stack), bottom: pose.top! + PASSED.height };
  };
  // With room (390 px, one place): named beside its place, as before, clear of the line.
  const one = walkOf(['Old Mill']);
  const a = namedOn(one.story, PHONE, wholeOf(one.bounds));
  assert.equal(a.names.length, 1);
  assert.deepEqual([a.names[0].text, a.names[0].at], ['Passed Old Mill without stopping', one.places[0].at]);
  const lineY = project(PHONE, a.view, at(200))[1];
  assert.ok(roomOf(a.names[0], PHONE, a.view, true).top >= lineY + PASSED.gap - 0.5 && !a.names[0].above, 'under its place and the line');
  // Two with room and nothing standing between them: each beside its own place, the more northern over it.
  const fixes = line(O, at(600), 9 * 60 * MIN);
  const two = walkStory(input(fixes, [cap('text', endT(fixes), at(600), 'Here.')], { passed: [{ name: 'North Gate', generic: false, at: at(150, 6), t: fixes[21].t }, { name: 'South Gate', generic: false, at: at(450, -6), t: fixes[64].t }] as WalkInput['passed'] }));
  const b = namedOn(two, PHONE, wholeOf(boxOf([O, at(600)], 60)));
  assert.deepEqual(b.names.map((n) => [n.text, n.above]), [['Passed North Gate without stopping', true], ['Passed South Gate without stopping', false]]);
  // The picture of this fix: 320 px, two places, pictures standing all along the walk and a full stack. No name can
  // stand over its place (the pictures are there) and the two cannot both stand under the line: one line, the card's.
  const w = walkOf(['Old Mill', 'Fox Point Museum'], (fx: TracePoint[]) => Array.from({ length: 19 }, (_, i) => cap('photo', fx[20 + i * 3].t, at(140 + i * 21))));
  const whole = wholeOf(w.bounds);
  const c = namedOn(w.story, SMALL, whole);
  assert.equal(c.names.length, 1, 'said as one line');
  assert.equal(c.names[0].text, passedLine(w.places));
  assert.equal(c.names[0].text, 'Passed Old Mill and Fox Point Museum without stopping');
  assert.equal(c.names[0].at, null, 'beside no one place');
  const ys = w.fixes.map((f) => project(SMALL, c.view, [f.lon, f.lat])[1]);
  const said = roomOf(c.names[0], SMALL, c.view, true);
  assert.ok(said.top >= Math.max(...ys) + PASSED.gap, `under the walk: its room starts at ${Math.round(said.top)}, the walk's line is at ${Math.round(Math.max(...ys))}`);
  assert.ok(said.bottom <= SMALL.height - 44, 'and on the screen, above the map\'s own marks');
  assert.ok(said.left >= 8 && said.right <= stackEdge(SMALL), `ending short of the stack (${Math.round(said.left)} to ${Math.round(said.right)}, the column at ${stackEdge(SMALL)})`);
  assert.equal(!!c.names[0].above, false);
  // No room under the walk (it is framed low on the screen): over it, over the pictures standing on it.
  const low = { ...whole, close: { top: 400, right: 32, bottom: 40, left: 32 } };
  const d = namedOn(w.story, SMALL, low);
  assert.equal(d.names.length, 1);
  const lowYs = w.fixes.map((f) => project(SMALL, d.view, [f.lon, f.lat])[1]);
  const over = roomOf(d.names[0], SMALL, d.view, true);
  assert.equal(d.names[0].above, true);
  assert.ok(over.bottom <= Math.min(...lowYs) - (P.lift + P.size / 2) - PASSED.gap + 0.5, `over the walk and its pictures: its room ends at ${Math.round(over.bottom)}, the line is at ${Math.round(Math.min(...lowYs))}`);
  assert.ok(over.top >= 12 + 48 + 8, 'under the top row');
  // More than two were one line already (RC25, RP19): it stands clear of the walk the same way.
  const many = walkOf(['A', 'B', 'C']);
  const e = namedOn(many.story, PHONE, wholeOf(many.bounds));
  assert.deepEqual([e.names.length, e.names[0].text, e.names[0].at], [1, 'Passed a few places without stopping', null]);
  const manyYs = many.fixes.map((f) => project(PHONE, e.view, [f.lon, f.lat])[1]);
  assert.ok(roomOf(e.names[0], PHONE, e.view, true).top >= Math.max(...manyYs) + PASSED.gap);
  // With nothing to place it by (no whole to close on), the one line is under the top row, as it was.
  const bare = planOf(many.story, { namePassed: true });
  const lone = overlaysOf(frameAt(bare, bare.total - 1), 'passed') as unknown as Named[];
  assert.equal(lone[0].top, undefined);
  assert.equal(passedPose(lone[0], ctxOf(PHONE), { center: null, zoom: null }, false, 0, false).top, 12 + 48 + 8);
  // A day names none, as before.
  const day = dayOf(['Old Mill', 'Fox Point Museum']);
  const dp = planOf(day.story, { whole: wholeOf(day.bounds), holdOpen: true });
  assert.equal(overlaysOf(frameAt(dp, dp.total - 1), 'passed').length, 0);
  // The decision is the core's; the view draws each name where its overlay says.
  assert.equal(typeof (saidMod as Record<string, unknown>).lastNames, 'function');
  const view = read('components/ceremony/Whispers.tsx');
  assert.match(view, /above=\{o\.above\}/);
  assert.doesNotMatch(view, /Math\.max\(\.\.\.items\.map/, 'which name stands over its place is no longer the view\'s to work out');
});

// ---------------------------------------------------------------- ui 15: a picture's tap is switched with no render

// Found on the deploy's journeys (Nov 20): as a card left, each picture under it rendered once to take taps again, two
// commits at the start of a stretch, and the `replay` journey's RC7 (at most 8 commits a second on a stretch) read
// 8.4 and 8.6 where it had read about 6. What takes a tap is written on the control, as its place is.
test('replay-ceremony ui 15: whether a standing picture takes a tap is written on its control frame by frame, with no render', () => {
  const view = read('components/ceremony/Pictures.tsx');
  assert.doesNotMatch(view, /\buseLive\(/, 'a picture reads a flag from the frame and renders when it changes');
  assert.doesNotMatch(view, /disabled=\{|pointerEvents=\{/, 'its control states what React would have to render again to change');
  assert.match(view, /pointerEvents: pictureTaps\(f, p, ctx\) \? 'auto' : 'none'/, 'what takes a tap is a style the frame writes');
  // Both writers carry it: the web's on the element, a phone's through setNativeProps.
  const el = { style: {} as Record<string, string> };
  writeWeb(el, { pointerEvents: 'none' });
  assert.equal(el.style.pointerEvents, 'none');
  writeWeb(el, { pointerEvents: 'auto' });
  assert.equal(el.style.pointerEvents, 'auto');
  writeWeb(el, { opacity: 1 });
  assert.equal(el.style.pointerEvents, 'auto', 'a write that says nothing of it leaves it');
  const sent: { style: Record<string, unknown> }[] = [];
  writeNative({ setNativeProps: (p: { style: Record<string, unknown> }) => sent.push(p) }, { pointerEvents: 'none' });
  assert.equal(sent[0]?.style.pointerEvents, 'none');
  // A change of it alone is a change to write.
  assert.match(read('components/ceremony/useLive.ts'), /'pointerEvents'/, 'the writer compares it, or a tap switched with nothing else moving is never written');
});
