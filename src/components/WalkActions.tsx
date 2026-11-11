import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { db } from '../lib/db';
import { deleteWalk, planWalk, removeWalkMedia, type WalkPlan } from '../lib/deletion';
import type { DeleteKind } from '../lib/deletion/core';
import { EPILOGUE_MAX, renamePatch, TITLE_MAX } from '../lib/rename';
import { shareLogText, walkLogText } from '../lib/shareLog';
import { suggestTitle } from '../lib/summary';
import { ConfirmCard } from './ConfirmCard';
import { Icon } from './icons';
import { Modal } from './Modal';
import { Button, theme } from './ui';

export type RenamePatch = { title: string; epilogue: string | null };

/**
 * A finished walk's actions: rename it (QL22, in the same sheet: never a
 * second Modal), share its GPS log, remove its photos, videos and memos, or
 * delete it (D1, D2). Each delete asks first (D4); the Undo pill follows (D5).
 */
export function WalkActions(props: {
  walkId: string | null;
  onClose: () => void;
  onDone?: (kind: Extract<DeleteKind, 'walk' | 'media'>) => void;
  /** After a rename reached storage, so the screen shows it at once (QL23). */
  onRenamed?: (walkId: string, patch: RenamePatch) => void;
}) {
  const [plan, setPlan] = useState<WalkPlan | null>(null);
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState<'walk' | 'media' | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState('');
  const [epilogue, setEpilogue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // The GPS log, read when the sheet opens: a browser opens the share sheet only straight from a tap.
  const logText = useRef<string | null>(null);
  // The title's Next goes on to the line (tend chronicle 5).
  const lineInput = useRef<ComponentRef<typeof TextInput>>(null);
  const [logNote, setLogNote] = useState<string | null>(null);
  const { walkId } = props;

  useEffect(() => {
    if (!walkId) return;
    let live = true;
    planWalk(walkId)
      .then((p) => {
        if (!live) return;
        setPlan(p);
        setFailed(!p);
        if (p) void walkLogText(walkId, p.walk.started_at).then((text) => {
          if (live) logText.current = text;
        }, () => {});
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      setPlan(null);
      setFailed(false);
      setAsking(null);
      setRenaming(false);
      setSaving(false);
      setSaveError(false);
      setLogNote(null);
      logText.current = null;
    };
  }, [walkId]);
  // Every raw reading, to look into a problem once the walk has ended (the owner, Nov 3).
  const shareLog = () => {
    const text = logText.current;
    if (!text) {
      setLogNote('Still reading it. Try again in a moment.');
      return;
    }
    void shareLogText(text).then((how) => {
      if (how === 'copied') setLogNote('Copied. Paste it in a message.');
      else if (how === 'failed' && Platform.OS === 'web') setLogNote('Couldn’t share or copy it.');
    });
  };

  // Escape and Back step out of the confirm or the editor first, then the sheet (QL22).
  const close = () => {
    if (asking) setAsking(null);
    else if (renaming) {
      if (!saving) setRenaming(false);
    } else props.onClose();
  };
  const startRename = () => {
    if (!plan) return;
    setTitle(plan.walk.title ?? suggestTitle(plan.walk));
    setEpilogue(plan.walk.epilogue ?? '');
    setSaveError(false);
    setRenaming(true);
  };
  const saveRename = async () => {
    if (!plan || !walkId || saving) return;
    const patch = renamePatch(plan.walk, title, epilogue);
    setSaving(true);
    setSaveError(false);
    try {
      await db.updateWalk(walkId, patch);
    } catch {
      setSaving(false);
      setSaveError(true);
      return;
    }
    props.onRenamed?.(walkId, patch);
    props.onClose();
  };
  // Escape on the web reaches `close` once, through the Modal's onRequestClose (react-native-web's ModalContent
  // listens on keyup). Closing on keydown as well stepped out of the editor and then, on the keyup, out of the
  // sheet too (tend chronicle 4). The keydown is only kept from the sheet beneath, which lowers on it. Until the
  // Modal has shown (its fade, 250 ms) it sends no Escape, so the keydown closes it then (tend chronicle audit 2).
  const shown = useRef(false);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!walkId || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      if (!shown.current) closeRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      shown.current = false;
    };
  }, [walkId]);
  const confirm = () => {
    if (!plan || !asking) return;
    if (asking === 'walk') deleteWalk(plan);
    else removeWalkMedia(plan);
    const kind = asking;
    props.onClose();
    props.onDone?.(kind);
  };

  return (
    <Modal visible={!!walkId} transparent animationType="fade" onRequestClose={close} onShow={() => {
      shown.current = true;
    }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.back}>
        <Pressable style={StyleSheet.absoluteFill} onPress={renaming ? close : props.onClose} accessible={false} />
        {!asking && !renaming && (
          <View style={styles.sheet} testID="walk-actions" accessibilityViewIsModal>
            {plan ? (
              <>
                <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>{plan.walk.title ?? suggestTitle(plan.walk)}</Text>
                <Pressable
                  testID="action-rename"
                  accessibilityRole="button"
                  accessibilityHint="The title and its one line"
                  onPress={startRename}
                  style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                >
                  <Icon name="pencil-outline" size={22} color={theme.ink} />
                  <View style={styles.itemText}>
                    <Text style={styles.itemLabel}>Rename</Text>
                    <Text style={styles.itemHint}>The title and its one line</Text>
                  </View>
                </Pressable>
                <Pressable
                  testID="action-gps-log"
                  accessibilityRole="button"
                  accessibilityLabel="Share this walk’s GPS log, to help fix location problems"
                  onPress={shareLog}
                  style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                >
                  <Icon name="share-outline" size={22} color={theme.ink} />
                  <View style={styles.itemText}>
                    <Text style={styles.itemLabel}>Share GPS log</Text>
                    <Text style={styles.itemHint} accessibilityLiveRegion="polite">{logNote ?? 'Every location reading, to look into a problem'}</Text>
                  </View>
                </Pressable>
                {plan.mediaText && (
                  <Pressable testID="action-media" accessibilityRole="button" onPress={() => setAsking('media')} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                    <Icon name="images-outline" size={22} color={theme.ink} />
                    <View style={styles.itemText}>
                      <Text style={styles.itemLabel}>Remove photos, videos and memos</Text>
                      <Text style={styles.itemHint}>Keeps the walk, its notes and its streets</Text>
                    </View>
                  </Pressable>
                )}
                <Pressable testID="action-delete" accessibilityRole="button" onPress={() => setAsking('walk')} style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                  <Icon name="trash-outline" size={22} color={theme.danger} />
                  <View style={styles.itemText}>
                    <Text style={[styles.itemLabel, { color: theme.danger }]}>Delete walk</Text>
                    <Text style={styles.itemHint}>Its trace, moments and streets walked</Text>
                  </View>
                </Pressable>
              </>
            ) : failed ? (
              <Text style={styles.itemHint}>This walk can’t be changed right now.</Text>
            ) : (
              <ActivityIndicator color={theme.ink} accessibilityLabel="Loading" />
            )}
            {/* In every state, so a slow or failed read never traps a screen reader (UI review). */}
            <Pressable testID="actions-cancel" accessibilityRole="button" onPress={props.onClose} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
        {renaming && plan && !asking && (
          <View style={styles.sheet} testID="rename-editor" accessibilityViewIsModal>
            <Text style={styles.title} accessibilityRole="header">Rename this walk</Text>
            <Text style={styles.label} nativeID="rename-title-label">Name this walk</Text>
            <TextInput
              testID="rename-title"
              value={title}
              onChangeText={setTitle}
              accessibilityLabel="Name this walk"
              accessibilityLabelledBy="rename-title-label"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => lineInput.current?.focus()}
              maxLength={TITLE_MAX}
              autoFocus
              selectTextOnFocus
              style={styles.input}
            />
            <Text style={styles.label} nativeID="rename-epilogue-label">One line, while the feeling is fresh</Text>
            <TextInput
              ref={lineInput}
              testID="rename-epilogue"
              value={epilogue}
              onChangeText={setEpilogue}
              accessibilityLabel="One line, while the feeling is fresh"
              accessibilityLabelledBy="rename-epilogue-label"
              placeholder="e.g. The bakery was closed, the river was not."
              placeholderTextColor={theme.muted}
              returnKeyType="done"
              onSubmitEditing={saveRename}
              maxLength={EPILOGUE_MAX}
              style={styles.input}
            />
            {saveError ? <Text style={styles.error} accessibilityRole="alert">Couldn’t save. Try again.</Text> : null}
            <Button testID="rename-save" label="Save" onPress={saveRename} busy={saving} busyLabel="Saving…" style={styles.save} />
            <Pressable
              testID="rename-cancel"
              accessibilityRole="button"
              disabled={saving}
              onPress={close}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
        {asking && plan && (
          <ConfirmCard
            testID="confirm"
            text={asking === 'walk' ? plan.walkText : plan.mediaText!}
            onCancel={() => setAsking(null)}
            onConfirm={confirm}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%', maxWidth: 640, backgroundColor: theme.bg, borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28, gap: 6, minHeight: 120, justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: theme.ink, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 12, borderRadius: theme.radius, backgroundColor: theme.surface },
  itemText: { flex: 1, paddingVertical: 8 },
  itemLabel: { fontSize: 16, fontWeight: '600', color: theme.ink },
  itemHint: { fontSize: 14, color: theme.muted, marginTop: 2 },
  pressed: { opacity: 0.6 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { fontSize: 16, fontWeight: '600', color: theme.ink },
  // As the first replay's Name it fields.
  label: { fontSize: 14, fontWeight: '600', color: theme.muted, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: theme.edge, borderRadius: 10, padding: 12, fontSize: 16, color: theme.ink },
  error: { fontSize: 14, color: theme.danger },
  save: { marginTop: 8 },
});
