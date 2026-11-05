// @layer view
import { StyleSheet, View } from 'react-native';
import { BAND_BADGE, bandWords } from '../lib/walk/bandWords';
import type { Band } from '../lib/walk/types';
import { Icon } from './icons';
import { theme } from './ui';

/**
 * A band as an icon (WK21): the pedestrian, with a caution badge when mixed and a car badge when built
 * around cars. They differ by shape, so they read without colour. `unknown` draws nothing. The words are
 * its accessible label; the tooltip (`Tooltip`) shows them.
 */
const TINT: Record<'foot' | 'mixed' | 'car', string> = { foot: theme.ok, mixed: theme.warn, car: theme.accent };

export function WalkBandIcon(props: { band: Band; size?: number; testID?: string }) {
  const { band } = props;
  if (band === 'unknown') return null;
  const size = props.size ?? 24;
  const badge = BAND_BADGE[band];
  const b = Math.round(size * 0.6);
  return (
    <View testID={props.testID ?? `walk-band-${band}`} accessible accessibilityRole="image" accessibilityLabel={bandWords(band) ?? undefined} style={{ width: size + b / 3, height: size }}>
      <Icon name="walk" size={size} color={TINT[band]} />
      {badge ? (
        <View testID={`walk-badge-${badge}`} style={[styles.badge, { width: b, height: b, borderRadius: b / 2, borderColor: TINT[band] }]}>
          <Icon name={badge === 'car' ? 'car' : 'warning'} size={Math.round(b * 0.72)} color={TINT[band]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', right: 0, bottom: -2, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1 },
});
