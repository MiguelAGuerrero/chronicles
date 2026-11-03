import { useEffect, useRef } from 'react';
import { BackHandler, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { formatDistance } from '../lib/format';
import type { GapDrawing } from '../lib/gaps/useGapDraw';
import { Button, theme } from './ui';

/**
 * The bar while a gap's way is drawn (GW3-GW7): what to do, how far so far,
 * and Undo, Cancel and Done. Back (Android) and Escape (web) cancel.
 */
export function GapDraw(props: { drawing: GapDrawing; style?: StyleProp<ViewStyle> }) {
  const d = props.drawing;
  const cancel = useRef(d.cancel);
  useEffect(() => {
    cancel.current = d.cancel;
  }, [d.cancel]);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel.current();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancel.current();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, []);
  if (!d.gap) return null;
  const min = Math.max(1, Math.round((d.gap.t1 - d.gap.t0) / 60_000));
  const note = d.error
    ? d.error
    : d.unread
      ? 'Paths couldn’t be read here: taps join in straight lines.'
      : d.done?.fast
        ? `${formatDistance(d.done.lengthM)} is faster than walking in ${min} min.`
        : d.points
          ? `${d.points === 1 ? '1 point' : `${d.points} points`} · ${formatDistance(d.done?.lengthM ?? 0)} with the way to the end`
          : 'From where the trace stops. The line follows the paths between taps.';
  return (
    <View style={[styles.row, props.style]} pointerEvents="box-none">
      <View testID="gap-draw-bar" style={styles.bar} accessibilityViewIsModal>
        <Text style={styles.title} accessibilityRole="header">Tap along the way you walked</Text>
        <Text style={[styles.sub, (d.error || d.done?.fast) && styles.warn]} accessibilityLiveRegion="polite">{note}</Text>
        <View style={styles.actions}>
          <Button testID="gap-draw-undo" variant="secondary" label="Undo" onPress={d.undo} disabled={!d.points || d.saving} />
          <Button testID="gap-draw-cancel" variant="ghost" label="Cancel" onPress={d.cancel} disabled={d.saving} />
          <Button testID="gap-draw-done" label="Done" onPress={() => void d.finish()} busy={d.saving} busyLabel="Saving…" style={styles.done} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  bar: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 8, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 14, color: theme.muted },
  warn: { color: theme.danger },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  done: { marginLeft: 'auto' },
});
