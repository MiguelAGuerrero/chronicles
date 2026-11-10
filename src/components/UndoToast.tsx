import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { dismissLabel, toastText } from '../lib/deletion/core';
import { deletions } from '../lib/deletion';
import { usePendingState } from '../lib/deletion/useDeletions';
import { Icon } from './icons';
import { LiftIn, theme } from './ui';

// One pill shows at a time, in the newest host: a screen, or the capture
// viewer over it (on a phone a Modal hides whatever the screen draws).
let hosts: number[] = [];
let nextHost = 1;
const hostListeners = new Set<() => void>();
const topHost = () => hosts[hosts.length - 1] ?? 0;
const subscribeHosts = (fn: () => void) => {
  hostListeners.add(fn);
  return () => {
    hostListeners.delete(fn);
  };
};
const setHosts = (next: number[]) => {
  hosts = next;
  for (const l of [...hostListeners]) l();
};

/**
 * "Walk deleted · Undo · Close" until the owner taps one (UC1), or "Couldn't delete" after a failure
 * (D6). Every screen that can delete renders one; only the newest shows.
 */
export function UndoToast(props: { style?: StyleProp<ViewStyle> }) {
  const [id] = useState(() => nextHost++);
  useEffect(() => {
    setHosts([...hosts, id]);
    return () => setHosts(hosts.filter((h) => h !== id));
  }, [id]);
  const top = useSyncExternalStore(subscribeHosts, topHost, topHost);
  const st = usePendingState();
  const mine = top === id;
  // A failure is told even while a newer delete waits (deletion audit 10).
  const text = st.error ?? (st.pending ? toastText(st.pending.kind, st.pending.what) : null);
  // iOS reads no live regions: the pill is announced, with its Undo (UI review).
  useEffect(() => {
    if (!mine || !text || Platform.OS !== 'ios') return;
    AccessibilityInfo.announceForAccessibility(st.pending && !st.error ? `${text}. Undo is available.` : text);
  }, [mine, text, st.pending, st.error]);
  if (!mine || !text) return null;
  return (
    <View style={[styles.wrap, props.style]} pointerEvents="box-none">
      <LiftIn style={styles.pill} testID="undo-toast" accessibilityLiveRegion="polite">
        <Text style={styles.text}>{text}</Text>
        {st.pending && (
          // Undo waits for the owner (UC1): Undo takes it back, Close lets it stand and stores it now (UC2, UC3).
          <View style={styles.actions}>
            <Pressable testID="undo" accessibilityRole="button" accessibilityLabel="Undo" onPress={() => deletions.undo()} style={styles.undo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
            <Pressable testID="undo-dismiss" accessibilityRole="button" accessibilityLabel={dismissLabel(st.pending.kind)} onPress={() => void deletions.dismiss()} style={styles.dismiss}>
              <Icon name="close" size={20} color="rgba(255,255,255,0.75)" />
            </Pressable>
          </View>
        )}
      </LiftIn>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 30 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingLeft: 16, paddingRight: 8, borderRadius: 24,
    backgroundColor: theme.ink, maxWidth: 608,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  text: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1, paddingVertical: 12, paddingRight: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  undo: { minHeight: 44, minWidth: 72, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  dismiss: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  undoText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
