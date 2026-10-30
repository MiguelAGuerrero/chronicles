import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalkMap } from '../components/map/WalkMap';
import type { MapCapture, WalkMapHandle } from '../components/map/types';
import { Banner, Button, theme } from '../components/ui';
import { db } from '../lib/db';
import { finishWalk } from '../lib/finish';
import { boundsOf, filterFixes, splitAtGaps, traceDistanceM } from '../lib/geo';
import { newId } from '../lib/id';
import { keepFile } from '../lib/media';
import { recorder } from '../lib/recorder';
import { formatDistance, formatDuration } from '../lib/summary';
import type { Capture, CaptureKind, LngLat, StreetSegment, TracePoint, Walk } from '../lib/types';

const FOG_RADIUS_M = 400;

export default function WalkScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<WalkMapHandle>(null);
  const [walk, setWalk] = useState<Walk | null>(null);
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [fog, setFog] = useState<StreetSegment[]>([]);
  const [walked, setWalked] = useState<StreetSegment[]>([]);
  const [now, setNow] = useState(Date.now());
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<CaptureKind | 'stop' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const voice = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [voiceStart, setVoiceStart] = useState<number | null>(null);
  const simulated = recorder.capabilities.simulate && !!recorder.walkTo;

  // Load the open walk and re-attach the recorder if the app was restarted.
  useEffect(() => {
    let live = true;
    (async () => {
      const w = await db.getOpenWalk();
      if (!live) return;
      if (!w) {
        router.replace('/');
        return;
      }
      setWalk(w);
      setPoints(await db.getPoints(w.id));
      setCaptures(await db.getCaptures(w.id));
      if (!recorder.isRecording()) await recorder.resume(w.id).catch((e) => setError(String(e?.message ?? e)));
    })();
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => recorder.subscribe((p) => setPoints((prev) => [...prev, p])), []);
  useEffect(() => {
    const t = setInterval(() => setNow(recorder.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fixes = useMemo(() => filterFixes(points), [points]);
  const runs = useMemo(() => splitAtGaps(fixes), [fixes]);
  const here = useMemo<LngLat | null>(() => {
    const last = fixes[fixes.length - 1];
    return last ? [last.lon, last.lat] : null;
  }, [fixes]);

  // Fog from streets already derived on earlier walks, around where you are.
  const hereKey = here ? `${here[0].toFixed(3)},${here[1].toFixed(3)}` : null;
  useEffect(() => {
    if (!here) return;
    (async () => {
      const b = boundsOf([here], FOG_RADIUS_M)!;
      const segs = await db.getSegmentsIn(b);
      const visited = new Set((await db.getVisited()).map((v) => v.segment_id));
      setFog(segs.filter((s) => !visited.has(s.id)));
      setWalked(segs.filter((s) => visited.has(s.id)));
    })();
    // Refreshed when you move about 100 m, not on every fix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hereKey]);

  const mapCaptures: MapCapture[] = useMemo(
    () =>
      captures
        .filter((c) => c.lat != null && c.lon != null)
        .map((c) => ({ id: c.id, kind: c.kind, lngLat: [c.lon!, c.lat!] as LngLat })),
    [captures],
  );

  async function addCapture(kind: CaptureKind, file_path: string | null, body: string | null) {
    if (!walk) return;
    const c: Capture = {
      id: newId(), walk_id: walk.id, t: recorder.now(), kind, file_path, body, segment_id: null,
      lat: here?.[1] ?? null, lon: here?.[0] ?? null,
    };
    await db.addCapture(c);
    setCaptures((prev) => [...prev, c]);
  }

  async function takePhoto() {
    if (!walk) return;
    setBusy('photo');
    setError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) throw new Error('Camera permission is needed for photos.');
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (res.canceled || !res.assets[0]) return;
      const asset = res.assets[0];
      const ext = asset.mimeType?.split('/')[1] ?? 'jpg';
      await addCapture('photo', await keepFile(asset.uri, walk.id, `${newId()}.${ext}`), null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function toggleVoice() {
    if (!walk) return;
    setError(null);
    try {
      if (voiceStart == null) {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) throw new Error('Microphone permission is needed for voice notes.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await voice.prepareToRecordAsync();
        voice.record();
        setVoiceStart(Date.now());
      } else {
        setBusy('voice');
        const duration = Date.now() - voiceStart;
        await voice.stop();
        setVoiceStart(null);
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        if (voice.uri) await addCapture('voice', await keepFile(voice.uri, walk.id, `${newId()}.m4a`), String(duration));
      }
    } catch (e) {
      setVoiceStart(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function saveNote() {
    const text = note.trim();
    setNoteOpen(false);
    setNote('');
    if (text) await addCapture('text', null, text);
  }

  async function stop() {
    if (!walk) return;
    setBusy('stop');
    if (voiceStart != null) await toggleVoice();
    const endedAt = recorder.now();
    await recorder.stop();
    await finishWalk(walk.id, endedAt, (b) => mapRef.current?.collect(b) ?? Promise.reject(new Error('no map')));
    router.replace(`/replay/${walk.id}`);
  }

  const elapsed = walk ? now - walk.started_at : 0;
  const needsPlacement = simulated && points.length === 0;

  return (
    <View style={styles.screen}>
      <WalkMap
        ref={mapRef}
        trace={runs}
        walked={walked}
        fog={fog}
        captures={mapCaptures}
        walker={here}
        follow={simulated ? null : here}
        initialCenter={here ?? undefined}
        initialZoom={16}
        onPress={simulated ? (p) => recorder.walkTo?.(p) : undefined}
      />
      <View style={[styles.top, { top: 12 }]} pointerEvents="box-none">
        <View style={styles.stats}>
          <Text style={styles.stat}>{formatDuration(elapsed)}</Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.stat}>{formatDistance(traceDistanceM(fixes))}</Text>
          <Text style={styles.statSep}>·</Text>
          <Text style={styles.stat}>{captures.length} {captures.length === 1 ? 'capture' : 'captures'}</Text>
        </View>
        {simulated && (
          <Banner>
            {needsPlacement
              ? 'Simulated walk: tap the map to place yourself.'
              : 'Simulated walk: tap the map to walk there. Taps queue up into a route.'}
          </Banner>
        )}
        {!simulated && !recorder.capabilities.background && (
          <Banner>Keep this tab open and visible; the browser pauses location when it is hidden.</Banner>
        )}
        {error && <Banner tone="error">{error}</Banner>}
      </View>
      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.captureRow}>
          <Button testID="cap-photo" style={styles.cap} variant="secondary" label="Photo" onPress={takePhoto} busy={busy === 'photo'} disabled={busy === 'stop'} />
          <Button
            testID="cap-voice"
            style={styles.cap}
            variant={voiceStart != null ? 'danger' : 'secondary'}
            label={voiceStart != null ? 'Stop voice' : 'Voice'}
            onPress={toggleVoice}
            busy={busy === 'voice'}
            disabled={busy === 'stop'}
          />
          <Button testID="cap-note" style={styles.cap} variant="secondary" label="Note" onPress={() => setNoteOpen(true)} disabled={busy === 'stop'} />
        </View>
        <Button testID="stop" label={busy === 'stop' ? 'Clearing the fog…' : 'Stop'} onPress={stop} busy={busy === 'stop'} />
      </View>

      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        <View style={styles.modalBack}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>A line about here</Text>
            <TextInput
              testID="note-input"
              autoFocus
              multiline
              value={note}
              onChangeText={setNote}
              placeholder="What caught your eye?"
              placeholderTextColor={theme.muted}
              style={styles.input}
            />
            <View style={styles.modalRow}>
              <Button variant="ghost" label="Cancel" onPress={() => { setNoteOpen(false); setNote(''); }} />
              <Button testID="note-save" label="Save" onPress={saveNote} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { position: 'absolute', left: 12, right: 12, gap: 8, alignItems: 'flex-start' },
  stats: {
    flexDirection: 'row', gap: 6, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line,
  },
  stat: { color: theme.ink, fontWeight: '600', fontSize: 14, fontVariant: ['tabular-nums'] },
  statSep: { color: theme.muted },
  bar: { backgroundColor: theme.bg, paddingHorizontal: 12, paddingTop: 12, gap: 10, borderTopWidth: 1, borderColor: theme.line },
  captureRow: { flexDirection: 'row', gap: 10 },
  cap: { flex: 1 },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: { minHeight: 90, borderWidth: 1, borderColor: theme.line, borderRadius: 10, padding: 10, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
