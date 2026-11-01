import { useEffect, useState } from 'react';
import {
  AccessibilityInfo, BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedback } from '../lib/motion';
import { formatElapsed } from '../lib/summary';
import type { LocateResult } from '../lib/locate/types';
import type { Capture } from '../lib/types';
import { useCaptures, type MomentState } from '../lib/useCaptures';
import { Icon, type IconName } from './icons';
import { Modal } from './Modal';
import { Button, LiftIn, theme } from './ui';

/** What a moment's toast says once it is placed, or once no place came (M2). */
function momentToast(kind: Capture['kind'], reason?: LocateResult['reason']): string {
  const what = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' }[kind];
  if (!reason) return `${what} kept here`;
  return reason === 'denied' ? `${what} kept · No location (location is off)` : `${what} kept · No location`;
}

/**
 * Camera, mic and pencil on the home (M1): a moment in one tap, with no walk
 * open. Each moment asks for one fix as it is begun and is kept at once; the
 * toast says where it landed when the fix comes, or "No location" (M2).
 */
export function MomentBar(props: {
  disabled?: boolean;
  /** A moment was kept ('kept', at once), then placed or not. */
  onMoment: (c: Capture, state: MomentState) => void;
  onError: (e: { message: string; openSettings?: boolean }) => void;
  /** Reports whether a memo is recording, so the home can hide what would cut it short. */
  onRecording?: (on: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const cap = useCaptures(null, null, null, props.onError, {
    loose: true,
    onMoment: (c, state) => {
      // The toast waits for the place; the lists hear of the moment at once (audit).
      if (state !== 'kept') setToast(momentToast(c.kind, state === 'placed' ? undefined : state));
      props.onMoment(c, state);
    },
  });
  const recording = cap.voiceStartedAt != null;
  const { onRecording } = props;
  useEffect(() => {
    onRecording?.(recording);
  }, [recording, onRecording]);
  useEffect(() => {
    if (!toast) return;
    AccessibilityInfo.announceForAccessibility(toast);
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  // Android's back does nothing mid-memo, and the web warns before closing: leaving would cut it short.
  useEffect(() => {
    if (!recording) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('beforeunload', warn);
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('beforeunload', warn);
    };
  }, [recording]);

  const saveNote = async () => {
    if (await cap.saveNote(note)) {
      setNote('');
      setNoteOpen(false);
      feedback('tap');
    }
  };
  const saveVoice = async () => {
    const r = await cap.finishVoice();
    if (r === 'saved') feedback('tap');
    else if (r === 'dropped') setToast('Too short, not kept');
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {toast && (
        <LiftIn testID="moment-toast" style={styles.toast} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{toast}</Text>
        </LiftIn>
      )}
      {recording && (
        <View style={styles.live} accessible accessibilityLabel="Recording voice memo">
          <View style={styles.recDot} />
          <Elapsed from={cap.voiceStartedAt!} />
        </View>
      )}
      {cap.discarded && !recording && (
        <View style={styles.pill} accessibilityLiveRegion="polite">
          <Text style={styles.pillText}>Voice memo discarded</Text>
          <Pressable testID="moment-voice-undo" accessibilityRole="button" onPress={() => cap.undoDiscard()} hitSlop={10} style={styles.pillBtn}>
            <Text style={styles.pillBtnText}>Undo</Text>
          </Pressable>
        </View>
      )}
      {cap.unsaved && (
        <View style={styles.pill}>
          <Text style={styles.pillText}>Voice memo not saved</Text>
          <Pressable accessibilityRole="button" onPress={() => cap.retrySave()} hitSlop={10} style={styles.pillBtn}>
            <Text style={styles.pillBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.row}>
        {recording ? (
          <>
            <Round testID="moment-voice-discard" icon="trash-outline" label="Discard voice memo" onPress={() => cap.discardVoice()} />
            <Round testID="moment-voice-save" icon="stop" label="Stop and save voice memo" onPress={saveVoice} voice busy={cap.busy === 'voice'} />
          </>
        ) : (
          <>
            <Round
              testID="moment-photo"
              icon="camera"
              label="Keep a moment: take a photo or video"
              onPress={() => cap.takePhoto().then((k) => k && feedback('tap'))}
              busy={cap.busy === 'photo'}
              disabled={props.disabled || cap.busy === 'voice'}
            />
            <Round
              testID="moment-voice"
              icon="mic"
              label="Keep a moment: record a voice memo"
              onPress={() => cap.startVoice().then((ok) => ok && feedback('tap'))}
              busy={cap.busy === 'voice'}
              disabled={props.disabled}
            />
            <Round testID="moment-note" icon="document-text" label="Keep a moment: write a note" onPress={() => setNoteOpen(true)} disabled={props.disabled} />
          </>
        )}
      </View>

      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        {/* Every way out keeps the draft; only Save clears it. */}
        <Pressable style={styles.modalBack} onPress={() => setNoteOpen(false)} accessibilityLabel="Close note">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalWrap, { paddingTop: insets.top + 56 }]}>
            <Pressable style={styles.modal} onPress={() => {}} accessible={false}>
              <Text style={styles.modalTitle} accessibilityRole="header">Jot it down</Text>
              <TextInput
                testID="moment-note-input"
                autoFocus
                multiline
                value={note}
                onChangeText={setNote}
                placeholder="What’s worth remembering?"
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
                <Button testID="moment-note-save" label="Save" onPress={saveNote} busy={cap.busy === 'text'} disabled={!note.trim()} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

/** The memo's timer ticks in its own component, so the home doesn't re-render every second. */
function Elapsed({ from }: { from: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return <Text style={styles.liveText}>{formatElapsed(now - from)}</Text>;
}

function Round(props: { testID: string; icon: IconName; label: string; onPress: () => void; busy?: boolean; disabled?: boolean; voice?: boolean }) {
  const inactive = props.disabled || props.busy;
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!inactive, busy: !!props.busy }}
      disabled={inactive}
      onPress={props.onPress}
      style={({ pressed }) => [styles.round, props.voice && styles.roundVoice, inactive && styles.dim, pressed && styles.pressed]}
    >
      <Icon name={props.icon} size={24} color={props.voice ? '#ffffff' : theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  round: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: theme.edge,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  roundVoice: { backgroundColor: '#6b21a8', borderColor: '#6b21a8' },
  dim: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  toast: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, alignSelf: 'center' },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  live: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.line,
  },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.danger },
  liveText: { color: theme.ink, fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingLeft: 14, paddingRight: 6 },
  pillText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  pillBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  pillBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalWrap: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 16 },
  modal: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: { minHeight: 90, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 10, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
