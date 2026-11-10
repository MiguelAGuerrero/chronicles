import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo, BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bandLayout, momentToast } from '../lib/captureBand';
import { feedback } from '../lib/motion';
import { space } from '../lib/space';
import { heldLabel } from '../lib/space/core';
import type { Capture, LngLat } from '../lib/types';
import { useCaptures, type MomentState } from '../lib/useCaptures';
import { Modal } from './Modal';
import { SpaceLine } from './SpaceLine';
import { EditOfferPill, useEditOffer } from './edit/EditOffer';
import { MediaEditor } from './edit/MediaEditor';
import { CaptureStack } from './walk/CaptureStack';
import { useStackLayout } from './walk/layout';
import { Button, LiftIn, theme } from './ui';

/** The open walk a moment from the band files into (HC10), with where the walk last was. */
export interface BandWalk {
  id: string;
  here: LngLat | null;
  lastFixAt: number | null;
}

/**
 * Camera, mic and pencil on the ready screen (M1, NR9) and on Chronicle's Memories (HC6): a moment in
 * one tap. With no walk open, each moment asks for one fix as it is begun and is kept at once; the toast
 * says where it landed when the fix comes, or "No location" (M2). Given an open walk (Memories with a
 * walk minimized, HC10), it keeps the walk's own captures instead, as the recording bar's camera does.
 */
export function MomentBar(props: {
  disabled?: boolean;
  /** A moment was kept ('kept', at once), then placed or not. */
  onMoment: (c: Capture, state: MomentState) => void;
  onError: (e: { message: string; openSettings?: boolean }) => void;
  /** Reports whether a memo is recording, so the home can hide what would cut it short. */
  onRecording?: (on: boolean) => void;
  /** Whether the tab is in front: leaving it mid-memo saves the memo (tabs audit 3). */
  focused?: boolean;
  /** `band` on Memories (HC6, HC7); the walk screen's stack otherwise. */
  layout?: 'stack' | 'band';
  /** The ids' prefix: `moment` on the ready screen, `band` on Memories. */
  idPrefix?: string;
  /** Names for a screen reader (HC8); the ready screen's by default. */
  labels?: { photo: string; voice: string; note: string };
  /** An open walk to file into (HC10), or none for moments of their own. */
  walk?: BandWalk | null;
  /** What the screen says above the band (an error, its own Undo): first in the pills' column (audit 2, 3). */
  above?: ReactNode;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const { onMoment, walk } = props;
  const cap = useCaptures(walk?.id ?? null, walk?.here ?? null, walk?.lastFixAt ?? null, props.onError, {
    loose: !walk,
    onMoment: (c, state) => {
      // The toast waits for the place; the lists hear of the moment at once (audit).
      if (state !== 'kept') setToast(momentToast(c.kind, 'loose', state === 'placed' ? undefined : state));
      onMoment(c, state);
    },
  });
  // Navigate, ready, or Memories shown: the room left (SA3) and the web's request; a walk's band says it is recording (SA10).
  const { focused } = props;
  const recording = !!walk;
  useEffect(() => {
    if (focused !== false) void space.check({ recording });
  }, [focused, recording]);
  // A walk's capture is never a loose moment: it says it went to the walk, at once (HC10, HC15).
  const onKept = walk ? (kind: Capture['kind']) => setToast(momentToast(kind, 'walk')) : undefined;
  return (
    <CaptureRow
      cap={cap}
      toast={toast}
      setToast={setToast}
      disabled={props.disabled}
      onRecording={props.onRecording}
      focused={props.focused}
      layout={props.layout}
      idPrefix={props.idPrefix}
      labels={props.labels}
      onKept={onKept}
      above={props.above}
    />
  );
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
  layout?: 'stack' | 'band';
  idPrefix?: string;
  labels?: { photo: string; voice: string; note: string };
  /** A capture was kept (after its tap): a walk's band says where it went (HC10). */
  onKept?: (kind: Capture['kind']) => void;
  /** Said above this row's own pills, in the same column, so nothing covers anything (audit 2, 3). */
  above?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const at = useStackLayout();
  const { width } = useWindowDimensions();
  const band = props.layout === 'band';
  const p = props.idPrefix ?? 'moment';
  // Pills and toasts sit above the band on Memories (HC15), left of the stack on the walk screen (NR10).
  const pillsAt = band ? { left: 16, right: 16, bottom: bandLayout(width).height + 12, alignItems: 'center' as const } : at.pills;
  const { cap, toast, setToast } = props;
  const [noteOpen, setNoteOpen] = useState(false);
  // After a photo or video, Edit is offered for a few seconds (ME23).
  const editOffer = useEditOffer();
  const [editingKept, setEditingKept] = useState<Capture | null>(null);
  const [note, setNote] = useState('');
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

  const { onKept } = props;
  const saved = (kind: Capture['kind']) => {
    feedback('tap');
    onKept?.(kind);
  };
  const saveNote = async () => {
    if (await cap.saveNote(note)) {
      setNote('');
      setNoteOpen(false);
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

  return (
    <>
      {/* Pills and the toast: left of the stack, above the strip, so the stack never moves (NR10). */}
      <View style={[styles.pills, pillsAt]} pointerEvents="box-none">
        {props.above}
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
        {/* Only on the screen in front: Memories' band stays mounted under Navigate, ready (decision 0112). */}
        {!recording && props.focused !== false && <SpaceLine />}
      </View>
      <CaptureStack
        layout={props.layout}
        ids={{ photo: `${p}-photo`, voice: `${p}-voice`, note: `${p}-note`, save: `${p}-voice-save`, discard: `${p}-voice-discard`, timer: `${p}-voice-timer` }}
        labels={props.labels ?? READY_LABELS}
        voiceStartedAt={cap.voiceStartedAt}
        busy={cap.busy}
        disabled={props.disabled}
        onPhoto={() =>
          cap.takePhoto().then((k) => {
            if (!k) return;
            saved(k.kind);
            editOffer.show(k);
          })
        }
        onVoice={() => cap.startVoice().then((ok) => ok && feedback('tap'))}
        onSave={saveVoice}
        onDiscard={() => cap.discardVoice()}
        onNote={() => setNoteOpen(true)}
      />

      {editingKept && (
        <MediaEditor key={editingKept.id} capture={editingKept} initialTool="crop" onClose={() => setEditingKept(null)} onSave={(patch) => cap.setEdit(editingKept.id, patch)} />
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
