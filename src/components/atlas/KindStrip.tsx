import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ATLAS_LABEL, ATLAS_ORDER, STEP_WORDS, type Step, type Steps } from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import { Icon } from '../icons';
import { theme } from '../ui';
import { KIND_COLOR, KIND_ICON_OF } from './kinds';

/**
 * Presence as dots, never rising bars (atlas round 3: bars read as signal
 * meters, so as ratings). Empty dots are drawn at a readable edge, not faded.
 */
export function Dots(props: { step: Step; color: string; size?: number }) {
  const size = props.size ?? 6;
  return (
    <View style={styles.dots} accessible={false}>
      {[1, 2, 3].map((n) => (
        <View
          key={n}
          style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: n <= props.step ? props.color : 'transparent',
            borderWidth: n <= props.step ? 0 : 1, borderColor: theme.edge,
          }}
        />
      ))}
    </View>
  );
}

/**
 * A tile's kinds (AT3, atlas round 3): only the kinds present, each an icon
 * with its dots, in the fixed order; all eight are on the area's card.
 */
export function KindStrip(props: { steps: Steps | null; testID?: string }) {
  const present = ATLAS_ORDER.filter((c) => (props.steps?.[c] ?? 0) > 0);
  if (!props.steps) {
    return <View style={styles.row} testID={props.testID}><View style={styles.placeholder} /></View>;
  }
  return (
    <View style={styles.row} testID={props.testID} accessible={false} importantForAccessibility="no-hide-descendants">
      {present.map((c) => (
        <View key={c} style={styles.chip} {...{ dataSet: { kind: c, step: String(props.steps![c]) } }}>
          <Icon name={KIND_ICON_OF[c]} size={18} color={KIND_COLOR[c]} />
          <Dots step={props.steps![c]} color={KIND_COLOR[c]} size={5} />
        </View>
      ))}
    </View>
  );
}

/**
 * One kind on the area's card: icon, name, its word and its dots, at full ink even when none. Tapping the row opens the kind in
 * place (KW1), and so does its own button (KW15): a signpost and "Suggest a walk", a target of its own so nothing about the
 * row has to be guessed at.
 */
export function KindRow(props: { kind: CategoryId; step: Step; testID?: string; open?: boolean; onPress?: () => void }) {
  const { kind, step } = props;
  const body = (
    <>
      <Icon name={KIND_ICON_OF[kind]} size={20} color={step ? KIND_COLOR[kind] : theme.edge} />
      <Text style={styles.kindName}>{ATLAS_LABEL[kind]}</Text>
      <Text style={styles.kindWord} numberOfLines={1}>{STEP_WORDS[step]}</Text>
      <Dots step={step} color={KIND_COLOR[kind]} size={8} />
    </>
  );
  if (!props.onPress) return <View style={styles.kindRow} accessible accessibilityLabel={`${ATLAS_LABEL[kind]}: ${STEP_WORDS[step]}`} testID={props.testID}>{body}</View>;
  return (
    <View style={styles.kindLine}>
      <Pressable
        style={[styles.kindRow, styles.kindPress]}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!props.open }}
        accessibilityLabel={`${ATLAS_LABEL[kind]}: ${STEP_WORDS[step]}`}
        onPress={props.onPress}
        testID={props.testID}
      >
        {body}
      </Pressable>
      <Pressable
        style={styles.walkBtn}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!props.open }}
        accessibilityLabel={`Suggest a walk through ${ATLAS_LABEL[kind].toLowerCase()}`}
        onPress={props.onPress}
        hitSlop={4}
        testID={`atlas-kind-walk-${kind}`}
      >
        <Icon name="trail-sign-outline" size={18} color={theme.ink} />
        <Text style={styles.walkBtnText} numberOfLines={1}>Suggest a walk</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 30 },
  placeholder: { height: 30 },
  chip: { alignItems: 'center', gap: 3, minWidth: 22 },
  dots: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  kindLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kindPress: { minHeight: 44, flex: 1, minWidth: 0 },
  walkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, minWidth: 44, paddingHorizontal: 12,
    borderRadius: 22, borderWidth: 1, borderColor: theme.edge, backgroundColor: theme.surface,
  },
  walkBtnText: { fontSize: 13, fontWeight: '600', color: theme.ink },
  kindName: { fontSize: 15, color: theme.ink, fontWeight: '500' },
  kindWord: { fontSize: 14, color: theme.muted, flex: 1 },
});
