// @layer core
/**
 * The rhythm (RR1-RR19, decision 0085): the first ceremony. The path's time
 * goes to the stretches between moments, not the minutes walked: a glide
 * between nearby moments, a longer one through a long empty stretch, a hop
 * across a break (replay ceremony RC17-RC22: the camera pulls back, a dotted
 * line draws, the walker slides along it; a break too small to see is a
 * stand). Notes and memos are bubbles in a corner, photos and videos
 * cards that shrink back onto their place, where the picture then stands,
 * and gather in a stack at the edge (replay ceremony RC28-RC34); a moment of
 * several pieces arrives whole, its videos in turn in its card (RC37);
 * passed places whisper by, and a clock rolls with the walker. The camera is worked out when the telling is planned
 * (`camera.ts`, replay ceremony RC11-RC16). It opens on the whole of what is
 * told and dives to the walker's start, and closes by standing, pulling back
 * to the view the card uses and naming what was passed (RC23-RC26). Every
 * number is in REPLAY_RHYTHM.
 */
import { facedAt, hasMore, type Faced } from '../moment';
import { gridDuration, gridShown, GRID_MAX } from './grid';
import { passedLine } from '../explore/explore';
import { distanceM } from '../geo';
import { plainNote } from '../refs';
import { REPLAY_RHYTHM as R } from '../motionTokens';
import { GAP_MS } from '../replay';
import type { LngLat } from '../types';
import { memoLengthMs } from '../voiceTrim';
import { between, cameraAt, cameraTrack, fitCamera, pxPerMetre, type CameraPart, type CameraTrack, type View } from './camera';
import { easeInOut, easeOut, steady } from './ease';
import { standing } from './pictures';
import { cardFoot, PICTURE } from './room';
import { lastNames, whisperBeside, whisperGroups, type Named } from './said';
import { stackBound, stackSlots } from './stack';
import { positionAt, timeAtMetres } from './story';
import type {
  Ceremony, CeremonyOptions, Frame, Hop, Jump, Landing, Overlay, PictureOverlay, StackOverlay, Story, StoryBreak, StoryMoment, StoryMove, StoryTravel,
} from './types';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** A short break no farther than this is a step, not a break to cross. */
const STEP_M = 40;
/** The walk time either side of a place passed over which the way's run is read: which way it goes there. */
const PASS_RUN_MS = 15_000;
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
  /** A stack's grid (MS17): its photos, each the moment at that piece. */
  pieces?: Faced[];
  /**
   * A moment's videos, played in turn in its card after its pictures (replay ceremony RC37): each the moment at that
   * piece, when it plays from the card's start (`at`, after `lead` ms of coming in), and its kept length.
   */
  videos?: Turn[];
  /** A stack's note or memo, shown beside its grid on its own clock from the grid's start (MS17). */
  beside?: boolean;
  /** A memo beside a card with videos: when it plays, from the card's start: after them, the card still up (RC37). */
  offset?: number;
}
/** One video of a moment's, in its turn. */
export interface Turn {
  capture: Faced;
  lead: number;
  at: number;
  len: number;
}
interface Span {
  t0: number;
  t1: number;
  /** The walker at the start and the end of the segment. */
  from: LngLat | null;
  to: LngLat | null;
}
export type Seg =
  /** The opening (RC23): the whole held `hold` ms where no beat showed it before, then the dive to the walker's start. */
  | (Span & { k: 'intro'; clock: number; hold: number })
  | (Span & { k: 'leg'; len: number; ra: number; rb: number; move?: StoryMove; travel?: StoryTravel })
  | (Span & { k: 'stop'; moment: StoryMoment; slots: Slot[] })
  /** A break crossed (RC18, RC20): a hop, or a stand where its ends are too close to tell apart; the clock changes at `tSwitch`. */
  | (Span & { k: 'break'; brk: StoryBreak; hop: boolean; tSwitch: number })
  /** The walker stands where the walk ended, the clock where it stopped (RC24). */
  | (Span & { k: 'rest'; clock: number })
  /** The close (RC24-RC26): the camera pulls back to the view the card uses until `tHold`, and holds it to the end. */
  | (Span & { k: 'close'; clock: number; tHold: number });

export interface RhythmPlan {
  story: Story;
  total: number;
  segs: Seg[];
  reduceMotion: boolean;
  bubbles: { capture: Faced; ta: number; exitAt: number; len: number }[];
  /** One per moment (MS17): a stack's grid carries its photos as `pieces`, and its videos in turn (`at` is then into the telling). */
  cards: { capture: Faced; t0: number; t1: number; len: number; from: LngLat | null; pieces?: Faced[]; videos?: Turn[]; faces?: Faced[] }[];
  /**
   * `above`, `by`: whether it stands over its place, and where the walker passes it (`replay-ceremony ui 5`). `until`:
   * when it is gone, sooner when a newer one arrives (ui 12). `beside`: its room's width where it stands beside the
   * line, not under its place (ui 13).
   */
  whispers: { key: string; text: string; at: LngLat; tw: number; until: number; above: boolean; by: LngLat; beside?: number }[];
  lines: { t0: number; t1: number; text: string }[];
  /** For each path, the index of its last segment: past it, the path is drawn whole. */
  lastSeg: Record<string, number>;
  /** When each moment begins, and where a press of Next lands for it (RY13, RY14). */
  stops: Landing[];
  /** Each break crossed by a hop (RC18): when in the telling, its two ends, and the break. In time order. */
  hops: { t0: number; t1: number; from: LngLat; to: LngLat; brk: StoryBreak }[];
  /** The camera, worked out for the screen the telling is shown on (RC11-RC16); null with reduce motion (the map stays still, RR18) or with no place to look at. */
  camera: CameraTrack | null;
  /**
   * What the last view names (RC25): each place passed, where it stands, or the card's one line, beside none, for
   * more than two and for those with no room beside their places (`said.ts` `lastNames`, `replay-ceremony ui 14`).
   */
  named: Named[];
  /**
   * What stays behind (RC28-RC34), in the order the cards land. `stood`: each moment with a picture or a video and a
   * place, standing there as its picture from when its card has shrunk onto it (`t`). `kept`: every such moment, placed
   * or not, an entry in the stack from `land`. `pictured`: the moments whose own pin waits for the card.
   */
  stood: { key: string; capture: Faced; at: LngLat; t: number; several: boolean; video: boolean }[];
  kept: { key: string; capture: Faced; land: number; several: boolean; video: boolean }[];
  pictured: ReadonlySet<string>;
  /** The same, as the lists a frame hands on unchanged: where the pictures stand, which are moments of several, when each entry lands. */
  places: LngLat[];
  severals: boolean[];
  lands: number[];
  /** The most entries the screen's stack holds (RC30). */
  bound: number;
  /** When the map is dimmed under a card: one span for each stop's cards, the first one's coming to the last one's going (RC35). */
  scrims: { t0: number; t1: number }[];
  /** With reduce motion: the view the telling opened on, which the map is never moved from; pictures are placed by it. */
  still: View | null;
  /** A beat before the path left the whole trace on the map, faint (a walk's first beat; not a day's): the opening fades it out. */
  traced: boolean;
  /**
   * What a frame worked out last and the next one will most likely ask again: which pictures stand (the same until the
   * zoom changes or another lands) and the stack at rest. Kept with the plan, keyed by what it was worked out from, so
   * a frame is still a function of the time alone.
   */
  memo: { pictures: { n: number; zoom: number | null; out: PictureOverlay[] } | null; stack: { n: number; out: StackOverlay } | null };
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
 * A stop's slots (MS17; replay ceremony RC37). A lone moment is one slot, as before. A moment of several pieces arrives
 * whole: with two or more photos and no video, one grid slot of them, its memos and notes beside it in capture order;
 * with a video, one card for all of it: its photos as the grid (one photo: a grid of one), then each video in turn,
 * its notes beside from the start and its memos after the videos, the card still up while they play, so no memo
 * sounds over a video. With no video and fewer than two photos its pieces play one by one.
 */
function stopSlots(captures: Faced[]): Slot[] {
  const slots: Slot[] = [];
  for (const c of [...captures].sort((a, b) => a.t - b.t)) {
    if (!hasMore(c)) {
      slots.push(slotOf(c));
      continue;
    }
    const each = [...c.pieces].sort((a, b) => a.t - b.t).map((p) => facedAt(c, p.id));
    const photos = each.filter((x) => x.kind === 'photo');
    const videos = each.filter((x) => x.kind === 'video');
    if (!videos.length && photos.length < 2) {
      for (const x of each) slots.push(slotOf(x));
      continue;
    }
    if (!videos.length) {
      slots.push({ capture: c, kind: 'grid', t0: 0, t1: gridDuration(photos.length), len: 0, pieces: photos });
      for (const x of each) if (x.kind === 'text' || x.kind === 'voice') slots.push({ ...slotOf(x), beside: true });
      continue;
    }
    // Its pictures, then each video in turn; a video that is the card's first face comes with the card itself.
    let at = R.grow + gridShown(photos.length);
    const turns: Turn[] = videos.map((v, k) => {
      const lead = k === 0 && !photos.length ? 0 : R.turn;
      const turn = { capture: v, lead, at: at + lead, len: mediaLen(v) };
      at = turn.at + turn.len + R.mediaTail;
      return turn;
    });
    // Its memos one after another once the videos are over, the card staying up for them.
    const memos: Slot[] = [];
    let wait = 0;
    for (const x of each) {
      if (x.kind !== 'voice') continue;
      const s = slotOf(x);
      memos.push({ ...s, beside: true, offset: at + wait });
      wait += s.t1;
    }
    slots.push({ capture: c, kind: 'grid', t0: 0, t1: at + wait + R.tuck, len: 0, pieces: photos, videos: turns });
    for (const x of each) if (x.kind === 'text') slots.push({ ...slotOf(x), beside: true });
    slots.push(...memos);
  }
  return slots;
}

/**
 * A grid's frame (MS17): each piece swipes in a beat after the one before (`gridStagger`, over `bubbleIn`), and past
 * nine the grid scrolls from the last swipe-in to the end of its pictures' time. The stage only draws it.
 */
function gridFrame(pieces: Faced[], v: number): { pieces: Faced[]; shown: number[]; scroll: number } {
  const since = v - R.grow;
  const first = Math.min(pieces.length, GRID_MAX);
  const swipes = Math.max(0, first - 1) * R.gridStagger + R.bubbleIn;
  const shown = pieces.map((_, i) => (i < first ? easeOut(clamp01((since - i * R.gridStagger) / R.bubbleIn)) : 1));
  const span = Math.max(1, gridShown(pieces.length) - swipes);
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

/** A stretch's time from its length alone (RR1, RY9), and the walker's steady pace along it (RY8). */
function legShape(len: number) {
  const long = len >= R.zipAtM;
  const dur = long ? R.glide + R.zip * Math.max(0.35, Math.min(1, (len - R.zipAtM) / R.zipFullM)) : R.glide * Math.max(0.45, len / R.zipAtM);
  const ra = Math.min(R.paceInMax, R.paceIn / dur);
  const rb = Math.min(R.paceOutMax, R.paceOut / dur);
  return { dur, ra, rb };
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
  // The opening (RC23): the dive from the whole, which a telling with no beat before it shows for a while first. With
  // reduce motion it holds still for its time, so the timing is the same (RR18, audit 12).
  const openHold = opts.holdOpen ? R.openHold : 0;
  if (story.events.length) draft.push({ k: 'intro', dur: openHold + R.dive, hold: openHold, from: pos, to: pos, clock: story.start });
  for (const e of story.events) {
    if (e.kind === 'move') {
      const path = story.paths[e.pathId];
      const to = positionAt(path, e.t1) ?? pos;
      const len = e.m1 - e.m0;
      if (len >= R.minLegM) {
        const s = legShape(len);
        draft.push({ k: 'leg', dur: s.dur, len, ra: s.ra, rb: s.rb, move: e, from: positionAt(path, e.t0) ?? pos, to });
      }
      stretch += Math.max(0, len);
      pos = to;
    } else if (e.kind === 'travel') {
      const to = e.to ?? pos;
      if (e.m >= R.minLegM || e.t1 - e.t0 >= R.laterAfterMs) {
        const s = legShape(e.m);
        draft.push({ k: 'leg', dur: s.dur, len: e.m, ra: s.ra, rb: s.rb, travel: e, from: e.from ?? pos, to });
      }
      stretch += Math.max(0, e.m);
      pos = to;
    } else if (e.kind === 'break') {
      // Under a minute, and no way to speak of (a moment in a gap, next to where the trace picks up): a step, not a break to cross (audit 30).
      const step = e.t1 - e.t0 < GAP_MS && (!e.from || !e.to || distanceM(e.from, e.to) <= STEP_M);
      if (!step) {
        const from = e.from ?? pos;
        const to = e.to ?? pos;
        const far = from && to ? distanceM(from, to) : 0;
        // Ends too close to tell apart at the walking zoom: a stand (RC20). Else a hop, as long as it is far (RC18).
        const hop = !!from && far * pxPerMetre(R.baseZoom, from[1]) >= R.standPx;
        draft.push({ k: 'break', dur: hop ? R.breakFar * lerp(R.breakNear, 1, clamp01(far / R.breakFarM)) : R.stand, brk: e, hop, tSwitch: 0, from, to });
      }
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
  // The close (RC24): the walker stands, then the camera pulls back to the view the card uses and holds it. The clock
  // they keep is where the walker stopped, set once the times are laid out.
  if (story.events.length) {
    draft.push({ k: 'rest', dur: R.rest, clock: story.end, from: pos, to: pos });
    draft.push({ k: 'close', dur: R.close + R.closeHold, clock: story.end, tHold: 0, from: pos, to: pos });
  }
  // Nothing shrinks to fit a total (RY10): each part keeps its time.

  // Lay out the times.
  const segs: Seg[] = [];
  let t = 0;
  for (const d of draft) {
    if (d.k === 'stop') {
      const t0 = t;
      // A grid's beside slots run on their own clock from the grid's start (MS17); a memo that waits for its card's
      // videos plays where the card says, after them (RC37).
      let side = t;
      let cardAt = t;
      for (const s of d.slots) {
        const dur = s.t1;
        if (s.beside) {
          if (s.offset != null) {
            s.t0 = cardAt + s.offset;
            s.t1 = s.t0 + dur;
            continue;
          }
          s.t0 = side;
          s.t1 = side + dur;
          side += dur;
          continue;
        }
        t = Math.max(t, side);
        s.t0 = t;
        s.t1 = t + dur;
        if (s.kind === 'grid') cardAt = t;
        side = s.kind === 'grid' ? t : s.t1;
        t += dur;
      }
      t = Math.max(t, side);
      const { dur: _dur, ...rest } = d;
      void _dur;
      segs.push({ ...rest, t0, t1: t } as Seg);
    } else {
      const { dur, ...rest } = d;
      // A break's clock changes as the walker is mid-way across (RC19).
      segs.push({ ...rest, t0: t, t1: t + dur, ...(d.k === 'break' ? { tSwitch: t + dur * (d.hop ? R.hopSwitch : 0.5) } : {}), ...(d.k === 'close' ? { tHold: t + R.close } : {}) } as Seg);
      t += dur;
    }
  }

  const bubbles: RhythmPlan['bubbles'] = [];
  const cards: RhythmPlan['cards'] = [];
  const lines: RhythmPlan['lines'] = [];
  const lastSeg: Record<string, number> = {};
  segs.forEach((s, i) => {
    const pathId = s.k === 'leg' ? s.move?.pathId : s.k === 'stop' ? s.moment.pathId : s.k === 'break' ? s.brk.pathId : null;
    if (pathId) lastSeg[pathId] = i;
    if (s.k === 'stop')
      for (const sl of s.slots) {
        if (sl.kind === 'note' || sl.kind === 'memo') bubbles.push({ capture: sl.capture, ta: sl.t0, exitAt: Infinity, len: sl.kind === 'memo' ? sl.len : 0 });
        else {
          const turns = sl.videos?.map((v) => ({ ...v, at: sl.t0 + v.at }));
          cards.push({ capture: sl.capture, t0: sl.t0, t1: sl.t1, len: sl.len, from: s.moment.at ?? s.from, ...(sl.pieces ? { pieces: sl.pieces } : {}), ...(turns ? { videos: turns, faces: turns.map((v) => v.capture) } : {}) });
        }
      }
    // "N min later", from when both ends are in view until a little after the walker lands (RC19).
    if (s.k === 'break') lines.push({ t0: s.t0 + (s.hop ? (s.t1 - s.t0) * R.hopPull : R.standLineIn), t1: s.t1 + R.breakLineAfter, text: laterLine(s.brk.t1 - s.brk.t0) });
    if (s.k === 'leg' && s.travel && s.travel.t1 - s.travel.t0 >= R.laterAfterMs) lines.push({ t0: s.t0, t1: s.t1 + R.lineAfter, text: laterLine(s.travel.t1 - s.travel.t0) });
  });
  // A bubble leaves after its life, when the one `bubbles` later arrives (RR9), or when the next card opens or a
  // break begins (RY7); but a note is never taken away before it could be read, and a memo stays until it has
  // played (audit 1).
  const cuts = segs.filter((s) => s.k === 'break').map((s) => s.t0);
  // The last view is the walk's alone: a bubble has gone a little into the pull-back (RC24).
  const closing = segs.find((s) => s.k === 'close');
  bubbles.forEach((b, i) => {
    const pushed = bubbles[i + R.bubbles];
    const card = cards.find((c) => c.t0 > b.ta);
    const cut = cuts.find((c) => c >= b.ta);
    const beat = Math.min(card ? card.t0 : Infinity, cut ?? Infinity, closing ? closing.t0 + R.closeClear : Infinity);
    const read = b.len > 0 ? 0 : b.ta + noteRead(b.capture);
    b.exitAt = Math.max(Math.min(b.ta + R.bubbleLife, pushed ? pushed.ta : Infinity, Math.max(beat, read)), b.ta + b.len);
  });
  // Where a press of Next lands for each moment (RY13): a little before it begins, and never inside the moment
  // before it, so never inside a memo or a video (RY14).
  const stops: Landing[] = segs.flatMap((s, i) =>
    s.k === 'stop' ? [{ t0: s.t0, land: Math.max(0, s.t0 - R.nextLead, i > 0 && segs[i - 1].k !== 'stop' ? segs[i - 1].t0 : s.t0) }] : [],
  );

  const hops = segs.flatMap((s) => (s.k === 'break' && s.hop && s.from && s.to ? [{ t0: s.t0, t1: s.t1, from: s.from, to: s.to, brk: s.brk }] : []));
  // What stays behind (RC28-RC34): each card's moment, standing on its place and in the stack once the card has landed.
  const kept = cards.map((c) => ({ key: c.capture.id, capture: c.capture, land: c.t1 + R.stackLand, several: hasMore(c.capture), video: c.capture.kind === 'video' }));
  const stood = cards.flatMap((c, i) => (c.from ? [{ key: kept[i].key, capture: c.capture, at: c.from, t: c.t1, several: kept[i].several, video: kept[i].video }] : []));
  // The dim under a card (RC35): one span a stop, from its first card's coming to its last one's going.
  const scrims = segs.flatMap((s) => {
    const own = s.k === 'stop' ? s.slots.filter((sl) => sl.kind === 'photo' || sl.kind === 'video' || sl.kind === 'grid') : [];
    return own.length ? [{ t0: Math.min(...own.map((sl) => sl.t0)), t1: Math.max(...own.map((sl) => sl.t1)) }] : [];
  });
  const plan: RhythmPlan = {
    story, total: t, segs, reduceMotion: opts.reduceMotion, bubbles, cards, whispers: [], lines, lastSeg, stops, hops, camera: null, named: [],
    stood, kept, pictured: new Set(stood.map((x) => x.key)), places: stood.map((x) => x.at), severals: stood.map((x) => x.several), lands: kept.map((x) => x.land),
    bound: stackBound(opts.screen), scrims, still: null, traced: !opts.holdOpen, memo: { pictures: null, stack: null },
  };
  // Through the close the clock is where the walker stopped: it never leaps to when the walk was ended (RC24).
  segs.forEach((s, i) => {
    if (s.k === 'rest' && i > 0) s.clock = whereAt(plan, segs[i - 1], 1).clock;
    if (s.k === 'close' && i > 0) s.clock = (segs[i - 1] as Extract<Seg, { k: 'rest' }>).clock;
  });
  // The whole of what is told, as its screen frames it (RC23, RC24): the view the telling opens from and the view its
  // card uses, each the one fit a map makes of the same bounds in the same room.
  const whole = opts.whole ?? null;
  const open = whole ? fitCamera(opts.screen, whole.bounds, whole.open, whole.maxZoom) : null;
  const close = whole ? fitCamera(opts.screen, whole.bounds, whole.close, whole.maxZoom) : null;
  // With reduce motion the map is not moved from the view the telling opened on: what stands on it is placed by that.
  if (opts.reduceMotion) plan.still = open;
  // The camera, worked out once for this telling on this screen (RC16); with reduce motion the map stays still (RR18).
  if (!opts.reduceMotion && segs.length)
    plan.camera = cameraTrack({ total: t, parts: segs.map((s) => cameraPart(s, open, close)), walker: (ms) => walkerAt(plan, ms) }, opts.screen, (pieces) => cardFoot(opts.screen, pieces));
  // What the last view names (RC25): a walk's passed places, each by the words it was passed with, where it stands;
  // more than two as the one line the card uses (RP19), beside no one place, and so are one or two that cannot each
  // stand clear of the walk's line and the pictures on it (`replay-ceremony ui 14`, the owner's defaults, Nov 20). The
  // view is the one the telling ends on: the card's, or, with reduce motion, where the map stands. A day's names none (0153).
  if (opts.namePassed && story.passes.length) {
    const walked = Object.values(story.paths).flatMap((x) => [...x.drawn, ...x.rideRuns]);
    plan.named = lastNames({
      screen: opts.screen,
      view: opts.reduceMotion ? open : close,
      names: story.passes.map((x) => {
        const path = story.paths[x.pathId];
        return { key: `passed:${x.name}@${x.t}`, text: passedLine([x]) ?? x.name, at: x.at, by: path ? positionAt(path, x.t) : null };
      }),
      line: passedLine(story.passes) ?? '',
      paths: [...walked, ...hops.map((h) => [h.from, h.to])],
      pictures: plan.places,
      stack: kept.length > 0,
    });
  }
  // A passed place whispers as the walker reaches it (RR15): the first segment that reaches its time. More than two
  // on one walk whisper once, as that walk's card says them ("Passed a few places without stopping", RP19, the owner,
  // Nov 9), at the last, when it is true (audit 14); a day bounds each walk by its own card (audit 9).
  const byWalk = new Map<string, typeof story.passes>();
  for (const p of story.passes) byWalk.set(p.pathId, [...(byWalk.get(p.pathId) ?? []), p]);
  const whispered = [...byWalk.values()].flatMap((ps) =>
    ps.length > 2 ? [{ ...ps.reduce((a, b) => (b.t >= a.t ? b : a)), all: ps }] : ps.map((p) => ({ ...p, all: [p] })),
  );
  const said: { all: typeof story.passes; w: RhythmPlan['whispers'][number] }[] = [];
  for (const p of whispered) {
    const i = segs.findIndex((s) => walkEnd(s, story) >= p.t && (s.k !== 'leg' || !s.move || s.move.pathId === p.pathId));
    if (i < 0) continue;
    const s = segs[i];
    // Across a break, once the walker is on the far side (audit 17).
    let tw = s.k === 'break' ? s.t1 : s.t0;
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
    // Where it stands by its place, on a map that is flat and north-up (`replay-ceremony ui 5`): under the place and
    // the line, since pins and pictures stand upward from the line. Only where the way runs down the screen there
    // (more south than east or west) is it over them: behind the walker, who would otherwise walk on into it.
    const path = story.paths[p.pathId];
    const by = (path ? positionAt(path, p.t) : null) ?? walkerAt(plan, tw) ?? p.at;
    const a = path ? positionAt(path, p.t - PASS_RUN_MS) : null;
    const b = path ? positionAt(path, p.t + PASS_RUN_MS) : null;
    const down = !!a && !!b && a[1] - b[1] > Math.abs(b[0] - a[0]) * Math.cos((by[1] * Math.PI) / 180);
    // Where the way runs up or down the screen there, beside the line and not across it (`replay-ceremony ui 13`),
    // by where the camera has the place and the line as it arrives.
    const beside = whisperBeside({ screen: opts.screen, camera: plan.camera ? cameraAt(plan.camera, tw) : null, at: p.at, by, before: a, after: b });
    said.push({ all: p.all, w: { key: `${p.name}@${p.t}`, text: passedLine(p.all) ?? p.name, at: p.at, tw, until: tw + R.whisper, above: down, by, ...(beside != null ? { beside } : {}) } });
  }
  // One at a time (`replay-ceremony ui 12`): places whose whispers would be up together are said as one line, once,
  // where and when the walker reaches the last of them.
  for (const group of whisperGroups(said.map((x) => x.w.tw), R.whisper)) {
    const last = said[group[group.length - 1]].w;
    plan.whispers.push(group.length > 1 ? { ...last, text: passedLine(group.flatMap((k) => said[k].all)) ?? last.text } : last);
  }
  return plan;
}

/**
 * A segment as the camera needs to know it (`camera.ts`): a stretch with the walker's steady pace over the ground, a
 * moment with a card and where its pin is, a hop and its two ends; nothing is asked of the camera for the rest (a
 * stand among them, RC20).
 */
function cameraPart(s: Seg, open: View | null, close: View | null): CameraPart {
  const { t0, t1 } = s;
  if (s.k === 'intro') return { k: 'dive', t0, t1, from: open, hold: s.hold };
  if (s.k === 'close') return { k: 'close', t0, t1, to: close, move: s.tHold - t0 };
  if (s.k === 'leg') {
    const lat = Math.max(Math.abs(s.from?.[1] ?? 0), Math.abs(s.to?.[1] ?? 0));
    return { k: 'leg', t0, t1, speed: s.len / ((t1 - t0) / 1000) / (1 - (s.ra + s.rb) / 2), ra: s.ra, rb: s.rb, lat };
  }
  if (s.k === 'break' && s.hop && s.from && s.to) return { k: 'hop', t0, t1, from: s.from, to: s.to };
  if (s.k === 'stop') {
    // The stop's cards share one place: the pin is settled under the one that reaches lowest.
    // (A moment with videos keeps one picture's room for all it shows in turn, RC37.)
    const cards = s.slots.filter((sl) => sl.kind === 'photo' || sl.kind === 'video' || sl.kind === 'grid');
    const at = s.moment.at ?? s.from;
    if (cards.length && at) return { k: 'card', t0, t1, at, pieces: Math.max(...cards.map((sl) => (sl.videos ? 0 : sl.pieces?.length ?? 0))) };
  }
  return { k: 'hold', t0, t1 };
}

/** Where the walker is at a time into the telling, and the walk's time there. */
function whereAt(plan: RhythmPlan, s: Seg, u: number): { walker: LngLat | null; clock: number; here: number } {
  const { story } = plan;
  switch (s.k) {
    case 'intro':
      return { walker: s.from, clock: s.clock, here: 0 };
    case 'rest':
    case 'close':
      return { walker: s.to, clock: s.clock, here: 0 };
    case 'leg': {
      const e = steady(u, s.ra, s.rb);
      if (!s.move) return { walker: lerpAt(s.from, s.to, e), clock: lerp(s.travel!.t0, s.travel!.t1, e), here: 0 };
      const here = legWalkTime(plan, s, u);
      // The clock rolls with the stretch's time, eased as the walker is: a stand inside it rolls by, never leaps (audit 24).
      return { walker: positionAt(story.paths[s.move.pathId], here) ?? s.from, clock: lerp(s.move.t0, s.move.t1, e), here };
    }
    case 'stop': {
      const clock = lerp(s.moment.arrive, s.moment.leave, u);
      const path = s.moment.pathId && s.moment.onTrace ? story.paths[s.moment.pathId] : null;
      return { walker: (path ? positionAt(path, clock) : null) ?? s.from, clock, here: clock };
    }
    case 'break': {
      // The time does not roll through a break: it is one time, then the other (RC19).
      const late = s.t0 + u * (s.t1 - s.t0) >= s.tSwitch;
      const clock = late ? s.brk.t1 : s.brk.t0;
      // A stand, and any break with reduce motion: the walker is on one side, then the other (RC20, RC22).
      if (!s.hop || plan.reduceMotion) return { walker: late ? s.to : s.from, clock, here: clock };
      // A hop: the walker slides along the straight way across, and the trace picks up when it lands (RC18).
      const m = easeInOut(clamp01((u - R.hopDrawn) / (R.hopLand - R.hopDrawn)));
      return { walker: s.from && s.to ? between(s.from, s.to, m) : (s.to ?? s.from), clock, here: m >= 1 ? s.brk.t1 : s.brk.t0 };
    }
  }
}

/** Where the walker is at a time into the telling: what the camera is worked out from. */
function walkerAt(plan: RhythmPlan, ms: number): LngLat | null {
  const { segs } = plan;
  if (!segs.length) return null;
  const s = segs[findSeg(segs, Math.max(0, ms))];
  return whereAt(plan, s, clamp01((ms - s.t0) / (s.t1 - s.t0 || 1))).walker;
}

/** The walk time a segment reaches by its end. */
function walkEnd(s: Seg, story: Story): number {
  switch (s.k) {
    case 'intro': return story.start;
    // The walk's own end, whatever the clock shows there: a place passed after the last fix is still said.
    case 'rest':
    case 'close': return story.end;
    case 'leg': return s.move ? s.move.t1 : s.travel!.t1;
    case 'stop': return s.moment.leave;
    case 'break': return s.brk.t1;
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

/** How many of a list, in time order, have come by `ms`. */
function countBy<T>(list: T[], when: (x: T) => number, ms: number): number {
  let lo = 0, hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (when(list[mid]) <= ms) lo = mid + 1; else hi = mid;
  }
  return lo;
}
const stoodAt = (x: RhythmPlan['stood'][number]) => x.t;
const landAt = (x: RhythmPlan['kept'][number]) => x.land;

/**
 * The pictures standing on the map (RC34): the first `n` to land, each shown unless a later one stands where it would
 * (`pictures.ts`), at the map's zoom. The same list until the zoom changes or another lands; with no zoom to go by
 * (nothing holds the map and nothing says where it stands) every one is said to stand.
 */
function picturesAt(plan: RhythmPlan, n: number, zoom: number | null): PictureOverlay[] {
  const was = plan.memo.pictures;
  if (was && was.n === n && was.zoom === zoom) return was.out;
  const stands = zoom == null ? null : standing(plan.places, plan.severals, zoom, PICTURE.apart, n);
  const out: PictureOverlay[] = [];
  for (let i = 0; i < n; i++) {
    const x = plan.stood[i];
    out.push({ kind: 'picture', key: x.key, capture: x.capture, at: x.at, shown: stands ? stands[i].shown : true, layered: stands ? stands[i].layered : x.several, video: x.video });
  }
  plan.memo.pictures = { n, zoom, out };
  return out;
}

/** The stack at `ms` (RC29-RC32): the first `n` moments to land, the entries the screen holds, and how each stands. */
function stackAt(plan: RhythmPlan, n: number, ms: number): StackOverlay {
  // Nothing in it moves once the newest has settled: the same overlay until another lands.
  const rest = ms - plan.kept[n - 1].land > R.stackRest;
  const was = plan.memo.stack;
  if (rest && was && was.n === n) return was.out;
  const slots = stackSlots(plan.lands, ms, plan.bound, plan.reduceMotion);
  const out: StackOverlay = {
    kind: 'stack', key: 'stack',
    captures: was && was.n === n ? was.out.captures : plan.kept.slice(0, n).map((x) => x.capture),
    entries: slots.map((s) => {
      const x = plan.kept[s.index];
      return { key: x.key, capture: x.capture, several: x.several, video: x.video, slot: s.slot, rise: s.rise, give: s.give, opacity: s.opacity };
    }),
  };
  if (rest) plan.memo.stack = { n, out };
  return out;
}

export function rhythmFrame(plan: RhythmPlan, ms: number, jump?: Jump | null): Frame {
  const { segs, story } = plan;
  if (ms >= plan.total || !segs.length) {
    const drawn: Record<string, number> = {};
    for (const id of Object.keys(story.paths)) drawn[id] = Infinity;
    return {
      done: true, walker: segs.at(-1)?.to ?? null, walkerFade: 1, wholeTrace: 0, camera: { center: null, zoom: null }, still: null, scrim: 0, drawn, pins: story.captures.map((c) => c.id),
      hops: plan.hops.map((h) => ({ from: h.from, to: h.to, p: 1 })), clock: null, clockFade: 1, line: null, lineOpacity: 0, date: null, dateOpacity: 0, overlays: [],
    };
  }
  const i = findSeg(segs, Math.max(0, ms));
  const s = segs[i];
  const u = clamp01((ms - s.t0) / (s.t1 - s.t0 || 1));
  const still = plan.reduceMotion;
  const { walker, clock, here } = whereAt(plan, s, u);
  // The hops made so far stay; the one being crossed draws from where the trace stops, and is whole at once with
  // reduce motion (RC21, RC22). A break never dims the map (RC17).
  const hops: Hop[] = [];
  for (const h of plan.hops) {
    if (h.t0 > ms) break;
    const p = ms >= h.t1 || still ? 1 : clamp01(((ms - h.t0) / (h.t1 - h.t0) - R.hopDraw) / (R.hopDrawn - R.hopDraw));
    if (p > 0) hops.push({ from: h.from, to: h.to, p });
  }
  // Across a break the clock dissolves from one time to the other (RC19); with reduce motion it changes at once. It
  // comes in as the opening's dive ends (RC23) and is gone as the close begins: the last view shows no figure larger
  // than body text (RC26). It keeps its time under the fade, so a rebuilt telling still finds its place by it.
  const fade = (from: number, over: number) => (still ? (ms >= from + over ? 1 : 0) : clamp01((ms - from) / over));
  const clockFade =
    s.k === 'break' ? (still ? 1 : clamp01(Math.abs(ms - s.tSwitch) / R.clockDissolve))
    : s.k === 'intro' ? fade(s.t0 + s.hold + R.diveClockIn, R.diveClock)
    : s.k === 'close' ? 1 - fade(s.t0, R.closeClock)
    : 1;
  // The opening does not cut (`replay-ceremony ui 7`): the whole trace the first beat left, faint, fades out through
  // the dive, and the walker's dot fades in as the dive ends; each a step with reduce motion.
  const walkerFade = s.k === 'intro' ? fade(s.t0 + s.hold + R.diveMark, R.diveMarkIn) : 1;
  const wholeTrace = s.k === 'intro' && plan.traced ? 1 - fade(s.t0 + s.hold, R.diveTraceOut) : 0;
  // The last view (RC25, RC26): the day walked, and each place passed, come in as the pull-back settles.
  const said = s.k === 'close' ? fade(s.t0 + R.closeSay, R.closeSayIn) : 0;

  // Paths: whole once their last segment is behind; the current one up to the walker.
  const drawn: Record<string, number> = {};
  for (let k = 0; k <= i; k++) {
    const g = segs[k];
    const cur = k === i;
    if (g.k === 'leg' && g.move) drawn[g.move.pathId] = cur ? here : g.move.t1;
    else if (g.k === 'stop' && g.moment.pathId) drawn[g.moment.pathId] = cur ? here : g.moment.leave;
    else if (g.k === 'break') drawn[g.brk.pathId] = cur ? here : g.brk.t1;
  }
  for (const [id, last] of Object.entries(plan.lastSeg)) if (i > last) drawn[id] = Infinity;

  // The map's pins: a moment that stands as its picture is the stage's to draw until the card (RC34).
  const pins: string[] = [];
  for (let k = 0; k <= i; k++) {
    const g = segs[k];
    if (g.k === 'stop' && g.t0 <= ms) for (const sl of g.slots) if (!plan.pictured.has(sl.capture.id)) pins.push(sl.capture.id);
  }

  // Where the camera was worked out to be at this time (RC16); with reduce motion, the map stays put.
  const camera = plan.camera ? cameraAt(plan.camera, ms) : { center: null, zoom: null };
  const overlays: Overlay[] = [];
  // The pictures standing on the map come first: the lowest on the stage, under the dim (RC34, RC35).
  const standingNow = countBy(plan.stood, stoodAt, ms);
  if (standingNow) for (const o of picturesAt(plan, standingNow, camera.zoom ?? plan.still?.zoom ?? null)) overlays.push(o);
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
  for (const c of plan.cards) {
    if (ms >= c.t1 || ms < c.t0) continue;
    const v = ms - c.t0;
    const dur = c.t1 - c.t0;
    // A video on its own plays through its card's hold; a moment's videos each in their turn (RC37).
    const alone = !c.pieces && !c.videos;
    const video = alone && c.capture.kind === 'video';
    let turn = 0;
    let turnIn = 1;
    let playing = video && v >= R.grow && v < dur - R.tuck;
    let progress = video ? clamp01((v - R.grow) / c.len) : 0;
    for (let k = 0; c.videos && k < c.videos.length && ms >= c.videos[k].at - c.videos[k].lead; k++) {
      const x = c.videos[k];
      turn = k + 1;
      turnIn = x.lead > 0 && !still ? clamp01((ms - (x.at - x.lead)) / x.lead) : 1;
      playing = ms >= x.at && ms < x.at + x.len;
      progress = clamp01((ms - x.at) / x.len);
    }
    overlays.push({
      kind: 'card',
      key: c.capture.id,
      capture: c.capture,
      from: c.from,
      grow: clamp01(v / R.grow),
      tuck: clamp01((v - (dur - R.tuck)) / R.tuck),
      ...(c.pieces?.length ? gridFrame(c.pieces, v) : {}),
      ...(alone ? {} : { turn, turnIn }),
      ...(c.faces ? { videos: c.faces } : {}),
      playing,
      progress,
      // A photo held in its card drifts a little closer, so it never looks frozen (RC36).
      drift: alone && c.capture.kind === 'photo' && !still ? R.drift * clamp01(v / dur) : 0,
      fade: still,
    });
  }
  // The stack at the edge: every moment whose card has landed (RC29).
  const inStack = countBy(plan.kept, landAt, ms);
  if (inStack) overlays.push(stackAt(plan, inStack, ms));
  // The map dims under a card, once for a stop (RC35); with reduce motion it does not fade.
  let scrim = 0;
  for (const span of plan.scrims) {
    if (ms < span.t0) break;
    if (ms < span.t1) scrim = R.scrim * (still ? 1 : Math.min(clamp01((ms - span.t0) / R.scrimIn), clamp01((span.t1 - ms) / R.tuck)));
  }
  for (const w of plan.whispers) {
    const age = ms - w.tw;
    if (age < 0 || ms >= w.until) continue;
    if (landed && w.tw > landed.from && w.tw <= landed.at) continue;
    overlays.push({
      kind: 'whisper', key: w.key, text: w.text, at: w.at, opacity: clamp01(Math.min(age / R.whisperIn, (w.until - ms) / R.whisperOut)), above: w.above, by: w.by,
      ...(w.beside != null ? { beside: w.beside } : {}),
    });
  }
  if (s.k === 'close' && ms >= s.t0 + R.closeSay) {
    for (const n of plan.named) overlays.push({ kind: 'passed', key: n.key, text: n.text, at: n.at, opacity: said, above: n.above, by: n.by, ...(n.top != null ? { top: n.top } : {}) });
  }
  const jumped = landed && ms - landed.at < R.jumpLine + plan.whispers.length * R.whisper ? jumpLines(plan, landed).find((l) => ms >= l.t0 && ms < l.t1) : null;
  const line = jumped ?? plan.lines.find((l) => ms >= l.t0 && ms < l.t1) ?? null;
  return {
    done: false,
    // The walker shows as the dive nears its start (RC23): the whole is looked at first. It fades in from there.
    walker: s.k === 'intro' && ms < s.t0 + s.hold + R.diveMark ? null : walker,
    walkerFade,
    wholeTrace,
    camera,
    still: plan.still,
    scrim,
    drawn,
    pins,
    hops,
    clock,
    clockFade,
    line: line?.text ?? null,
    lineOpacity: line ? clamp01(Math.min((ms - line.t0) / 200, (line.t1 - ms) / 300)) : 0,
    date: s.k === 'close' && ms >= s.t0 + R.closeSay ? story.start : null,
    dateOpacity: said,
    overlays,
  };
}

export const rhythm: Ceremony = {
  id: 'rhythm',
  overlays: ['picture', 'bubble', 'card', 'stack', 'whisper', 'passed'],
  show(story, opts) {
    const plan = rhythmPlan(story, opts);
    return { total: plan.total, stops: plan.stops, hops: plan.hops.map((h) => ({ from: h.from, to: h.to, t0: h.brk.t0, t1: h.brk.t1 })), frame: (ms, jump) => rhythmFrame(plan, ms, jump) };
  },
};
