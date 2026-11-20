import type { Faced } from '../../lib/moment';
import {
  Camera, GeoJSONSource, Layer, Map, Marker, VectorSource, type CameraRef, type MapRef, type VectorSourceRef,
} from '@maplibre/maplibre-react-native';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { CapturePinView, pinLabel } from '../CapturePinView';
import { MarkPinView, markKey, markLabel, type MarkPin } from '../MarkPinView';
import { AreaPointView } from '../AreaPoint';
import { ComplexLabelView } from '../ComplexLabel';
import { COMPLEX_STYLE } from '../../lib/complexes/mapLayer';
import { groundGeoJSON, groundStyle } from '../../lib/areas/groundDraw';
import { namedStars, StarView, starLabel } from '../StarView';
import type { RoadFeature } from '../../lib/streets';
import type { LngLat } from '../../lib/types';
import { TILEJSON_URL } from '../../lib/tiles';
import { declutterMarks, markListKey, spreadKey } from '../../lib/markNames';
import { metersPerPixel, pinKey, pinReactions, pinReminded, pinThumb, stalkLift } from '../../lib/pins';
import { useReactionSets } from '../../lib/reactions/useReactions';
import { useReminded } from '../../lib/useReminded';
import { drawnFrom, scaleBar, scaleShown } from '../../lib/scaleBar';
import { traceEnds } from '../../lib/traceEnds';
import { ScaleBar, SCALE_MAX_PX } from './ScaleBar';
import { NATIVE_FRAME_MS, useGlideFrames, useGlideShown, type GlideFrame } from '../../lib/useGlidingWalker';
import { createStore, type Store } from '../../lib/store';
import { useStore } from '../../lib/useStore';
import { hopLines, hopsKey, revealedRuns } from '../../lib/ceremony/reveal';
import { perfCount } from '../../lib/perfCount';
import { litStreets } from '../../lib/replay';
import { distanceM } from '../../lib/geo';
import { releaseSwipe, SNAP } from '../../lib/atlas/snap';
import { capFitBounds } from '../../lib/zoomOut';
import type { DotSource } from '../../lib/liveDot';
import { markEnter, pinDrops, sameSeen } from '../../lib/enter';
import { MARK_MOTION, arrivalEnter, growsNow, inBounds, markDraw, markMoves, recentlyLeft } from '../../lib/markMotion';
import { useReducedMotion } from '../../lib/motion';
import { useUnits } from '../../lib/useUnits';
import { MOTION, REPLAY_ENGINE } from '../../lib/motionTokens';
import {
  alternatesGeoJSON, PAST_STYLE, type PastView, TRACE_EDGE_OPACITY, storefrontLayerOrder, storefrontNameLayers, storefrontNameRotate, storefrontNamesGeoJSON, routeGradesGeoJSON, pinsGeoJSON, BORDER, borderFillOpacity, bordersGeoJSON, WALK_STYLE, walkabilityGeoJSON, COLORS, coneGeoJSON, DERIVE_ZOOM, endsGeoJSON, ENDS_PAINT, ENDS_RING_PAINT, FOG_STYLE, HOTSPOT, marksGeoJSON, pocketsGeoJSON, waitingDotsGeoJSON, WAITING_DOT_PAINT, ringGeoJSON, RING_COLOR, stripsGeoJSON, PLACES_ZOOM, pressRadiusM, routeGeoJSON, FOG_BOLD, MAP_STYLE_URL, WORLD_VEIL, segmentsGeoJSON, splitTrace, traceGeoJSON, RIDE_DASH, FAINT_OPACITY, GAP_LINK_DASH, DRAWING_DASH, useZoomPins, walkerGeoJSON, BASE_VECTOR_SOURCE, POI_SOURCE_LAYER,
  LINE_SOURCE, type CollectedFeatures, type WalkMapHandle, type WalkMapProps, FLAT_NORTH_UP, resendKey, type ReplayMapFrame, FIT_MAX_ZOOM, FIT_PADDING,
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
  // Counted as the web map is (nothing unless `globalThis.__perf` is set): NF7's numbers on a device.
  perfCount('render:map');
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const lastBearing = useRef(0);
  // A map that comes back opens north-up (CP8), so its screen hears north as it goes (tend map audit 6).
  const bearingOut = useRef(props.onBearingChange);
  useEffect(() => {
    bearingOut.current = props.onBearingChange;
  });
  useEffect(
    () => () => {
      if (lastBearing.current !== 0) bearingOut.current?.(0);
    },
    [],
  );
  const queryRef = useRef<VectorSourceRef>(null);
  const [ready, setReady] = useState(false);
  const readyWaiters = useRef<(() => void)[]>([]);
  const regionChanged = useRef<(() => void) | null>(null);
  const rendered = useRef<(() => void) | null>(null);
  const size = useRef({ width: 0, height: 0 });
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  // QC24: the base style's shop and point-of-interest labels, hidden while a stop is a plain point (the outing's page, a followed
  // outing). Native cannot read the style, so the base source's `poi` layer is hidden whole; it is the base style's own source, never
  // the app's `omt-query` one (unverified on a device: NATIVE_UNVERIFIED). Redone when the style has finished loading.
  const hideLabels = !!props.hideLabels;
  useEffect(() => {
    if (!ready) return;
    void mapRef.current?.setSourceVisibility(!hideLabels, BASE_VECTOR_SOURCE, POI_SOURCE_LAYER).catch(() => {});
  }, [ready, hideLabels]);
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
  // One read of the reactions per map, for the bubbles on its pins (RX17); in the Marker key, as the bell is (unverified on a device).
  const sets = useReactionSets(!!props.captures?.length || !!props.memories?.length);
  // What was on screen before this change, for the deferred four (M10-M12): a remounted pin's view
  // gets its entrance from here. Nothing animates on first render, nor for captures older than the screen.
  const [openedAt] = useState(() => Date.now());
  const [seenMarks, setSeenMarks] = useState<ReadonlyMap<string, string>>(() => new globalThis.Map());
  const visibleBounds = useRef<VisibleBounds | null>(null);
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

  // How many of the walked streets are lit (replay ceremony RC23): all of them, but in the replay's first beat, where
  // they light up out of the fog in the order walked. Kept outside this component and moved by a timer, a few times a
  // second, so only the two street sources render as they light (unverified on a device).
  const [lit] = useState(() => createStore<number>(Infinity));
  const walkedCount = props.walked?.length ?? 0;
  const lightKey = typeof props.lightUp === 'object' ? props.lightUp.key : props.lightUp ?? 'lit';
  const lightOver = typeof props.lightUp === 'object' ? props.lightUp.over : 0;
  useEffect(() => {
    if (typeof lightKey !== 'number') {
      lit.set(lightKey === 'dark' ? 0 : Infinity);
      return;
    }
    const from = Date.now();
    lit.set(0);
    const timer = setInterval(() => {
      const n = litStreets(walkedCount, Date.now() - from, lightOver);
      lit.set(n >= walkedCount ? Infinity : n);
      if (n >= walkedCount) clearInterval(timer);
    }, REPLAY_ENGINE.resendMs);
    return () => clearInterval(timer);
  }, [lit, lightKey, lightOver, walkedCount]);
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
  // SS3: the lines and pockets are made again only when they change, never because the names near the selected area did.
  const landingGraded = props.landing?.graded;
  const landingPockets = props.landing?.pockets;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pockets = useMemo(() => pocketsGeoJSON(props.landing), [landingPockets]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const strips = useMemo(() => stripsGeoJSON(props.landing), [landingGraded]);
  // The storefront names (DC1, DC14), as the map's own text; re-made only when the areas or the reserved name change.
  const reserveKey = props.storefrontNamesReserve ? `${props.storefrontNamesReserve.name}|${props.storefrontNamesReserve.at.join(',')}` : '';
  // DC17: every "?" pin keeps its room; re-made only when the pins move.
  const pinsKey = props.landing ? (props.discoveries ?? []).map((d) => d.at.join(',')).join('|') : '';
  // DC18: the walk maps' names near you, re-made only when you move about 100 m.
  const nearKey = props.storefrontNamesNear ? `${props.storefrontNamesNear.at.map((x) => x.toFixed(3)).join(',')}:${props.storefrontNamesNear.m}` : '';
  const storefrontNameData = useMemo(
    () => storefrontNamesGeoJSON(props.landing, props.storefrontNamesReserve ?? null, (props.discoveries ?? []).map((d) => d.at), props.storefrontNamesNear ?? null),
    // The reserved name, the pins and where you are are read through their keys: a new object for the same is no change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.landing, reserveKey, pinsKey, nearKey],
  );
  // explore-dense-city ui 3: the names fold upright for the bearing the map settled on, to the nearest 5 degrees.
  const [namesBearing, setNamesBearing] = useState(0);
  // Set only when it changes: the same value set again still renders (map rules, DC12).
  const namesBearingNow = useRef(0);
  const nameLayers = useMemo(() => {
    const l = storefrontNameLayers();
    const rotate = storefrontNameRotate(namesBearing);
    return { ...l, layout: { ...l.layout, 'text-rotate': rotate }, turned: { ...l.turned, layout: { ...l.turned.layout, 'text-rotate': rotate } } };
  }, [namesBearing]);
  // DC16, audit 6: the storefront lines under the base labels, as on the web; the names over the lines (added after them), and
  // on Explore over everything.
  // audit 7: a map taken down mid-move reports no settle; say it is still, so whatever waits for its settle goes on.
  const onMoveStateRef = useRef(props.onMoveState);
  useEffect(() => {
    onMoveStateRef.current = props.onMoveState;
  });
  useEffect(() => () => onMoveStateRef.current?.(false), []);
  const storefrontOrder = storefrontLayerOrder(!!props.storefrontNamesOver);
  const namesBelow = storefrontOrder.names;
  const marks = useMemo(() => marksGeoJSON(props.marks), [props.marks]);
  const waitingDots = useMemo(() => waitingDotsGeoJSON(props.waitingDots), [props.waitingDots]);
  // The start and end markers (QL1, QL2): a new source only when they move, not with every publish
  // of the trace (MapLibre RN serializes a source's data on each change).
  const endPoints = traceEnds(Array.isArray(props.ended) ? props.ended : props.trace, !!props.ended);
  const endsKey = `${endPoints.start?.join(',') ?? ''}|${endPoints.end?.join(',') ?? ''}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ends = useMemo(() => endsGeoJSON(endPoints.start, endPoints.end), [endsKey]);
  // The markers a pin may stand on, whose edge its stalk stops at (decision 0172, O13): none while hidden with the trace.
  const markersShown = (props.traceOpacity ?? 1) > 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const standOn = useMemo(() => (markersShown ? [endPoints.start, endPoints.end] : []), [endsKey, markersShown]);
  // The pin rises by its lift and its target reaches on down over the marker, which never takes a tap (QL3):
  // the pin lists work it out from these, never from a closure a memo list would keep stale (native map frames).
  const ring = useMemo(() => ringGeoJSON(props.ring), [props.ring]);
  const ground = useMemo(() => groundGeoJSON(props.ground ?? null), [props.ground]);
  const complexLines = useMemo(() => (props.complexes?.lines ?? { type: 'FeatureCollection', features: [] }) as GeoJSON.FeatureCollection, [props.complexes]);
  // Town borders (TB1-TB5): rebuilt only when the towns or their roles change (TB9).
  const borderKey = props.borders?.key ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const borders = useMemo(() => bordersGeoJSON(props.borders), [borderKey]);
  /** Over the veil (the replay and a day, decision 0199): fixed for a screen, so the mount order never changes under it. */
  const bordersOver = !!props.bordersOverVeil;
  // Walkability (WK13): rebuilt only when the picture changes.
  const walkKey = props.walkability?.key ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const walkability = useMemo(() => walkabilityGeoJSON(props.walkability), [walkKey]);
  // The scale bar follows the view (QL7): the longest round length that fits at this zoom and latitude.
  const units = useUnits();
  const scale = useMemo(() => (view ? scaleBar(metersPerPixel(view.zoom, view.lat), SCALE_MAX_PX, units) : null), [view, units]);
  // No scale bar over a blank world (T17): with no fix, the map looks at what it drew each time it finishes drawing.
  const blankWatch = !!props.hideScaleOnBlank && !props.walker;
  const [drawn, setDrawn] = useState<boolean | null>(null);
  // The base tiles, read through the query source (the app's own layers, the world's veil among them, cover the world
  // whatever the tiles did): roads, water or places in them have drawn something (`drawnFrom`, tend map audit 14).
  const lookDrawn = () => {
    const source = queryRef.current;
    if (!blankWatch || !source) return;
    const count = (sourceLayer: string) => source.querySourceFeatures({ sourceLayer }).then((fs) => fs.length, () => 0);
    Promise.all([count('transportation'), count('water'), count('place')])
      .then(([roads, water, places]) => setDrawn(drawnFrom({ roads, water, places })))
      .catch(() => {});
  };
  const scaleOn = scaleShown({ hideOnBlank: !!props.hideScaleOnBlank, fix: !!props.walker, drawn });
  // The dot, cone and camera glide between fixes instead of jumping. The frames run outside React into a
  // store that only the dot, the cone and the follow read, so a frame never renders the map (NF1).
  const [frames] = useState(() => createStore<GlideFrame>({ walker: props.walker ?? null, heading: props.walkerHeading ?? null }));
  const glideOn = props.glideWalker === true;
  useGlideFrames(props.walker, props.walkerHeading, glideOn, frames.set, NATIVE_FRAME_MS, props.walkerSource);
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
  // NF8: the screen's marks array is new on every fix; the list is handed one that changes only with what they show.
  const marksIn = props.discoveries ?? NO_MARKS;
  const marksKey = markListKey(marksIn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shownMarks = useMemo(() => marksIn, [marksKey]);
  const jump = useCallback((to: { center: LngLat; zoom?: number }) => cameraRef.current?.jumpTo(to), []);
  // A replay's path (replay ceremony RC1-RC3, RC9; decision 0206): its frames come through the handle, outside React,
  // into a store only the replay's own dot and lines read, so a frame never renders the map. The camera is told where
  // to be in the same call as the dot. The line is sent as data, cut where it ends: whether MapLibre RN can reveal a
  // line by a gradient is untried, so the run being walked is sent again at most every `REPLAY_ENGINE.resendMs` of the
  // telling's time (ten times a second) and may trail the dot by that much. Unverified on a device.
  const [replayShown] = useState(() => createStore<ReplayShown>(NO_REPLAY));
  const replaySent = useRef<{ camera: string; walked: string; rides: string; hops: string }>({ camera: '', walked: '', rides: '', hops: '' });
  const applyReplay = useCallback((f: ReplayMapFrame | null) => {
    if (!f) {
      replaySent.current = { camera: '', walked: '', rides: '', hops: '' };
      replayShown.set(NO_REPLAY);
      return;
    }
    const { center, zoom } = f.camera;
    const camera = center ? `${center[0]},${center[1]},${zoom}` : '';
    if (center && camera !== replaySent.current.camera) cameraRef.current?.jumpTo(zoom == null ? { center, ...FLAT_NORTH_UP } : { center, zoom, ...FLAT_NORTH_UP });
    replaySent.current.camera = camera;
    const was = replayShown.get();
    const walked = resendKey(f.walked, f.ms, REPLAY_ENGINE.resendMs);
    const rides = resendKey(f.rides, f.ms, REPLAY_ENGINE.resendMs);
    // A break's hop, in the dots of a gap's link (RC21): sent again as it draws, by the telling's time.
    const hops = hopsKey(f.hops, f.ms, REPLAY_ENGINE.resendMs);
    replayShown.set({
      walker: f.walker,
      trace: walked === replaySent.current.walked ? was.trace : traceGeoJSON(revealedRuns(f.walked)),
      rides: rides === replaySent.current.rides ? was.rides : traceGeoJSON(revealedRuns(f.rides)),
      hops: hops === replaySent.current.hops ? was.hops : hops ? traceGeoJSON(hopLines(f.hops)) : null,
    });
    replaySent.current.walked = walked;
    replaySent.current.rides = rides;
    replaySent.current.hops = hops;
  }, [replayShown]);
  // The pins' presses, read when pressed: a screen's new closure each render never re-renders a pin list (NF4).
  // Filled in a layout effect, before the commit can take a tap: a pin made pressable in the same render as its
  // handler (the replay's card beat) never meets an empty ref (native-map-frames audit 4).
  const handlers = useRef<PinHandlers>({});
  useLayoutEffect(() => {
    handlers.current = { onMemoryPress: props.onMemoryPress, onPinPress: props.onPinPress, onDiscoveryPress: props.onDiscoveryPress, onStarPress: props.onStarPress };
  });
  // A fit is a request made while mounted: a map brought back (the home, after a walk) keeps its view.
  const onFitSettled = useRef(props.onFitSettled);
  useEffect(() => {
    onFitSettled.current = props.onFitSettled;
  });
  const fitAtMount = useRef(props.fitKey);
  useEffect(() => {
    if (!ready || !props.fitBounds || props.fitKey === fitAtMount.current) return;
    fitAtMount.current = undefined;
    const pad = props.fitPadding ?? FIT_PADDING;
    // MapLibre RN's fitBounds has no maxZoom: the bounds are widened to fit no closer (tabs audit U15).
    const bounds = size.current.width ? capFitBounds(props.fitBounds, props.fitMaxZoom ?? FIT_MAX_ZOOM, size.current, pad) : props.fitBounds;
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
    replayFrame: applyReplay,
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
    // A phone's screen reader moves on by itself when the compass goes (unverified on a device).
    focus() {},
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
      {...(props.onSwipe && !props.freePan ? swiper.handlers : null)}
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
          props.onMoveState?.(true);
        }}
        // Two fingers turn a map with a compass (CP1, decision 0082); the others stay north-up (tend map 1). A tilt never.
        touchRotate={!!props.onBearingChange}
        touchPitch={false}
        dragPan={!props.onSwipe || !!props.freePan}
        onRegionDidChange={(e) => {
          regionChanged.current?.();
          props.onMoveState?.(false);
          const { zoom, center, bearing } = e.nativeEvent;
          // The visible bounds of the last settle: only marks inside them grow in or shrink out (PI4).
          visibleBounds.current = (e.nativeEvent.bounds as VisibleBounds | undefined) ?? null;
          swiper.at([center[0], center[1]], zoom);
          const nb = typeof bearing === 'number' ? Math.round(bearing / 5) * 5 : 0;
          if (nb !== namesBearingNow.current) {
            namesBearingNow.current = nb;
            setNamesBearing(nb);
          }
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
        onDidFinishRenderingMapFully={() => {
          rendered.current?.();
          lookDrawn();
        }}
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
          {/* Water, so its tiles load for the blank-world look (tend map audit 14). */}
          <Layer id="q-water" type="fill" source-layer="water" paint={{ 'fill-opacity': 0 }} />
        </VectorSource>
        {/* The town borders, under everything else the app draws (TB8), and under the world's veil but on the replay and
            a day, where they mount after it, at a lighter fill (decision 0199: the town's edge and tint keep their
            contrast). Mount order is layer order; the screen's ask never changes while it is open. MapLibre RN has no
            base road layer id to go below, so they sit over the base map's streets (unverified on a device). */}
        {!bordersOver && <BordersSource data={borders} lighter={false} />}
        <VeilSource on={!!props.veil} />
        {bordersOver && <BordersSource data={borders} lighter={!!props.veil} />}
        {/* The Walkability layer (UF9), under the hotspots, fog and trace: soft tints, no antialiasing so no seams (unverified on a device). */}
        <WalkabilitySource data={walkability} />
        {/* Hotspots under the streets, in the one green no other layer uses (L9). */}
        <PocketsSource data={pockets} beforeId={storefrontOrder.lines} />
        <StripsSource data={strips} beforeId={storefrontOrder.lines} />
        <FogSource fog={props.fog} walked={props.walked} lit={lit} />
        <PastSource view={props.past ?? null} />
        <WalkedSource walked={props.walked} lit={lit} />
        {/* A preview's other routes, faint, under the one highlighted (SR2). */}
        <AlternatesSource data={alternates} />
        {/* The walk planner's graded stretches: a band under the route, wider where the kind is denser (WP16). */}
        <RouteGradesSource data={routeGrades} />
        <RouteSource data={route} />
        {/* The trace on a white edge, so it reads over fog, walked streets and the base map alike:
            the history (memoized, so it isn't serialized again each render) and the live tail. */}
        {/* Offered stretches across gaps: the trace, see-through (Filling gaps, G6). */}
        {/* A gap with no line: grey dots between its ends (GW2). */}
        <GapLinksSource store={replayShown} data={gapLinks} opacity={props.traceOpacity ?? 1} />
        <TraceSource id="faint" data={faint} opacity={FAINT_OPACITY * (props.traceOpacity ?? 1)} />
        <TraceSource id="rides" data={rides} opacity={props.traceOpacity ?? 1} dashed />
        <TraceSource id="trace-history" data={traceHistory} opacity={props.traceOpacity ?? 1} />
        <TraceSource id="trace" data={traceTail} opacity={props.traceOpacity ?? 1} />
        <TraceSource id="trace-link" data={traceLink} opacity={props.traceOpacity ?? 1} />
        {/* A replay's line as far as it is told (replay ceremony RC3): the rides under the walked line, as the trace's are. */}
        <ReplayLine store={replayShown} id="replay-rides" pick={replayRides} dashed />
        <ReplayLine store={replayShown} id="replay-trace" pick={replayTrace} />
        {/* A gap's way being drawn, dashed over the trace (GW3). */}
        <DrawingSource data={drawing} />
        <EndsSource data={ends} opacity={props.traceOpacity ?? 1} />
        <ConeSource frames={frames} walker={props.walker} heading={props.walkerHeading} enabled={glideOn} source={props.walkerSource} zoom={view?.zoom ?? 16} />
        {/* The range preview (E21): a soft disc with a firm edge. */}
        <RingSource data={ring} />
        {/* A selected neighborhood's own ground (HB9): one line, one look for every neighborhood, no fill (HB14). */}
        <GroundSource data={ground} />
        {/* The selected area's complexes (CX9): an outline with no fill, in a hue of its own. */}
        <ComplexesSource data={complexLines} />
        <FoundPinsSource data={foundPins} />
        {/* Explore's places still to find where a "?" would crowd (WT12, WT14). */}
        <WaitingDotsSource data={waitingDots} />
        <MarksSource data={marks} />
        <PointsSource frames={frames} walker={props.walker} heading={props.walkerHeading} enabled={glideOn} source={props.walkerSource} />
        <ReplayDot store={replayShown} />
        {/* The storefront names (DC1-DC6, DC14, DC16), the map's own text. Unverified on a device. */}
        <StorefrontNamesSource data={storefrontNameData} layers={nameLayers} beforeId={namesBelow} />
        <GlideFollow frames={frames} walker={props.walker} heading={props.walkerHeading} enabled={glideOn} source={props.walkerSource} ready={ready} follow={props.follow} followZoom={props.followZoom} jump={jump} />
        {/* Memories from earlier walks: the same pins, faint, with their own tap (MR1-MR4), drawn
            before this walk's pins so those stay on top (audit 6). */}
        <MemoryPinMarkers pins={memoryPins} sets={sets} reminded={reminded} now={props.now ?? openedAt} pressable={!!props.onMemoryPress} handlers={handlers} standOn={standOn} zoom={view?.zoom ?? props.initialZoom ?? 16} bearing={namesBearing} />
        <PinMarkers
          pins={pins} sets={sets} reminded={reminded} clocks={props.clocks} now={props.now ?? openedAt} openedAt={openedAt}
          seen={seenCaptures} pressable={!!props.onPinPress} handlers={handlers} standOn={standOn} zoom={view?.zoom ?? props.initialZoom ?? 16} bearing={namesBearing}
        />
        <MarkMarkers
          marks={shownMarks} zoom={view?.zoom ?? props.initialZoom ?? 16} bearing={namesBearing} spread={!!props.spreadMarks} seen={seenMarks}
          pressable={!!props.onDiscoveryPress} handlers={handlers} context={props.marksContext ?? null} bounds={visibleBounds} inRange={props.marksInRange}
        />
        <ComplexLabelMarkers labels={props.complexes?.labels ?? NO_LABELS} />
        <AreaPointMarkers points={props.areaPoints ?? NO_AREA_POINTS} />
        <StarMarkers stars={props.stars ?? NO_STARS} names={names} selected={props.selectedStar} pressable={!!props.onStarPress} handlers={handlers} />
      </Map>
      {scale && scaleOn && <ScaleBar bar={scale} inset={props.scaleInset} />}
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
    <GeoJSONSource id={props.id} data={props.data} {...LINE_SOURCE}>
      <Layer id={`${props.id}-edge`} type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': TRACE_EDGE_OPACITY * props.opacity }} />
      {/* A ride is dashed (rides, R5). */}
      <Layer id={`${props.id}-line`} type="line" layout={{ 'line-cap': props.dashed ? 'butt' : 'round', 'line-join': 'round' }}
        paint={{ 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-opacity': props.opacity, ...(props.dashed ? { 'line-dasharray': RIDE_DASH } : {}) }} />
    </GeoJSONSource>
  );
});

/** What a replay's frames have put on the map: the walker, and its lines as data (the same objects until sent again). */
type ReplayShown = { walker: LngLat | null; trace: GeoJSON.FeatureCollection; rides: GeoJSON.FeatureCollection; hops: GeoJSON.FeatureCollection | null };
const NO_LINES: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
const NO_REPLAY: ReplayShown = { walker: null, trace: NO_LINES, rides: NO_LINES, hops: null };
const replayHops = (s: ReplayShown) => s.hops;
const replayTrace = (s: ReplayShown) => s.trace;
const replayRides = (s: ReplayShown) => s.rides;
const replayWalker = (s: ReplayShown) => s.walker;

/** A replay's line, walked or ridden: renders when it is sent again, alone (replay ceremony RC3). */
const ReplayLine = memo(function ReplayLine({ store, id, pick, dashed }: { store: Store<ReplayShown>; id: string; pick: (s: ReplayShown) => GeoJSON.FeatureCollection; dashed?: boolean }) {
  const data = useStore(store, pick);
  return <TraceSource id={id} data={data} opacity={1} dashed={dashed} />;
});

/** A replay's walker: renders per frame, alone (replay ceremony RC1). */
const ReplayDot = memo(function ReplayDot({ store }: { store: Store<ReplayShown> }) {
  const walker = useStore(store, replayWalker);
  const data = useMemo(() => walkerGeoJSON(walker), [walker]);
  return (
    <GeoJSONSource id="replay-points" data={data}>
      <Layer id="replay-points" type="circle" paint={{
        'circle-color': COLORS.walker,
        'circle-radius': 7,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      }} />
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
const NO_MARKS: NonNullable<WalkMapProps['discoveries']> = [];
const NO_STARS: NonNullable<WalkMapProps['stars']> = [];
const NO_AREA_POINTS: NonNullable<WalkMapProps['areaPoints']> = [];
const NO_LABELS: ComplexLabels = [];

const markState = (p: { revealed: boolean; found?: boolean; faint?: boolean }) => `${p.revealed ? 'r' : ''}${p.found ? 'f' : ''}${p.faint ? 'w' : ''}`;
const markFrom = (v: string | undefined) => (v == null ? undefined : { revealed: v.includes('r'), found: v.includes('f'), faint: v.includes('w') });

/*
 * Native map frames (NF1-NF4). Each source below is a memo component handed only its data and primitives:
 * MapLibre RN's GeoJSONSource serializes its data whenever it renders, and inline <Layer> children are new
 * elements on every render, so a source written inline under WalkMap was sent again on every glide frame
 * and replay tick. Layer order is mount order, so each sits where its inline source was.
 */
type FC = GeoJSON.FeatureCollection;
const ROUND = { 'line-cap': 'round', 'line-join': 'round' } as const;

const BordersSource = memo(function BordersSource({ data, lighter }: { data: FC; lighter: boolean }) {
  return (
    <GeoJSONSource id="borders" data={data}>
      {/* Town borders: under everything else the app draws (TB8). MapLibre RN has no base road layer id to go below, so
          they sit over the base map's streets (unverified on a device). */}
      <Layer id="border-fill" type="fill" minzoom={BORDER.minZoom} filter={['==', ['get', 'role'], 'tinted']}
        paint={{ 'fill-color': BORDER.color, 'fill-opacity': borderFillOpacity(lighter) }} />
      <Layer id="border-lined" type="line" minzoom={BORDER.minZoom} filter={['==', ['get', 'role'], 'lined']} layout={{ 'line-join': 'round' }}
        paint={{ 'line-color': BORDER.lined, 'line-width': BORDER.linedWidth, 'line-opacity': BORDER.linedOpacity }} />
      <Layer id="border-firm" type="line" minzoom={BORDER.minZoom} filter={['!=', ['get', 'role'], 'lined']} layout={{ 'line-join': 'round' }}
        paint={{ 'line-color': BORDER.color, 'line-width': BORDER.firmWidth, 'line-opacity': BORDER.firmOpacity }} />
    </GeoJSONSource>
  );
});

const VeilSource = memo(function VeilSource({ on }: { on: boolean }) {
  return (
    <GeoJSONSource id="veil" data={WORLD_VEIL}>
      <Layer id="veil" type="fill" paint={{ 'fill-color': COLORS.veil, 'fill-opacity': on ? 0.45 : 0 }} />
    </GeoJSONSource>
  );
});

const WalkabilitySource = memo(function WalkabilitySource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="walkability" data={data}>
      {(['foot', 'car'] as const).map((band) => (
        <Layer key={band} id={`walk-${band}`} type="fill" filter={['==', ['get', 'band'], band]}
          paint={{ 'fill-color': WALK_STYLE[band].color, 'fill-opacity': WALK_STYLE[band].opacity, 'fill-antialias': false }} />
      ))}
    </GeoJSONSource>
  );
});

const PocketsSource = memo(function PocketsSource({ data, beforeId }: { data: FC; beforeId?: string }) {
  return (
    <GeoJSONSource id="pockets" data={data}>
      <Layer id="pockets" type="fill" beforeId={beforeId} paint={{ 'fill-color': HOTSPOT, 'fill-opacity': ['case', ['get', 'stale'], 0.06, 0.14] }} />
    </GeoJSONSource>
  );
});

const StripsSource = memo(function StripsSource({ data, beforeId }: { data: FC; beforeId?: string }) {
  return (
    <GeoJSONSource id="strips" data={data}>
      <Layer id="strips" type="line" beforeId={beforeId} layout={ROUND} paint={{
        'line-color': HOTSPOT,
        // Graded (AD12): each feature carries its grade's width and opacity.
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, ['*', 3, ['get', 'width']], 17, ['*', 10, ['get', 'width']]],
        'line-opacity': ['get', 'opacity'],
      }} />
    </GeoJSONSource>
  );
});

const litOf = (n: number) => n;

/**
 * The fog is always quiet (decision 0222, WB1). In the replay's first beat it holds the walked streets not lit yet
 * (replay ceremony RC23): it reads how many are from the store and renders alone when that changes.
 */
const FogSource = memo(function FogSource({ fog, walked, lit }: { fog: WalkMapProps['fog']; walked: WalkMapProps['walked']; lit: Store<number> }) {
  const n = useStore(lit, litOf);
  const data = useMemo(() => segmentsGeoJSON(n >= walked.length ? fog : [...fog, ...walked.slice(n)]), [fog, walked, n]);
  return (
    <GeoJSONSource id="fog" data={data} {...LINE_SOURCE}>
      <Layer id="fog" type="line" layout={ROUND}
        paint={{
          'line-color': COLORS.fog,
          'line-opacity': FOG_STYLE.opacity,
          'line-width': FOG_STYLE.widthMax,
        }} />
    </GeoJSONSource>
  );
});

/** Where I've been (WB9): one even tone, no edge, over the fog and under everything walked today (unverified on a device). */
const PastSource = memo(
  function PastSource({ view }: { view: PastView | null }) {
    const data = useMemo(() => traceGeoJSON(view?.runs ?? []), [view]);
    return (
      <GeoJSONSource id="past" data={data} {...LINE_SOURCE}>
        <Layer id="past" type="line" layout={ROUND} paint={{ 'line-color': COLORS.past, 'line-opacity': PAST_STYLE.opacity, 'line-width': PAST_STYLE.width }} />
      </GeoJSONSource>
    );
  },
  // By the lines' key (WB16): the same lines from a new object are not sent again.
  (a, b) => (a.view?.key ?? '') === (b.view?.key ?? ''),
);

/** The walked streets, as many as are lit (replay ceremony RC23): all of them outside the replay's first beat. */
const WalkedSource = memo(function WalkedSource({ walked, lit }: { walked: WalkMapProps['walked']; lit: Store<number> }) {
  const n = useStore(lit, litOf);
  const data = useMemo(() => segmentsGeoJSON(n >= walked.length ? walked : walked.slice(0, n)), [walked, n]);
  return (
    <GeoJSONSource id="walked" data={data} {...LINE_SOURCE}>
      <Layer id="walked" type="line" layout={ROUND} paint={{ 'line-color': COLORS.walked, 'line-width': 6 }} />
    </GeoJSONSource>
  );
});

const AlternatesSource = memo(function AlternatesSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="alternates" data={data} {...LINE_SOURCE}>
      <Layer id="alternates-edge" type="line" layout={ROUND} paint={{ 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.8 }} />
      <Layer id="alternates" type="line" layout={ROUND} paint={{ 'line-color': COLORS.route, 'line-width': 6, 'line-opacity': 0.4 }} />
    </GeoJSONSource>
  );
});

const RouteGradesSource = memo(function RouteGradesSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="route-grades" data={data} {...LINE_SOURCE}>
      <Layer id="route-grades" type="line" layout={ROUND} paint={{ 'line-color': HOTSPOT, 'line-width': ['get', 'width'], 'line-opacity': 0.45 }} />
    </GeoJSONSource>
  );
});

const RouteSource = memo(function RouteSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="route" data={data} {...LINE_SOURCE}>
      <Layer id="route-edge" type="line" layout={ROUND} paint={{ 'line-color': '#ffffff', 'line-width': 12 }} />
      <Layer id="route" type="line" layout={ROUND} paint={{ 'line-color': COLORS.route, 'line-width': 8 }} />
    </GeoJSONSource>
  );
});

/**
 * The dotted links: a replay's hops while its path is told (replay ceremony RC21), else the links the screen gives.
 * It renders when a hop is sent again, alone. Unverified on a device.
 */
const GapLinksSource = memo(function GapLinksSource({ store, data, opacity }: { store: Store<ReplayShown>; data: FC; opacity: number }) {
  const hops = useStore(store, replayHops);
  return (
    <GeoJSONSource id="gap-links" data={hops ?? data} {...LINE_SOURCE}>
      <Layer id="gap-links" type="line" layout={ROUND}
        paint={{ 'line-color': FOG_BOLD, 'line-width': 3, 'line-opacity': 0.8 * opacity, 'line-dasharray': GAP_LINK_DASH }} />
    </GeoJSONSource>
  );
});

const DrawingSource = memo(function DrawingSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="drawing" data={data} {...LINE_SOURCE}>
      <Layer id="drawing-edge" type="line" layout={ROUND} paint={{ 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': TRACE_EDGE_OPACITY }} />
      <Layer id="drawing" type="line" layout={{ 'line-cap': 'butt', 'line-join': 'round' }}
        paint={{ 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-dasharray': DRAWING_DASH }} />
    </GeoJSONSource>
  );
});

/*
 * Where the walk began and ended (QL1-QL3): above the trace, under the walker and the pins, going with the
 * trace's opacity. The start hollow, ringed in the trace's green (tend map T16); the end a bullseye (tend map
 * T25): the start and the end's walked outer ring first, then the end's walked centre and white band alone, so
 * a walk that ends on its start keeps its end whole (tend map audit 25).
 */
const EndsSource = memo(function EndsSource({ data, opacity }: { data: FC; opacity: number }) {
  return (
    <GeoJSONSource id="ends" data={data}>
      <Layer id="ends-ring" type="circle" paint={{ ...ENDS_RING_PAINT, 'circle-opacity': opacity, 'circle-stroke-opacity': opacity }} />
      <Layer id="ends" type="circle" filter={['==', ['get', 'kind'], 'end']} paint={{ ...ENDS_PAINT, 'circle-opacity': opacity, 'circle-stroke-opacity': opacity }} />
    </GeoJSONSource>
  );
});

const RingSource = memo(function RingSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="ring" data={data}>
      <Layer id="ring-fill" type="fill" paint={{ 'fill-color': RING_COLOR, 'fill-opacity': 0.12 }} />
      <Layer id="ring" type="line" paint={{ 'line-color': RING_COLOR, 'line-width': 2.5, 'line-dasharray': [2, 1.5] }} />
    </GeoJSONSource>
  );
});

const GroundSource = memo(function GroundSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="ground" data={data}>
      <Layer id="ground" type="line" layout={ROUND} paint={{ 'line-color': groundStyle().color, 'line-width': groundStyle().width }} />
    </GeoJSONSource>
  );
});

const ComplexesSource = memo(function ComplexesSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="complexes" data={data}>
      <Layer id="complexes" type="line" layout={ROUND} paint={{ 'line-color': COMPLEX_STYLE.color, 'line-width': COMPLEX_STYLE.width, 'line-opacity': COMPLEX_STYLE.opacity }} />
    </GeoJSONSource>
  );
});

const FoundPinsSource = memo(function FoundPinsSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="found-pins" data={data}>
      <Layer id="found-pins" type="circle" paint={{ 'circle-color': HOTSPOT, 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 }} />
    </GeoJSONSource>
  );
});

const WaitingDotsSource = memo(function WaitingDotsSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="waiting-dots" data={data}>
      <Layer id="waiting-dots" type="circle" paint={WAITING_DOT_PAINT as never} />
    </GeoJSONSource>
  );
});

const MarksSource = memo(function MarksSource({ data }: { data: FC }) {
  return (
    <GeoJSONSource id="marks" data={data}>
      <Layer id="marks" type="circle" paint={{ 'circle-color': '#ffffff', 'circle-radius': 9, 'circle-stroke-color': COLORS.walker, 'circle-stroke-width': 4 }} />
    </GeoJSONSource>
  );
});

type NameLayers = ReturnType<typeof storefrontNameLayers>;
const StorefrontNamesSource = memo(function StorefrontNamesSource({ data, layers, beforeId }: { data: FC; layers: NameLayers; beforeId?: string }) {
  return (
    <GeoJSONSource id="storefront-names" data={data}>
      <Layer id="storefront-names" type="symbol" minzoom={layers.minzoom} beforeId={beforeId} filter={layers.filter as never} layout={layers.layout as never} paint={layers.paint as never} />
      {/* A turned name, centred or left out, never slid across its street (audit 1). */}
      <Layer id="storefront-names-turned" type="symbol" minzoom={layers.minzoom} beforeId={beforeId} filter={layers.turned.filter as never} layout={layers.turned.layout as never} paint={layers.turned.paint as never} />
      {/* The room the selected area's name and each "?" pin keep (DC14, DC17), placed first. */}
      <Layer id="storefront-names-room" type="symbol" minzoom={layers.minzoom} beforeId={beforeId} filter={layers.room.filter as never} layout={layers.room.layout as never} paint={layers.room.paint as never} />
    </GeoJSONSource>
  );
});

/** What the glide's parts read: the frames, and the props that stand in until a frame comes (NF1). */
type GlideIn = {
  frames: Store<GlideFrame>;
  walker: LngLat | null | undefined;
  heading: number | null | undefined;
  enabled: boolean;
  source: DotSource | null | undefined;
};

/** The walker's cone: renders per glide frame, alone. */
const ConeSource = memo(function ConeSource({ frames, walker, heading, enabled, source, zoom }: GlideIn & { zoom: number }) {
  perfCount('render:glide');
  const g = useGlideShown(frames, walker, heading, enabled, source);
  const data = useMemo(() => coneGeoJSON(g.walker, g.heading, zoom), [g.walker, g.heading, zoom]);
  return (
    <GeoJSONSource id="cone" data={data}>
      <Layer id="cone" type="fill" paint={{ 'fill-color': COLORS.walker, 'fill-opacity': 0.25 }} />
    </GeoJSONSource>
  );
});

/** The walker's dot: renders per glide frame, alone. */
const PointsSource = memo(function PointsSource({ frames, walker, heading, enabled, source }: GlideIn) {
  const g = useGlideShown(frames, walker, heading, enabled, source);
  const data = useMemo(() => walkerGeoJSON(g.walker), [g.walker]);
  return (
    <GeoJSONSource id="points" data={data}>
      <Layer id="points" type="circle" paint={{
        'circle-color': COLORS.walker,
        'circle-radius': 7,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      }} />
    </GeoJSONSource>
  );
});

/** The follow camera: rides the gliding dot, so the camera and the dot move together. Draws nothing. */
const GlideFollow = memo(function GlideFollow(p: GlideIn & { ready: boolean; follow: LngLat | null | undefined; followZoom: number | null | undefined; jump: (to: { center: LngLat; zoom?: number }) => void }) {
  const g = useGlideShown(p.frames, p.walker, p.heading, p.enabled, p.source);
  const { ready, follow, followZoom, enabled, jump } = p;
  useEffect(() => {
    if (!ready || !follow) return;
    // The replay holds a zoom while it follows (RR3; unverified on a device).
    const zoom = followZoom == null ? undefined : Math.round(followZoom * 100) / 100;
    // Gliding (the live walk), the camera rides the dot; otherwise it goes where `follow` says (a ceremony's camera, audit 25).
    const center = enabled ? (g.walker ?? follow) : follow;
    jump(zoom == null ? { center } : { center, zoom });
  }, [ready, follow, followZoom, enabled, g.walker, jump]);
  return null;
});

/*
 * The pins (NF4): each list re-renders only when its own pins, their reactions or reminders, or what it is
 * drawn against change, never with a glide frame or a screen's new closure. Presses are read from `handlers`
 * when pressed. The Marker's own onPress: on iOS the annotation's tap recognizer swallows touches meant for
 * a Pressable inside it.
 */
type PinHandlers = Pick<WalkMapProps, 'onMemoryPress' | 'onPinPress' | 'onDiscoveryPress' | 'onStarPress'>;
type Pins = ReturnType<typeof useZoomPins>;
type Sets = ReturnType<typeof useReactionSets>;
type ComplexLabels = NonNullable<NonNullable<WalkMapProps['complexes']>['labels']>;
type PinListIn = {
  pins: Pins; sets: Sets; reminded: ReadonlySet<string>; now: number; pressable: boolean; handlers: RefObject<PinHandlers>;
  /** What a pin's stalk lift reads (tend map 13, decision 0172 O13): the markers it may stand on, the zoom and the bearing. */
  standOn: readonly (LngLat | null)[]; zoom: number; bearing: number;
};

/** Each pin's reactions, worked out once per change of the pins or the reactions, not per render. */
function useReactionsOf(pins: Pins, sets: Sets) {
  return useMemo(() => pins.map((pin) => pinReactions(pin, sets)), [pins, sets]);
}

const MemoryPinMarkers = memo(function MemoryPinMarkers({ pins, sets, reminded, now, pressable, handlers, standOn, zoom, bearing }: PinListIn) {
  const rx = useReactionsOf(pins, sets);
  return pins.map((pin, i) => {
    const bell = pinReminded(pin, reminded);
    return (
      <Marker
        key={`memory:${pin.id}:${pin.captures.map((c) => c.id).join(',')}:${pinThumb(pin) ?? ''}:${rx[i].map((r) => r.id).join(',')}:${bell}`}
        id={`memory:${pin.id}`}
        lngLat={pin.lngLat}
        anchor="bottom"
        onPress={pressable ? () => handlers.current?.onMemoryPress?.(pin.captures, pin.lngLat) : undefined}
      >
        <View accessible accessibilityRole={pressable ? 'button' : 'image'} accessibilityLabel={pinLabel(pin, pressable, true, bell, undefined, now, rx[i])} style={[styles.pinHit, { paddingBottom: stalkLift(pin.lngLat, standOn, zoom, bearing) }]}>
          <CapturePinView pin={pin} faint reminded={bell} reactions={rx[i]} />
        </View>
      </Marker>
    );
  });
});

/* The photo's small copy is in the key, so one made after the pin was drawn shows (QL27); the bell too, so a
   reminder set or stopped shows at once (RB5). */
const PinMarkers = memo(function PinMarkers({ pins, sets, reminded, clocks, now, openedAt, seen, pressable, handlers, standOn, zoom, bearing }: PinListIn & { clocks: WalkMapProps['clocks']; openedAt: number; seen: ReadonlySet<string> }) {
  const rx = useReactionsOf(pins, sets);
  return pins.map((pin, i) => {
    const bell = pinReminded(pin, reminded);
    const key = `${pinKey(pin)}:${rx[i].map((r) => r.id).join(',')}:${bell}`;
    return (
      <Marker key={key} id={key} lngLat={pin.lngLat} anchor="bottom" onPress={pressable ? () => handlers.current?.onPinPress?.(pin.captures) : undefined}>
        <View accessible accessibilityRole={pressable ? 'button' : 'image'} accessibilityLabel={pinLabel(pin, pressable, false, bell, clocks, now, rx[i])} style={[styles.pinHit, { paddingBottom: stalkLift(pin.lngLat, standOn, zoom, bearing) }]}>
          <CapturePinView pin={pin} drop={pinDrops(pin.captures, seen, openedAt)} reminded={bell} reactions={rx[i]} />
        </View>
      </Marker>
    );
  });
});

type VisibleBounds = [number, number, number, number];

/**
 * Places come and go with a settle on a walk (PI1-PI14), native: which "?" grow in and which shrink out, decided a
 * tick after the list changes (as `seenMarks` is), from what was shown, the context (`marksContext`) and the visible
 * bounds of the last settle. A new mark is held back for that tick when it could be arriving, so it never shows at
 * full size before growing. Unverified on a device.
 */
/** A native "?" marker's key: a change of look or spread mounts it afresh (pins.md). */
const markMarkerKey = (pin: MarkPin) => `mark:${pin.id}:${markKey(pin)}:${spreadKey(pin.spread)}`;

function useMarkMoves(pins: readonly MarkPin[], context: string | null, bounds: RefObject<VisibleBounds | null>, inRange: ReadonlySet<string> | undefined) {
  type Decided = {
    known: ReadonlySet<string> | null;
    context: string | null;
    /** The last decision's marks, so one gone from the list is drawn still on its own marker until decided (audit 2). */
    pins: ReadonlyMap<string, MarkPin>;
    /** Each arrival's marker key: it grows only under that key, never on a remount (audit 6). */
    grow: ReadonlyMap<string, string>;
    leaving: ReadonlyMap<string, MarkPin>;
  };
  const [state, setState] = useState<Decided>(() => ({ known: null, context: null, pins: new globalThis.Map(), grow: new globalThis.Map(), leaving: new globalThis.Map() }));
  const shown = useRef<{ ids: Set<string> | null; context: string | null; pins: ReadonlyMap<string, MarkPin>; inRange?: ReadonlySet<string> }>({ ids: null, context: null, pins: new globalThis.Map() });
  const leftAt = useRef(new globalThis.Map<string, number>());
  const leaving = useRef(new globalThis.Map<string, MarkPin>());
  useEffect(() => {
    const t = setTimeout(() => {
      const ids = pins.map((p) => p.id);
      const was = shown.current;
      if (was.ids && was.context === context && was.ids.size === ids.length && ids.every((id) => was.ids?.has(id))) return;
      const now = Date.now();
      const atOf = new globalThis.Map<string, LngLat>([...was.pins].map(([id, p]) => [id, p.at] as const));
      for (const p of pins) atOf.set(p.id, p.at);
      const moves = markMoves({
        prev: was.ids,
        prevContext: was.context,
        ids,
        context,
        recentlyLeft: recentlyLeft(leftAt.current, now),
        leaving: new Set(leaving.current.keys()),
        inView: (id) => inBounds(atOf.get(id) ?? [NaN, NaN], bounds.current),
        inRangeBefore: was.inRange,
        inRangeNow: inRange,
      });
      const next = new globalThis.Map(leaving.current);
      for (const id of moves.back) next.delete(id);
      const now2 = new Set(ids);
      for (const [id, p] of was.pins) {
        if (now2.has(id)) continue;
        leftAt.current.set(id, now);
        if (moves.leaving.has(id)) next.set(id, p);
      }
      for (const [id, at] of leftAt.current) if (now - at > MARK_MOTION.backStillMs) leftAt.current.delete(id);
      leaving.current = next;
      const byId = new globalThis.Map(pins.map((p) => [p.id, p] as const));
      shown.current = { ids: now2, context, pins: byId, inRange };
      const grow = new globalThis.Map<string, string>();
      for (const id of moves.arriving) {
        const p = byId.get(id);
        if (p) grow.set(id, markMarkerKey(p));
      }
      setState({ known: now2, context, pins: byId, grow, leaving: next });
    }, 0);
    return () => clearTimeout(t);
  }, [pins, context, bounds, inRange]);
  const left = useCallback((id: string) => {
    if (!leaving.current.has(id)) return;
    const next = new globalThis.Map(leaving.current);
    next.delete(id);
    leaving.current = next;
    setState((s) => ({ ...s, leaving: next }));
  }, []);
  const draw = markDraw({ ids: pins.map((p) => p.id), context, decided: { known: state.known, context: state.context }, leaving: new Set(state.leaving.keys()) });
  const stillGone = [...draw.stillGone].flatMap((id) => {
    const p = state.pins.get(id);
    return p ? [p] : [];
  });
  return { grow: state.grow, leaving: state.leaving, held: draw.held, stillGone, left };
}

const MarkMarkers = memo(function MarkMarkers({ marks, zoom, bearing, spread, seen, pressable, handlers, context, bounds, inRange }: { marks: NonNullable<WalkMapProps['discoveries']>; zoom: number; bearing: number; spread: boolean; seen: ReadonlyMap<string, string>; pressable: boolean; handlers: RefObject<PinHandlers>; context: string | null; bounds: RefObject<VisibleBounds | null>; inRange: ReadonlySet<string> | undefined }) {
  const shown = useMemo(() => declutterMarks(marks, zoom, { bearing, spread }), [marks, zoom, bearing, spread]);
  const moves = useMarkMoves(shown as MarkPin[], context, bounds, inRange);
  // The spread is in the key: whether a Marker's children redraw without a new key is unverified on a device (pins.md).
  const live = shown.filter((pin) => !moves.held.has(pin.id)).map((pin) => (
    <Marker
      key={markMarkerKey(pin)}
      id={markMarkerKey(pin)}
      lngLat={pin.at}
      anchor="bottom"
      // A spread pin stands off its point, on a leg back to it (fix mark-overlap).
      offset={pin.spread ? [pin.spread.dx, pin.spread.dy] : undefined}
      onPress={pressable && !pin.found ? () => handlers.current?.onDiscoveryPress?.(pin.id) : undefined}
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
        <MarkPinView pin={pin} enter={arrivalEnter(growsNow(moves.grow, pin.id, markMarkerKey(pin)), seen.size ? markEnter(markFrom(seen.get(pin.id)), pin) : null)} />
      </View>
    </Marker>
  ));
  // Gone from the list, a mark is drawn still on its own marker until its leave is decided (audit 2), then shrinks out
  // there (PI3), taking no tap and hidden from a screen reader (PI6): one marker throughout, never a second.
  const going = [...moves.stillGone.map((pin) => [pin, false] as const), ...[...moves.leaving.values()].map((pin) => [pin, true] as const)].map(([pin, out]) => (
    <Marker key={markMarkerKey(pin)} id={markMarkerKey(pin)} lngLat={pin.at} anchor="bottom" offset={pin.spread ? [pin.spread.dx, pin.spread.dy] : undefined}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={pin.found ? undefined : styles.pinHit}>
        <MarkPinView pin={pin} onLeft={out ? () => moves.left(pin.id) : undefined} />
      </View>
    </Marker>
  ));
  return [...live, ...going];
});

const ComplexLabelMarkers = memo(function ComplexLabelMarkers({ labels }: { labels: ComplexLabels }) {
  return labels.map((l) => (
    <Marker key={`complex:${l.id}:${l.text}`} id={`complex:${l.id}`} lngLat={l.at} anchor="center">
      <ComplexLabelView text={l.text} />
    </Marker>
  ));
});

const AreaPointMarkers = memo(function AreaPointMarkers({ points }: { points: NonNullable<WalkMapProps['areaPoints']> }) {
  return points.map((p) => (
    <Marker key={`area:${p.id}:${p.name ?? ''}:${p.selected ? 1 : 0}`} id={`area:${p.id}`} lngLat={p.at} anchor="top" offset={[0, -6]}>
      <AreaPointView pin={p} />
    </Marker>
  ));
});

const StarMarkers = memo(function StarMarkers({ stars, names, selected, pressable, handlers }: { stars: NonNullable<WalkMapProps['stars']>; names: ReadonlySet<string>; selected: string | null | undefined; pressable: boolean; handlers: RefObject<PinHandlers> }) {
  return stars.map((star) => (
    <Marker
      key={`star:${star.id}:${star.count}`}
      id={`star:${star.id}:${star.count}`}
      lngLat={star.at}
      anchor="center"
      onPress={pressable ? () => handlers.current?.onStarPress?.(star) : undefined}
    >
      <View accessible accessibilityRole="button" accessibilityLabel={starLabel(star)} accessibilityState={{ selected: star.id === selected }} style={styles.pinHit}>
        <StarView star={star} selected={star.id === selected} named={names.has(star.id)} />
      </View>
    </Marker>
  ));
});
