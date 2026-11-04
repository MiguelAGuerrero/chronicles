import { memo, useMemo } from 'react';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { SKETCH, sketchPaths, toSketch, type AtlasArea } from '../../lib/atlas/atlas';
import type { CategoryId } from '../../lib/discovery/types';
import type { LngLat } from '../../lib/types';
import { COLORS, HOTSPOT, HOTSPOT_GRADES } from '../map/types';
import { KIND_COLOR, SKETCH_COLORS } from './kinds';

/**
 * An area's ring as a picture (AT6): the same frame and scale for every area,
 * so tiles compare at a glance. Streets, graded busy streets (magenta), parks, the
 * streets you walked (the trace's green), a "?" for each kind waiting (one
 * per kind, never named: AT7) and a check for each find.
 */
export const MiniMap = memo(function MiniMap(props: {
  area: AtlasArea;
  walked: Set<string>;
  waiting: { category: CategoryId; at: LngLat }[];
  finds: { category: CategoryId; at: LngLat }[];
  here?: LngLat | null;
  testID?: string;
}) {
  const { area, walked } = props;
  const sketch = area.profile?.sketch;
  const paths = useMemo(() => (sketch ? sketchPaths(sketch, walked) : null), [sketch, walked]);
  const to = useMemo(() => toSketch(area.at), [area.at]);
  const { w, h, ringR } = SKETCH;
  const cx = w / 2;
  const cy = h / 2;
  // Outside the ring is veiled: an even-odd path, the frame with the ring cut out.
  const veil = `M0 0H${w}V${h}H0Z M${cx - ringR} ${cy}a${ringR} ${ringR} 0 1 0 ${ringR * 2} 0a${ringR} ${ringR} 0 1 0 ${-ringR * 2} 0Z`;
  const me = props.here ? to(props.here) : null;
  return (
    <Svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" testID={props.testID}>
      <Rect x={0} y={0} width={w} height={h} fill={SKETCH_COLORS.land} />
      {sketch && (
        <G>
          {sketch.parks.length > 0 && (
            <G>
              {Array.from({ length: sketch.parks.length / 2 }, (_, i) => (
                <Circle key={i} cx={sketch.parks[i * 2]} cy={sketch.parks[i * 2 + 1]} r={7} fill={SKETCH_COLORS.park} />
              ))}
            </G>
          )}
          {paths?.streets ? <Path d={paths.streets} stroke={SKETCH_COLORS.road} strokeWidth={1.1} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {/* Graded streets (AD14): faint first, so strong draws on top. */}
          {paths?.grades.map((d, i) =>
            d ? (
              <Path key={`g${i}`} d={d} stroke={HOTSPOT} strokeWidth={3.2 * HOTSPOT_GRADES[(i + 1) as 1 | 2 | 3].width}
                strokeOpacity={HOTSPOT_GRADES[(i + 1) as 1 | 2 | 3].opacity} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ) : null,
          )}
          {paths?.walked ? <Path d={paths.walked} stroke={COLORS.trace} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        </G>
      )}
      <Path d={veil} fill={SKETCH_COLORS.veil} fillOpacity={0.55} fillRule="evenodd" />
      <Circle cx={cx} cy={cy} r={ringR} fill="none" stroke={SKETCH_COLORS.ring} strokeWidth={0.8} strokeDasharray="3 3" />
      {props.waiting.map((m) => {
        const [x, y] = to(m.at);
        const c = KIND_COLOR[m.category];
        return (
          <G key={`q-${m.category}`}>
            <Circle cx={x} cy={y} r={6} fill="#ffffff" stroke={c} strokeWidth={1.6} strokeDasharray="2 1.5" />
            <SvgText x={x} y={y + 3} fontSize={8} fontWeight="700" fill={c} textAnchor="middle">?</SvgText>
          </G>
        );
      })}
      {props.finds.map((f, i) => {
        const [x, y] = to(f.at);
        return (
          <G key={`f-${i}`}>
            <Circle cx={x} cy={y} r={6} fill={KIND_COLOR[f.category]} />
            <Path d={`M${x - 2.5} ${y}l1.8 1.9 3.2-3.6`} stroke="#ffffff" strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </G>
        );
      })}
      {me && <Circle cx={me[0]} cy={me[1]} r={4} fill={COLORS.route} stroke="#ffffff" strokeWidth={1.6} />}
    </Svg>
  );
});
