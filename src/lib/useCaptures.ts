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
import { spareFresh } from './journal/target';
import type { LocateResult } from './locate/types';
import { dropTemp, keepFile, removeMedia } from './media';
import { makeThumb } from './media/thumb';
import { isOutOfSpace, saveFailLine } from './space/core';
import { space } from './space';
import { captureThumbStillWanted, THUMB } from './thumbPlan';
import { stampFor } from './pieceStamp';
import type { Capture, CaptureKind, LngLat, Moment } from './types';

/** A fix older than this is not trusted as "where the capture was taken". */
/** A voice memo shorter than this was an accidental tap. */
const MIN_VOICE_MS = 1000;
/**
 * Longest video. A minute of phone video is 50 to 150 MB; the web gets less,
 * since a browser's storage is smaller and can be cleared.
 */
/** A refused permission. A phone's Settings has a button (`openSettings`); a web page cannot open them, so it says where. */
const accessOff = (what: 'Camera' | 'Microphone') =>
  Platform.OS === 'web'
    ? `${what} access is off for Chronicles. Allow it in your browser’s site settings, then try again.`
    : `${what} access is off for Chronicles.`;
const MAX_VIDEO_S = Platform.OS === 'web' ? 15 : 30;

/** How long a stop may take before it is given up on. */
const STOP_TIMEOUT_MS = 3000;
/** How long a discarded memo can be brought back. */
export const UNDO_MS = 5000;

type Busy = CaptureKind | null;

export type VoiceResult = 'saved' | 'dropped' | 'discarded' | 'failed' | 'none';

/** When a capture was begun and where; a moment outside a walk also has its fix on the way. */
export interface Stamp {
  t: number;
  at: LngLat | null;
  /** The moment a reply answers, fixed when the capture began, so a swipe meanwhile never moves it (ui-conformance audit 10). */
  replyTo?: { answeredId: string; from?: string | null } | null;
  locating?: Promise<LocateResult>;
  /** The open moment this capture joins as a piece (moment stacks MS3, decision 0123): no fix, no reply. */
  into?: string | null;
}

/**
 * A loose moment is reported twice: 'kept' as soon as it is stored (so lists
 * show it at once), then 'placed' or why it has no place.
 */
export type MomentState = 'kept' | 'placed' | NonNullable<LocateResult['reason']>;

/** The time a capture is begun; only ever called from a tap, never during render. */
const clockNow = () => Date.now();

/** Folder for the media of moments made outside any walk. */
const LOOSE_FOLDER = 'moments';

/**
 * A photo or video whose save failed, held for Retry with the time and place it was taken (SA8). `path`
 * is set once its file is kept, so a Retry after a failed row write doesn't move the file twice.
 */
interface HeldShot {
  kind: 'photo' | 'video';
  stamp: Stamp;
  uri: string;
  ext: string;
  /** A video's length in ms, its capture's body. */
  ms: number | null;
  path: string | null;
}

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
    /** Told when a capture is kept: a new moment, or a piece added to one (moment stacks, the pill). */
    onKept?: (momentId: string, piece: boolean) => void;
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

  const stampNow = (locate = true, into: string | null = null): Stamp => {
    // A piece for an open moment takes no fix: the moment's one place is its place (MS3, `pieceStamp`).
    const st = stampFor(clockNow(), pos.current, into);
    // The reply is fixed when the capture begins (ui-conformance audit 10); a piece answers nothing.
    const s: Stamp = { t: st.t, at: st.at, into: st.into, replyTo: st.into ? null : replyTo.current };
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
  const folder = () => walkId ?? LOOSE_FOLDER;

  /**
   * A piece added to an open moment (moment stacks MS3, MS5): stored with its own time under the moment, whose place
   * and time stay; shown here and told to the walk's other paths as the moment, now with its new piece.
   */
  async function addPiece(into: string, kind: CaptureKind, stamp: Stamp, file_path: string | null, body: string | null, more: Partial<Pick<Capture, 'body_format'>> = {}): Promise<{ momentId: string; pieceId: string } | null> {
    const pieceId = newId();
    const piece: Capture = { id: pieceId, moment_id: into, t: stamp.t, kind, file_path, body, ...more };
    await db.addPiece(into, piece);
    const [stored] = await db.getMomentsByIds([into]);
    if (stored) {
      const now = faced(stored);
      if (alive.current) setCaptures((prev) => prev.map((x) => (x.id === into ? { ...now, lat: x.lat, lon: x.lon } : x)));
      captureBus.emit(now, self);
      if (!walkId) onMoment.current?.(now, 'kept');
    }
    onKept.current?.(into, true);
    return { momentId: into, pieceId };
  }

  async function add(kind: CaptureKind, stamp: Stamp, file_path: string | null, body: string | null, more: Partial<Pick<Capture, 'body_format'>> = {}): Promise<string | null> {
    if (!enabled) return null;
    if (stamp.into) return (await addPiece(stamp.into, kind, stamp, file_path, body, more))?.pieceId ?? null;
    // A new moment and its first piece, under one id (decision 0123): its one place and time, the piece's media.
    const id = newId();
    const m: Moment = {
      id, walk_id: walkId, t: stamp.t, lat: stamp.at?.[1] ?? null, lon: stamp.at?.[0] ?? null, segment_id: null,
      pieces: [{ id, moment_id: id, t: stamp.t, kind, file_path, body, ...more }],
    };
    await db.addMoment(m);
    const c = faced(m);
    // A reply is linked once it is kept; a failed link leaves the moment kept, unconnected (OT2).
    const answers = stamp.replyTo !== undefined ? stamp.replyTo : replyTo.current;
    if (answers) void threads.reply(c.id, answers.answeredId, answers.from ?? null).catch(() => {});
    // Without a fresh fix, it is stored unplaced (the trace places it at
    // stop), but pinned meanwhile at the last known position.
    const last = pos.current.here;
    const shown = c.lat == null && last ? { ...c, lat: last[1], lon: last[0] } : c;
    if (alive.current) setCaptures((prev) => [...prev, shown]);
    // Told even once this path is gone: the walk screen may have come back meanwhile (NV9).
    captureBus.emit(shown, self);
    if (!walkId) onMoment.current?.(c, 'kept');
    onKept.current?.(c.id, false);
    if (stamp.locating) lastLocate.current = { id: c.id, fix: stamp.locating, at: stamp.t };
    placeMoment(c, stamp);
    // The room again after each kept photo, video or memo (SA5); the web's request waits for a calm moment (SA10).
    if (kind !== 'text') void space.afterKept({ recording: walkId != null });
    return c.id;
  }

  /**
   * A moment outside a walk is kept at once and placed when its one fix
   * arrives (M2), so a save never waits on GPS. No fix: it stays unplaced.
   */
  function placeMoment(c: Faced, stamp: Stamp) {
    // In a walk, no fix leaves it for the trace to place at stop; nothing is reported.
    const report = (x: Faced, state: MomentState) => {
      if (!walkId) onMoment.current?.(x, state);
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
        if (alive.current) setCaptures((prev) => prev.map((x) => (x.id === c.id ? placed : x)));
        // The pin shown at the last position elsewhere moves too (NV9).
        if (walkId) captureBus.patch(walkId, c.id, { lon: placed.lon, lat: placed.lat }, self);
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
      setBusy(null);
    }
  }

  /** Photos and videos whose save failed, every one of them, held for Retry (SA8). */
  const [held, setHeld] = useState<HeldShot[]>([]);

  /** Keeps a shot's file, then its row; on a failure, the shot as far as it got and why. */
  async function keepShot(s: HeldShot): Promise<{ id: string | null } | { failed: HeldShot; error: unknown }> {
    let path = s.path;
    try {
      path = path ?? (await keepFile(s.uri, folder(), `${newId()}.${s.ext}`));
      // With `into`, the id is the new piece's in that open moment (MS3).
      const id = await add(s.kind, s.stamp, path, s.ms == null ? null : String(s.ms));
      if (id && s.kind === 'photo') thumbFor(id, path, s.stamp.into ?? id);
      return { id };
    } catch (error) {
      return { failed: { ...s, path }, error };
    }
  }

  /** Keeps a new shot, or holds it with why in words, never the raw error (SA8, SA9). */
  async function keepOrHold(s: HeldShot): Promise<{ kind: 'photo' | 'video'; id: string; momentId: string } | null> {
    const r = await keepShot(s);
    if ('failed' in r) {
      if (alive.current) setHeld((prev) => [...prev, r.failed]);
      setError({ message: saveFailLine(s.kind, isOutOfSpace(r.error)) });
      return null;
    }
    return r.id ? { kind: s.kind, id: r.id, momentId: s.stamp.into ?? r.id } : null;
  }

  /** Retry: each held shot saved in turn; one that fails again stays held (SA8). */
  const retryHeld = () =>
    guarded(held[0]?.kind ?? 'photo', async () => {
      const still: HeldShot[] = [];
      let last: { kind: HeldShot['kind']; error: unknown } | null = null;
      for (const s of held) {
        const r = await keepShot(s);
        if ('failed' in r) {
          still.push(r.failed);
          last = { kind: s.kind, error: r.error };
        }
      }
      if (alive.current) setHeld(still);
      if (last) setError({ message: saveFailLine(last.kind, isOutOfSpace(last.error)) });
    });

  /**
   * A new photo's small copy for previews (TH1), after the capture is kept: never holds it up or fails it (TH2). The
   * copy is the piece's (`id`); the moment it sits in (`momentId`) is read fresh, and shows it when it is its face.
   */
  function thumbFor(id: string, path: string, momentId: string) {
    void makeThumb(facedOf({ id, walk_id: folder(), t: Date.now(), lat: null, lon: null, kind: 'photo', file_path: path, body: null, segment_id: null })).then((thumb) => {
      if (!thumb) return;
      // An Edit offer's Done may have stored the edited copy meanwhile: this one then stands down (media-editing audit 8).
      void db.getMomentsByIds([momentId]).then(([m]) => {
        const row = m?.pieces.find((x) => x.id === id) ?? null;
        if (!captureThumbStillWanted(row)) {
          if (thumb !== THUMB.none) void removeMedia([thumb]).catch(() => {});
          return;
        }
        const isFace = !!m && faced(m).piece_id === id;
        if (isFace && alive.current) setCaptures((prev) => prev.map((x) => (x.id === m.id ? { ...x, thumb_path: thumb } : x)));
        // Stored first, then told: a walk screen mounting meanwhile either reads it or hears it (tabs audit 5).
        void db.updatePiece(id, { thumb_path: thumb }).then(
          () => {
            if (isFace) captureBus.patch(walkId, m.id, { thumb_path: thumb }, self);
          },
          () => {},
        );
      }, () => {});
    });
  }

  /**
   * The system camera, in photo or video mode as the person picks there. Resolves what was kept, if anything. With
   * `into`, what it keeps joins that open moment as a piece (MS2, MS3); `id` is then the piece's.
   */
  const takePhoto = async (into: string | null = null): Promise<{ kind: 'photo' | 'video'; id: string; momentId: string } | null> => {
    let kept: { kind: 'photo' | 'video'; id: string; momentId: string } | null = null;
    await guarded('photo', async () => {
      const stamp = stampNow(false, into);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        // The request above already showed the system prompt if it could; a refusal now is only fixable in Settings.
        // (`canAskAgain` is not trusted: iOS can report true after a denial, which left no way to recover.)
        setError({ message: accessOff('Camera'), openSettings: true });
        return;
      }
      startLocating(stamp);
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        videoMaxDuration: MAX_VIDEO_S,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });
      if (res.canceled || !res.assets[0]) return;
      const asset = res.assets[0];
      // From here the file is being kept: Stop from the recording bar waits for it (capture-from-chronicle audit 6).
      const keeping = (async () => {
        if (asset.type === 'video') {
          // The web picker reports seconds, native milliseconds.
          const ms = Platform.OS === 'web' ? (asset.duration ?? 0) * 1000 : (asset.duration ?? 0);
          // Browsers cannot cap a recording, so an over-long clip is turned away here.
          if (ms > MAX_VIDEO_S * 1000 + 500) {
            dropTemp(asset.uri);
            setError({ message: `Videos can be up to ${MAX_VIDEO_S} seconds here. That one was ${Math.round(ms / 1000)} s.` });
            return;
          }
          const ext = asset.mimeType?.split('/')[1]?.replace('quicktime', 'mov') ?? 'mp4';
          kept = await keepOrHold({ kind: 'video', stamp, uri: asset.uri, ext, ms: Math.round(ms), path: null });
          return;
        }
        const ext = asset.mimeType?.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
        kept = await keepOrHold({ kind: 'photo', stamp, uri: asset.uri, ext, ms: null, path: null });
      })();
      memoGate.keep(keeping);
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
    memoGate.track(p);
    return p;
  };
  const withBusy = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy('voice');
    try {
      return await fn();
    } finally {
      if (alive.current) setBusy(null);
    }
  };

  /** A stopped memo that could not be saved, kept so it can be retried. */
  const [unsaved, setUnsaved] = useState<StoppedMemo | null>(null);
  /** A memo just discarded, kept for UNDO_MS so the discard can be undone. */
  const [discarded, setDiscarded] = useState<StoppedMemo | null>(null);
  const discardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAudioMode = () =>
    setAudioMode({ allowsRecording: false, playsInSilentMode: true, allowsBackgroundRecording: false }).catch(() => {});

  /** With `into`, the memo joins that open moment as a piece when saved (MS2, MS3). */
  const startVoice = (into: string | null = null): Promise<boolean> =>
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
          // Keeps recording with the phone locked and in a pocket.
          await setAudioMode({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
          await voice.prepareToRecordAsync();
          if (!alive.current) {
            // The screen went away while preparing: never leave the mic on.
            await resetAudioMode();
            return false;
          }
          voiceStamp.current = stampNow(true, into);
          voice.record();
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
    return { uri: voice.uri, stamp, ms, short: wasRecording && wallMs < MIN_VOICE_MS };
  }

  async function saveMemo(m: StoppedMemo): Promise<void> {
    if (!m.uri) throw new Error('The voice memo could not be saved.');
    // Native records AAC in .m4a; on web the extension is only part of the key.
    const ext = /\.(\w{2,4})$/.exec(m.uri.split('?')[0])?.[1] ?? (m.uri.startsWith('blob:') ? 'webm' : 'm4a');
    await add('voice', m.stamp, await keepFile(m.uri, folder(), `${newId()}.${ext}`), String(Math.round(m.ms)));
  }

  /**
   * Stops and saves the memo in progress, waiting for any voice action in
   * flight first. A memo under MIN_VOICE_MS was an accidental tap and is
   * dropped. A memo that fails to save is kept for retrySave.
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
        try {
          await saveMemo(m);
          return 'saved';
        } catch (e) {
          if (alive.current) setUnsaved(m);
          setError({ message: saveFailLine('voice', isOutOfSpace(e)) });
          return 'failed';
        }
      }),
    ));

  /** Retries a memo whose save failed. */
  const retrySave = (): Promise<VoiceResult> =>
    enqueue(() =>
      withBusy(async () => {
        const m = unsaved;
        if (!m) return 'none';
        try {
          await saveMemo(m);
          setUnsaved(null);
          return 'saved';
        } catch (e) {
          setError({ message: saveFailLine('voice', isOutOfSpace(e)) });
          return 'failed';
        }
      }),
    );

  const forgetDiscarded = () => {
    if (discardTimer.current) clearTimeout(discardTimer.current);
    discardTimer.current = null;
  };

  /** Stops the memo in progress and sets it aside; it is deleted after UNDO_MS unless undone. */
  const discardVoice = (): Promise<VoiceResult> =>
    trackMemo(enqueue(() =>
      withBusy(async () => {
        if (!voiceOn.current) return 'none';
        const m = await stopRecorder();
        forgetDiscarded();
        setDiscarded((prev) => {
          if (prev) dropTemp(prev.uri);
          return m;
        });
        discardTimer.current = setTimeout(() => {
          setDiscarded((cur) => {
            if (cur === m) dropTemp(m.uri);
            return cur === m ? null : cur;
          });
        }, UNDO_MS);
        return 'discarded';
      }),
    ));

  /** Brings back the memo just discarded, and saves it. */
  const undoDiscard = (): Promise<VoiceResult> =>
    enqueue(() =>
      withBusy(async () => {
        const m = discarded;
        if (!m) return 'none';
        forgetDiscarded();
        setDiscarded(null);
        try {
          await saveMemo(m);
          return 'saved';
        } catch (e) {
          setUnsaved(m);
          setError({ message: saveFailLine('voice', isOutOfSpace(e)) });
          return 'failed';
        }
      }),
    );

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
    };
  }, []);

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
  }

  /**
   * A note's new text (QL25): stored, shown here, then sent on the bus so the
   * walk's other views (the walk screen, Navigate's live walk) show it too.
   * Its find and reminder hang on its id, so they stay.
   */
  async function setNote(c: Pick<Faced, 'id' | 'piece_id'>, body: string, type?: string | null, typeOnly = false) {
    const id = c.id;
    const change = notePatch(body, type, typeOnly);
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
   * first words take (the steward's S9). `keepNote` keeps it, as Markdown, once it has words (NP9).
   */
  const beginNote = (into: string | null = null): Stamp => stampNow(true, into);
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
    discarded: discarded != null,
    retrySave,
    unsaved: unsaved != null,
    /** What is held for Retry, by kind, in the order taken (SA8). */
    held: held.map((h) => h.kind),
    retryHeld,
    saveNote,
    beginNote,
    keepNote,
    setEdit,
    setNote,
  };
}
