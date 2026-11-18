// @layer core
/**
 * The rhythm (RR1-RR19, decision 0085): the first ceremony. The path's time
 * goes to the stretches between moments, not the minutes walked: a glide
 * between nearby moments, a zip with the camera pulled back through a long
 * empty one, a cut across a break. Notes and memos are bubbles in a corner,
 * photos and videos cards that tuck into a pile, passed places whisper by,
 * and a clock rolls with the walker. Every number is in REPLAY_RHYTHM.
 */
import { facedAt, hasMore, type Faced } from '../moment';
import { gridDuration, GRID_MAX } from './grid';
import { passedLine } from '../explore/explore';
import { distanceM } from '../geo';
import { plainNote } from '../refs';
import { REPLAY_RHYTHM as R } from '../motionTokens';
import { GAP_MS } from '../replay';
import type { LngLat } from '../types';
import { memoLengthMs } from '../voiceTrim';
import { easeInOut, easeOut, steady } from './ease';
import { positionAt, timeAtMetres } from './story';
import type {
  Ceremony, CeremonyOptions, Frame, Jump, Landing, Overlay, Story, StoryBreak, StoryMoment, StoryMove, StoryTravel,
} from './types';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** A short break no farther than this is a step, not a cut. */
const STEP_M = 40;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerpAt = (a: LngLat | null, b: LngLat | null, u: number): LngLat | null =>
  a && b ? [lerp(a[0], b[0], u), lerp(a[1], b[1], u)] : (a ?? b);

export type SlotKind = 'note' | 'memo' | 'photo' | 'video' | 'grid';
export interface Slot {
  capture: Faced;
  kind: SlotKind;
  t0: number;
  t1: number;
  /** A memo's or video's play time (its kept part); a grid's longest video. */
  len: number;
  /** A stack's grid (MS17): its photos and videos, each the moment at that piece. */
  pieces?: Faced[];
  /** A stack's note or memo, shown beside its grid on its own clock from the grid's start (MS17). */
  beside?: boolean;
}
interface Span {
  t0: number;
  t1: number;
  /** The walker at the start and the end of the segment. */
  from: LngLat | null;
  to: LngLat | null;
}
export type Seg =
  | (Span & { k: 'intro'; clock: number })
  | (Span & { k: 'leg'; len: number; ra: number; rb: number; kz: number; peak: number; move?: StoryMove; travel?: StoryTravel })
  | (Span & { k: 'stop'; moment: StoryMoment; slots: Slot[] })
  | (Span & { k: 'cut'; brk: StoryBreak })
  | (Span & { k: 'rest'; clock: number });

export interface RhythmPlan {
  story: Story;
  total: number;
  segs: Seg[];
  reduceMotion: boolean;
  bubbles: { capture: Faced; ta: number; exitAt: number; len: number }[];
  /** One per moment (MS17): a stack's grid carries its photos and videos as `pieces`. */
  cards: { capture: Faced; t0: number; t1: number; len: number; from: LngLat | null; pieces?: Faced[] }[];
  whispers: { key: string; text: string; at: LngLat; tw: number }[];
  lines: { t0: number; t1: number; text: string }[];
  /** For each path, the index of its last segment: past it, the path is drawn whole. */
  lastSeg: Record<string, number>;
  /** When each moment begins, and where a press of Next lands for it (RY13, RY14). */
  stops: Landing[];
}

/** "43 min later", "2 h later", "1 h 20 min later" (RR4, RR16). */
export function laterLine(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'Moments later';
  if (m < 60) return `${m} min later`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min later` : `${h} h later`;
}

const wordsIn = (text: string | null) => (text ?? '').trim().split(/\s+/).filter(Boolean).length;

/** The walker's wait at a note grows with its words (RR9, RY5). */
export function notePause(text: string | null): number {
  const words = wordsIn(text);
  if (words <= R.noteWords) return R.note;
  return Math.min(R.noteMax, R.note + (words - R.noteWords) * R.notePerWord);
}

/** How long a note's bubble stays at the least once it is fully shown, so it can be read (RY7); never past a bubble's life. */
const noteRead = (c: Pick<Faced, 'body' | 'body_format'>) => R.bubbleIn + Math.min(R.bubbleLife - R.bubbleIn, R.noteRead + R.readPerWord * wordsIn(plainNote(c.body, c.body_format)));

/** A note's pause by its words as shown (NP10). */
export const noteSlotPause = (c: Pick<Faced, 'body' | 'body_format'>): number => notePause(plainNote(c.body, c.body_format));

const slotKind = (c: Faced): SlotKind => (c.kind === 'text' ? 'note' : c.kind === 'voice' ? 'memo' : c.kind);
const slotOf = (c: Faced): Slot => ({ capture: c, kind: slotKind(c), t0: 0, t1: slotDur(c), len: mediaLen(c) });

/**
 * A stop's slots (MS17): a lone moment is one slot, as before. A stacked moment with two or more photos and videos is
 * one grid slot of them, its memos and notes beside it in capture order; one with fewer plays its pieces one by one.
 */
function stopSlots(captures: Faced[]): Slot[] {
  const slots: Slot[] = [];
  for (const c of [...captures].sort((a, b) => a.t - b.t)) {
    if (!hasMore(c)) {
      slots.push(slotOf(c));
      continue;
    }
    const each = [...c.pieces].sort((a, b) => a.t - b.t).map((p) => facedAt(c, p.id));
    const media = each.filter((x) => x.kind === 'photo' || x.kind === 'video');
    if (media.length < 2) {
      for (const x of each) slots.push(slotOf(x));
      continue;
    }
    const longest = Math.max(0, ...media.filter((x) => x.kind === 'video').map(mediaLen));
    slots.push({ capture: c, kind: 'grid', t0: 0, t1: gridDuration(media.length, longest), len: longest, pieces: media });
    for (const x of each) if (x.kind === 'text' || x.kind === 'voice') slots.push({ ...slotOf(x), beside: true });
  }
  return slots;
}

/**
 * A grid's frame (MS17): each piece swipes in a beat after the one before (`gridStagger`, over `bubbleIn`), and past
 * nine the grid scrolls from the last swipe-in to the tuck. The stage only draws it.
 */
function gridFrame(pieces: Faced[], v: number, dur: number): { pieces: Faced[]; shown: number[]; scroll: number } {
  const since = v - R.grow;
  const first = Math.min(pieces.length, GRID_MAX);
  const swipes = Math.max(0, first - 1) * R.gridStagger + R.bubbleIn;
  const shown = pieces.map((_, i) => (i < first ? easeOut(clamp01((since - i * R.gridStagger) / R.bubbleIn)) : 1));
  const span = Math.max(1, dur - R.grow - R.tuck - swipes);
  return { pieces, shown, scroll: pieces.length > GRID_MAX ? easeInOut(clamp01((since - swipes) / span), 2) : 0 };
}

/**
 * A memo's or video's play time: its kept part (`edit.trim`, the same on both; VT7, ME15), where the players stop, never
 * the stored whole length, or the walker stands through the cut part with nothing playing (fix trimmed-length 1-3).
 */
const mediaLen = (c: Faced) => Math.max(R.mediaMin, memoLengthMs(c));
function slotDur(c: Faced): number {
  switch (slotKind(c)) {
    case 'note': return noteSlotPause(c);
    case 'memo': return mediaLen(c) + R.mediaTail;
    case 'photo': return R.grow + R.photoHold + R.tuck;
    // The card stands a moment after the video ends (RY6).
    case 'video': return R.grow + mediaLen(c) + R.mediaTail + R.tuck;
    // A capture alone is never a grid; a grid's length is `gridDuration`.
    case 'grid': return R.grow + R.photoHold + R.tuck;
  }
}

/**
 * How long each photo on its own at a stop is fully shown (RY1-RY3): the first of the replay, and one reached after a
 * long stretch with nothing kept, a fifth longer; photos after the first at one stop tighten, the last whole again. A
 * photo walked to is never shortened: where it stands in the walk says nothing of its worth.
 */
function holdPhotos(slots: Slot[], long: boolean) {
  const photos = slots.filter((s) => s.kind === 'photo');
  photos.forEach((s, k) => {
    const last = photos.length > 1 && k === photos.length - 1;
    const share = k === 0 ? (long ? R.photoFirst : 1) : last ? 1 : Math.max(R.stopFloor, (1 - R.stopTighten) ** k);
    s.t1 = R.grow + R.photoHold * share + R.tuck;
  });
  return photos.length > 0;
}

/** A stretch's time from its length alone (RR1, RY9), the walker's steady pace along it (RY8) and how the camera pulls back (RR3). */
function legShape(len: number, travel: boolean) {
  const long = len >= R.zipAtM;
  const dur = long ? R.glide + R.zip * Math.max(0.35, Math.min(1, (len - R.zipAtM) / R.zipFullM)) : R.glide * Math.max(0.45, len / R.zipAtM);
  const ra = Math.min(R.paceInMax, R.paceIn / dur);
  const rb = Math.min(R.paceOutMax, R.paceOut / dur);
  const kz = clamp01((len - R.zipAtM) / 900);
  const peak = travel ? Math.max(R.zoomOut, len / R.travelZoomM) : R.zoomOut;
  return { dur, ra, rb, kz, peak };
}

type Draft = (Seg extends infer S ? (S extends Seg ? Omit<S, 't0' | 't1'> : never) : never) & { dur: number };

function firstPosition(story: Story): LngLat | null {
  for (const e of story.events) {
    if (e.kind === 'moment' && e.at) return e.at;
    if (e.kind === 'move') return positionAt(story.paths[e.pathId], e.t0);
    if ((e.kind === 'travel' || e.kind === 'break') && e.from) return e.from;
  }
  return null;
}

export function rhythmPlan(story: Story, opts: CeremonyOptions): RhythmPlan {
  const draft: Draft[] = [];
  let pos = firstPosition(story);
  // Metres since the last moment with nothing kept, and whether a photo on its own has been shown yet (RY2).
  let stretch = 0;
  let photoSeen = false;
  // With reduce motion the intro holds still for its time, so the timing is the same (RR18, audit 12).
  if (story.events.length) draft.push({ k: 'intro', dur: R.intro, from: pos, to: pos, clock: story.start });
  for (const e of story.events) {
    if (e.kind === 'move') {
      const path = story.paths[e.pathId];
      const to = positionAt(path, e.t1) ?? pos;
      const len = e.m1 - e.m0;
      if (len >= R.minLegM) {
        const s = legShape(len, false);
        draft.push({ k: 'leg', dur: s.dur, len, ra: s.ra, rb: s.rb, kz: s.kz, peak: s.peak, move: e, from: positionAt(path, e.t0) ?? pos, to });
      }
      stretch += Math.max(0, len);
      pos = to;
    } else if (e.kind === 'travel') {
      const to = e.to ?? pos;
      if (e.m >= R.minLegM || e.t1 - e.t0 >= R.laterAfterMs) {
        const s = legShape(e.m, true);
        draft.push({ k: 'leg', dur: s.dur, len: e.m, ra: s.ra, rb: s.rb, kz: s.kz, peak: s.peak, travel: e, from: e.from ?? pos, to });
      }
      stretch += Math.max(0, e.m);
      pos = to;
    } else if (e.kind === 'break') {
      // Under a minute, and no way to speak of (a moment in a gap, next to where the trace picks up): a step, not a cut (audit 30).
      const step = e.t1 - e.t0 < GAP_MS && (!e.from || !e.to || distanceM(e.from, e.to) <= STEP_M);
      if (!step) draft.push({ k: 'cut', dur: R.cut, brk: e, from: e.from ?? pos, to: e.to ?? pos });
      pos = e.to ?? pos;
    } else {
      // On a path, the walker stays where the trace has it, from arriving to leaving (audit 9);
      // a moment the trace doesn't cover is where it was taken (audit 30).
      const path = e.pathId && e.onTrace ? story.paths[e.pathId] : null;
      const at = (path ? positionAt(path, e.arrive) : null) ?? e.at ?? pos;
      const leave = (path ? positionAt(path, e.leave) : null) ?? at;
      // A slot's t1 holds its duration until the times are laid out.
      const slots = stopSlots(e.captures);
      if (holdPhotos(slots, !photoSeen || stretch >= R.longM)) photoSeen = true;
      stretch = 0;
      draft.push({ k: 'stop', dur: 0, moment: e, slots, from: at, to: leave });
      pos = leave;
    }
  }
  if (story.events.length) draft.push({ k: 'rest', dur: R.rest, clock: story.end, from: pos, to: pos });
  // Nothing shrinks to fit a total (RY10): each part keeps its time.

  // Lay out the times.
  const segs: Seg[] = [];
  let t = 0;
  for (const d of draft) {
    if (d.k === 'stop') {
      const t0 = t;
      // A grid's beside slots run on their own clock from the grid's start (MS17).
      let side = t;
      for (const s of d.slots) {
        const dur = s.t1;
        if (s.beside) {
          s.t0 = side;
          s.t1 = side + dur;
          side += dur;
          continue;
        }
        t = Math.max(t, side);
        s.t0 = t;
        s.t1 = t + dur;
        side = s.kind === 'grid' ? t : s.t1;
        t += dur;
      }
      t = Math.max(t, side);
      const { dur: _dur, ...rest } = d;
      void _dur;
      segs.push({ ...rest, t0, t1: t } as Seg);
    } else {
      const { dur, ...rest } = d;
      segs.push({ ...rest, t0: t, t1: t + dur } as Seg);
      t += dur;
    }
  }

  const bubbles: RhythmPlan['bubbles'] = [];
  const cards: RhythmPlan['cards'] = [];
  const lines: RhythmPlan['lines'] = [];
  const lastSeg: Record<string, number> = {};
  segs.forEach((s, i) => {
    const pathId = s.k === 'leg' ? s.move?.pathId : s.k === 'stop' ? s.moment.pathId : s.k === 'cut' ? s.brk.pathId : null;
    if (pathId) lastSeg[pathId] = i;
    if (s.k === 'stop')
      for (const sl of s.slots) {
        if (sl.kind === 'note' || sl.kind === 'memo') bubbles.push({ capture: sl.capture, ta: sl.t0, exitAt: Infinity, len: sl.kind === 'memo' ? sl.len : 0 });
        else cards.push({ capture: sl.capture, t0: sl.t0, t1: sl.t1, len: sl.len, from: s.moment.at ?? s.from, ...(sl.pieces ? { pieces: sl.pieces } : {}) });
      }
    if (s.k === 'cut') lines.push({ t0: s.t0, t1: s.t1 + R.lineAfter, text: laterLine(s.brk.t1 - s.brk.t0) });
    if (s.k === 'leg' && s.travel && s.travel.t1 - s.travel.t0 >= R.laterAfterMs) lines.push({ t0: s.t0, t1: s.t1 + R.lineAfter, text: laterLine(s.travel.t1 - s.travel.t0) });
  });
  // A bubble leaves after its life, when the one `bubbles` later arrives (RR9), or when the next card opens or a
  // break begins (RY7); but a note is never taken away before it could be read, and a memo stays until it has
  // played (audit 1).
  const cuts = segs.filter((s) => s.k === 'cut').map((s) => s.t0);
  bubbles.forEach((b, i) => {
    const pushed = bubbles[i + R.bubbles];
    const card = cards.find((c) => c.t0 > b.ta);
    const cut = cuts.find((c) => c >= b.ta);
    const beat = Math.min(card ? card.t0 : Infinity, cut ?? Infinity);
    const read = b.len > 0 ? 0 : b.ta + noteRead(b.capture);
    b.exitAt = Math.max(Math.min(b.ta + R.bubbleLife, pushed ? pushed.ta : Infinity, Math.max(beat, read)), b.ta + b.len);
  });
  // Where a press of Next lands for each moment (RY13): a little before it begins, and never inside the moment
  // before it, so never inside a memo or a video (RY14).
  const stops: Landing[] = segs.flatMap((s, i) =>
    s.k === 'stop' ? [{ t0: s.t0, land: Math.max(0, s.t0 - R.nextLead, i > 0 && segs[i - 1].k !== 'stop' ? segs[i - 1].t0 : s.t0) }] : [],
  );

  const plan: RhythmPlan = { story, total: t, segs, reduceMotion: opts.reduceMotion, bubbles, cards, whispers: [], lines, lastSeg, stops };
  // A passed place whispers as the walker reaches it (RR15): the first segment that reaches its time. More than two
  // on one walk whisper once, as that walk's card says them ("Passed a few places without stopping", RP19, the owner,
  // Nov 9), at the last, when it is true (audit 14); a day bounds each walk by its own card (audit 9).
  const byWalk = new Map<string, typeof story.passes>();
  for (const p of story.passes) byWalk.set(p.pathId, [...(byWalk.get(p.pathId) ?? []), p]);
  const whispered = [...byWalk.values()].flatMap((ps) =>
    ps.length > 2 ? [{ ...ps.reduce((a, b) => (b.t >= a.t ? b : a)), all: ps }] : ps.map((p) => ({ ...p, all: [p] })),
  );
  for (const p of whispered) {
    const i = segs.findIndex((s) => walkEnd(s, story) >= p.t && (s.k !== 'leg' || !s.move || s.move.pathId === p.pathId));
    if (i < 0) continue;
    const s = segs[i];
    // Across a cut, once the far side is up (audit 17).
    let tw = s.k === 'cut' ? s.t1 : s.t0;
    if (s.k === 'leg' && s.move && s.move.t0 < p.t) {
      let lo = 0, hi = 1;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        if (legWalkTime(plan, s, mid) < p.t) lo = mid; else hi = mid;
      }
      tw = s.t0 + hi * (s.t1 - s.t0);
    }
    // Never under a card: it waits until the card has shrunk (RY22); the cards are in order.
    for (const c of cards) if (tw >= c.t0 && tw < c.t1) tw = c.t1;
    plan.whispers.push({ key: `${p.name}@${p.t}`, text: passedLine(p.all) ?? p.name, at: p.at, tw });
  }
  return plan;
}

/** The walk time a segment reaches by its end. */
function walkEnd(s: Seg, story: Story): number {
  switch (s.k) {
    case 'intro': return story.start;
    case 'rest': return s.clock;
    case 'leg': return s.move ? s.move.t1 : s.travel!.t1;
    case 'stop': return s.moment.leave;
    case 'cut': return s.brk.t1;
  }
}

/** Walk time u of the way through a leg along a path. */
function legWalkTime(plan: RhythmPlan, s: Extract<Seg, { k: 'leg' }>, u: number): number {
  const m = s.move!;
  return timeAtMetres(plan.story.paths[m.pathId], m.m0 + (m.m1 - m.m0) * steady(u, s.ra, s.rb), m.t0, m.t1);
}

function findSeg(segs: Seg[], ms: number): number {
  let lo = 0, hi = segs.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid].t0 <= ms) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/**
 * What a press of Next says on landing (RY21): how much later it is, when a break (or a day's long travel) lay
 * between; then each place passed without stopping that it jumped over, one after another. Never edited out.
 */
function jumpLines(plan: RhythmPlan, jump: Jump): { t0: number; t1: number; text: string }[] {
  const out: { t0: number; t1: number; text: string }[] = [];
  let t = jump.at;
  if (plan.lines.some((l) => l.t0 >= jump.from && l.t0 < jump.at)) {
    const a = rhythmFrame(plan, jump.from).clock;
    const b = rhythmFrame(plan, jump.at).clock;
    if (a != null && b != null && b - a >= 60_000) {
      out.push({ t0: t, t1: t + R.jumpLine, text: laterLine(b - a) });
      t += R.jumpLine;
    }
  }
  for (const w of plan.whispers) {
    if (w.tw <= jump.from || w.tw > jump.at) continue;
    out.push({ t0: t, t1: t + R.whisper, text: w.text });
    t += R.whisper;
  }
  return out;
}

export function rhythmFrame(plan: RhythmPlan, ms: number, jump?: Jump | null): Frame {
  const { segs, story } = plan;
  if (ms >= plan.total || !segs.length) {
    const drawn: Record<string, number> = {};
    for (const id of Object.keys(story.paths)) drawn[id] = Infinity;
    return {
      done: true, walker: segs.at(-1)?.to ?? null, camera: { center: null, zoom: null }, drawn, pins: story.captures.map((c) => c.id),
      dim: 0, clock: null, line: null, lineOpacity: 0, overlays: [],
    };
  }
  const i = findSeg(segs, Math.max(0, ms));
  const s = segs[i];
  const u = clamp01((ms - s.t0) / (s.t1 - s.t0 || 1));
  const still = plan.reduceMotion;
  let walker: LngLat | null = s.from;
  let clock = story.start;
  let zoomOut = 1;
  let dim = 0;
  let here = 0;
  switch (s.k) {
    case 'intro':
      clock = s.clock;
      if (!still) zoomOut = 1 + (R.introZoomOut - 1) * (1 - easeInOut(u));
      break;
    case 'rest':
      clock = s.clock;
      walker = s.to;
      break;
    case 'leg': {
      const e = steady(u, s.ra, s.rb);
      if (s.move) {
        here = legWalkTime(plan, s, u);
        walker = positionAt(story.paths[s.move.pathId], here) ?? s.from;
        // The clock rolls with the stretch's time, eased as the walker is: a stand inside it rolls by, never leaps (audit 24).
        clock = lerp(s.move.t0, s.move.t1, e);
      } else {
        walker = lerpAt(s.from, s.to, e);
        clock = lerp(s.travel!.t0, s.travel!.t1, e);
      }
      if (!still) zoomOut = 1 + (s.peak - 1) * Math.sin(Math.PI * u) * s.kz;
      break;
    }
    case 'stop': {
      clock = lerp(s.moment.arrive, s.moment.leave, u);
      here = clock;
      const path = s.moment.pathId && s.moment.onTrace ? story.paths[s.moment.pathId] : null;
      walker = (path ? positionAt(path, clock) : null) ?? s.from;
      if (!still) zoomOut = 1 - 0.04 * easeOut(u);
      break;
    }
    case 'cut':
      walker = u < 0.5 ? s.from : s.to;
      clock = lerp(s.brk.t0, s.brk.t1, easeInOut(u));
      here = u < 0.5 ? s.brk.t0 : s.brk.t1;
      dim = Math.sin(Math.PI * u) * 0.85;
      break;
  }

  // Paths: whole once their last segment is behind; the current one up to the walker.
  const drawn: Record<string, number> = {};
  for (let k = 0; k <= i; k++) {
    const g = segs[k];
    const cur = k === i;
    if (g.k === 'leg' && g.move) drawn[g.move.pathId] = cur ? here : g.move.t1;
    else if (g.k === 'stop' && g.moment.pathId) drawn[g.moment.pathId] = cur ? here : g.moment.leave;
    else if (g.k === 'cut') drawn[g.brk.pathId] = cur ? here : g.brk.t1;
  }
  for (const [id, last] of Object.entries(plan.lastSeg)) if (i > last) drawn[id] = Infinity;

  const pins: string[] = [];
  for (let k = 0; k <= i; k++) {
    const g = segs[k];
    if (g.k === 'stop' && g.t0 <= ms) for (const sl of g.slots) pins.push(sl.capture.id);
  }

  const overlays: Overlay[] = [];
  // After a press, what it jumped over is said under the clock (RY21) and a memo that began before it is gone, so
  // nothing plays from its middle (RY14).
  const landed = jump && ms >= jump.at ? jump : null;
  for (const b of plan.bubbles) {
    if (ms < b.ta || ms >= b.exitAt + R.bubbleOut) continue;
    if (landed && b.len > 0 && b.ta < landed.at) continue;
    overlays.push({
      kind: 'bubble',
      key: b.capture.id,
      capture: b.capture,
      enter: clamp01((ms - b.ta) / R.bubbleIn),
      exit: ms < b.exitAt ? 0 : Math.max(0.001, clamp01((ms - b.exitAt) / R.bubbleOut)),
      playing: b.len > 0 && ms < b.ta + b.len,
      progress: b.len > 0 ? clamp01((ms - b.ta) / b.len) : 0,
    });
  }
  const pile: Faced[] = [];
  for (const c of plan.cards) {
    if (ms >= c.t1) {
      pile.push(c.capture);
      continue;
    }
    if (ms < c.t0) continue;
    const v = ms - c.t0;
    const dur = c.t1 - c.t0;
    const video = c.capture.kind === 'video';
    overlays.push({
      kind: 'card',
      key: c.capture.id,
      capture: c.capture,
      from: c.from,
      grow: clamp01(v / R.grow),
      tuck: clamp01((v - (dur - R.tuck)) / R.tuck),
      ...(c.pieces ? gridFrame(c.pieces, v, dur) : {}),
      playing: (video || !!c.pieces) && v >= R.grow && v < dur - R.tuck,
      progress: video ? clamp01((v - R.grow) / c.len) : 0,
      fade: still,
    });
  }
  if (pile.length) overlays.push({ kind: 'pile', key: 'pile', captures: pile });
  for (const w of plan.whispers) {
    const age = ms - w.tw;
    if (age < 0 || age >= R.whisper) continue;
    if (landed && w.tw > landed.from && w.tw <= landed.at) continue;
    overlays.push({ kind: 'whisper', key: w.key, text: w.text, at: w.at, opacity: clamp01(Math.min(age / 250, (R.whisper - age) / 500)) });
  }
  const said = landed && ms - landed.at < R.jumpLine + plan.whispers.length * R.whisper ? jumpLines(plan, landed).find((l) => ms >= l.t0 && ms < l.t1) : null;
  const line = said ?? plan.lines.find((l) => ms >= l.t0 && ms < l.t1) ?? null;
  return {
    done: false,
    walker,
    // The rhythm follows the walker at the walking zoom, pulled back on a long stretch; with reduce motion, the map stays put.
    camera: still || !walker ? { center: null, zoom: null } : { center: walker, zoom: R.baseZoom - Math.log2(zoomOut) },
    drawn,
    pins,
    dim,
    clock,
    line: line?.text ?? null,
    lineOpacity: line ? clamp01(Math.min((ms - line.t0) / 200, (line.t1 - ms) / 300)) : 0,
    overlays,
  };
}

export const rhythm: Ceremony = {
  id: 'rhythm',
  overlays: ['bubble', 'card', 'pile', 'whisper'],
  show(story, opts) {
    const plan = rhythmPlan(story, opts);
    return { total: plan.total, stops: plan.stops, frame: (ms, jump) => rhythmFrame(plan, ms, jump) };
  },
};
