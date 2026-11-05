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
export function Tooltip(props: { text: string; children: ReactNode; testID?: string; side?: 'above' | 'below'; align?: 'left' | 'right' }) {
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
  const below = props.side === 'below';
  const alignRight = props.align === 'right';
  return (
    <View style={styles.wrap}>
      <Pressable
        testID={props.testID}
        accessibilityRole="button"
        accessibilityLabel={props.text}
        hitSlop={10}
        onHoverIn={show}
        onHoverOut={close}
        onFocus={show}
        onBlur={close}
        // A press shows it (and starts its 4 s again): a tap after a hover never closes it under the finger (audit 14).
        onPress={show}
        onLongPress={show}
      >
        {props.children}
      </Pressable>
      {open ? (
        <View testID="tooltip" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.tip, below ? styles.below : styles.above, alignRight ? styles.right : styles.leftEdge]}>
          <Text style={styles.text}>{props.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  tip: { position: 'absolute', maxWidth: 240, minWidth: 160, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: theme.ink, zIndex: 20 },
  above: { bottom: '100%', marginBottom: 8 },
  below: { top: '100%', marginTop: 8 },
  /** Opens to the right of the icon, or, for an icon near the screen's right edge, to its left (audit 14). */
  leftEdge: { left: 0 },
  right: { right: 0 },
  text: { color: '#fff', fontSize: 13, lineHeight: 18 },
});
