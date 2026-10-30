import {
  Camera, GeoJSONSource, Layer, Map, type CameraRef, type MapRef,
} from '@maplibre/maplibre-react-native';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { RoadFeature } from '../../lib/streets';
import {
  COLORS, DERIVE_ZOOM, MAP_STYLE_URL, WORLD_VEIL, pointColor, pointsGeoJSON, segmentsGeoJSON,
  traceGeoJSON, viewCenters, type CollectedFeatures, type WalkMapHandle, type WalkMapProps,
} from './types';

// Rendered features carry no source-layer name on native, so they are sorted
// by shape and properties instead.
const ROAD_CLASSES = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'track', 'path',
  'raceway', 'busway', 'bus_guideway', 'rail', 'transit', 'ferry',
]);
const PLACE_CLASSES = new Set(['neighbourhood', 'quarter', 'suburb', 'hamlet', 'village', 'town', 'city']);

export const WalkMap = forwardRef<WalkMapHandle, WalkMapProps>(function WalkMap(props, ref) {
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const rendered = useRef<(() => void) | null>(null);
  const { width, height } = useWindowDimensions();

  const fog = useMemo(() => segmentsGeoJSON(props.fog), [props.fog]);
  const walked = useMemo(() => segmentsGeoJSON(props.walked), [props.walked]);
  const trace = useMemo(() => traceGeoJSON(props.trace), [props.trace]);
  const points = useMemo(() => pointsGeoJSON(props.captures, props.walker), [props.captures, props.walker]);

  useEffect(() => {
    if (props.follow) cameraRef.current?.jumpTo({ center: props.follow });
  }, [props.follow]);
  useEffect(() => {
    if (props.fitBounds) {
      cameraRef.current?.fitBounds(props.fitBounds, {
        padding: { top: 48, right: 48, bottom: 48, left: 48 }, duration: 600,
      });
    }
  }, [props.fitBounds]);

  const settled = () =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 4000);
      rendered.current = () => {
        clearTimeout(timer);
        resolve();
      };
    });

  useImperativeHandle(ref, () => ({
    async collect(bounds): Promise<CollectedFeatures> {
      const out: CollectedFeatures = { roads: [], names: [], places: [] };
      const map = mapRef.current;
      if (!map) return out;
      const before = await map.getViewState();
      for (const center of viewCenters(bounds, width, height)) {
        const wait = settled();
        cameraRef.current?.jumpTo({ center, zoom: DERIVE_ZOOM });
        await wait;
        for (const f of await map.queryRenderedFeatures()) {
          const props = (f.properties ?? {}) as Record<string, unknown>;
          const cls = String(props.class ?? '');
          const feature: RoadFeature = { geometry: f.geometry as RoadFeature['geometry'], properties: props };
          const isLine = f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString';
          if (isLine && ROAD_CLASSES.has(cls)) (props.name ? out.names : out.roads).push(feature);
          else if (f.geometry?.type === 'Point' && PLACE_CLASSES.has(cls)) out.places.push(feature);
        }
      }
      cameraRef.current?.jumpTo({ center: before.center, zoom: before.zoom });
      return out;
    },
  }), [width, height]);

  return (
    <View style={[styles.wrap, props.style]}>
      <Map
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_URL}
        attribution
        logo={false}
        onPress={(e) => props.onPress?.(e.nativeEvent.lngLat)}
        onDidFinishRenderingMapFully={() => rendered.current?.()}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: props.initialCenter ?? [-71.4, 41.82], zoom: props.initialZoom ?? 15 }}
        />
        <GeoJSONSource id="veil" data={WORLD_VEIL}>
          <Layer id="veil" type="fill" paint={{ 'fill-color': COLORS.veil, 'fill-opacity': props.veil ? 0.45 : 0 }} />
        </GeoJSONSource>
        <GeoJSONSource id="fog" data={fog}>
          <Layer id="fog" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': COLORS.fog, 'line-width': 3, 'line-opacity': 0.55 }} />
        </GeoJSONSource>
        <GeoJSONSource id="walked" data={walked}>
          <Layer id="walked" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': COLORS.walked, 'line-width': 5 }} />
        </GeoJSONSource>
        <GeoJSONSource id="trace" data={trace}>
          <Layer id="trace" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': COLORS.trace, 'line-width': 2.5, 'line-opacity': 0.85 }} />
        </GeoJSONSource>
        <GeoJSONSource id="points" data={points}>
          <Layer id="points" type="circle" paint={{
            'circle-color': pointColor as never,
            'circle-radius': ['match', ['get', 'kind'], 'walker', 7, 6],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          }} />
        </GeoJSONSource>
      </Map>
    </View>
  );
});

const styles = StyleSheet.create({ wrap: { flex: 1, overflow: 'hidden' } });
