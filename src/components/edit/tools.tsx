import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, type GestureResponderEvent, type LayoutRectangle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import {
  editedSize,
  fromFrame,
  FILTER_IDS,
  FILTERS,
  MARKER_OPACITY,
  moveCrop,
  PEN_SIZES,
  penHex,
  resizeCrop,
  simplifyStroke,
  strokeHit,
  strokeWidthFor,
  trimLabel,
  type Corner,
  type MediaEdit,
  type PenColorId,
  type Rect,
  type Stroke,
  type Trim,
} from '../../lib/mediaEdit';
import type { DrawTool } from '../../lib/editSession';
import { EditedPicture, fitRect } from './EditedPhoto';

const HANDLE = 44;

type Responder = {
  onStartShouldSetResponder: () => boolean;
  onMoveShouldSetResponder: () => boolean;
  onResponderTerminationRequest: () => boolean;
  onResponderGrant: (e: GestureResponderEvent) => void;
  onResponderMove: (e: GestureResponderEvent) => void;
  onResponderRelease: (e: GestureResponderEvent) => void;
  onResponderTerminate: (e: GestureResponderEvent) => void;
};

/** Touch handlers for a drag, by page position; the latest callbacks are read at each event. */
function useDrag(h: { start: (x: number, y: number, e: GestureResponderEvent) => void; move: (dx: number, dy: number, e: GestureResponderEvent) => void; end?: () => void }): Responder {
  const at = useRef({ x: 0, y: 0 });
  const cb = useRef(h);
  useEffect(() => {
    cb.current = h;
  });
  return {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e) => {
      at.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      cb.current.start(e.nativeEvent.locationX, e.nativeEvent.locationY, e);
    },
    onResponderMove: (e) => cb.current.move(e.nativeEvent.pageX - at.current.x, e.nativeEvent.pageY - at.current.y, e),
    onResponderRelease: () => cb.current.end?.(),
    onResponderTerminate: () => cb.current.end?.(),
  };
}

/**
 * The crop frame over the turned picture (ME6): dragged inside to move it,
 * by its corners to resize it, kept inside the picture and no smaller than
 * a tenth; with an aspect the height follows the width. `crop` and the
 * changes are in the turned frame's fractions.
 */
export function CropFrame(props: { rect: LayoutRectangle; crop: Rect; ratio: number | null; onChange: (r: Rect) => void }) {
  const { rect, crop } = props;
  const startCrop = useRef(crop);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const body = useDrag({
    start: () => {
      startCrop.current = latest.current.crop;
    },
    move: (dx, dy) => latest.current.onChange(moveCrop(startCrop.current, dx / rect.width, dy / rect.height)),
  });
  const startCorner = () => {
    startCrop.current = latest.current.crop;
  };
  const moveCorner = (c: Corner, dx: number, dy: number) =>
    latest.current.onChange(resizeCrop(startCrop.current, c, dx / rect.width, dy / rect.height, latest.current.ratio, rect.width, rect.height));
  const x = rect.x + crop.x * rect.width;
  const y = rect.y + crop.y * rect.height;
  const w = crop.w * rect.width;
  const h = crop.h * rect.height;
  const shade = [
    { left: rect.x, top: rect.y, width: rect.width, height: y - rect.y },
    { left: rect.x, top: y + h, width: rect.width, height: rect.y + rect.height - (y + h) },
    { left: rect.x, top: y, width: x - rect.x, height: h },
    { left: x + w, top: y, width: rect.x + rect.width - (x + w), height: h },
  ];
  return (
    <>
      {shade.map((s, i) => (
        <View key={i} pointerEvents="none" style={[styles.shade, s]} />
      ))}
      <View testID="crop-frame" {...body} style={[styles.frame, { left: x, top: y, width: w, height: h }]} accessibilityLabel="Crop frame" />
      {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((c) => (
        <CornerHandle key={c} corner={c} x={c[1] === 'l' ? x : x + w} y={c[0] === 't' ? y : y + h} onStart={startCorner} onMove={moveCorner} />
      ))}
    </>
  );
}

function CornerHandle(props: { corner: Corner; x: number; y: number; onStart: () => void; onMove: (c: Corner, dx: number, dy: number) => void }) {
  const drag = useDrag({ start: () => props.onStart(), move: (dx, dy) => props.onMove(props.corner, dx, dy) });
  return (
    <View testID={`crop-${props.corner}`} {...drag} style={[styles.handle, { left: props.x - HANDLE / 2, top: props.y - HANDLE / 2 }]} accessibilityLabel="Crop corner">
      <View style={styles.handleDot} />
    </View>
  );
}

const toPoints = (pts: number[], w: number, h: number) => {
  const out: string[] = [];
  for (let i = 0; i < pts.length; i += 2) out.push(`${pts[i] * w},${pts[i + 1] * h}`);
  return out.join(' ');
};

/**
 * The drawing surface over the edited picture (ME10, ME11): a drag draws a
 * line in the chosen tool, colour and thickness; the eraser removes whole
 * lines it touches. Points go back to the original's fractions as the line
 * ends, simplified.
 */
export function DrawLayer(props: {
  rect: LayoutRectangle;
  W: number;
  H: number;
  edit: MediaEdit;
  tool: DrawTool;
  color: PenColorId;
  size: number;
  full: boolean;
  onStroke: (s: Stroke) => void;
  onErase: (indexes: number[]) => void;
}) {
  const { rect } = props;
  const [live, setLive] = useState<number[] | null>(null);
  const pts = useRef<number[]>([]);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const erase = (fx: number, fy: number) => {
    const p = latest.current;
    const at = fromFrame({ x: fx, y: fy }, p.edit);
    const f = editedSize(p.W, p.H, p.edit);
    // About 14 points on screen, as a share of the original's shorter side.
    const radius = (14 / Math.min(p.rect.width, p.rect.height)) * (Math.min(f.w, f.h) / Math.min(p.W, p.H));
    const hit = p.edit.strokes.map((s, i) => (strokeHit(s, at, radius, p.W, p.H) ? i : -1)).filter((i) => i >= 0);
    if (hit.length) p.onErase(hit);
  };
  const drag = useDrag({
    start: (lx, ly) => {
      const fx = lx / rect.width;
      const fy = ly / rect.height;
      if (latest.current.tool === 'eraser') {
        pts.current = [fx, fy];
        erase(fx, fy);
        return;
      }
      if (latest.current.full) return;
      pts.current = [fx, fy];
      setLive([fx, fy]);
    },
    move: (dx, dy) => {
      if (!pts.current.length) return;
      const fx = pts.current[0] + dx / rect.width;
      const fy = pts.current[1] + dy / rect.height;
      if (latest.current.tool === 'eraser') {
        erase(fx, fy);
        return;
      }
      if (latest.current.full) return;
      const n = pts.current.length;
      // Under a point and a half apart is the same point.
      if (Math.hypot((fx - pts.current[n - 2]) * rect.width, (fy - pts.current[n - 1]) * rect.height) < 1.5) return;
      pts.current = [...pts.current, Math.max(0, Math.min(1, fx)), Math.max(0, Math.min(1, fy))];
      setLive(pts.current);
    },
    end: () => {
      const p = latest.current;
      const frame = pts.current;
      pts.current = [];
      setLive(null);
      if (p.tool === 'eraser' || p.full || frame.length < 2) return;
      const orig: number[] = [];
      for (let i = 0; i < frame.length; i += 2) {
        const q = fromFrame({ x: frame[i], y: frame[i + 1] }, p.edit);
        orig.push(Math.round(q.x * 1e5) / 1e5, Math.round(q.y * 1e5) / 1e5);
      }
      const tool = p.tool === 'marker' ? 'marker' : 'pen';
      p.onStroke({ tool, color: p.color, w: strokeWidthFor(tool, p.size, p.W, p.H, p.edit), pts: simplifyStroke(orig, 0.0015) });
    },
  });
  const tool = props.tool === 'marker' ? 'marker' : 'pen';
  const width = PEN_SIZES[tool][props.size] * Math.min(rect.width, rect.height);
  return (
    <View testID="draw-layer" {...drag} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }} accessibilityLabel="Drawing area">
      {live && props.tool !== 'eraser' && (
        // In a View that takes no pointer: on the web an <svg> under the finger would take the moves.
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={rect.width} height={rect.height}>
          {live.length === 2 ? (
            <Circle cx={live[0] * rect.width} cy={live[1] * rect.height} r={width / 2} fill={penHex(props.color)} opacity={tool === 'marker' ? MARKER_OPACITY : 1} />
          ) : (
            <Polyline
              points={toPoints(live, rect.width, rect.height)}
              fill="none"
              stroke={penHex(props.color)}
              strokeWidth={width}
              strokeLinecap={tool === 'marker' ? 'butt' : 'round'}
              strokeLinejoin="round"
              opacity={tool === 'marker' ? MARKER_OPACITY : 1}
            />
          )}
        </Svg>
        </View>
      )}
    </View>
  );
}

const TILE = 64;

/** The filter presets as small previews of the photo itself (ME8). */
export function FilterStrip(props: { uri: string; W: number; H: number; edit: MediaEdit; onPick: (id: MediaEdit['filter']) => void }) {
  const f = editedSize(props.W, props.H, props.edit);
  const r = fitRect({ width: TILE, height: TILE }, f);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} testID="filter-strip">
      {FILTER_IDS.map((id) => {
        const on = props.edit.filter === id;
        return (
          <Pressable
            key={id}
            testID={`edit-filter-${id}`}
            accessibilityRole="radio"
            accessibilityLabel={FILTERS[id].label}
            aria-checked={on}
            onPress={() => props.onPick(id)}
            style={styles.tile}
          >
            <View style={[styles.tileImg, on && styles.tileOn]}>
              {r && (
                <View style={{ position: 'absolute', left: r.x, top: r.y }}>
                  <EditedPicture uri={props.uri} W={props.W} H={props.H} edit={{ ...props.edit, filter: id, strokes: [] }} width={r.width} height={r.height} />
                </View>
              )}
            </View>
            <Text style={[styles.tileText, on && styles.tileTextOn]}>{FILTERS[id].label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * The trim bar (ME14): the clip's length with a start and an end handle;
 * dragging one shows that moment and the kept times. Each handle is also
 * adjustable by a screen reader, half a second a step.
 */
export function TrimBar(props: { durationMs: number; trim: Trim | null; onChange: (start: number, end: number) => void; onSeek: (ms: number) => void }) {
  const [width, setWidth] = useState(0);
  const dur = Math.max(1, props.durationMs);
  const start = props.trim?.start_ms ?? 0;
  const end = props.trim?.end_ms ?? dur;
  const from = useRef({ start, end });
  const latest = useRef({ start, end, props });
  useEffect(() => {
    latest.current = { start, end, props };
  });
  const startHandle = () => {
    from.current = { start: latest.current.start, end: latest.current.end };
  };
  const moveHandle = (which: 'start' | 'end', dx: number) => {
    if (!width) return;
    const d = (dx / width) * dur;
    const s = which === 'start' ? from.current.start + d : from.current.start;
    const e = which === 'end' ? from.current.end + d : from.current.end;
    latest.current.props.onChange(s, e);
    latest.current.props.onSeek(Math.max(0, Math.min(dur, which === 'start' ? s : e)));
  };
  const step = (which: 'start' | 'end', d: number) => {
    const s = which === 'start' ? start + d : start;
    const e = which === 'end' ? end + d : end;
    props.onChange(s, e);
    props.onSeek(which === 'start' ? s : e);
  };
  const a11y = (which: 'start' | 'end') => ({
    accessible: true,
    accessibilityRole: 'adjustable' as const,
    accessibilityLabel: which === 'start' ? 'Trim start' : 'Trim end',
    accessibilityValue: { text: trimLabel(start, end) },
    accessibilityActions: [{ name: 'increment' as const }, { name: 'decrement' as const }],
    onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => step(which, e.nativeEvent.actionName === 'increment' ? 500 : -500),
  });
  const x0 = (start / dur) * width;
  const x1 = (end / dur) * width;
  return (
    <View style={styles.trimWrap}>
      <Text testID="trim-label" style={styles.trimLabel} accessibilityLiveRegion="polite">
        {trimLabel(start, end)}
      </Text>
      <View style={styles.trimTrack} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.trimKept, { left: x0, width: Math.max(0, x1 - x0) }]} />
        <TrimHandle which="start" x={x0} a11y={a11y('start')} onStart={startHandle} onMove={moveHandle} />
        <TrimHandle which="end" x={x1} a11y={a11y('end')} onStart={startHandle} onMove={moveHandle} />
      </View>
    </View>
  );
}

function TrimHandle(props: { which: 'start' | 'end'; x: number; a11y: object; onStart: () => void; onMove: (which: 'start' | 'end', dx: number) => void }) {
  const drag = useDrag({ start: () => props.onStart(), move: (dx) => props.onMove(props.which, dx) });
  return (
    <View testID={`trim-${props.which}`} {...drag} {...props.a11y} style={[styles.trimHandle, { left: props.x - HANDLE / 2 }]}>
      <View style={styles.trimGrip} />
    </View>
  );
}

const styles = StyleSheet.create({
  shade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  frame: { position: 'absolute', borderWidth: 2, borderColor: '#ffffff' },
  handle: { position: 'absolute', width: HANDLE, height: HANDLE, alignItems: 'center', justifyContent: 'center' },
  handleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#14181f' },
  strip: { gap: 10, paddingHorizontal: 12 },
  tile: { alignItems: 'center', gap: 4, minWidth: 64 },
  tileImg: { width: TILE, height: TILE, borderRadius: 8, overflow: 'hidden', backgroundColor: '#000000', borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: '#ffffff' },
  tileText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  tileTextOn: { color: '#ffffff' },
  trimWrap: { gap: 8, paddingHorizontal: 20, alignSelf: 'stretch' },
  trimLabel: { color: '#ffffff', fontSize: 15, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  trimTrack: { height: HANDLE, justifyContent: 'center', marginHorizontal: HANDLE / 2 },
  trimKept: { position: 'absolute', top: 14, height: 16, borderRadius: 4, backgroundColor: 'rgba(255,214,10,0.85)' },
  trimHandle: { position: 'absolute', top: 0, width: HANDLE, height: HANDLE, alignItems: 'center', justifyContent: 'center' },
  trimGrip: { width: 12, height: 32, borderRadius: 4, backgroundColor: '#ffffff' },
});
