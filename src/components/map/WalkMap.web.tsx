import { Map as MapLibreMap, setWorkerUrl, type GeoJSONFeature, type MapMouseEvent } from 'maplibre-gl';
// @ts-expect-error: a CSS side-effect import, which Metro bundles on web.
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RoadFeature } from '../../lib/streets';
import {
  COLORS, DERIVE_ZOOM, MAP_STYLE_URL, WORLD_VEIL, pointColor, pointsGeoJSON, segmentsGeoJSON,
  traceGeoJSON, viewCenters, type CollectedFeatures, type WalkMapHandle, type WalkMapProps,
} from './types';

const VECTOR_SOURCE = 'openmaptiles';

// Copied into public/ by scripts/copy-maplibre-worker.js on install.
setWorkerUrl('/maplibre-gl-worker.mjs');

function addOverlay(map: MapLibreMap) {
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
  // The veil goes under the first label layer, so names stay readable.
  const firstSymbol = map.getStyle().layers.find((l: { type: string; id: string }) => l.type === 'symbol')?.id;
  map.addSource('veil', { type: 'geojson', data: WORLD_VEIL });
  map.addLayer({ id: 'veil', type: 'fill', source: 'veil', paint: { 'fill-color': COLORS.veil, 'fill-opacity': 0 } }, firstSymbol);
  for (const id of ['fog', 'walked', 'trace', 'points']) map.addSource(id, { type: 'geojson', data: empty });
  const lineLayout = { 'line-cap': 'round', 'line-join': 'round' } as const;
  map.addLayer({ id: 'fog', type: 'line', source: 'fog', layout: lineLayout,
    paint: { 'line-color': COLORS.fog, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 1.5, 17, 5], 'line-opacity': 0.55 } }, firstSymbol);
  map.addLayer({ id: 'walked', type: 'line', source: 'walked', layout: lineLayout,
    paint: { 'line-color': COLORS.walked, 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 2.5, 17, 8] } }, firstSymbol);
  map.addLayer({ id: 'trace', type: 'line', source: 'trace', layout: lineLayout,
    paint: { 'line-color': COLORS.trace, 'line-width': 2.5, 'line-opacity': 0.85 } });
  map.addLayer({ id: 'points', type: 'circle', source: 'points',
    paint: {
      'circle-color': pointColor as never,
      'circle-radius': ['match', ['get', 'kind'], 'walker', 7, 6],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    } });
}

function toRoadFeature(f: GeoJSONFeature): RoadFeature {
  return { geometry: f.geometry as RoadFeature['geometry'], properties: f.properties };
}

const idle = (map: MapLibreMap) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 4000); // tiles that never arrive must not hang the stop
    map.once('idle', () => {
      clearTimeout(timer);
      resolve();
    });
  });

export const WalkMap = forwardRef<WalkMapHandle, WalkMapProps>(function WalkMap(props, ref) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const onPress = useRef(props.onPress);
  onPress.current = props.onPress;

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
    });
    map.on('click', (e: MapMouseEvent) => onPress.current?.([e.lngLat.lng, e.lngLat.lat]));
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
    if (ready) setData('points', pointsGeoJSON(props.captures, props.walker));
  }, [ready, props.captures, props.walker]);
  useEffect(() => {
    if (ready) mapRef.current?.setPaintProperty('veil', 'fill-opacity', props.veil ? 0.45 : 0);
  }, [ready, props.veil]);
  useEffect(() => {
    if (ready && props.follow) mapRef.current?.jumpTo({ center: props.follow });
  }, [ready, props.follow]);
  useEffect(() => {
    if (ready && props.fitBounds) {
      const [w, s, e, n] = props.fitBounds;
      mapRef.current?.fitBounds([[w, s], [e, n]], { padding: 48, maxZoom: 17, duration: 600 });
    }
  }, [ready, props.fitBounds]);

  useImperativeHandle(ref, () => ({
    async collect(bounds): Promise<CollectedFeatures> {
      const map = mapRef.current;
      const out: CollectedFeatures = { roads: [], names: [], places: [] };
      if (!map) return out;
      const before = { center: map.getCenter(), zoom: map.getZoom() };
      const canvas = map.getCanvas();
      for (const center of viewCenters(bounds, canvas.clientWidth, canvas.clientHeight)) {
        map.jumpTo({ center, zoom: DERIVE_ZOOM });
        await idle(map);
        const q = (sourceLayer: string) => map.querySourceFeatures(VECTOR_SOURCE, { sourceLayer }).map(toRoadFeature);
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
    </View>
  );
});

const styles = StyleSheet.create({ wrap: { flex: 1, overflow: 'hidden' } });
