import {
  Camera, GeoJSONSource, Layer, Map, Marker, VectorSource, type CameraRef, type MapRef, type VectorSourceRef,
} from '@maplibre/maplibre-react-native';
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { CapturePinView, pinLabel } from '../CapturePinView';
import { MarkPinView, markLabel } from '../MarkPinView';
import { StartHereView, StripLabel } from '../LandingMarks';
import { namedStars, StarView, starLabel } from '../StarView';
import type { RoadFeature } from '../../lib/streets';
import { TILEJSON_URL } from '../../lib/tiles';
import {
  COLORS, coneGeoJSON, DERIVE_ZOOM, FOG_STYLE, HOTSPOT, marksGeoJSON, pocketsGeoJSON, stripsGeoJSON, PLACES_ZOOM, pressRadiusM, routeGeoJSON, FOG_BOLD, MAP_STYLE_URL, WORLD_VEIL, segmentsGeoJSON, splitTrace, traceGeoJSON, useZoomPins, walkerGeoJSON,
  type CollectedFeatures, type WalkMapHandle, type WalkMapProps,
} from './types';

const VIEW_TIMEOUT_MS = 4000;
/** Invisible layers that make the query source load its tiles. */
const HIDDEN = { 'line-opacity': 0 } as const;

export const WalkMap = forwardRef<WalkMapHandle, WalkMapProps>(function WalkMap(props, ref) {
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const queryRef = useRef<VectorSourceRef>(null);
  const [ready, setReady] = useState(false);
  const readyWaiters = useRef<(() => void)[]>([]);
  const regionChanged = useRef<(() => void) | null>(null);
  const rendered = useRef<(() => void) | null>(null);
  const size = useRef({ width: 0, height: 0 });
  const [view, setView] = useState<{ zoom: number; lat: number } | null>(null);
  const lastView = useRef<{ zoom: number; lat: number } | null>(null);
  const names = useMemo(() => namedStars(props.stars ?? []), [props.stars]);
  // Pins grouped for the current zoom, so nearby ones merge instead of piling up.
  const pins = useZoomPins(props.captures, view?.zoom ?? props.initialZoom ?? null, view?.lat ?? null);
  const duration = props.animate === false ? 0 : 600;

  const fog = useMemo(() => segmentsGeoJSON(props.fog), [props.fog]);
  const walked = useMemo(() => segmentsGeoJSON(props.walked), [props.walked]);
  // The history changes once per chunk; only the tail is re-sent with each publish (perf, Nov 1).
  const split = useMemo(() => splitTrace(props.trace), [props.trace]);
  const traceTail = useMemo(() => traceGeoJSON(split.tail), [split.tail]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const traceHistory = useMemo(() => traceGeoJSON(split.history), [split.historyKey]);
  const route = useMemo(() => routeGeoJSON(props.route), [props.route]);
  const pockets = useMemo(() => pocketsGeoJSON(props.landing), [props.landing]);
  const strips = useMemo(() => stripsGeoJSON(props.landing), [props.landing]);
  const marks = useMemo(() => marksGeoJSON(props.marks), [props.marks]);
  const cone = useMemo(() => coneGeoJSON(props.walker, props.walkerHeading, view?.zoom ?? 16), [props.walker, props.walkerHeading, view]);
  const points = useMemo(() => walkerGeoJSON(props.walker), [props.walker]);

  useEffect(() => {
    if (ready && props.follow) cameraRef.current?.jumpTo({ center: props.follow });
  }, [ready, props.follow]);
  // A fit is a request made while mounted: a map brought back (the home, after a walk) keeps its view.
  const fitAtMount = useRef(props.fitKey);
  useEffect(() => {
    if (!ready || !props.fitBounds || props.fitKey === fitAtMount.current) return;
    fitAtMount.current = undefined;
    const pad = props.fitPadding ?? { top: 48, right: 48, bottom: 48, left: 48 };
    cameraRef.current?.fitBounds(props.fitBounds, { padding: pad, duration });
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
    showPoint(at, padding) {
      cameraRef.current?.easeTo({ center: at, padding, duration: props.animate === false ? 0 : 400 });
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
        onRegionDidChange={(e) => {
          regionChanged.current?.();
          const { zoom, center } = e.nativeEvent;
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
        <GeoJSONSource id="veil" data={WORLD_VEIL}>
          <Layer id="veil" type="fill" paint={{ 'fill-color': COLORS.veil, 'fill-opacity': props.veil ? 0.45 : 0 }} />
        </GeoJSONSource>
        {/* Hotspots under the streets, in the one green no other layer uses (L9). */}
        <GeoJSONSource id="pockets" data={pockets}>
          <Layer id="pockets" type="fill" paint={{ 'fill-color': HOTSPOT, 'fill-opacity': ['case', ['get', 'stale'], 0.06, 0.14] }} />
        </GeoJSONSource>
        <GeoJSONSource id="strips" data={strips}>
          <Layer id="strips" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{
            'line-color': HOTSPOT,
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 17, 10],
            'line-opacity': ['case', ['get', 'stale'], 0.4, 0.9],
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
        <GeoJSONSource id="route" data={route}>
          <Layer id="route-edge" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#ffffff', 'line-width': 12 }} />
          <Layer id="route" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': COLORS.route, 'line-width': 8 }} />
        </GeoJSONSource>
        {/* The trace on a white edge, so it reads over fog, walked streets and the base map alike:
            the history (memoized, so it isn't serialized again each render) and the live tail. */}
        <TraceSource id="trace-history" data={traceHistory} opacity={props.traceOpacity ?? 1} />
        <TraceSource id="trace" data={traceTail} opacity={props.traceOpacity ?? 1} />
        <GeoJSONSource id="cone" data={cone}>
          <Layer id="cone" type="fill" paint={{ 'fill-color': COLORS.walker, 'fill-opacity': 0.25 }} />
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
        {/* The Marker's own onPress: on iOS the annotation's tap recognizer
            swallows touches meant for a Pressable inside it. */}
        {pins.map((pin) => (
          <Marker
            key={`${pin.id}:${pin.captures.length}`}
            id={`${pin.id}:${pin.captures.length}`}
            lngLat={pin.lngLat}
            anchor="bottom"
            onPress={props.onPinPress ? () => props.onPinPress?.(pin.captures) : undefined}
          >
            <View
              accessible
              accessibilityRole={props.onPinPress ? 'button' : 'image'}
              accessibilityLabel={pinLabel(pin, !!props.onPinPress)}
              style={styles.pinHit}
            >
              <CapturePinView pin={pin} />
            </View>
          </Marker>
        ))}
        {(props.discoveries ?? []).map((pin) => (
          <Marker
            key={`mark:${pin.id}:${pin.revealed}`}
            id={`mark:${pin.id}:${pin.revealed}`}
            lngLat={pin.at}
            anchor="bottom"
            onPress={props.onDiscoveryPress ? () => props.onDiscoveryPress?.(pin.id) : undefined}
          >
            <View accessible accessibilityRole="button" accessibilityLabel={markLabel(pin)} style={styles.pinHit}>
              <MarkPinView pin={pin} />
            </View>
          </Marker>
        ))}
        {[...(props.landing?.strips ?? []), ...(props.landing?.labels ?? [])].map((s) => (
          <Marker key={`label:${s.name}:${s.at.join(',')}`} id={`label:${s.name}:${s.at.join(',')}`} lngLat={s.at} anchor="center">
            <StripLabel name={s.name} />
          </Marker>
        ))}
        {(props.landing?.pins ?? []).map((p) => (
          <Marker
            key={`start:${p.key}`}
            id={`start:${p.key}`}
            lngLat={p.at}
            anchor="bottom"
            onPress={props.onLandingPinPress ? () => props.onLandingPinPress?.(p.key) : undefined}
          >
            <View accessible accessibilityRole="button" accessibilityLabel={`Start here${p.street ? `, on ${p.street}` : ''}. Open`} style={styles.pinHit}>
              <StartHereView />
            </View>
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
const TraceSource = memo(function TraceSource(props: { id: string; data: GeoJSON.FeatureCollection; opacity: number }) {
  return (
    <GeoJSONSource id={props.id} data={props.data}>
      <Layer id={`${props.id}-edge`} type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': '#ffffff', 'line-width': FOG_STYLE.edgeWidth, 'line-opacity': 0.9 * props.opacity }} />
      <Layer id={`${props.id}-line`} type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': COLORS.trace, 'line-width': FOG_STYLE.traceWidth, 'line-opacity': props.opacity }} />
    </GeoJSONSource>
  );
});
