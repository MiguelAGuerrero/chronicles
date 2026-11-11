// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { ATLAS_LABEL, ATLAS_ORDER, waitingMarks, type AtlasMark } from './atlas';
import type { Kind } from '../discovery/types';

/*
 * Whole towns (WT7, WT12-WT14, decision 0132; whole-towns audit): the selected area's places on Explore's map.
 * A neighborhood (or a town zoomed in to a neighborhood's scale): every place still to find, a "?" where its pin has
 * room on screen, a dot in its kind's colour where it would overlap a pin, and only places in view can be "?" (audit 3).
 * A town at its own scale: every findable place as the same dot, found or not, so the field never thins as you find
 * (audit 14, the owner's call). Decided at the settled camera's zoom (audit 6), rounded to half levels.
 */

export const PIN_ROOM = {
  /** A "?" pin's drawn box around its point, in screen px (the web marker: 48 wide, 42 above the point, 6 below). */
  w: 48,
  up: 42,
  below: 6,
  /** A tapped dot or crowded "?" zooms in at most this far: the map's closest fit (`fitMaxZoom`'s default). */
  maxZoom: 17,
  /** A dot's tap reach, in screen px, whatever the zoom (audit 2). */
  dotReachPx: 44,
  /** A selected town shows "?" from this zoom on (about a neighborhood's ring across the screen); below it, dots only (audit 14). */
  townPinZoom: 14,
} as const;

/** Metres a screen pixel spans at a zoom (512 px tiles, as `pressRadiusM`). */
export const metresPerPx = (zoom: number, lat: number) => (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);

/** WT12: the zoom the split is decided at: half levels, so a pinch in progress regroups nothing. */
export const halfZoom = (zoom: number) => Math.round(zoom * 2) / 2;

/** Metres east and north from a to b. */
function offset(a: LngLat, b: LngLat): [number, number] {
  const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  return [(b[0] - a[0]) * 111_320 * Math.cos(lat), (b[1] - a[1]) * 110_574];
}

/** Two pins' boxes overlap (both stand the same way above their points). */
function pinsOverlap(a: LngLat, b: LngLat, mpp: number): boolean {
  const [dx, dy] = offset(a, b);
  return Math.abs(dx) < PIN_ROOM.w * mpp && Math.abs(dy) < (PIN_ROOM.up + PIN_ROOM.below) * mpp;
}

/** Audit 4: a spot lies under a pin's drawn box (north is up the screen). */
export function underPin(pin: LngLat, p: LngLat, mpp: number): boolean {
  const [dx, dy] = offset(pin, p);
  return Math.abs(dx) < (PIN_ROOM.w / 2) * mpp && dy > -PIN_ROOM.below * mpp && dy < PIN_ROOM.up * mpp;
}

/** What the camera shows, for the split: its middle and how far it reaches each way, in metres. */
export interface InView {
  centre: LngLat;
  halfWm: number;
  halfHm: number;
}
export const inView = (p: LngLat, v: InView | null): boolean => {
  if (!v) return true;
  const [dx, dy] = offset(v.centre, p);
  return Math.abs(dx) <= v.halfWm && Math.abs(dy) <= v.halfHm;
};
/** The camera's reach from its middle, zoom and the map's size in px. */
export const viewOf = (centre: LngLat, zoom: number, size: { width: number; height: number }): InView => {
  const mpp = metresPerPx(zoom, centre[1]);
  return { centre, halfWm: (size.width / 2) * mpp, halfHm: (size.height / 2) * mpp };
};

export type Pinned<T> = T & { crowded?: boolean };

/**
 * WT12, audits 3 and 4: which places are "?" pins and which are dots at this zoom; no two pins overlap, a place out of
 * view is never a pin, and a pin with a place under its drawn box is `crowded` (a tap on it zooms in).
 */
export function waitingPins<T extends { key: string; at: LngLat }>(
  marks: readonly T[], centre: LngLat, zoom: number, lat: number, view: InView | null = null,
): { pins: Pinned<T>[]; dots: T[] } {
  const mpp = metresPerPx(halfZoom(zoom), lat);
  const order = [...marks].sort((a, b) => distanceM(a.at, centre) - distanceM(b.at, centre) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const pins: Pinned<T>[] = [];
  const dots: T[] = [];
  for (const m of order) {
    if (!inView(m.at, view) || pins.some((p) => pinsOverlap(p.at, m.at, mpp))) dots.push(m);
    else pins.push({ ...m });
  }
  for (const p of pins) if (dots.some((d) => underPin(p.at, d.at, mpp))) p.crowded = true;
  return { pins, dots };
}

/**
 * WT13, audit 4: the lowest half zoom at which nothing else overlaps a place's pin (so a dot can be a "?", and a crowded
 * "?" stands clear), at most `maxZoom`. Two places on one spot never part: `maxZoom`.
 */
export function roomZoom(target: { key: string; at: LngLat }, marks: readonly { key: string; at: LngLat }[], lat: number, maxZoom: number = PIN_ROOM.maxZoom): number {
  const k = (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / 512;
  let need = -Infinity;
  for (const m of marks) {
    if (m.key === target.key) continue;
    const [dx, dy] = offset(target.at, m.at);
    // Clear of it once the box is narrower than the gap on either axis.
    const zx = Math.abs(dx) > 0 ? Math.log2((PIN_ROOM.w * k) / Math.abs(dx)) : Infinity;
    const zy = Math.abs(dy) > 0 ? Math.log2(((PIN_ROOM.up + PIN_ROOM.below) * k) / Math.abs(dy)) : Infinity;
    need = Math.max(need, Math.min(zx, zy));
  }
  if (need === -Infinity) return maxZoom;
  return Math.min(maxZoom, Math.ceil((need + 1e-9) * 2) / 2);
}

/**
 * WT13: the zoom a tap on a dot eases to: where it has room to be a "?", a half level in at least, at most `maxZoom`. A town
 * is all dots under `townPinZoom`, so a town's dot goes at least that far (tend explore 7); a find never becomes a "?" and is
 * not drawn from there (WT10), so it eases to its room only (audit 3).
 */
export function tapZoom(level: 'neighborhood' | 'town', room: number, zoom: number, waiting: boolean = true): number {
  const floor = level === 'town' && waiting ? PIN_ROOM.townPinZoom : -Infinity;
  return Math.min(PIN_ROOM.maxZoom, Math.max(room, zoom + 1, floor));
}

/** WT13, audit 2: the dot a press landed on, nearest within 44 px at the settled zoom, or null. */
export function dotAt<T extends { at: LngLat }>(press: LngLat, zoom: number, dots: readonly T[]): T | null {
  const reachM = PIN_ROOM.dotReachPx * metresPerPx(zoom, press[1]);
  let best: { d: T; m: number } | null = null;
  for (const d of dots) {
    const m = distanceM(press, d.at);
    if (m <= reachM && (!best || m < best.m)) best = { d, m };
  }
  return best?.d ?? null;
}

/**
 * WT7, WT10, audit 14: the selected area's map. A town under `townPinZoom`: every findable place of the kinds shown as
 * a dot, found or not, and no "?". Otherwise every place still to find, split at this zoom; a find is not drawn.
 */
export function areaMapMarks(
  level: 'neighborhood' | 'town', marks: readonly AtlasMark[], found: Set<string>, hidden: Set<Kind>, centre: LngLat, zoom: number, lat: number, view: InView | null = null,
): { pins: Pinned<AtlasMark>[]; dots: AtlasMark[] } {
  if (level === 'town' && halfZoom(zoom) < PIN_ROOM.townPinZoom) {
    return { pins: [], dots: waitingMarks([...marks], new Set(), centre, hidden, { all: true }) };
  }
  return waitingPins(waitingMarks([...marks], found, centre, hidden, { all: true }), centre, zoom, lat, view);
}

/**
 * WT11, audit 15: what a screen reader hears for the selected area's places: the area and the kinds, never how many. Only the
 * kinds still waiting: a town at its own scale draws its found places as dots too (audit 14), which wait for nothing (tend explore 5).
 */
export function waitingLabel(area: string, marks: readonly Pick<AtlasMark, 'category' | 'key'>[], found: ReadonlySet<string> = new Set()): string {
  const waiting = marks.filter((m) => !found.has(m.key));
  const kinds = ATLAS_ORDER.filter((c) => waiting.some((m) => m.category === c)).map((c) => ATLAS_LABEL[c].toLowerCase());
  return kinds.length ? `Waiting in ${area}: ${kinds.join(', ')}` : '';
}

/**
 * Back or Escape on a town's page steps out of one thing (tend explore 6, audit 1): the Layers panel, then the long press's
 * choices, then the page. The panel is the page's to close too, since it listens for Escape only on the web.
 */
export function pageBack(o: { layersOpen: boolean; kindsOpen?: boolean; spot: boolean }): 'kinds' | 'layers' | 'spot' | 'leave' {
  if (o.kindsOpen) return 'kinds';
  if (o.layersOpen) return 'layers';
  return o.spot ? 'spot' : 'leave';
}

/** Explore takes the hardware Back while a town's page is up or the kinds panel is open, on the page near you too (explore-settings audit 1). */
export function claimsBack(o: { townPage: boolean; kindsOpen: boolean }): boolean {
  return o.townPage || o.kindsOpen;
}

/** ES4, ES5: the two map panels, Layers and What I'm into, are never open together; pressing a button opens its panel or, if open, closes it. */
export function panelsAfter(open: { layers: boolean; kinds: boolean }, pressed: 'layers' | 'kinds'): { layers: boolean; kinds: boolean } {
  return pressed === 'kinds' ? { layers: false, kinds: !open.kinds } : { layers: !open.layers, kinds: false };
}

/** Whole-towns audit 9: what a tap on Explore's map does: close the Layers panel, clear the long press, zoom to a dot, or nothing. One thing a tap. */
export function tapDoes(o: { panelOpen: boolean; kindsOpen?: boolean; spot: boolean; dot: boolean }): 'close-panel' | 'clear-spot' | 'zoom' | 'none' {
  if (o.panelOpen || o.kindsOpen) return 'close-panel';
  if (o.spot) return 'clear-spot';
  return o.dot ? 'zoom' : 'none';
}
