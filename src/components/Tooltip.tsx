// @layer view
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MOTION } from '../lib/motionTokens';
import { theme } from './ui';

/**
 * A row that says what it means in a line beneath it, in the flow (specs/walkability WK22; layers audit 4, 8): hover or focus on
 * the web, a tap on a phone. Inline, never floating, so no ancestor clips it, no later sibling paints over it, and it is never a
 * `Modal`. The whole row is the button (44 px tall), announced once as its label and its words together; what is inside is hidden
 * from assistive tech. A press keeps it open and a second press closes it; it closes on its own, on Escape and on leaving.
 */
export function Tooltip(props: { text: string; label: string; children: ReactNode; testID?: string }) {
  // Who opened it, so a hover that leaves never closes what a press opened. Every change is a function of the previous state:
  // focus, hover and press events race one another, and a handler reading `open` from its render sees stale data.
  const [open, setOpen] = useState<'hover' | 'press' | null>(null);
  const close = useCallback(() => setOpen(null), []);
  // It closes on its own after a while, counted from each change.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(null), MOTION.tip);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);
  return (
    <View>
      <Pressable
        testID={props.testID}
        accessibilityRole="button"
        accessibilityLabel={`${props.label}. ${props.text}`}
        accessibilityState={{ expanded: open !== null }}
        onHoverIn={() => setOpen((o) => o ?? 'hover')}
        onHoverOut={() => setOpen((o) => (o === 'hover' ? null : o))}
        onFocus={() => setOpen((o) => o ?? 'hover')}
        onBlur={close}
        onPress={() => setOpen((o) => (o === 'press' ? null : 'press'))}
        style={styles.hit}
      >
        <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
          {props.children}
        </View>
      </Pressable>
      {open ? <Text testID="tooltip" style={styles.tip}>{props.text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { minHeight: 44, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tip: { color: theme.muted, fontSize: 12, lineHeight: 16, paddingBottom: 4 },
});
