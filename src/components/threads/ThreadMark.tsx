import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

/** Who made a thread (decision 0105): the owner connected it, or the Chronicle found it in the owner's own words. */
export type ThreadKind = 'made' | 'found';

/** The mark's icon and the name a screen reader says. An icon in the ink colour, never a colour on its own (OT25). */
export const THREAD_MARKS: Record<ThreadKind, { icon: IconName; words: string }> = {
  made: { icon: 'link', words: 'connected by you' },
  found: { icon: 'repeat', words: 'found for you' },
};

/** A small mark beside a thread's heading, tile or row. No accent colour, no badge, no count. */
export function ThreadMark(props: { kind: ThreadKind; size?: number }) {
  const m = THREAD_MARKS[props.kind];
  return (
    <View testID={`thread-mark-${props.kind}`} accessible accessibilityRole="image" accessibilityLabel={m.words} style={styles.mark}>
      <Icon name={m.icon} size={props.size ?? 15} color={theme.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
});
