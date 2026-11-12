import type { Faced } from '../lib/moment';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { momentToast } from '../lib/captureBand';
import { feedback } from '../lib/motion';
import { momentPill } from '../lib/momentPill';
import { useStore } from '../lib/useStore';
import { space } from '../lib/space';
import { heldLabel } from '../lib/space/core';
import type { Capture, LngLat } from '../lib/types';
import { useCaptures, type MomentState } from '../lib/useCaptures';
import { Modal } from './Modal';
import { SpaceLine } from './SpaceLine';
import { EditOfferPill, useEditOffer } from './edit/EditOffer';
import { MediaEditor } from './edit/MediaEditor';
import { AddToMomentPill } from './walk/AddToMomentPill';
import { CaptureStack } from './walk/CaptureStack';
import { useStackLayout } from './walk/layout';
import { Button, LiftIn, theme } from './ui';

/**
 * Camera, mic and pencil on the ready screen (M1, NR9): a moment in one tap. Each moment asks for one fix as it
 * is begun and is kept at once; the toast says where it landed when the fix comes, or "No location" (M2).
 * Chronicle's Memories keeps moments from its own open line (`components/journal/OpenLine`, decision 0151).
 */
export function MomentBar(props: {
  disabled?: boolean;
  /** A moment was kept ('kept', at once), then placed or not. */
  onMoment: (c: Faced, state: MomentState) => void;
  onError: (e: { message: string; openSettings?: boolean }) => void;
  /** Reports whether a memo is recording, so the home can hide what would cut it short. */
  onRecording?: (on: boolean) => void;
  /** Whether the tab is in front: leaving it mid-memo saves the memo (tabs audit 3). */
  focused?: boolean;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const { onMoment } = props;
  const cap = useCaptures(null, null, null, props.onError, {
    loose: true,
    // The pill (moment stacks, MS2, MS5): a new moment opens it; a piece keeps it.
    onKept: (id, piece) => (piece ? momentPill.piece(id) : momentPill.kept(id, false)),
    onMoment: (c, state) => {
      // The toast waits for the place; the lists hear of the moment at once (audit).
      if (state !== 'kept') setToast(momentToast(c.kind, state === 'placed' ? undefined : state));
      onMoment(c, state);
    },
  });
  // Navigate, ready: the room left (SA3) and the web's request.
  const { focused } = props;
  useEffect(() => {
    if (focused !== false) void space.check({ recording: false });
  }, [focused]);
  return <CaptureRow cap={cap} toast={toast} setToast={setToast} disabled={props.disabled} onRecording={props.onRecording} focused={props.focused} />;
}

const READY_LABELS = { photo: 'Keep a moment: take a photo or video', voice: 'Keep a moment: record a voice memo', note: 'Keep a moment: write a note' };

/** What useCaptures gives a capture row. */
export type CaptureControls = ReturnType<typeof useCaptures>;

/**
 * The moment's controls on the ready screen (NR9, NR10): the capture stack at
 * the right edge, its pills and toast left of it above the strip, and the
 * note's editor. Placed by the walk screen's own geometry, so Start leaves
 * every button where it was.
 */
export function CaptureRow(props: {
  cap: CaptureControls;
  toast: string | null;
  setToast: (t: string | null) => void;
  disabled?: boolean;
  onRecording?: (on: boolean) => void;
  focused?: boolean;
  idPrefix?: string;
  labels?: { photo: string; voice: string; note: string };
}) {
  const insets = useSafeAreaInsets();
  const at = useStackLayout();
  const p = props.idPrefix ?? 'moment';
  // Pills and toasts sit left of the stack on the walk screen (NR10).
  const pillsAt = at.pills;
  const { cap, toast, setToast } = props;
  const [noteOpen, setNoteOpen] = useState(false);
  // After a photo or video, Edit is offered for a few seconds (ME23).
  const editOffer = useEditOffer();
  const [editingKept, setEditingKept] = useState<Faced | null>(null);
  const [note, setNote] = useState('');
  // The open moment a note being written joins (MS2), or null for a new moment: fixed when the note was begun (MS4).
  const [noteInto, setNoteInto] = useState<string | null>(null);
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
  }, [toast, setToast]);
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

  const saved = (_kind: Capture['kind']) => {
    feedback('tap');
  };
  const saveNote = async () => {
    if (await cap.saveNote(note, noteInto)) {
      setNote('');
      setNoteOpen(false);
      setNoteInto(null);
      saved('text');
    }
  };
  const saveVoice = async () => {
    const r = await cap.finishVoice();
    if (r === 'saved') saved('voice');
    else if (r === 'dropped') setToast('Too short, not kept');
  };
  // The screen went mid-memo (the chevron, another tab): it is saved, as leaving the walk
  // screen saves one, never left recording under another screen (tabs audit 3).
  const saveRef = useRef(saveVoice);
  useEffect(() => {
    saveRef.current = saveVoice;
  });
  const { focused } = props;
  useEffect(() => {
    if (focused === false && recording) void saveRef.current();
  }, [focused, recording]);
  // Leaving the screen closes the pill (MS4).
  useEffect(() => {
    if (focused === false) momentPill.leave();
  }, [focused]);
  useEffect(() => () => momentPill.leave(), []);
  // The Group captures setting, as kept on the device (MS18).
  useEffect(() => {
    void momentPill.loadGrouping().catch(() => {});
  }, []);
  // The viewer's Add to this moment (MS12): run here, where the camera, the mic and the note are.
  const asked = useStore(momentPill.store, (st) => st.ask?.seq ?? 0);
  const onAsk = useRef<(kind: 'photo' | 'voice' | 'text') => void>(() => {});
  useEffect(() => {
    onAsk.current = (kind) => {
      const into = momentPill.target();
      if (kind === 'photo') void cap.takePhoto(into).then((k) => k && saved(k.kind));
      else if (kind === 'voice') void cap.startVoice(into).then((ok) => ok && feedback('tap'));
      else {
        setNoteInto(into);
        setNoteOpen(true);
      }
    };
  });
  useEffect(() => {
    const ask = momentPill.store.get().ask;
    if (!asked || !ask) return;
    momentPill.asked();
    onAsk.current(ask.kind);
  }, [asked]);

  return (
    <>
      {/* Pills and the toast: left of the stack, above the strip, so the stack never moves (NR10). */}
      <View style={[styles.pills, pillsAt]} pointerEvents="box-none">
        {editOffer.offer && !recording && (
          <EditOfferPill
            offer={editOffer.offer}
            where="moment"
            onEdit={() => {
              const id = editOffer.offer?.id;
              setEditingKept(cap.captures.find((c) => c.id === id) ?? null);
              editOffer.clear();
            }}
          />
        )}
        <AddToMomentPill
          hidden={recording || noteOpen}
          onPhoto={() => void cap.takePhoto(momentPill.target()).then((k) => k && saved(k.kind))}
          onVoice={() => void cap.startVoice(momentPill.target()).then((ok) => ok && feedback('tap'))}
          onNote={() => {
            setNoteInto(momentPill.target());
            setNoteOpen(true);
          }}
        />
        {toast && (
          <LiftIn testID={`${p}-toast`} style={styles.toast} accessibilityLiveRegion="polite">
            <Text style={styles.toastText}>{toast}</Text>
          </LiftIn>
        )}
        {cap.discarded && !recording && (
          <View style={styles.pill} accessibilityLiveRegion="polite">
            <Text style={styles.pillText}>Voice memo discarded</Text>
            <Pressable testID={`${p}-voice-undo`} accessibilityRole="button" onPress={() => cap.undoDiscard()} hitSlop={10} style={styles.pillBtn}>
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
        {cap.held.length > 0 && (
          <View testID="held-captures" style={styles.pill} accessibilityLiveRegion="polite">
            <Text style={styles.pillText}>{heldLabel(cap.held)}</Text>
            <Pressable testID="held-retry" accessibilityRole="button" onPress={() => cap.retryHeld()} hitSlop={10} style={styles.pillBtn}>
              <Text style={styles.pillBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}
        {/* Only on the screen in front. */}
        {!recording && props.focused !== false && <SpaceLine />}
      </View>
      <CaptureStack
        ids={{ photo: `${p}-photo`, voice: `${p}-voice`, note: `${p}-note`, save: `${p}-voice-save`, discard: `${p}-voice-discard`, timer: `${p}-voice-timer` }}
        labels={props.labels ?? READY_LABELS}
        voiceStartedAt={cap.voiceStartedAt}
        busy={cap.busy}
        disabled={props.disabled}
        onPhoto={() =>
          // With Group captures on, the edge adds to the open moment (MS19); off, a new moment (MS1).
          cap.takePhoto(momentPill.edgeTarget()).then((k) => {
            if (!k) return;
            saved(k.kind);
            if (k.id === k.momentId) editOffer.show(k);
          })
        }
        onVoice={() => cap.startVoice(momentPill.edgeTarget()).then((ok) => ok && feedback('tap'))}
        onSave={saveVoice}
        onDiscard={() => cap.discardVoice()}
        onNote={() => {
          setNoteInto(momentPill.edgeTarget());
          setNoteOpen(true);
        }}
      />

      {editingKept && (
        <MediaEditor key={editingKept.id} capture={editingKept} initialTool="crop" onClose={() => setEditingKept(null)} onSave={(patch) => cap.setEdit(editingKept, patch)} />
      )}

      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        {/* Every way out keeps the draft; only Save clears it. */}
        <Pressable style={styles.modalBack} onPress={() => setNoteOpen(false)} accessibilityLabel="Close note">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalWrap, { paddingTop: insets.top + 56 }]}>
            <Pressable style={styles.modal} onPress={() => {}} accessible={false}>
              <Text style={styles.modalTitle} accessibilityRole="header">Jot it down</Text>
              <TextInput
                testID={`${p}-note-input`}
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
                <Button testID={`${p}-note-save`} label="Save" onPress={saveNote} busy={cap.busy === 'text'} disabled={!note.trim()} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pills: { position: 'absolute', alignItems: 'flex-end', gap: 8 },
  toast: { backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  toastText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.ink, borderRadius: 999, paddingVertical: 6, paddingLeft: 14, paddingRight: 6 },
  pillText: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  pillBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  pillBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  modalBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalWrap: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 16 },
  modal: { backgroundColor: theme.surface, borderRadius: theme.radius, padding: 16, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: theme.ink },
  input: { minHeight: 90, borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 10, fontSize: 16, color: theme.ink, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
