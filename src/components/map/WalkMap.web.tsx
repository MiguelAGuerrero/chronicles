import { Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONFeature, type MapMouseEvent } from 'maplibre-gl';
// @ts-expect-error: a CSS side-effect import, which Metro bundles on web.
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StyleSheet, View } from 'react-native';
import { CapturePinView, pinLabel } from '../CapturePinView';
import type { CapturePin } from '../../lib/pins';
import type { RoadFeature } from '../../lib/streets';
import {
  COLORS, DERIVE_ZOOM, MAP_STYLE_URL, WORLD_VEIL, segmentsGeoJSON, traceGeoJSON, useZoomPins, walkerGeoJSON,
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
  for (const id of ['fog', 'walked', 'trace', 'points']) map.addSource(id, { type: 'geojson', data: empty });
  const lineLayout = { 'line-cap': 'round', 'line-join': 'round' } as const;
  map.addLayer({ id: 'fog', type: 'line', source: 'fog', layout: lineLayout,
    paint: { 'line-color': COLORS.fog, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.5, 17, 4] } }, firstSymbol);
  map.addLayer({ id: 'walked', type: 'line', source: 'walked', layout: lineLayout,
    paint: { 'line-color': COLORS.walked, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 3, 17, 8] } }, firstSymbol);
  map.addLayer({ id: 'trace', type: 'line', source: 'trace', layout: lineLayout,
    paint: { 'line-color': COLORS.trace, 'line-width': 2.5, 'line-opacity': 0.85 } });
  map.addLayer({ id: 'points', type: 'circle', source: 'points',
    paint: {
      'circle-color': COLORS.walker,
      'circle-radius': 7,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    } });
}

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
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  const duration = props.animate === false ? 0 : 600;

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: MAP_STYLE_URL,
      center: props.initialCenter ?? [-71.4, 41.82],
      zoom: props.initialZoom ?? 15,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.on('load', () => {
      addOverlay(map);
      setReady(true);
      readyPromise.current!.resolve();
    });
    map.on('click', (e: MapMouseEvent) => onPress.current?.([e.lngLat.lng, e.lngLat.lat]));
    const track = () => setView({ zoom: map.getZoom(), lat: map.getCenter().lat });
    map.on('zoomend', track);
    map.on('load', track);
    return () => {
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
  useEffect(() => {
    if (ready) mapRef.current?.setPaintProperty('veil', 'fill-opacity', props.veil ? 0.45 : 0);
  }, [ready, props.veil]);
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
    async collect(centers): Promise<CollectedFeatures> {
      await readyPromise.current!.promise;
      const map = mapRef.current;
      const out: CollectedFeatures = { roads: [], names: [], places: [], complete: true };
      // A style without the street source has nothing to read.
      if (!map || !map.getSource(VECTOR_SOURCE)) return { ...out, complete: false };
      const before = { center: map.getCenter(), zoom: map.getZoom() };
      for (const center of centers) {
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
