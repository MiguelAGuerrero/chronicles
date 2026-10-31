import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { reminderText } from '../lib/discovery/recall';
import type { Capture } from '../lib/types';
import { useMediaUri } from '../lib/useMediaUri';
import { Icon } from './icons';
import { theme } from './ui';

/**
 * A flagged capture come back (R3, R4): its own words, a photo's thumbnail,
 * or "Voice memo, Oct 20". Open shows it in the viewer, where a memo or video
 * plays; two or more in reach are one card, "2 memories here" (R7).
 */
export function ReminderCard(props: { captures: Capture[]; onOpen: () => void; onDismiss: () => void }) {
  const text = reminderText(props.captures);
  const photo = props.captures.length === 1 && props.captures[0].kind === 'photo' ? props.captures[0] : null;
  const uri = useMediaUri(photo);
  return (
    // Announced once by the screen, not as a live region too (it would be read twice on Android).
    <View testID="reminder" style={styles.card}>
      <Pressable
        testID="reminder-open"
        accessibilityRole="button"
        accessibilityLabel={`${text.title}: ${text.body}. Open`}
        onPress={props.onOpen}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.8 }]}
      >
        {uri ? <Image source={{ uri }} style={styles.thumb} accessibilityIgnoresInvertColors /> : (
          <View style={styles.icon}>
            <Icon name="time-outline" size={20} color="#ffffff" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{text.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{text.body}</Text>
        </View>
      </Pressable>
      <Pressable testID="reminder-dismiss" accessibilityRole="button" accessibilityLabel="Dismiss" onPress={props.onDismiss} style={styles.close} hitSlop={8}>
        <Icon name="close" size={20} color={theme.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: theme.radius, paddingLeft: 10,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 56 },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: theme.line },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: theme.ink },
  body: { fontSize: 14, color: theme.muted },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
