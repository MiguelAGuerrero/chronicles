import type { Faced } from '../../lib/moment';
import {
  Camera, GeoJSONSource, Layer, Map, Marker, VectorSource, type CameraRef, type MapRef, type VectorSourceRef,
} from '@maplibre/maplibre-react-native';
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { CapturePinView, pinLabel } from '../CapturePinView';
import { MarkPinView, markKey, markLabel } from '../MarkPinView';
import { StripLabel } from '../LandingMarks';
import { AreaPointView } from '../AreaPoint';
import { ComplexLabelView } from '../ComplexLabel';
import { COMPLEX_STYLE } from '../../lib/complexes/mapLayer';
import { namedStars, StarView, starLabel } from '../StarView';
import type { RoadFeature } from '../../lib/streets';
import type { LngLat } from '../../lib/types';
import { TILEJSON_URL } from '../../lib/tiles';
import { declutterMarks } from '../../lib/markNames';
import { metersPerPixel, pinReminded, pinThumb } from '../../lib/pins';
import { useReminded } from '../../lib/useReminded';
import { scaleBar } from '../../lib/scaleBar';
import { traceEnds } from '../../lib/traceEnds';
import { ScaleBar, SCALE_MAX_PX } from './ScaleBar';
import { useGlidingWalker } from '../../lib/useGlidingWalker';
import { distanceM } from '../../lib/geo';
import { releaseSwipe, SNAP } from '../../lib/atlas/snap';
import { capFitBounds } from '../../lib/zoomOut';
import type { DotSource } from '../../lib/liveDot';
import { markEnter, pinDrops, sameSeen } from '../../lib/enter';
import { useReducedMotion } from '../../lib/motion';
import { useUnits } from '../../lib/useUnits';
import { MOTION } from '../../lib/motionTokens';
import {
  alternatesGeoJSON, routeGradesGeoJSON, pinsGeoJSON, BORDER, bordersGeoJSON, WALK_STYLE, walkabilityGeoJSON, COLORS, coneGeoJSON, DERIVE_ZOOM, endsGeoJSON, FOG_STYLE, HOTSPOT, marksGeoJSON, pocketsGeoJSON, waitingDotsGeoJSON, WAITING_DOT_PAINT, ringGeoJSON, RING_COLOR, stripsGeoJSON, PLACES_ZOOM, pressRadiusM, routeGeoJSON, FOG_BOLD, MAP_STYLE_URL, WORLD_VEIL, segmentsGeoJSON, splitTrace, traceGeoJSON, RIDE_DASH, FAINT_OPACITY, GAP_LINK_DASH, DRAWING_DASH, useZoomPins, walkerGeoJSON,
  type CollectedFeatures, type WalkMapHandle, type WalkMapProps,
} from './types';

const VIEW_TIMEOUT_MS = 4000;

/**
 * Explore's swipes (DN1, DN2), made once per map: a one-finger move past half the swipe's length
 * is taken from the map, and reported when the finger lifts, with the camera's last centre.
 * MapLibre's pinch, turn and long press keep their own recognizers (unverified on a device).
 */
function createSwiper() {
  let onSwipe: WalkMapProps['onSwipe'];
  let centre: LngLat = [-71.4, 41.82];
  let zoom = 13;
  // This gesture's start, the most fingers seen in it, and the last long press: a pinch begun with one
  // finger, or a long press slid after it fired, is never a swipe (discrete-navigation audit 3).
  let downAt = 0;
  let fingers = 0;
  let heldAt = -Infinity;
  const seen = (n: number) => {
    fingers = Math.max(fingers, n);
  };
  const responder = PanResponder.create({
    onStartShouldSetPanResponderCapture: (e) => {
      if (e.nativeEvent.touches.length <= 1) {
        downAt = Date.now();
        fingers = 0;
      }
      seen(e.nativeEvent.touches.length);
      return false;
    },
    onMoveShouldSetPanResponderCapture: (_e, g) => {
      seen(g.numberActiveTouches);
      return !!onSwipe && fingers === 1 && heldAt < downAt && Math.hypot(g.dx, g.dy) >= SNAP.minSwipePx / 2;
    },
    onPanResponderMove: (_e, g) => seen(g.numberActiveTouches),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_e, g) => {
      const swipe = releaseSwipe({ dx: g.dx, dy: g.dy, maxTouches: fingers, held: heldAt >= downAt });
      // PanResponder's release speed is px/ms (DN2: a flick coasts).
      if (swipe) onSwipe?.({ ...swipe, vx: g.vx * 1000, vy: g.vy * 1000, center: centre, mpp: metersPerPixel(zoom, centre[1]) });
    },
  });
  return {
    handlers: responder.panHandlers,
    sync: (f: WalkMapProps['onSwipe']) => {
      onSwipe = f;
    },
    at: (c: LngLat, z: number) => {
      centre = c;
      zoom = z;
    },
    held: () => {
      heldAt = Date.now();
    },
  };
}
/** Invisible layers that make the query source load its tiles. */
const HIDDEN = { 'line-opacity': 0 } as const;

export const WalkMap = forwardRef<WalkMapHandle, WalkMapProps>(function WalkMap(props, ref) {
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const lastBearing = useRef(0);
  const queryRef = useRef<VectorSourceRef>(null);
  const [ready, setReady] = useState(false);
  const readyWaiters = useRef<(() => void)[]>([]);
  const regionChanged = useRef<(() => void) | null>(null);
  const rendered = useRef<(() => void) | null>(null);
  const size = useRef({ width: 0, height: 0 });
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  const lastView = useRef<{ zoom: number; lat: number } | null>(null);
  // Discrete navigation (DN1, DN2): with onSwipe, a one-finger drag is a swipe, never a pan.
  const [swiper] = useState(createSwiper);
  useEffect(() => {
    swiper.sync(props.onSwipe);
  });
  const names = useMemo(() => namedStars(props.stars ?? []), [props.stars]);
  // Pins grouped for the current zoom, so nearby ones merge instead of piling up.
  const pins = useZoomPins(props.captures, view?.zoom ?? props.initialZoom ?? null, view?.lat ?? null);
  const memoryPins = useZoomPins(props.memories ?? NO_CAPTURES, view?.zoom ?? props.initialZoom ?? null, view?.lat ?? null);
  // One read of the reminders per map, for the bells on its pins (RB1, RB6).
  const reminded = useReminded();
  // What was on screen before this change, for the deferred four (M10-M12): a remounted pin's view
  // gets its entrance from here. Nothing animates on first render, nor for captures older than the screen.
  const [openedAt] = useState(() => Date.now());
  const [seenMarks, setSeenMarks] = useState<ReadonlyMap<string, string>>(() => new globalThis.Map());
  const [seenCaptures, setSeenCaptures] = useState<ReadonlySet<string>>(() => new Set());
  // New state only on a real change: the discoveries array is new on every fix (audit 2, render budget).
  useEffect(() => {
    const marks = (props.discoveries ?? []).map((p) => [p.id, markState(p)] as const);
    const ids = props.captures.map((c) => c.id);
    const t = setTimeout(() => {
      setSeenMarks((cur) => (sameSeen(cur, marks) ? cur : new globalThis.Map(marks)));
      setSeenCaptures((cur) => (cur.size === ids.length && ids.every((id) => cur.has(id)) ? cur : new Set(ids)));
    }, 0);
    return () => clearTimeout(t);
  }, [props.discoveries, props.captures]);
  // Camera moves take the app's camera timing, and jump with reduce motion on (M2).
  const reduced = useReducedMotion();
  const duration = props.animate === false || reduced ? 0 : MOTION.camera;

  const fog = useMemo(() => segmentsGeoJSON(props.fog), [props.fog]);
  const walked = useMemo(() => segmentsGeoJSON(props.walked), [props.walked]);
  // The history changes once per chunk; only the tail is re-sent with each publish (perf, Nov 1).
  const split = useMemo(() => splitTrace(props.trace), [props.trace]);
  const traceTail = useMemo(() => traceGeoJSON(split.tail), [split.tail]);
  const rides = useMemo(() => traceGeoJSON(props.rides ?? []), [props.rides]);
  const faint = useMemo(() => traceGeoJSON(props.faint ?? []), [props.faint]);
  const gapLinks = useMemo(() => traceGeoJSON(props.gapLinks ?? []), [props.gapLinks]);
  const drawing = useMemo(() => traceGeoJSON(props.drawing ? [props.drawing] : []), [props.drawing]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const traceHistory = useMemo(() => traceGeoJSON(split.history), [split.historyKey]);
  const route = useMemo(() => routeGeoJSON(props.route), [props.route]);
  const alternates = useMemo(() => alternatesGeoJSON(props.alternates), [props.alternates]);
  const routeGrades = useMemo(() => routeGradesGeoJSON(props.routeGrades), [props.routeGrades]);
  const foundPins = useMemo(() => pinsGeoJSON(props.foundPins), [props.foundPins]);
  const pockets = useMemo(() => pocketsGeoJSON(props.landing), [props.landing]);
  const strips = useMemo(() => stripsGeoJSON(props.landing), [props.landing]);
  const marks = useMemo(() => marksGeoJSON(props.marks), [props.marks]);
  const waitingDots = useMemo(() => waitingDotsGeoJSON(props.waitingDots), [props.waitingDots]);
  // The start and end markers (QL1, QL2): a new source only when they move, not with every publish
  // of the trace (MapLibre RN serializes a source's data on each change).
  const endPoints = traceEnds(props.trace, !!props.ended);
  const endsKey = `${endPoints.start?.join(',') ?? ''}|${endPoints.end?.join(',') ?? ''}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ends = useMemo(() => endsGeoJSON(endPoints.start, endPoints.end), [endsKey]);
  const ring = useMemo(() => ringGeoJSON(props.ring), [props.ring]);
  const complexLines = useMemo(() => (props.complexes?.lines ?? { type: 'FeatureCollection', features: [] }) as GeoJSON.FeatureCollection, [props.complexes]);
  // Town borders (TB1-TB5): rebuilt only when the towns or their roles change (TB9).
  const borderKey = props.borders?.key ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const borders = useMemo(() => bordersGeoJSON(props.borders), [borderKey]);
  // Walkability (WK13): rebuilt only when the picture changes.
  const walkKey = props.walkability?.key ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const walkability = useMemo(() => walkabilityGeoJSON(props.walkability), [walkKey]);
  // The scale bar follows the view (QL7): the longest round length that fits at this zoom and latitude.
  const units = useUnits();
  const scale = useMemo(() => (view ? scaleBar(metersPerPixel(view.zoom, view.lat), SCALE_MAX_PX, units) : null), [view, units]);
  // The dot, cone and camera glide between fixes instead of jumping.
  const glide = useGlidingWalker(props.walker, props.walkerHeading, props.glideWalker === true, props.walkerSource);
  // The trace's end joins the live dot, so the line always reaches it (the live dot, Nov 1); never across a pause or gap.
  const openRun = split.tail[split.tail.length - 1];
  const traceEnd = props.walkerSource && openRun?.length ? openRun[openRun.length - 1] : null;
  // Drawn once per fix, to where the dot is heading, not per glide frame: MapLibre RN serializes a
  // source on each change (motion audit 5).
  const dotLead = useDotLead(props.walkerSource);
  const traceLink = useMemo(
    () => traceGeoJSON(traceEnd && dotLead && distanceM(traceEnd, dotLead) <= LINK_MAX_M ? [[traceEnd, dotLead]] : []),
    [traceEnd, dotLead],
  );
  const cone = useMemo(() => coneGeoJSON(glide.walker, glide.heading, view?.zoom ?? 16), [glide.walker, glide.heading, view]);
  const points = useMemo(() => walkerGeoJSON(glide.walker), [glide.walker]);

  useEffect(() => {
    // Follows the gliding dot, so the camera and the dot move together.
    if (!ready || !props.follow) return;
    // The replay holds a zoom while it follows (RR3; unverified on a device).
    const zoom = props.followZoom == null ? undefined : Math.round(props.followZoom * 100) / 100;
    // Gliding (the live walk), the camera rides the dot; otherwise it goes where `follow` says (a ceremony's camera, audit 25).
    const center = props.glideWalker ? (glide.walker ?? props.follow) : props.follow;
    cameraRef.current?.jumpTo(zoom == null ? { center } : { center, zoom });
  }, [ready, props.follow, props.followZoom, props.glideWalker, glide.walker]);
  // A fit is a request made while mounted: a map brought back (the home, after a walk) keeps its view.
  const onFitSettled = useRef(props.onFitSettled);
  useEffect(() => {
    onFitSettled.current = props.onFitSettled;
  });
  const fitAtMount = useRef(props.fitKey);
  useEffect(() => {
    if (!ready || !props.fitBounds || props.fitKey === fitAtMount.current) return;
    fitAtMount.current = undefined;
    const pad = props.fitPadding ?? { top: 48, right: 48, bottom: 48, left: 48 };
    // MapLibre RN's fitBounds has no maxZoom: the bounds are widened to fit no closer (tabs audit U15).
    const bounds = size.current.width ? capFitBounds(props.fitBounds, props.fitMaxZoom ?? 17, size.current, pad) : props.fitBounds;
    cameraRef.current?.fitBounds(bounds, { padding: pad, duration });
    // MapLibre RN reports no end to a fit: it is taken as settled once its animation has run.
    const key = props.fitKey ?? 0;
    const t = setTimeout(() => onFitSettled.current?.(key), (duration ?? 0) + 100);
    return () => clearTimeout(t);
    // Refits when the caller changes fitKey, not on every new bounds array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.fitKey]);

  const whenReady = () => (ready ? Promise.resolve() : new Promise<void>((r) => readyWaiters.current.push(r)));

  /** Waits for the camera move to land and the new view to finish rendering. */
  const settle = () =>
    new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        regionChanged.current = null;
        rendered.current = null;
        resolve(false);
      }, VIEW_TIMEOUT_MS);
      regionChanged.current = () => {
        regionChanged.current = null;
        // Only a render that starts after the move counts.
        rendered.current = () => {
          rendered.current = null;
          clearTimeout(timer);
          resolve(true);
        };
      };
    });

  useImperativeHandle(ref, () => ({
    size: () => size.current,
    async collectView(): Promise<CollectedFeatures> {
      await whenReady();
      const source = queryRef.current;
      const out: CollectedFeatures = { roads: [], names: [], places: [], pois: [], complete: true };
      if (!source || !mapRef.current) return { ...out, complete: false };
      // Below z14 the tiles are simplified and miss minor streets: pieces cut
      // from them would get other ids than the same streets at z14.
      if (Math.floor((await mapRef.current.getViewState()).zoom) < DERIVE_ZOOM) return { ...out, complete: false };
      const toRoad = (f: GeoJSON.Feature): RoadFeature => ({
        geometry: f.geometry as RoadFeature['geometry'],
        properties: (f.properties ?? {}) as Record<string, unknown>,
      });
      out.roads = (await source.querySourceFeatures({ sourceLayer: 'transportation' })).map(toRoad);
      out.names = (await source.querySourceFeatures({ sourceLayer: 'transportation_name' })).map(toRoad);
      out.places = (await source.querySourceFeatures({ sourceLayer: 'place' })).map(toRoad);
      out.pois = (await source.querySourceFeatures({ sourceLayer: 'poi' })).map(toRoad);
      return out;
    },
    resetNorth() {
      void cameraRef.current?.setStop({ bearing: 0, duration: props.animate === false || reduced ? 0 : MOTION.camera });
    },
    showPoint(at, padding) {
      cameraRef.current?.easeTo({ center: at, padding, duration: props.animate === false || reduced ? 0 : MOTION.ease });
    },
    async collectPlaces(center) {
      await whenReady();
      const map = mapRef.current;
      const source = queryRef.current;
      if (!map || !source) return null;
      const before = await map.getViewState();
      const wait = settle();
      cameraRef.current?.jumpTo({ center, zoom: PLACES_ZOOM });
      const ok = await wait;
      const places = ok
        ? (await source.querySourceFeatures({ sourceLayer: 'place' }).catch(() => null))?.map(
            (f: GeoJSON.Feature): RoadFeature => ({ geometry: f.geometry as RoadFeature['geometry'], properties: (f.properties ?? {}) as Record<string, unknown> }),
          ) ?? null
        : null;
      cameraRef.current?.jumpTo({ center: before.center, zoom: before.zoom });
      return places;
    },
    async collect(centers, shouldStop): Promise<CollectedFeatures> {
      await whenReady();
      const out: CollectedFeatures = { roads: [], names: [], places: [], pois: [], complete: true };
      const map = mapRef.current;
      const source = queryRef.current;
      if (!map || !source) return { ...out, complete: false };
      const before = await map.getViewState();
      const toRoad = (f: GeoJSON.Feature): RoadFeature => ({
        geometry: f.geometry as RoadFeature['geometry'],
        properties: (f.properties ?? {}) as Record<string, unknown>,
      });
      for (const center of centers) {
        if (shouldStop?.()) {
          out.complete = false;
          break;
        }
        const wait = settle();
        cameraRef.current?.jumpTo({ center, zoom: DERIVE_ZOOM });
        if (!(await wait)) out.complete = false;
        out.roads.push(...(await source.querySourceFeatures({ sourceLayer: 'transportation' })).map(toRoad));
        out.names.push(...(await source.querySourceFeatures({ sourceLayer: 'transportation_name' })).map(toRoad));
        out.places.push(...(await source.querySourceFeatures({ sourceLayer: 'place' })).map(toRoad));
        out.pois.push(...(await source.querySourceFeatures({ sourceLayer: 'poi' })).map(toRoad));
      }
      cameraRef.current?.jumpTo({ center: before.center, zoom: before.zoom });
      return out;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ready]);

  return (
    <View
      style={[styles.wrap, props.style]}
      {...(props.onSwipe ? swiper.handlers : null)}
      onLayout={(e: LayoutChangeEvent) => {
        size.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
      }}
    >
      <Map
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        attribution
        attributionPosition={props.attributionTop ? { top: 8, right: 8 } : undefined}
        logo={false}
        onPress={(e) => {
          const at = e.nativeEvent.lngLat;
          props.onPress?.(at, pressRadiusM(view?.zoom ?? 16, at[1]));
        }}
        onLongPress={(e) => {
          swiper.held();
          const at = e.nativeEvent.lngLat;
          props.onLongPress?.(at, pressRadiusM(view?.zoom ?? 16, at[1]));
        }}
        onDidFinishLoadingMap={() => {
          setReady(true);
          for (const r of readyWaiters.current.splice(0)) r();
        }}
        onRegionWillChange={(e) => {
          if (e.nativeEvent.userInteraction) props.onUserMove?.();
        }}
        // Two fingers turn the map (CP1); a tilt never does.
        touchRotate
        touchPitch={false}
        dragPan={!props.onSwipe}
        onRegionDidChange={(e) => {
          regionChanged.current?.();
          const { zoom, center, bearing } = e.nativeEvent;
          swiper.at([center[0], center[1]], zoom);
          if (typeof bearing === 'number' && Math.abs(bearing - lastBearing.current) >= 0.5) {
            lastBearing.current = bearing;
            props.onBearingChange?.(bearing);
          }
          props.onCameraChange?.({ center: [center[0], center[1]], zoom });
          setView((v) => (v && Math.abs(v.zoom - zoom) < 0.25 ? v : { zoom, lat: center[1] }));
          // Only a real change of view: not every settle, which would redraw every star.
          const last = lastView.current;
          if (!last || Math.abs(last.zoom - zoom) >= 0.25 || Math.abs(last.lat - center[1]) > 0.05) {
            lastView.current = { zoom, lat: center[1] };
            props.onViewChange?.(lastView.current);
          }
        }}
        onDidFinishRenderingMapFully={() => rendered.current?.()}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: props.initialCenter ?? [-71.4, 41.82], zoom: props.initialZoom ?? 15 }}
        />
        {/* The same tiles the style draws, as a source the app can query in full:
            rendered-feature queries would miss culled labels and unstyled layers. */}
        <VectorSource id="omt-query" ref={queryRef} url={TILEJSON_URL}>
          <Layer id="q-roads" type="line" source-layer="transportation" paint={HIDDEN} />
          <Layer id="q-names" type="line" source-layer="transportation_name" paint={HIDDEN} />
          <Layer id="q-places" type="circle" source-layer="place" paint={{ 'circle-opacity': 0 }} />
          <Layer id="q-pois" type="circle" source-layer="poi" paint={{ 'circle-opacity': 0 }} />
        </VectorSource>
        {/* Town borders, the first overlay: under everything the app draws (TB8). MapLibre RN has no
            base road layer id to go below, so they sit over the base map's streets (unverified on a device). */}
        <GeoJSONSource id="borders" data={borders}>
          <Layer id="border-fill" type="fill" minzoom={BORDER.minZoom} filter={['==', ['get', 'role'], 'tinted']}
            paint={{ 'fill-color': BORDER.color, 'fill-opacity': BORDER.fillOpacity }} />
          <Layer id="border-lined" type="line" minzoom={BORDER.minZoom} filter={['==', ['get', 'role'], 'lined']} layout={{ 'line-join': 'round' }}
            paint={{ 'line-color': BORDER.lined, 'line-width': BORDER.linedWidth, 'line-opacity': BORDER.linedOpacity }} />
          <Layer id="border-firm" type="line" minzoom={BORDER.minZoom} filter={['!=', ['get', 'role'], 'lined']} layout={{ 'line-join': 'round' }}
            paint={{ 'line-color': BORDER.color, 'line-width': BORDER.firmWidth, 'line-opacity': BORDER.firmOpacity }} />
        </GeoJSONSource>
        <GeoJSONSource id="veil" data={WORLD_VEIL}>
          <Layer id="veil" type="fill" paint={{ 'fill-color': COLORS.veil, 'fill-opacity': props.veil ? 0.45 : 0 }} />
        </GeoJSONSource>
        {/* The Walkability layer (UF9), under the hotspots, fog and trace: soft tints, no antialiasing so no seams (unverified on a device). */}
        <GeoJSONSource id="walkability" data={walkability}>
          {(['foot', 'car'] as const).map((band) => (
            <Layer key={band} id={`walk-${band}`} type="fill" filter={['==', ['get', 'band'], band]}
              paint={{ 'fill-color': WALK_STYLE[band].color, 'fill-opacity': WALK_STYLE[band].opacity, 'fill-antialias': false }} />
          ))}
        </GeoJSONSource>
        {/* Hotspots under the streets, in the one green no other layer uses (L9). */}
        <GeoJSONSource id="pockets" data={pockets}>
          <Layer id="pockets" type="fill" paint={{ 'fill-color': HOTSPOT, 'fill-opacity': ['case', ['get', 'stale'], 0.06, 0.14] }} />
        </GeoJSONSource>
        <GeoJSONSource id="strips" data={strips}>
          <Layer id="strips" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{
            'line-color': HOTSPOT,
            // Graded (AD12): each feature carries its grade's width and opacity.
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, ['*', 3, ['get', 'width']], 17, ['*', 10, ['get', 'width']]],
            'line-opacity': ['get', 'opacity'],
          }} />
        </GeoJSONSource>
        <GeoJSONSource id="fog" data={fog}>
          <Layer id="fog" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': props.fogEmphasis ? FOG_BOLD : COLORS.fog,
              'line-opacity': props.fogEmphasis ? 1 : FOG_STYLE.opacity,
              'line-width': props.fogEmphasis ? 5 : FOG_STYLE.widthMax,
            }} />
        </GeoJSONSource>
        <GeoJSONSource id="walked" data={walked}>
          <Layer id="walked" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': COLORS.walked, 'line-width': 6 }} />
        </GeoJSONSource>
        {/* A preview's other routes, faint, under the one highlighted (SR2). */}
        <GeoJSONSource id="alternates" data={alternates}>
          <Layer id="alternates-edge" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.8 }} />
          <Layer id="alternates" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': COLORS.route, 'line-width': 6, 'line-opacity': 0.4 }} />
        </GeoJSONSource>
        {/* The walk planner's graded stretches: a band under the route, wider where the kind is denser (WP16). */}
        <GeoJSONSource id="route-grades" data={routeGrades}>
          <Layer id="route-grades" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': HOTSPOT, 'line-width': ['get', 'width'], 'line-opacity': 0.45 }} />
        </GeoJSONSource>
        <GeoJSONSource id="route" data={route}>
          <Layer id="route-edge" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#ffffff', 'line-width': 12 }} />
          <Layer id="route" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': COLORS.route, 'line-width': 8 }} />
        </GeoJSONSource>
        {/* The trace on a white edge, so it reads over fog, walked streets and the base map alike:
            the history (memoized, so it isn't serialized again each render) and the live tail. */}
        {/* Offered stretches across gaps: the trace, see-through (Filling gaps, G6). */}
        {/* A gap with no line: grey dots between its ends (GW2). */}
        <GeoJSONSource id="gap-links" data={gapLinks}>
          <Layer id="gap-links" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': FOG_BOLD, 'line-width': 3, 'line-opacity': 0.8 * (props.traceOpacity ?? 1), 'line-dasharray': GAP_LINK_DASH }} />
        </GeoJSONSource>
        <TraceSource id="faint" data={faint} opacity={FAINT_OPACITY * (props.traceOpacity ?? 1)} />
        <TraceSource id="rides" data={rides} opacity={props.traceOpacity ?? 1} dashed />
        <TraceSource id="trace-history" data={traceHistory} opacity={props.traceOpacity ?? 1} />
        <TraceSource id="trace" data={traceTail} opacity={props.traceOpacity ?? 1} />
        <TraceSource id="trace-link" data={traceLink} opacity={props.traceOpacity ?? 1} />
        {/* A gap's way being drawn, dashed over the trace (GW3). */}
        <GeoJSONSource id="drawing" data={drawing}>
          <Layer id="drawing-edge" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': 0.9 }} />
          <Layer id="drawing" type="line" layout={{ 'line-cap': 'butt', 'line-join': 'round' }}
            paint={{ 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-dasharray': DRAWING_DASH }} />
        </GeoJSONSource>
        {/* Where the walk began and ended (QL1-QL3): above the trace, under the walker and the pins,
            going with the trace's opacity. A white disc ringed in the trace's green, or the walked orange. */}
        <GeoJSONSource id="ends" data={ends}>
          <Layer id="ends" type="circle" paint={{
            'circle-color': '#ffffff',
            'circle-radius': 7,
            'circle-stroke-width': 4,
            'circle-stroke-color': ['match', ['get', 'kind'], 'start', COLORS.trace, COLORS.walked],
            'circle-opacity': props.traceOpacity ?? 1,
            'circle-stroke-opacity': props.traceOpacity ?? 1,
          }} />
        </GeoJSONSource>
        <GeoJSONSource id="cone" data={cone}>
          <Layer id="cone" type="fill" paint={{ 'fill-color': COLORS.walker, 'fill-opacity': 0.25 }} />
        </GeoJSONSource>
        {/* The range preview (E21): a soft disc with a firm edge. */}
        <GeoJSONSource id="ring" data={ring}>
          <Layer id="ring-fill" type="fill" paint={{ 'fill-color': RING_COLOR, 'fill-opacity': 0.12 }} />
          <Layer id="ring" type="line" paint={{ 'line-color': RING_COLOR, 'line-width': 2.5, 'line-dasharray': [2, 1.5] }} />
        </GeoJSONSource>
        {/* The selected area's complexes (CX9): an outline with no fill, in a hue of its own. */}
        <GeoJSONSource id="complexes" data={complexLines}>
          <Layer id="complexes" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': COMPLEX_STYLE.color, 'line-width': COMPLEX_STYLE.width, 'line-opacity': COMPLEX_STYLE.opacity }} />
        </GeoJSONSource>
        <GeoJSONSource id="found-pins" data={foundPins}>
          <Layer id="found-pins" type="circle" paint={{ 'circle-color': HOTSPOT, 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 }} />
        </GeoJSONSource>
        {/* Explore's places still to find where a "?" would crowd (WT12, WT14). */}
        <GeoJSONSource id="waiting-dots" data={waitingDots}>
          <Layer id="waiting-dots" type="circle" paint={WAITING_DOT_PAINT as never} />
        </GeoJSONSource>
        <GeoJSONSource id="marks" data={marks}>
          <Layer id="marks" type="circle" paint={{ 'circle-color': '#ffffff', 'circle-radius': 9, 'circle-stroke-color': COLORS.walker, 'circle-stroke-width': 4 }} />
        </GeoJSONSource>
        <GeoJSONSource id="points" data={points}>
          <Layer id="points" type="circle" paint={{
            'circle-color': COLORS.walker,
            'circle-radius': 7,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          }} />
        </GeoJSONSource>
        {/* Memories from earlier walks: the same pins, faint, with their own tap (MR1-MR4), drawn
            before this walk's pins so those stay on top (audit 6). */}
        {memoryPins.map((pin) => (
          <Marker
            key={`memory:${pin.id}:${pin.captures.map((c) => c.id).join(',')}:${pinThumb(pin) ?? ''}:${pinReminded(pin, reminded)}`}
            id={`memory:${pin.id}`}
            lngLat={pin.lngLat}
            anchor="bottom"
            onPress={props.onMemoryPress ? () => props.onMemoryPress?.(pin.captures, pin.lngLat) : undefined}
          >
            <View
              accessible
              accessibilityRole={props.onMemoryPress ? 'button' : 'image'}
              accessibilityLabel={pinLabel(pin, !!props.onMemoryPress, true, pinReminded(pin, reminded))}
              style={styles.pinHit}
            >
              <CapturePinView pin={pin} faint reminded={pinReminded(pin, reminded)} />
            </View>
          </Marker>
        ))}
        {/* The Marker's own onPress: on iOS the annotation's tap recognizer
            swallows touches meant for a Pressable inside it. */}
        {/* The photo's small copy is in the key, so one made after the pin was drawn shows (QL27);
            the bell too, so a reminder set or stopped shows at once (RB5). */}
        {pins.map((pin) => (
          <Marker
            key={`${pin.id}:${pin.captures.length}:${pinThumb(pin) ?? ''}:${pinReminded(pin, reminded)}`}
            id={`${pin.id}:${pin.captures.length}:${pinThumb(pin) ?? ''}:${pinReminded(pin, reminded)}`}
            lngLat={pin.lngLat}
            anchor="bottom"
            onPress={props.onPinPress ? () => props.onPinPress?.(pin.captures) : undefined}
          >
            <View
              accessible
              accessibilityRole={props.onPinPress ? 'button' : 'image'}
              accessibilityLabel={pinLabel(pin, !!props.onPinPress, false, pinReminded(pin, reminded))}
              style={styles.pinHit}
            >
              <CapturePinView pin={pin} drop={pinDrops(pin.captures, seenCaptures, openedAt)} reminded={pinReminded(pin, reminded)} />
            </View>
          </Marker>
        ))}
        {declutterMarks(props.discoveries ?? [], view?.zoom ?? props.initialZoom ?? 16).map((pin) => (
          <Marker
            key={`mark:${pin.id}:${markKey(pin)}`}
            id={`mark:${pin.id}:${markKey(pin)}`}
            lngLat={pin.at}
            anchor="bottom"
            onPress={props.onDiscoveryPress && !pin.found ? () => props.onDiscoveryPress?.(pin.id) : undefined}
          >
            <View
              // WT11: Explore's "?" are one summary for a screen reader, never announced one by one.
              accessible={!pin.quiet}
              accessibilityElementsHidden={pin.quiet}
              importantForAccessibility={pin.quiet ? 'no-hide-descendants' : 'auto'}
              accessibilityRole={pin.found ? 'image' : 'button'}
              accessibilityLabel={markLabel(pin)}
              style={pin.found ? undefined : styles.pinHit}
            >
              <MarkPinView pin={pin} enter={seenMarks.size ? markEnter(markFrom(seenMarks.get(pin.id)), pin) : null} />
            </View>
          </Marker>
        ))}
        {(props.complexes?.labels ?? []).map((l) => (
          <Marker key={`complex:${l.id}:${l.text}`} id={`complex:${l.id}`} lngLat={l.at} anchor="center">
            <ComplexLabelView text={l.text} />
          </Marker>
        ))}
        {(props.areaPoints ?? []).map((p) => (
          <Marker key={`area:${p.id}:${p.name ?? ''}:${p.selected ? 1 : 0}`} id={`area:${p.id}`} lngLat={p.at} anchor="top" offset={[0, -6]}>
            <AreaPointView pin={p} />
          </Marker>
        ))}
        {[...(props.landing?.strips ?? []), ...(props.landing?.labels ?? [])].map((s) => (
          <Marker key={`label:${s.name}:${s.at.join(',')}`} id={`label:${s.name}:${s.at.join(',')}`} lngLat={s.at} anchor="center">
            <StripLabel name={s.name} />
          </Marker>
        ))}
        {(props.stars ?? []).map((star) => (
          <Marker
            key={`star:${star.id}:${star.count}`}
            id={`star:${star.id}:${star.count}`}
            lngLat={star.at}
            anchor="center"
            onPress={props.onStarPress ? () => props.onStarPress?.(star) : undefined}
          >
            <View accessible accessibilityRole="button" accessibilityLabel={starLabel(star)} style={styles.pinHit}>
              <StarView star={star} selected={star.id === props.selectedStar} named={names.has(star.id)} />
            </View>
          </Marker>
        ))}
      </Map>
      {scale && <ScaleBar bar={scale} inset={props.scaleInset} />}
      {props.covered && <View style={styles.cover} pointerEvents="none" />}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: COLORS.veil },
  // A 48 pt target around the 36 pt pin.
  pinHit: { paddingHorizontal: 6, paddingTop: 4 },
});

/**
 * One part of the trace. Memoized: MapLibre RN serializes a GeoJSONSource's
 * data on every render, so an unchanged history must not re-render (perf).
 */
const TraceSource = memo(function TraceSource(props: { id: string; data: GeoJSON.FeatureCollection; opacity: number; dashed?: boolean }) {
  return (
    <GeoJSONSource id={props.id} data={props.data}>
      <Layer id={`${props.id}-edge`} type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': 0.9 * props.opacity }} />
      {/* A ride is dashed (rides, R5). */}
      <Layer id={`${props.id}-line`} type="line" layout={{ 'line-cap': props.dashed ? 'butt' : 'round', 'line-join': 'round' }}
        paint={{ 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-opacity': props.opacity, ...(props.dashed ? { 'line-dasharray': RIDE_DASH } : {}) }} />
    </GeoJSONSource>
  );
});

/** The trace's end joins the live dot only this close; farther, it's a pause or gap, not lag. */
const LINK_MAX_M = 60;

/** Where the live dot is heading, updated once per fix. */
function useDotLead(source: DotSource | null | undefined): LngLat | null {
  const [lead, setLead] = useState<LngLat | null>(() => source?.get()?.lead ?? null);
  useEffect(() => {
    if (!source) return;
    return source.subscribe((s) => setLead(s.lead));
  }, [source]);
  return source ? lead : null;
}

const NO_CAPTURES: Faced[] = [];

const markState = (p: { revealed: boolean; found?: boolean; faint?: boolean }) => `${p.revealed ? 'r' : ''}${p.found ? 'f' : ''}${p.faint ? 'w' : ''}`;
const markFrom = (v: string | undefined) => (v == null ? undefined : { revealed: v.includes('r'), found: v.includes('f'), faint: v.includes('w') });
