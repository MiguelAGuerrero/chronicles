// @layer core
import type { LngLat } from './types';

/** What the rule needs of a mark: where it is and what it would write under itself. */
export interface NamedMark {
  id: string;
  at: LngLat;
  name: string;
  /** Shows its name at all (revealed, not found, not faint). */
  named: boolean;
}

const NAME_MAX_W = 140;
const CHAR_W = 7;
const LINE_H = 15;
const HEAD_W = 36;
const HEAD_H = 44;
/** The head's drawn square (34 px under a 2 px edge) sits at the top of its 44 px box: its middle is this far up. */
const HEAD_MID_UP = HEAD_H - 17;
/** Slack for a map that judges at a zoom a little off the one drawn (native steps by 0.25). */
const PAD = 6;
/** A pin's tap room (`pinHit`, and the web button's padding): the head and 6 px either side, 4 above. */
const HIT_W = HEAD_W + 12;
const HIT_H = HEAD_H + 4;
/** A spread row's pitch: tap rooms with 8 px between them (Material's spacing between targets; fix mark-overlap audit 5). */
const PITCH = HIT_W + 8;
/** A row takes in at most this many marks, each point within a tap room of the row's middle (audit 2): a chain along a
 * street pairs off instead of growing one row of any length. */
const ROW_MAX = 4;
/** How far a spread row stands above the highest of its points, so every leg runs down to its own point. */
const LIFT = 12;
/** A name beside a head keeps this far from it. */
const NAME_GAP = 4;

interface Box { x0: number; y0: number; x1: number; y1: number }

const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * Screen pixels at a zoom (512 px tiles, as MapLibre), turned as the map is: `bearing` degrees is up. A marker's
 * offset is in screen pixels, so a row is laid out on the turned screen (fix mark-overlap audit 1).
 */
function px([lng, lat]: LngLat, zoom: number, bearing = 0): [number, number] {
  const s = 512 * 2 ** zoom;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const wx = (lng / 360) * s;
  const wy = (0.5 - y / (2 * Math.PI)) * s;
  if (!bearing) return [wx, wy];
  const t = (-bearing * Math.PI) / 180;
  return [wx * Math.cos(t) - wy * Math.sin(t), wx * Math.sin(t) + wy * Math.cos(t)];
}

/**
 * Where a mark stands when it shares its spot (fix mark-overlap): its head moved `dx`, `dy` screen px off its point,
 * with a leg drawn back to a dot on the point, and its name, if any, beside it on `side`. `null`: in the middle of a
 * row, where a name beside it would run over its neighbours, so the name is only spoken.
 */
export interface MarkSpread {
  dx: number;
  dy: number;
  side: 'left' | 'right' | null;
}

/** What a spread changes on screen, for redrawing a mark in place when only its place in a row moves. */
export const spreadKey = (s?: MarkSpread): string => (s ? `${s.dx},${s.dy},${s.side ?? ''}` : '');

const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Marks whose tap rooms would overlap at this zoom stand side by side in one row instead, as Leaflet's spiderfy fans a
 * pile on legs to its point (never a count, nothing hidden): the row centred on its points, a little above the highest,
 * in the order the points run left to right. A row that would land on another mark takes it in, while the row stays
 * short (`ROW_MAX`, every point within a pitch of its middle); a row that still lands on a mark it could not take in
 * goes back to its points, so the overlap is left as the points have it.
 * Grouped in id order, so the order the marks arrive in never changes the layout (audit 3). Tens of marks at most
 * (`visibleMarks`: 8 near, 20 on a route), so the pairwise passes stay cheap.
 */
function spreadRows(input: readonly { id: string; x: number; y: number }[]): Map<string, MarkSpread> {
  let groups = [...input].sort(byId).map((p) => [p]);
  const place = (g: typeof groups[number]) => {
    if (g.length === 1) return [{ p: g[0], x: g[0].x, y: g[0].y, i: 0 }];
    const row = [...g].sort((a, b) => a.x - b.x || byId(a, b));
    const cx = row.reduce((t, p) => t + p.x, 0) / row.length;
    const y = Math.min(...row.map((p) => p.y)) - LIFT;
    return row.map((p, i) => ({ p, x: cx + (i - (row.length - 1) / 2) * PITCH, y, i }));
  };
  const short = (g: typeof groups[number]) => {
    if (g.length > ROW_MAX) return false;
    const cx = g.reduce((t, p) => t + p.x, 0) / g.length;
    const cy = g.reduce((t, p) => t + p.y, 0) / g.length;
    return g.every((p) => Math.abs(p.x - cx) <= PITCH && Math.abs(p.y - cy) <= PITCH);
  };
  const clash = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < HIT_W && Math.abs(a.y - b.y) < HIT_H;
  for (;;) {
    const placed = groups.map(place);
    let merge: [number, number] | null = null;
    for (let g = 0; g < placed.length && !merge; g++)
      for (let h = g + 1; h < placed.length && !merge; h++)
        if (placed[g].some((a) => placed[h].some((b) => clash(a, b))) && short([...groups[g], ...groups[h]])) merge = [g, h];
    if (!merge) {
      // A row still standing in the tap room of a mark it could not take in goes back to its points, the last first, until
      // none does: a spread is never worse than the points (fix mark-overlap audits 7, 8).
      const lands = (g: number) => placed[g].length > 1 && placed.some((other, h) => h !== g && placed[g].some((a) => other.some((b) => clash(a, b))));
      for (let g = placed.length - 1; g >= 0; g--) {
        if (!lands(g)) continue;
        placed.splice(g, 1, ...placed[g].map((s) => [{ ...s, x: s.p.x, y: s.p.y, i: 0 }]));
        g = placed.length;
      }
      const out = new Map<string, MarkSpread>();
      for (const row of placed) {
        if (row.length < 2) continue;
        for (const s of row)
          out.set(s.p.id, { dx: Math.round(s.x - s.p.x), dy: Math.round(s.y - s.p.y), side: s.i === 0 ? 'left' : s.i === row.length - 1 ? 'right' : null });
      }
      return out;
    }
    const [g, h] = merge;
    groups = [...groups.filter((_, k) => k !== g && k !== h), [...groups[g], ...groups[h]]];
  }
}

/** A name's box: under the head, or beside it on a spread row's outer side. */
function nameBox(x: number, y: number, name: string, side: 'left' | 'right' | 'below'): Box {
  const w = Math.min(NAME_MAX_W, name.length * CHAR_W);
  const lines = Math.max(1, Math.ceil((name.length * CHAR_W) / NAME_MAX_W));
  if (side === 'below') return { x0: x - w / 2 - PAD, x1: x + w / 2 + PAD, y0: y + 2, y1: y + 2 + lines * LINE_H + PAD };
  const mid = y - HEAD_MID_UP;
  const half = (lines * LINE_H) / 2 + PAD;
  const near = HEAD_W / 2 + NAME_GAP;
  return side === 'left'
    ? { x0: x - near - w - PAD, x1: x - near, y0: mid - half, y1: mid + half }
    : { x0: x + near, x1: x + near + w + PAD, y0: mid - half, y1: mid + half };
}

/**
 * Ids of the marks whose name stays off the map because it would be written over another mark's
 * name or head: names that stack are unreadable. The lower id wins, so a walk's changing order never swaps them; a hidden name is still in the
 * pin's spoken label, and zooming in brings it back as the marks part. Heads and names are judged where they stand,
 * a spread mark's moved off its point.
 */
function hiddenNames(marks: readonly NamedMark[], zoom: number, bearing: number, spread: ReadonlyMap<string, MarkSpread>): Set<string> {
  const placed = [...marks].sort(byId).map((m) => {
    const [px0, py0] = px(m.at, zoom, bearing);
    const s = spread.get(m.id);
    const x = px0 + (s?.dx ?? 0);
    const y = py0 + (s?.dy ?? 0);
    const head: Box = { x0: x - HEAD_W / 2, x1: x + HEAD_W / 2, y0: y - HEAD_H, y1: y };
    const name = s && !s.side ? null : nameBox(x, y, m.name, s?.side ?? 'below');
    return { m, head, name };
  });
  const hidden = new Set<string>();
  const kept: Box[] = [];
  for (const p of placed) {
    if (!p.m.named) continue;
    const box = p.name;
    if (!box || kept.some((k) => hit(k, box)) || placed.some((o) => o !== p && hit(o.head, box))) hidden.add(p.m.id);
    else kept.push(box);
  }
  return hidden;
}

/**
 * The marks as drawn at this zoom and bearing: `spread` where their heads would cover each other (fix mark-overlap),
 * `nameHidden` where their names would stack. The same objects when neither happens. `spread: false` for a map that
 * lays its pins out itself (Explore's "?" by `halfZoom`, WT12; audit 4).
 */
export function declutterMarks<T extends { id: string; at: LngLat; name: string; revealed: boolean; found?: boolean; faint?: boolean }>(
  marks: readonly T[],
  zoom: number,
  { bearing = 0, spread: spreading = true }: { bearing?: number; spread?: boolean } = {},
): (T & { nameHidden?: boolean; spread?: MarkSpread })[] {
  // A found mark is small and lets taps through to the moment beside it: it stays on its point.
  const spread = spreading
    ? spreadRows(marks.filter((m) => !m.found).map((m) => {
        const [x, y] = px(m.at, zoom, bearing);
        return { id: m.id, x, y };
      }))
    : new Map<string, MarkSpread>();
  const hidden = hiddenNames(
    marks.map((m) => ({ id: m.id, at: m.at, name: m.name, named: m.revealed && !m.faint && !m.found })),
    zoom,
    bearing,
    spread,
  );
  if (!hidden.size && !spread.size) return [...marks];
  return marks.map((m) => {
    const s = spread.get(m.id);
    const h = hidden.has(m.id);
    return s || h ? { ...m, ...(h ? { nameHidden: true } : {}), ...(s ? { spread: s } : {}) } : m;
  });
}

/** What a "?" mark shows, as `markListKey` reads it (MarkPin's fields; the type lives with its view). */
export interface ShownMark {
  id: string;
  at: LngLat;
  revealed: boolean;
  found?: boolean;
  foundKind?: string;
  faint?: boolean;
  nameHidden?: boolean;
  quiet?: boolean;
  name: string;
  category: string;
  icon: string;
}

/**
 * A key for a list of marks that changes only when what they show does (native map frames NF8): a screen hands
 * the map a new array on every fix, mostly the same marks. Every field a mark draws or says is in it, in drawn
 * order; a new array of the same marks is the same key. JSON, so no name can collide with a separator.
 */
export function markListKey(marks: readonly ShownMark[]): string {
  return JSON.stringify(
    marks.map((m) => [m.id, m.at[0], m.at[1], m.revealed, !!m.found, m.foundKind ?? '', !!m.faint, !!m.nameHidden, !!m.quiet, m.name, m.category, m.icon]),
  );
}
