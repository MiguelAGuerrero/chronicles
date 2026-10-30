import { router, useLocalSearchParams } from 'expo-router';
import { forwardRef, useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo, Animated, BackHandler, Easing, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WalkMap } from '../components/map/WalkMap';
import { CaptureViewer } from '../components/CaptureView';
import { Icon, type IconName } from '../components/icons';
import { Banner, Button, HoldButton, theme } from '../components/ui';
import { db } from '../lib/db';
import { focusOn } from '../lib/focus';
import { boundsOf } from '../lib/geo';
import { successFeedback, tapFeedback } from '../lib/haptics';
import { recorder } from '../lib/recorder';
import type { RecorderStatus } from '../lib/recorder/types';
import { stopWalk } from '../lib/session';
import { formatDistance, formatDuration, formatElapsed } from '../lib/summary';
import type { Capture, StreetSegment, Walk } from '../lib/types';
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
  // The memo whose save failed at Stop; holding Stop again ends the walk without it.
  const giveUpMemo = useRef(false);
  const saveRef = useRef<PressableRef>(null);

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

  const [viewing, setViewing] = useState<Capture[] | null>(null);

  async function stop() {
    if (!walk || stopping) return;
    setStopping(true);
    try {
      // Waits for any voice action in flight (a start, a save) before ending.
      const r = await cap.finishVoice();
      if ((r === 'failed' || cap.unsaved) && !giveUpMemo.current) {
        giveUpMemo.current = true;
        setNotice({ message: 'The voice memo could not be saved. Retry, or hold Stop again to end the walk without it.', tone: 'error', sticky: true });
        return;
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
    const kept = await cap.takePhoto();
    if (!kept) return;
    tapFeedback();
    setToast(kept === 'video' ? 'Video saved here' : 'Photo saved here');
  }

  async function startVoice() {
    if (await cap.startVoice()) {
      tapFeedback();
      giveUpMemo.current = false;
      AccessibilityInfo.announceForAccessibility('Recording voice memo');
    }
  }

  async function saveVoice() {
    const r = await cap.finishVoice();
    if (r === 'saved') {
      tapFeedback();
      setToast('Voice memo saved here');
      AccessibilityInfo.announceForAccessibility('Voice memo saved');
    } else if (r === 'dropped') {
      setToast('Too short, not kept');
      AccessibilityInfo.announceForAccessibility('Too short, not kept');
    }
  }

  async function discardVoice() {
    if ((await cap.discardVoice()) === 'discarded') AccessibilityInfo.announceForAccessibility('Voice memo discarded. Undo is available.');
  }

  // While a memo records, Android's back button does nothing, and the web
  // warns before a reload or close; leaving would cut the memo short.
  const recordingNow = cap.voiceStartedAt != null;
  useEffect(() => {
    if (!recordingNow) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    if (Platform.OS === 'web') window.addEventListener('beforeunload', warn);
    // Focus moves to Save, which replaced the mic the person just tapped.
    const t = setTimeout(() => focusOn(saveRef), 300);
    return () => {
      sub.remove();
      clearTimeout(t);
      if (Platform.OS === 'web') window.removeEventListener('beforeunload', warn);
    };
  }, [recordingNow]);

  const elapsed = walk ? now - walk.started_at : 0;
  const weak = status.kind === 'recording' && live.lastFixAt != null && now - live.lastFixAt > WEAK_GPS_MS;
  // The growing trace says it is recording; the status only shows when it is not.
  const problem =
    status.kind === 'error' ? { label: 'Not recording', color: theme.danger }
    : status.kind === 'waiting' || status.kind === 'idle' ? { label: 'Waiting for GPS', color: theme.warn }
    : weak ? { label: 'Weak GPS', color: theme.warn }
    : null;
  const recordingVoice = cap.voiceStartedAt != null;
  const statsLabel = `${formatDuration(elapsed)} walked, ${formatDistance(live.distanceM)}`;

  return (
    <View style={styles.screen}>
      <WalkMap
        trace={live.runs}
        walked={walked}
        fog={fog}
        captures={cap.captures}
        // Opening a capture would hide a memo that is still recording.
        onPinPress={recordingVoice || stopping ? undefined : setViewing}
        walker={live.here}
        follow={live.here}
        initialCenter={live.here ?? undefined}
        initialZoom={16}
      />

      <View style={[styles.top, { top: insets.top + 12 }]} pointerEvents="box-none">
        {problem && (
          <View style={styles.chip} accessible accessibilityLabel={problem.label} accessibilityLiveRegion="polite">
            <View style={[styles.statusDot, { backgroundColor: problem.color }]} />
            <Text style={styles.chipText}>{problem.label}</Text>
          </View>
        )}
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

      {/* Captures float in the lower-middle of the screen, where either thumb
          reaches; the bottom edge is the least accurate place to tap. */}
      <View style={[styles.captures, { bottom: insets.bottom + 92 }]} pointerEvents="box-none">
        {recordingVoice && (
          <View style={styles.voiceLive} accessible accessibilityLabel="Recording voice memo">
            <PulseDot />
            <Text style={styles.voiceLiveText}>{formatElapsed(now - cap.voiceStartedAt!)}</Text>
          </View>
        )}
        {/* While recording, Save takes the mic's own place, so tapping the mic
            again saves; Discard is smaller and set apart from it. */}
        <View style={styles.captureRow}>
          <View style={styles.slot}>
            {recordingVoice ? (
              <RoundButton
                testID="voice-discard"
                icon="trash-outline"
                label="Discard voice memo"
                hint="Throws this recording away. You can undo for a few seconds."
                onPress={discardVoice}
                small
              />
            ) : (
              <RoundButton testID="cap-photo" icon="camera" label="Take a photo or video" onPress={photo} busy={cap.busy === 'photo'} disabled={stopping || cap.busy === 'voice'} />
            )}
          </View>
          <View style={styles.slot}>
            {recordingVoice ? (
              <RoundButton
                ref={saveRef}
                testID="voice-save"
                icon="stop"
                label="Stop and save voice memo"
                onPress={saveVoice}
                tone="voice"
                busy={cap.busy === 'voice'}
              />
            ) : (
              <RoundButton
                testID="cap-voice"
                icon="mic"
                label="Record a voice memo"
                onPress={startVoice}
                busy={cap.busy === 'voice'}
                disabled={stopping}
              />
            )}
          </View>
          <View style={styles.slot}>
            {!recordingVoice && (
              <RoundButton testID="cap-note" icon="document-text" label="Write a note" onPress={() => setNoteOpen(true)} disabled={stopping} />
            )}
          </View>
        </View>
        {cap.discarded && !recordingVoice && (
          <View style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>Voice memo discarded</Text>
            <Pressable testID="voice-undo" accessibilityRole="button" onPress={() => cap.undoDiscard()} hitSlop={10} style={styles.undoBtn}>
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          </View>
        )}
        {cap.unsaved && !recordingVoice && (
          <View style={styles.undo} accessibilityLiveRegion="polite">
            <Text style={styles.undoText}>Voice memo not saved</Text>
            <Pressable accessibilityRole="button" onPress={() => cap.retrySave()} hitSlop={10} style={styles.undoBtn}>
              <Text style={styles.undoBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={[styles.bar, { paddingBottom: 10 + insets.bottom }]}>
        <View style={styles.barInner}>
          <Text style={styles.stats} accessibilityLabel={statsLabel}>
            {formatElapsed(elapsed)} · {formatDistance(live.distanceM)}
          </Text>
          <HoldButton
            testID="stop"
            label="Hold to stop"
            busyLabel="Stopping…"
            onHold={stop}
            onTap={() => setToast('Hold to stop the walk')}
            busy={stopping}
            disabled={!walk}
          >
            <View style={styles.stopInner}>
              <Icon name="stop" size={18} color={theme.ink} />
              <Text style={styles.stopText}>Hold</Text>
            </View>
          </HoldButton>
        </View>
      </View>

      <CaptureViewer key={viewing?.[0]?.id ?? 'none'} captures={viewing} onClose={() => setViewing(null)} />

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

/** A large round icon button; the label is what screen readers say. */
type PressableRef = ComponentRef<typeof Pressable>;

const RoundButton = forwardRef<PressableRef, {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
  tone?: 'light' | 'voice';
  small?: boolean;
  busy?: boolean;
  disabled?: boolean;
  testID?: string;
}>(function RoundButton(props, ref) {
  const voice = props.tone === 'voice';
  const inactive = props.disabled || props.busy;
  return (
    <Pressable
      ref={ref}
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityHint={props.hint}
      accessibilityState={{ disabled: !!inactive, busy: !!props.busy }}
      disabled={inactive}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.round,
        props.small && styles.roundSmall,
        voice && styles.roundVoice,
        inactive && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={props.icon} size={props.small ? 24 : 30} color={voice ? '#ffffff' : theme.ink} />
    </Pressable>
  );
});

/** The recording light: pulses, unless reduced motion is on. */
function PulseDot() {
  const [o] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(o, { toValue: 0.3, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(o, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        ]),
      );
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, [o]);
  return <Animated.View style={[styles.recDot, { opacity: o }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { position: 'absolute', left: 12, right: 12, gap: 8, alignItems: 'center', maxWidth: 640, alignSelf: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.line,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { color: theme.ink, fontWeight: '600', fontSize: 14 },
  toast: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, alignSelf: 'center' },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  captures: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 12 },
  captureRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  slot: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center' },
  round: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  roundSmall: { width: 52, height: 52, borderRadius: 26 },
  roundVoice: { backgroundColor: '#6b21a8', borderColor: '#6b21a8' },
  undo: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.ink, borderRadius: 999,
    paddingVertical: 8, paddingLeft: 16, paddingRight: 8,
  },
  undoText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  undoBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  undoBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  voiceLive: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.line,
  },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.danger },
  voiceLiveText: { color: theme.ink, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bar: { backgroundColor: theme.bg, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderColor: theme.line },
  barInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 640, width: '100%', alignSelf: 'center' },
  stats: { color: theme.ink, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  stopInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stopText: { color: theme.ink, fontSize: 15, fontWeight: '600' },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalWrap: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 16 },
  modal: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: { minHeight: 90, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 10, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
