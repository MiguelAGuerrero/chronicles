import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { db } from './db';
import { newId } from './id';
import { dropTemp, keepFile } from './media';
import type { Capture, CaptureKind, LngLat } from './types';

/** A fix older than this is not trusted as "where the capture was taken". */
const FRESH_FIX_MS = 15_000;
/** A voice memo shorter than this was an accidental tap. */
const MIN_VOICE_MS = 1000;

type Busy = CaptureKind | null;

/**
 * Photo, voice memo and note capture for the open walk. Each capture is
 * stamped when it is begun (the shutter tap, the start of a memo), and pinned
 * to the current position only when a recent fix exists; otherwise the
 * position is filled from the trace by time when the walk stops.
 */
export function useCaptures(
  walkId: string | null,
  here: LngLat | null,
  lastFixAt: number | null,
  onError?: (e: { message: string; openSettings?: boolean }) => void,
) {
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
  const voiceStamp = useRef<{ t: number; at: LngLat | null } | null>(null);
  const voice = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pos = useRef({ here, lastFixAt });
  useEffect(() => {
    pos.current = { here, lastFixAt };
  }, [here, lastFixAt]);

  useEffect(() => {
    if (walkId) db.getCaptures(walkId).then(setCaptures);
  }, [walkId]);

  const stampNow = (): { t: number; at: LngLat | null } => {
    const t = Date.now();
    const { here: h, lastFixAt: f } = pos.current;
    return { t, at: h && f != null && t - f <= FRESH_FIX_MS ? h : null };
  };

  async function add(kind: CaptureKind, stamp: { t: number; at: LngLat | null }, file_path: string | null, body: string | null) {
    if (!walkId) return;
    const c: Capture = {
      id: newId(), walk_id: walkId, t: stamp.t, kind, file_path, body, segment_id: null,
      lat: stamp.at?.[1] ?? null, lon: stamp.at?.[0] ?? null,
    };
    await db.addCapture(c);
    setCaptures((prev) => [...prev, c]);
  }

  async function guarded(kind: CaptureKind, fn: () => Promise<void>) {
    if (lock.current || !walkId) return false;
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

  const takePhoto = () =>
    guarded('photo', async () => {
      const stamp = stampNow();
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError({ message: 'Camera access is off for Chronicles.', openSettings: !perm.canAskAgain });
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (res.canceled || !res.assets[0]) return;
      const asset = res.assets[0];
      const ext = asset.mimeType?.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      await add('photo', stamp, await keepFile(asset.uri, walkId!, `${newId()}.${ext}`), null);
    });

  const startVoice = () =>
    guarded('voice', async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError({ message: 'Microphone access is off for Chronicles.', openSettings: !perm.canAskAgain });
        return;
      }
      // Keeps recording with the phone locked and in a pocket.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, allowsBackgroundRecording: true });
      await voice.prepareToRecordAsync();
      voiceStamp.current = stampNow();
      voice.record();
      setVoiceStartedAt(voiceStamp.current.t);
    });

  async function stopRecorder(): Promise<number> {
    const duration = voice.getStatus().durationMillis;
    await voice.stop();
    setVoiceStartedAt(null);
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, allowsBackgroundRecording: false });
    return duration;
  }

  /**
   * Stops and saves the memo in progress. A memo shorter than MIN_VOICE_MS is
   * an accidental tap and is dropped. Resolves false if it could not be saved.
   */
  async function finishVoice(): Promise<boolean> {
    if (voiceStartedAt == null && !voice.isRecording) return true;
    const run = async () => {
      const duration = await stopRecorder();
      if (duration < MIN_VOICE_MS) {
        dropTemp(voice.uri);
        return;
      }
      if (!voice.uri) throw new Error('The voice memo could not be saved.');
      // Native records AAC in .m4a; on web the extension is only part of the key.
      const ext = /\.(\w{2,4})$/.exec(voice.uri.split('?')[0])?.[1] ?? (voice.uri.startsWith('blob:') ? 'webm' : 'm4a');
      await add('voice', voiceStamp.current ?? stampNow(), await keepFile(voice.uri, walkId!, `${newId()}.${ext}`), String(Math.round(duration)));
    };
    if (lock.current) return false;
    return guarded('voice', run);
  }

  /** Stops the memo in progress and throws it away. */
  async function discardVoice(): Promise<boolean> {
    if (voiceStartedAt == null && !voice.isRecording) return true;
    if (lock.current) return false;
    return guarded('voice', async () => {
      await stopRecorder();
      dropTemp(voice.uri);
    });
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
    saveNote,
  };
}
