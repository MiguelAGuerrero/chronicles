import { useIsFocused } from 'expo-router';
import { useEffect, useId, useRef, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { INTO_HINT, INTO_TITLE } from '../lib/explore/intoPage';
import { focusOn } from '../lib/focus';
import { openInto } from '../lib/intoNav';
import { Icon } from './icons';
import { theme } from './ui';

/**
 * What I'm into's one row (specs/what-im-into-page WI1, WI2, WI12-WI14; decision 0192), where its list was: in the ready
 * bar's settings with Explore chosen and in the walk's drawer with Explore on. Its words and a chevron, in ink, the
 * whole row one target; a tap pushes the page. It carries no count or summary of what is on (WI12). Back from the page
 * puts focus on it again (WI14): the stack doesn't, on the web.
 */
export function IntoRow(props: { from?: 'walk' | 'ready' }) {
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  const opened = useRef(false);
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused || !opened.current) return;
    opened.current = false;
    const t = setTimeout(() => focusOn(ref), 60);
    return () => clearTimeout(t);
  }, [focused]);
  // react-native-web drops accessibilityHint: the web hears it as a description, from a hidden copy (audit 4).
  const web = Platform.OS === 'web';
  const hintId = `into-row-hint${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  return (
    <>
      <Pressable
        ref={ref}
        testID="into-row"
        accessibilityRole="button"
        accessibilityLabel={INTO_TITLE}
        accessibilityHint={INTO_HINT}
        {...(web ? ({ 'aria-describedby': hintId } as object) : {})}
        onPress={() => {
          opened.current = true;
          openInto(props.from);
        }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Text style={styles.label} numberOfLines={1}>{INTO_TITLE}</Text>
        <Icon name="chevron-forward" size={20} color={theme.ink} />
      </Pressable>
      {web ? <Text nativeID={hintId} style={styles.unseen}>{INTO_HINT}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  // 48 pt, the switch rows' height (X0); the chevron in ink, never muted (Found before quiet, decision 0167).
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  pressed: { opacity: 0.7 },
  label: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.ink },
  unseen: { display: 'none' },
});
