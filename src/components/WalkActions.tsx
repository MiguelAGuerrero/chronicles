import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteWalk, planWalk, removeWalkMedia, type WalkPlan } from '../lib/deletion';
import type { DeleteKind } from '../lib/deletion/core';
import { suggestTitle } from '../lib/summary';
import { ConfirmCard } from './ConfirmCard';
import { Icon } from './icons';
import { Modal } from './Modal';
import { theme } from './ui';

/**
 * A finished walk's actions (D1, D2): remove its photos, videos and memos, or
 * delete it. Each asks first (D4); the Undo pill follows (D5).
 */
export function WalkActions(props: { walkId: string | null; onClose: () => void; onDone?: (kind: Extract<DeleteKind, 'walk' | 'media'>) => void }) {
  const [plan, setPlan] = useState<WalkPlan | null>(null);
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState<'walk' | 'media' | null>(null);
  const { walkId } = props;

  useEffect(() => {
    if (!walkId) return;
    let live = true;
    planWalk(walkId)
      .then((p) => {
        if (!live) return;
        setPlan(p);
        setFailed(!p);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      setPlan(null);
      setFailed(false);
      setAsking(null);
    };
  }, [walkId]);

  const close = () => (asking ? setAsking(null) : props.onClose());
  // Escape on the web: react-native-web's Modal doesn't send it to onRequestClose (e2e, Nov 1).
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!walkId || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // The sheet beneath keeps its own Escape for itself.
      e.stopImmediatePropagation();
      closeRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
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
    <Modal visible={!!walkId} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.back}>
        <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} accessible={false} />
        {!asking && (
          <View style={styles.sheet} testID="walk-actions" accessibilityViewIsModal>
            {plan ? (
              <>
                <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>{plan.walk.title ?? suggestTitle(plan.walk)}</Text>
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
        {asking && plan && (
          <ConfirmCard
            testID="confirm"
            text={asking === 'walk' ? plan.walkText : plan.mediaText!}
            onCancel={() => setAsking(null)}
            onConfirm={confirm}
          />
        )}
      </View>
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
});
