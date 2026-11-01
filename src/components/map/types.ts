import type { MarkPin } from '../MarkPinView';
import type { LandingView } from '../../lib/landing/view';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Bounds } from '../../lib/geo';
import type { RoadFeature } from '../../lib/streets';
import { useMemo } from 'react';
import { metersPerPixel, PIN_GROUP_PX, pinsFor, type CapturePin } from '../../lib/pins';
import type { Star } from '../../lib/places';
import type { Capture, LngLat, StreetSegment } from '../../lib/types';

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
/** OpenMapTiles tops out at z14; road detail is only complete from there. */
export const DERIVE_ZOOM = 14;
/** Upper bound on camera stops while collecting roads for one walk. */
export const MAX_DERIVE_VIEWS = 36;

// Lines and dots need 3:1 against the base map (WCAG 1.4.11).
/** Bold fog: unwalked streets near the walker, when asked for. */
export const FOG_BOLD = '#3f4a5a';

/**
 * Hotspots (v1.5): magenta, the one hue no other layer uses (the owner's
 * call, after the trace took green), 3:1 or more on the base map (L9).
 */
export const HOTSPOT = '#d6268c';
export const HOTSPOT_INK = '#86145a';
/** The Start here pin's fill: white text on it reads at AA. */
export const HOTSPOT_PIN = '#a3166a';

/**
 * The fog is quiet unless asked for (the owner's call, Nov 1): after a scan
 * it covers every street around, and the trace must still read over it.
 * The trace is green, wider than the fog, on a white edge.
 */
export const FOG_STYLE = { opacity: 0.5, widthMin: 1, widthMax: 2.5, traceWidth: 4.5, edgeWidth: 7.5 } as const;

export const COLORS = {
  fog: '#8b939e',
  walked: '#c2410c',
  /** Where you walked: green (the owner's call), on a white edge. */
  trace: '#15803d',
  /** A route being navigated: map-navigation blue, with a white edge (N6). */
  route: '#2563eb',
  walker: '#1d3557',
  photo: '#0f766e',
  video: '#b42318',
  voice: '#7b2cbf',
  text: '#a16207',
  veil: '#d7dbe0',
};

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface WalkMapProps {
  /** Trace runs, already split at gaps. */
  trace: LngLat[][];
  /** 0 to 1; the replay's first beat shows the trace faintly. */
  traceOpacity?: number;
  walked: StreetSegment[];
  fog: StreetSegment[];
  /**
   * Captures to pin where they were taken. The map groups them itself, by
   * screen distance at its current zoom, so nearby pins never pile up.
   */
  captures: Capture[];
  /** Called when the person pans, zooms or rotates the map themselves. */
  onUserMove?: () => void;
  /** Opens a pin's captures; without it, pins are shown but not pressable. */
  onPinPress?: (captures: Capture[]) => void;
  /** Places walked, drawn as stars (the home map); the caller picks them for the zoom. */
  stars?: Star[];
  onStarPress?: (star: Star) => void;
  /** Called with the camera once it settles, so a map taken down can come back where it was. */
  onCameraChange?: (camera: { center: LngLat; zoom: number }) => void;
  /** Called with the zoom and latitude once the camera settles, for picking stars. */
  onViewChange?: (view: { zoom: number; lat: number }) => void;
  /** The star drawn as selected (ringed), by id. */
  selectedStar?: string | null;
  /** Puts the map's attribution at the top right, clear of a bottom sheet. */
  attributionTop?: boolean;
  /** A route being navigated, drawn bold under the trace (N6). */
  route?: LngLat[] | null;
  /** Explore's marks, as "?" pins until revealed (E6-E8, E22). */
  discoveries?: MarkPin[];
  onDiscoveryPress?: (id: string) => void;
  /** Remembered hotspots: pockets shaded, strips drawn and named, as information (v1.5). */
  landing?: LandingView | null;
  /** Spots to mark: where a route goes, or where a long press landed. */
  marks?: LngLat[];
  /** The "?" range preview (E21): a ring around a point, drawn only while the setting is open. */
  ring?: { center: LngLat; radiusM: number } | null;
  /** The way the walker is going (degrees from north), drawn as a soft cone; null hides it. */
  walkerHeading?: number | null;
  walker?: LngLat | null;
  /** Glide the dot, cone and camera between fixes (the live walk). Off, the dot is placed as given (the replay's clock). */
  glideWalker?: boolean;
  /** Keeps the camera centered here while set. */
  follow?: LngLat | null;
  /** Fits the camera to these bounds whenever `fitKey` changes. */
  fitBounds?: Bounds | null;
  fitKey?: number;
  /** Space kept clear of the fitted bounds, e.g. for a sheet over the map. */
  fitPadding?: Padding;
  /** The closest a fit may zoom (web; MapLibre RN's fitBounds has no maxZoom). Default 17. */
  fitMaxZoom?: number;
  /** False for reduced motion: camera changes jump instead of animating. */
  animate?: boolean;
  initialCenter?: LngLat;
  initialZoom?: number;
  /** Greys the base map so walked streets stand out. */
  veil?: boolean;
  /** Draws the fog (unwalked streets) bold, to find them at a glance. */
  fogEmphasis?: boolean;
  /** Hides the map behind an opaque cover, e.g. while the camera steps through views. */
  covered?: boolean;
  /** A press on the map, with how far around it counts as "here" at the current zoom. */
  onPress?: (lngLat: LngLat, radiusM: number) => void;
  /** A long press on the map (about half a second), with the same reach as onPress. */
  onLongPress?: (lngLat: LngLat, radiusM: number) => void;
  style?: StyleProp<ViewStyle>;
}

export interface CollectedFeatures {
  roads: RoadFeature[];
  names: RoadFeature[];
  places: RoadFeature[];
  /** Points of interest (the tiles' `poi` layer), for discovery. */
  pois: RoadFeature[];
  /** False when some views timed out before their tiles loaded. */
  complete: boolean;
}

export interface WalkMapHandle {
  /**
   * Moves the camera across these view centers at DERIVE_ZOOM and gathers
   * road and place features. `shouldStop` is checked between views: true
   * ends the read early (Cancel), with what was read so far.
   */
  collect(centers: LngLat[], shouldStop?: () => boolean): Promise<CollectedFeatures>;
  /** The map's size in pixels, for planning views. */
  size(): { width: number; height: number };
  /** Road and place features in the tiles already loaded for the current view; the camera does not move. */
  collectView(): Promise<CollectedFeatures>;
  /**
   * Place points around a spot at PLACES_ZOOM, where town and city points are
   * in reach (they rarely lie in a walk's own z14 tiles). The camera moves
   * there and back; null when the tiles did not load.
   */
  collectPlaces(center: LngLat): Promise<RoadFeature[] | null>;
  /** Moves the camera to a point, keeping the padding clear (a sheet over the map). */
  showPoint(at: LngLat, padding: Padding): void;
}

/** The zoom the wide read of place points happens at: a z10 tile spans about 30 km. */
export const PLACES_ZOOM = 10;

/**
 * Centers of DERIVE_ZOOM views that cover the bounds, for a viewport of the
 * given pixel size. When more than MAX_DERIVE_VIEWS are needed, the views
 * nearest the trace are kept, so a long walk still has its own streets read.
 */
export function planViews(bounds: Bounds, widthPx: number, heightPx: number, trace: LngLat[]): LngLat[] {
  if (!(widthPx > 0) || !(heightPx > 0)) return [];
  const [w, s, e, n] = bounds;
  const lat = (s + n) / 2;
  // Degrees spanned by one 512 px tile at DERIVE_ZOOM, scaled to the viewport.
  const degPerPx = 360 / (512 * 2 ** DERIVE_ZOOM);
  const spanLon = degPerPx * widthPx * 0.9;
  const spanLat = degPerPx * heightPx * 0.9 * Math.cos((lat * Math.PI) / 180);
  const cols = Math.max(1, Math.ceil((e - w) / spanLon));
  const rows = Math.max(1, Math.ceil((n - s) / spanLat));
  const out: LngLat[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push([w + (c + 0.5) * ((e - w) / cols), s + (r + 0.5) * ((n - s) / rows)]);
  if (out.length <= MAX_DERIVE_VIEWS || trace.length === 0) return out.slice(0, MAX_DERIVE_VIEWS);
  const step = Math.max(1, Math.floor(trace.length / 500));
  const near = (c: LngLat) => {
    let best = Infinity;
    for (let i = 0; i < trace.length; i += step) {
      const dx = (trace[i][0] - c[0]) / spanLon;
      const dy = (trace[i][1] - c[1]) / spanLat;
      best = Math.min(best, dx * dx + dy * dy);
    }
    return best;
  };
  return out
    .map((c) => ({ c, d: near(c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_DERIVE_VIEWS)
    .map((x) => x.c);
}

export function segmentsGeoJSON(segments: StreetSegment[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: segments.map((s) => ({
      type: 'Feature',
      properties: { id: s.id },
      geometry: { type: 'MultiLineString', coordinates: s.geometry },
    })),
  };
}

export function traceGeoJSON(runs: LngLat[][]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: runs
      .filter((r) => r.length > 1)
      .map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r } })),
  };
}

/** The live trace's history is re-sent to the map once per this many fixes, not every publish. */
export const TRACE_CHUNK = 100;

/**
 * The trace as a history (finished runs, and the open run up to its last
 * chunk boundary) and a short live tail from there (perf, Nov 1). A map
 * re-tiles a GeoJSON source whole on each update, so only the tail, at most
 * TRACE_CHUNK points, is sent with every publish. `historyKey` changes only
 * when the history does.
 */
export function splitTrace(runs: LngLat[][]): { history: LngLat[][]; tail: LngLat[][]; historyKey: string } {
  if (!runs.length) return { history: [], tail: [], historyKey: '0' };
  const open = runs[runs.length - 1];
  const done = runs.slice(0, -1);
  const cut = Math.floor((open.length - 1) / TRACE_CHUNK) * TRACE_CHUNK;
  const history = cut > 0 ? [...done, open.slice(0, cut + 1)] : done;
  const tail = [open.slice(cut)];
  return { history, tail, historyKey: `${runs.length}:${cut}:${done.reduce((n, r) => n + r.length, 0)}` };
}

export function walkerGeoJSON(walker?: LngLat | null): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: walker ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: walker } }] : [],
  };
}

export const WORLD_VEIL: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]] },
  }],
};

/**
 * Pins for the map's current zoom. The zoom is rounded to half levels, so
 * pins regroup when the view zooms, not on every camera move.
 */
export function useZoomPins(captures: Capture[], zoom: number | null, lat: number | null): CapturePin[] {
  const z = zoom == null ? 16 : Math.round(zoom * 2) / 2;
  const at = lat ?? captures.find((c) => c.lat != null)?.lat ?? 0;
  const latBucket = Math.round(at);
  return useMemo(
    () => pinsFor(captures, PIN_GROUP_PX * metersPerPixel(z, latBucket)),
    [captures, z, latBucket],
  );
}

/** A press reaches 44 px around it, the same as pin grouping, in meters at this zoom (15 to 150 m). */
export function pressRadiusM(zoom: number, lat: number): number {
  const mPerPx = (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
  return Math.max(15, Math.min(150, 44 * mPerPx));
}

/** A navigated route as one line, or nothing. */
export function routeGeoJSON(route: LngLat[] | null | undefined): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: route && route.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } }] : [],
  };
}

export function pocketsGeoJSON(v: LandingView | null | undefined): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (v?.pockets ?? []).filter((p) => p.hull.length >= 3).map((p) => ({
      type: 'Feature', properties: { stale: p.stale }, geometry: { type: 'Polygon', coordinates: [[...p.hull, p.hull[0]]] },
    })),
  };
}
export function stripsGeoJSON(v: LandingView | null | undefined): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (v?.strips ?? []).map((s) => ({ type: 'Feature', properties: { stale: s.stale }, geometry: { type: 'MultiLineString', coordinates: s.lines } })),
  };
}

/** The range preview's ring (E21), as a 64-sided polygon. */
export function ringGeoJSON(ring: { center: LngLat; radiusM: number } | null | undefined): GeoJSON.FeatureCollection {
  if (!ring) return { type: 'FeatureCollection', features: [] };
  const [lon, lat] = ring.center;
  const dLat = ring.radiusM / 111320;
  const dLon = ring.radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  const coords: LngLat[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    coords.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } }] };
}

/** The ring's colour: the walker's blue, so it reads as "around you". */
export const RING_COLOR = '#1a73e8';

/** Points to mark (a destination, a pressed spot), as circles. */
export function marksGeoJSON(marks: LngLat[] | undefined): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (marks ?? []).map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p } })),
  };
}

/** The heading cone's size on screen, and its spread. */
export const CONE_PX = 40;
const CONE_DEG = 60;

/** A 60° sector ahead of the walker, CONE_PX long at this zoom; empty without a heading. */
export function coneGeoJSON(at: LngLat | null | undefined, heading: number | null | undefined, zoom: number): GeoJSON.FeatureCollection {
  if (!at || heading == null) return { type: 'FeatureCollection', features: [] };
  const r = metersPerPixel(zoom, at[1]) * CONE_PX;
  const ring: LngLat[] = [at];
  for (let k = 0; k <= 8; k++) {
    const deg = ((heading - CONE_DEG / 2 + (CONE_DEG * k) / 8) * Math.PI) / 180;
    const dx = Math.sin(deg) * r;
    const dy = Math.cos(deg) * r;
    ring.push([at[0] + dx / (111_320 * Math.cos((at[1] * Math.PI) / 180)), at[1] + dy / 110_540]);
  }
  ring.push(at);
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }] };
}
