// @layer view
import { notePatch } from './noteEdit';
import { type Faced, faced, facedAll, facedOf } from './moment';
import {
  RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder,
} from 'expo-audio';
import { setAudioMode } from './audioMode';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { applyPatch, captureBus, mergeCaptures, type CapturePatch } from './captureBus';
import { db } from './db';
import { newId } from './id';
import { threads } from './threads';
import { locateOnce } from './locate';
import { memoGate } from './memoGate';
import { rereadTranscript, transcripts } from './transcript';
import { nowPlaying, RECORDING } from './journal/nowPlaying';
import { spareFresh } from './journal/target';
import type { LocateResult } from './locate/types';
import type { CameraWatch } from './editOffer';
import { dropTemp, keepFile, removeMedia, videoLength } from './media';
import { CAMERA_MAX_VIDEO_S, pickedVideoMs } from './mediaEdit';
import { makeThumb } from './media/thumb';
import { discardStep, failedMemo, memoFile, setAside, type SetAsideEvent } from './media/memoSave';
import { isOutOfSpace } from './space/core';
import { unsaved } from './unsaved';
import { folderOf, heldKey, heldWhere, keepInOrder, kindsOf, looseAfterEnd, retryInto, type Unsaved } from './unsaved/core';
import { useStore } from './useStore';
import { space } from './space';
import { captureThumbStillWanted, THUMB } from './thumbPlan';
import { memoJoins, photoMidMemo, stampFor } from './pieceStamp';
import { settleWithin } from './settleWithin';
import type { Capture, CaptureKind, LngLat, Moment } from './types';

/** A fix older than this is not trusted as "where the capture was taken". */
/** A voice memo shorter than this was an accidental tap. */
const MIN_VOICE_MS = 1000;
/** A refused permission. A phone's Settings has a button (`openSettings`); a web page cannot open them, so it says where. */
const accessOff = (what: 'Camera' | 'Microphone') =>
  Platform.OS === 'web'
    ? `${what} access is off for Chronicles. Allow it in your browser’s site settings, then try again.`
    : `${what} access is off for Chronicles.`;

/** How long a stop may take before it is given up on. */
const STOP_TIMEOUT_MS = 3000;
/**
 * How long a stopped memo waits for a photo taken during it that is still being kept, so it joins that photo's moment
 * (T44); past it the memo is kept as a moment of its own (tend walk-screen audit 24).
 */
const PHOTO_JOIN_WAIT_MS = 5000;
/** How long a discarded memo can be brought back on a path whose pill has no Close (`discardStays` off). */
export const UNDO_MS = 5000;

type Busy = CaptureKind | null;

/** `lost`: the memo had no file to keep, so it is said and let go, with no Retry (tend captures 1). */
export type VoiceResult = 'saved' | 'dropped' | 'discarded' | 'failed' | 'lost' | 'none';

/** When a capture was begun and where; a moment outside a walk also has its fix on the way. */
export interface Stamp {
  t: number;
  at: LngLat | null;
  /** The walk it was taken on, null outside one: a Retry from any screen keeps it there (unsaved captures UN4). */
  walk: string | null;
  /** The moment a reply answers, fixed when the capture began, so a swipe meanwhile never moves it (ui-conformance audit 10). */
  replyTo?: { answeredId: string; from?: string | null } | null;
  locating?: Promise<LocateResult>;
  /** The open moment this capture joins as a piece (moment stacks MS3, decision 0123): no fix, no reply. */
  into?: string | null;
  /** The place whose card began it (capture-at-a-place CA2-CA4): the moment it keeps finds that place. Never with `into`. */
  place?: string | null;
}

/**
 * A loose moment is reported twice: 'kept' as soon as it is stored (so lists
 * show it at once), then 'placed' or why it has no place.
 */
export type MomentState = 'kept' | 'placed' | NonNullable<LocateResult['reason']>;

/** The time a capture is begun; only ever called from a tap, never during render. */
const clockNow = () => Date.now();

/**
 * A photo, video or memo to keep: new, or held by the one holder for Retry (SA8; unsaved captures, decision 0196).
 * `path` is set once its file is kept, so a Retry after a failed row write never keeps the file twice (UN12).
 */
// `keepSource`: a held shot reads the picked file, so the keep leaves it in place (tend captures audit 8).
type Keepable = Pick<Unsaved<Stamp>, 'kind' | 'stamp' | 'uri' | 'ext' | 'ms' | 'path'> & { keepSource?: boolean };

interface StoppedMemo {
  uri: string | null;
  stamp: Stamp;
  ms: number;
  /** Shorter than MIN_VOICE_MS while the recorder was running: an accidental tap. */
  short: boolean;
}

/**
 * Photo, voice memo and note capture for the open walk. Each capture is
 * stamped when it is begun (the shutter tap, the start of a memo), and pinned
 * to the current position only when a recent fix exists; otherwise the
 * position is filled from the trace by time when the walk stops.
 *
 * With `loose` and no walk, captures are moments of their own (M1, M2): each
 * asks for one fix when it is begun, and is stored without a place if none
 * good enough comes. Nothing is tracked between moments (M5).
 */
export function useCaptures(
  walkId: string | null,
  here: LngLat | null,
  lastFixAt: number | null,
  onError?: (e: { message: string; openSettings?: boolean }) => void,
  opts: {
    loose?: boolean;
    onMoment?: (c: Faced, state: MomentState, answeredId?: string | null) => void;
    /** Every moment this path keeps answers this one, and joins its thread (OT2); null when it answers nothing. */
    replyTo?: { answeredId: string; from?: string | null } | null;
    /**
     * Told when a capture is kept: a new moment, or a piece added to one (moment stacks, the pill), with the place its
     * stamp was taken for (a place's card, capture-at-a-place CA2-CA4), else null.
     */
    onKept?: (momentId: string, piece: boolean, place: string | null) => void;
    /**
     * This path draws no pill with Retry (the recording bar, Respond, the planner): a failure says where its Retry is
     * instead of "held here" (unsaved captures UN10).
     */
    retryShown?: boolean;
    /** This path's pills are on the screen in front: it says what failed on a screen gone, once (UN9, UN13). */
    sayHeld?: boolean;
    /** The recording bar's shorter words for a failure out of room (the owner, Nov 17; unsaved-captures audit 7). */
    shortWords?: boolean;
    /**
     * This path's discard pill has Undo and Close (T48, decision 0233): a discarded memo stays set aside until Undo,
     * Close, the next capture or the screen going, never a timer. Without it, it goes after UNDO_MS.
     */
    discardStays?: boolean;
  } = {},
) {
  const enabled = walkId != null || !!opts.loose;
  const onMoment = useRef(opts.onMoment);
  useEffect(() => {
    onMoment.current = opts.onMoment;
  }, [opts.onMoment]);
  const onKept = useRef(opts.onKept);
  useEffect(() => {
    onKept.current = opts.onKept;
  }, [opts.onKept]);
  const replyTo = useRef(opts.replyTo ?? null);
  useEffect(() => {
    replyTo.current = opts.replyTo ?? null;
  }, [opts.replyTo]);
  const [captures, setCaptures] = useState<Faced[]>([]);
  const [busy, setBusy] = useState<Busy>(null);
  const [voiceStartedAt, setVoiceStartedAt] = useState<number | null>(null);
  const errorCb = useRef(onError);
  useEffect(() => {
    errorCb.current = onError;
  }, [onError]);
  const setError = (e: { message: string; openSettings?: boolean } | null) => {
    if (e) errorCb.current?.(e);
  };
  const lock = useRef(false); // taps arrive faster than state updates
  const alive = useRef(true); // the screen is still mounted
  const voiceStamp = useRef<Stamp | null>(null);
  /**
   * A photo taken while a memo records, being kept: the moment it lands in, for that memo (by its start time) to join once
   * stopped, if it is not yet joined (T44; tend walk-screen audit 24).
   */
  const photoForMemo = useRef<{ memoT: number; momentId: Promise<string | null> } | null>(null);
  /** The recorder's uri before this memo's prepare: one still the same at its stop is not this memo's (tend captures 1). */
  const memoUriBefore = useRef<string | null>(null);
  const voice = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pos = useRef({ here, lastFixAt });
  useEffect(() => {
    pos.current = { here, lastFixAt };
  }, [here, lastFixAt]);

  // This path's own token: news of its own captures isn't sent back to it.
  const [self] = useState(() => ({}));
  useEffect(() => {
    if (!walkId) return;
    // Another path of this walk (the recording bar's camera, NV9) kept one: shown here too, once,
    // whether it lands before or after the read below.
    const off = captureBus.subscribe(
      walkId,
      self,
      (c) => {
        if (alive.current) setCaptures((prev) => mergeCaptures(prev, [c]));
      },
      // A later change from that path (its thumbnail), sent even once that path is gone (tabs audit 5).
      (id, patch, pieceId) => {
        if (alive.current) setCaptures((prev) => applyPatch(prev, id, patch, pieceId));
      },
    );
    db.getMoments(walkId).then(facedAll).then((stored) => {
      if (alive.current) setCaptures((prev) => mergeCaptures(stored, prev));
    });
    return off;
  }, [walkId, self]);

  const stampNow = (locate = true, into: string | null = null, place: string | null = null): Stamp => {
    // A piece for an open moment takes no fix: the moment's one place is its place (MS3, `pieceStamp`).
    const st = stampFor(clockNow(), pos.current, into, place);
    // The reply is fixed when the capture begins (ui-conformance audit 10); a piece answers nothing.
    const s: Stamp = { t: st.t, at: st.at, walk: walkId, into: st.into, replyTo: st.into ? null : replyTo.current, place: st.place };
    if (locate && st.locate) startLocating(s);
    return s;
  };
  /**
   * Outside a walk there is no trace to place it at stop: ask for one fix (M2).
   * Called after the camera or mic permission is settled, so two system
   * prompts never stack (audit: Android takes one request at a time).
   */
  const startLocating = (s: Stamp) => {
    // In a walk too: while paused the recorder is stopped, so the last fix is where the pause began.
    if (s.at || s.locating || s.into) return;
    // An entry emptied before it was kept left its read behind: the next one begun in the same sitting takes it,
    // so nothing is read twice for one kept entry (chronicle journal JN12).
    const left = spare.current;
    spare.current = null;
    // Aged from when it was read, never from when its entry was emptied (audit 5).
    s.locating = left && spareFresh(left.at, clockNow()) ? left.fix : locateOnce().catch(() => ({ at: null, reason: 'unavailable' as const }));
  };
  /** The location read of the moment begun last, on its way or answered, and the moments an emptied line removed (JN12, JN13). */
  const lastLocate = useRef<{ id: string; fix: Promise<LocateResult>; at: number } | null>(null);
  const dropped = useRef(new Set<string>());
  const spare = useRef<{ fix: Promise<LocateResult>; at: number } | null>(null);
  /** Shown here: a capture of this path's walk (or of none, on a loose path); a held one of another is told on the bus. */
  const ours = (walk: string | null) => walk === walkId;

  /**
   * A piece added to an open moment (moment stacks MS3, MS5): stored with its own time under the moment, whose place
   * and time stay; shown here and told to the walk's other paths as the moment, now with its new piece.
   */
  async function addPiece(into: string, kind: CaptureKind, stamp: Stamp, file_path: string | null, body: string | null, more: Partial<Pick<Capture, 'body_format'>> = {}): Promise<{ momentId: string; pieceId: string } | null> {
    const pieceId = newId();
    const piece: Capture = { id: pieceId, moment_id: into, t: stamp.t, kind, file_path, body, ...more };
    await db.addPiece(into, piece);
    // A capture kept replaces the memo set aside, where its pill stays (T48); one only begun does not (audit 29).
    if (opts.discardStays) asideStep({ type: 'capture' });
    // Stored: what follows never makes it unsaved (unsaved-captures audit 6).
    try {
      const [stored] = await db.getMomentsByIds([into]);
      if (stored) {
        const now = faced(stored);
        if (alive.current && ours(stamp.walk)) setCaptures((prev) => prev.map((x) => (x.id === into ? { ...now, lat: x.lat, lon: x.lon } : x)));
        captureBus.emit(now, self);
        if (!stamp.walk) onMoment.current?.(now, 'kept');
      }
      // The pill opens only on this path's own walk: a held capture of another kept here opens nothing (audit 1).
      if (ours(stamp.walk)) onKept.current?.(into, true, null);
    } catch {
      // The piece is kept; this screen shows it at its next read.
    }
    return { momentId: into, pieceId };
  }

  async function add(kind: CaptureKind, stamp: Stamp, file_path: string | null, body: string | null, more: Partial<Pick<Capture, 'body_format'>> = {}): Promise<string | null> {
    if (!enabled) return null;
    if (stamp.into) return (await addPiece(stamp.into, kind, stamp, file_path, body, more))?.pieceId ?? null;
    // A new moment and its first piece, under one id (decision 0123): its one place and time, the piece's media.
    const id = newId();
    const m: Moment = {
      id, walk_id: stamp.walk, t: stamp.t, lat: stamp.at?.[1] ?? null, lon: stamp.at?.[0] ?? null, segment_id: null,
      pieces: [{ id, moment_id: id, t: stamp.t, kind, file_path, body, ...more }],
    };
    await db.addMoment(m);
    // A capture kept replaces the memo set aside, where its pill stays (T48); one only begun does not (audit 29).
    if (opts.discardStays) asideStep({ type: 'capture' });
    const c = faced(m);
    // Stored: what follows never makes it unsaved (unsaved-captures audit 6).
    try {
      // A reply is linked once it is kept; a failed link leaves the moment kept, unconnected (OT2).
      const answers = stamp.replyTo !== undefined ? stamp.replyTo : replyTo.current;
      if (answers) void threads.reply(c.id, answers.answeredId, answers.from ?? null).catch(() => {});
      // Without a fresh fix, it is stored unplaced (the trace places it at
      // stop), but pinned meanwhile at the last known position.
      const last = pos.current.here;
      const shown = c.lat == null && last ? { ...c, lat: last[1], lon: last[0] } : c;
      if (alive.current && ours(stamp.walk)) setCaptures((prev) => [...prev, shown]);
      // Told even once this path is gone: the walk screen may have come back meanwhile (NV9).
      captureBus.emit(shown, self);
      if (!stamp.walk) onMoment.current?.(c, 'kept');
      // The pill opens only on this path's own walk: a held capture of another kept here opens nothing (audit 1).
      if (ours(stamp.walk)) onKept.current?.(c.id, false, stamp.place ?? null);
      if (stamp.locating) lastLocate.current = { id: c.id, fix: stamp.locating, at: stamp.t };
      placeMoment(c, stamp);
      // The room again after each kept photo, video or memo (SA5); the web's request waits for a calm moment (SA10).
      if (kind !== 'text') void space.afterKept({ recording: stamp.walk != null });
    } catch {
      // The moment is kept; this screen shows it at its next read.
    }
    return c.id;
  }

  /**
   * A moment outside a walk is kept at once and placed when its one fix
   * arrives (M2), so a save never waits on GPS. No fix: it stays unplaced.
   */
  function placeMoment(c: Faced, stamp: Stamp) {
    // In a walk, no fix leaves it for the trace to place at stop; nothing is reported.
    const report = (x: Faced, state: MomentState) => {
      if (!stamp.walk) onMoment.current?.(x, state);
    };
    if (c.lat != null || !stamp.locating) {
      report(c, c.lat != null ? 'placed' : 'unavailable');
      return;
    }
    stamp.locating
      .then(async (r) => {
        // Emptied meanwhile (JN13): nothing is left to place.
        if (dropped.current.has(c.id)) return;
        if (!r.at) {
          report(c, r.reason ?? 'timeout');
          return;
        }
        const placed = { ...c, lon: r.at[0], lat: r.at[1] };
        await db.updateMoment(c.id, { lon: placed.lon, lat: placed.lat });
        if (alive.current && ours(stamp.walk)) setCaptures((prev) => prev.map((x) => (x.id === c.id ? placed : x)));
        // The pin shown at the last position elsewhere moves too (NV9).
        if (stamp.walk) captureBus.patch(stamp.walk, c.id, { lon: placed.lon, lat: placed.lat }, self);
        report(placed, 'placed');
      })
      .catch(() => report(c, 'unavailable'));
  }

  async function guarded(kind: CaptureKind, fn: () => Promise<void>) {
    if (lock.current || !enabled) return false;
    lock.current = true;
    setBusy(kind);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      lock.current = false;
      // Only its own kind: a memo's Save tapped while the photo was being kept stays held (tend walk-screen audit 24).
      setBusy((b) => (b === kind ? null : b));
    }
  }

  /** Where this path's failures say their Retry is (SA9; UN10). */
  const retryShown = opts.retryShown !== false;
  /** This path is in front: mounted, and its screen in front when it says so (`sayHeld`; unsaved-captures audit 5). */
  const sayHeldNow = useRef(opts.sayHeld);
  useEffect(() => {
    sayHeldNow.current = opts.sayHeld;
  }, [opts.sayHeld]);
  const inFront = () => alive.current && sayHeldNow.current !== false;
  const where = () => (retryShown ? 'here' : walkId ? 'walk' : 'memories') as 'here' | 'walk' | 'memories';

  /**
   * Keeps a capture's file, then its row (with `into`, as a piece of that open moment, or as a moment of its own when
   * that moment is gone: UN11); on a failure, the kept path as far as it got and why. Never throws. Kept, it says the
   * `into` it used, so what names the moment names the one it is in (fix note-camera-photo audit 1).
   */
  async function keepCapture(k: Keepable): Promise<{ id: string | null; into: string | null } | { path: string | null; error: unknown }> {
    let stamp = k.stamp;
    const r = await keepInOrder(k, {
      keepFile: async (uri) => {
        if (stamp.into) {
          const [m] = await db.getMomentsByIds([stamp.into]);
          if (retryInto(stamp.into, !!m) !== stamp.into) stamp = { ...stamp, into: null };
        }
        return keepFile(uri, folderOf(stamp.walk), `${newId()}.${k.ext}`, { keepSource: !!k.keepSource });
      },
      write: async (path) => {
        if (k.path && stamp.into) {
          const [m] = await db.getMomentsByIds([stamp.into]);
          if (retryInto(stamp.into, !!m) !== stamp.into) stamp = { ...stamp, into: null };
        }
        // With `into`, the id is the new piece's in that open moment (MS3).
        return add(k.kind, stamp, path, k.ms == null ? null : String(Math.round(k.ms)));
      },
      after: (id, path) => {
        if (id && (k.kind === 'photo' || k.kind === 'video')) thumbFor(id, k.kind, path, stamp.into ?? id, stamp.walk);
        // A memo's words are read in the background, when the phone can; it is already kept and never waits (TX1).
        const body = k.ms == null ? null : String(Math.round(k.ms));
        if (id && k.kind === 'voice') void transcripts.enqueue({ id, moment_id: stamp.into ?? id, t: stamp.t, file_path: path, body, edit: null }).catch(() => {});
      },
    });
    return 'error' in r ? r : { ...r, into: stamp.into ?? null };
  }

  /**
   * A capture whose save failed goes to the one holder, which outlives this screen (UN1), said in words, never the raw
   * error (SA9): here, or where its Retry is from a path with none (UN10). Said here only on a path in front.
   */
  function holdFailed(k: Keepable, path: string | null, error: unknown) {
    const outOfSpace = isOutOfSpace(error);
    // Its walk ended meanwhile: held as a moment of its own (the owner, Nov 17; unsaved-captures audit 3).
    const stamp = k.stamp.walk && unsaved.hasEnded(k.stamp.walk) ? looseAfterEnd(k.stamp) : k.stamp;
    // Said here only when this path's pill is in front; otherwise by the next screen in front (UN9; audit 5).
    unsaved.hold<Stamp>({ kind: k.kind, walkId: stamp.walk, stamp, uri: k.uri, ext: k.ext, ms: k.ms, path, outOfSpace, said: inFront() && retryShown });
    setError({ message: heldWhere(k.kind, outOfSpace, where(), !!opts.shortWords) });
  }

  /**
   * Keeps a new shot, or holds it with why in words (SA8, SA9). `released`: a held shot's file was copied before its row
   * failed, so the holder retries from the copy and the picked one is the editor's to let go (tend captures audit 8).
   */
  async function keepOrHold(k: Keepable & { kind: 'photo' | 'video' }, released?: () => void): Promise<{ kind: 'photo' | 'video'; id: string; momentId: string } | null> {
    const r = await keepCapture(k);
    if ('error' in r) {
      if (k.keepSource && r.path) released?.();
      holdFailed(k.keepSource && r.path ? { ...k, uri: null } : k, r.path, r.error);
      return null;
    }
    return r.id ? { kind: k.kind, id: r.id, momentId: r.into ?? r.id } : null;
  }

  /** Retry: each held capture of the pill, from every screen, kept in the order taken into its own walk (UN3, UN4). */
  function retryTaken(which: 'shots' | 'memos'): Promise<VoiceResult> {
    const run = retryNow(which);
    // Both Stops wait for it before they read or let go (unsaved-captures audit 2).
    unsaved.track(run);
    return run;
  }
  async function retryNow(which: 'shots' | 'memos'): Promise<VoiceResult> {
    const taken = unsaved.take(which) as Unsaved<Stamp>[];
    let last: { kind: Unsaved['kind']; error: unknown } | null = null;
    for (const e of taken) {
      const r = await keepCapture(e);
      if ('error' in r) {
        unsaved.settle(e.id, { kept: false, path: r.path, outOfSpace: isOutOfSpace(r.error) });
        last = { kind: e.kind, error: r.error };
      } else unsaved.settle(e.id, { kept: true });
    }
    if (last) setError({ message: heldWhere(last.kind, isOutOfSpace(last.error), 'here') });
    return !taken.length ? 'none' : last ? 'failed' : 'saved';
  }

  /** What the holder holds, every screen's, as a key of its kinds: the pills and the counts in words (UN2). */
  const heldKinds = kindsOf(useStore(unsaved.store, (st) => heldKey(st.list)));
  const heldShots = heldKinds.filter((k): k is 'photo' | 'video' => k !== 'voice');
  const memosHeld = heldKinds.length - heldShots.length;

  const retryHeld = () => guarded(heldShots[0] ?? 'photo', async () => void (await retryTaken('shots')));

  /**
   * A new photo's small copy, or a new video's still (TH1, VS1), after the capture is kept: never holds it up or fails
   * it (TH2). The copy is the piece's (`id`); the moment it sits in (`momentId`) is read fresh, and shows it when it is
   * its face.
   */
  function thumbFor(id: string, kind: 'photo' | 'video', path: string, momentId: string, walk: string | null) {
    void makeThumb(facedOf({ id, walk_id: folderOf(walk), t: Date.now(), lat: null, lon: null, kind, file_path: path, body: null, segment_id: null })).then((thumb) => {
      if (!thumb) return;
      // An Edit offer's Done may have stored the edited copy meanwhile: this one then stands down (media-editing audit 8).
      void db.getMomentsByIds([momentId]).then(([m]) => {
        const row = m?.pieces.find((x) => x.id === id) ?? null;
        if (!captureThumbStillWanted(row)) {
          if (thumb !== THUMB.none) void removeMedia([thumb]).catch(() => {});
          return;
        }
        const isFace = !!m && faced(m).piece_id === id;
        if (isFace && alive.current && ours(walk)) setCaptures((prev) => prev.map((x) => (x.id === m.id ? { ...x, thumb_path: thumb } : x)));
        // Stored first, then told: a walk screen mounting meanwhile either reads it or hears it (tabs audit 5).
        void db.updatePiece(id, { thumb_path: thumb }).then(
          () => {
            if (isFace) captureBus.patch(walk, m.id, { thumb_path: thumb }, self);
          },
          () => {},
        );
      }, () => {});
    });
  }

  /**
   * The system camera, in photo or video mode as the person picks there. Resolves what was kept, if anything. With
   * `into`, what it keeps joins that open moment as a piece (MS2, MS3); `id` is then the piece's. With `place`, begun
   * from a place's card, the moment it keeps finds that place (capture-at-a-place CA2). With `camera`, the screen's
   * editor is told the shot the moment the camera returns and how its keep went, so it holds the shot full screen
   * meanwhile (tend captures T62); the keep itself is the same. With `shot.alone` (a note page's own camera) the shot is
   * a moment of its own even while a memo records: never a piece of the memo's moment, which the memo never joins
   * either (NP14; fix note-camera-photo audit 1).
   */
  const takePhoto = async (into: string | null = null, place: string | null = null, camera?: CameraWatch, shot?: { alone?: boolean }): Promise<{ kind: 'photo' | 'video'; id: string; momentId: string } | null> => {
    let kept: { kind: 'photo' | 'video'; id: string; momentId: string } | null = null;
    // Told before the keep, and after it in the same turn as the screen's own answer (T62). A shot the screen holds reads
    // the picked file until it leaves the view: the keep leaves the file in place, and the editor lets it go once it is
    // kept (tend captures audit 8).
    const keepWatched = async (k: Keepable & { kind: 'photo' | 'video'; uri: string }) => {
      const seen = camera?.shot({ kind: k.kind, uri: k.uri });
      // A clip whose length the picker could not read (a WebM with none in its header) is measured now, its shot already
      // held, so its stored length is its own (tend captures audit 18); none (0) if it cannot be.
      if (k.kind === 'video' && !k.ms) k = { ...k, ms: await videoLength(k.uri).catch(() => 0) };
      let released = false;
      const r = await keepOrHold({ ...k, keepSource: !!seen?.holds }, () => {
        released = true;
      }).catch((e: unknown) => {
        if (seen) camera?.kept(seen.turn, null, false);
        throw e;
      });
      if (seen) camera?.kept(seen.turn, r, !!r || released);
      return r;
    };
    await guarded('photo', async () => {
      // While a memo records, the photo goes with it (T44, decision 0233): into the memo's moment, or kept as the
      // moment the memo joins when saved. A photo only: a video would want the microphone the memo holds.
      const recording = voiceOn.current ? voiceStamp.current : null;
      const memo = shot?.alone ? null : recording;
      const to = photoMidMemo(memo, into, place);
      const stamp = stampNow(false, to.into, to.place);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        // The request above already showed the system prompt if it could; a refusal now is only fixable in Settings.
        // (`canAskAgain` is not trusted: iOS can report true after a denial, which left no way to recover.)
        setError({ message: accessOff('Camera'), openSettings: true });
        return;
      }
      startLocating(stamp);
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: recording ? ['images'] : ['images', 'videos'],
        quality: 0.8,
        // The phones' camera's own cap (decision 0003); the web's camera has none, and keeps a clip whole (T43, 0233).
        videoMaxDuration: CAMERA_MAX_VIDEO_S,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });
      if (res.canceled || !res.assets[0]) return;
      const asset = res.assets[0];
      // From here the file is being kept: Stop from the recording bar waits for it (capture-from-chronicle audit 6).
      const keeping = (async () => {
        if (asset.type === 'video') {
          // Kept whole, whatever its length (tend captures T43, decision 0233): browsers cannot cap a recording, and the
          // moment arrives as it was taken, through the same held shot and editor as any video (0263).
          const ms = pickedVideoMs(asset.duration, Platform.OS === 'web');
          const ext = asset.mimeType?.split('/')[1]?.replace('quicktime', 'mov') ?? 'mp4';
          kept = await keepWatched({ kind: 'video', stamp, uri: asset.uri, ext, ms, path: null });
          return;
        }
        const ext = asset.mimeType?.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
        kept = await keepWatched({ kind: 'photo', stamp, uri: asset.uri, ext, ms: null, path: null });
        // Kept while the same memo still records: the memo is saved into the photo's moment (T44).
        const k = kept as { momentId: string } | null;
        if (k && memo && voiceOn.current && voiceStamp.current === memo) voiceStamp.current = memoJoins(memo, k.momentId);
      })();
      memoGate.keep(keeping, stamp.walk);
      // A memo stopped meanwhile waits for this photo before it is kept, so it is never saved apart from it (T44, audit 24).
      if (memo) photoForMemo.current = { memoT: memo.t, momentId: keeping.then(() => (kept as { momentId: string } | null)?.momentId ?? null, () => null) };
      await keeping;
    });
    return kept;
  };

  // Voice memo actions run one after another on this queue, so a tap on
  // Save, Discard or Stop never interleaves with a start or another save.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const voiceOn = useRef(false);
  const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(fn, fn);
    queue.current = run.catch(() => {});
    return run;
  };
  /** A walk never starts while this memo is stopping and saving (tabs audit 3). */
  const trackMemo = <T,>(p: Promise<T>): Promise<T> => {
    memoGate.track(p, self, walkId);
    return p;
  };
  const withBusy = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy('voice');
    try {
      return await fn();
    } finally {
      if (alive.current) setBusy((b) => (b === 'voice' ? null : b));
    }
  };

  /** A memo just discarded, set aside so the discard can be undone (`setAside`); the ref is the truth, the state draws the pill. */
  const [discarded, setDiscarded] = useState<StoppedMemo | null>(null);
  const setAsideRef = useRef<StoppedMemo | null>(null);
  const discardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** One step of the memo set aside: lets go of the one it drops, and returns the one to keep. */
  const asideStep = (e: SetAsideEvent<StoppedMemo>): StoppedMemo | null => {
    // Taken once the screen has gone (a discard queued as it went), the memo is let go at once (audit 32).
    const r = setAside(setAsideRef.current, e, !alive.current);
    setAsideRef.current = r.held;
    if (r.letGo) dropTemp(r.letGo.uri);
    if (alive.current) setDiscarded(r.held);
    return r.keep;
  };

  const resetAudioMode = () =>
    setAudioMode({ allowsRecording: false, playsInSilentMode: true, allowsBackgroundRecording: false }).catch(() => {});

  /** With `into`, the memo joins that open moment as a piece when saved (MS2, MS3). */
  const startVoice = (into: string | null = null, place: string | null = null): Promise<boolean> =>
    enqueue(() =>
      withBusy(async () => {
        if (!enabled || voiceOn.current) return false;
        try {
          // On the web expo-audio's permission request folds every getUserMedia failure into "denied" (a microphone
          // another app or tab holds reads as refused although the site is allowed) and opens the microphone a second
          // time; prepareToRecordAsync below asks too and throws the browser's own error, which the catch tells apart.
          const perm = Platform.OS === 'web' ? null : await requestRecordingPermissionsAsync();
          if (perm && !perm.granted) {
            // The request above already showed the system prompt if it could; a refusal now is only fixable in Settings.
            // (`canAskAgain` is not trusted: iOS can report true after a denial, which left no way to recover.)
            setError({ message: accessOff('Microphone'), openSettings: true });
            return false;
          }
          // Nothing plays over a recording: a voice note playing on the journal's page lets go of the sound.
          nowPlaying.claim(RECORDING);
          // Keeps recording with the phone locked and in a pocket.
          await setAudioMode({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
          memoUriBefore.current = voice.uri;
          await voice.prepareToRecordAsync();
          if (!alive.current) {
            // The screen went away while preparing: never leave the mic on.
            await resetAudioMode();
            return false;
          }
          voiceStamp.current = stampNow(true, into, place);
          voice.record();
          // A memo recording replaces the one set aside (T48; audit 29: once it records, not as it is asked for).
          if (opts.discardStays) asideStep({ type: 'capture' });
          voiceOn.current = true;
          memoGate.recording(self, true);
          setVoiceStartedAt(voiceStamp.current.t);
          return true;
        } catch (e) {
          await resetAudioMode();
          const name = e instanceof Error ? e.name : '';
          if (Platform.OS === 'web' && (name === 'NotAllowedError' || name === 'SecurityError')) {
            setError({ message: accessOff('Microphone'), openSettings: true });
          } else if (Platform.OS === 'web' && name) {
            // Allowed, but the browser could not open it: say what it said (busy, none found) rather than "off".
            setError({ message: `The microphone could not start (${name}${e instanceof Error && e.message ? `: ${e.message}` : ''}).` });
          } else {
            setError({ message: e instanceof Error ? e.message : String(e) });
          }
          return false;
        }
      }),
    );

  /**
   * Stops the recorder and returns what it recorded. Never hangs: a recorder
   * that already stopped by itself (mic unplugged, capture ended by the
   * browser) is not stopped again, and a stop that does not answer gives up.
   */
  async function stopRecorder(): Promise<StoppedMemo> {
    const stamp = voiceStamp.current ?? stampNow();
    const wallMs = Date.now() - stamp.t;
    const status = voice.getStatus();
    const wasRecording = voice.isRecording;
    if (wasRecording) {
      await Promise.race([voice.stop(), new Promise((r) => setTimeout(r, STOP_TIMEOUT_MS))]).catch(() => {});
    }
    voiceOn.current = false;
    memoGate.recording(self, false);
    if (alive.current) setVoiceStartedAt(null);
    await resetAudioMode();
    // The recorder's own duration is 0 once it has stopped; the wall clock is not.
    const ms = status.durationMillis > 0 ? status.durationMillis : wallMs;
    // A stop given up on leaves the web's uri unset, or still the last memo's: no file of this memo's (tend captures 1).
    return { uri: memoFile(memoUriBefore.current, voice.uri), stamp, ms, short: wasRecording && wallMs < MIN_VOICE_MS };
  }

  /** A stopped memo, as the holder and `keepCapture` take it. Native records AAC in .m4a; on web the extension is only part of the key. */
  const memoKeepable = (m: StoppedMemo): Keepable => ({
    kind: 'voice', stamp: m.stamp, uri: m.uri, ms: m.ms, path: null,
    ext: (m.uri && /\.(\w{2,4})$/.exec(m.uri.split('?')[0])?.[1]) ?? (m.uri?.startsWith('blob:') ? 'webm' : 'm4a'),
  });

  /**
   * Keeps a stopped memo, or, when its save fails, holds it with the one holder for Retry when it has a file to retry
   * with (SA8, tend captures 1). With none it is said and let go: here, or, lost as its screen went, by the next
   * screen in front (UN13).
   */
  async function keepMemo(stopped: StoppedMemo): Promise<VoiceResult> {
    // Stopped at the tap; a photo taken during it and still being kept is waited for, a bounded while, so the memo joins
    // its moment (T44; tend walk-screen audit 24). Past the wait it is kept on its own.
    let m = stopped;
    const photo = photoForMemo.current;
    if (photo && photo.memoT === m.stamp.t && !m.stamp.into) {
      let into: string | null = null;
      await settleWithin(photo.momentId.then((id) => { into = id; }), PHOTO_JOIN_WAIT_MS);
      if (into) m = { ...m, stamp: memoJoins(m.stamp, into) };
    }
    const k = memoKeepable(m);
    const r = m.uri ? await keepCapture(k) : { path: null, error: null };
    if (!('error' in r)) return 'saved';
    const plan = failedMemo({ file: m.uri, outOfSpace: isOutOfSpace(r.error) });
    if (plan.hold === 'here') {
      holdFailed(k, r.path, r.error);
      return plan.result;
    }
    // Lost with this path out of front (gone, or a tab changed): said by the next screen in front (UN13; audit 5).
    if (!inFront()) unsaved.lost(m.stamp.walk, plan.line);
    setError({ message: plan.line });
    return plan.result;
  }

  /**
   * Stops and saves the memo in progress, waiting for any voice action in
   * flight first. A memo under MIN_VOICE_MS was an accidental tap and is
   * dropped. A memo that fails to save is kept for retrySave, when it has a file to retry with.
   */
  const finishVoice = (): Promise<VoiceResult> =>
    trackMemo(enqueue(() =>
      withBusy(async () => {
        if (!voiceOn.current) return 'none';
        const m = await stopRecorder();
        if (m.short) {
          dropTemp(m.uri);
          return 'dropped';
        }
        return keepMemo(m);
      }),
    ));

  /** Retries every memo held, from every screen (UN3). */
  const retrySave = (): Promise<VoiceResult> => enqueue(() => withBusy(() => retryTaken('memos')));

  const forgetDiscarded = () => {
    if (discardTimer.current) clearTimeout(discardTimer.current);
    discardTimer.current = null;
  };

  /**
   * Stops the memo in progress and sets it aside, replacing one set aside before. Where the pill stays (T48) it waits
   * for Undo, Close, the next capture or the screen going; elsewhere it is let go after UNDO_MS unless undone.
   */
  const discardVoice = (): Promise<VoiceResult> =>
    trackMemo(enqueue(() =>
      withBusy(async () => {
        if (!voiceOn.current) return 'none';
        const m = await stopRecorder();
        forgetDiscarded();
        // Set aside for Undo, unless it has no file to bring back (audit 34).
        asideStep(discardStep(m));
        if (!opts.discardStays) discardTimer.current = setTimeout(() => {
          if (setAsideRef.current === m) asideStep({ type: 'close' });
        }, UNDO_MS);
        return 'discarded';
      }),
    ));

  /** Brings back the memo just discarded, and saves it; a Stop waits for that save as for any (tend tabs audit 41). */
  const undoDiscard = (): Promise<VoiceResult> =>
    trackMemo(enqueue(() =>
      withBusy(async () => {
        forgetDiscarded();
        const m = asideStep({ type: 'undo' });
        if (!m) return 'none';
        return keepMemo(m);
      }),
    ));

  /** Close on the pill: the memo set aside stays discarded, its file let go now (T48). */
  const closeDiscard = (): Promise<VoiceResult> =>
    enqueue(async (): Promise<VoiceResult> => {
      forgetDiscarded();
      asideStep({ type: 'close' });
      return 'none';
    });

  // Leaving the screen mid-memo (browser Back, a reload) saves it rather than
  // losing it or leaving the mic on.
  const finishRef = useRef(finishVoice);
  useEffect(() => {
    finishRef.current = finishVoice;
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (voiceOn.current) finishRef.current().catch(() => {});
      // A memo set aside is let go as its screen goes, never left behind (T48; docs/DEFERRED.md, Recording bar captures).
      if (discardTimer.current) clearTimeout(discardTimer.current);
      const gone = setAside(setAsideRef.current, { type: 'leave' }).letGo;
      setAsideRef.current = null;
      if (gone) dropTemp(gone.uri);
    };
  }, []);
  // A capture held on a screen gone, or on one with no Retry, says why here, once, as this screen in front shows its
  // pill (UN9); a memo lost as its screen went is said here too (UN13).
  const sayHeld = !!opts.sayHeld && enabled;
  useEffect(() => {
    if (!sayHeld) return;
    // Taken in one change, so each is said once (unsaved-captures audit 8).
    const say = () => {
      for (const e of unsaved.takeUnsaid()) setError({ message: heldWhere(e.kind, e.outOfSpace, 'here') });
      for (const l of unsaved.takeLost()) setError({ message: l.line });
    };
    say();
    return unsaved.store.subscribe(say);
  }, [sayHeld]);

  /**
   * A photo's or video's edits and caption, or its new small copy (ME21):
   * stored, shown here, then sent on the bus so the walk's other views show it.
   */
  async function setEdit(c: Pick<Faced, 'id' | 'piece_id'>, patch: CapturePatch) {
    const id = c.id;
    // The edit is the piece's own; the screens show it on the moment (decision 0123).
    await db.updatePiece(c.piece_id, patch);
    if (alive.current) setCaptures((prev) => applyPatch(prev, id, patch, c.piece_id));
    captureBus.patch(walkId, id, patch, self, c.piece_id);
    // A trim changed or reverted: the memo's words are for another span now, so they are read again (audit 4).
    if ('edit' in patch) void rereadTranscript(id, c.piece_id).catch(() => {});
  }

  /**
   * A note's new text (QL25): stored, shown here, then sent on the bus so the
   * walk's other views (the walk screen, Navigate's live walk) show it too.
   * Its find and reminder hang on its id, so they stay.
   */
  async function setNote(c: Pick<Faced, 'id' | 'piece_id'>, body: string) {
    const id = c.id;
    const change = notePatch(body);
    await db.updatePiece(c.piece_id, change);
    // Named by its piece: a note at a non-face piece lands on that piece's copy, never on the moment's face (note-types audit 1, 12, 13).
    if (alive.current) setCaptures((prev) => applyPatch(prev, id, change, c.piece_id));
    captureBus.patch(walkId, id, change, self, c.piece_id);
  }

  /** With `into`, the note joins that open moment as a piece (MS2, MS3). */
  const saveNote = (text: string, into: string | null = null) =>
    guarded('text', async () => {
      if (text.trim()) await add('text', stampNow(true, into), null, text.trim());
    });

  /**
   * A note's page opens (NP1): its time, its one fix and what it answers are taken at the tap, however long the
   * first words take (the steward's S9). `keepNote` keeps it, as Markdown, once it has words (NP9). With `place`, begun
   * from a place's card, the note kept finds that place (capture-at-a-place CA4).
   */
  const beginNote = (into: string | null = null, place: string | null = null): Stamp => stampNow(true, into, place);
  async function keepNote(stamp: Stamp, body: string): Promise<{ id: string; piece_id: string } | null> {
    const pieceId = await add('text', stamp, null, body, { body_format: 'md' });
    if (!pieceId) return null;
    return { id: stamp.into ?? pieceId, piece_id: pieceId };
  }

  /**
   * The journal's open line (chronicle journal JN12, JN13): the first character stores a note at once, as a new
   * moment or, with `into`, as a piece of the open one, and says which, so what is typed after can be written to it.
   */
  const beginLine = async (body: string, into: string | null = null): Promise<{ momentId: string; pieceId: string } | null> => {
    if (!enabled) return null;
    // On a walk no fix is read for an entry (JN12; audit 4): the walk's last fix or, at Stop, its trace places it.
    const stamp = stampNow(walkId == null, into);
    if (stamp.into) return addPiece(stamp.into, 'text', stamp, null, body);
    const id = await add('text', stamp, null, body);
    return id ? { momentId: id, pieceId: id } : null;
  };

  /** What the line holds now, written to its piece; the moment's face follows only when the piece is its face. */
  const writeLine = async (e: { momentId: string; pieceId: string }, body: string) => {
    await db.updatePiece(e.pieceId, { body });
    if (e.pieceId !== e.momentId) return;
    if (alive.current) setCaptures((prev) => applyPatch(prev, e.momentId, { body }));
    captureBus.patch(walkId, e.momentId, { body }, self);
  };

  /**
   * An entry emptied of its words is not kept (JN13): its piece goes, and the moment with it when it held nothing
   * else. Says whether the moment went, and leaves its location read for the next entry of the sitting (JN12).
   */
  const dropLine = async (e: { momentId: string; pieceId: string }): Promise<'moment' | 'piece'> => {
    const [stored] = await db.getMomentsByIds([e.momentId]);
    if (stored && stored.pieces.some((x) => x.id !== e.pieceId)) {
      await db.deletePieces([e.pieceId]);
      const [now] = await db.getMomentsByIds([e.momentId]);
      if (now && alive.current) setCaptures((prev) => prev.map((x) => (x.id === e.momentId ? { ...faced(now), lat: x.lat, lon: x.lon } : x)));
      return 'piece';
    }
    dropped.current.add(e.momentId);
    // Its read, answered or not, serves the next entry of the sitting: the place is where the writing began.
    if (lastLocate.current?.id === e.momentId) spare.current = { fix: lastLocate.current.fix, at: lastLocate.current.at };
    await db.deleteMoments([e.momentId]);
    if (alive.current) setCaptures((prev) => prev.filter((x) => x.id !== e.momentId));
    return 'moment';
  };

  return {
    beginLine,
    writeLine,
    dropLine,
    captures,
    busy,
    voiceStartedAt,
    takePhoto,
    startVoice,
    finishVoice,
    discardVoice,
    undoDiscard,
    closeDiscard,
    discarded: discarded != null,
    retrySave,
    /** Memos held for Retry, from every screen (UN2). */
    unsaved: memosHeld > 0,
    memosHeld,
    /** Photos and videos held for Retry, from every screen, by kind, in the order taken (SA8, UN2). */
    held: heldShots,
    retryHeld,
    saveNote,
    beginNote,
    keepNote,
    setEdit,
    setNote,
  };
}
