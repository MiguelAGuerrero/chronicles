// @layer view
import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { swatchLines, type HatchLook } from '../lib/walk/hatch';
import { COLORS, WALK_SLATE } from './map/types';

/**
 * The legend's swatch for ground built around cars (G5, CG5): the map's own hatch, its angle, spacing, line width and
 * strength, two lines and none corner to corner (`swatchLines`), so the key looks like what it explains.
 */
export function HatchSwatch(props: { look: HatchLook; size: number }) {
  const { look, size } = props;
  return (
    <Svg width={size} height={size} pointerEvents="none">
      {swatchLines(look, size).map((l) => (
        <Line key={l.y1} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={look.color} strokeWidth={look.lineWidthPx} strokeOpacity={look.lineOpacity} />
      ))}
    </Svg>
  );
}

/**
 * A short route cased as the map cases its stretch through car ground (G5, CG5: the owner's "Add a cased route sample"):
 * the route's own blue on a slate casing, at the legend's size. Square ends, as the map's casing.
 */
export function CasedRouteSample(props: { testID: string }) {
  return (
    <View testID={props.testID} pointerEvents="none">
      <Svg width={26} height={20}>
        <Line x1={2} y1={10} x2={24} y2={10} stroke={WALK_SLATE} strokeWidth={8} strokeLinecap="butt" />
        <Line x1={2} y1={10} x2={24} y2={10} stroke={COLORS.route} strokeWidth={4.5} strokeLinecap="butt" />
      </Svg>
    </View>
  );
}
