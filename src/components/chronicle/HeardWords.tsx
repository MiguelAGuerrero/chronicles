import { StyleSheet, Text, View } from 'react-native';
import { LABEL } from '../../lib/transcribe/core';
import { theme } from '../ui';

/**
 * A memo's words as the phone read them (MX1, MX8): the same label wherever they appear, set apart from the owner's own
 * words (a note's text is italic; these are plain), so a misheard word is never taken for something written.
 */
export function HeardWords(props: { words: string; lines?: number; testID?: string }) {
  const id = props.testID ?? 'transcript';
  return (
    <View style={styles.box} testID={id}>
      <Text style={styles.label} testID={`${id}-label`}>{LABEL}</Text>
      <Text style={styles.words} numberOfLines={props.lines} testID={`${id}-words`}>{props.words}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 2 },
  label: { color: theme.muted, fontSize: 13 },
  words: { color: theme.ink, fontSize: 16, lineHeight: 22 },
});
