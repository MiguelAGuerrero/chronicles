import { Pressable, StyleSheet, Text } from 'react-native';
import { IN_A_THREAD } from '../../lib/threads/lines';
import { threadsOf } from '../../lib/threads/rules';
import { useThreads } from '../../lib/threads/useThreads';
import { Icon } from '../icons';
import { theme } from '../ui';

/**
 * Where a moment is in a thread, in words (OT11): "In a thread". It never names the thread, except on the screen of
 * the thread the viewer was opened from (`from`). A tap opens that thread.
 */
export function ThreadChip(props: { momentId: string; top: number; from?: { id: string; name: string | null } | null; onOpen: (threadId: string) => void }) {
  const { data } = useThreads();
  const mine = threadsOf(props.momentId, data);
  if (!mine.length) return null;
  const here = props.from ? mine.find((t) => t.id === props.from!.id) : undefined;
  const label = here?.name ? `${IN_A_THREAD}: ${here.name}` : IN_A_THREAD;
  const text = label[0].toUpperCase() + label.slice(1);
  return (
    <Pressable
      testID="viewer-in-thread"
      accessibilityRole="button"
      accessibilityLabel={`${text}. Open it`}
      onPress={() => props.onOpen((here ?? mine[0]).id)}
      style={[styles.chip, { top: props.top }]}
      hitSlop={8}
    >
      <Icon name="link" size={16} color={theme.ink} />
      <Text style={styles.text} numberOfLines={1}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { position: 'absolute', left: 16, maxWidth: 240, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)' },
  text: { color: theme.ink, fontSize: 14, fontWeight: '600', flexShrink: 1 },
});
