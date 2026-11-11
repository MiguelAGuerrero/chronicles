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
/** Slack for a map that judges at a zoom a little off the one drawn (native steps by 0.25). */
const PAD = 6;

interface Box { x0: number; y0: number; x1: number; y1: number }

const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** Web-mercator pixels at a zoom (512 px tiles, as MapLibre). */
function px([lng, lat]: LngLat, zoom: number): [number, number] {
  const s = 512 * 2 ** zoom;
  const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [(lng / 360) * s, (0.5 - y / (2 * Math.PI)) * s];
}

/**
 * Ids of the marks whose name stays off the map because it would be written over another mark's
 * name or head: names that stack are unreadable. The lower id wins, so a walk's changing order never swaps them; a hidden name is still in the
 * pin's spoken label, and zooming in brings it back as the marks part.
 */
export function hiddenMarkNames(marks: readonly NamedMark[], zoom: number): Set<string> {
  const placed = [...marks].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map((m) => {
    const [x, y] = px(m.at, zoom);
    const w = Math.min(NAME_MAX_W, m.name.length * CHAR_W);
    const lines = Math.max(1, Math.ceil((m.name.length * CHAR_W) / NAME_MAX_W));
    const head: Box = { x0: x - HEAD_W / 2, x1: x + HEAD_W / 2, y0: y - HEAD_H, y1: y };
    const name: Box = { x0: x - w / 2 - PAD, x1: x + w / 2 + PAD, y0: y + 2, y1: y + 2 + lines * LINE_H + PAD };
    return { m, head, name };
  });
  const hidden = new Set<string>();
  const kept: Box[] = [];
  for (const p of placed) {
    if (!p.m.named) continue;
    const clash = kept.some((k) => hit(k, p.name)) || placed.some((o) => o !== p && hit(o.head, p.name));
    if (clash) hidden.add(p.m.id);
    else kept.push(p.name);
  }
  return hidden;
}

/** The marks with `nameHidden` set where their names would stack (same objects when none do). */
export function declutterMarks<T extends { id: string; at: LngLat; name: string; revealed: boolean; found?: boolean; faint?: boolean }>(
  marks: readonly T[],
  zoom: number,
): (T & { nameHidden?: boolean })[] {
  const hidden = hiddenMarkNames(
    marks.map((m) => ({ id: m.id, at: m.at, name: m.name, named: m.revealed && !m.faint && !m.found })),
    zoom,
  );
  return hidden.size ? marks.map((m) => (hidden.has(m.id) ? { ...m, nameHidden: true } : m)) : [...marks];
}
