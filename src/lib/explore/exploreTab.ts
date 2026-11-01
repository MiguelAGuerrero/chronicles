import { categoryOf } from '../discovery/categories';
import { distanceM } from '../geo';
import type { LandingRow } from '../landing/view';
import type { LngLat } from '../types';
import type { ChecklistArea, ChecklistItem, Find } from './explore';

/** How far around the middle of the view the Explore tab looks for an area (the reach of a read). */
export const VIEW_REACH_M = 1500;

/** What Explore's drawer shows for the area in view (NV14, NV16): names only, never a count. */
export interface AreaInView {
  /** The checklist area nearest the middle of the view, or a remembered busy area's top name. */
  name: string | null;
  /** The busy streets of the remembered area nearest the view. */
  streets: string[];
  /** The kinds of place still to find here, unnamed until found on a walk. */
  toFind: string[];
  /** Places found here, by name. */
  found: string[];
}

function nearest<T>(rows: T[], at: (r: T) => LngLat, from: LngLat, within: number): T | null {
  let best: T | null = null;
  let bestD = within;
  for (const r of rows) {
    const d = distanceM(at(r), from);
    if (d <= bestD) [best, bestD] = [r, d];
  }
  return best;
}

/** Pure: the area around `center` from what is stored, for the Explore drawer. */
export function areaInView(center: LngLat, areas: ChecklistArea[], landings: LandingRow[], items: ChecklistItem[], finds: Find[]): AreaInView {
  const area = nearest(areas, (a) => a.at, center, VIEW_REACH_M);
  const landing = nearest(landings, (l) => l.centre, center, VIEW_REACH_M);
  const streets = landing ? [...new Set(landing.analysis.strips.map((s) => s.name))] : [];
  const near = (at: LngLat) => distanceM(at, center) <= VIEW_REACH_M;
  const found = new Set(finds.map((f) => f.key));
  const toFind = [...new Set(items.filter((i) => near(i.at) && !found.has(i.key)).map((i) => categoryOf(i.category).label))];
  const foundNames = [...new Set(finds.filter((f) => near(f.at)).map((f) => f.name))];
  const name = area?.name ?? landing?.analysis.pockets[0]?.name ?? streets[0] ?? null;
  return { name, streets, toFind, found: foundNames };
}

/** A mark on the Explore tab's map (NV14): an unfound place is a "?", a find shows what it is. */
export interface TabMark {
  id: string;
  at: LngLat;
  revealed: boolean;
  found?: boolean;
  icon: string;
  name: string;
  category: string;
}

export function tabMarks(items: ChecklistItem[], finds: Find[]): TabMark[] {
  const found = new Map(finds.map((f) => [f.key, f]));
  const out: TabMark[] = items.map((i) => {
    const f = found.get(i.key);
    const c = categoryOf(i.category);
    return { id: i.key, at: i.at, revealed: !!f, found: !!f, icon: c.icon, name: f ? f.name : i.name, category: c.label };
  });
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
