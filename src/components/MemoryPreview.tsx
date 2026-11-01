import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { previewLine } from '../lib/memories';
import type { Capture } from '../lib/types';
import { useMediaUri } from '../lib/useMediaUri';
import { Icon, KIND_ICON } from './icons';
import { LiftIn, theme } from './ui';

/**
 * A memory pin's quick preview (MR4): the photo or the note's line, the date
 * and the walk, and "N more here". A tap on it opens the viewer (MR5).
 */
export function MemoryPreview(props: {
  captures: Capture[];
  /** "Sunday night in Fox Point · 3 min in", from What happened here's context. */
  walkLine: string | null;
  onOpen: () => void;
  onClose: () => void;
}) {
  const first = props.captures[0];
  // A thumbnail only for a photo; a missing file falls back to the kind's icon.
  const uri = useMediaUri(first.kind === 'photo' ? first : null);
  const more = props.captures.length - 1;
  const date = new Date(first.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const line = previewLine(first);
  return (
    <LiftIn testID="memory-preview" style={styles.card}>
      <Pressable
        testID="memory-open"
        accessibilityRole="button"
        accessibilityLabel={`Memory from ${date}: ${line}${more > 0 ? `, and ${more} more here` : ''}. Open`}
        onPress={props.onOpen}
        style={styles.body}
      >
        <View style={styles.thumb}>
          {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Icon name={KIND_ICON[first.kind]} size={24} color={theme.muted} />}
        </View>
        <View style={styles.text}>
          <Text style={styles.line} numberOfLines={2}>{line}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[date, props.walkLine, more > 0 ? `${more} more here` : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Pressable>
      <Pressable testID="memory-close" accessibilityRole="button" accessibilityLabel="Close the memory" onPress={props.onClose} style={styles.close} hitSlop={8}>
        <Icon name="close" size={22} color={theme.ink} />
      </Pressable>
    </LiftIn>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: theme.radius, padding: 10, gap: 6,
    width: '100%', maxWidth: 520,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  thumb: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  line: { fontSize: 15, fontWeight: '600', color: theme.ink },
  meta: { fontSize: 13, color: theme.muted },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
