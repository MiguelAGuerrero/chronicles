import type { LineReveal } from '../../lib/ceremony/reveal';
import type { Hop } from '../../lib/ceremony/types';
import type { Faced } from '../../lib/moment';
import type { BorderView } from '../../lib/areas/borders';
import { GROUND_FADE_STEPS, type CarGround } from '../../lib/walk/carGround';
import type { HatchLook } from '../../lib/walk/hatch';
import type { DotSource } from '../../lib/liveDot';
import type { MarkPin } from '../MarkPinView';
import type { AreaPointPin } from '../AreaPoint';
import type { ComplexMap } from '../../lib/complexes/mapLayer';
import type { LandingView } from '../../lib/landing/view';
import { storefrontNames } from '../../lib/landing/names';
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
/**
 * A fit with no room said: this far in from every edge, and never closer than this zoom. A replay tells its ceremony the
 * same room (replay ceremony RC23, RC24), so the view its first frame opens from is the view the map's own fit left.
 */
export const FIT_PADDING = { top: 48, right: 48, bottom: 48, left: 48 } as const;
export const FIT_MAX_ZOOM = 17;

/** Bold fog: unwalked streets near the walker, when asked for. */
export const FOG_BOLD = '#3f4a5a';

/**
 * Hotspots (v1.5): magenta, the one hue no other layer uses (the owner's
 * call, after the trace took green), 3:1 or more on the base map (L9).
 */
/** AD16: storefront streets are measured with Overture's places too, so the map's credits name it. */
export const OVERTURE_CREDIT = 'Places: Overture Maps Foundation';
/** GZ14: Explore's place search reads names from a bundled pack of this dataset, so the map's credits name it (a test holds it equal to the pack's own credit). */
export const GAZETTEER_CREDIT = 'Place names: GeoNames (geonames.org), CC BY 4.0, 2026-11-16';

export const HOTSPOT = '#d6268c';
export const HOTSPOT_INK = '#86145a';

/**
 * The fog is quiet unless asked for (the owner's call, Nov 1): after a scan
 * it covers every street around, and the trace must still read over it.
 * The trace is green, wider than the fog, on a white edge.
 */
export const FOG_STYLE = { opacity: 0.5, widthMin: 1, widthMax: 2.5, traceWidth: 4.5, edgeWidth: 7.5 } as const;

/**
 * The map's palette, "Earth and ink" (the owner's pick, Nov 17, decision 0188; map-palette MP2): the walked streets
 * and the end in a blue-violet ink, apart from the accent (decision 0153); the kinds in earth pigments; a pin of
 * several on charcoal. `map/palette.test.ts` holds the contrasts, the colour-blind floor and the accent's distance.
 */
export const COLORS = {
  fog: '#8b939e',
  /** The walked streets on the replay, and the end marker: ink. */
  walked: '#5b5d9f',
  /** Where you walked: green (the owner's call), on a white edge. */
  trace: '#15803d',
  /** A route being navigated: map-navigation blue, with a white edge (N6). */
  route: '#2563eb',
  walker: '#1d3557',
  /** A walker's dot from a fix minutes old (fix outing-current-position audit 11): stone, 3:1 on the land, on its white edge. */
  walkerMuted: '#7b7469',
  /** A photo, and a moment of several pieces: verdigris. */
  photo: '#286766',
  /** Madder: a dark disc, 15 or more from the hotspot magenta (MP8). */
  video: '#87244e',
  /** Raw umber. */
  voice: '#544516',
  /** Stone. */
  text: '#7b7469',
  /** A pin of several moments' head: charcoal, under its kinds' discs. */
  several: '#31352f',
  veil: '#d7dbe0',
  /** Where I've been (WB9): earlier walks' lines, a muted sage, 3:1 on the land and quieter than the trace (where-ive-been ui 1). */
  past: '#588a78',
};

/**
 * Where I've been (WB9, decision 0222): one even tone (opaque, so two walks over one street look like one), thinner than
 * today's trace, with no white edge; drawn over the fog and under the walked streets, the route and the trace.
 */
export const PAST_STYLE = { opacity: 1, width: 3 } as const;

/** The lines of earlier walks the map draws (WB6), with their walks' ids for the e2e; null draws none. */
export interface PastView {
  /** Changes only with the lines drawn: the map sends them again only when it does (WB16). */
  key: string;
  ids: string[];
  runs: LngLat[][];
}

/** The trace's white edge, as a share of the trace's own opacity, on both maps. */
export const TRACE_EDGE_OPACITY = 0.9;
/** The trace on the replay's first beats (the fog and the reading), faint under the lit streets. */
export const QUIET_TRACE_OPACITY = 0.3;

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
   * The replay's first beat (replay ceremony RC23): the walked streets light up out of the fog by themselves, in the
   * order walked, over `over` ms from when `key` changes; 'dark' draws them all as fog (the beat before). The map does
   * it as time passes (`litStreets`), sending its two street sources a few times a second: no screen renders for it.
   * Absent, the walked streets are drawn as given.
   */
  lightUp?: 'dark' | { key: number; over: number };
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
   * The walks of the pins' moments, with their pauses, so a pin says how far into its walk it was (tend map
   * T14): "A photo and a note, twelve minutes in". Without its walk's clock, a pin says the part of the day of its
   * first moment (tend map T28): "A photo and a note, Tuesday evening".
   */
  clocks?: readonly WalkClock[];
  /**
   * The moment a pin's part of the day is said from (tend map audit 29): a screen that stays open renews it; without
   * it, the time the map opened.
   */
  now?: number;
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
  /** Credits the place-name dataset in the map's attribution: only Explore's map, where the search reads it (GZ14). */
  placeNamesCredit?: boolean;
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
  /** Marks whose heads would cover each other stand side by side, on legs to their points (fix mark-overlap). Off where
   * the screen lays its pins out itself (Explore's "?" by `halfZoom`, WT12). */
  spreadMarks?: boolean;
  onDiscoveryPress?: (id: string) => void;
  /** Explore's places still to find where a "?" would crowd (WT12, WT14): small dots in the kind's colour, no name. */
  waitingDots?: WaitingDot[];
  /** Remembered hotspots: pockets shaded, strips drawn and named, as information (v1.5). */
  landing?: LandingView | null;
  /**
   * DC16: the storefront names go over every layer, placed before the base map's labels (Explore); otherwise under the base map's
   * labels and so under the trace and the route (the walk screen, Navigate).
   */
  storefrontNamesOver?: boolean;
  /** The camera started (true) or settled (false), once each, never per frame: Explore's read waits for a settle (DC9). */
  onMoveState?: (moving: boolean) => void;
  /** DC14: the selected area's name, whose room on the map no storefront name takes (Explore). */
  storefrontNamesReserve?: { name: string; at: LngLat } | null;
  /** DC18: the walk maps name storefront streets only near you (`namesNearYou`); Explore passes none (EC7 has its own limit). */
  storefrontNamesNear?: { at: LngLat; m: number } | null;
  /** audit 11: the test ids of the screen's controls over the map, whose room no storefront name takes (web). */
  storefrontNamesClearOf?: readonly string[];
  /**
   * SS5 (web): bumped by Explore as a switch's camera move begins: the storefront names leave at once and the destination's are
   * sent once, when that move settles. Any other move (a drag, a zoom, a follow camera) clears nothing (SS10).
   */
  storefrontNamesSwitch?: number;
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
  /** The Walkability layer (G5): ground built around cars as a slate hatch with a firm edge, under the trace and fog; null or absent draws none. */
  walkability?: CarGround | null;
  /** G5: the route's stretches through car ground, drawn as a slate casing under the route; null or absent draws none. */
  carRoute?: LngLat[][] | null;
  /** Where I've been (WB6, WB9): earlier walks' walked lines, one even tone under today's trace; null draws none. */
  past?: PastView | null;
  /** The way the walker is going (degrees from north), drawn as a soft cone; null hides it. */
  walkerHeading?: number | null;
  walker?: LngLat | null;
  /**
   * The dot is a fix that stands in for a fresh one (fix outing-current-position audit 11, the owner's "Muted dot when old",
   * Nov 27): drawn in stone (`COLORS.walkerMuted`), not the walker's ink.
   */
  walkerMuted?: boolean;
  /** The live dot, fix by fix (the live walk): the glide follows it, and the trace's end joins it. */
  walkerSource?: DotSource | null;
  /** Glide the dot, cone and camera between fixes (the live walk). Off, the dot is placed as given (the replay's clock). */
  glideWalker?: boolean;
  /** Keeps the camera centered here while set. */
  follow?: LngLat | null;
  /** While following, holds the camera at this zoom: the replay's walking zoom and its pull-back (RR3). Rounded to 0.01. */
  followZoom?: number | null;
  /**
   * A replay's path is being told on this map (replay ceremony RC1-RC3, decision 0206): its walker, camera and walked
   * line come frame by frame through the handle's `replayFrame`, outside React, never as props. The screen passes no
   * `walker` and no `follow` meanwhile. A `trace` it goes on giving (the one its first beat showed, at that beat's
   * `traceOpacity`) is drawn only as far as the frames say (`ReplayMapFrame.wholeTrace`, `traceShown`): it fades out
   * as the path opens and is not drawn after (`replay-ceremony ui 7`).
   */
  replay?: boolean;
  /** Fits the camera to these bounds whenever `fitKey` changes. */
  fitBounds?: Bounds | null;
  fitKey?: number;
  /**
   * The fit turns the map north-up (`replay-ceremony ui 8`): the replay's first beat, so a map turned by hand on the
   * card is north-up before the path, which is told so (RC15), begins. Any other fit keeps the map's bearing (CP1).
   */
  fitNorth?: boolean;
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
  /** The town borders over the veil, at a lighter fill (the replay and a day; decision 0199). */
  bordersOverVeil?: boolean;
  /** Hides the map behind an opaque cover, e.g. while the camera steps through views. */
  covered?: boolean;
  /**
   * The base map draws no shop or place-of-interest labels (QC24: the outing's page and a walk following an outing, where a stop is a
   * plain point and nothing near it says what is there). Street, water and place-name labels stay.
   */
  hideLabels?: boolean;
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
  /**
   * One frame of a replay, drawn now and without a render (replay ceremony RC1-RC3): the walker, the camera and how
   * much of the walked line shows, together. Null ends the telling: the walker goes, and the line with it once the
   * map has drawn the trace it is given as a prop.
   */
  replayFrame(frame: ReplayMapFrame | null): void;
  /** Gives the map keyboard focus (the web's canvas); a phone's map takes none (WB3). */
  focus(): void;
}

/** A replay's camera is flat and north-up (replay ceremony RC15): each of its frames tells the map so, whatever a hand left it at. */
export const FLAT_NORTH_UP = { bearing: 0, pitch: 0 } as const;

/** A frame of a replay as a map takes it (`WalkMapHandle.replayFrame`). */
export interface ReplayMapFrame {
  /** The time into the telling: a line a map draws as data is sent again by it, at most every `REPLAY_ENGINE.resendMs`. */
  ms: number;
  walker: LngLat | null;
  /** How strongly the walker's dot shows, 0 to 1: it fades in as the opening's dive ends (`replay-ceremony ui 7`). */
  walkerFade: number;
  /** How much of the whole trace the beat before left on the map still shows, 1 to 0: it fades out through the dive. */
  wholeTrace: number;
  /** Where the camera holds the map; a null centre leaves the map where it is (reduce motion). */
  camera: { center: LngLat | null; zoom: number | null };
  /** The walked line and the rides: the runs drawn whole, and how far the run being walked shows. */
  walked: LineReveal;
  rides: LineReveal;
  /** The breaks crossed so far, each as far as it is drawn (replay ceremony RC21): the map draws them in its `gap-links` layer, a gap's own dots. */
  hops: Hop[];
}

/**
 * The replay's own line sources (replay ceremony RC3). The walked line: the runs behind the walker whole, the run
 * being walked sent whole once and revealed by its gradient. The rides: one source, sent as data. A dashed line
 * cannot be revealed that way: maplibre-gl (6.16) draws a dash over a source with line metrics at a scale that follows
 * the line's length, not the screen, so the dashes of a ride being revealed came out as fine dots. A ride is sent
 * again, cut where it ends, at most every `REPLAY_ENGINE.resendMs` of the telling's time while it is being ridden.
 */
export const REPLAY_LINES = {
  walked: { done: 'replay-done', run: 'replay-run' },
  rides: 'replay-rides',
} as const;

/**
 * What decides a line drawn as data is sent again (a ride on the web; both lines on a phone): its whole runs, and the
 * run being drawn by the telling's bucket of time, never by the frame.
 */
export const resendKey = (l: LineReveal, ms: number, everyMs: number): string =>
  `${l.doneKey}#${l.run ? `${l.run.length}:${l.p >= 1 ? 'whole' : Math.floor(ms / everyMs)}` : ''}`;

/** A line's colour up to a share of its length and nothing after: the walked line's reveal (`line-gradient` over `line-progress`). */
export const revealGradient = (color: string, p: number): unknown[] => ['step', ['line-progress'], color, Math.max(0, p), 'rgba(0,0,0,0)'];

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
/** The dots' width: a dash is counted in it, so a dot comes every 3 x 2.3 px along the line. */
export const GAP_LINK_WIDTH = 3;
/** The white edge lines stand on, so they read over fog, walked streets and the base map alike. */
export const LINE_EDGE = '#ffffff';
/** A line's casing: a pixel wider each side of the dot (`replay-ceremony ui 9`, the owner's defaults, Nov 20). */
const HOP_EDGE_WIDTH = GAP_LINK_WIDTH + 2;
/**
 * The edge a replay's hop stands on (`replay-ceremony ui 6`): a white mark under each of the gap link's dots, drawn
 * from the dots' own source just under them. The dots are grey on the land; over a walked street lit in its ink they
 * vanished (1.5:1), and the white reads on both (6:1 on the street, the dot 9:1 on the white). It is a hairline
 * casing, as a line's is, not a disc (ui 9): at 6 px the discs all but touched on plain land (0.6 px between them)
 * and read as a white dotted ribbon; at this width 1.6 px of land shows between two marks. The dash is counted in the
 * line's own width, so the wider edge takes a shorter one to keep the dots' spacing: one mark a dot.
 */
export const HOP_EDGE = {
  color: LINE_EDGE,
  width: HOP_EDGE_WIDTH,
  dash: [0.05, (GAP_LINK_WIDTH * (GAP_LINK_DASH[0] + GAP_LINK_DASH[1])) / HOP_EDGE_WIDTH - 0.05],
  opacity: 0.9,
} as const;
/** The edge shows only while a replay is told: every other map's gap links are as they were, with none. */
export const hopEdgeOpacity = (told: boolean): number => (told ? HOP_EDGE.opacity : 0);

/**
 * How strongly a map draws the trace it is given, its end markers and its dotted links, from the screen's
 * `traceOpacity`. While a replay is told (`replay-ceremony ui 7`) the frames say how much of the whole trace still
 * shows (`whole`, 1 to 0 through the opening's dive): the lines fade out from the first beat's faint trace, the end
 * markers come up to full as they do, and the links, which are then the replay's own hops, are whole.
 */
export function traceShown(opacity: number, told: boolean, whole: number): { line: number; marks: number; links: number } {
  if (!told) return { line: opacity, marks: opacity, links: opacity };
  return { line: opacity * whole, marks: opacity + (1 - opacity) * (1 - whole), links: 1 };
}
/** A way being drawn: short dashes, so it reads as not kept yet (GW3). */
export const DRAWING_DASH = [1, 1];

/** A ride's dash, in line widths: long enough to read as a line, gapped enough to read as not walked. */
export const RIDE_DASH = [1.6, 1.4];

/**
 * Line sources are simplified a little more than maplibre's default and keep a smaller tile buffer
 * (tolerance 0.375 and buffer 128 are the defaults): less to re-tile on each update (perf, Nov 1).
 * Both maps take it, the web in `addSource`, the phone as `GeoJSONSource` props (NF5).
 */
export const LINE_SOURCE = { tolerance: 1, buffer: 64 } as const;
/** The sources drawn as lines, simplified by `LINE_SOURCE` on both maps (NF5). */
export const LINE_SOURCE_IDS = ['fog', 'past', 'walked', 'alternates', 'route-grades', 'route', 'gap-links', 'faint', 'rides', 'trace-history', 'trace', 'trace-link', 'drawing'] as const;

/** A reveal's place in a source: a run that ended stays whole until the next begins, since by then it is among the whole ones. */
export function revealStop(drawn: { run: LngLat[] | null }, next: LineReveal): { run: LngLat[] | null; p: number } {
  if (next.run) return { run: next.run, p: Math.min(1, Math.max(0, next.p)) };
  // Past its end by a hair, so the last texel shows; hidden when the run is not one of this telling's.
  return { run: drawn.run, p: drawn.run && next.done.includes(drawn.run) ? 1.001 : 0 };
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

export function walkerGeoJSON(walker?: LngLat | null, muted = false): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: walker ? [{ type: 'Feature', properties: { muted }, geometry: { type: 'Point', coordinates: walker } }] : [],
  };
}

/** The dot's fill: the walker's ink, or stone for a fix that stands in for a fresh one (fix outing-current-position audit 11). */
export const WALKER_FILL = ['case', ['==', ['get', 'muted'], true], COLORS.walkerMuted, COLORS.walker] as const;

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
 * How each grade of a storefront street draws (AD12): wider and stronger as the grade rises, in the one magenta.
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
 * The storefront names' font (DC1): one the base style's glyphs serve (Positron's, from `MAP_STYLE_URL`'s host). If OpenFreeMap
 * renames it, the names stop drawing with a console error; `map/storefrontNames.test.ts` reads it from a copy of the style.
 */
export const STOREFRONT_NAME_FONT = ['Noto Sans Bold'];
/**
 * The base style's first label layer (Positron's): on native, storefront names go under it off Explore (DC16). The web finds the
 * first symbol layer itself; native can't read the style, so it names it (held by `map/storefrontNames.test.ts`).
 */
export const BASE_FIRST_LABEL = 'waterway_line_label';

/**
 * QC24: the base style's vector source and the source layer its shop and point-of-interest labels are drawn from. The web hides the
 * style's symbol layers of that source layer (`poiLabelLayers`); native, which cannot read the style, hides the source layer itself
 * (`setSourceVisibility`, unverified on a device). The app's own query source (`omt-query`) is another source and is left alone.
 */
export const BASE_VECTOR_SOURCE = 'openmaptiles';
export const POI_SOURCE_LAYER = 'poi';

/** QC24: the ids of a style's symbol layers that draw points of interest (shops among them), whatever the style names them. */
export function poiLabelLayers(layers: readonly { id: string; type: string; 'source-layer'?: string }[]): string[] {
  return layers.filter((l) => l.type === 'symbol' && l['source-layer'] === POI_SOURCE_LAYER).map((l) => l.id);
}

/**
 * A stale area's names (DC6, explore-dense-city ui 1): a greyer ink at full opacity, 5.4:1 on the halo and 4.5:1 on the
 * bare base map. Dimming the text would dim its halo too, under 3:1.
 */
export const STOREFRONT_NAME_STALE_INK = '#7d6274';
/**
 * The names' turn on a map turned to `bearing` (explore-dense-city ui 3): a name is map-aligned, so on screen it turns by
 * its rotation less the bearing; this folds that into [-95, 85), the same rule as `alongAngle`, so no name is ever upside
 * down. Only ever half a turn off `angle`, so it still runs along its street. Set again as the map turns.
 */
export function storefrontNameRotate(bearing: number): unknown[] {
  const b = Math.round(bearing * 10) / 10;
  return ['+', ['-', ['%', ['+', ['-', ['get', 'angle'], b], 455], 180], 95], b];
}

/**
 * A "?" pin's room (DC17): one wide letter at this size and padding covers the pin's drawn box (48 px wide, 42 above its
 * point, 6 below, `MarkPinView` on the web marker), standing on the point as the pin does.
 */
const PIN_ROOM_TEXT = 'W';
const PIN_ROOM = { size: 40, offsetEm: 0.15, padding: 5 };

/** DC18: on the walk screen and Navigate, storefront names only within this of you (Explore's ring, `ATLAS_RULES.ringM`). */
export const STOREFRONT_NAMES_NEAR_M = 800;
export const namesNearYou = (at: LngLat | null | undefined): { at: LngLat; m: number } | null => (at ? { at, m: STOREFRONT_NAMES_NEAR_M } : null);

/** Where the storefront names and the storefront lines sit among the layers on native (explore-dense-city DC16, audit 6). */
export function storefrontLayerOrder(over: boolean): { lines: string | undefined; names: string | undefined } {
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

/** The storefront names' size, the same for every name whatever its street's grade (DC4). */
const STOREFRONT_NAME_SIZE = 13;
/** A name turned less than this runs level enough to slide along its street (audit 1). */
const LEVEL_DEG = 15;
/** How far a name slides along its street off a point it can't sit on (DC17): 34 px at 13 px, past a pin's half width. */
const STOREFRONT_NAME_SLIDE_EM = 2.6;
/** The selected area's name on the map (AreaPointView: 11 px bold under a 14 px dot, 140 px wide), as the room it reserves (DC14). */
const AREA_NAME_ROOM = { size: 12, offsetEm: 0.85, widthEm: 11.5 };

/**
 * The storefront names' layer (DC1-DC6, DC14): one name per street at its peak, turned along the street there (it turns
 * with the map), or a pocket's name level at its centre. Names collide with each other and with the base map's labels
 * (never overlap, never ignore placement), are placed in their `sort` order, and look the same whatever the grade: only a
 * stale area's names change, to a greyer ink. A long name wraps at its width; nothing cuts it.
 */
export function storefrontNameLayers() {
  const box = ['get', 'box'];
  const cell = ['get', 'cell'];
  const paint = { 'text-color': ['case', ['get', 'stale'], STOREFRONT_NAME_STALE_INK, HOTSPOT_INK], 'text-halo-color': '#ffffff', 'text-halo-width': 1.5, 'text-opacity': ['get', 'opacity'] } as Record<string, unknown>;
  const text = {
    'symbol-placement': 'point',
    'text-field': ['get', 'name'],
    'text-font': STOREFRONT_NAME_FONT,
    'text-ignore-placement': false,
    'symbol-sort-key': ['get', 'sort'],
  };
  const name = {
    ...text,
    'text-size': STOREFRONT_NAME_SIZE,
    'text-allow-overlap': false,
    'text-padding': 4,
    'text-rotate': storefrontNameRotate(0),
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
      'text-radial-offset': STOREFRONT_NAME_SLIDE_EM,
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
 * The storefront names as map points (DC1, DC4): each with its `sort` (the view's order: heavier first), its turn and whether
 * it is stale (a greyer ink, DC6). The selected area's name, when given, is drawn at opacity 0 and placed before every
 * storefront name, so none is placed under it (DC14).
 */
export function storefrontNamesGeoJSON(
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
  for (const n of storefrontNames(v)) {
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
 * under the streets, the owner saw nothing on a phone). On the replay and a day both draw over the world's veil
 * (`borderMoves`, `borderFillOpacity`). Cocoa, apart from the accent (the owner's answer to T33, Nov 17; decision 0199).
 */
export const BORDER = {
  color: '#6e4f3f',
  fillOpacity: 0.12,
  firmWidth: 3,
  firmOpacity: 0.9,
  lined: '#6b7280',
  linedWidth: 1.5,
  linedOpacity: 0.75,
  /** Borders show from this zoom: below it a town is too small to read as a region (TB3). */
  minZoom: 8,
} as const;

/**
 * How the web moves the borders' layers against the world's veil (decision 0199), as `[layer, before]` pairs. Over it on
 * the replay and a day while the veil is on (the owner's "Borders above the veil"): the veil just under the borders'
 * lines and the fill between them, so the edge and the tint keep TB8's and TB10's contrast. Elsewhere, the walk screen's
 * unwalked veil among them (tend map audit 39), as before: the lines under the veil and the fill under the base map's
 * first street (TB8), or just under the lines with no street layer.
 */
export function borderMoves(overVeil: boolean, firstRoad: string | undefined): [string, string][] {
  return overVeil
    ? [['veil', 'border-lined'], ['border-fill', 'border-lined']]
    : [['border-lined', 'veil'], ['border-firm', 'veil'], ['border-fill', firstRoad ?? 'border-lined']];
}

/** The fill's opacity: lighter over the veil, so a label on the tint keeps 4:1 (the owner, Nov 17: "Lighten the fill on veiled maps"). */
export function borderFillOpacity(overVeil: boolean): number {
  return overVeil ? 0.11 : BORDER.fillOpacity;
}

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

/** The Walkability layer (G5, decisions 0232, 0271): only ground built around cars, a soft slate hatch with a firm edge. */
export const WALK_SLATE = '#3b4a6b';
/** The owner's pick, Nov 27 (decision 0271): "Soft A2 (Recommended)", its edge raised to 3:1 ("Edge to 3:1, lines soft"). */
export const WALK_STYLE: { car: HatchLook } = {
  car: { run: 1, rise: 1, spacingPx: 9, lineWidthPx: 1.25, lineOpacity: 0.4, edgeWidthPx: 1, edgeOpacity: 0.65, color: WALK_SLATE },
};
/**
 * The edge of what was read (T67, the owner's yes, 2026-11-27): a thin dashed line in the grey the map draws its quiet
 * lines in (`BORDER.lined`, 3:1 on the land), as thin as the hatch's lines. Its dashes are short and even, the map's own
 * short dash at twice its length (2.5 px on, 2.5 off), so it is not taken for a town's border, which maps dash long
 * (tend walkability audit 1, the ux-reviewer's ux 1). No fill, no number.
 */
export const WALK_READ = {
  color: BORDER.lined,
  widthPx: WALK_STYLE.car.lineWidthPx,
  dash: DRAWING_DASH.map((d) => d * 2) as readonly number[],
} as const;
/** The hatch and its edge sit under the base map's labels (walkability-car-ground audit 14); the web map finds its first symbol layer. */
export const WALK_BELOW = BASE_FIRST_LABEL;
/** The hatch's image names on a map, one a quarter zoom (`hatchQuarter`). */
export const walkHatchAt = (q: number) => `walk-hatch-${q}`;
/** G5: the route's stretches through car ground, as lines (`kind` 'line'), and where each starts (`kind` 'start', CG6). */
export function carRouteGeoJSON(lines: LngLat[][] | null | undefined): GeoJSON.FeatureCollection {
  const out: GeoJSON.Feature[] = [];
  for (const l of lines ?? []) {
    out.push({ type: 'Feature', properties: { kind: 'line' }, geometry: { type: 'LineString', coordinates: l } });
    if (l.length) out.push({ type: 'Feature', properties: { kind: 'start' }, geometry: { type: 'Point', coordinates: l[0] } });
  }
  return { type: 'FeatureCollection', features: out };
}
/** The casing is cut square, so it ends where the hatch does (walkability-car-ground audit 9). */
export const ROUTE_CAR_LAYOUT = { 'line-cap': 'butt', 'line-join': 'round' } as const;
/** Where the casing starts (CG6, the owner's "Mark where it starts"): a small slate dot on the route, ringed in white. */
export const ROUTE_CAR_START_PAINT = { 'circle-radius': 4, 'circle-color': WALK_SLATE, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } as const;
/** The route's stretch through car ground (G5): a slate casing under the route's own colour, this wide. */
export const ROUTE_CAR_WIDTH = 14;

/** What the map draws (G5): the car areas (`kind` 'area', or 'area-<n>' fading toward the read's edge) and their edges
 * ('edge', 'edge-<n>'), the edge of what was read ('read', T67), and nothing else (UF12). */
export function walkabilityGeoJSON(g: CarGround | null | undefined): GeoJSON.FeatureCollection {
  if (!g) return { type: 'FeatureCollection', features: [] };
  const kind = (k: string, fade: number) => (fade ? `${k}-${fade}` : k);
  return {
    type: 'FeatureCollection',
    features: [
      ...g.areas.map((a): GeoJSON.Feature => ({ type: 'Feature', properties: { kind: kind('area', a.fade) }, geometry: { type: 'Polygon', coordinates: a.shape } })),
      ...g.edges.map((e): GeoJSON.Feature => ({ type: 'Feature', properties: { kind: kind('edge', e.fade) }, geometry: { type: 'LineString', coordinates: e.shape } })),
      ...(g.read ?? []).map((l): GeoJSON.Feature => ({ type: 'Feature', properties: { kind: 'read' }, geometry: { type: 'LineString', coordinates: l } })),
    ],
  };
}

/** How strong each fade step is drawn, as a MapLibre expression: whole, then fainter toward the read's edge. */
export function walkFade(prefix: 'area' | 'edge', whole: number): unknown[] {
  const steps: unknown[] = [];
  for (let f = 1; f <= GROUND_FADE_STEPS; f++) steps.push(`${prefix}-${f}`, (whole * (GROUND_FADE_STEPS + 1 - f)) / (GROUND_FADE_STEPS + 1));
  return ['match', ['get', 'kind'], ...steps, whole];
}
/** The filter for one kind's features, faded or not. */
export const walkKind = (prefix: 'area' | 'edge' | 'read') => ['==', ['slice', ['get', 'kind'], 0, 4], prefix];

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
 * new hue: the end takes the walked streets' colour, apart from the accent since T22 (decision 0188).
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
 * A loop's start as a halo round the end's bullseye (tend map T50, decision 0244): when the two lie within one
 * marker's diameter on screen (`endsTogether`, `lib/traceEnds`), the start leaves the `ends` source and is drawn
 * here, on its own `ends-loop` source and layer under `ends-ring`, at the end's point: the start's white middle and
 * its 4 px ring in the trace's green, wide enough that 3.5 px of white (the bullseye's own edge and this middle)
 * part the green from the end's walked ring. The green and the walked colour are near one grey, so the band is what
 * tells them apart in greyscale. No hue of its own; 34 px across.
 */
export const ENDS_LOOP_PAINT = {
  'circle-color': '#ffffff',
  'circle-radius': 13,
  'circle-stroke-width': 4,
  'circle-stroke-color': COLORS.trace,
} satisfies NonNullable<CircleLayerSpecification['paint']>;

/** The halo's one point (tend map T50), the end's, or nothing while the two ends are drawn apart. */
export function endsLoopGeoJSON(at: LngLat | null): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: at ? [{ type: 'Feature', properties: { kind: 'loop' }, geometry: { type: 'Point', coordinates: at } }] : [],
  };
}

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
