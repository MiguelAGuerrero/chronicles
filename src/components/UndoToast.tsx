import { useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { toastText } from '../lib/deletion/core';
import { deletions } from '../lib/deletion';
import { usePendingState } from '../lib/deletion/useDeletions';
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
 * "Walk deleted · Undo" for 5 s (D5), or "Couldn't delete" after a failure
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
  if (top !== id || (!st.pending && !st.error)) return null;
  return (
    <View style={[styles.wrap, props.style]} pointerEvents="box-none">
      <LiftIn style={styles.pill} testID="undo-toast" accessibilityLiveRegion="polite">
        {st.pending ? (
          <>
            <Text style={styles.text}>{toastText(st.pending.kind)}</Text>
            <Pressable testID="undo" accessibilityRole="button" accessibilityLabel="Undo" onPress={() => deletions.undo()} hitSlop={8} style={styles.undo}>
              <Text style={styles.undoText}>Undo</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.text}>{st.error}</Text>
        )}
      </LiftIn>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 30 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingLeft: 18, paddingRight: 8, borderRadius: 24,
    backgroundColor: theme.ink, maxWidth: 608,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  text: { color: '#ffffff', fontSize: 15, fontWeight: '600', flexShrink: 1, paddingVertical: 12, paddingRight: 10 },
  undo: { minHeight: 40, minWidth: 64, paddingHorizontal: 14, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  undoText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
