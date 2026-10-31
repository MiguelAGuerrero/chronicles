import { AttributionControl, Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONFeature, type MapMouseEvent, type MapTouchEvent } from 'maplibre-gl';
// @ts-expect-error: a CSS side-effect import, which Metro bundles on web.
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StyleSheet, View } from 'react-native';
import { CapturePinView, pinLabel } from '../CapturePinView';
import { namedStars, StarView, starLabel } from '../StarView';
import type { Star } from '../../lib/places';
import type { CapturePin } from '../../lib/pins';
import type { RoadFeature } from '../../lib/streets';
import type { LngLat } from '../../lib/types';
import {
  COLORS, coneGeoJSON, DERIVE_ZOOM, marksGeoJSON, PLACES_ZOOM, pressRadiusM, routeGeoJSON, FOG_BOLD, MAP_STYLE_URL, WORLD_VEIL, segmentsGeoJSON, traceGeoJSON, useZoomPins, walkerGeoJSON,
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
  for (const id of ['fog', 'walked', 'route', 'trace', 'cone', 'marks', 'points']) map.addSource(id, { type: 'geojson', data: empty });
  const lineLayout = { 'line-cap': 'round', 'line-join': 'round' } as const;
  map.addLayer({ id: 'fog', type: 'line', source: 'fog', layout: lineLayout,
    paint: { 'line-color': COLORS.fog, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.5, 17, 4] } }, firstSymbol);
  map.addLayer({ id: 'walked', type: 'line', source: 'walked', layout: lineLayout,
    paint: { 'line-color': COLORS.walked, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 8] } }, firstSymbol);
  // The route under the trace and walker, so where you walked stays on top (N6).
  map.addLayer({ id: 'route-edge', type: 'line', source: 'route', layout: lineLayout, paint: { 'line-color': '#ffffff', 'line-width': 12 } });
  map.addLayer({ id: 'route', type: 'line', source: 'route', layout: lineLayout, paint: { 'line-color': COLORS.route, 'line-width': 8 } });
  map.addLayer({ id: 'trace', type: 'line', source: 'trace', layout: lineLayout,
    paint: { 'line-color': COLORS.trace, 'line-width': 2.5, 'line-opacity': 0.85 } });
  // The way the walker is going, under the dot; and marked spots (a destination, a pressed spot).
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

function toRoadFeature(f: GeoJSONFeature): RoadFeature {
  return { geometry: f.geometry as RoadFeature['geometry'], properties: f.properties };
}

/** Whether the street source is loaded; false if the style has no such source. */
const sourceLoaded = (map: MapLibreMap) => {
  try {
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
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
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
    const track = () => setView({ zoom: map.getZoom(), lat: map.getCenter().lat });
    // Only gestures carry an originalEvent; camera moves made in code do not.
    // Zooming keeps following, as in Google Maps: only a pan or a turn looks away.
    const moved = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) onUserMove.current?.();
    };
    map.on('dragstart', moved);
    map.on('rotatestart', moved);
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

  const setData = (id: string, data: GeoJSON.FeatureCollection) =>
    (mapRef.current?.getSource(id) as { setData(d: GeoJSON.FeatureCollection): void } | undefined)?.setData(data);

  useEffect(() => { if (ready) setData('fog', segmentsGeoJSON(props.fog)); }, [ready, props.fog]);
  useEffect(() => { if (ready) setData('walked', segmentsGeoJSON(props.walked)); }, [ready, props.walked]);
  useEffect(() => { if (ready) setData('trace', traceGeoJSON(props.trace)); }, [ready, props.trace]);
  useEffect(() => { if (ready) setData('route', routeGeoJSON(props.route)); }, [ready, props.route]);
  useEffect(() => { if (ready) setData('marks', marksGeoJSON(props.marks)); }, [ready, props.marks]);
  useEffect(() => {
    if (ready) setData('cone', coneGeoJSON(props.walker, props.walkerHeading, view?.zoom ?? 16));
  }, [ready, props.walker, props.walkerHeading, view]);
  useEffect(() => {
    if (ready) mapRef.current?.setPaintProperty('trace', 'line-opacity', 0.85 * (props.traceOpacity ?? 1));
  }, [ready, props.traceOpacity]);
  useEffect(() => {
    if (ready) setData('points', walkerGeoJSON(props.walker));
  }, [ready, props.walker]);

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
  useEffect(() => {
    if (ready) mapRef.current?.setPaintProperty('veil', 'fill-opacity', props.veil ? 0.45 : 0);
  }, [ready, props.veil]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setPaintProperty('fog', 'line-color', props.fogEmphasis ? FOG_BOLD : COLORS.fog);
    map.setPaintProperty('fog', 'line-width', props.fogEmphasis
      ? ['interpolate', ['linear'], ['zoom'], 13, 2.5, 17, 7]
      : ['interpolate', ['linear'], ['zoom'], 13, 1.5, 17, 4]);
    // Over bold fog the usual navy trace would vanish (1.4:1); the accent stands out.
    map.setPaintProperty('trace', 'line-color', props.fogEmphasis ? COLORS.walked : COLORS.trace);
    map.setPaintProperty('trace', 'line-width', props.fogEmphasis ? 4 : 2.5);
  }, [ready, props.fogEmphasis]);
  useEffect(() => {
    if (ready && props.follow) mapRef.current?.jumpTo({ center: props.follow });
  }, [ready, props.follow]);
  useEffect(() => {
    if (ready && props.fitBounds) {
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
      const out: CollectedFeatures = { roads: [], names: [], places: [], complete: true };
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
      const out: CollectedFeatures = { roads: [], names: [], places: [], complete: true };
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
      }
      map.jumpTo(before);
      return out;
    },
  }), []);

  return (
    <View style={[styles.wrap, props.style]}>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      {props.covered && <View style={styles.cover} pointerEvents="none" />}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  cover: { ...StyleSheet.absoluteFill, backgroundColor: COLORS.veil },
});
