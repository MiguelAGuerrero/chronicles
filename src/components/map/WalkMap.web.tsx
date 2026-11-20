import type { Faced } from '../../lib/moment';
import { AttributionControl, getVersion, Map as MapLibreMap, Marker, setWorkerUrl, type CircleLayerSpecification, type GeoJSONFeature, type SymbolLayerSpecification, type MapMouseEvent, type MapTouchEvent } from 'maplibre-gl';
// @ts-expect-error: a CSS side-effect import, which Metro bundles on web.
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { perfCount, perfMark } from '../../lib/perfCount';
import { litStreets } from '../../lib/replay';
import { StyleSheet, View } from 'react-native';
import { CapturePinView, pinLabel } from '../CapturePinView';
import { MarkPinView, markKey, markLabel, type MarkPin } from '../MarkPinView';
import { AreaPointView } from '../AreaPoint';
import { ComplexLabelView } from '../ComplexLabel';
import { COMPLEX_STYLE } from '../../lib/complexes/mapLayer';
import { namedStars, StarView, starLabel } from '../StarView';
import type { Star } from '../../lib/places';
import { declutterMarks, spreadKey } from '../../lib/markNames';
import { boxAround, boxHolds, drawsPin, metersPerPixel, PIN_REACH_PX, pinDrawBox, pinReactions, pinReminded, pinThumb, stalkLift, type CapturePin, type ViewBox, type WalkClock } from '../../lib/pins';
import type { ReactionSet } from '../../lib/reactions/core';
import { useReactionSets } from '../../lib/reactions/useReactions';
import { blankLookLayers, creditsAt, scaleBar, scaleShown } from '../../lib/scaleBar';
import { traceEnds } from '../../lib/traceEnds';
import type { RoadFeature } from '../../lib/streets';
import { DEFAULT_SCALE_INSET, ScaleBar, SCALE_MAX_PX } from './ScaleBar';
import type { LngLat } from '../../lib/types';
import { distanceM } from '../../lib/geo';
import { arrowSwipe, swipeOf, zoomStart } from '../../lib/atlas/snap';
import { FIT_IDLE, fitStep, type FitState } from '../../lib/atlas/fitFlight';
import { mapLabel } from '../../lib/atlas/freeLook';
import { useGlideFrames, type GlideFrame } from '../../lib/useGlidingWalker';
import { markEnter, pinDrops, starEnter } from '../../lib/enter';
import { MARK_MOTION, arrivalEnter, markMoves, recentlyLeft } from '../../lib/markMotion';
import { useReducedMotion } from '../../lib/motion';
import { useUnits } from '../../lib/useUnits';
import { useReminded } from '../../lib/useReminded';
import { MOTION, REPLAY_ENGINE } from '../../lib/motionTokens';
import { followMoves } from '../../lib/compass';
import { groundGeoJSON, groundStyle } from '../../lib/areas/groundDraw';
import {
  alternatesGeoJSON, TRACE_EDGE_OPACITY, storefrontNameLayers, storefrontNameRotate, storefrontNamesGeoJSON, roomCells, routeGradesGeoJSON, pinsGeoJSON, BORDER, borderFillOpacity, borderMoves, bordersGeoJSON, WALK_STYLE, walkabilityGeoJSON, COLORS, coneGeoJSON, OVERTURE_CREDIT, GAZETTEER_CREDIT, DERIVE_ZOOM, endsGeoJSON, ENDS_PAINT, ENDS_RING_PAINT, FOG_STYLE, HOTSPOT, marksGeoJSON, pocketsGeoJSON, waitingDotsGeoJSON, WAITING_DOT_PAINT, ringGeoJSON, RING_COLOR, stripsGeoJSON, PLACES_ZOOM, pressRadiusM, routeGeoJSON, FOG_BOLD, MAP_STYLE_URL, WORLD_VEIL, segmentsGeoJSON, splitTrace, traceGeoJSON, RIDE_DASH, FAINT_OPACITY, GAP_LINK_DASH, DRAWING_DASH, useZoomPins, walkerGeoJSON, BASE_VECTOR_SOURCE, poiLabelLayers,
  FIT_MAX_ZOOM, FIT_PADDING, FLAT_NORTH_UP, LINE_SOURCE, LINE_SOURCE_IDS, PAST_STYLE, REPLAY_LINES, resendKey, revealGradient, revealStop, type CollectedFeatures, mapWorkerUrl, type ReplayMapFrame, type WalkMapHandle, type WalkMapProps,
} from './types';
import { nextSend, type Sent } from './sent';
import { hopLines, hopsKey, revealedRuns, type LineReveal } from '../../lib/ceremony/reveal';

const VECTOR_SOURCE = BASE_VECTOR_SOURCE;
/** Tiles that never arrive must not hang the stop. */
const VIEW_TIMEOUT_MS = 4000;

// Copied into public/ by scripts/copy-maplibre-worker.js on install, and served
// under the site's base path (set by experiments.baseUrl) when it has one, with its version (tend map 10).
setWorkerUrl(mapWorkerUrl(process.env.EXPO_BASE_URL ?? '', getVersion()));

/** The trace's end joins the live dot only this close; farther, it's a pause or gap, not lag. */
const LINK_MAX_M = 60;

/** The layers the app adds over the base map; returns the base map's first street layer, which the borders' fill goes under. */
function addOverlay(map: MapLibreMap): string | undefined {
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
  // The veil, then the borders' lines: on the replay and a day the town's edge stays firm over it (decision 0199); the veil
  // effect (`borderMoves`) puts it back over them on every other map.
  map.addSource('veil', { type: 'geojson', data: WORLD_VEIL });
  map.addLayer({ id: 'veil', type: 'fill', source: 'veil', paint: { 'fill-color': COLORS.veil, 'fill-opacity': 0 } }, firstSymbol);
  // The lines over the streets, under the labels (TB10): a border often runs along a road.
  map.addLayer({ id: 'border-lined', type: 'line', source: 'borders', minzoom: BORDER.minZoom, filter: ['==', ['get', 'role'], 'lined'],
    layout: { 'line-join': 'round' }, paint: { 'line-color': BORDER.lined, 'line-width': BORDER.linedWidth, 'line-opacity': BORDER.linedOpacity } }, firstSymbol);
  map.addLayer({ id: 'border-firm', type: 'line', source: 'borders', minzoom: BORDER.minZoom, filter: ['!=', ['get', 'role'], 'lined'],
    layout: { 'line-join': 'round' }, paint: { 'line-color': BORDER.color, 'line-width': BORDER.firmWidth, 'line-opacity': BORDER.firmOpacity } }, firstSymbol);
  // The Walkability layer (UF9), under the hotspots, fog and trace: a soft green over ground easy on foot, a warm tint over
  // ground built around cars. No antialiasing, so shapes of one reading side by side show no seam.
  map.addSource('walkability', { type: 'geojson', data: empty, tolerance: 0 });
  for (const band of ['foot', 'car'] as const)
    map.addLayer({ id: `walk-${band}`, type: 'fill', source: 'walkability', filter: ['==', ['get', 'band'], band],
      paint: { 'fill-color': WALK_STYLE[band].color, 'fill-opacity': WALK_STYLE[band].opacity, 'fill-antialias': false } }, firstSymbol);
  // Lines are simplified a little more than the default and keep a smaller tile buffer (`LINE_SOURCE`, NF5).
  const lineSource = { type: 'geojson' as const, data: empty, ...LINE_SOURCE };
  for (const id of LINE_SOURCE_IDS) map.addSource(id, lineSource);
  for (const id of ['pockets', 'strips', 'cone', 'marks', 'points', 'ring', 'ends', 'found-pins', 'waiting-dots', 'complexes', 'ground']) map.addSource(id, { type: 'geojson', data: empty });
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
  // Where I've been (WB9): earlier walks, one even tone, no edge, over the fog and under everything walked today.
  map.addLayer({ id: 'past', type: 'line', source: 'past', layout: lineLayout,
    paint: { 'line-color': COLORS.past, 'line-opacity': PAST_STYLE.opacity, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, PAST_STYLE.width * 0.7, 17, PAST_STYLE.width] } }, firstSymbol);
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
  map.addLayer({ id: 'faint-edge', type: 'line', source: 'faint', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': TRACE_EDGE_OPACITY * FAINT_OPACITY } });
  map.addLayer({ id: 'faint', type: 'line', source: 'faint', layout: lineLayout, paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-opacity': FAINT_OPACITY } });
  // Rides dashed on the same white edge, under the walked trace where they meet (R5).
  map.addLayer({ id: 'rides-edge', type: 'line', source: 'rides', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': TRACE_EDGE_OPACITY } });
  map.addLayer({ id: 'rides', type: 'line', source: 'rides', layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-dasharray': RIDE_DASH } });
  // The trace on a white edge, so it reads over fog, walked streets and the base map alike.
  // Two sources, one look: the history (re-sent once per chunk) and the live tail (each publish).
  // The link: from the trace's end to the dot, so the line always reaches it (the live dot, Nov 1).
  for (const [id, source] of [['trace-history-edge', 'trace-history'], ['trace-edge', 'trace'], ['trace-link-edge', 'trace-link']])
    map.addLayer({ id, type: 'line', source, layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': TRACE_EDGE_OPACITY } });
  for (const [id, source] of [['trace-history-line', 'trace-history'], ['trace', 'trace'], ['trace-link-line', 'trace-link']])
    map.addLayer({ id, type: 'line', source, layout: lineLayout, paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth } });
  // A replay's line (replay ceremony RC1, RC3): the runs behind the walker whole, the run being walked sent whole once,
  // with line metrics, and revealed by its gradient up to the walker: nothing is sent as time passes. Rides are under
  // the walked line (R5), dashed, and sent as data: a dash is not drawn to scale over line metrics (`REPLAY_LINES`).
  map.addSource(REPLAY_LINES.rides, lineSource);
  map.addSource(REPLAY_LINES.walked.done, lineSource);
  map.addSource(REPLAY_LINES.walked.run, { ...lineSource, lineMetrics: true });
  const hidden = (color: string) => revealGradient(color, 0) as unknown as GradientSpec;
  map.addLayer({ id: 'replay-rides-edge', type: 'line', source: REPLAY_LINES.rides, layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': TRACE_EDGE_OPACITY } });
  map.addLayer({ id: 'replay-rides-line', type: 'line', source: REPLAY_LINES.rides, layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-dasharray': RIDE_DASH } });
  map.addLayer({ id: 'replay-done-edge', type: 'line', source: REPLAY_LINES.walked.done, layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': TRACE_EDGE_OPACITY } });
  map.addLayer({ id: 'replay-run-edge', type: 'line', source: REPLAY_LINES.walked.run, layout: lineLayout, paint: { 'line-gradient': hidden('#ffffff'), 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': TRACE_EDGE_OPACITY } });
  map.addLayer({ id: 'replay-done-line', type: 'line', source: REPLAY_LINES.walked.done, layout: lineLayout, paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth } });
  map.addLayer({ id: 'replay-run-line', type: 'line', source: REPLAY_LINES.walked.run, layout: lineLayout, paint: { 'line-gradient': hidden(COLORS.trace), 'line-width': FOG_STYLE.traceWidth } });
  // A gap's way being drawn: over the trace, dashed on its white edge (GW3).
  map.addLayer({ id: 'drawing-edge', type: 'line', source: 'drawing', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': TRACE_EDGE_OPACITY } });
  map.addLayer({ id: 'drawing', type: 'line', source: 'drawing', layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-dasharray': DRAWING_DASH } });
  // Where the walk began and ended (QL1-QL3): above the trace, under the walker; the capture pins
  // are DOM markers, so they sit above every layer. The start hollow, ringed in the trace's green
  // (tend map T16); the end a bullseye (tend map T25): the start and the end's walked outer ring
  // first, then the end's walked centre and white band alone, so a walk that ends on its start keeps
  // its end whole (tend map audit 25).
  map.addLayer({ id: 'ends-ring', type: 'circle', source: 'ends',
    paint: ENDS_RING_PAINT });
  map.addLayer({ id: 'ends', type: 'circle', source: 'ends', filter: ['==', ['get', 'kind'], 'end'],
    paint: ENDS_PAINT });
  // The way the walker is going, under the dot; and marked spots (a destination, a pressed spot).
  // The range preview (E21): a soft disc with a firm edge, under the walker.
  map.addLayer({ id: 'ring-fill', type: 'fill', source: 'ring', paint: { 'fill-color': RING_COLOR, 'fill-opacity': 0.12 } });
  map.addLayer({ id: 'ring', type: 'line', source: 'ring', paint: { 'line-color': RING_COLOR, 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
  // A selected neighborhood's own ground (HB9): one line, one look for every neighborhood, no fill (HB14).
  map.addLayer({ id: 'ground', type: 'line', source: 'ground', layout: lineLayout, paint: { 'line-color': groundStyle().color, 'line-width': groundStyle().width } });
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
  // The Storefronts layer's names (DC1-DC6, DC14): the map's own text, colliding with each other and the base map's labels. Where
  // the layer sits in the stack is set by storefrontNamesOver (DC16); added on top here.
  map.addSource('storefront-names', { type: 'geojson', data: empty });
  const names = storefrontNameLayers();
  map.addLayer({ id: 'storefront-names', type: 'symbol', source: 'storefront-names', minzoom: names.minzoom, filter: names.filter, layout: names.layout, paint: names.paint } as unknown as SymbolLayerSpecification);
  // A turned name, centred or left out, never slid across its street (audit 1).
  map.addLayer({ id: 'storefront-names-turned', type: 'symbol', source: 'storefront-names', minzoom: names.minzoom, filter: names.turned.filter, layout: names.turned.layout, paint: names.turned.paint } as unknown as SymbolLayerSpecification);
  // The room the selected area's name and each "?" pin keep (DC14, DC17): above the names, so it is placed first.
  map.addLayer({ id: 'storefront-names-room', type: 'symbol', source: 'storefront-names', minzoom: names.minzoom, filter: names.room.filter, layout: names.room.layout, paint: names.room.paint } as unknown as SymbolLayerSpecification);
  return firstRoad;
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
  private shown?: MutationObserver;
  private wasOpen = false;
  private el?: HTMLElement;
  /** Told when the credits open or close (tend map audit 1: Explore's hint steps aside for them). */
  onOpen?: (open: boolean) => void;
  /**
   * Beside the scale bar (tend map 3): offsets from the map's bottom-left corner. Opened, the box starts at `openLeft`
   * and keeps the (i) on its bottom row where it was tapped (tend map audit 2); the style sheet below reads these.
   */
  place(at: { left: number; bottom: number; openLeft: number; openMaxWidth: number }) {
    const el = this.el;
    if (!el) return;
    el.style.setProperty('--credits-left', `${at.left}px`);
    el.style.setProperty('--credits-bottom', `${at.bottom}px`);
    el.style.setProperty('--credits-open-left', `${at.openLeft}px`);
    el.style.setProperty('--credits-button', `${at.left - at.openLeft}px`);
    // maplibre's control is content-box: the open box pads 8 px each side.
    el.style.setProperty('--credits-open-max', `${at.openMaxWidth - OPEN_PAD_X}px`);
  }
  constructor(placeNames = false) {
    // Overture is credited beside the map data (AD16); the place-name dataset only where the search reads it: Explore (GZ14).
    super({ compact: true, customAttribution: placeNames ? [OVERTURE_CREDIT, GAZETTEER_CREDIT] : OVERTURE_CREDIT });
  }
  onAdd(map: MapLibreMap): HTMLElement {
    const el = super.onAdd(map);
    this.el = el;
    el.classList.add(CREDITS_CLASS);
    addCreditsStyle();
    // The first time it turns compact it is also opened: close it then, once, before it paints.
    const close = () => {
      if (!el.classList.contains('maplibregl-compact')) return;
      el.classList.remove('maplibregl-compact-show');
      this.watch?.disconnect();
    };
    this.watch = new MutationObserver(close);
    this.watch.observe(el, { attributes: true, attributeFilter: ['class'] });
    close();
    // Opened or closed by a tap: said once per change, read from the class as it is (the first open above is already undone).
    this.shown = new MutationObserver(() => {
      const open = el.classList.contains('maplibregl-compact-show');
      if (open === this.wasOpen) return;
      this.wasOpen = open;
      this.onOpen?.(open);
    });
    this.shown.observe(el, { attributes: true, attributeFilter: ['class'] });
    return el;
  }
  onRemove() {
    this.watch?.disconnect();
    this.shown?.disconnect();
    if (this.wasOpen) this.onOpen?.(false);
    super.onRemove();
  }
}
/** The open credits' side padding (8 px each side; the (i) has a row of its own below the text). */
const OPEN_PAD_X = 16;
/** Marks the app's credits control, for the hit area below. */
const CREDITS_CLASS = 'chronicles-credits';
/**
 * The (i) is maplibre's 24 px button; a transparent ring around it makes the target 44 px (X0: "the hit area may
 * extend past the visual"), once per page.
 */
function addCreditsStyle() {
  if (document.getElementById(CREDITS_CLASS)) return;
  const style = document.createElement('style');
  style.id = CREDITS_CLASS;
  // In a bottom-left corner (every map but Chronicle's), beside the scale bar (tend map 3). Opened, the box grows up and to
  // the left from there, its text above a row that keeps the (i) where the tap was, so a second tap there closes it, and
  // a word breaks only if it cannot fit a line at all (tend map audit 2).
  const corner = `.maplibregl-ctrl-bottom-left>.maplibregl-ctrl-attrib.${CREDITS_CLASS}`;
  style.textContent =
    `.${CREDITS_CLASS} .maplibregl-ctrl-attrib-button::after{content:'';position:absolute;inset:-10px}` +
    `.${CREDITS_CLASS} .maplibregl-ctrl-attrib-inner{overflow-wrap:break-word}` +
    // maplibre's blue glow shows on a tap too; the app's own ring (webStyles) stays for the keyboard (tend map audit 3).
    `.${CREDITS_CLASS} .maplibregl-ctrl-attrib-button:focus:not(:focus-visible){box-shadow:none}` +
    `${corner}{margin:0 0 var(--credits-bottom) var(--credits-left)}` +
    `${corner}.maplibregl-compact-show{margin-left:var(--credits-open-left);max-width:var(--credits-open-max);padding:2px 8px 28px 8px}` +
    `${corner}.maplibregl-compact-show .maplibregl-ctrl-attrib-button{top:auto;bottom:0;left:var(--credits-button)}`;
  document.head.appendChild(style);
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

/** A fit as asked of maplibre, kept to ask it again (tend explore 17). */
type FitAsk = { bounds: [[number, number], [number, number]]; options: { padding: { top: number; right: number; bottom: number; left: number }; maxZoom: number; duration: number; bearing?: number } };

/** A mark's foot stands this far below its point on the web marker. */
const MARK_BELOW = 6;

export const WalkMap = forwardRef<WalkMapHandle, WalkMapProps>(function WalkMap(props, ref) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const baseLayers = useRef<string[]>([]);
  /** The base map's first street layer, which the borders' fill goes under while the veil is off (TB8). */
  const firstRoad = useRef<string | undefined>(undefined);
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
  const onCreditsOpen = useRef(props.onCreditsOpen);
  const freePan = useRef(!!props.freePan);
  const fitPadding = useRef(props.fitPadding);
  // The fit flying and whether a refit's own call is under way (tend explore 17, audit 19), read by the settle listeners.
  const fit = useRef<FitState<FitAsk>>(FIT_IDLE);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMoveState = useRef(props.onMoveState);
  // Before paint, so a click right after a render never reaches the previous handler (audit 8).
  useLayoutEffect(() => {
    onPress.current = props.onPress;
    onLongPress.current = props.onLongPress;
    onUserMove.current = props.onUserMove;
    onBearingChange.current = props.onBearingChange;
    onCameraChange.current = props.onCameraChange;
    onFitSettled.current = props.onFitSettled;
    onSwipe.current = props.onSwipe;
    onCreditsOpen.current = props.onCreditsOpen;
    freePan.current = !!props.freePan;
    fitPadding.current = props.fitPadding;
    onMoveState.current = props.onMoveState;
  });
  const pointerDown = useRef(false);
  const creditsRef = useRef<ClosedAttribution | null>(null);
  // The compass asked for north and the map is still easing there: a fit meanwhile goes north too (tend map audit 4).
  const northAsked = useRef(false);
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  // The bearing the marks' rows are laid out at (fix mark-overlap audit 1), whole degrees, set as a turn settles.
  const [marksBearing, setMarksBearing] = useState(0);
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
  // The one gate every source's data goes through (replay ceremony RC4): a source is sent a collection only when it
  // changed (`nextSend`: not the same again, not empty after empty). Each send is a round trip through the map's worker
  // and a reload of that source's tiles; the replay sent four empty collections thirty times a second.
  const sent = useRef(new Map<string, Sent>());
  const drawLink = (walker: LngLat | null) => {
    const end = linkFrom.current;
    // Never across a pause or a gap: a link that long isn't the line catching up.
    sendData(mapRef.current, sent.current, 'trace-link', traceGeoJSON(end && walker && distanceM(end, walker) <= LINK_MAX_M ? [[end, walker]] : []));
  };
  // A replay's path (replay ceremony RC1-RC3): the frame last given, what of it the map holds, and whether its line
  // waits to be cleared. `applyReplay` draws a frame; the handle's `replayFrame` is its way in.
  const replayOn = props.replay === true;
  const replayLast = useRef<ReplayMapFrame | null>(null);
  const replayDrawn = useRef(freshReplayDrawn());
  // The canvas's size, read when it changes and never per camera move (the replay moves the camera every frame, and a
  // read of layout between two frames' style writes makes the browser lay the page out twice).
  const canvasSize = useRef({ width: 0, height: 0 });
  // While a replay moves the camera every frame, the zoom reaches React (the scale bar, the pins' grouping) at most
  // twice a second.
  const viewWaiting = useRef<{ zoom: number; lat: number } | null>(null);
  const viewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyReplay = (f: ReplayMapFrame | null) => {
    replayLast.current = f;
    const map = mapRef.current;
    // Before the style has loaded there is nothing to draw on: the frame is kept and drawn when it has.
    if (!map || !map.getSource(REPLAY_LINES.walked.run)) return;
    const st = replayDrawn.current;
    const p = puck.current;
    if (!f) {
      if (p) p.el.style.display = 'none';
      if (st.at) {
        st.at = '';
        container.current?.setAttribute('data-walker', '');
        container.current?.removeAttribute('data-reveal-end');
        container.current?.removeAttribute('data-cam');
        container.current?.removeAttribute('data-hops');
      }
      // The hops stay where they are: the screen's own links take their source over with the card (RC21).
      st.hops = '';
      // The line stays until the map has drawn the whole trace it is now given as a prop, so the card's first frames
      // show a line and not a gap; a telling begun again meanwhile takes it over.
      if (!st.clearing && (st.walked.doneKey || st.walked.run || st.rides)) {
        st.clearing = true;
        map.once('idle', () => {
          if (!replayDrawn.current.clearing) return;
          for (const id of [REPLAY_LINES.walked.done, REPLAY_LINES.walked.run, REPLAY_LINES.rides]) sendData(map, sent.current, id, EMPTY_LINES);
          replayDrawn.current = freshReplayDrawn();
        });
      }
      return;
    }
    st.clearing = false;
    let changed = revealLine(map, sent.current, st.walked, f.walked, REPLAY_LINES.walked, WALKED_REVEAL_LAYERS);
    // A ride, dashed, is data: sent again as it is ridden, by the telling's time and never by the frame.
    const rides = f.rides.doneKey || f.rides.run ? resendKey(f.rides, f.ms, REPLAY_ENGINE.resendMs) : '';
    if (rides !== st.rides) {
      st.rides = rides;
      sendData(map, sent.current, REPLAY_LINES.rides, traceGeoJSON(revealedRuns(f.rides)));
      changed = true;
    }
    // A break's hop, in the dots of a gap's link (RC21): data while it draws, a few sends, and none once it is whole.
    const hops = hopsKey(f.hops, f.ms, REPLAY_ENGINE.resendMs);
    if (hops !== st.hops) {
      st.hops = hops;
      sendData(map, sent.current, 'gap-links', traceGeoJSON(hopLines(f.hops)));
      changed = true;
    }
    const { center, zoom } = f.camera;
    const at = `${p ? 1 : 0}|${f.walker ? `${f.walker[0]},${f.walker[1]}` : ''}|${center ? `${center[0]},${center[1]},${zoom}` : ''}`;
    if (at !== st.at) {
      st.at = at;
      changed = true;
      // The camera first, then the dot on it: the map's markers are placed as the camera moves. A replay's camera is the
      // ceremony's to say (RC16) and the stage covers the map while it is told, so it never waits on a hand as the
      // live walk's follow does: a touch from before the telling whose end never came would stop it for good.
      if (center) {
        perfCount('camera');
        map.jumpTo(zoom == null ? { center, ...FLAT_NORTH_UP } : { center, zoom, ...FLAT_NORTH_UP });
      }
      if (p) {
        p.el.style.display = f.walker ? '' : 'none';
        p.cone.style.display = 'none';
        if (f.walker) p.marker.setLngLat(f.walker);
      }
      // Where the dot is drawn (QL12), for the e2e.
      container.current?.setAttribute('data-walker', fmt(f.walker));
    }
    // Where the line ends and where the frame put the camera, for the e2e and the harness (only when measuring).
    if ((window as { __perf?: unknown }).__perf) {
      container.current?.setAttribute('data-reveal-end', fmt(f.walked.end));
      container.current?.setAttribute('data-cam', center ? `${center[0]},${center[1]},${zoom ?? ''}` : '');
      // The hops drawn, each "from lon,lat>to lon,lat@how far".
      container.current?.setAttribute('data-hops', f.hops.map((h) => `${fmt(h.from)}>${fmt(h.to)}@${h.p.toFixed(3)}`).join('|'));
    }
    // Drawn now, in this frame: the canvas and the dot, which is an element over it, never part by a frame (RC1).
    if (changed) {
      perfCount('redraw');
      map.redraw();
    }
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
    // The camera follows the dot, so they move together; never while a hand is on the map, nor while the compass eases
    // north (a jump would cut the ease: tend map 15).
    if (followMoves({ following: !!followRef.current, handOnMap: pointerDown.current, northEasing: northAsked.current })) mapRef.current?.jumpTo({ center: f.walker });
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
    // Only a map with a compass turns (CP1, decision 0082): the others have no way back to north (tend map 1). Neither
    // two fingers nor Shift and an arrow key turns them.
    if (!props.onBearingChange) {
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
    }
    const measure = () => {
      const c = map.getCanvas();
      canvasSize.current = { width: c.clientWidth, height: c.clientHeight };
    };
    map.on('resize', measure);
    map.on('load', measure);
    map.on('load', () => {
      // The base map's own layers, before the app adds its overlay (T17: whether the tiles drew anything).
      baseLayers.current = blankLookLayers(map.getStyle().layers as { id: string; type: string; 'source-layer'?: string }[]);
      firstRoad.current = addOverlay(map);
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
        // Explore in a dense city (DC5, DC6, DC14, DC15): the e2e moves the newest map in code and asks which storefront names are
        // drawn, where; names the map placed, never the reserved room (DC14).
        const NAMES = ['storefront-names', 'storefront-names-turned'];
        const storefrontsIn = (box?: [[number, number], [number, number]]) =>
          [...new Set((box ? map.queryRenderedFeatures(box, { layers: NAMES }) : map.queryRenderedFeatures({ layers: NAMES }))
            .filter((f) => !f.properties?.reserve).map((f) => String(f.properties?.name)))];
        const canvasXY = (x: number, y: number): [number, number] => {
          const r = map.getCanvas().getBoundingClientRect();
          return [x - r.left, y - r.top];
        };
        const w = window as { __zoomTo?: unknown; __storefrontNamesIn?: unknown; __storefrontNamePoint?: unknown };
        w.__zoomTo = (at: LngLat, zoom: number) => map.jumpTo({ center: at, zoom });
        // smooth-switches SS9: the same move with the app idle, the bare camera's cost to measure a switch against. Started by a
        // key, as a switch is (`__easeNext`, then F9): a move started from a script got almost no frames in headless Chromium.
        window.addEventListener('keydown', (e) => {
          const next = (window as { __easeNext?: [LngLat, number] }).__easeNext;
          if (e.key !== 'F9' || !next) return;
          map.easeTo({ center: next[0], duration: next[1] });
        });
        w.__storefrontNamesIn = (x0: number, y0: number, x1: number, y1: number) => storefrontsIn([canvasXY(x0, y0), canvasXY(x1, y1)]);
        w.__storefrontNamePoint = () => {
          const r = map.getCanvas().getBoundingClientRect();
          for (let y = 60; y < r.height - 60; y += 8)
            for (let x = 30; x < r.width - 30; x += 8) {
              // Only where the name is what a finger meets: no pin or control over it.
              if (document.elementFromPoint(r.left + x, r.top + y) !== map.getCanvas()) continue;
              const hit = storefrontsIn([[x - 1, y - 1], [x + 1, y + 1]]);
              if (hit.length) return { x: r.left + x, y: r.top + y, name: hit[0] };
            }
          return null;
        };
        map.on('movestart', () => container.current?.setAttribute('data-idle', '0'));
        map.on('idle', () => {
          container.current?.setAttribute('data-idle', '1');
          container.current?.setAttribute('data-storefront-names', JSON.stringify(storefrontsIn()));
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
      if (fit.current.refitting) return;
      const zoom = map.getZoom();
      const lat = map.getCenter().lat;
      // The canvas's own middle: getCenter() is the padded centre a fit leaves behind, which a map
      // made fresh (without the padding) would put elsewhere. Its size as last measured, never read per move.
      if (!canvasSize.current.width) measure();
      const c = map.unproject([canvasSize.current.width / 2, canvasSize.current.height / 2]);
      onCameraChange.current?.({ center: [c.lng, c.lat], zoom });
      // For the e2e (tabs audit U15): the zoom, written straight to the DOM, never a render.
      container.current?.setAttribute('data-zoom', zoom.toFixed(2));
      // And the centre (QL12), on the same path.
      container.current?.setAttribute('data-center', `${c.lng.toFixed(6)},${c.lat.toFixed(6)}`);
      // And what is in view, west,south,east,north (fix explore-fit-area: the whole town is framed).
      const b = map.getBounds();
      container.current?.setAttribute('data-bounds', [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((x) => x.toFixed(5)).join(','));
      const seen = (v: { zoom: number; lat: number } | null, to: { zoom: number; lat: number }) => (v && Math.abs(v.zoom - to.zoom) < 0.05 && Math.abs(v.lat - to.lat) < 0.01 ? v : to);
      // A replay's frames move the camera, and often the zoom, every frame (RC2): the view is taken at most twice a second.
      if (replayLast.current) {
        viewWaiting.current = { zoom, lat };
        viewTimer.current ??= setTimeout(() => {
          viewTimer.current = null;
          const to = viewWaiting.current;
          if (to) setView((v) => seen(v, to));
        }, REPLAY_VIEW_MS);
        return;
      }
      setView((v) => seen(v, { zoom, lat }));
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
    // Any move's end (the ease to north done, or cut by a drag or a fit) ends the request.
    map.on('moveend', () => {
      // A refit's own stop is not a move's end (tend explore audit 19).
      if (fit.current.refitting) return;
      northAsked.current = false;
    });
    // explore-dense-city ui 3: the storefront names fold upright for the bearing the map settles on (a turn, resetNorth).
    let namesBearing = 0;
    const uprightNames = () => {
      const b = Math.round(map.getBearing());
      if (b === namesBearing || !map.getLayer('storefront-names')) return;
      namesBearing = b;
      map.setLayoutProperty('storefront-names', 'text-rotate', storefrontNameRotate(b) as never);
      map.setLayoutProperty('storefront-names-turned', 'text-rotate', storefrontNameRotate(b) as never);
    };
    map.on('rotateend', uprightNames);
    map.on('moveend', uprightNames);
    const marksTurned = () => setMarksBearing(Math.round(map.getBearing()));
    map.on('rotateend', marksTurned);
    map.on('moveend', marksTurned);
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
    // The credits stay reachable (OSM asks it): top right on Chronicle, where the sheet never covers them; on every
    // other map beside the scale bar, on the strip its screen keeps clear, placed below (tend map 3). Bottom right,
    // they lay under the walk's strip, the replay's card, Locate and the capture stack.
    const credits = new ClosedAttribution(!!props.placeNamesCredit);
    credits.onOpen = (open) => onCreditsOpen.current?.(open);
    creditsRef.current = credits;
    map.addControl(credits, props.attributionTop ? 'top-right' : 'bottom-left');
    // DC9: the camera's moves, once at their start and once at their settle (Explore's storefronts read waits for the settle).
    map.on('movestart', () => {
      perfMark('mark:moved');
      onMoveState.current?.(true);
    });
    map.on('moveend', () => {
      // DC9: the moveend a refit's own stop fires mid-air is not the settle (tend explore audit 19).
      if (fit.current.refitting) return;
      perfMark('mark:settled');
      onMoveState.current?.(false);
    });
    map.on('zoomend', track);
    // A pan changes the latitude the merge radius is measured at.
    map.on('moveend', track);
    map.on('load', track);
    return () => {
      clearTimeout(pressTimer);
      if (viewTimer.current) clearTimeout(viewTimer.current);
      clearTimeout(holdTimer);
      dropSwipe();
      // A map that comes back opens north-up (CP8), so its screen hears north as it goes: a map taken down under the
      // planner left its last turn with the compass (tend map audit 6).
      if (sentBearing !== 0) onBearingChange.current?.(0);
      // audit 7: a map taken down mid-move fires no moveend; whatever waits for its settle goes on.
      onMoveState.current?.(false);
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; later prop changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setData = (id: string, data: GeoJSON.FeatureCollection) => sendData(mapRef.current, sent.current, id, data);

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

  // The walked streets and the fog. In the replay's first beat the walked light up out of the fog in the order walked
  // (replay ceremony RC23): the map does that itself as time passes, a few sends a second through the gate, and no
  // screen renders for it. 'dark' draws them all as fog; with no `lightUp` they are drawn as given.
  const lightKey = typeof props.lightUp === 'object' ? props.lightUp.key : props.lightUp ?? 'lit';
  const lightOver = typeof props.lightUp === 'object' ? props.lightUp.over : 0;
  useEffect(() => {
    if (!ready) return;
    const walked = props.walked ?? [];
    const fog = props.fog ?? [];
    const send = (n: number) => {
      setData('walked', segmentsGeoJSON(n >= walked.length ? walked : walked.slice(0, n)));
      setData('fog', segmentsGeoJSON(n >= walked.length ? fog : [...fog, ...walked.slice(n)]));
    };
    if (typeof lightKey !== 'number') {
      send(lightKey === 'dark' ? 0 : walked.length);
      return;
    }
    let raf = 0;
    let from: number | null = null;
    let sentAt = -Infinity;
    let lit = -1;
    const frame = (now: number) => {
      from ??= now;
      const n = litStreets(walked.length, now - from, lightOver);
      if (n !== lit && (n >= walked.length || now - sentAt >= REPLAY_ENGINE.resendMs)) {
        lit = n;
        sentAt = now;
        send(n);
      }
      if (n < walked.length) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ready, props.fog, props.walked, lightKey, lightOver]);
  // Sent only when the screen's lines change (WB16): the screen keeps the same object while they don't.
  // Sent only when the lines drawn change (WB16), by their key, never because a screen made a new object: the walk screen's
  // ready and live states hand the same lines over at Start. A map that never had lines sends none.
  const pastSent = useRef('');
  const pastNow = useRef(props.past);
  useEffect(() => {
    pastNow.current = props.past;
  });
  const pastKey = props.past?.key ?? '';
  useEffect(() => {
    if (!ready || pastKey === pastSent.current) return;
    pastSent.current = pastKey;
    const past = pastNow.current;
    setData('past', traceGeoJSON(past?.runs ?? []));
    perfCount('past:send');
    container.current?.setAttribute('data-past', (past?.ids ?? []).slice().sort().join('|'));
  }, [ready, pastKey]);
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
  const hasLanding = !!props.landing;
  useEffect(() => {
    if (!ready) return;
    setData('alternates', alternatesGeoJSON(props.alternates));
    // The e2e reads how many faint routes are drawn (only when it is measuring: window.__perf).
    if ((window as { __perf?: unknown }).__perf && container.current) container.current.dataset.alternates = String(props.alternates?.length ?? 0);
  }, [ready, props.alternates]);
  useEffect(() => {
    if (!ready) return;
    // The e2e reads which of the trace-like layers carry anything (only when it is measuring): none while a preview is up.
    if ((window as { __perf?: unknown }).__perf && container.current) {
      container.current.dataset.drawn = [['trace', props.trace?.length], ['walked', props.walked?.length], ['fog', props.fog?.length], ['faint', props.faint?.length], ['landing', hasLanding ? 1 : 0], ['borders', props.borders ? 1 : 0], ['walkability', props.walkability ? 1 : 0]].filter(([, n]) => n).map(([k]) => k).join(',');
    }
  }, [ready, props.trace, props.walked, props.fog, props.faint, hasLanding, props.borders, props.walkability]);
  // SS3: the lines and pockets are sent only when they change, never because the names near the selected area did: each
  // send drops the source's tiles, and a revisit's lines were cut again.
  const graded = props.landing?.graded;
  const pockets = props.landing?.pockets;
  useEffect(() => {
    if (!ready) return;
    setData('pockets', pocketsGeoJSON(props.landing));
    setData('strips', stripsGeoJSON(props.landing));
    // The e2e reads whether storefront streets are drawn (the Storefront streets layer).
    container.current?.setAttribute('data-storefronts', props.landing ? `strips:${stripsGeoJSON(props.landing).features.length}` : '');
    // How many times the drawing was sent: the e2e checks it is not sent once a fix (layers audit 2).
    container.current?.setAttribute('data-storefronts-sets', String(Number(container.current?.getAttribute('data-storefronts-sets') ?? 0) + 1));
    // The view is read whole; what it draws is in `graded` and `pockets`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, graded, pockets]);
  // The storefront names (DC1, DC14): sent when the areas or the reserved name change, never per fix or zoom.
  const reserveKey = props.storefrontNamesReserve ? `${props.storefrontNamesReserve.name}|${props.storefrontNamesReserve.at.join(',')}` : '';
  const reserveRef = useRef(props.storefrontNamesReserve);
  // DC17: every "?" pin keeps its room; sent again only when the pins move, never per render.
  const pinsAt = (props.discoveries ?? []).map((d) => d.at);
  const pinsKey = props.landing ? pinsAt.map((a) => a.join(',')).join('|') : '';
  const pinsRef = useRef(pinsAt);
  useEffect(() => {
    pinsRef.current = (props.discoveries ?? []).map((d) => d.at);
  });
  useEffect(() => {
    reserveRef.current = props.storefrontNamesReserve;
  });
  // DC18: the walk maps' names near you, re-sent only when you move about 100 m.
  const nearRef = useRef(props.storefrontNamesNear);
  const nearKey = props.storefrontNamesNear ? `${props.storefrontNamesNear.at.map((x) => x.toFixed(3)).join(',')}:${props.storefrontNamesNear.m}` : '';
  const clearOfRef = useRef(props.storefrontNamesClearOf);
  const landingRef = useRef(props.landing);
  useEffect(() => {
    nearRef.current = props.storefrontNamesNear;
    clearOfRef.current = props.storefrontNamesClearOf;
    landingRef.current = props.landing;
  });
  // audit 11: the screen's controls over the map, and the map's edge, as room cells where the map now stands. Read from
  // the page each time the map settles (a control never moves with the map); none while the Storefronts layer is off.
  const roomOnScreen = (map: MapLibreMap): LngLat[] => {
    const canvas = map.getCanvas().getBoundingClientRect();
    const rects: { x: number; y: number; w: number; h: number }[] = [
      { x: 0, y: 0, w: canvas.width, h: 0 }, { x: 0, y: canvas.height, w: canvas.width, h: 0 },
      { x: 0, y: 0, w: 0, h: canvas.height }, { x: canvas.width, y: 0, w: 0, h: canvas.height },
    ];
    for (const id of clearOfRef.current ?? [])
      for (const el of document.querySelectorAll(`[data-testid="${id}"]`)) {
        const r = el.getBoundingClientRect();
        if (!r.width || r.right < canvas.left || r.left > canvas.right || r.bottom < canvas.top || r.top > canvas.bottom) continue;
        rects.push({ x: r.left - canvas.left, y: r.top - canvas.top, w: r.width, h: r.height });
      }
    return rects.flatMap((r) => roomCells(r)).map(([x, y]) => {
      const c = map.unproject([x, y]);
      return [c.lng, c.lat] as LngLat;
    });
  };
  const sendNames = useRef<() => void>(() => {});
  useEffect(() => {
    sendNames.current = () => {
      const map = mapRef.current;
      if (!map || !map.getSource('storefront-names')) return;
      const landing = landingRef.current;
      const names = storefrontNamesGeoJSON(landing, reserveRef.current ?? null, pinsRef.current, nearRef.current ?? null, landing ? roomOnScreen(map) : []);
      setData('storefront-names', names);
      // The e2e reads what the map was given (only when it is measuring): each name and where it goes.
      if ((window as { __perf?: unknown }).__perf && container.current) {
        container.current.dataset.storefrontsGiven = JSON.stringify(names.features.filter((f) => !f.properties?.reserve).map((f) => ({ name: f.properties?.name, at: (f.geometry as GeoJSON.Point).coordinates })));
      }
    };
  });
  // SS5: a switch's move holds the names: cleared at once, sent once when that move settles (the moveend below).
  const namesHeld = useRef(false);
  const switchSeen = useRef(props.storefrontNamesSwitch);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || props.storefrontNamesSwitch === switchSeen.current) return;
    switchSeen.current = props.storefrontNamesSwitch;
    namesHeld.current = true;
    perfCount('storefront-names:clear');
    // Counted as the clear it is, never as a send of the names (SS10 counts those).
    sendData(map, sent.current, 'storefront-names', { type: 'FeatureCollection', features: [] }, false);
    // A switch that moves nothing (the camera already there) lets them go once its move would have ended.
    const t = setTimeout(() => {
      if (namesHeld.current && !map.isMoving()) {
        namesHeld.current = false;
        sendNames.current();
      }
    }, MOTION.camera + MOTION.ease);
    return () => clearTimeout(t);
  }, [ready, props.storefrontNamesSwitch]);
  useEffect(() => {
    if (ready && !namesHeld.current) sendNames.current();
  }, [ready, props.landing, reserveKey, pinsKey, nearKey]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    // The rooms follow the map: once it settles, and when the screen changes size. A switch's held names go out here,
    // once, a frame on: a move cut short by the next one ends before that one starts (SS5).
    const again = () => {
      if (fit.current.refitting) return;
      if (!namesHeld.current) {
        if (landingRef.current) sendNames.current();
        return;
      }
      requestAnimationFrame(() => {
        if (!namesHeld.current || map.isMoving()) return;
        namesHeld.current = false;
        sendNames.current();
      });
    };
    map.on('moveend', again);
    map.on('resize', again);
    return () => {
      map.off('moveend', again);
      map.off('resize', again);
    };
  }, [ready]);
  // DC16: over every layer on Explore, so its names are placed before the base map's; elsewhere under the base map's labels
  // (placed after them, so a road keeps its own name) and so under the trace and the route.
  const namesOver = !!props.storefrontNamesOver;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const firstSymbol = (map.getStyle().layers as { type: string; id: string }[]).find((l) => l.type === 'symbol' && !l.id.startsWith('storefront-names'))?.id;
    const below = namesOver ? undefined : firstSymbol ?? 'alternates-edge';
    map.moveLayer('storefront-names', below);
    map.moveLayer('storefront-names-turned', below);
    map.moveLayer('storefront-names-room', below);
    container.current?.setAttribute('data-storefronts-over', namesOver ? '1' : '0');
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
  const ends = traceEnds(Array.isArray(props.ended) ? props.ended : props.trace, !!props.ended);
  const endsKey = `${fmt(ends.start)}|${fmt(ends.end)}`;
  useEffect(() => {
    if (ready) setData('ends', endsGeoJSON(ends.start, ends.end));
    // ends is derived from endsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, endsKey]);
  useEffect(() => { if (ready) setData('ring', ringGeoJSON(props.ring)); }, [ready, props.ring]);
  useEffect(() => { if (ready) setData('ground', groundGeoJSON(props.ground ?? null)); }, [ready, props.ground]);
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
    for (const id of ['trace-edge', 'trace-history-edge', 'trace-link-edge', 'rides-edge']) mapRef.current?.setPaintProperty(id, 'line-opacity', TRACE_EDGE_OPACITY * (props.traceOpacity ?? 1));
    mapRef.current?.setPaintProperty('faint', 'line-opacity', FAINT_OPACITY * (props.traceOpacity ?? 1));
    // The dots go with the trace: hidden while navigating (gap-drawing audit 12).
    mapRef.current?.setPaintProperty('gap-links', 'line-opacity', 0.8 * (props.traceOpacity ?? 1));
    mapRef.current?.setPaintProperty('faint-edge', 'line-opacity', TRACE_EDGE_OPACITY * FAINT_OPACITY * (props.traceOpacity ?? 1));
    // The markers go with the trace (QL3): hidden while navigating, faint in the replay's first beats.
    for (const id of ['ends-ring', 'ends']) {
      mapRef.current?.setPaintProperty(id, 'circle-opacity', props.traceOpacity ?? 1);
      mapRef.current?.setPaintProperty(id, 'circle-stroke-opacity', props.traceOpacity ?? 1);
    }
  }, [ready, props.traceOpacity]);
  useEffect(() => {
    if (!ready) return;
    setData('points', walkerGeoJSON(glideOn ? null : props.walker));
    // Where the dot is drawn (QL12), for the e2e; empty with none. A replay's frames say their own (`applyReplay`).
    if (!replayLast.current) container.current?.setAttribute('data-walker', fmt(props.walker));
  }, [ready, glideOn, props.walker]);
  // The credits beside the scale bar (tend map 3), moved with the inset (a sheet's height) and the map's width.
  const scaleBottom = (props.scaleInset ?? DEFAULT_SCALE_INSET).bottom;
  const scaleLeft = (props.scaleInset ?? DEFAULT_SCALE_INSET).left;
  const creditsTop = !!props.attributionTop;
  useEffect(() => {
    const map = mapRef.current;
    const credits = creditsRef.current;
    if (!ready || !map || !credits || creditsTop) return;
    const place = () => credits.place(creditsAt({ bottom: scaleBottom, left: scaleLeft }, SCALE_MAX_PX, map.getContainer().clientWidth));
    place();
    map.on('resize', place);
    return () => {
      map.off('resize', place);
    };
  }, [ready, scaleBottom, scaleLeft, creditsTop]);
  // The scale bar follows the view (QL7): the longest round length that fits at this zoom and latitude.
  const units = useUnits();
  const scale = useMemo(() => (view ? scaleBar(metersPerPixel(view.zoom, view.lat), SCALE_MAX_PX, units) : null), [view, units]);
  // No scale bar over a blank world (T17): with no fix, the map looks at what it drew each time it settles.
  const blankWatch = !!props.hideScaleOnBlank && !props.walker;
  const [drawn, setDrawn] = useState<boolean | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !blankWatch) return;
    // Only the base map's layers: the app's own (the world's veil among them) cover the world whatever the tiles did.
    const look = () => {
      const layers = baseLayers.current.filter((id) => map.getLayer(id));
      setDrawn(layers.length > 0 && map.queryRenderedFeatures({ layers }).length > 0);
    };
    map.on('idle', look);
    // A map already settled fires no idle until it draws again.
    map.triggerRepaint();
    return () => {
      map.off('idle', look);
    };
  }, [ready, blankWatch]);
  const scaleOn = scaleShown({ hideOnBlank: !!props.hideScaleOnBlank, fix: !!props.walker, drawn });
  // The live walk's dot and cone: one marker, drawn at the same size as the layers. A replay's walker is the same
  // marker, moved by the replay's own frames (replay ceremony RC1).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !(glideOn || replayOn)) return;
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
    // Placed to the sub-pixel: MapLibre rounds a marker to a whole pixel otherwise, and a camera that follows the walker
    // puts the dot at the screen's middle, a half pixel on a screen of an odd width, rounded one way or the other from
    // frame to frame (the owner's iPhone, Nov 18: "after images"). A dot crossing a still map moves evenly too.
    const marker = new Marker({ element: el, anchor: 'center', subpixelPositioning: true }).setLngLat([0, 0]).addTo(map);
    puck.current = { marker, el, cone };
    if (replayOn) applyReplay(replayLast.current);
    else applyFrame(lastFrame.current);
    return () => {
      marker.remove();
      puck.current = null;
    };
    // applyFrame and applyReplay only read refs.
  }, [ready, glideOn, replayOn]);
  // A frame that came before the style had loaded is drawn once it has.
  useEffect(() => {
    if (ready && replayLast.current) applyReplay(replayLast.current);
    // applyReplay only reads refs.
  }, [ready]);

  // Capture pins are DOM markers rendered with the same view as on native,
  // grouped for the current zoom. Clicks look the pin up by id, so a pin
  // whose members changed never opens stale captures.
  const pins = useZoomPins(props.captures, view?.zoom ?? null, view?.lat ?? null);
  // One read of the reminders per map, for the bells on its pins (RB1, RB6).
  const reminded = useReminded();
  // One read of the reactions per map, for the bubbles on its pins (RX17, RX21).
  const sets = useReactionSets(!!props.captures?.length || !!props.memories?.length);
  // The start and end markers a pin may stand on (decision 0172, O13): none while they are hidden with the trace.
  const markersShown = (props.traceOpacity ?? 1) > 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const standOn = useMemo<(LngLat | null)[]>(() => (markersShown ? [ends.start, ends.end] : []), [endsKey, markersShown]);
  usePinMarkers(mapRef, ready, canvasSize, pins, props.onPinPress ? (p) => props.onPinPress?.(p.captures) : undefined, false, reminded, sets, props.clocks, props.now, standOn);
  // Memories from earlier walks: the same pins, faint, with their own tap (MR1-MR4).
  const memoryPins = useZoomPins(props.memories ?? NO_CAPTURES, view?.zoom ?? null, view?.lat ?? null);
  usePinMarkers(mapRef, ready, canvasSize, memoryPins, props.onMemoryPress ? (p) => props.onMemoryPress?.(p.captures, p.lngLat) : undefined, true, reminded, sets, undefined, props.now, standOn);
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
  // Before paint, as the pins' (tend map 17).
  useLayoutEffect(() => {
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
      // The selected star is told as it is drawn: "current" on the web, where a button takes no aria-selected (tend map
      // 20, the owner's "Allow it", Nov 18).
      if (selected) el.setAttribute('aria-current', 'true');
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
  // Before paint, as the pins' (tend map 17).
  useLayoutEffect(() => {
    markLatest.current = props.onDiscoveryPress;
  });
  const viewZoom = view?.zoom ?? 16;
  type MarkEntry = { marker: Marker; root: Root; el: HTMLElement; key: string; spread: string; pin: MarkPin; state: { revealed: boolean; found?: boolean; faint?: boolean } };
  const markMarkers = useRef(new Map<string, MarkEntry>());
  // Places come and go with a settle on a walk (PI1-PI14): what the last sync showed (null before the first: first
  // sight, PI5) and under which context, the marks still shrinking out, and when each mark last left (PI13).
  const markShown = useRef<{ ids: Set<string>; context: string | null } | null>(null);
  const markLeaving = useRef(new Map<string, MarkEntry>());
  const markLeftAt = useRef(new Map<string, number>());
  const markRelease = useRef<((id: string) => void) | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const drop = (m: { marker: Marker; root: Root }) => {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    };
    const pins = declutterMarks(props.discoveries ?? [], viewZoom, { bearing: marksBearing, spread: !!props.spreadMarks });
    const context = props.marksContext ?? null;
    const now = Date.now();
    const bounds = map.getBounds();
    const atOf = new Map<string, LngLat>(pins.map((p) => [p.id, p.at]));
    for (const [id, m] of markMarkers.current) if (!atOf.has(id)) atOf.set(id, m.pin.at);
    const moves = markMoves({
      prev: markShown.current?.ids ?? null,
      prevContext: markShown.current?.context ?? null,
      ids: pins.map((p) => p.id),
      context,
      recentlyLeft: recentlyLeft(markLeftAt.current, now),
      leaving: new Set(markLeaving.current.keys()),
      inView: (id) => {
        const at = atOf.get(id);
        return !!at && bounds.contains(at);
      },
    });
    // A mark back while it shrinks: its leave is cut and it is drawn once, still (PI6, PI13).
    for (const id of moves.back) {
      const m = markLeaving.current.get(id);
      if (m) drop(m);
      markLeaving.current.delete(id);
    }
    const live = new Set<string>();
    for (const pin of pins) {
      live.add(pin.id);
      const key = `${pin.at.join(',')}|${markKey(pin)}|${pin.name}|${pin.icon}|${pin.quiet ? 'q' : ''}`;
      const existing = markMarkers.current.get(pin.id);
      const spread = spreadKey(pin.spread);
      if (existing?.key === key) {
        // A row that shifts with the zoom or a turn moves its marker in place, never a new one: focus and a tap in
        // flight stay (fix mark-overlap audit 6).
        if (existing.spread !== spread) {
          existing.spread = spread;
          existing.pin = pin as MarkPin;
          existing.marker.setOffset([pin.spread?.dx ?? 0, MARK_BELOW + (pin.spread?.dy ?? 0)]);
          existing.root.render(<MarkPinView pin={pin as MarkPin} below={MARK_BELOW} />);
        }
        continue;
      }
      if (existing) drop(existing);
      // Revealed in front of you it turns in (M11); found, it pulses once (M12); either wins over an arrival still
      // under way (PI7). Come within range on a walk, it grows in (PI2).
      const arriving = !existing && moves.arriving.has(pin.id);
      const enter = arrivalEnter(arriving, markEnter(existing?.state, pin));
      if (arriving) perfCount('mark:in');
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
          // A leaving mark takes no tap (PI6).
          if (el.dataset.leaving) return;
          markLatest.current?.(id);
        });
      // A mark kept for its focus goes once the focus leaves it (poi-transitions ui 6).
      el.addEventListener('focusout', () => setTimeout(() => markRelease.current?.(id), 0));
      const root = createRoot(el);
      perfCount('marker:mark');
      root.render(<MarkPinView pin={pin as MarkPin} enter={enter} below={MARK_BELOW} />);
      // A spread pin stands off its point, on a leg back to it (fix mark-overlap).
      const marker = new Marker({ element: el, anchor: 'bottom', offset: [pin.spread?.dx ?? 0, MARK_BELOW + (pin.spread?.dy ?? 0)] }).setLngLat(pin.at).addTo(map);
      markMarkers.current.set(pin.id, { marker, root, el, key, spread, pin: pin as MarkPin, state: { revealed: pin.revealed, found: pin.found, faint: pin.faint } });
    }
    const sameContext = context != null && markShown.current?.context === context;
    // Falling out of range on a walk, a mark shrinks out first (PI3), taking no tap or focus and hidden from a screen
    // reader from then (PI6).
    const startLeave = (id: string, m: MarkEntry, animate: boolean) => {
      markMarkers.current.delete(id);
      markLeftAt.current.set(id, Date.now());
      if (!animate) {
        // A focus it held goes to the map, never to the page.
        if (m.el.contains(document.activeElement)) map.getCanvas().focus();
        drop(m);
        return;
      }
      perfCount('mark:out');
      m.el.dataset.leaving = 'true';
      m.el.setAttribute('aria-hidden', 'true');
      m.el.tabIndex = -1;
      m.el.style.pointerEvents = 'none';
      markLeaving.current.set(id, m);
      const left = () => {
        if (markLeaving.current.get(id) !== m) return;
        markLeaving.current.delete(id);
        drop(m);
      };
      m.root.render(<MarkPinView pin={m.pin} below={MARK_BELOW} onLeft={left} />);
    };
    // A "?" holding the focus is not taken by a step of the walk (poi-transitions ui 6), as a focused capture pin is
    // never dropped (`drawsPin`): it stays, still and focusable, and goes once the focus leaves it.
    markRelease.current = (id: string) => {
      const m = markMarkers.current.get(id);
      if (!m || markShown.current?.ids.has(id) || m.el.contains(document.activeElement)) return;
      startLeave(id, m, map.getBounds().contains(m.pin.at));
    };
    for (const [id, m] of markMarkers.current) {
      if (live.has(id)) continue;
      if (sameContext && m.el.contains(document.activeElement)) continue;
      startLeave(id, m, moves.leaving.has(id));
    }
    // The record of who left is kept only as long as it can still hold a mark still (PI13).
    for (const [id, t] of markLeftAt.current) if (now - t > MARK_MOTION.backStillMs) markLeftAt.current.delete(id);
    markShown.current = { ids: live, context };
  }, [ready, props.discoveries, viewZoom, marksBearing, props.spreadMarks, props.marksContext]);
  // Leaving the screen takes every mark away at once, a leaving one too (PI8).
  useEffect(() => () => {
    for (const m of [...markMarkers.current.values(), ...markLeaving.current.values()]) {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    }
    markMarkers.current.clear();
    markLeaving.current.clear();
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
  // Explore's area points (atlas round 3), as DOM markers. SS6: kept by area and re-rendered in place when their look
  // changes (the one left, the one selected); built only for an area new to the map, removed only for one gone.
  const areaMarkers = useRef<{ id: string; at: string; look: string; el: HTMLDivElement; marker: Marker; root: Root }[]>([]);
  const areaKey = (props.areaPoints ?? []).map((p) => `${p.id}:${p.name ?? ''}:${p.selected ? 1 : 0}`).join('|');
  const areaPointsRef = useRef(props.areaPoints);
  useEffect(() => {
    areaPointsRef.current = props.areaPoints;
  }, [props.areaPoints]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const points = areaPointsRef.current ?? [];
    const ids = new Set(points.map((p) => p.id));
    for (const m of areaMarkers.current.filter((x) => !ids.has(x.id))) {
      m.marker.remove();
      const r = m.root;
      queueMicrotask(() => r.unmount());
    }
    const kept = areaMarkers.current.filter((x) => ids.has(x.id));
    areaMarkers.current = points.map((p) => {
      const look = `${p.name ?? ''}:${p.selected ? 1 : 0}`;
      const at = p.at.join(',');
      const was = kept.find((x) => x.id === p.id);
      if (was) {
        if (was.at !== at) was.marker.setLngLat(p.at);
        if (was.look !== look) {
          if (p.name) was.el.dataset.name = p.name;
          else delete was.el.dataset.name;
          if (p.selected) was.el.dataset.selected = '1';
          else delete was.el.dataset.selected;
          was.root.render(<AreaPointView pin={p} />);
        }
        return { ...was, at, look };
      }
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
      return { id: p.id, at, look, el, root, marker: new Marker({ element: el, anchor: 'top', offset: [0, -6] }).setLngLat(p.at).addTo(map) };
    });
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
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setPaintProperty('veil', 'fill-opacity', props.veil ? 0.45 : 0);
    // The borders over the veil on the replay and a day, at a lighter fill, so a walk's town still reads as a region and
    // its labels keep 4:1 (decision 0199); the walk's unwalked veil stays over them (tend map audit 39).
    const overVeil = !!props.veil && !!props.bordersOverVeil;
    for (const [id, before] of borderMoves(overVeil, firstRoad.current)) map.moveLayer(id, before);
    map.setPaintProperty('border-fill', 'fill-opacity', borderFillOpacity(overVeil));
  }, [ready, props.veil, props.bordersOverVeil]);
  // QC24: the base map's shop and point-of-interest labels, hidden while a stop is a plain point (the outing's page, a followed outing).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const id of poiLabelLayers(map.getStyle().layers as { id: string; type: string; 'source-layer'?: string }[])) map.setLayoutProperty(id, 'visibility', props.hideLabels ? 'none' : 'visible');
  }, [ready, props.hideLabels]);
  // The fog is always quiet (decision 0222, WB1): its paint is set once with the layer. The e2e reads it, and the veil, here.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !container.current) return;
    container.current.setAttribute('data-fog-paint', `${map.getPaintProperty('fog', 'line-color')}|${map.getPaintProperty('fog', 'line-opacity')}`);
    container.current.setAttribute('data-veil', props.veil ? '1' : '0');
  }, [ready, props.veil]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !props.follow || !followMoves({ following: !!props.follow, handOnMap: pointerDown.current, northEasing: northAsked.current })) return;
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
  // A fit settles once its move has run, if the map is still up then; a refit restarts it (tend explore audit 19, F1).
  const settleAfter = (key: number, ms: number) => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      onFitSettled.current?.(key);
    }, ms + 150);
  };
  // The fit flying (tend explore 17): resized meanwhile, it is asked again at the new size. An area's card folds the
  // tabs away as it opens, so Explore's map grows mid-flight, which maplibre lands at the bounds' own middle (AT9).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const landed = () => {
      fit.current = fitStep(fit.current, { kind: 'moveend' }).state;
    };
    const resized = () => {
      const box = { width: map.getCanvas().clientWidth, height: map.getCanvas().clientHeight };
      const r = fitStep(fit.current, { kind: 'resize', box, moving: map.isMoving() });
      fit.current = r.state;
      if (r.do.kind !== 'refit') return;
      perfCount('refit');
      // Its own stop fires a moveend mid-air, which the settle listeners skip while `refitting` (DC9).
      map.fitBounds(r.do.ask.bounds, r.do.ask.options);
      fit.current = fitStep(fit.current, { kind: 'refitted' }).state;
      settleAfter(r.do.settle, r.do.ask.options.duration ?? 0);
    };
    map.on('moveend', landed);
    map.on('resize', resized);
    return () => {
      map.off('moveend', landed);
      map.off('resize', resized);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => {
    if (ready && props.fitBounds && props.fitKey !== fitAtMount.current) {
      fitAtMount.current = undefined;
      const [w, s, e, n] = props.fitBounds;
      const padding = props.fitPadding ?? FIT_PADDING;
      perfCount('fit');
      // At the bearing the map has: maplibre's fit turns it back to north unless told (CP1: a fit never changes the
      // bearing; tend map 2).
      const map = mapRef.current;
      // While the compass's ease to north runs, north: the bearing read mid-ease would stop the map part-way (tend map audit 4).
      const ask: FitAsk = { bounds: [[w, s], [e, n]], options: { padding, maxZoom: props.fitMaxZoom ?? FIT_MAX_ZOOM, duration, bearing: northAsked.current ? 0 : map?.getBearing() } };
      const key = props.fitKey ?? 0;
      map?.fitBounds(ask.bounds, ask.options);
      if (map) fit.current = fitStep(fit.current, { kind: 'fit', key, ask, box: { width: map.getCanvas().clientWidth, height: map.getCanvas().clientHeight }, moving: map.isMoving() }).state;
      // Settled once its move has run, if the map is still up then (a fit that moves nothing ends at once).
      settleAfter(key, duration);
      return () => {
        if (settleTimer.current) clearTimeout(settleTimer.current);
      };
    }
    // Refits when the caller changes fitKey, not on every new bounds array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.fitKey]);

  useImperativeHandle(ref, () => ({
    size() {
      const c = mapRef.current?.getCanvas();
      return { width: c?.clientWidth ?? 0, height: c?.clientHeight ?? 0 };
    },
    // applyReplay only reads refs.
    replayFrame: (f) => applyReplay(f),
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
    focus() {
      mapRef.current?.getCanvas().focus();
    },
    resetNorth() {
      const map = mapRef.current;
      if (!map) return;
      const duration = animateRef.current ? MOTION.camera : 0;
      // Set after easeTo starts: easeTo first stops any move under way, and that move's end clears the request.
      map.easeTo({ bearing: 0, duration });
      northAsked.current = duration > 0 && map.getBearing() !== 0;
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
      <div ref={container} style={{ position: 'absolute', inset: 0 }} data-trace-opacity={String(props.traceOpacity ?? 1)} data-rides={`${props.rides?.length ?? 0}:${props.rides?.reduce((n, r) => n + r.length, 0) ?? 0}`} data-faint={String(props.faint?.length ?? 0)} data-gaplinks={String(props.gapLinks?.length ?? 0)} data-drawing={String(props.drawing?.length ?? 0)} data-runs={String(props.trace.filter((r) => r.length > 1).length)} data-ring={props.ring ? String(props.ring.radiusM) : ''} data-ground={props.ground ? String(props.ground.polygons.reduce((n, rings) => n + rings.length, 0)) : ''} data-trace-end={traceEnd(props.trace)} data-ends={endsKey} data-graded={gradedKey} />
      {/* Beside the map's own DOM, not inside it, so React owns it. */}
      {scale && scaleOn && <ScaleBar bar={scale} inset={props.scaleInset} />}
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
/**
 * What a pin can be seen from: the canvas grown by a pin's reach (`PIN_REACH_PX`, tend map audit 35), its corners as
 * the map places them, west, south, east, north.
 */
const pinViewOf = (map: MapLibreMap, size: { width: number; height: number }): ViewBox => {
  const [w, h] = [size.width, size.height];
  const r = PIN_REACH_PX;
  const corners: [number, number][] = [[-r.left, -r.top], [w + r.right, -r.top], [w + r.right, h + r.bottom], [-r.left, h + r.bottom]];
  return boxAround(corners.map((p) => {
    const at = map.unproject(p);
    return [at.lng, at.lat] as LngLat;
  }));
};
/** A pin's marker is anchored at its bottom, its target's 6 px of padding below the stem's foot. */
const PIN_FOOT = 6;
const NO_ENDS: readonly (LngLat | null)[] = [];

function usePinMarkers(
  mapRef: RefObject<MapLibreMap | null>,
  ready: boolean,
  /** The canvas's size as the map last measured it: the view is worked out from it on every camera move, with no read of layout (replay ceremony: a replay moves the camera every frame). */
  canvasSize: RefObject<{ width: number; height: number }>,
  pins: CapturePin[],
  onPress: ((pin: CapturePin) => void) | undefined,
  memory: boolean,
  reminded: ReadonlySet<string>,
  sets: ReadonlyMap<string, ReactionSet>,
  clocks?: readonly WalkClock[],
  now?: number,
  standOn: readonly (LngLat | null)[] = NO_ENDS,
) {
  const latest = useRef({ pins: new Map<string, CapturePin>(), onPress });
  // Before paint, so a tap right after a render never reaches the previous handler (audit 8, tend map 17).
  useLayoutEffect(() => {
    latest.current = { pins: new Map(pins.map((p) => [p.id, p])), onPress };
  });
  const markers = useRef(new Map<string, { marker: Marker; root: Root; key: string; bell: boolean; rx: string; drops: boolean; lift: number }>());
  const interactive = !!onPress;
  // A capture taken since the screen opened drops in (M10); one already shown, or a reload, never.
  const [openedAt] = useState(() => Date.now());
  const seen = useRef(new Set<string>());
  // Only the pins in view and a margin round it are drawn (tend map 16): maplibre moves every marker on every camera
  // frame. The box is kept here, never as state, and redrawn only on a move's end that leaves it.
  const drawn = useRef<ViewBox | null>(null);
  // The last pin pressed: its viewer gives the focus back to it on closing, so it is never dropped (audit 37).
  const pressed = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const drop = (m: { marker: Marker; root: Root }) => {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    };
    // Measured here when the map has not yet said its size (a map just made), then only as the map resizes.
    const view = () => {
      if (!canvasSize.current.width) canvasSize.current = { width: map.getCanvas().clientWidth, height: map.getCanvas().clientHeight };
      return pinViewOf(map, canvasSize.current);
    };
    const sync = () => {
      if (!boxHolds(drawn.current, view())) drawn.current = pinDrawBox(view());
      const box = drawn.current!;
      const live = new Set<string>();
      for (const pin of pins) {
        const focused = !!markers.current.get(pin.id)?.marker.getElement().contains(document.activeElement);
        if (!drawsPin(pin.lngLat, box, { focused, pressed: pressed.current === pin.id })) continue;
        live.add(pin.id);
        const ids = pin.captures.map((c) => c.id).join(',');
        const bell = pinReminded(pin, reminded);
        const reactions = pinReactions(pin, sets);
        const rx = reactions.map((r) => r.id).join(',');
        // With the photo's small copy, so a copy made after the pin was drawn shows without a reload (QL27).
        const key = `${pin.lngLat.join(',')}|${pin.kind}|${ids}|${interactive}|${pinThumb(pin) ?? ''}`;
        const existing = markers.current.get(pin.id);
        // Its walk's clock may come after the pin (tend map T14): the name follows in place. With none, the part of the
        // day is told from the screen's `now`, renewed while it stays open, else from when the map opened (tend map T28,
        // audit 29); a new one relabels in place.
        const label = pinLabel(pin, interactive, memory, bell, clocks, now ?? openedAt, reactions);
        if (existing?.key === key && existing.bell === bell && existing.rx === rx && existing.marker.getElement().getAttribute('aria-label') !== label) {
          existing.marker.getElement().setAttribute('aria-label', label);
        }
        if (existing?.key === key) {
          // A reminder set or stopped (RB5), or a reaction changed (RX21), redraws the same element in place: focus
          // returns to it when the viewer closes (audit 3), and a photo keeps its painted picture (audit 4).
          if (existing.bell !== bell || existing.rx !== rx) {
            existing.marker.getElement().setAttribute('aria-label', label);
            existing.root.render(<CapturePinView pin={pin} faint={memory} drop={existing.drops} reminded={bell} reactions={reactions} />);
            existing.bell = bell;
            existing.rx = rx;
          }
          continue;
        }
        if (existing) drop(existing);
        // A 48 px target around the 36 px pin: the touch minimum on phones.
        const el = document.createElement(interactive ? 'button' : 'div');
        el.setAttribute('aria-label', label);
        el.dataset.ids = ids;
        if (memory) el.dataset.testid = 'memory-pin';
        if (interactive) {
          (el as HTMLButtonElement).type = 'button';
          el.style.cssText = 'background:none;border:0;padding:6px;cursor:pointer';
          const id = pin.id;
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            const p = latest.current.pins.get(id);
            pressed.current = id;
            if (p) latest.current.onPress?.(p);
          });
        } else {
          el.setAttribute('role', 'img');
          el.style.cssText = 'padding:6px;pointer-events:none';
        }
        const root = createRoot(el);
        const drops = !memory && pinDrops(pin.captures, seen.current, openedAt);
        for (const c of pin.captures) seen.current.add(c.id);
        root.render(<CapturePinView pin={pin} faint={memory} drop={drops} reminded={bell} reactions={reactions} />);
        // Anchored at the stem's foot, so the marked point stays visible; on a start or end, the foot at the marker's edge
        // above it (decision 0172, O13), its target reaching on down over the marker, which never takes a tap (QL3).
        const lift = stalkLift(pin.lngLat, standOn, map.getZoom(), map.getBearing());
        el.style.paddingBottom = `${PIN_FOOT + lift}px`;
        const marker = new Marker({ element: el, anchor: 'bottom', offset: [0, PIN_FOOT] }).setLngLat(pin.lngLat).addTo(map);
        // Memories sit under this walk's pins, so a new capture over an old one opens the new one (audit 6).
        marker.getElement().style.zIndex = memory ? '0' : '1';
        markers.current.set(pin.id, { marker, root, key, bell, rx, drops, lift });
      }
      for (const [id, m] of markers.current) {
        if (live.has(id)) continue;
        drop(m);
        markers.current.delete(id);
      }
    };
    sync();
    // During a move too, not only at its end (audit 36): one read and a compare an event, a redraw only past the box.
    const moved = () => {
      if (!boxHolds(drawn.current, view())) sync();
    };
    map.on('move', moved);
    map.on('moveend', moved);
    return () => {
      map.off('move', moved);
      map.off('moveend', moved);
    };
  }, [mapRef, ready, canvasSize, pins, interactive, memory, openedAt, reminded, sets, clocks, now, standOn]);
  // A pin standing on the walk's start or end stops its stalk at the marker's edge (decision 0172, O13): its lift is
  // measured on screen, so it follows the map as it zooms or turns, and is set only when it moves. The target's padding
  // below the foot carries it: the marker is anchored at the target's bottom, so the pin rises and its target still
  // reaches the point.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const place = () => {
      const zoom = map.getZoom();
      const bearing = map.getBearing();
      for (const pin of pins) {
        const m = markers.current.get(pin.id);
        if (!m) continue;
        const lift = stalkLift(pin.lngLat, standOn, zoom, bearing);
        if (Math.abs(lift - m.lift) < 0.25) continue;
        m.lift = lift;
        m.marker.getElement().style.paddingBottom = `${PIN_FOOT + lift}px`;
      }
    };
    place();
    map.on('zoom', place);
    map.on('rotate', place);
    return () => {
      map.off('zoom', place);
      map.off('rotate', place);
    };
  }, [mapRef, ready, pins, standOn]);
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

/**
 * A collection to one of a map's sources, through the one gate (replay ceremony RC4): sent only when it changed
 * (`nextSend`). `sent` is that map's own record of what each source holds.
 */
function sendData(map: MapLibreMap | null, sent: Map<string, Sent>, id: string, data: GeoJSON.FeatureCollection, counted = true): void {
  const src = map?.getSource(id) as { setData(d: GeoJSON.FeatureCollection): void } | undefined;
  if (!src) return;
  const next = nextSend(sent.get(id), data);
  sent.set(id, next.sent);
  if (!next.send) return;
  if (counted) perfCount(`setData:${id}`);
  src.setData(data);
}

/**
 * One kind of a replay's line brought to what a frame says (replay ceremony RC3): the whole runs sent when their list
 * changes, the run being walked sent once when it begins, and how far it shows painted, with nothing sent. True when
 * anything changed.
 */
function revealLine(map: MapLibreMap, sent: Map<string, Sent>, drawn: RevealDrawn, next: LineReveal, ids: { done: string; run: string }, layers: readonly (readonly [string, string])[]): boolean {
  let changed = false;
  if (next.doneKey !== drawn.doneKey) {
    drawn.doneKey = next.doneKey;
    sendData(map, sent, ids.done, traceGeoJSON(next.done));
    changed = true;
  }
  const stop = revealStop(drawn, next);
  if (stop.run !== drawn.run) {
    drawn.run = stop.run;
    drawn.p = -1;
    sendData(map, sent, ids.run, traceGeoJSON(stop.run ? [stop.run] : []));
    changed = true;
  }
  if (stop.p !== drawn.p) {
    drawn.p = stop.p;
    perfCount('reveal');
    for (const [layer, color] of layers) map.setPaintProperty(layer, 'line-gradient', revealGradient(color, stop.p) as unknown as GradientSpec, { validate: false });
    changed = true;
  }
  return changed;
}

/** What of a replay's line a source holds: the whole runs by their key, the run in the revealed source and how far it shows. */
type RevealDrawn = { doneKey: string; run: LngLat[] | null; p: number };
const freshReplayDrawn = (): { walked: RevealDrawn; rides: string; hops: string; at: string; clearing: boolean } => ({
  walked: { doneKey: '', run: null, p: -1 }, rides: '', hops: '', at: '', clearing: false,
});
type GradientSpec = NonNullable<NonNullable<import('maplibre-gl').LineLayerSpecification['paint']>['line-gradient']>;
/** The layers a reveal paints, each with its colour: the white edge, then the line. */
const WALKED_REVEAL_LAYERS = [['replay-run-edge', '#ffffff'], ['replay-run-line', COLORS.trace]] as const;
const EMPTY_LINES: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
/** While a replay moves the camera every frame, the view reaches React at most this often. */
const REPLAY_VIEW_MS = 500;

/** A point as "lon,lat" to 6 decimals, for the e2e's data attributes; empty for none. */
const fmt = (p: LngLat | null | undefined) => (p ? `${p[0].toFixed(6)},${p[1].toFixed(6)}` : '');
