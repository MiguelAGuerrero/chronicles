import { useEffect, useRef } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { stretchLines, type Stretch } from '../lib/gaps/infer';
import { Icon } from './icons';
import { Button, theme } from './ui';

/**
 * A stretch across a gap, tapped (Filling gaps, G9): what it is, and Keep or
 * Not this way. An offered stretch has both; one filled by itself or kept has
 * Not this way. ✕, Back (Android) and Escape (web) close it; so does a map
 * tap, which the screen handles.
 */
export function GapCard(props: {
  stretch: Stretch;
  onKeep: () => void;
  onDismiss: () => void;
  onClose: () => void;
  busy?: boolean;
  /** Why the last Keep or Not this way didn't save, if it didn't. */
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const { title, sub } = stretchLines(props.stretch);
  const close = useRef(props.onClose);
  useEffect(() => {
    close.current = props.onClose;
  }, [props.onClose]);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close.current();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, []);
  const offered = props.stretch.how === 'offer';
  return (
    <View style={[styles.row, props.style]} pointerEvents="box-none">
      <View testID="gap-card" style={styles.card} accessibilityViewIsModal>
        <Text testID="gap-title" style={styles.title} accessibilityRole="header">{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
        {props.error ? <Text testID="gap-error" style={styles.error} accessibilityLiveRegion="polite">{props.error}</Text> : null}
        <View style={styles.actions}>
          {offered && <Button testID="gap-keep" label="Keep" onPress={props.onKeep} busy={props.busy} busyLabel="Saving…" />}
          <Button testID="gap-dismiss" variant="secondary" label="Not this way" onPress={props.onDismiss} disabled={props.busy} />
          <Pressable testID="gap-close" accessibilityRole="button" accessibilityLabel="Close" onPress={props.onClose} style={styles.close} hitSlop={8}>
            <Icon name="close" size={22} color={theme.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  card: {
    backgroundColor: theme.surface, borderRadius: theme.radius, padding: 14, gap: 10, width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.ink },
  sub: { fontSize: 14, color: theme.muted },
  error: { fontSize: 14, color: theme.danger },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  close: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
