import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../icons';
import { Button, theme } from '../ui';

/**
 * A place's capture row (capture-at-a-place CA1, CA1b): the capture stack's three kinds, in ink, each an icon and a word
 * people know, at least 44 pt, in one row. A tap closes the card and begins that capture for the place; nothing is armed.
 * The stack's own kinds and icons, never a menu (VISION.md: a capture behind a menu is a Never).
 */
export function PlaceCaptureRow(props: { place: string; onCamera: () => void; onVoice: () => void; onNote: () => void; disabled?: boolean }) {
  const items: { id: string; icon: IconName; word: string; spoken: string; onPress: () => void }[] = [
    { id: 'mark-camera', icon: 'camera', word: 'Camera', spoken: `Camera: a photo or video of ${props.place}`, onPress: props.onCamera },
    { id: 'mark-voice', icon: 'mic', word: 'Voice', spoken: `Voice: a voice memo about ${props.place}`, onPress: props.onVoice },
    { id: 'mark-note', icon: 'document-text', word: 'Note', spoken: `Note: a note about ${props.place}`, onPress: props.onNote },
  ];
  return (
    <View style={styles.row} testID="mark-row">
      {items.map((it) => (
        <Button key={it.id} testID={it.id} variant="secondary" label={it.word} spokenLabel={it.spoken} onPress={it.onPress} disabled={props.disabled} style={styles.btn}>
          <View style={styles.inner}>
            <Icon name={it.icon} size={20} color={theme.ink} />
            <Text style={styles.word} numberOfLines={1}>
              {it.word}
            </Text>
          </View>
        </Button>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, width: '100%' },
  // Three across at 320 (the card's 288 less its padding): no wrap (ui-patterns: nothing wraps at 320).
  btn: { flex: 1, minHeight: 48, paddingHorizontal: 6 },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  word: { fontSize: 15, fontWeight: '600', color: theme.ink },
});
