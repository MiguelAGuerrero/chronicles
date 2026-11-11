import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Icon, type IconName } from './icons';
import { theme } from './ui';

/**
 * A setting with a switch, tappable as a whole row (U4): the row is the one
 * control a screen reader sees, and a tap anywhere on it flips the switch.
 * The switch itself only shows the state, so a tap on it never flips twice.
 */
export function SwitchRow(props: {
  testID?: string;
  label: string;
  note?: string;
  hint?: string;
  icon?: IconName;
  value: boolean;
  /** A row that cannot be switched now (a subset under a parent that is off): dimmed, announced, and a tap does nothing. */
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="switch"
      accessibilityLabel={props.label}
      accessibilityHint={props.hint ?? props.note}
      accessibilityState={{ checked: props.value, disabled: !!props.disabled }}
      aria-checked={props.value}
      disabled={props.disabled}
      onPress={() => !props.disabled && props.onChange(!props.value)}
      style={({ pressed }) => [styles.row, pressed && !props.disabled && styles.rowPressed, props.disabled && styles.rowDisabled]}
    >
      {props.icon && <Icon name={props.icon} size={20} color={theme.ink} />}
      <View style={styles.rowText} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={styles.rowLabel}>{props.label}</Text>
        {props.note ? <Text style={styles.sub}>{props.note}</Text> : null}
      </View>
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Switch value={props.value} tabIndex={-1} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  rowPressed: { opacity: 0.7 },
  rowDisabled: { opacity: 0.45 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, color: theme.ink },
  sub: { fontSize: 13, color: theme.muted },
});
