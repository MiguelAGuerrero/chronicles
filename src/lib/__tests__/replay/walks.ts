/// <reference types="node" />
// Walks and days for the replay ceremony's later tests (close, stack, pictures): fixes laid in metres from one place,
// captures on them, and the guarded reach for what a test is written before (a module, a token, a frame's field).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { rhythmFrame, rhythmPlan, type RhythmPlan } from '../../ceremony/rhythm';
import { dayStory, walkStory, type WalkInput } from '../../ceremony/story';
import type { CeremonyOptions, Frame, Story } from '../../ceremony/types';
import type { Day } from '../../days';
import { distanceM, stepToward } from '../../geo';
import * as tokens from '../../motionTokens';
import { faced, facedOf, type Faced } from '../../moment';
import { timedRuns } from '../../replay';
import type { LngLat, Moment, TracePoint } from '../../types';

export const SRC = join(__dirname, '..', '..', '..');
const load = createRequire(__filename);
/** A module that may not be built yet: empty until it is. */
export const mod = (rel: string): Record<string, unknown> => {
  try {
    return load(join(SRC, rel)) as Record<string, unknown>;
  } catch {
    return {};
  }
};
export const built = <T,>(m: object, name: string): T => {
  const f = (m as Record<string, unknown>)[name];
  assert.ok(f !== undefined, `${name} is not built yet`);
  return f as T;
};
const R = tokens.REPLAY_RHYTHM as unknown as Record<string, number>;
export const token = (name: string): number => {
  assert.ok(typeof R[name] === 'number', `REPLAY_RHYTHM.${name} is not a token yet`);
  return R[name];
};

export type Screen = { width: number; height: number; insets: { top: number; bottom: number; left: number; right: number } };
export const screenOf = (width: number, height: number, top = 0): Screen => ({ width, height, insets: { top, bottom: 0, left: 0, right: 0 } });
export const PHONE = screenOf(390, 844);
export const SMALL = screenOf(320, 568);
export type Cam = { center: LngLat | null; zoom: number | null };
export type Edges = { top: number; right: number; bottom: number; left: number };
export type Box = [west: number, south: number, east: number, north: number];
/** How a telling opens and closes on the whole of what it tells (RC23, RC24), as a screen says it. */
export type Whole = { bounds: Box; open: Edges; close: Edges; maxZoom: number };

const cameraMod = mod('lib/ceremony/camera.ts');
export const project = (s: Screen, c: Cam, p: LngLat) => built<(s: Screen, c: Cam, at: LngLat) => [number, number] | null>(cameraMod, 'project')(s, c, p)!;
export const fitCamera = (s: Screen, b: Box, pad: Edges, maxZoom: number) => built<(s: Screen, b: Box, pad: Edges, maxZoom: number) => { center: LngLat; zoom: number } | null>(cameraMod, 'fitCamera')(s, b, pad, maxZoom);

export const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in metres east and north of O. */
export const at = (x: number, y = 0): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
export const MIN = 60_000;

/** Fixes every 5 s from `from` to `to` at 1.4 m/s, starting at t0. */
export function line(from: LngLat, to: LngLat, t0: number, walkId = 'w'): TracePoint[] {
  const pts: TracePoint[] = [];
  let pos = from;
  let t = t0;
  pts.push({ walk_id: walkId, t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed: 1.4, course: null });
  while (distanceM(pos, to) > 0.1) {
    pos = stepToward(pos, to, 7);
    t += 5000;
    pts.push({ walk_id: walkId, t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed: 1.4, course: null });
  }
  return pts;
}
export const endT = (pts: TracePoint[]) => pts[pts.length - 1].t;

let ids = 0;
export function cap(kind: Faced['kind'], t: number, p: LngLat | null, body: string | null = null, walkId: string | null = 'w'): Faced {
  return facedOf({ id: `c${++ids}`, walk_id: walkId, t, lat: p ? p[1] : null, lon: p ? p[0] : null, kind, file_path: kind === 'text' ? null : 'x', body, segment_id: null });
}
/** One moment of several pieces at a place (moment stacks): `kinds` in the order taken, a second apart. */
export function several(kinds: Faced['kind'][], t: number, p: LngLat, bodies: (string | null)[] = []): Faced {
  const id = `m${++ids}`;
  const pieces = kinds.map((kind, i) => ({ id: `${id}-${i}`, moment_id: id, kind, t: t + i * 1000, file_path: kind === 'text' ? null : `f${i}`, body: bodies[i] ?? (kind === 'video' ? '4000' : kind === 'voice' ? '3000' : kind === 'text' ? 'A word.' : null), caption: null, caption_y: null }));
  const m = { id, walk_id: 'w', t, lat: p[1], lon: p[0], segment_id: null, piece_ids: pieces.map((x) => x.id), pieces } as unknown as Moment;
  return faced(m);
}
export function input(fixes: TracePoint[], captures: Faced[], o: Partial<WalkInput> = {}): WalkInput {
  return {
    walk: { id: 'w', started_at: fixes[0]?.t ?? 0, ended_at: fixes.length ? endT(fixes) : 0, title: null, epilogue: null, open: false, area: null, snapped_build: 'b' },
    fixes, walkedFixes: fixes, breaks: [], pauses: [], runs: timedRuns(fixes, []).map((r) => r.map((x) => x.p)),
    rideRuns: [], rideTimed: [], captures, passed: [], stays: [], ...o,
  };
}
/** The box around places, in degrees, `m` metres to spare. */
export function boxOf(places: LngLat[], m = 0): Box {
  const xs = places.map((p) => p[0]);
  const ys = places.map((p) => p[1]);
  return [Math.min(...xs) - m * mLon, Math.min(...ys) - m * mLat, Math.max(...xs) + m * mLon, Math.max(...ys) + m * mLat];
}
/** The room a screen leaves around the whole: the map's own 48 px to open on, and room for a card's sheet to close on. */
export const wholeOf = (bounds: Box, sheet = 260): Whole => ({ bounds, open: { top: 48, right: 48, bottom: 48, left: 48 }, close: { top: 48, right: 32, bottom: sheet + 24, left: 32 }, maxZoom: 17 });

export type Opts = { reduceMotion?: boolean; screen?: Screen; whole?: Whole | null; holdOpen?: boolean; namePassed?: boolean };
export const optsOf = (o: Opts = {}) => ({ reduceMotion: false, screen: PHONE, ...o }) as unknown as CeremonyOptions;
export const planOf = (s: Story, o: Opts = {}): RhythmPlan => rhythmPlan(s, optsOf(o));
export const frameAt = (p: RhythmPlan, ms: number): Frame => rhythmFrame(p, ms);
/** A plan's segments, read loosely: the kinds a test is written before are not in the type yet. */
export type LooseSeg = { k: string; t0: number; t1: number; [key: string]: unknown };
export const segsOf = (p: RhythmPlan) => p.segs as unknown as LooseSeg[];
export const segOf = (p: RhythmPlan, k: string): LooseSeg => {
  const s = segsOf(p).find((x) => x.k === k);
  assert.ok(s, `the telling has no "${k}" part yet`);
  return s;
};
export const cam = (f: Frame): { center: LngLat; zoom: number } => {
  assert.ok(f.camera.center && f.camera.zoom != null, 'the frame says where the camera is');
  return { center: f.camera.center, zoom: f.camera.zoom };
};
/** A frame's field a test is written before. */
export const field = <T,>(f: Frame, name: string): T => {
  assert.ok(name in f, `a frame says no "${name}" yet`);
  return (f as unknown as Record<string, T>)[name];
};
export const overlaysOf = (f: Frame, kind: string) => (f.overlays as unknown as { kind: string; key: string; [key: string]: unknown }[]).filter((o) => o.kind === kind);

/** 600 m east with a photo 120 m in and a note at the end; `passed` places beside the way. */
export function walkOf(passed: string[] = [], extra: (fixes: TracePoint[]) => Faced[] = () => []) {
  const fixes = line(O, at(600), 9 * 60 * MIN);
  const photo = cap('photo', fixes[17].t, at(119));
  const note = cap('text', endT(fixes), at(600), 'Here.');
  const places = passed.map((name, i) => ({ name, generic: false, at: at(200 + i * 120, 40), t: fixes[30 + i * 16].t }));
  const walk = input(fixes, [photo, ...extra(fixes), note], { passed: places as WalkInput['passed'] });
  return { fixes, photo, note, places, walk, story: walkStory(walk), bounds: boxOf([O, at(600)], 60) };
}
/** A day: a loose note in the morning 2 km off, then the walk above. */
export function dayOf(passed: string[] = []) {
  const w = walkOf(passed);
  const morning = cap('text', 7 * 60 * MIN, at(-1500, 1300), 'Early', null);
  const day: Day = { key: '2026-11-04', entries: [{ kind: 'moment', t: morning.t, capture: morning }, { kind: 'walk', t: w.fixes[0].t, walk: w.walk.walk, captures: w.walk.captures }], moments: 3, walks: 1 };
  return { ...w, morning, story: dayStory(day, new Map([['w', w.walk]])), bounds: boxOf([O, at(600), at(-1500, 1300)], 150) };
}
