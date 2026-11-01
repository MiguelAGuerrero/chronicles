import { AttributionControl, Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONFeature, type MapMouseEvent, type MapTouchEvent } from 'maplibre-gl';
// @ts-expect-error: a CSS side-effect import, which Metro bundles on web.
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { perfCount } from '../../lib/perfCount';
import { StyleSheet, View } from 'react-native';
import { CapturePinView, pinLabel } from '../CapturePinView';
import { MarkPinView, markKey, markLabel, type MarkPin } from '../MarkPinView';
import { StripLabel } from '../LandingMarks';
import { namedStars, StarView, starLabel } from '../StarView';
import type { Star } from '../../lib/places';
import type { CapturePin } from '../../lib/pins';
import type { RoadFeature } from '../../lib/streets';
import type { LngLat } from '../../lib/types';
import { useGlideFrames, type GlideFrame } from '../../lib/useGlidingWalker';
import {
  COLORS, coneGeoJSON, DERIVE_ZOOM, FOG_STYLE, HOTSPOT, marksGeoJSON, pocketsGeoJSON, ringGeoJSON, RING_COLOR, stripsGeoJSON, PLACES_ZOOM, pressRadiusM, routeGeoJSON, FOG_BOLD, MAP_STYLE_URL, WORLD_VEIL, segmentsGeoJSON, splitTrace, traceGeoJSON, useZoomPins, walkerGeoJSON,
  type CollectedFeatures, type WalkMapHandle, type WalkMapProps,
} from './types';

const VECTOR_SOURCE = 'openmaptiles';
/** Tiles that never arrive must not hang the stop. */
const VIEW_TIMEOUT_MS = 4000;

// Copied into public/ by scripts/copy-maplibre-worker.js on install, and served
// under the site's base path (set by experiments.baseUrl) when it has one.
setWorkerUrl(`${process.env.EXPO_BASE_URL ?? ''}/maplibre-gl-worker.mjs`);

function addOverlay(map: MapLibreMap) {
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
  // The veil goes under the first label layer, so names stay readable.
  const firstSymbol = map.getStyle().layers.find((l: { type: string; id: string }) => l.type === 'symbol')?.id;
  map.addSource('veil', { type: 'geojson', data: WORLD_VEIL });
  map.addLayer({ id: 'veil', type: 'fill', source: 'veil', paint: { 'fill-color': COLORS.veil, 'fill-opacity': 0 } }, firstSymbol);
  // Lines are simplified a little more than the default and keep a smaller tile buffer: less to
  // re-tile on each update (perf, Nov 1; tolerance 0.375 and buffer 128 are maplibre's defaults).
  const lineSource = { type: 'geojson' as const, data: empty, tolerance: 1, buffer: 64 };
  for (const id of ['fog', 'walked', 'route', 'trace-history', 'trace']) map.addSource(id, lineSource);
  for (const id of ['pockets', 'strips', 'cone', 'marks', 'points', 'ring']) map.addSource(id, { type: 'geojson', data: empty });
  const lineLayout = { 'line-cap': 'round', 'line-join': 'round' } as const;
  // Hotspots under the streets: pockets shaded, strips bold, in the one green no other layer uses (L9).
  // Stale areas (an older map or rules) are dimmed until looked at again (L11).
  map.addLayer({ id: 'pockets', type: 'fill', source: 'pockets', paint: { 'fill-color': HOTSPOT, 'fill-opacity': ['case', ['get', 'stale'], 0.06, 0.14] } }, firstSymbol);
  map.addLayer({ id: 'strips', type: 'line', source: 'strips', layout: lineLayout,
    paint: { 'line-color': HOTSPOT, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 17, 10], 'line-opacity': ['case', ['get', 'stale'], 0.4, 0.9] } }, firstSymbol);
  map.addLayer({ id: 'fog', type: 'line', source: 'fog', layout: lineLayout,
    paint: { 'line-color': COLORS.fog, 'line-opacity': FOG_STYLE.opacity,
      'line-width': ['interpolate', ['linear'], ['zoom'], 13, FOG_STYLE.widthMin, 17, FOG_STYLE.widthMax] } }, firstSymbol);
  map.addLayer({ id: 'walked', type: 'line', source: 'walked', layout: lineLayout,
    paint: { 'line-color': COLORS.walked, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 8] } }, firstSymbol);
  // The route under the trace and walker, so where you walked stays on top (N6).
  map.addLayer({ id: 'route-edge', type: 'line', source: 'route', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': 12 } });
  map.addLayer({ id: 'route', type: 'line', source: 'route', layout: lineLayout, paint: { 'line-color': COLORS.route, 'line-width': 8 } });
  // The trace on a white edge, so it reads over fog, walked streets and the base map alike.
  // Two sources, one look: the history (re-sent once per chunk) and the live tail (each publish).
  for (const [id, source] of [['trace-history-edge', 'trace-history'], ['trace-edge', 'trace']])
    map.addLayer({ id, type: 'line', source, layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': 0.9 } });
  for (const [id, source] of [['trace-history-line', 'trace-history'], ['trace', 'trace']])
    map.addLayer({ id, type: 'line', source, layout: lineLayout, paint: { 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth } });
  // The way the walker is going, under the dot; and marked spots (a destination, a pressed spot).
  // The range preview (E21): a soft disc with a firm edge, under the walker.
  map.addLayer({ id: 'ring-fill', type: 'fill', source: 'ring', paint: { 'fill-color': RING_COLOR, 'fill-opacity': 0.12 } });
  map.addLayer({ id: 'ring', type: 'line', source: 'ring', paint: { 'line-color': RING_COLOR, 'line-width': 2.5, 'line-dasharray': [2, 1.5] } });
  map.addLayer({ id: 'cone', type: 'fill', source: 'cone', paint: { 'fill-color': COLORS.walker, 'fill-opacity': 0.25 } });
  map.addLayer({ id: 'marks', type: 'circle', source: 'marks',
    paint: { 'circle-color': '#ffffff', 'circle-radius': 9, 'circle-stroke-color': COLORS.walker, 'circle-stroke-width': 4 } });
  map.addLayer({ id: 'points', type: 'circle', source: 'points',
    paint: {
      'circle-color': COLORS.walker,
      'circle-radius': 7,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    } });
}

/** A second tap within this long makes a double-tap zoom, not a press. */
const DOUBLE_TAP_MS = 300;
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
  if (!readyPromise.current) {
    let resolve!: () => void;
    readyPromise.current = { promise: new Promise<void>((r) => (resolve = r)), resolve };
  }
  const onPress = useRef(props.onPress);
  onPress.current = props.onPress;
  const onLongPress = useRef(props.onLongPress);
  onLongPress.current = props.onLongPress;
  const onUserMove = useRef(props.onUserMove);
  onUserMove.current = props.onUserMove;
  const onCameraChange = useRef(props.onCameraChange);
  onCameraChange.current = props.onCameraChange;
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
  const applyFrame = (f: GlideFrame) => {
    lastFrame.current = f;
    const p = puck.current;
    if (!p) return;
    p.el.style.display = f.walker ? '' : 'none';
    if (!f.walker) return;
    p.marker.setLngLat(f.walker);
    p.cone.style.display = f.heading == null ? 'none' : '';
    if (f.heading != null) p.cone.style.transform = `rotate(${f.heading}deg)`;
    // The camera follows the dot, so they move together; never while a hand is on the map.
    if (followRef.current && !pointerDown.current) mapRef.current?.jumpTo({ center: f.walker });
  };
  useGlideFrames(props.walker, props.walkerHeading, glideOn, applyFrame);
  useEffect(() => {
    followRef.current = props.follow;
  });
  const duration = props.animate === false ? 0 : 600;
  const animateRef = useRef(props.animate !== false);
  useEffect(() => {
    animateRef.current = props.animate !== false;
  });

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: MAP_STYLE_URL,
      center: props.initialCenter ?? [-71.4, 41.82],
      zoom: props.initialZoom ?? 15,
      // Top right on the home, where the sheet never covers it (OSM requires it visible).
      attributionControl: props.attributionTop ? false : { compact: true },
      // iPhone browsers give a tab little GPU memory, and two maps live during a walk:
      // at most 2x the pixels (a 3x canvas is 2.25x the memory), and a small tile cache.
      pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2),
      maxTileCacheZoomLevels: 2,
      fadeDuration: 0,
    });
    mapRef.current = map;
    map.on('load', () => {
      addOverlay(map);
      setReady(true);
      readyPromise.current!.resolve();
    });
    // maplibre fires click for each tap of a double-tap zoom: wait to see
    // whether a second tap follows before treating it as a press.
    let pressTimer: ReturnType<typeof setTimeout> | undefined;
    let heldAt = 0;
    map.on('click', (e: MapMouseEvent) => {
      clearTimeout(pressTimer);
      if (Date.now() - heldAt < 1000) return; // the end of a long press
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
      setView((v) => (v && Math.abs(v.zoom - zoom) < 0.05 && Math.abs(v.lat - lat) < 0.01 ? v : { zoom, lat }));
    };
    // Only gestures carry an originalEvent; camera moves made in code do not.
    // Zooming keeps following, as in Google Maps: only a pan or a turn looks away.
    const moved = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) onUserMove.current?.();
    };
    map.on('dragstart', moved);
    map.on('rotatestart', moved);
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
    if (props.attributionTop) map.addControl(new AttributionControl({ compact: true }), 'top-right');
    map.on('zoomend', track);
    // A pan changes the latitude the merge radius is measured at.
    map.on('moveend', track);
    map.on('load', track);
    return () => {
      clearTimeout(pressTimer);
      clearTimeout(holdTimer);
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

  useEffect(() => { if (ready) setData('fog', segmentsGeoJSON(props.fog)); }, [ready, props.fog]);
  useEffect(() => { if (ready) setData('walked', segmentsGeoJSON(props.walked)); }, [ready, props.walked]);
  const split = useMemo(() => splitTrace(props.trace), [props.trace]);
  const history = useRef(split.history);
  useEffect(() => {
    history.current = split.history;
  });
  useEffect(() => { if (ready) setData('trace-history', traceGeoJSON(history.current)); }, [ready, split.historyKey]);
  useEffect(() => { if (ready) setData('trace', traceGeoJSON(split.tail)); }, [ready, split.tail]);
  useEffect(() => { if (ready) setData('route', routeGeoJSON(props.route)); }, [ready, props.route]);
  useEffect(() => {
    if (!ready) return;
    setData('pockets', pocketsGeoJSON(props.landing));
    setData('strips', stripsGeoJSON(props.landing));
  }, [ready, props.landing]);
  useEffect(() => { if (ready) setData('marks', marksGeoJSON(props.marks)); }, [ready, props.marks]);
  useEffect(() => { if (ready) setData('ring', ringGeoJSON(props.ring)); }, [ready, props.ring]);
  useEffect(() => {
    if (ready) setData('cone', coneGeoJSON(glideOn ? null : props.walker, props.walkerHeading, view?.zoom ?? 16));
  }, [ready, glideOn, props.walker, props.walkerHeading, view]);
  useEffect(() => {
    if (!ready) return;
    for (const id of ['trace', 'trace-history-line']) mapRef.current?.setPaintProperty(id, 'line-opacity', props.traceOpacity ?? 1);
    for (const id of ['trace-edge', 'trace-history-edge']) mapRef.current?.setPaintProperty(id, 'line-opacity', 0.9 * (props.traceOpacity ?? 1));
  }, [ready, props.traceOpacity]);
  useEffect(() => {
    if (ready) setData('points', walkerGeoJSON(glideOn ? null : props.walker));
  }, [ready, glideOn, props.walker]);
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
  const latest = useRef({ pins: new Map<string, CapturePin>(), onPinPress: props.onPinPress });
  useEffect(() => {
    latest.current = { pins: new Map(pins.map((p) => [p.id, p])), onPinPress: props.onPinPress };
  });
  const markers = useRef(new Map<string, { marker: Marker; root: Root; key: string }>());
  const interactive = !!props.onPinPress;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    // Unmounting a root inside React's commit warns; do it just after.
    const drop = (m: { marker: Marker; root: Root }) => {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    };
    const live = new Set<string>();
    for (const pin of pins) {
      live.add(pin.id);
      const key = `${pin.lngLat.join(',')}|${pin.kind}|${pin.captures.length}|${interactive}`;
      const existing = markers.current.get(pin.id);
      if (existing?.key === key) continue;
      if (existing) drop(existing);
      // A 48 px target around the 36 px pin: the touch minimum on phones.
      const el = document.createElement(interactive ? 'button' : 'div');
      el.setAttribute('aria-label', pinLabel(pin, interactive));
      if (interactive) {
        (el as HTMLButtonElement).type = 'button';
        el.style.cssText = 'background:none;border:0;padding:6px;cursor:pointer';
        const id = pin.id;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = latest.current.pins.get(id);
          if (p) latest.current.onPinPress?.(p.captures);
        });
      } else {
        el.setAttribute('role', 'img');
        el.style.cssText = 'padding:6px;pointer-events:none';
      }
      const root = createRoot(el);
      root.render(<CapturePinView pin={pin} />);
      // Anchored at the stem's foot, so the marked point stays visible.
      const marker = new Marker({ element: el, anchor: 'bottom', offset: [0, 6] }).setLngLat(pin.lngLat).addTo(map);
      markers.current.set(pin.id, { marker, root, key });
    }
    for (const [id, m] of markers.current) {
      if (live.has(id)) continue;
      drop(m);
      markers.current.delete(id);
    }
  }, [ready, pins, interactive]);
  useEffect(() => () => {
    for (const m of markers.current.values()) {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    }
    markers.current.clear();
  }, []);
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
  const starMarkers = useRef(new Map<string, { marker: Marker; root: Root; key: string }>());
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
      root.render(<StarView star={star} selected={selected} named={named} />);
      const marker = new Marker({ element: el, anchor: 'center' }).setLngLat(star.at).addTo(map);
      starMarkers.current.set(star.id, { marker, root, key });
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
  const markMarkers = useRef(new Map<string, { marker: Marker; root: Root; key: string }>());
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const drop = (m: { marker: Marker; root: Root }) => {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    };
    const live = new Set<string>();
    for (const pin of props.discoveries ?? []) {
      live.add(pin.id);
      const key = `${pin.at.join(',')}|${markKey(pin)}|${pin.name}|${pin.icon}`;
      const existing = markMarkers.current.get(pin.id);
      if (existing?.key === key) continue;
      if (existing) drop(existing);
      const el = document.createElement('button');
      el.type = 'button';
      el.dataset.testid = 'mark-pin';
      el.setAttribute('aria-label', markLabel(pin));
      el.style.cssText = 'background:none;border:0;padding:4px 6px 0;cursor:pointer';
      const id = pin.id;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        markLatest.current?.(id);
      });
      const root = createRoot(el);
      root.render(<MarkPinView pin={pin as MarkPin} />);
      const marker = new Marker({ element: el, anchor: 'bottom', offset: [0, 6] }).setLngLat(pin.at).addTo(map);
      markMarkers.current.set(pin.id, { marker, root, key });
    }
    for (const [id, m] of markMarkers.current) {
      if (live.has(id)) continue;
      drop(m);
      markMarkers.current.delete(id);
    }
  }, [ready, props.discoveries]);
  useEffect(() => () => {
    for (const m of markMarkers.current.values()) {
      m.marker.remove();
      queueMicrotask(() => m.root.unmount());
    }
    markMarkers.current.clear();
  }, []);
  // Strip and pocket names, as DOM markers like the stars.
  const landingMarkers = useRef<{ marker: Marker; root: Root }[]>([]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const m of landingMarkers.current) {
      m.marker.remove();
      const r = m.root;
      queueMicrotask(() => r.unmount());
    }
    landingMarkers.current = [];
    for (const s of props.landing?.strips ?? []) {
      const el = document.createElement('div');
      el.style.pointerEvents = 'none';
      el.setAttribute('aria-hidden', 'true');
      const root = createRoot(el);
      root.render(<StripLabel name={s.name} />);
      landingMarkers.current.push({ marker: new Marker({ element: el, anchor: 'center' }).setLngLat(s.at).addTo(map), root });
    }
    for (const l of props.landing?.labels ?? []) {
      const el = document.createElement('div');
      el.style.pointerEvents = 'none';
      el.setAttribute('aria-hidden', 'true');
      const root = createRoot(el);
      root.render(<StripLabel name={l.name} />);
      landingMarkers.current.push({ marker: new Marker({ element: el, anchor: 'center' }).setLngLat(l.at).addTo(map), root });
    }
  }, [ready, props.landing]);
  useEffect(() => () => {
    for (const m of landingMarkers.current) {
      m.marker.remove();
      const r = m.root;
      queueMicrotask(() => r.unmount());
    }
    landingMarkers.current = [];
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
    // Under 2 px is no move worth a frame (perf).
    const p = map.project(to);
    const c = map.getCanvas();
    if (Math.hypot(p.x - c.clientWidth / 2, p.y - c.clientHeight / 2) < 2) return;
    perfCount('camera');
    map.jumpTo({ center: to });
  }, [ready, props.follow, glideOn]);
  // A fit is a request made while mounted: a map brought back (the home, after a walk) keeps its view.
  const fitAtMount = useRef(props.fitKey);
  useEffect(() => {
    if (ready && props.fitBounds && props.fitKey !== fitAtMount.current) {
      fitAtMount.current = undefined;
      const [w, s, e, n] = props.fitBounds;
      const padding = props.fitPadding ?? { top: 48, right: 48, bottom: 48, left: 48 };
      mapRef.current?.fitBounds([[w, s], [e, n]], { padding, maxZoom: 17, duration });
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
      mapRef.current?.easeTo({ center: at, padding, duration: animateRef.current ? 400 : 0 });
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
      <div ref={container} style={{ position: 'absolute', inset: 0 }} data-trace-opacity={String(props.traceOpacity ?? 1)} data-ring={props.ring ? String(props.ring.radiusM) : ''} />
      {props.covered && <View style={styles.cover} pointerEvents="none" />}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: COLORS.veil },
});
