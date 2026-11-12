import type { Faced } from '../../lib/moment';
import { AttributionControl, Map as MapLibreMap, Marker, setWorkerUrl, type CircleLayerSpecification, type GeoJSONFeature, type SymbolLayerSpecification, type MapMouseEvent, type MapTouchEvent } from 'maplibre-gl';
// @ts-expect-error: a CSS side-effect import, which Metro bundles on web.
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { perfCount } from '../../lib/perfCount';
import { StyleSheet, View } from 'react-native';
import { CapturePinView, pinLabel } from '../CapturePinView';
import { MarkPinView, markKey, markLabel, type MarkPin } from '../MarkPinView';
import { AreaPointView } from '../AreaPoint';
import { ComplexLabelView } from '../ComplexLabel';
import { COMPLEX_STYLE } from '../../lib/complexes/mapLayer';
import { namedStars, StarView, starLabel } from '../StarView';
import type { Star } from '../../lib/places';
import { declutterMarks } from '../../lib/markNames';
import { metersPerPixel, pinReminded, pinThumb, type CapturePin } from '../../lib/pins';
import { scaleBar } from '../../lib/scaleBar';
import { traceEnds } from '../../lib/traceEnds';
import type { RoadFeature } from '../../lib/streets';
import { ScaleBar, SCALE_MAX_PX } from './ScaleBar';
import type { LngLat } from '../../lib/types';
import { distanceM } from '../../lib/geo';
import { arrowSwipe, swipeOf, zoomStart } from '../../lib/atlas/snap';
import { mapLabel } from '../../lib/atlas/freeLook';
import { useGlideFrames, type GlideFrame } from '../../lib/useGlidingWalker';
import { markEnter, pinDrops, starEnter } from '../../lib/enter';
import { useReducedMotion } from '../../lib/motion';
import { useUnits } from '../../lib/useUnits';
import { useReminded } from '../../lib/useReminded';
import { MOTION } from '../../lib/motionTokens';
import {
  alternatesGeoJSON, busyNameLayers, busyNamesGeoJSON, routeGradesGeoJSON, pinsGeoJSON, BORDER, bordersGeoJSON, WALK_STYLE, walkabilityGeoJSON, COLORS, coneGeoJSON, OVERTURE_CREDIT, DERIVE_ZOOM, endsGeoJSON, FOG_STYLE, HOTSPOT, marksGeoJSON, pocketsGeoJSON, waitingDotsGeoJSON, WAITING_DOT_PAINT, ringGeoJSON, RING_COLOR, stripsGeoJSON, PLACES_ZOOM, pressRadiusM, routeGeoJSON, FOG_BOLD, MAP_STYLE_URL, WORLD_VEIL, segmentsGeoJSON, splitTrace, traceGeoJSON, RIDE_DASH, FAINT_OPACITY, GAP_LINK_DASH, DRAWING_DASH, useZoomPins, walkerGeoJSON,
  type CollectedFeatures, type WalkMapHandle, type WalkMapProps,
} from './types';

const VECTOR_SOURCE = 'openmaptiles';
/** Tiles that never arrive must not hang the stop. */
const VIEW_TIMEOUT_MS = 4000;

// Copied into public/ by scripts/copy-maplibre-worker.js on install, and served
// under the site's base path (set by experiments.baseUrl) when it has one.
setWorkerUrl(`${process.env.EXPO_BASE_URL ?? ''}/maplibre-gl-worker.mjs`);

/** The trace's end joins the live dot only this close; farther, it's a pause or gap, not lag. */
const LINK_MAX_M = 60;

function addOverlay(map: MapLibreMap) {
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
  // The veil goes under the first label layer, so names stay readable.
  const firstSymbol = map.getStyle().layers.find((l: { type: string; id: string }) => l.type === 'symbol')?.id;
  // Town borders under the streets (TB8): the first road layer of the base map, else under the labels.
  const style = map.getStyle().layers as { type: string; id: string; 'source-layer'?: string }[];
  const firstRoad = style.find((l) => l.type === 'line' && l['source-layer'] === 'transportation')?.id
    ?? style.find((l) => l.type === 'line')?.id ?? firstSymbol;
  map.addSource('borders', { type: 'geojson', data: empty, tolerance: 1 });
  map.addLayer({ id: 'border-fill', type: 'fill', source: 'borders', minzoom: BORDER.minZoom, filter: ['==', ['get', 'role'], 'tinted'],
    paint: { 'fill-color': BORDER.color, 'fill-opacity': BORDER.fillOpacity } }, firstRoad);
  // The lines over the streets, under the labels (TB10): a border often runs along a road.
  map.addLayer({ id: 'border-lined', type: 'line', source: 'borders', minzoom: BORDER.minZoom, filter: ['==', ['get', 'role'], 'lined'],
    layout: { 'line-join': 'round' }, paint: { 'line-color': BORDER.lined, 'line-width': BORDER.linedWidth, 'line-opacity': BORDER.linedOpacity } }, firstSymbol);
  map.addLayer({ id: 'border-firm', type: 'line', source: 'borders', minzoom: BORDER.minZoom, filter: ['!=', ['get', 'role'], 'lined'],
    layout: { 'line-join': 'round' }, paint: { 'line-color': BORDER.color, 'line-width': BORDER.firmWidth, 'line-opacity': BORDER.firmOpacity } }, firstSymbol);
  map.addSource('veil', { type: 'geojson', data: WORLD_VEIL });
  map.addLayer({ id: 'veil', type: 'fill', source: 'veil', paint: { 'fill-color': COLORS.veil, 'fill-opacity': 0 } }, firstSymbol);
  // The Walkability layer (UF9), under the hotspots, fog and trace: a soft green over ground easy on foot, a warm tint over
  // ground built around cars. No antialiasing, so shapes of one reading side by side show no seam.
  map.addSource('walkability', { type: 'geojson', data: empty, tolerance: 0 });
  for (const band of ['foot', 'car'] as const)
    map.addLayer({ id: `walk-${band}`, type: 'fill', source: 'walkability', filter: ['==', ['get', 'band'], band],
      paint: { 'fill-color': WALK_STYLE[band].color, 'fill-opacity': WALK_STYLE[band].opacity, 'fill-antialias': false } }, firstSymbol);
  // Lines are simplified a little more than the default and keep a smaller tile buffer: less to
  // re-tile on each update (perf, Nov 1; tolerance 0.375 and buffer 128 are maplibre's defaults).
  const lineSource = { type: 'geojson' as const, data: empty, tolerance: 1, buffer: 64 };
  for (const id of ['fog', 'walked', 'alternates', 'route-grades', 'route', 'gap-links', 'faint', 'rides', 'trace-history', 'trace', 'trace-link', 'drawing']) map.addSource(id, lineSource);
  for (const id of ['pockets', 'strips', 'cone', 'marks', 'points', 'ring', 'ends', 'found-pins', 'waiting-dots', 'complexes']) map.addSource(id, { type: 'geojson', data: empty });
  const lineLayout = { 'line-cap': 'round', 'line-join': 'round' } as const;
  // Hotspots under the streets: pockets shaded, strips bold, in the one green no other layer uses (L9).
  // Stale areas (an older map or rules) are dimmed until looked at again (L11).
  map.addLayer({ id: 'pockets', type: 'fill', source: 'pockets', paint: { 'fill-color': HOTSPOT, 'fill-opacity': ['case', ['get', 'stale'], 0.06, 0.14] } }, firstSymbol);
  // Graded (AD12): each feature carries its grade's width and opacity.
  map.addLayer({ id: 'strips', type: 'line', source: 'strips', layout: lineLayout,
    paint: { 'line-color': HOTSPOT, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, ['*', 3, ['get', 'width']], 17, ['*', 10, ['get', 'width']]], 'line-opacity': ['get', 'opacity'] } }, firstSymbol);
  map.addLayer({ id: 'fog', type: 'line', source: 'fog', layout: lineLayout,
    paint: { 'line-color': COLORS.fog, 'line-opacity': FOG_STYLE.opacity,
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, FOG_STYLE.widthMin, 17, FOG_STYLE.widthMax] } }, firstSymbol);
  map.addLayer({ id: 'walked', type: 'line', source: 'walked', layout: lineLayout,
    paint: { 'line-color': COLORS.walked, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 8] } }, firstSymbol);
  // A preview's other routes, faint, under the one highlighted (SR2).
  map.addLayer({ id: 'alternates-edge', type: 'line', source: 'alternates', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.8 } });
  map.addLayer({ id: 'alternates', type: 'line', source: 'alternates', layout: lineLayout, paint: { 'line-color': COLORS.route, 'line-width': 6, 'line-opacity': 0.4 } });
  // The walk planner's graded stretches: a band under the route, wider where the kind is denser (WP16).
  map.addLayer({ id: 'route-grades', type: 'line', source: 'route-grades', layout: lineLayout, paint: { 'line-color': HOTSPOT, 'line-width': ['get', 'width'], 'line-opacity': 0.45 } });
  // The route under the trace and walker, so where you walked stays on top (N6).
  map.addLayer({ id: 'route-edge', type: 'line', source: 'route', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': 12 } });
  map.addLayer({ id: 'route', type: 'line', source: 'route', layout: lineLayout, paint: { 'line-color': COLORS.route, 'line-width': 8 } });
  // Offered stretches across gaps: the trace, see-through, under it where they meet (Filling gaps, G6).
  // A gap with no line: grey dots between its ends, under the faint stretches (GW2).
  map.addLayer({ id: 'gap-links', type: 'line', source: 'gap-links', layout: lineLayout,
    paint: { 'line-color': FOG_BOLD, 'line-width': 3, 'line-opacity': 0.8, 'line-dasharray': GAP_LINK_DASH } });
  map.addLayer({ id: 'faint-edge', type: 'line', source: 'faint', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': 0.9 * FAINT_OPACITY } });
  map.addLayer({ id: 'faint', type: 'line', source: 'faint', layout: lineLayout, paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-opacity': FAINT_OPACITY } });
  // Rides dashed on the same white edge, under the walked trace where they meet (R5).
  map.addLayer({ id: 'rides-edge', type: 'line', source: 'rides', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': 0.9 } });
  map.addLayer({ id: 'rides', type: 'line', source: 'rides', layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-dasharray': RIDE_DASH } });
  // The trace on a white edge, so it reads over fog, walked streets and the base map alike.
  // Two sources, one look: the history (re-sent once per chunk) and the live tail (each publish).
  // The link: from the trace's end to the dot, so the line always reaches it (the live dot, Nov 1).
  for (const [id, source] of [['trace-history-edge', 'trace-history'], ['trace-edge', 'trace'], ['trace-link-edge', 'trace-link']])
    map.addLayer({ id, type: 'line', source, layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': 0.9 } });
  for (const [id, source] of [['trace-history-line', 'trace-history'], ['trace', 'trace'], ['trace-link-line', 'trace-link']])
    map.addLayer({ id, type: 'line', source, layout: lineLayout, paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth } });
  // A gap's way being drawn: over the trace, dashed on its white edge (GW3).
  map.addLayer({ id: 'drawing-edge', type: 'line', source: 'drawing', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': 0.9 } });
  map.addLayer({ id: 'drawing', type: 'line', source: 'drawing', layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-dasharray': DRAWING_DASH } });
  // Where the walk began and ended (QL1-QL3): above the trace, under the walker; the capture pins
  // are DOM markers, so they sit above every layer. A white disc with a thick ring: the trace's
  // green at the start, the walked orange at the end.
  map.addLayer({ id: 'ends', type: 'circle', source: 'ends',
    paint: { 'circle-color': '#ffffff', 'circle-radius': 7, 'circle-stroke-width': 4, 'circle-stroke-color': ['match', ['get', 'kind'], 'start', COLORS.trace, COLORS.walked] } });
  // The way the walker is going, under the dot; and marked spots (a destination, a pressed spot).
  // The range preview (E21): a soft disc with a firm edge, under the walker.
  map.addLayer({ id: 'ring-fill', type: 'fill', source: 'ring', paint: { 'fill-color': RING_COLOR, 'fill-opacity': 0.12 } });
  map.addLayer({ id: 'ring', type: 'line', source: 'ring', paint: { 'line-color': RING_COLOR, 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
  // The selected area's complexes (CX9): an outline with no fill, in a hue of its own, no heavier than an area's border.
  map.addLayer({ id: 'complexes', type: 'line', source: 'complexes', layout: lineLayout, paint: { 'line-color': COMPLEX_STYLE.color, 'line-width': COMPLEX_STYLE.width, 'line-opacity': COMPLEX_STYLE.opacity } });
  map.addLayer({ id: 'cone', type: 'fill', source: 'cone', paint: { 'fill-color': COLORS.walker, 'fill-opacity': 0.25 } });
  // Places already found, on the walk planner's map: a filled disc in the kind's green on a white ring (WP16).
  map.addLayer({ id: 'found-pins', type: 'circle', source: 'found-pins', paint: { 'circle-color': HOTSPOT, 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } });
  // Explore's places still to find where a "?" would crowd (WT12, WT14).
  map.addLayer({ id: 'waiting-dots', type: 'circle', source: 'waiting-dots', paint: WAITING_DOT_PAINT as unknown as CircleLayerSpecification['paint'] });
  map.addLayer({ id: 'marks', type: 'circle', source: 'marks',
    paint: { 'circle-color': '#ffffff', 'circle-radius': 9, 'circle-stroke-color': COLORS.walker, 'circle-stroke-width': 4 } });
  map.addLayer({ id: 'points', type: 'circle', source: 'points',
    paint: {
      'circle-color': COLORS.walker,
      'circle-radius': 7,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    } });
  // The Busy layer's names (DC1-DC6, DC14): the map's own text, colliding with each other and the base map's labels. Where
  // the layer sits in the stack is set by busyNamesOver (DC16); added on top here.
  map.addSource('busy-names', { type: 'geojson', data: empty });
  const names = busyNameLayers();
  map.addLayer({ id: 'busy-names', type: 'symbol', source: 'busy-names', layout: names.layout, paint: names.paint } as unknown as SymbolLayerSpecification);
}

/** A second tap within this long makes a double-tap zoom, not a press. */
const DOUBLE_TAP_MS = 300;

/**
 * maplibre's compact attribution opens itself the first time its credits fill in and closes only
 * on a drag, so a phone's map started with a banner across its bottom. This one starts closed:
 * the (i) button stays, and a tap on it shows the credits (OSM asks for them to be reachable).
 */
class ClosedAttribution extends AttributionControl {
  private watch?: MutationObserver;
  constructor() {
    // Overture is credited beside the map data (AD16).
    super({ compact: true, customAttribution: OVERTURE_CREDIT });
  }
  onAdd(map: MapLibreMap): HTMLElement {
    const el = super.onAdd(map);
    // The first time it turns compact it is also opened: close it then, once, before it paints.
    const close = () => {
      if (!el.classList.contains('maplibregl-compact')) return;
      el.classList.remove('maplibregl-compact-show');
      this.watch?.disconnect();
    };
    this.watch = new MutationObserver(close);
    this.watch.observe(el, { attributes: true, attributeFilter: ['class'] });
    close();
    return el;
  }
  onRemove() {
    this.watch?.disconnect();
    super.onRemove();
  }
}
/** Held this long without moving, a press is a long press. */
const LONG_PRESS_MS = 500;

function toRoadFeature(f: GeoJSONFeature & { _z?: number }): RoadFeature {
  return { geometry: f.geometry as RoadFeature['geometry'], properties: f.properties, zoom: f._z };
}

/** Whether the street source is loaded; false if the style has no such source. */
const sourceLoaded = (map: MapLibreMap) => {
  try {
    // isSourceLoaded logs an error instead of throwing for a missing source (a map just taken down,
    // a style without it): check first.
    if (!map.getStyle?.() || !map.getSource(VECTOR_SOURCE)) return false;
    return map.isSourceLoaded(VECTOR_SOURCE);
  } catch {
    return false;
  }
};

/** Resolves true once the view's tiles have loaded, false on timeout. */
const settled = (map: MapLibreMap) =>
  new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(sourceLoaded(map)), VIEW_TIMEOUT_MS);
    map.once('idle', () => {
      clearTimeout(timer);
      resolve(sourceLoaded(map));
    });
  });

export const WalkMap = forwardRef<WalkMapHandle, WalkMapProps>(function WalkMap(props, ref) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const readyPromise = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (readyPromise.current == null) {
    let resolve!: () => void;
    readyPromise.current = { promise: new Promise<void>((r) => (resolve = r)), resolve };
  }
  const onPress = useRef(props.onPress);
  const onLongPress = useRef(props.onLongPress);
  const onUserMove = useRef(props.onUserMove);
  const onBearingChange = useRef(props.onBearingChange);
  const onCameraChange = useRef(props.onCameraChange);
  const onFitSettled = useRef(props.onFitSettled);
  const onSwipe = useRef(props.onSwipe);
  const freePan = useRef(!!props.freePan);
  const fitPadding = useRef(props.fitPadding);
  // Before paint, so a click right after a render never reaches the previous handler (audit 8).
  useLayoutEffect(() => {
    onPress.current = props.onPress;
    onLongPress.current = props.onLongPress;
    onUserMove.current = props.onUserMove;
    onBearingChange.current = props.onBearingChange;
    onCameraChange.current = props.onCameraChange;
    onFitSettled.current = props.onFitSettled;
    onSwipe.current = props.onSwipe;
    freePan.current = !!props.freePan;
    fitPadding.current = props.fitPadding;
  });
  const pointerDown = useRef(false);
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  perfCount('render:map');
  // On the live walk the dot, cone and camera glide between fixes. They are
  // moved by a render loop outside React (a DOM marker is cheap to move; the
  // GeoJSON layers starved the page at 30 fps). The replay, on its own clock,
  // keeps the layers.
  const glideOn = props.glideWalker === true;
  const puck = useRef<{ marker: Marker; el: HTMLElement; cone: HTMLElement } | null>(null);
  const lastFrame = useRef<GlideFrame>({ walker: null, heading: null });
  const followRef = useRef(props.follow);
  // The trace's newest point. The link to the dot is drawn once per fix, to where the dot is
  // heading, never per frame: each draw re-tiles the source in the worker (motion audit 5).
  const linkFrom = useRef<LngLat | null>(null);
  const drawLink = (walker: LngLat | null) => {
    const end = linkFrom.current;
    perfCount('setData:trace-link');
    const src = mapRef.current?.getSource('trace-link') as { setData(d: GeoJSON.FeatureCollection): void } | undefined;
    // Never across a pause or a gap: a link that long isn't the line catching up.
    src?.setData(traceGeoJSON(end && walker && distanceM(end, walker) <= LINK_MAX_M ? [[end, walker]] : []));
  };
  const applyFrame = (f: GlideFrame) => {
    lastFrame.current = f;
    const p = puck.current;
    if (!p) return;
    p.el.style.display = f.walker ? '' : 'none';
    if (!f.walker) return;
    p.marker.setLngLat(f.walker);
    // The e2e reads where the dot is (only when it is measuring: window.__perf).
    if ((window as { __perf?: unknown }).__perf) p.el.dataset.at = `${f.walker[0]},${f.walker[1]}`;
    p.cone.style.display = f.heading == null ? 'none' : '';
    if (f.heading != null) p.cone.style.transform = `rotate(${f.heading}deg)`;
    // The camera follows the dot, so they move together; never while a hand is on the map.
    if (followRef.current && !pointerDown.current) mapRef.current?.jumpTo({ center: f.walker });
  };
  useGlideFrames(props.walker, props.walkerHeading, glideOn, applyFrame, 0, props.walkerSource);
  useEffect(() => {
    followRef.current = props.follow;
  });
  // Camera moves take the app's camera timing, and jump with reduce motion on (M2).
  const reduced = useReducedMotion();
  const duration = props.animate === false || reduced ? 0 : MOTION.camera;
  const animateRef = useRef(props.animate !== false && !reduced);
  useEffect(() => {
    animateRef.current = props.animate !== false && !reduced;
  });

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: MAP_STYLE_URL,
      center: props.initialCenter ?? [-71.4, 41.82],
      zoom: props.initialZoom ?? 15,
      // Added below, closed (ClosedAttribution).
      attributionControl: false,
      // iPhone browsers give a tab little GPU memory, and two maps live during a walk:
      // at most 2x the pixels (a 3x canvas is 2.25x the memory), and a small tile cache.
      pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2),
      maxTileCacheZoomLevels: 2,
      fadeDuration: 0,
      // Two fingers turn the map (CP1); a right-drag or a tilt never does, and the map opens north-up (CP8).
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // Explore steps from area to area (DN1, DN11): one finger never pans, and the arrow keys are ours.
      dragPan: !props.onSwipe || !!props.freePan,
      keyboard: !props.onSwipe || !!props.freePan,
    });
    mapRef.current = map;
    map.on('load', () => {
      addOverlay(map);
      setReady(true);
      readyPromise.current!.resolve();
      // The e2e taps a spot on the newest map (a stretch across a gap), only when it is measuring.
      if ((window as { __perf?: unknown }).__perf) {
        (window as { __project?: (p: LngLat) => [number, number] }).__project = (p) => {
          const r = map.getContainer().getBoundingClientRect();
          const pt = map.project(p);
          return [r.left + pt.x, r.top + pt.y];
        };
        // And back: a point on the map's own pixels to where it lies (discrete-navigation audit 5).
        (window as { __unproject?: (xy: [number, number]) => LngLat }).__unproject = ([x, y]) => {
          const c = map.unproject([x, y]);
          return [c.lng, c.lat];
        };
        // A two-finger turn can't be made headless: the e2e turns the newest map in code (CP1-CP5).
        (window as { __turn?: (deg: number) => void }).__turn = (deg) => { map.rotateTo(deg, { duration: 0 }); };
        // Explore in a dense city (DC5, DC6, DC14, DC15): the e2e moves the newest map in code and asks which busy names are
        // drawn, where; names the map placed, never the reserved room (DC14).
        const BUSY = ['busy-names'];
        const busyIn = (box?: [[number, number], [number, number]]) =>
          [...new Set((box ? map.queryRenderedFeatures(box, { layers: BUSY }) : map.queryRenderedFeatures({ layers: BUSY }))
            .filter((f) => !f.properties?.reserve).map((f) => String(f.properties?.name)))];
        const canvasXY = (x: number, y: number): [number, number] => {
          const r = map.getCanvas().getBoundingClientRect();
          return [x - r.left, y - r.top];
        };
        const w = window as { __zoomTo?: unknown; __busyNamesIn?: unknown; __busyNamePoint?: unknown };
        w.__zoomTo = (at: LngLat, zoom: number) => map.jumpTo({ center: at, zoom });
        w.__busyNamesIn = (x0: number, y0: number, x1: number, y1: number) => busyIn([canvasXY(x0, y0), canvasXY(x1, y1)]);
        w.__busyNamePoint = () => {
          const r = map.getCanvas().getBoundingClientRect();
          for (let y = 60; y < r.height - 60; y += 8)
            for (let x = 30; x < r.width - 30; x += 8) {
              // Only where the name is what a finger meets: no pin or control over it.
              if (document.elementFromPoint(r.left + x, r.top + y) !== map.getCanvas()) continue;
              const hit = busyIn([[x - 1, y - 1], [x + 1, y + 1]]);
              if (hit.length) return { x: r.left + x, y: r.top + y, name: hit[0] };
            }
          return null;
        };
        map.on('movestart', () => container.current?.setAttribute('data-idle', '0'));
        map.on('idle', () => {
          container.current?.setAttribute('data-idle', '1');
          container.current?.setAttribute('data-busy-names', JSON.stringify(busyIn()));
        });
      }
    });
    // maplibre fires click for each tap of a double-tap zoom: wait to see
    // whether a second tap follows before treating it as a press.
    let pressTimer: ReturnType<typeof setTimeout> | undefined;
    let heldAt = 0;
    // When one finger doesn't pan (onSwipe), nothing in maplibre swallows the click a drag ends with.
    let draggedAt = 0;
    map.on('click', (e: MapMouseEvent) => {
      clearTimeout(pressTimer);
      if (Date.now() - heldAt < 1000) return; // the end of a long press
      if (Date.now() - draggedAt < 500) return; // the end of a drag (DN9: a swipe is never a tap)
      const at: LngLat = [e.lngLat.lng, e.lngLat.lat];
      pressTimer = setTimeout(() => onPress.current?.(at, pressRadiusM(map.getZoom(), at[1])), DOUBLE_TAP_MS);
    });
    map.on('dblclick', () => clearTimeout(pressTimer));
    // A long press: held still for LONG_PRESS_MS with one finger or the
    // mouse, or the browser's own context menu gesture (right click, or a
    // long touch on Android). The click that ends it is not also a press.
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let holdFrom: { x: number; y: number } | null = null;
    const fireHold = (lngLat: { lng: number; lat: number }) => {
      clearTimeout(holdTimer);
      holdFrom = null;
      if (Date.now() - heldAt < 1000) return;
      heldAt = Date.now();
      clearTimeout(pressTimer);
      const at: LngLat = [lngLat.lng, lngLat.lat];
      onLongPress.current?.(at, pressRadiusM(map.getZoom(), at[1]));
    };
    const startHold = (e: MapMouseEvent | MapTouchEvent) => {
      const touches = (e.originalEvent as TouchEvent).touches;
      if (!onLongPress.current || (touches && touches.length > 1)) return cancelHold();
      holdFrom = { x: e.point.x, y: e.point.y };
      const lngLat = e.lngLat;
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => fireHold(lngLat), LONG_PRESS_MS);
    };
    const moveHold = (e: MapMouseEvent | MapTouchEvent) => {
      if (holdFrom && Math.hypot(e.point.x - holdFrom.x, e.point.y - holdFrom.y) > 8) cancelHold();
    };
    const cancelHold = () => {
      clearTimeout(holdTimer);
      holdFrom = null;
    };
    map.on('mousedown', startHold);
    map.on('touchstart', startHold);
    map.on('mousemove', moveHold);
    map.on('touchmove', moveHold);
    map.on('mouseup', cancelHold);
    map.on('touchend', cancelHold);
    map.on('touchcancel', cancelHold);
    map.on('dragstart', cancelHold);
    // Discrete navigation (DN1, DN2, DN10): a finished one-pointer drag is a swipe, never a pan. The
    // browser's own pan of the canvas is off too, or a phone's finger would scroll the page. Pinch and
    // the two-finger turn stay with maplibre; a long press or a second finger is never a swipe.
    let swipeFrom: { x: number; y: number } | null = null;
    let swipeTo = { x: 0, y: 0 };
    // The drag's last moves, for its speed at release: a flick coasts, as a pan would (DN2).
    let trail: { t: number; x: number; y: number }[] = [];
    let swipeMulti = false;
    // When the last one-finger tap ended, so a tap-drag zoom's second touch is never a swipe (audit 2).
    let tappedAt = -Infinity;
    // Where areas are framed: the middle of the frame's padding, below the title card, never the canvas's
    // own middle (discrete-navigation audit 5). Read from the padding itself: the map keeps none (fix 2).
    const middle = (): LngLat => {
      const canvas = map.getCanvas();
      const p = fitPadding.current ?? { top: 0, right: 0, bottom: 0, left: 0 };
      const c = map.unproject([(p.left + canvas.clientWidth - p.right) / 2, (p.top + canvas.clientHeight - p.bottom) / 2]);
      return [c.lng, c.lat];
    };
    // Speed at release, px/s, over the last 100 ms of moves; none when the finger rested before letting go.
    const releaseSpeed = () => {
      const t = Date.now();
      const recent = trail.filter((p) => t - p.t <= 100);
      trail = [];
      if (recent.length < 2 || t - recent[recent.length - 1].t > 50) return { vx: 0, vy: 0 };
      const a = recent[0];
      const b = recent[recent.length - 1];
      const dt = Math.max(b.t - a.t, 8) / 1000;
      return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
    };
    const mpp = () => metersPerPixel(map.getZoom(), map.getCenter().lat);
    // A drag whose mouseup is lost (the window lost focus, or the button came up outside it) is dropped (audit 10).
    const dropSwipe = () => {
      swipeFrom = null;
      window.removeEventListener('mousemove', mouseSwipe);
      window.removeEventListener('mouseup', endSwipe);
      window.removeEventListener('blur', dropSwipe);
    };
    const endSwipe = () => {
      const from = swipeFrom;
      dropSwipe();
      if (!from || !onSwipe.current) return;
      const swipe = swipeOf(from, swipeTo, { multi: swipeMulti, held: Date.now() - heldAt < 1000 });
      if (swipe) onSwipe.current({ ...swipe, ...releaseSpeed(), center: middle(), mpp: mpp() });
    };
    // The mouse is followed past the map's edge (over the title card), as maplibre's own drag does.
    // A drag past 8 px is never a tap, even one cut off before it ends (DN9, audit 10).
    const dragTo = (to: { x: number; y: number }) => {
      swipeTo = to;
      const t = Date.now();
      trail = [...trail.filter((p) => t - p.t <= 100), { t, ...to }];
      if (swipeFrom && Math.hypot(to.x - swipeFrom.x, to.y - swipeFrom.y) > 8) draggedAt = Date.now();
    };
    const mouseSwipe = (e: MouseEvent) => {
      if ((e.buttons & 1) === 0) return dropSwipe();
      const r = map.getContainer().getBoundingClientRect();
      dragTo({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    if (props.onSwipe) {
      map.getCanvas().style.touchAction = 'none';
      map.getCanvasContainer().style.touchAction = 'none';
      // The arrow keys are findable (discrete-navigation audit 11): maplibre labels the canvas "Map".
      map.getCanvas().setAttribute('aria-label', mapLabel(!!props.freePan));
      map.on('mousedown', (e: MapMouseEvent) => {
        if (!onSwipe.current || freePan.current || e.originalEvent.button !== 0) return;
        dropSwipe();
        // Shift and drag is maplibre's box zoom, never a swipe (audit 2).
        if (zoomStart({ shift: e.originalEvent.shiftKey, sinceTapMs: Infinity })) return;
        swipeFrom = { x: e.point.x, y: e.point.y };
        swipeTo = swipeFrom;
        swipeMulti = false;
        trail = [];
        window.addEventListener('mousemove', mouseSwipe);
        window.addEventListener('mouseup', endSwipe, { once: true });
        window.addEventListener('blur', dropSwipe, { once: true });
      });
      map.on('touchstart', (e: MapTouchEvent) => {
        if (!onSwipe.current || freePan.current) return;
        if (e.originalEvent.touches.length > 1) {
          swipeMulti = true;
          return;
        }
        // A touch just after a tap is a tap-drag zoom (audit 2).
        if (zoomStart({ shift: false, sinceTapMs: Date.now() - tappedAt })) {
          swipeFrom = null;
          return;
        }
        swipeFrom = { x: e.point.x, y: e.point.y };
        swipeTo = swipeFrom;
        swipeMulti = false;
        trail = [];
      });
      map.on('touchmove', (e: MapTouchEvent) => {
        if (freePan.current) return;
        if (e.originalEvent.touches.length > 1) swipeMulti = true;
        else dragTo({ x: e.point.x, y: e.point.y });
      });
      map.on('touchend', (e: MapTouchEvent) => {
        const from = swipeFrom;
        const tap = !!from && !swipeMulti && e.originalEvent.touches.length === 0 && Math.hypot(swipeTo.x - from.x, swipeTo.y - from.y) <= 8;
        endSwipe();
        tappedAt = tap ? Date.now() : -Infinity;
      });
      map.on('touchcancel', () => {
        swipeFrom = null;
      });
      // DN11: the arrow keys step like swipes; + and - still zoom (maplibre's keyboard handler is off).
      map.getCanvas().addEventListener('keydown', (e: KeyboardEvent) => {
        // Free look: maplibre's own keyboard handler is on, the arrows pan and + and - zoom one level (FL3, audit 5).
        if (freePan.current || e.altKey || e.ctrlKey || e.metaKey) return;
        const swipe = arrowSwipe(e.key);
        if (swipe) {
          e.preventDefault();
          onSwipe.current?.({ ...swipe, vx: 0, vy: 0, center: middle(), mpp: mpp() });
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          // Around where areas are framed, so the selected one stays put (fix 2: the map keeps no padding).
          map.zoomTo(map.getZoom() + 1, { around: middle(), duration: animateRef.current ? MOTION.camera : 0 });
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          map.zoomTo(map.getZoom() - 1, { around: middle(), duration: animateRef.current ? MOTION.camera : 0 });
        }
      });
    }
    map.on('contextmenu', (e: MapMouseEvent) => {
      if (!onLongPress.current) return;
      e.preventDefault();
      e.originalEvent.preventDefault();
      fireHold(e.lngLat);
    });
    // Only a real change of zoom or latitude band re-renders: a follow camera's moveend each fix
    // would otherwise re-render the map component and re-send the cone (perf, Nov 1).
    const track = () => {
      const zoom = map.getZoom();
      const lat = map.getCenter().lat;
      // The canvas's own middle: getCenter() is the padded centre a fit leaves behind, which a map
      // made fresh (without the padding) would put elsewhere.
      const canvas = map.getCanvas();
      const c = map.unproject([canvas.clientWidth / 2, canvas.clientHeight / 2]);
      onCameraChange.current?.({ center: [c.lng, c.lat], zoom });
      // For the e2e (tabs audit U15): the zoom, written straight to the DOM, never a render.
      container.current?.setAttribute('data-zoom', zoom.toFixed(2));
      // And the centre (QL12), on the same path.
      container.current?.setAttribute('data-center', `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`);
      // And what is in view, west,south,east,north (fix explore-fit-area: the whole town is framed).
      const b = map.getBounds();
      container.current?.setAttribute('data-bounds', [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((x) => x.toFixed(5)).join(','));
      setView((v) => (v && Math.abs(v.zoom - zoom) < 0.05 && Math.abs(v.lat - lat) < 0.01 ? v : { zoom, lat }));
    };
    // Only gestures carry an originalEvent; camera moves made in code do not.
    // Zooming keeps following, as in Google Maps: only a pan or a turn looks away.
    const moved = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) onUserMove.current?.();
    };
    map.on('dragstart', moved);
    map.on('rotatestart', moved);
    // The bearing, for the compass (CP2): written to the DOM for the e2e, sent up on a real change.
    let sentBearing = 0;
    const turned = () => {
      const b = map.getBearing();
      container.current?.setAttribute('data-bearing', b.toFixed(1));
      if (Math.abs(b - sentBearing) >= 0.5 || (b === 0 && sentBearing !== 0)) {
        sentBearing = b;
        onBearingChange.current?.(b);
      }
    };
    map.on('rotate', turned);
    map.on('rotateend', turned);
    // A camera move made in code cancels a drag in progress, and the glide moves
    // the camera every frame. So follow-moves wait while a pointer is down.
    const down = () => { pointerDown.current = true; };
    const up = () => { pointerDown.current = false; };
    map.on('mousedown', down);
    map.on('touchstart', down);
    map.on('mouseup', up);
    map.on('touchend', up);
    map.on('touchcancel', up);
    map.on('dragend', up);
    // Top right on the home, where the sheet never covers it (OSM requires it reachable).
    map.addControl(new ClosedAttribution(), props.attributionTop ? 'top-right' : 'bottom-right');
    map.on('zoomend', track);
    // A pan changes the latitude the merge radius is measured at.
    map.on('moveend', track);
    map.on('load', track);
    return () => {
      clearTimeout(pressTimer);
      clearTimeout(holdTimer);
      dropSwipe();
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; later prop changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setData = (id: string, data: GeoJSON.FeatureCollection) => {
    perfCount(`setData:${id}`);
    (mapRef.current?.getSource(id) as { setData(d: GeoJSON.FeatureCollection): void } | undefined)?.setData(data);
  };

  // Free look (FL3): one finger pans while it is on. maplibre's own handlers take over and ours stand down;
  // the inline touch-action goes back to its class, which leaves the pan to the map (the swipe sets `none`).
  const freeOn = !!props.freePan;
  const swipes = !!props.onSwipe;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !swipes) return;
    if (freeOn) {
      map.dragPan.enable();
      map.keyboard.enable();
    } else {
      map.dragPan.disable();
      map.keyboard.disable();
    }
    const touchAction = freeOn ? '' : 'none';
    map.getCanvas().style.touchAction = touchAction;
    map.getCanvasContainer().style.touchAction = touchAction;
    map.getCanvas().setAttribute('aria-label', mapLabel(freeOn));
  }, [ready, freeOn, swipes]);

  useEffect(() => { if (ready) setData('fog', segmentsGeoJSON(props.fog)); }, [ready, props.fog]);
  useEffect(() => { if (ready) setData('walked', segmentsGeoJSON(props.walked)); }, [ready, props.walked]);
  const split = useMemo(() => splitTrace(props.trace), [props.trace]);
  const history = useRef(split.history);
  useEffect(() => {
    history.current = split.history;
  });
  useEffect(() => { if (ready) setData('trace-history', traceGeoJSON(history.current)); }, [ready, split.historyKey]);
  useEffect(() => {
    if (!ready) return;
    setData('trace', traceGeoJSON(split.tail));
    const open = split.tail[split.tail.length - 1];
    linkFrom.current = props.walkerSource && open?.length ? open[open.length - 1] : null;
    drawLink(props.walkerSource?.get()?.lead ?? null);
    // drawLink only reads refs.
  }, [ready, split.tail, props.walkerSource]);
  useEffect(() => {
    const source = props.walkerSource;
    if (!ready || !source) return;
    return source.subscribe((s) => drawLink(s.lead));
    // drawLink only reads refs.
  }, [ready, props.walkerSource]);
  useEffect(() => { if (ready) setData('rides', traceGeoJSON(props.rides ?? [])); }, [ready, props.rides]);
  useEffect(() => { if (ready) setData('faint', traceGeoJSON(props.faint ?? [])); }, [ready, props.faint]);
  useEffect(() => { if (ready) setData('gap-links', traceGeoJSON(props.gapLinks ?? [])); }, [ready, props.gapLinks]);
  useEffect(() => { if (ready) setData('drawing', traceGeoJSON(props.drawing ? [props.drawing] : [])); }, [ready, props.drawing]);
  useEffect(() => { if (ready) setData('route', routeGeoJSON(props.route)); }, [ready, props.route]);
  useEffect(() => { if (ready) setData('route-grades', routeGradesGeoJSON(props.routeGrades)); }, [ready, props.routeGrades]);
  useEffect(() => { if (ready) setData('found-pins', pinsGeoJSON(props.foundPins)); }, [ready, props.foundPins]);
  useEffect(() => {
    if (!ready) return;
    setData('alternates', alternatesGeoJSON(props.alternates));
    // The e2e reads how many faint routes are drawn (only when it is measuring: window.__perf).
    if ((window as { __perf?: unknown }).__perf && container.current) container.current.dataset.alternates = String(props.alternates?.length ?? 0);
    // The e2e reads which of the trace-like layers carry anything (only when it is measuring): none while a preview is up.
    if ((window as { __perf?: unknown }).__perf && container.current) {
      container.current.dataset.drawn = [['trace', props.trace?.length], ['walked', props.walked?.length], ['fog', props.fog?.length], ['faint', props.faint?.length], ['landing', props.landing ? 1 : 0], ['borders', props.borders ? 1 : 0], ['walkability', props.walkability ? 1 : 0]].filter(([, n]) => n).map(([k]) => k).join(',');
    }
  }, [ready, props.alternates, props.trace, props.walked, props.fog, props.faint, props.landing, props.borders, props.walkability]);
  useEffect(() => {
    if (!ready) return;
    setData('pockets', pocketsGeoJSON(props.landing));
    setData('strips', stripsGeoJSON(props.landing));
    // The e2e reads whether busy streets are drawn (the Busy streets layer).
    container.current?.setAttribute('data-busy', props.landing ? `strips:${stripsGeoJSON(props.landing).features.length}` : '');
    // How many times the drawing was sent: the e2e checks it is not sent once a fix (layers audit 2).
    container.current?.setAttribute('data-busy-sets', String(Number(container.current?.getAttribute('data-busy-sets') ?? 0) + 1));
  }, [ready, props.landing]);
  // The busy names (DC1, DC14): sent when the areas or the reserved name change, never per fix or zoom.
  const reserveKey = props.busyNamesReserve ? `${props.busyNamesReserve.name}|${props.busyNamesReserve.at.join(',')}` : '';
  const reserveRef = useRef(props.busyNamesReserve);
  useEffect(() => {
    reserveRef.current = props.busyNamesReserve;
  });
  useEffect(() => {
    if (!ready) return;
    const names = busyNamesGeoJSON(props.landing, reserveRef.current ?? null);
    setData('busy-names', names);
    // The e2e reads what the map was given (only when it is measuring): each name and where it goes.
    if ((window as { __perf?: unknown }).__perf && container.current) {
      container.current.dataset.busyGiven = JSON.stringify(names.features.filter((f) => !f.properties?.reserve).map((f) => ({ name: f.properties?.name, at: (f.geometry as GeoJSON.Point).coordinates })));
    }
  }, [ready, props.landing, reserveKey]);
  // DC16: over every layer on Explore, so its names are placed before the base map's; elsewhere under the base map's labels
  // (placed after them, so a road keeps its own name) and so under the trace and the route.
  const namesOver = !!props.busyNamesOver;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const firstSymbol = (map.getStyle().layers as { type: string; id: string }[]).find((l) => l.type === 'symbol' && !l.id.startsWith('busy-names'))?.id;
    const below = namesOver ? undefined : firstSymbol ?? 'alternates-edge';
    map.moveLayer('busy-names', below);
    container.current?.setAttribute('data-busy-over', namesOver ? '1' : '0');
  }, [ready, namesOver]);
  useEffect(() => {
    if (!ready) return;
    setData('waiting-dots', waitingDotsGeoJSON(props.waitingDots));
    // The e2e reads the dots drawn (WT12-WT14): where they are, nothing else.
    if (container.current) container.current.dataset.waitingDots = JSON.stringify((props.waitingDots ?? []).map((d) => d.at));
  }, [ready, props.waitingDots]);
  useEffect(() => {
    if (!ready) return;
    setData('marks', marksGeoJSON(props.marks));
    // The e2e reads how many rings are marked (only when it is measuring): the way-back point is never one but the route's end (DW11).
    if ((window as { __perf?: unknown }).__perf && container.current) container.current.dataset.marks = String(props.marks?.length ?? 0);
  }, [ready, props.marks]);
  // The start and end markers (QL1, QL2): sent only when they move, not with every publish of the trace.
  // The grades drawn, as grade:width pairs, for the e2e (AD12).
  const gradedKey = useMemo(
    () => [...new Set(stripsGeoJSON(props.landing).features.map((f) => `${f.properties!.grade}:${f.properties!.width}`))].sort().join(','),
    [props.landing],
  );
  const ends = traceEnds(props.trace, !!props.ended);
  const endsKey = `${fmt(ends.start)}|${fmt(ends.end)}`;
  useEffect(() => {
    if (ready) setData('ends', endsGeoJSON(ends.start, ends.end));
    // ends is derived from endsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, endsKey]);
  useEffect(() => { if (ready) setData('ring', ringGeoJSON(props.ring)); }, [ready, props.ring]);
  useEffect(() => { if (ready) setData('complexes', (props.complexes?.lines ?? { type: 'FeatureCollection', features: [] }) as GeoJSON.FeatureCollection); }, [ready, props.complexes]);
  // Town borders (TB1-TB5): sent again only when the towns or their roles change (TB9).
  const borderKey = props.borders?.key ?? '';
  const bordersRef = useRef(props.borders);
  useEffect(() => {
    bordersRef.current = props.borders;
  }, [props.borders]);
  useEffect(() => {
    if (!ready) return;
    setData('borders', bordersGeoJSON(bordersRef.current));
    // The e2e reads which towns are drawn, and how.
    container.current?.setAttribute('data-borders', (bordersRef.current?.shapes ?? []).map((b) => `${b.role}:${b.name}`).sort().join('|'));
  }, [ready, borderKey]);
  // Walkability (WK13): sent again only when the picture changes.
  const walkKey = props.walkability?.key ?? '';
  const walkRef = useRef(props.walkability);
  useEffect(() => {
    walkRef.current = props.walkability;
  }, [props.walkability]);
  useEffect(() => {
    if (!ready) return;
    setData('walkability', walkabilityGeoJSON(walkRef.current));
    // The e2e reads what is drawn.
    container.current?.setAttribute('data-walk', walkRef.current ? `foot:${walkRef.current.foot.length}|car:${walkRef.current.car.length}` : '');
  }, [ready, walkKey]);
  useEffect(() => {
    if (ready) setData('cone', coneGeoJSON(glideOn ? null : props.walker, props.walkerHeading, view?.zoom ?? 16));
  }, [ready, glideOn, props.walker, props.walkerHeading, view]);
  useEffect(() => {
    if (!ready) return;
    for (const id of ['trace', 'trace-history-line', 'trace-link-line', 'rides']) mapRef.current?.setPaintProperty(id, 'line-opacity', props.traceOpacity ?? 1);
    for (const id of ['trace-edge', 'trace-history-edge', 'trace-link-edge', 'rides-edge']) mapRef.current?.setPaintProperty(id, 'line-opacity', 0.9 * (props.traceOpacity ?? 1));
    mapRef.current?.setPaintProperty('faint', 'line-opacity', FAINT_OPACITY * (props.traceOpacity ?? 1));
    // The dots go with the trace: hidden while navigating (gap-drawing audit 12).
    mapRef.current?.setPaintProperty('gap-links', 'line-opacity', 0.8 * (props.traceOpacity ?? 1));
    mapRef.current?.setPaintProperty('faint-edge', 'line-opacity', 0.9 * FAINT_OPACITY * (props.traceOpacity ?? 1));
    // The markers go with the trace (QL3): hidden while navigating, faint in the replay's first beats.
    mapRef.current?.setPaintProperty('ends', 'circle-opacity', props.traceOpacity ?? 1);
    mapRef.current?.setPaintProperty('ends', 'circle-stroke-opacity', props.traceOpacity ?? 1);
  }, [ready, props.traceOpacity]);
  useEffect(() => {
    if (!ready) return;
    setData('points', walkerGeoJSON(glideOn ? null : props.walker));
    // Where the dot is drawn (QL12), for the e2e; empty with none.
    container.current?.setAttribute('data-walker', fmt(props.walker));
  }, [ready, glideOn, props.walker]);
  // The scale bar follows the view (QL7): the longest round length that fits at this zoom and latitude.
  const units = useUnits();
  const scale = useMemo(() => (view ? scaleBar(metersPerPixel(view.zoom, view.lat), SCALE_MAX_PX, units) : null), [view, units]);
  // The live walk's dot and cone: one marker, drawn at the same size as the layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !glideOn) return;
    const el = document.createElement('div');
    el.dataset.testid = 'walker-puck';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'width:100px;height:100px;position:relative;pointer-events:none;display:none';
    const fill = (inset: string) => `position:absolute;inset:0;${inset}`;
    el.innerHTML =
      `<svg data-cone viewBox="0 0 100 100" style="${fill('transform-origin:50px 50px')}">` +
      `<path d="M50 50 L30 15.36 A40 40 0 0 1 70 15.36 Z" fill="${COLORS.walker}" fill-opacity="0.25"/></svg>` +
      `<svg viewBox="0 0 100 100" style="${fill('')}"><circle cx="50" cy="50" r="7" fill="${COLORS.walker}" stroke="#ffffff" stroke-width="2"/></svg>`;
    const cone = el.querySelector('[data-cone]') as HTMLElement;
    const marker = new Marker({ element: el, anchor: 'center' }).setLngLat([0, 0]).addTo(map);
    puck.current = { marker, el, cone };
    applyFrame(lastFrame.current);
    return () => {
      marker.remove();
      puck.current = null;
    };
    // applyFrame only reads refs.
  }, [ready, glideOn]);

  // Capture pins are DOM markers rendered with the same view as on native,
  // grouped for the current zoom. Clicks look the pin up by id, so a pin
  // whose members changed never opens stale captures.
  const pins = useZoomPins(props.captures, view?.zoom ?? null, view?.lat ?? null);
  // One read of the reminders per map, for the bells on its pins (RB1, RB6).
  const reminded = useReminded();
  usePinMarkers(mapRef, ready, pins, props.onPinPress ? (p) => props.onPinPress?.(p.captures) : undefined, false, reminded);
  // Memories from earlier walks: the same pins, faint, with their own tap (MR1-MR4).
  const memoryPins = useZoomPins(props.memories ?? NO_CAPTURES, view?.zoom ?? null, view?.lat ?? null);
  usePinMarkers(mapRef, ready, memoryPins, props.onMemoryPress ? (p) => props.onMemoryPress?.(p.captures, p.lngLat) : undefined, true, reminded);
  // Stars (the home map) are DOM markers too, drawn with the same view as on
  // native. Clicks look the star up by id, so a merged star never opens stale places.
  const onViewChange = useRef(props.onViewChange);
  useEffect(() => {
    onViewChange.current = props.onViewChange;
  });
  useEffect(() => {
    if (view) onViewChange.current?.(view);
  }, [view]);
  const starLatest = useRef({ stars: new Map<string, Star>(), onStarPress: props.onStarPress });
  useEffect(() => {
    starLatest.current = { stars: new Map((props.stars ?? []).map((st) => [st.id, st])), onStarPress: props.onStarPress };
  });
  const starMarkers = useRef(new Map<string, { marker: Marker; root: Root; key: string; selected: boolean }>());
  const names = useMemo(() => namedStars(props.stars ?? []), [props.stars]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const drop = (m: { marker: Marker; root: Root }) => {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    };
    const live = new Set<string>();
    for (const star of props.stars ?? []) {
      live.add(star.id);
      const selected = star.id === props.selectedStar;
      const named = names.has(star.id);
      const key = `${star.at.join(',')}|${star.count}|${star.walkIds.length}|${star.label}|${selected}|${named}`;
      const existing = starMarkers.current.get(star.id);
      if (existing?.key === key) continue;
      if (existing) drop(existing);
      // Settles only when it becomes selected in front of you (M9).
      const enter = starEnter(existing ? existing.selected : undefined, selected);
      // A 48 px target around the 36 px star.
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', starLabel(star));
      el.style.cssText = 'background:none;border:0;padding:6px;cursor:pointer';
      const id = star.id;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const st = starLatest.current.stars.get(id);
        if (st) starLatest.current.onStarPress?.(st);
      });
      const root = createRoot(el);
      root.render(<StarView star={star} selected={selected} named={named} enter={enter} />);
      const marker = new Marker({ element: el, anchor: 'center' }).setLngLat(star.at).addTo(map);
      starMarkers.current.set(star.id, { marker, root, key, selected });
    }
    for (const [id, m] of starMarkers.current) {
      if (live.has(id)) continue;
      drop(m);
      starMarkers.current.delete(id);
    }
  }, [ready, props.stars, props.selectedStar, names]);
  useEffect(() => () => {
    for (const m of starMarkers.current.values()) {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    }
    starMarkers.current.clear();
  }, []);
  // Explore's "?" marks, as DOM markers like the stars; clicks look the mark up by id.
  const markLatest = useRef(props.onDiscoveryPress);
  useEffect(() => {
    markLatest.current = props.onDiscoveryPress;
  });
  const viewZoom = view?.zoom ?? 16;
  const markMarkers = useRef(new Map<string, { marker: Marker; root: Root; key: string; state: { revealed: boolean; found?: boolean; faint?: boolean } }>());
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const drop = (m: { marker: Marker; root: Root }) => {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    };
    const live = new Set<string>();
    for (const pin of declutterMarks(props.discoveries ?? [], viewZoom)) {
      live.add(pin.id);
      const key = `${pin.at.join(',')}|${markKey(pin)}|${pin.name}|${pin.icon}|${pin.quiet ? 'q' : ''}`;
      const existing = markMarkers.current.get(pin.id);
      if (existing?.key === key) continue;
      if (existing) drop(existing);
      // Revealed in front of you it turns in (M11); found, it pulses once (M12).
      const enter = markEnter(existing?.state, pin);
      const el = document.createElement('button');
      el.type = 'button';
      el.dataset.testid = 'mark-pin';
      el.setAttribute('aria-label', markLabel(pin));
      // WT11: Explore's "?" are one summary for a screen reader, never announced one by one.
      if (pin.quiet) {
        el.setAttribute('aria-hidden', 'true');
        el.tabIndex = -1;
      }
      // A found place is shown, not pressed: its pin lets taps through to the capture beside it (audit, UI).
      el.style.cssText = pin.found ? 'background:none;border:0;padding:4px 6px 0;pointer-events:none' : 'background:none;border:0;padding:4px 6px 0;cursor:pointer';
      if (pin.found) el.tabIndex = -1;
      const id = pin.id;
      if (!pin.found)
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          markLatest.current?.(id);
        });
      const root = createRoot(el);
      perfCount('marker:mark');
      root.render(<MarkPinView pin={pin as MarkPin} enter={enter} />);
      const marker = new Marker({ element: el, anchor: 'bottom', offset: [0, 6] }).setLngLat(pin.at).addTo(map);
      markMarkers.current.set(pin.id, { marker, root, key, state: { revealed: pin.revealed, found: pin.found, faint: pin.faint } });
    }
    for (const [id, m] of markMarkers.current) {
      if (live.has(id)) continue;
      drop(m);
      markMarkers.current.delete(id);
    }
  }, [ready, props.discoveries, viewZoom]);
  useEffect(() => () => {
    for (const m of markMarkers.current.values()) {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    }
    markMarkers.current.clear();
  }, []);
  // The complexes' names (CX9), DOM markers like the strip names, rebuilt only when they change; the map adds no summary of its own.
  const complexMarkers = useRef<{ marker: Marker; root: Root }[]>([]);
  const complexKey = (props.complexes?.labels ?? []).map((l) => `${l.id}:${l.text}`).join('|');
  const complexLabelsRef = useRef(props.complexes?.labels);
  useEffect(() => {
    complexLabelsRef.current = props.complexes?.labels;
  }, [props.complexes]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const m of complexMarkers.current) {
      m.marker.remove();
      const r = m.root;
      queueMicrotask(() => r.unmount());
    }
    complexMarkers.current = [];
    for (const l of complexLabelsRef.current ?? []) {
      const el = document.createElement('div');
      el.style.pointerEvents = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.dataset.testid = 'complex-label';
      el.dataset.name = l.text;
      const root = createRoot(el);
      perfCount('marker:complex');
      root.render(<ComplexLabelView text={l.text} />);
      complexMarkers.current.push({ marker: new Marker({ element: el, anchor: 'center' }).setLngLat(l.at).addTo(map), root });
    }
  }, [ready, complexKey]);
  useEffect(() => () => {
    for (const m of complexMarkers.current) {
      m.marker.remove();
      const r = m.root;
      queueMicrotask(() => r.unmount());
    }
    complexMarkers.current = [];
  }, []);
  // Explore's area points (atlas round 3), as DOM markers like the strip names, rebuilt only when they change.
  const areaMarkers = useRef<{ marker: Marker; root: Root }[]>([]);
  const areaKey = (props.areaPoints ?? []).map((p) => `${p.id}:${p.name ?? ''}:${p.selected ? 1 : 0}`).join('|');
  const areaPointsRef = useRef(props.areaPoints);
  useEffect(() => {
    areaPointsRef.current = props.areaPoints;
  }, [props.areaPoints]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const m of areaMarkers.current) {
      m.marker.remove();
      const r = m.root;
      queueMicrotask(() => r.unmount());
    }
    areaMarkers.current = [];
    for (const p of areaPointsRef.current ?? []) {
      const el = document.createElement('div');
      el.style.pointerEvents = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.dataset.testid = 'area-point';
      if (p.name) el.dataset.name = p.name;
      if (p.selected) el.dataset.selected = '1';
      const root = createRoot(el);
      perfCount('marker:area');
      root.render(<AreaPointView pin={p} />);
      // Anchored at the top so the dot, not the label, sits on the point.
      areaMarkers.current.push({ marker: new Marker({ element: el, anchor: 'top', offset: [0, -6] }).setLngLat(p.at).addTo(map), root });
    }
  }, [ready, areaKey]);
  useEffect(() => () => {
    for (const m of areaMarkers.current) {
      m.marker.remove();
      const r = m.root;
      queueMicrotask(() => r.unmount());
    }
    areaMarkers.current = [];
  }, []);
  useEffect(() => {
    if (ready) mapRef.current?.setPaintProperty('veil', 'fill-opacity', props.veil ? 0.45 : 0);
  }, [ready, props.veil]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setPaintProperty('fog', 'line-color', props.fogEmphasis ? FOG_BOLD : COLORS.fog);
    map.setPaintProperty('fog', 'line-opacity', props.fogEmphasis ? 1 : FOG_STYLE.opacity);
    map.setPaintProperty('fog', 'line-width', props.fogEmphasis
      ? ['interpolate', ['linear'], ['zoom'], 13, 2.5, 17, 7]
      : ['interpolate', ['linear'], ['zoom'], 13, FOG_STYLE.widthMin, 17, FOG_STYLE.widthMax]);
  }, [ready, props.fogEmphasis]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !props.follow || !map || pointerDown.current) return;
    // On the live walk the render loop moves the camera; this recenters at once
    // (Recenter, a read ending) on the dot as it is showing.
    const to = glideOn ? (lastFrame.current.walker ?? props.follow) : props.follow;
    const zoom = props.followZoom == null ? null : Math.round(props.followZoom * 100) / 100;
    const rezoom = zoom != null && Math.abs(map.getZoom() - zoom) >= 0.005;
    // Under 2 px is no move worth a frame (perf).
    const p = map.project(to);
    const c = map.getCanvas();
    if (!rezoom && Math.hypot(p.x - c.clientWidth / 2, p.y - c.clientHeight / 2) < 2) return;
    perfCount('camera');
    map.jumpTo(rezoom ? { center: to, zoom: zoom! } : { center: to });
  }, [ready, props.follow, props.followZoom, glideOn]);
  // A fit is a request made while mounted: a map brought back (the home, after a walk) keeps its view.
  const fitAtMount = useRef(props.fitKey);
  useEffect(() => {
    if (ready && props.fitBounds && props.fitKey !== fitAtMount.current) {
      fitAtMount.current = undefined;
      const [w, s, e, n] = props.fitBounds;
      const padding = props.fitPadding ?? { top: 48, right: 48, bottom: 48, left: 48 };
      perfCount('fit');
      mapRef.current?.fitBounds([[w, s], [e, n]], { padding, maxZoom: props.fitMaxZoom ?? 17, duration });
      // Settled once its move has run, if the map is still up then (a fit that moves nothing ends at once).
      const key = props.fitKey ?? 0;
      const t = setTimeout(() => onFitSettled.current?.(key), duration + 150);
      return () => clearTimeout(t);
    }
    // Refits when the caller changes fitKey, not on every new bounds array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.fitKey]);

  useImperativeHandle(ref, () => ({
    size() {
      const c = mapRef.current?.getCanvas();
      return { width: c?.clientWidth ?? 0, height: c?.clientHeight ?? 0 };
    },
    async collectView(): Promise<CollectedFeatures> {
      await readyPromise.current!.promise;
      const map = mapRef.current;
      const out: CollectedFeatures = { roads: [], names: [], places: [], pois: [], complete: true };
      if (!map || !map.getSource(VECTOR_SOURCE)) return { ...out, complete: false };
      // Below z14 the tiles are simplified and miss minor streets: pieces cut
      // from them would get other ids than the same streets at z14.
      if (Math.floor(map.getZoom()) < DERIVE_ZOOM) return { ...out, complete: false };
      const q = (sourceLayer: string) => {
        try {
          // Parent tiles kept on screen while z14 loads are left out too.
          return map.querySourceFeatures(VECTOR_SOURCE, { sourceLayer }).filter((f) => f._z === DERIVE_ZOOM).map(toRoadFeature);
        } catch {
          out.complete = false;
          return [];
        }
      };
      out.roads = q('transportation');
      out.names = q('transportation_name');
      out.places = q('place');
      out.pois = q('poi');
      return out;
    },
    showPoint(at, padding) {
      // An offset, never `padding`: maplibre keeps an ease's padding on the map and counts it again in every later
      // fit, so after a swipe on Explore's 200 px map a town's fit found no room and never moved (discrete-navigation
      // fix 2, the owner's iPhone, Nov 4). The point lands in the middle of the padding all the same.
      const offset: [number, number] = [(padding.left - padding.right) / 2, (padding.top - padding.bottom) / 2];
      mapRef.current?.easeTo({ center: at, offset, duration: animateRef.current ? MOTION.ease : 0 });
    },
    resetNorth() {
      mapRef.current?.easeTo({ bearing: 0, duration: animateRef.current ? MOTION.camera : 0 });
    },
    async collectPlaces(center) {
      await readyPromise.current!.promise;
      const map = mapRef.current;
      if (!map || !map.getSource(VECTOR_SOURCE)) return null;
      const before = { center: map.getCenter(), zoom: map.getZoom() };
      map.jumpTo({ center, zoom: PLACES_ZOOM });
      const ok = await settled(map);
      let places: RoadFeature[] | null = null;
      try {
        places = ok ? map.querySourceFeatures(VECTOR_SOURCE, { sourceLayer: 'place' }).map(toRoadFeature) : null;
      } catch {
        places = null;
      }
      map.jumpTo(before);
      return places;
    },
    async collect(centers, shouldStop): Promise<CollectedFeatures> {
      await readyPromise.current!.promise;
      const map = mapRef.current;
      const out: CollectedFeatures = { roads: [], names: [], places: [], pois: [], complete: true };
      // A style without the street source has nothing to read.
      if (!map || !map.getSource(VECTOR_SOURCE)) return { ...out, complete: false };
      const before = { center: map.getCenter(), zoom: map.getZoom() };
      for (const center of centers) {
        if (shouldStop?.()) {
          out.complete = false;
          break;
        }
        map.jumpTo({ center, zoom: DERIVE_ZOOM });
        if (!(await settled(map))) out.complete = false;
        const q = (sourceLayer: string) => {
          try {
            return map.querySourceFeatures(VECTOR_SOURCE, { sourceLayer }).map(toRoadFeature);
          } catch {
            out.complete = false;
            return [];
          }
        };
        out.roads.push(...q('transportation'));
        out.names.push(...q('transportation_name'));
        out.places.push(...q('place'));
        out.pois.push(...q('poi'));
      }
      map.jumpTo(before);
      return out;
    },
  }), []);

  return (
    <View style={[styles.wrap, props.style]}>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} data-trace-opacity={String(props.traceOpacity ?? 1)} data-rides={`${props.rides?.length ?? 0}:${props.rides?.reduce((n, r) => n + r.length, 0) ?? 0}`} data-faint={String(props.faint?.length ?? 0)} data-gaplinks={String(props.gapLinks?.length ?? 0)} data-drawing={String(props.drawing?.length ?? 0)} data-runs={String(props.trace.filter((r) => r.length > 1).length)} data-ring={props.ring ? String(props.ring.radiusM) : ''} data-trace-end={traceEnd(props.trace)} data-ends={endsKey} data-graded={gradedKey} />
      {/* Beside the map's own DOM, not inside it, so React owns it. */}
      {scale && <ScaleBar bar={scale} inset={props.scaleInset} />}
      {props.covered && <View testID="map-cover" style={styles.cover} pointerEvents="none" />}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: COLORS.veil },
});

const NO_CAPTURES: Faced[] = [];

/**
 * A layer of capture-style pins as DOM markers. Clicks look the pin up by id
 * in a ref, so a pin whose members changed never opens stale captures; roots
 * unmount just after React's commit, which would otherwise warn.
 */
function usePinMarkers(
  mapRef: RefObject<MapLibreMap | null>,
  ready: boolean,
  pins: CapturePin[],
  onPress: ((pin: CapturePin) => void) | undefined,
  memory: boolean,
  reminded: ReadonlySet<string>,
) {
  const latest = useRef({ pins: new Map<string, CapturePin>(), onPress });
  useEffect(() => {
    latest.current = { pins: new Map(pins.map((p) => [p.id, p])), onPress };
  });
  const markers = useRef(new Map<string, { marker: Marker; root: Root; key: string; bell: boolean; drops: boolean }>());
  const interactive = !!onPress;
  // A capture taken since the screen opened drops in (M10); one already shown, or a reload, never.
  const [openedAt] = useState(() => Date.now());
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const drop = (m: { marker: Marker; root: Root }) => {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    };
    const live = new Set<string>();
    for (const pin of pins) {
      live.add(pin.id);
      const ids = pin.captures.map((c) => c.id).join(',');
      const bell = pinReminded(pin, reminded);
      // With the photo's small copy, so a copy made after the pin was drawn shows without a reload (QL27).
      const key = `${pin.lngLat.join(',')}|${pin.kind}|${ids}|${interactive}|${pinThumb(pin) ?? ''}`;
      const existing = markers.current.get(pin.id);
      if (existing?.key === key) {
        // A reminder set or stopped (RB5) redraws the same element in place: focus returns to it when
        // the viewer closes (audit 3), and a photo keeps its painted picture (audit 4).
        if (existing.bell !== bell) {
          existing.marker.getElement().setAttribute('aria-label', pinLabel(pin, interactive, memory, bell));
          existing.root.render(<CapturePinView pin={pin} faint={memory} drop={existing.drops} reminded={bell} />);
          existing.bell = bell;
        }
        continue;
      }
      if (existing) drop(existing);
      // A 48 px target around the 36 px pin: the touch minimum on phones.
      const el = document.createElement(interactive ? 'button' : 'div');
      el.setAttribute('aria-label', pinLabel(pin, interactive, memory, bell));
      el.dataset.ids = ids;
      if (memory) el.dataset.testid = 'memory-pin';
      if (interactive) {
        (el as HTMLButtonElement).type = 'button';
        el.style.cssText = 'background:none;border:0;padding:6px;cursor:pointer';
        const id = pin.id;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = latest.current.pins.get(id);
          if (p) latest.current.onPress?.(p);
        });
      } else {
        el.setAttribute('role', 'img');
        el.style.cssText = 'padding:6px;pointer-events:none';
      }
      const root = createRoot(el);
      const drops = !memory && pinDrops(pin.captures, seen.current, openedAt);
      for (const c of pin.captures) seen.current.add(c.id);
      root.render(<CapturePinView pin={pin} faint={memory} drop={drops} reminded={bell} />);
      // Anchored at the stem's foot, so the marked point stays visible.
      const marker = new Marker({ element: el, anchor: 'bottom', offset: [0, 6] }).setLngLat(pin.lngLat).addTo(map);
      // Memories sit under this walk's pins, so a new capture over an old one opens the new one (audit 6).
      marker.getElement().style.zIndex = memory ? '0' : '1';
      markers.current.set(pin.id, { marker, root, key, bell, drops });
    }
    for (const [id, m] of markers.current) {
      if (live.has(id)) continue;
      drop(m);
      markers.current.delete(id);
    }
  }, [mapRef, ready, pins, interactive, memory, openedAt, reminded]);
  useEffect(() => () => {
    for (const m of markers.current.values()) {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    }
    markers.current.clear();
  }, []);
}

/** Where the drawn trace ends, for the e2e: ground covered, never a count of fixes. */
function traceEnd(trace: LngLat[][] | undefined): string {
  const run = trace?.filter((r) => r.length).at(-1);
  return fmt(run?.[run.length - 1]);
}

/** A point as "lon,lat" to 6 decimals, for the e2e's data attributes; empty for none. */
const fmt = (p: LngLat | null | undefined) => (p ? `${p[0].toFixed(6)},${p[1].toFixed(6)}` : '');
