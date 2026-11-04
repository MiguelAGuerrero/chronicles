import { useEffect, useId, useState } from 'react';
import { Image, Platform, StyleSheet, View, type LayoutRectangle } from 'react-native';
import Svg, { Circle, Defs, FeColorMatrix, Filter, G, Image as SvgImage, Polyline } from 'react-native-svg';
import { editedSize, exportPlan, FILTERS, MARKER_OPACITY, matrixValues, penHex, serializeEdit, type MediaEdit, type Stroke } from '../../lib/mediaEdit';
import { CaptionBar } from '../Caption';

/** A picture's own size in pixels, once known. */
export function useNaturalSize(uri: string | null): { w: number; h: number } | null {
  const [size, setSize] = useState<{ uri: string; w: number; h: number } | null>(null);
  useEffect(() => {
    if (!uri) return;
    let alive = true;
    Image.getSize(uri, (w, h) => alive && setSize({ uri, w, h }), () => {});
    return () => {
      alive = false;
    };
  }, [uri]);
  return size && size.uri === uri ? { w: size.w, h: size.h } : null;
}

/** Where a picture of `size` sits inside `box` when fitted whole ("contain"). */
export function fitRect(box: { width: number; height: number } | null, size: { w: number; h: number } | null): LayoutRectangle | null {
  if (!box || !size || !box.width || !box.height || !size.w || !size.h) return null;
  const k = Math.min(box.width / size.w, box.height / size.h);
  const width = size.w * k;
  const height = size.h * k;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}

/** react-native-web turns `dataSet` into data-* attributes; React Native's types don't know it. */
export const webData = (d: Record<string, string>) => (Platform.OS === 'web' ? ({ dataSet: d } as object) : {});

/** SVG filters work in linear light by default; the canvas baker works in sRGB, so the screen asks for sRGB too (web). */
const SRGB = { colorInterpolationFilters: 'sRGB' } as object;

function StrokeShape({ s, short, hex }: { s: Stroke; short: number; hex?: string }) {
  const width = s.w * short;
  const color = hex ?? penHex(s.color);
  const opacity = s.tool === 'marker' ? MARKER_OPACITY : 1;
  if (s.pts.length === 2) {
    return <Circle cx={s.pts[0]} cy={s.pts[1]} r={width / 2} fill={color} opacity={opacity} />;
  }
  const pts: string[] = [];
  for (let i = 0; i < s.pts.length; i += 2) pts.push(`${s.pts[i]},${s.pts[i + 1]}`);
  return (
    <Polyline
      points={pts.join(' ')}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap={s.tool === 'marker' ? 'butt' : 'round'}
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

/**
 * The picture with its edits drawn (ME4): one SVG, its content transformed
 * from the original's pixels by the same transform the bakers use
 * (`exportPlan`), so screen and saved file match. Lines are drawn in the
 * original's pixels, scaled through the same transform. `width`/`height`
 * must have the edited picture's shape.
 */
export function EditedPicture(props: {
  uri: string | null;
  W: number;
  H: number;
  edit: Pick<MediaEdit, 'rotate' | 'crop' | 'filter' | 'strokes'>;
  width: number;
  height: number;
  /** Lines in the original's fractions; the live one while drawing goes here too. */
  showFilter?: boolean;
  onLoad?: () => void;
  /** Draw only the lines, on a clear background (the video's overlay). */
  linesOnly?: boolean;
}) {
  const raw = useId();
  const id = `f${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const { W, H, edit } = props;
  const plan = exportPlan({ w: W, h: H }, edit, {});
  const k = props.width / plan.out.w;
  const m = plan.matrix.map((v) => v * k);
  const filter = props.showFilter !== false && edit.filter !== 'original' && !props.linesOnly;
  const short = Math.min(W, H);
  // Lines are kept as fractions; drawn here in the original's pixels.
  const strokes = edit.strokes.map((s) => ({ ...s, pts: s.pts.map((v, i) => (i % 2 ? v * H : v * W)) }));
  return (
    <Svg width={props.width} height={props.height}>
      {filter && (
        <Defs>
          <Filter id={id} x="0" y="0" width="100%" height="100%" {...SRGB}>
            <FeColorMatrix type="matrix" values={matrixValues(FILTERS[edit.filter].matrix)} />
          </Filter>
        </Defs>
      )}
      <G transform={`matrix(${m.join(' ')})`}>
        {!props.linesOnly && props.uri && (
          <SvgImage
            href={props.uri}
            x={0}
            y={0}
            width={W}
            height={H}
            preserveAspectRatio="none"
            filter={filter ? `url(#${id})` : undefined}
            onLoad={props.onLoad}
          />
        )}
        {strokes.map((s, i) => (
          <StrokeShape key={i} s={s} short={short} />
        ))}
      </G>
    </Svg>
  );
}

/**
 * A photo moment full screen (ME4): the edited picture fitted in its box,
 * with its caption bar placed against the edited frame. Carries `data-edit`
 * and `data-size` on the web for the e2e.
 */
export function EditedPhoto(props: { uri: string; edit: MediaEdit | null; caption?: string | null; captionY?: number | null; box: LayoutRectangle | null; testID?: string }) {
  const size = useNaturalSize(props.uri);
  const edit = props.edit ?? { v: 1 as const, rotate: 0 as const, crop: null, filter: 'original' as const, strokes: [], trim: null };
  const shown = size ? editedSize(size.w, size.h, edit) : null;
  const rect = fitRect(props.box, shown);
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      testID={props.testID ?? 'edited-photo'}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Photo"
      {...webData({ edit: serializeEdit(edit) ?? '', size: shown ? `${Math.round(shown.w)}x${Math.round(shown.h)}` : '' })}
    >
      {rect && size && (
        <View style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, overflow: 'hidden' }}>
          <EditedPicture uri={props.uri} W={size.w} H={size.h} edit={edit} width={rect.width} height={rect.height} />
        </View>
      )}
      {rect && props.caption ? <CaptionBar text={props.caption} y={props.captionY ?? 0.6} rect={rect} /> : null}
    </View>
  );
}
