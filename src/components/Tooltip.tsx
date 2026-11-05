// @layer view
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MOTION } from '../lib/motionTokens';
import { theme } from './ui';

/**
 * A small popover beside what it wraps (WK22): hover or focus on the web, a tap or long press on a phone.
 * It closes on its own, on Escape, and on leaving. Inline, never a `Modal` (iOS cannot present a Modal over
 * a Modal). The words are the wrapped thing's accessible label too, so a screen reader needs no popover.
 */
export function Tooltip(props: { text: string; children: ReactNode; testID?: string; side?: 'above' | 'left' }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const close = useCallback(() => {
    clear();
    setOpen(false);
  }, []);
  const show = useCallback(() => {
    clear();
    setOpen(true);
    timer.current = setTimeout(() => setOpen(false), MOTION.tip);
  }, []);
  useEffect(() => clear, []);
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);
  const left = props.side === 'left';
  return (
    <View style={styles.wrap}>
      <Pressable
        testID={props.testID}
        accessibilityLabel={props.text}
        onHoverIn={show}
        onHoverOut={close}
        onFocus={show}
        onBlur={close}
        onPress={() => (open ? close() : show())}
        onLongPress={show}
      >
        {props.children}
      </Pressable>
      {open ? (
        <View testID="tooltip" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.tip, left ? styles.left : styles.above]}>
          <Text style={styles.text}>{props.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  tip: { position: 'absolute', maxWidth: 240, minWidth: 160, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: theme.ink, zIndex: 20 },
  above: { bottom: '100%', marginBottom: 6, left: 0 },
  left: { right: '100%', marginRight: 8, top: 0 },
  text: { color: '#fff', fontSize: 13, lineHeight: 18 },
});
