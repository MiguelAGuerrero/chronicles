import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalkMap } from '../components/map/WalkMap';
import type { MapCapture } from '../components/map/types';
import { Banner, Button, HoldButton, theme } from '../components/ui';
import { db } from '../lib/db';
import { boundsOf } from '../lib/geo';
import { successFeedback, tapFeedback } from '../lib/haptics';
import { recorder } from '../lib/recorder';
import type { RecorderStatus } from '../lib/recorder/types';
import { stopWalk } from '../lib/session';
import { formatDistance, formatDuration, formatElapsed } from '../lib/summary';
import type { LngLat, StreetSegment, Walk } from '../lib/types';
import { useCaptures } from '../lib/useCaptures';
import { useLiveTrace } from '../lib/useLiveTrace';

const FOG_RADIUS_M = 400;
/** No accepted fix for this long while recording reads as weak GPS. */
const WEAK_GPS_MS = 20_000;
const NOTICE_MS = 6000;

type Notice = { message: string; tone?: 'info' | 'error'; openSettings?: boolean; sticky?: boolean };

export default function WalkScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ warning?: string }>();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [status, setStatus] = useState<RecorderStatus>({ kind: 'idle' });
  const [now, setNow] = useState(() => Date.now());
  // One-off notices: a start warning, or the web's visibility rule.
  const [notice, setNotice] = useState<Notice | null>(() =>
    params.warning
      ? { message: params.warning }
      : recorder.capabilities.background
        ? null
        : { message: 'Keep this page open and on screen while you walk.' },
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [fog, setFog] = useState<StreetSegment[]>([]);
  const [walked, setWalked] = useState<StreetSegment[]>([]);
  const voiceFailed = useRef(false);

  useEffect(() => {
    db.getOpenWalk().then((w) => (w ? setWalk(w) : router.replace('/')));
  }, []);
  useEffect(
    () =>
      recorder.subscribeStatus((s) => {
        setStatus(s);
        if (s.kind === 'error') setNotice({ message: s.message, tone: 'error', openSettings: s.openSettings, sticky: true });
      }),
    [],
  );
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const onGap = useCallback((ms: number) => {
    if (!recorder.capabilities.background) {
      setNotice({ message: `Tracing paused for ${formatDuration(ms)} while this page was hidden.` });
    }
  }, []);
  const onCaptureError = useCallback((e: { message: string; openSettings?: boolean }) => {
    setNotice({ message: e.message, tone: 'error', openSettings: e.openSettings });
  }, []);
  const live = useLiveTrace(walk?.id ?? null, walk?.started_at ?? null, onGap);
  const cap = useCaptures(walk?.id ?? null, live.here, live.lastFixAt, onCaptureError);

  useEffect(() => {
    if (!notice || notice.sticky) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  // Fog from streets already derived on earlier walks, around where you are,
  // refreshed when you move about 100 m.
  const hereKey = live.here ? `${live.here[0].toFixed(3)},${live.here[1].toFixed(3)}` : null;
  useEffect(() => {
    if (!live.here) return;
    let alive = true;
    (async () => {
      const segs = await db.getSegmentsIn(boundsOf([live.here!], FOG_RADIUS_M)!);
      const visited = await db.visitedSegmentIds();
      if (!alive) return;
      setFog(segs.filter((s) => !visited.has(s.id)));
      setWalked(segs.filter((s) => visited.has(s.id)));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hereKey]);

  const mapCaptures: MapCapture[] = useMemo(
    () =>
      cap.captures
        .filter((c) => c.lat != null && c.lon != null)
        .map((c) => ({ id: c.id, kind: c.kind, lngLat: [c.lon!, c.lat!] as LngLat })),
    [cap.captures],
  );

  async function stop() {
    if (!walk || stopping) return;
    setStopping(true);
    try {
      if (cap.voiceStartedAt != null && !voiceFailed.current) {
        const saved = await cap.finishVoice();
        if (!saved) {
          voiceFailed.current = true;
          setNotice({ message: 'The voice memo could not be saved. Hold Stop again to end the walk without it.', tone: 'error', sticky: true });
          return;
        }
      }
      await stopWalk(walk.id);
      successFeedback();
      router.replace(`/replay/${walk.id}`);
    } catch (e) {
      setNotice({ message: `The walk could not be stopped: ${e instanceof Error ? e.message : e}`, tone: 'error', sticky: true });
    } finally {
      setStopping(false);
    }
  }

  async function saveNote() {
    const ok = await cap.saveNote(note);
    if (ok) {
      setNote('');
      setNoteOpen(false);
      tapFeedback();
      setToast('Note saved here');
    }
  }

  async function photo() {
    if (await cap.takePhoto()) tapFeedback();
  }

  const elapsed = walk ? now - walk.started_at : 0;
  const weak = status.kind === 'recording' && live.lastFixAt != null && now - live.lastFixAt > WEAK_GPS_MS;
  const state =
    status.kind === 'error' ? { label: 'Not recording', color: theme.danger }
    : status.kind === 'waiting' || status.kind === 'idle' ? { label: 'Waiting for GPS', color: theme.warn }
    : weak ? { label: 'Weak GPS', color: theme.warn }
    : { label: 'Recording', color: theme.ok };
  const recordingVoice = cap.voiceStartedAt != null;
  const count = cap.captures.length;
  const pillLabel = `${state.label}. ${formatDuration(elapsed)}, ${formatDistance(live.distanceM)}, ${count} ${count === 1 ? 'capture' : 'captures'}`;

  return (
    <View style={styles.screen}>
      <WalkMap
        trace={live.runs}
        walked={walked}
        fog={fog}
        captures={mapCaptures}
        walker={live.here}
        follow={live.here}
        initialCenter={live.here ?? undefined}
        initialZoom={16}
      />
      <View style={[styles.top, { top: 12 }]} pointerEvents="box-none">
        <View style={styles.pill} accessible accessibilityLabel={pillLabel} accessibilityLiveRegion="polite">
          <View style={[styles.statusDot, { backgroundColor: state.color }]} />
          <Text style={styles.pillStrong}>{state.label}</Text>
          <Text style={styles.pillText}>
            {formatElapsed(elapsed)} · {formatDistance(live.distanceM)} · {count} {count === 1 ? 'capture' : 'captures'}
          </Text>
        </View>
        {notice && (
          <Banner
            tone={notice.tone}
            onDismiss={() => setNotice(null)}
            action={notice.openSettings && Platform.OS !== 'web' ? { label: 'Open Settings', onPress: () => Linking.openSettings() } : undefined}
          >
            {notice.message}
          </Banner>
        )}
        {toast && (
          <View style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        )}
      </View>

      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.barInner}>
          <View style={styles.stopRow}>
            <HoldButton
              testID="stop"
              label="Hold to stop"
              busyLabel="Stopping…"
              onHold={stop}
              busy={stopping}
              disabled={!walk}
              style={styles.stop}
            />
          </View>
          {/* Captures sit lowest, in the thumb's reach, and Stop is away from them. */}
          <View style={styles.captureRow}>
            <Button testID="cap-photo" style={styles.cap} tall variant="secondary" label="Photo" onPress={photo} busy={cap.busy === 'photo'} disabled={stopping || recordingVoice} />
            <Button
              testID="cap-voice"
              style={styles.cap}
              tall
              variant={recordingVoice ? 'danger' : 'secondary'}
              label={recordingVoice ? `Recording voice, ${formatElapsed(now - cap.voiceStartedAt!)}. Stop` : 'Voice'}
              onPress={async () => {
                if (await cap.toggleVoice()) tapFeedback();
              }}
              busy={cap.busy === 'voice'}
              disabled={stopping}
            >
              {recordingVoice ? (
                <Text style={styles.voiceLive}>● {formatElapsed(now - cap.voiceStartedAt!)} · Stop</Text>
              ) : undefined}
            </Button>
            <Button testID="cap-note" style={styles.cap} tall variant="secondary" label="Note" onPress={() => setNoteOpen(true)} disabled={stopping} />
          </View>
        </View>
      </View>

      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        {/* Every way out keeps the draft; only Save clears it. */}
        <Pressable style={styles.modalBack} onPress={() => setNoteOpen(false)} accessibilityLabel="Close note">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalWrap, { paddingTop: insets.top + 56 }]}>
            <Pressable style={styles.modal} onPress={() => {}} accessible={false}>
              <Text style={styles.modalTitle} accessibilityRole="header">A line about here</Text>
              <TextInput
                testID="note-input"
                autoFocus
                multiline
                value={note}
                onChangeText={setNote}
                placeholder="What caught your eye?"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Note"
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={saveNote}
                maxLength={500}
                style={styles.input}
              />
              <View style={styles.modalRow}>
                <Button variant="ghost" label="Close" onPress={() => setNoteOpen(false)} />
                <Button testID="note-save" label="Save" onPress={saveNote} busy={cap.busy === 'text'} disabled={!note.trim()} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { position: 'absolute', left: 12, right: 12, gap: 8, alignItems: 'flex-start', maxWidth: 640, alignSelf: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.line,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  pillStrong: { color: theme.ink, fontWeight: '700', fontSize: 15 },
  pillText: { color: theme.ink, fontWeight: '500', fontSize: 15, fontVariant: ['tabular-nums'] },
  toast: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, alignSelf: 'center' },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  bar: { backgroundColor: theme.bg, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderColor: theme.line },
  barInner: { gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  stopRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  stop: { paddingHorizontal: 22 },
  captureRow: { flexDirection: 'row', gap: 12 },
  cap: { flex: 1 },
  voiceLive: { color: '#ffffff', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalWrap: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 16 },
  modal: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: { minHeight: 90, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 10, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
