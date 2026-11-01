import {
  RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder,
} from 'expo-audio';
import { setAudioMode } from './audioMode';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { db } from './db';
import { newId } from './id';
import { locateOnce } from './locate';
import type { LocateResult } from './locate/types';
import { dropTemp, keepFile } from './media';
import { makeThumb } from './media/thumb';
import type { Capture, CaptureKind, LngLat } from './types';

/** A fix older than this is not trusted as "where the capture was taken". */
const FRESH_FIX_MS = 15_000;
/** A voice memo shorter than this was an accidental tap. */
const MIN_VOICE_MS = 1000;
/**
 * Longest video. A minute of phone video is 50 to 150 MB; the web gets less,
 * since a browser's storage is smaller and can be cleared.
 */
const MAX_VIDEO_S = Platform.OS === 'web' ? 15 : 30;

/** How long a stop may take before it is given up on. */
const STOP_TIMEOUT_MS = 3000;
/** How long a discarded memo can be brought back. */
export const UNDO_MS = 5000;

type Busy = CaptureKind | null;

export type VoiceResult = 'saved' | 'dropped' | 'discarded' | 'failed' | 'none';

/** When a capture was begun and where; a moment outside a walk also has its fix on the way. */
interface Stamp {
  t: number;
  at: LngLat | null;
  locating?: Promise<LocateResult>;
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
  opts: { loose?: boolean; onMoment?: (c: Capture, state: MomentState) => void } = {},
) {
  const enabled = walkId != null || !!opts.loose;
  const onMoment = useRef(opts.onMoment);
  useEffect(() => {
    onMoment.current = opts.onMoment;
  }, [opts.onMoment]);
  const [captures, setCaptures] = useState<Capture[]>([]);
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

  useEffect(() => {
    if (walkId) db.getCaptures(walkId).then(setCaptures);
  }, [walkId]);

  const stampNow = (locate = true): Stamp => {
    const t = clockNow();
    const { here: h, lastFixAt: f } = pos.current;
    const at = h && f != null && t - f <= FRESH_FIX_MS ? h : null;
    const s: Stamp = { t, at };
    if (locate) startLocating(s);
    return s;
  };
  /**
   * Outside a walk there is no trace to place it at stop: ask for one fix (M2).
   * Called after the camera or mic permission is settled, so two system
   * prompts never stack (audit: Android takes one request at a time).
   */
  const startLocating = (s: Stamp) => {
    if (!walkId && !s.at && !s.locating) s.locating = locateOnce().catch(() => ({ at: null, reason: 'unavailable' as const }));
  };
  const folder = () => walkId ?? LOOSE_FOLDER;

  async function add(kind: CaptureKind, stamp: Stamp, file_path: string | null, body: string | null): Promise<string | null> {
    if (!enabled) return null;
    const c: Capture = {
      id: newId(), walk_id: walkId, t: stamp.t, kind, file_path, body, segment_id: null,
      lat: stamp.at?.[1] ?? null, lon: stamp.at?.[0] ?? null,
    };
    await db.addCapture(c);
    // Without a fresh fix, it is stored unplaced (the trace places it at
    // stop), but pinned meanwhile at the last known position.
    const last = pos.current.here;
    const shown = c.lat == null && last ? { ...c, lat: last[1], lon: last[0] } : c;
    if (alive.current) setCaptures((prev) => [...prev, shown]);
    if (!walkId) {
      onMoment.current?.(c, 'kept');
      placeMoment(c, stamp);
    }
    return c.id;
  }

  /**
   * A moment outside a walk is kept at once and placed when its one fix
   * arrives (M2), so a save never waits on GPS. No fix: it stays unplaced.
   */
  function placeMoment(c: Capture, stamp: Stamp) {
    if (c.lat != null || !stamp.locating) {
      onMoment.current?.(c, c.lat != null ? 'placed' : 'unavailable');
      return;
    }
    stamp.locating
      .then(async (r) => {
        if (!r.at) {
          onMoment.current?.(c, r.reason ?? 'timeout');
          return;
        }
        const placed = { ...c, lon: r.at[0], lat: r.at[1] };
        await db.updateCapture(c.id, { lon: placed.lon, lat: placed.lat });
        if (alive.current) setCaptures((prev) => prev.map((x) => (x.id === c.id ? placed : x)));
        onMoment.current?.(placed, 'placed');
      })
      .catch(() => onMoment.current?.(c, 'unavailable'));
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

  /** The system camera, in photo or video mode as the person picks there. Resolves what was kept, if anything. */
  const takePhoto = async (): Promise<{ kind: 'photo' | 'video'; id: string } | null> => {
    let kept: { kind: 'photo' | 'video'; id: string } | null = null;
    await guarded('photo', async () => {
      const stamp = stampNow(false);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError({ message: 'Camera access is off for Chronicles.', openSettings: !perm.canAskAgain });
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
        const id = await add('video', stamp, await keepFile(asset.uri, folder(), `${newId()}.${ext}`), String(Math.round(ms)));
        if (id) kept = { kind: 'video', id };
        return;
      }
      const ext = asset.mimeType?.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      const path = await keepFile(asset.uri, folder(), `${newId()}.${ext}`);
      const id = await add('photo', stamp, path, null);
      if (id) {
        kept = { kind: 'photo', id };
        // Its small copy for previews (TH1), after the capture is kept: never holds it up or fails it (TH2).
        void makeThumb({ id, walk_id: folder(), t: Date.now(), lat: null, lon: null, kind: 'photo', file_path: path, body: null, segment_id: null }).then((thumb) => {
          if (!thumb) return;
          void db.updateCapture(id, { thumb_path: thumb }).catch(() => {});
          if (alive.current) setCaptures((prev) => prev.map((x) => (x.id === id ? { ...x, thumb_path: thumb } : x)));
        });
      }
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

  const startVoice = (): Promise<boolean> =>
    enqueue(() =>
      withBusy(async () => {
        if (!enabled || voiceOn.current) return false;
        try {
          const perm = await requestRecordingPermissionsAsync();
          if (!perm.granted) {
            setError({ message: 'Microphone access is off for Chronicles.', openSettings: !perm.canAskAgain });
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
          voiceStamp.current = stampNow();
          voice.record();
          voiceOn.current = true;
          setVoiceStartedAt(voiceStamp.current.t);
          return true;
        } catch (e) {
          await resetAudioMode();
          setError({ message: e instanceof Error ? e.message : String(e) });
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
    enqueue(() =>
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
          setError({ message: `The voice memo could not be saved: ${e instanceof Error ? e.message : e}` });
          return 'failed';
        }
      }),
    );

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
          setError({ message: `The voice memo could not be saved: ${e instanceof Error ? e.message : e}` });
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
    enqueue(() =>
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
    );

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
          setError({ message: `The voice memo could not be saved: ${e instanceof Error ? e.message : e}` });
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

  /** Sets or clears a photo's caption, and where its bar sits. */
  async function setCaption(id: string, caption: string | null, y: number) {
    await db.updateCapture(id, { caption, caption_y: caption ? y : null });
    setCaptures((prev) => prev.map((c) => (c.id === id ? { ...c, caption, caption_y: caption ? y : null } : c)));
  }

  const saveNote = (text: string) =>
    guarded('text', async () => {
      if (text.trim()) await add('text', stampNow(), null, text.trim());
    });

  return {
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
    saveNote,
    setCaption,
  };
}
