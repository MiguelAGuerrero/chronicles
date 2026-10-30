import type { StyleProp, ViewStyle } from 'react-native';
import type { Bounds } from '../../lib/geo';
import type { RoadFeature } from '../../lib/streets';
import type { CaptureKind, LngLat, StreetSegment } from '../../lib/types';

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
/** OpenMapTiles tops out at z14; road detail is only complete from there. */
export const DERIVE_ZOOM = 14;
/** Upper bound on camera stops while collecting roads for one walk. */
export const MAX_DERIVE_VIEWS = 36;

export const COLORS = {
  fog: '#9aa3ad',
  walked: '#ff6a2b',
  trace: '#1d3557',
  walker: '#1d3557',
  photo: '#2a9d8f',
  voice: '#7b2cbf',
  text: '#e9a23b',
  veil: '#d7dbe0',
};

export interface MapCapture {
  id: string;
  lngLat: LngLat;
  kind: CaptureKind;
}

export interface WalkMapProps {
  /** Trace runs, already split at gaps. */
  trace: LngLat[][];
  walked: StreetSegment[];
  fog: StreetSegment[];
  captures: MapCapture[];
  walker?: LngLat | null;
  /** Keeps the camera centered here while set. */
  follow?: LngLat | null;
  /** Fits the camera to these bounds whenever the value changes. */
  fitBounds?: Bounds | null;
  initialCenter?: LngLat;
  initialZoom?: number;
  /** Greys the base map so walked streets stand out. */
  veil?: boolean;
  onPress?: (lngLat: LngLat) => void;
  style?: StyleProp<ViewStyle>;
}

export interface CollectedFeatures {
  roads: RoadFeature[];
  names: RoadFeature[];
  places: RoadFeature[];
}

export interface WalkMapHandle {
  /** Moves the camera across the bounds at DERIVE_ZOOM and gathers road and place features. */
  collect(bounds: Bounds): Promise<CollectedFeatures>;
}

/** Centers of DERIVE_ZOOM views that tile the bounds, for a viewport of the given pixel size. */
export function viewCenters(bounds: Bounds, widthPx: number, heightPx: number): LngLat[] {
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
  return out.slice(0, MAX_DERIVE_VIEWS);
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

export function pointsGeoJSON(captures: MapCapture[], walker?: LngLat | null): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = captures.map((c) => ({
    type: 'Feature',
    properties: { kind: c.kind },
    geometry: { type: 'Point', coordinates: c.lngLat },
  }));
  if (walker) {
    features.push({ type: 'Feature', properties: { kind: 'walker' }, geometry: { type: 'Point', coordinates: walker } });
  }
  return { type: 'FeatureCollection', features };
}

export const WORLD_VEIL: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]] },
  }],
};

export const pointColor = [
  'match', ['get', 'kind'],
  'photo', COLORS.photo,
  'voice', COLORS.voice,
  'text', COLORS.text,
  COLORS.walker,
] as const;
