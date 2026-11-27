// @layer view
import Svg, { Line } from 'react-native-svg';
import { swatchLines, type HatchLook } from '../lib/walk/hatch';

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
