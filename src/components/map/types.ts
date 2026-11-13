import type { Faced } from '../../lib/moment';
import type { BorderView } from '../../lib/areas/borders';
import type { WalkTint } from '../../lib/walk/tint';
import type { DotSource } from '../../lib/liveDot';
import type { MarkPin } from '../MarkPinView';
import type { AreaPointPin } from '../AreaPoint';
import type { ComplexMap } from '../../lib/complexes/mapLayer';
import type { LandingView } from '../../lib/landing/view';
import { busyNames } from '../../lib/landing/names';
import { distanceM } from '../../lib/geo';
import type { StyleProp, ViewStyle } from 'react-native';
import type { Bounds } from '../../lib/geo';
import type { RoadFeature } from '../../lib/streets';
import { useMemo } from 'react';
import { metersPerPixel, PIN_GROUP_PX, pinsFor, type CapturePin, type WalkClock } from '../../lib/pins';
import type { Star } from '../../lib/places';
import type { LngLat, StreetSegment } from '../../lib/types';
import type { CircleLayerSpecification } from 'maplibre-gl';

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

/**
 * Where the web map's worker is served from (`scripts/copy-maplibre-worker.js` copies it into `public/`), under the
 * site's base path, with maplibre-gl's version as maplibre's own default address carries it: a browser that cached
 * the worker of an older maplibre-gl fetches the new one with the new bundle (tend map 10).
 */
export function mapWorkerUrl(base: string, version: string): string {
  return `${base}/maplibre-gl-worker.mjs?v=${encodeURIComponent(version)}`;
}
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
/** AD16: busy streets are measured with Overture's places too, so the map's credits name it. */
export const OVERTURE_CREDIT = 'Places: Overture Maps Foundation';

export const HOTSPOT = '#d6268c';
export const HOTSPOT_INK = '#86145a';

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
  /** Rides (a trolley, a bus), drawn dashed in the trace's green, under it (rides, R5). */
  rides?: LngLat[][];
  /** Stretches offered across gaps, drawn faint in the trace's green until kept (Filling gaps, G6). */
  faint?: LngLat[][];
  /** Gaps with no line across them, each joined by a dotted grey line between its ends (GW2). */
  gapLinks?: LngLat[][];
  /** A gap's way being drawn, dashed in the trace's green over everything (GW3). */
  drawing?: LngLat[] | null;
  /** 0 to 1; the replay's first beat shows the trace faintly. */
  traceOpacity?: number;
  /**
   * The walk has ended: its last point gets an end marker (QL2). A live walk's end is its dot. Given the walk's
   * whole runs, the markers sit at their ends however much of `trace` is drawn (a replay telling its path, tend replay 2).
   */
  ended?: boolean | LngLat[][];
  /** Where the scale bar sits, from the map's bottom-left corner, clear of the screen's own bottom UI (QL8). */
  scaleInset?: { bottom: number; left?: number };
  /**
   * Navigate and Explore (T17, decision 0154): with no fix (`walker`) and nothing drawn in view, no scale bar over a
   * blank world. Other maps always draw their bar.
   */
  hideScaleOnBlank?: boolean;
  walked: StreetSegment[];
  fog: StreetSegment[];
  /**
   * Captures to pin where they were taken. The map groups them itself, by
   * screen distance at its current zoom, so nearby pins never pile up.
   */
  captures: Faced[];
  /** Called when the person pans, zooms or rotates the map themselves. */
  onUserMove?: () => void;
  /**
   * The map's bearing in degrees from north, when it changes by more than half a degree (CP2). Only a map given this
   * turns under two fingers: the screens with a compass (CP1, decision 0082); the replay, a day, Chronicle and the
   * planner stay north-up, as they have no way back to it (tend map 1).
   */
  onBearingChange?: (bearing: number) => void;
  /**
   * The walks of the pins' moments, with their pauses, so a pin of several says how far into its walk it was (tend map
   * T14): "A photo and a note, twelve minutes in". Without its walk's clock, a pin says its kinds alone.
   */
  clocks?: readonly WalkClock[];
  /** Opens a pin's captures; without it, pins are shown but not pressable. */
  onPinPress?: (captures: Faced[]) => void;
  /** Captures from earlier walks nearby, drawn as faint pins (Memories on revisit, MR1-MR3). */
  memories?: Faced[];
  /** A memory pin was tapped, with its group's captures and where it sits. */
  onMemoryPress?: (captures: Faced[], at: LngLat) => void;
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
  /** The other routes of a preview, drawn faint under the route (scenic routes, SR2). */
  alternates?: LngLat[][] | null;
  /** The walk planner's highlighted route cut into runs of one grade (0 to 3), drawn as a band under the route, wider where the kind is denser (WP16). */
  routeGrades?: { path: LngLat[]; grade: number }[] | null;
  /** Places already found, as small pins on the walk planner's map (WP16); never a place not yet found. */
  foundPins?: LngLat[] | null;
  /** Explore's marks, as "?" pins until revealed (E6-E8, E22). */
  discoveries?: MarkPin[];
  onDiscoveryPress?: (id: string) => void;
  /** Explore's places still to find where a "?" would crowd (WT12, WT14): small dots in the kind's colour, no name. */
  waitingDots?: WaitingDot[];
  /** Remembered hotspots: pockets shaded, strips drawn and named, as information (v1.5). */
  landing?: LandingView | null;
  /**
   * DC16: the busy names go over every layer, placed before the base map's labels (Explore); otherwise under the base map's
   * labels and so under the trace and the route (the walk screen, Navigate).
   */
  busyNamesOver?: boolean;
  /** The camera started (true) or settled (false), once each, never per frame: Explore's read waits for a settle (DC9). */
  onMoveState?: (moving: boolean) => void;
  /** DC14: the selected area's name, whose room on the map no busy name takes (Explore). */
  busyNamesReserve?: { name: string; at: LngLat } | null;
  /** DC18: the walk maps name busy streets only near you (`namesNearYou`); Explore passes none (EC7 has its own limit). */
  busyNamesNear?: { at: LngLat; m: number } | null;
  /** audit 11: the test ids of the screen's controls over the map, whose room no busy name takes (web). */
  busyNamesClearOf?: readonly string[];
  /**
   * SS5 (web): bumped by Explore as a switch's camera move begins: the busy names leave at once and the destination's are
   * sent once, when that move settles. Any other move (a drag, a zoom, a follow camera) clears nothing (SS10).
   */
  busyNamesSwitch?: number;
  /** Spots to mark: where a route goes, or where a long press landed. */
  marks?: LngLat[];
  /** Explore's areas: quiet dots, the selected one named (atlas round 3, fix pins-selected-only). */
  areaPoints?: AreaPointPin[];
  /** The selected area's complexes (CX9): quiet outlines with no fill, and their names at close zoom; null or absent draws none. */
  complexes?: ComplexMap | null;
  /** The "?" range preview (E21): a ring around a point, drawn only while the setting is open. */
  ring?: { center: LngLat; radiusM: number } | null;
  /** A selected neighborhood's own ground, drawn as one line (HB9): the same for every neighborhood, never a fill or a figure (HB10, HB14). */
  ground?: { polygons: LngLat[][][] } | null;
  /** Town borders to draw (TB1-TB5), under the streets; null or absent draws none. */
  borders?: BorderView | null;
  /** The Walkability layer (UF9): areas easy on foot tinted green and built around cars warm, under the trace and fog; null or absent draws none. */
  walkability?: WalkTint | null;
  /** The way the walker is going (degrees from north), drawn as a soft cone; null hides it. */
  walkerHeading?: number | null;
  walker?: LngLat | null;
  /** The live dot, fix by fix (the live walk): the glide follows it, and the trace's end joins it. */
  walkerSource?: DotSource | null;
  /** Glide the dot, cone and camera between fixes (the live walk). Off, the dot is placed as given (the replay's clock). */
  glideWalker?: boolean;
  /** Keeps the camera centered here while set. */
  follow?: LngLat | null;
  /** While following, holds the camera at this zoom: the replay's walking zoom and its pull-back (RR3). Rounded to 0.01. */
  followZoom?: number | null;
  /** Fits the camera to these bounds whenever `fitKey` changes. */
  fitBounds?: Bounds | null;
  fitKey?: number;
  /** Called with a fit's key once its camera move has ended, so a map taken down mid-move can redo it. */
  onFitSettled?: (fitKey: number) => void;
  /**
   * Web: the map's credits were opened or closed by a tap on their (i), so an overlay that would lie over them can step
   * aside (tend map audit 1). Native's MapLibre attribution reports nothing.
   */
  onCreditsOpen?: (open: boolean) => void;
  /** Space kept clear of the fitted bounds, e.g. for a sheet over the map. */
  fitPadding?: Padding;
  /** The closest a fit may zoom. Default 17. Web passes it to fitBounds; native widens the bounds (capFitBounds). */
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
  /**
   * Explore's discrete navigation (DN1-DN13): when set, one finger (or the mouse) never pans the
   * map; a finished drag is reported as a swipe instead, in screen pixels, with the map's middle.
   * On web the arrow keys report swipes too. Pinch, wheel, double tap, the turn and the long press stay.
   */
  onSwipe?: (swipe: { dx: number; dy: number; vx: number; vy: number; center: LngLat; mpp: number }) => void;
  /**
   * Free look (FL3): with `onSwipe` set, true frees one finger (or the mouse) to pan the map, as any other
   * map does, and the arrow keys pan it; a drag is no swipe while it is on. Changes at runtime.
   */
  freePan?: boolean;
  style?: StyleProp<ViewStyle>;
}

export interface CollectedFeatures {
  roads: RoadFeature[];
  names: RoadFeature[];
  places: RoadFeature[];
  /** Points of interest (the tiles' `poi` layer), for discovery. */
  pois: RoadFeature[];
  /**
   * The tiles' `landcover` polygons, for a scenic route's green (SR15). Only the in-code decoder
   * reads them; the map's own reads leave it out.
   */
  landcover?: RoadFeature[];
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
  /** Eases the bearing back to north, keeping the centre and zoom (CP4). */
  resetNorth(): void;
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

/**
 * An offered stretch's opacity (Filling gaps, G6): the trace's green and edge,
 * see-through, so it reads as the trace but not yet walked (the owner's call,
 * Nov 3: "transparent to indicate inferred"). Kept, it is the trace itself.
 */
export const FAINT_OPACITY = 0.4;

/** A gap with no line: grey dots, quiet like the fog (GW2). */
export const GAP_LINK_DASH = [0.1, 2.2];
/** A way being drawn: short dashes, so it reads as not kept yet (GW3). */
export const DRAWING_DASH = [1, 1];

/** A ride's dash, in line widths: long enough to read as a line, gapped enough to read as not walked. */
export const RIDE_DASH = [1.6, 1.4];

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
export function useZoomPins(captures: Faced[], zoom: number | null, lat: number | null): CapturePin[] {
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

/** The planner's graded runs as lines, each carrying its band's width (WP16). */
export function routeGradesGeoJSON(pieces: { path: LngLat[]; grade: number }[] | null | undefined): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (pieces ?? []).filter((p) => p.path.length > 1 && p.grade > 0).map((p) => ({ type: 'Feature', properties: { grade: p.grade, width: 8 + 7 * p.grade }, geometry: { type: 'LineString', coordinates: p.path } })),
  };
}

/** The planner's found-place pins as points (WP16). */
export function pinsGeoJSON(pins: LngLat[] | null | undefined): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: (pins ?? []).map((c) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: c } })) };
}

/** A preview's other routes as faint lines (SR2). */
export function alternatesGeoJSON(lines: LngLat[][] | null | undefined): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (lines ?? []).filter((l) => l.length > 1).map((l) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: l } })),
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
/**
 * How each grade of a busy street draws (AD12): wider and stronger as the grade rises, in the one magenta.
 * `width` scales the line's width at every zoom; a stale area's lines are drawn at `staleOpacity` of these.
 */
export const HOTSPOT_GRADES = {
  // Every grade keeps 3:1 on the base map and on a road (L9, activity-density audit 14): width does most of the grading.
  1: { width: 0.45, opacity: 0.75 },
  2: { width: 0.75, opacity: 0.88 },
  3: { width: 1, opacity: 1 },
  staleOpacity: 0.45,
} as const;

/** The graded stretches (AD12), faint first so strong draws on top; each carries its grade, width and opacity. */
export function stripsGeoJSON(v: LandingView | null | undefined): GeoJSON.FeatureCollection {
  const graded = [...(v?.graded ?? [])].sort((a, b) => a.grade - b.grade);
  return {
    type: 'FeatureCollection',
    features: graded.map((g) => {
      const look = HOTSPOT_GRADES[g.grade];
      const opacity = g.stale ? look.opacity * HOTSPOT_GRADES.staleOpacity : look.opacity;
      return { type: 'Feature', properties: { grade: g.grade, stale: g.stale, width: look.width, opacity }, geometry: { type: 'MultiLineString', coordinates: g.lines } };
    }),
  };
}

/**
 * The busy names' font (DC1): one the base style's glyphs serve (Positron's, from `MAP_STYLE_URL`'s host). If OpenFreeMap
 * renames it, the names stop drawing with a console error; `map/busyNames.test.ts` reads it from a copy of the style.
 */
export const BUSY_NAME_FONT = ['Noto Sans Bold'];
/**
 * The base style's first label layer (Positron's): on native, busy names go under it off Explore (DC16). The web finds the
 * first symbol layer itself; native can't read the style, so it names it (held by `map/busyNames.test.ts`).
 */
export const BASE_FIRST_LABEL = 'waterway_line_label';

/**
 * A stale area's names (DC6, explore-dense-city ui 1): a greyer ink at full opacity, 5.4:1 on the halo and 4.5:1 on the
 * bare base map. Dimming the text would dim its halo too, under 3:1.
 */
export const BUSY_NAME_STALE_INK = '#7d6274';
/**
 * The names' turn on a map turned to `bearing` (explore-dense-city ui 3): a name is map-aligned, so on screen it turns by
 * its rotation less the bearing; this folds that into [-95, 85), the same rule as `alongAngle`, so no name is ever upside
 * down. Only ever half a turn off `angle`, so it still runs along its street. Set again as the map turns.
 */
export function busyNameRotate(bearing: number): unknown[] {
  const b = Math.round(bearing * 10) / 10;
  return ['+', ['-', ['%', ['+', ['-', ['get', 'angle'], b], 455], 180], 95], b];
}

/**
 * A "?" pin's room (DC17): one wide letter at this size and padding covers the pin's drawn box (48 px wide, 42 above its
 * point, 6 below, `MarkPinView` on the web marker), standing on the point as the pin does.
 */
const PIN_ROOM_TEXT = 'W';
const PIN_ROOM = { size: 40, offsetEm: 0.15, padding: 5 };

/** DC18: on the walk screen and Navigate, busy names only within this of you (Explore's ring, `ATLAS_RULES.ringM`). */
export const BUSY_NAMES_NEAR_M = 800;
export const namesNearYou = (at: LngLat | null | undefined): { at: LngLat; m: number } | null => (at ? { at, m: BUSY_NAMES_NEAR_M } : null);

/** Where the busy names and the busy lines sit among the layers on native (explore-dense-city DC16, audit 6). */
export function busyLayerOrder(over: boolean): { lines: string | undefined; names: string | undefined } {
  // The lines under the base labels, as the web puts them under its first symbol layer; the names over the lines, and on
  // Explore over everything. Native adds layers in their order, so the names, added after the lines, sit above them.
  return { lines: BASE_FIRST_LABEL, names: over ? undefined : BASE_FIRST_LABEL };
}

/**
 * Room points covering a screen rectangle, for a control or the map's edge the names keep clear of (audit 11): a grid at
 * most `ROOM_CELL_PX` apart, edges included, each the centre of a room box about that wide.
 */
export const ROOM_CELL_PX = 40;
export function roomCells(rect: { x: number; y: number; w: number; h: number }): [number, number][] {
  const nx = Math.max(1, Math.ceil(rect.w / ROOM_CELL_PX));
  const ny = Math.max(1, Math.ceil(rect.h / ROOM_CELL_PX));
  const out: [number, number][] = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) out.push([rect.x + (rect.w * i) / nx, rect.y + (rect.h * j) / ny]);
  return out;
}

/** The busy names' size, the same for every name whatever its street's grade (DC4). */
const BUSY_NAME_SIZE = 13;
/** A name turned less than this runs level enough to slide along its street (audit 1). */
const LEVEL_DEG = 15;
/** How far a name slides along its street off a point it can't sit on (DC17): 34 px at 13 px, past a pin's half width. */
const BUSY_NAME_SLIDE_EM = 2.6;
/** The selected area's name on the map (AreaPointView: 11 px bold under a 14 px dot, 140 px wide), as the room it reserves (DC14). */
const AREA_NAME_ROOM = { size: 12, offsetEm: 0.85, widthEm: 11.5 };

/**
 * The busy names' layer (DC1-DC6, DC14): one name per street at its busiest point, turned along the street there (it turns
 * with the map), or a pocket's name level at its centre. Names collide with each other and with the base map's labels
 * (never overlap, never ignore placement), are placed in their `sort` order, and look the same whatever the grade: only a
 * stale area's names change, to a greyer ink. A long name wraps at its width; nothing cuts it.
 */
export function busyNameLayers() {
  const box = ['get', 'box'];
  const cell = ['get', 'cell'];
  const paint = { 'text-color': ['case', ['get', 'stale'], BUSY_NAME_STALE_INK, HOTSPOT_INK], 'text-halo-color': '#ffffff', 'text-halo-width': 1.5, 'text-opacity': ['get', 'opacity'] } as Record<string, unknown>;
  const text = {
    'symbol-placement': 'point',
    'text-field': ['get', 'name'],
    'text-font': BUSY_NAME_FONT,
    'text-ignore-placement': false,
    'symbol-sort-key': ['get', 'sort'],
  };
  const name = {
    ...text,
    'text-size': BUSY_NAME_SIZE,
    'text-allow-overlap': false,
    'text-padding': 4,
    'text-rotate': busyNameRotate(0),
    'text-rotation-alignment': 'map',
    'text-max-width': 9,
  };
  const levelTurn = ['<=', ['abs', ['get', 'angle']], LEVEL_DEG];
  return {
    /** From zoom 13 on every map (EC7 for Explore, DC18 for the walk maps). */
    minzoom: 13,
    /**
     * A near-level name (DC17): centred on its point if there is room, else starting or ending beside it, clear of a pin
     * there (24 px each side of its point). maplibre shifts a variable anchor across the screen, never along `text-rotate`,
     * so only a name that runs level may slide (audit 1): it slides along its street.
     */
    layout: {
      ...name,
      'text-variable-anchor': ['center', 'left', 'right'],
      'text-radial-offset': BUSY_NAME_SLIDE_EM,
    } as Record<string, unknown>,
    paint,
    filter: ['all', ['!', ['get', 'reserve']], levelTurn] as unknown[],
    /** A turned name (a street that isn't level): centred on its street or left out, never slid across it (audit 1). */
    turned: {
      layout: { ...name, 'text-anchor': 'center' } as Record<string, unknown>,
      paint,
      filter: ['all', ['!', ['get', 'reserve']], ['!', levelTurn]] as unknown[],
    },
    /**
     * The room kept for what the map draws over itself (DC14, DC17, audit 11): the selected area's name under its dot,
     * each "?" pin, Explore's controls and the map's edge. Invisible, always placed (two pins side by side both keep
     * theirs), and no name is placed over it.
     */
    room: {
      layout: {
        ...text,
        'text-allow-overlap': true,
        'text-size': ['case', box, PIN_ROOM.size, AREA_NAME_ROOM.size],
        // One padding for every kind (it can't follow a feature): the boxes are sized by their letter.
        'text-padding': PIN_ROOM.padding,
        'text-max-width': AREA_NAME_ROOM.widthEm,
        // The area's name sits under its dot, as AreaPointView draws it; a pin stands on its point; a cell is centred.
        'text-anchor': ['case', cell, 'center', box, 'bottom', 'top'],
        'text-offset': ['case', cell, ['literal', [0, 0]], box, ['literal', [0, PIN_ROOM.offsetEm]], ['literal', [0, AREA_NAME_ROOM.offsetEm]]],
      } as Record<string, unknown>,
      paint: { 'text-opacity': 0 } as Record<string, unknown>,
      filter: ['get', 'reserve'] as unknown[],
    },
  };
}

/**
 * The busy names as map points (DC1, DC4): each with its `sort` (the view's order: heavier first), its turn and whether
 * it is stale (a greyer ink, DC6). The selected area's name, when given, is drawn at opacity 0 and placed before every
 * busy name, so none is placed under it (DC14).
 */
export function busyNamesGeoJSON(
  v: LandingView | null | undefined,
  reserve: { name: string; at: LngLat } | null = null,
  pins: readonly LngLat[] = [],
  near: { at: LngLat; m: number } | null = null,
  cells: readonly LngLat[] = [],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  // audit 8: with the layer off, no names and no rooms, so nothing hides a base label.
  if (!v) return { type: 'FeatureCollection', features };
  if (reserve) features.push({ type: 'Feature', properties: { name: reserve.name, sort: -1, opacity: 0, angle: 0, stale: false, reserve: true, box: false, cell: false }, geometry: { type: 'Point', coordinates: reserve.at } });
  // DC17: each "?" pin's room, an invisible box standing over its point as the pin does.
  for (const at of pins) features.push({ type: 'Feature', properties: { name: PIN_ROOM_TEXT, sort: -1, opacity: 0, angle: 0, stale: false, reserve: true, box: true, cell: false }, geometry: { type: 'Point', coordinates: at } });
  // audit 11: a control over the map, or the map's edge, as a grid of room cells (centred, not standing like a pin).
  for (const at of cells) features.push({ type: 'Feature', properties: { name: PIN_ROOM_TEXT, sort: -1, opacity: 0, angle: 0, stale: false, reserve: true, box: true, cell: true }, geometry: { type: 'Point', coordinates: at } });
  for (const n of busyNames(v)) {
    // DC18: off Explore, only names near you.
    if (near && distanceM(n.at, near.at) > near.m) continue;
    features.push({ type: 'Feature', properties: { name: n.name, sort: n.order, opacity: 1, angle: n.angle, stale: n.stale, reserve: false, box: false }, geometry: { type: 'Point', coordinates: n.at } });
  }
  return { type: 'FeatureCollection', features };
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

/**
 * Town borders (TB1-TB10): the town you're in (or a walk's towns) tinted with a firm edge, the
 * others in a grey line. The fill is under the streets, so the map reads through it; the lines are
 * over the streets, under the labels, since a border often runs along a road (TB10, Nov 4: at 7%
 * under the streets, the owner saw nothing on a phone).
 */
export const BORDER = {
  color: '#c2410c',
  fillOpacity: 0.12,
  firmWidth: 3,
  firmOpacity: 0.9,
  lined: '#6b7280',
  linedWidth: 1.5,
  linedOpacity: 0.75,
  /** Borders show from this zoom: below it a town is too small to read as a region (TB3). */
  minZoom: 8,
} as const;

/** The borders a map draws (TB1-TB5), one feature per town with its role, id and name only (TB3). */
export function bordersGeoJSON(view: BorderView | null | undefined): GeoJSON.FeatureCollection {
  if (!view) return { type: 'FeatureCollection', features: [] };
  return {
    type: 'FeatureCollection',
    features: view.shapes.map((s) => ({
      type: 'Feature',
      properties: { role: s.role, id: s.id, name: s.name },
      geometry: { type: 'MultiPolygon', coordinates: s.polygons },
    })),
  };
}

/** The Walkability layer's tints (UF9): soft, so the streets and labels show through. */
export const WALK_STYLE = {
  // One cool hue family, told apart by lightness: neither is green or orange, so neither reads as approval or warning, and
  // neither is the app's accent or the town borders' colour (the vision review, 2026-11-05).
  foot: { color: '#5b9bd5', opacity: 0.24 },
  car: { color: '#3b4a6b', opacity: 0.3 },
} as const;

/** The shapes a map draws (UF9): one polygon per shape with its band only (UF12). */
export function walkabilityGeoJSON(t: WalkTint | null | undefined): GeoJSON.FeatureCollection {
  if (!t) return { type: 'FeatureCollection', features: [] };
  const f = (band: 'foot' | 'car', rings: LngLat[][]): GeoJSON.Feature[] => rings.map((r) => ({ type: 'Feature', properties: { band }, geometry: { type: 'Polygon', coordinates: [r] } }));
  return { type: 'FeatureCollection', features: [...f('foot', t.foot), ...f('car', t.car)] };
}

/** A place still to find drawn as a dot (WT14): where it is and its kind's colour, nothing else. */
export interface WaitingDot {
  id: string;
  at: LngLat;
  color: string;
}

/** WT14: the dots as one layer's features: the colour is the only property, so a dot carries no name, number or icon. */
export function waitingDotsGeoJSON(dots: WaitingDot[] | undefined): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (dots ?? []).map((d) => ({ type: 'Feature', properties: { color: d.color }, geometry: { type: 'Point', coordinates: d.at } })),
  };
}

/**
 * WT14: a dot: smaller than a "?" pin, in its kind's colour. Whole-towns audit 18 (the owner's call): a dark outline,
 * 3:1 or more on every ground the map has (the base map, a neighborhood's ring, a town's tint), so a dot never hangs on
 * its colour alone; the "?" pins' own ink.
 */
export const WAITING_DOT_EDGE = '#1d2733';
export const WAITING_DOT_PAINT = { 'circle-color': ['get', 'color'], 'circle-radius': 4.5, 'circle-stroke-color': WAITING_DOT_EDGE, 'circle-stroke-width': 1.5 } as const;

/** Points to mark (a destination, a pressed spot), as circles. */
export function marksGeoJSON(marks: LngLat[] | undefined): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: (marks ?? []).map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: p } })),
  };
}

/**
 * The start and end markers (QL1, QL2), two circle layers on the `ends` source, on both maps: shape tells them apart,
 * not colour alone (WCAG 2.2, 1.4.1; tend map T16). The start is hollow, a white disc ringed in the trace's green.
 * The end is a bullseye (tend map T25, decision 0162), so it differs in shape from the walker's solid dot too. This,
 * the first layer (`ends-ring`), draws the start and the end's walked outer ring with a thin white edge that keeps it
 * off the walked streets and the trace it stands on; the start comes first in `endsGeoJSON`, so a walk that ends on
 * its start keeps the end's ring over it (tend map audit 25). One width across, 22 px, the start's and the end's. No
 * new hue: the end takes the walked streets' colour (T22, a walked colour apart from the accent, is open).
 */
export const ENDS_RING_PAINT = {
  'circle-color': ['match', ['get', 'kind'], 'start', '#ffffff', COLORS.walked],
  'circle-radius': ['match', ['get', 'kind'], 'start', 7, 9.5],
  'circle-stroke-width': ['match', ['get', 'kind'], 'start', 4, 1.5],
  'circle-stroke-color': ['match', ['get', 'kind'], 'start', COLORS.trace, '#ffffff'],
} satisfies NonNullable<CircleLayerSpecification['paint']>;

/**
 * The end's walked centre and white band (tend map T25): the second layer (`ends`), filtered to the end, drawn over
 * `ENDS_RING_PAINT`'s layer, so nothing of the start covers them (tend map audit 25).
 */
export const ENDS_PAINT = {
  'circle-color': COLORS.walked,
  'circle-radius': 3.5,
  'circle-stroke-width': 2.5,
  'circle-stroke-color': '#ffffff',
} satisfies NonNullable<CircleLayerSpecification['paint']>;

/**
 * Where the walk began and ended, as points with a `kind` (QL1, QL2), drawn with `ENDS_RING_PAINT` and `ENDS_PAINT`;
 * the start first, so a layer draws the end over it (tend map audit 25).
 */
export function endsGeoJSON(start: LngLat | null, end: LngLat | null): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  if (start) features.push({ type: 'Feature', properties: { kind: 'start' }, geometry: { type: 'Point', coordinates: start } });
  if (end) features.push({ type: 'Feature', properties: { kind: 'end' }, geometry: { type: 'Point', coordinates: end } });
  return { type: 'FeatureCollection', features };
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
