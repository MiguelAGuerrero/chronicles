import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ATLAS_LABEL, groupsPresent, STEP_WORDS, STRIP, type Step, type Steps } from '../../lib/atlas/atlas';
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
 * A tile's kinds (AT3, atlas round 3): only the kinds present, each an icon with its dots, in the fixed order; all eight
 * are on the area's card. SG2 (decisions 0200, 0201): Sights, then Local life, set apart by space alone, never a word.
 */
export function KindStrip(props: { steps: Steps | null; testID?: string; /** One line, never two: a card's height must not follow its kinds. */ nowrap?: boolean }) {
  if (!props.steps) {
    return <View style={styles.row} testID={props.testID}><View style={styles.placeholder} /></View>;
  }
  const steps = props.steps;
  return (
    <View style={[styles.row, styles.groups, props.nowrap && styles.nowrap]} testID={props.testID} accessible={false} importantForAccessibility="no-hide-descendants">
      {groupsPresent(steps).map((g, i) => (
        <Fragment key={g.id}>
        {/* SG14 (decision 0202): a hairline in the space between the groups, only when both are present. */}
        {i > 0 && <View style={styles.line} testID="atlas-strip-line" />}
        <View style={[styles.group, props.nowrap && styles.nowrap]} testID={`atlas-strip-${g.id}`}>
          {g.kinds.map((c) => (
            <View key={c} style={styles.chip} {...{ dataSet: { kind: c, step: String(steps[c]) } }}>
              <Icon name={KIND_ICON_OF[c]} size={18} color={KIND_COLOR[c]} />
              <Dots step={steps[c]} color={KIND_COLOR[c]} size={5} />
            </View>
          ))}
        </View>
        </Fragment>
      ))}
    </View>
  );
}

/**
 * One kind on the area's card: icon, name, its word and its dots, at full ink even when none. Tapping the row opens the walk
 * planner for the kind (WP1), and so does its own button (KW15): a signpost and "Suggest a walk", a target of its own so nothing
 * about the row has to be guessed at.
 */
export function KindRow(props: { kind: CategoryId; step: Step; testID?: string; onPress?: () => void }) {
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
        accessibilityLabel={`${ATLAS_LABEL[kind]}: ${STEP_WORDS[step]}`}
        onPress={props.onPress}
        testID={props.testID}
      >
        {body}
      </Pressable>
      <Pressable
        style={styles.walkBtn}
        accessibilityRole="button"
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
  // SG2: eight kinds, 4 apart within a group and 16 between the groups, fit a selected tile on a 320 px phone (216 of 222 px).
  // The groups' space is the line's margins, so the line stands in its middle (SG14).
  groups: { gap: 0 },
  line: { width: STRIP.line, alignSelf: 'stretch', marginVertical: 2, marginHorizontal: (STRIP.groupGap - STRIP.line) / 2, backgroundColor: theme.edge },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: STRIP.gap },
  nowrap: { flexWrap: 'nowrap' },
  chip: { alignItems: 'center', gap: 3, minWidth: STRIP.chip },
  dots: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  kindRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  kindLine: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  kindPress: { minHeight: 44, flex: 1, minWidth: 0 },
  walkBtn: {
    marginLeft: 'auto', flexShrink: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, minWidth: 44, paddingHorizontal: 12,
    borderRadius: 22, borderWidth: 1, borderColor: theme.edge, backgroundColor: theme.surface,
  },
  walkBtnText: { fontSize: 13, fontWeight: '600', color: theme.ink },
  kindName: { fontSize: 15, color: theme.ink, fontWeight: '500' },
  kindWord: { fontSize: 14, color: theme.muted, flex: 1 },
});
