// @layer core
/**
 * What is said over the map while a replay is told: a passed place's whisper as the walker goes by (RR15), and the
 * names of the places passed on the last view (replay ceremony RC25). When one is up, on which side of its place it
 * stands and how wide, and whether the last view's names can each stand beside their place or are said as the card's
 * one line: decisions about the frame, so they are made here, once, when the telling is planned. The stage's poses
 * (`components/ceremony/layout`) place what this says with the same arithmetic.
 *
 * `replay-ceremony ui 12` to `ui 14` are the owner's defaults, Nov 20: ordinary convention (one snackbar at a time; a
 * label beside its line, not on it; a prompt never over what it names).
 */
import type { LngLat } from '../types';
import { project, type Camera } from './camera';
import { PICTURE, stackEdge, STAGE_BOTTOM, type StageRoom } from './room';

/**
 * A whisper's room (`replay-ceremony ui 5`): its box (three lines at the most, its words at the edge nearer its
 * place) and how far it keeps from its place and from the line, clear of the walker's dot. Beside a way that runs up
 * or down the screen (ui 13) it keeps `side` from the line, clear of a picture standing on it (half its tile and 6 to
 * spare), and is never narrower than `min`.
 */
export const WHISPER = { width: 190, height: 60, gap: 14, side: PICTURE.size / 2 + 6, min: 120 } as const;
/** The room a passed place's name has on the last view (RC25): its box (three lines of body text at the most), the name at the edge nearer its place. */
export const PASSED = { width: 260, height: 72, gap: 9, dot: 10 } as const;

/**
 * The room across the screen for what is said over the map (a whisper, the last view's names): 8 px in from each edge,
 * and short of the stack's column while the stack is up (`replay-ceremony ui 3`), as a card and the bubbles' corner are.
 */
export const saidRoom = (c: StageRoom, stack: boolean) => ({ left: 8, right: stack ? Math.min(c.width - 8, stackEdge(c)) : c.width - 8 });
/** As wide as the screen lets a name's room be: 8 px in from each edge on a narrow phone, less the stack's column while it is up. */
export const passedWidth = (c: StageRoom, stack = false) => {
  const room = saidRoom(c, stack);
  return Math.min(PASSED.width, room.right - room.left);
};

/**
 * Which whispers are said together (`replay-ceremony ui 12`): one at a time, as snackbars are. A whisper is up for
 * `life` ms from its start. The replay crosses ground fast, so two places a hundred metres apart arrive well under a
 * second apart: one that would arrive while another is still up is said with it, as one line, once, when the walker
 * reaches the last of them (as a walk's more than two already are, RP19). No line is cut short and two never stand
 * over one another. Each group lists its whispers in the order they arrive; of two that start together the later
 * listed is the later.
 */
export function whisperGroups(starts: readonly number[], life: number): number[][] {
  const order = starts.map((_, i) => i).sort((a, b) => starts[a] - starts[b] || a - b);
  const groups: number[][] = [];
  for (const i of order) {
    const g = groups[groups.length - 1];
    if (g && starts[i] - starts[g[g.length - 1]] < life) g.push(i);
    else groups.push([i]);
  }
  return groups;
}

/** How far a way must run up or down the screen, for each metre across it, before a whisper stands beside it. */
const STEEP = 2;

/**
 * Whether a whisper stands beside the line and not under its place (`replay-ceremony ui 13`), and how wide its room is
 * then. Where the way runs up or down the screen as the place is passed (`before` and `after`: the walker a little
 * either side of it, on a flat north-up map), a box under the place lies across the walked line behind the walker; a
 * label goes beside its line. The stack is at the right, so its room is at the left: from the screen's edge to `side`
 * short of the line and the place, as the camera has them when it arrives. Under `min` of room, or with no camera to
 * go by, it keeps the place ui 5 gave it (undefined).
 */
export function whisperBeside(o: { screen: StageRoom; camera: Camera | null; at: LngLat; by: LngLat; before: LngLat | null; after: LngLat | null }): number | undefined {
  if (!o.before || !o.after || !o.camera) return undefined;
  const north = Math.abs(o.after[1] - o.before[1]);
  const east = Math.abs(o.after[0] - o.before[0]) * Math.cos((o.by[1] * Math.PI) / 180);
  if (north <= STEEP * east) return undefined;
  const p = project(o.screen, o.camera, o.at);
  const by = project(o.screen, o.camera, o.by);
  if (!p || !by) return undefined;
  const room = Math.min(p[0], by[0]) - WHISPER.side - saidRoom(o.screen, false).left;
  return room >= WHISPER.min ? Math.min(WHISPER.width, room) : undefined;
}

/** A place passed, as the last view may name it: its own words, where it stands, and where the walker passed it. */
export interface NameAsk {
  key: string;
  text: string;
  at: LngLat;
  by: LngLat | null;
}

/**
 * What the last view says of the places passed: a name beside its place (`above`: over it, not under), or the one
 * line for them all, beside no place (`at` null), `top` px down the screen where the telling can say (else under the
 * top row).
 */
export interface Named {
  key: string;
  text: string;
  at: LngLat | null;
  by: LngLat | null;
  above: boolean;
  top?: number;
}

/**
 * Where a name's room stands on the last view (replay ceremony RC25): centred on its place, under the lower of the
 * place and the line where the walker passed it, or over the higher of the two (`above`), kept on the screen and short
 * of the stack while that is up. The one line, beside no place, stands where the telling put it (`top`), or with
 * nothing said, under the top row, the `index`th down.
 */
export function nameRoom(o: Pick<Named, 'at' | 'by' | 'above' | 'top'>, c: StageRoom, view: Camera, index: number, stack: boolean): { left: number; top: number } {
  const p = o.at ? project(c, view, o.at) : null;
  const room = saidRoom(c, stack);
  const width = passedWidth(c, stack);
  if (!p) return { left: room.left + (room.right - room.left - width) / 2, top: o.top ?? c.insets.top + 12 + 48 + 8 + index * (PASSED.height + 4) };
  const by = (o.by ? project(c, view, o.by) : null) ?? p;
  return {
    left: Math.max(room.left, Math.min(room.right - width, p[0] - width / 2)),
    top: o.above ? Math.min(p[1], by[1]) - PASSED.gap - PASSED.height : Math.max(p[1], by[1]) + PASSED.gap,
  };
}

type Rect = { left: number; top: number; right: number; bottom: number };
const meets = (a: Rect, b: Rect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
/** Whether the straight way from `a` to `b` passes through a box. */
function crosses(a: readonly [number, number], b: readonly [number, number], r: Rect): boolean {
  // Liang-Barsky: the part of the segment inside each pair of edges.
  let t0 = 0;
  let t1 = 1;
  const d = [b[0] - a[0], b[1] - a[1]];
  const edges: [number, number][] = [[-d[0], a[0] - r.left], [d[0], r.right - a[0]], [-d[1], a[1] - r.top], [d[1], r.bottom - a[1]]];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * A name's words as drawn, near enough (no text is measured in the core): body text at 15 px, about 8 px a letter, in
 * lines of 20 with the ground's own padding; kept a little wide, so a name is never thought clear when it is not.
 */
const NAME_TEXT = { letter: 8.2, pad: 18, line: 20, edge: 8 } as const;
/** Half the walked line's width and a little: what a name keeps from the line. */
const LINE_CLEAR = 4;
/** An end marker's or the walker's reach about the line's own end. */
const MARK = 10;

function nameBox(n: Named, c: StageRoom, view: Camera, stack: boolean): Rect {
  const width = passedWidth(c, stack);
  const room = nameRoom(n, c, view, 0, stack);
  const text = n.text.length * NAME_TEXT.letter;
  const lines = Math.max(1, Math.ceil(text / (width - NAME_TEXT.pad)));
  const w = lines > 1 ? width : Math.min(width, text + NAME_TEXT.pad);
  const h = Math.min(PASSED.height, lines * NAME_TEXT.line + NAME_TEXT.edge);
  const left = room.left + (width - w) / 2;
  // Its words hang from the room's top, or stand on its foot when it is over its place.
  const top = n.above ? room.top + PASSED.height - h : room.top;
  return { left, top, right: left + w, bottom: top + h };
}

/**
 * What the last view names (replay ceremony RC25; `replay-ceremony ui 14`). One or two places are each named beside
 * their own place, where every name stands clear of the walk's line, of the pictures standing on it and of the other
 * name: under its place first, the more northern of two over it, then the other ways round. Where they cannot (a
 * narrow screen, pictures all along the walk), and for more than two (RP19), they are said as the card's one line,
 * clear of the walk: under it where the screen has the room, else over it and what stands on it, else under the top
 * row as before. With no view to go by (nothing frames the whole), one or two are named beside their places unasked.
 */
export function lastNames(o: { screen: StageRoom; view: Camera | null; names: readonly NameAsk[]; line: string; paths: readonly (readonly LngLat[])[]; pictures: readonly LngLat[]; stack: boolean }): Named[] {
  const { screen, view } = o;
  if (!o.names.length) return [];
  const few = o.names.length <= 2;
  // Of two, the more northern stands over its place, so two close together never share their room.
  const north = o.names.length > 1 ? Math.max(...o.names.map((n) => n.at[1])) : null;
  const first = o.names.findIndex((n) => n.at[1] === north);
  const sides = o.names.map((_, i) => i === first);
  const each = (above: boolean[]): Named[] => o.names.map((n, i) => ({ ...n, above: above[i] }));
  const one: Named = { key: 'passed', text: o.line, at: null, by: null, above: false };
  if (!view || !view.center || view.zoom == null) return few ? each(sides) : [one];
  const lines = o.paths.map((path) => path.map((pt) => project(screen, view, pt) as [number, number]));
  if (few) {
    const half = PICTURE.size / 2;
    const tiles: Rect[] = o.pictures.map((pt) => {
      const [x, y] = project(screen, view, pt) as [number, number];
      return { left: x - half, top: y - PICTURE.lift - half, right: x + half, bottom: y - PICTURE.lift + half };
    });
    const clear = (r: Rect) => {
      if (tiles.some((t) => meets(t, r))) return false;
      const wide = { left: r.left - LINE_CLEAR, top: r.top - LINE_CLEAR, right: r.right + LINE_CLEAR, bottom: r.bottom + LINE_CLEAR };
      for (const l of lines) for (let k = 1; k < l.length; k++) if (crosses(l[k - 1], l[k], wide)) return false;
      return true;
    };
    const tries = o.names.length === 1 ? [[false], [true]] : [sides, [false, false], [true, true], sides.map((x) => !x)];
    for (const above of tries) {
      const named = each(above);
      const boxes = named.map((n) => nameBox(n, screen, view, o.stack));
      if (boxes.every(clear) && (boxes.length < 2 || !meets(boxes[0], boxes[1]))) return named;
    }
  }
  // The one line, clear of the walk: under its lowest point, or over its highest and a picture's height.
  let foot = -Infinity;
  let head = Infinity;
  for (const l of lines) for (const [, y] of l) {
    if (y > foot) foot = y;
    if (y < head) head = y;
  }
  if (foot === -Infinity) return [one];
  const under = foot + MARK + PASSED.gap;
  if (under + PASSED.height <= screen.height - screen.insets.bottom - STAGE_BOTTOM) return [{ ...one, top: under }];
  const over = head - (o.pictures.length ? PICTURE.lift + PICTURE.size / 2 : MARK) - PASSED.gap - PASSED.height;
  if (over >= screen.insets.top + 12 + 48 + 8) return [{ ...one, top: over, above: true }];
  return [one];
}
