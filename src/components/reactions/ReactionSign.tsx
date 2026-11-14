import { Pressable, StyleSheet, View } from 'react-native';
import { signLabel, signOf, type ReactionSet } from '../../lib/reactions/core';
import { Icon, type IconName } from '../icons';
import { theme } from '../ui';

/**
 * The sign that adds a reaction (RX1, RX6, RX9; decision 0168): a face with a small plus while the moment has none, its
 * first reaction's glyph once it has one. In ink, at a target's size, with no word: the sign people know for adding a
 * reaction (0167, found before quiet). Says "Reaction, Happy" or "Reaction, none".
 */
export function ReactionSign(props: { set: ReactionSet; open?: boolean; onPress: () => void; testID?: string }) {
  const first = signOf(props.set);
  return (
    <Pressable
      testID={props.testID ?? 'reaction-sign'}
      accessibilityRole="button"
      accessibilityLabel={signLabel(props.set)}
      aria-expanded={props.open ?? undefined}
      onPress={props.onPress}
      style={({ pressed }) => [styles.sign, props.open && styles.open, pressed && styles.pressed]}
    >
      <Icon name={(first?.glyph ?? 'happy-outline') as IconName} size={22} color={theme.ink} testID="reaction-sign-face" />
      {first ? null : (
        <View style={styles.add} testID="reaction-sign-add">
          <Icon name="add" size={13} color={theme.bg} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sign: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 4, borderWidth: 1, borderColor: 'transparent' },
  // Open: an ink ring, never a fill (RX36).
  open: { borderColor: theme.ink },
  pressed: { opacity: 0.6 },
  // The plus that makes the face "add": a small ink disc at its shoulder.
  // 16 pt, so it reads as ink and not a faint badge (reactions ui 2); at the face's lower right, clear of the held
  // date's edge, which lies over the top of the first entry's dateline (reactions audit 3).
  add: { position: 'absolute', bottom: 4, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.bg },
});
