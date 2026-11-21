import { useIsFocused } from 'expo-router';
import { useEffect, useId, useRef, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { focusOn } from '../lib/focus';
import { Icon } from './icons';
import { theme } from './ui';

/**
 * A row that opens a page of its own (matrix row 11): its words, an optional second line, a chevron in ink, the whole
 * row one target; a tap pushes the page. Back from the page puts focus on the row again (WI14; back-up-everything
 * audit 17): the stack doesn't, on the web. What I'm into's row and Your data's share it.
 */
export function PageRow(props: { testID: string; label: string; note?: string; hint?: string; onOpen: () => void }) {
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  const opened = useRef(false);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || !opened.current) return;
    opened.current = false;
    const t = setTimeout(() => focusOn(ref), 60);
    return () => clearTimeout(t);
  }, [focused]);
  // react-native-web drops accessibilityHint: the web hears it as a description, from a hidden copy (into audit 4).
  const web = Platform.OS === 'web';
  const hintId = `${props.testID}-hint${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  return (
    <>
      <Pressable
        ref={ref}
        testID={props.testID}
        accessibilityRole="button"
        accessibilityLabel={props.note ? `${props.label}. ${props.note}` : props.label}
        accessibilityHint={props.hint}
        {...(web && props.hint ? ({ 'aria-describedby': hintId } as object) : {})}
        onPress={() => {
          opened.current = true;
          props.onOpen();
        }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.text}>
          <Text style={styles.label} numberOfLines={1}>{props.label}</Text>
          {props.note ? <Text style={styles.note}>{props.note}</Text> : null}
        </View>
        <Icon name="chevron-forward" size={20} color={theme.ink} />
      </Pressable>
      {web && props.hint ? <Text nativeID={hintId} style={styles.unseen}>{props.hint}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  // 48 pt, the switch rows' height (X0); the words and the chevron in ink, never muted (Found before quiet, decision 0167).
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '600', color: theme.ink },
  note: { fontSize: 13, color: theme.muted },
  unseen: { display: 'none' },
});
