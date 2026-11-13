import { StyleSheet, Text, View } from 'react-native';
import type { Capture } from '../lib/types';
import { useTranscript } from '../lib/useTranscript';
import { theme } from './ui';

/**
 * A voice memo's words, as a caption under it, once the phone has read them (decision 0166, TX7-TX9, TX14). Nothing
 * shows while they are pending, and nothing when there are none. Named for what it is, in view and to a screen
 * reader: a small line says the phone read it, and the words are set apart in italics from a note or a caption the
 * owner wrote (memo-transcripts audit 13).
 */
export function MemoTranscript({ piece }: { piece: Pick<Capture, 'id' | 't' | 'body' | 'edit'> }) {
  const words = useTranscript(piece);
  if (!words) return null;
  return (
    <View style={styles.block}>
      <Text testID="memo-transcript-label" style={styles.label}>Read by your phone</Text>
      <Text testID="memo-transcript" selectable style={styles.words}>{words}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 8 },
  label: { color: theme.muted, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  words: { color: theme.muted, fontSize: 14, lineHeight: 20, fontStyle: 'italic', marginTop: 2 },
});
