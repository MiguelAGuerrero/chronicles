import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from './icons';
import { theme } from './ui';

/** What the stacked mark says to a screen reader (MS8): words, never a number. */
export const STACK_SPOKEN = 'with more in this moment';

/**
 * The quiet mark of a moment that holds more than one piece (moment stacks MS8, decision 0123): a small two-card
 * glyph in ink, never the accent colour, never beside a number. The row it sits on adds `STACK_SPOKEN` to its own
 * spoken label; the mark carries the words too, for a reader that stops on it.
 */
/** On a map pin the pin's own label carries the words (`pinLabel`), so the mark there is silent (`silent`). */
export function StackMark(props: { style?: StyleProp<ViewStyle>; light?: boolean; size?: number; silent?: boolean }) {
  return (
    <View
      testID={props.silent ? 'pin-stack-mark' : 'stack-mark'}
      accessible={!props.silent}
      accessibilityLabel={props.silent ? undefined : STACK_SPOKEN}
      style={[styles.mark, props.light && styles.light, props.style]}
    >
      <Icon name="copy-outline" size={props.size ?? 14} color={props.light ? theme.ink : '#ffffff'} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.chip },
  light: { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.line },
});
