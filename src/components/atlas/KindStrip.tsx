import { StyleSheet, View } from 'react-native';
import { ATLAS_ORDER, type Steps } from '../../lib/atlas/atlas';
import { Icon } from '../icons';
import { theme } from '../ui';
import { KIND_COLOR, KIND_ICON_OF } from './kinds';

/** The eight kinds in one fixed order, each with 0 to 3 bars (AT3): how much is there, never how good. */
export function KindStrip(props: { steps: Steps | null; testID?: string }) {
  return (
    <View style={styles.row} testID={props.testID} accessible={false} importantForAccessibility="no-hide-descendants">
      {ATLAS_ORDER.map((c) => {
        const v = props.steps?.[c] ?? 0;
        const color = v ? KIND_COLOR[c] : theme.line;
        return (
          <View key={c} style={styles.slot} {...{ dataSet: { kind: c, step: String(v) } }}>
            <Icon name={KIND_ICON_OF[c]} size={14} color={color} />
            <View style={styles.bars}>
              {[1, 2, 3].map((n) => (
                <View key={n} style={[styles.bar, { backgroundColor: n <= v ? KIND_COLOR[c] : theme.line }]} />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  slot: { alignItems: 'center', gap: 2, flex: 1 },
  bars: { flexDirection: 'row', gap: 1 },
  bar: { width: 4, height: 3, borderRadius: 1 },
});
