import { StyleSheet, Text, View } from 'react-native';
import type { ScaleBarSize } from '../../lib/scaleBar';
import { theme } from '../ui';

/** Where the bar sits, from the map's bottom-left corner, clear of the screen's own bottom UI (QL8). */
export interface ScaleInset {
  bottom: number;
  left?: number;
}

export const DEFAULT_SCALE_INSET: ScaleInset = { bottom: 12, left: 12 };
/** The longest the bar's line may be. */
export const SCALE_MAX_PX = 100;

/**
 * A map's scale bar (QL5, QL8): a line with end ticks and a round length, on
 * with a white halo and no background, in the bottom-left corner. Decorative: it takes no tap and is
 * hidden from screen readers; the e2e reads `data-m` and measures the line.
 */
export function ScaleBar(props: { bar: ScaleBarSize; inset?: ScaleInset }) {
  const { meters, px, label } = props.bar;
  if (!(px > 0)) return null;
  const inset = props.inset ?? DEFAULT_SCALE_INSET;
  return (
    <View
      testID="scale-bar"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      {...webData(meters)}
      style={[styles.pill, { bottom: inset.bottom, left: inset.left ?? DEFAULT_SCALE_INSET.left }]}
    >
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <View testID="scale-line" style={[styles.line, { width: px }]} />
    </View>
  );
}

/** react-native-web turns `dataSet` into data-* attributes; React Native's types don't know it. */
const webData = (meters: number) => ({ dataSet: { m: String(meters) } }) as object;

const styles = StyleSheet.create({
  pill: {
    position: 'absolute', alignItems: 'flex-start', gap: 2,
    // No background (the owner, Nov 4): the ink sits on the map under a soft white halo instead.
    paddingVertical: 4, paddingHorizontal: 8,
  },
  label: {
    color: theme.ink, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'], lineHeight: 14,
    textShadowColor: 'rgba(255,255,255,0.95)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 },
  },
  // The line with a 6 px tick at each end, drawn as borders so the view's width is the bar's.
  line: {
    height: 8, borderColor: theme.ink, borderBottomWidth: 2, borderLeftWidth: 2, borderRightWidth: 2,
    shadowColor: '#ffffff', shadowOpacity: 0.95, shadowRadius: 3, shadowOffset: { width: 0, height: 0 },
  },
});
