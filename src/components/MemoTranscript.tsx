import { StyleSheet, Text } from 'react-native';
import type { Capture } from '../lib/types';
import { useTranscript } from '../lib/useTranscript';
import { theme } from './ui';

/**
 * A voice memo's words, as a caption under it, once the phone has read them (decision 0165, TX7-TX9, TX14). Nothing
 * shows while they are pending, and nothing when there are none. Quieter than a note or a caption the owner wrote,
 * and named for what it is: the phone's reading.
 */
export function MemoTranscript({ piece, light }: { piece: Pick<Capture, 'id' | 't' | 'body' | 'edit'>; light?: boolean }) {
  const words = useTranscript(piece);
  if (!words) return null;
  return (
    <Text
      testID="memo-transcript"
      selectable
      accessibilityLabel={`Read by your phone: ${words}`}
      style={[styles.words, light && styles.light]}
    >
      {words}
    </Text>
  );
}

const styles = StyleSheet.create({
  words: { color: theme.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  light: { color: 'rgba(255,255,255,0.8)' },
});
