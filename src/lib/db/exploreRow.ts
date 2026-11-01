import type { PlaceCandidate } from '../areas/types';
import type { CategoryId, Kind } from '../discovery/types';
import type { ChecklistArea, ChecklistItem, ExploreRead, Find } from '../explore/explore';

/** Explore's rows as SQLite stores them (E13); pure, so a test can round-trip them. */
export type AreaRow = Omit<ChecklistArea, 'at'> & { lon: number; lat: number };
export type ItemRow = { key: string; area_key: string | null; name: string; category: CategoryId; kind: Kind; lon: number; lat: number; generic: number };
export type FindRow = Omit<ItemRow, 'area_key'> & { area_key: string | null; walk_id: string | null; capture_id: string; found_at: number };
export type ReadRow = { key: string; lon: number; lat: number; build: string; read_at: number; candidates: string };

export const areaToRow = ({ at, ...a }: ChecklistArea): AreaRow => ({ ...a, lon: at[0], lat: at[1] });
export const areaFromRow = ({ lon, lat, ...r }: AreaRow): ChecklistArea => ({ ...r, at: [lon, lat] });

export const itemToRow = ({ at, generic, ...i }: ChecklistItem): ItemRow => ({ ...i, lon: at[0], lat: at[1], generic: generic ? 1 : 0 });
export const itemFromRow = ({ lon, lat, generic, ...r }: ItemRow): ChecklistItem => ({ ...r, at: [lon, lat], generic: generic === 1 });

export const findToRow = ({ at, generic, ...f }: Find): FindRow => ({ ...f, lon: at[0], lat: at[1], generic: generic ? 1 : 0 });
export const findFromRow = ({ lon, lat, generic, ...r }: FindRow): Find => ({ ...r, at: [lon, lat], generic: generic === 1 });

export const readToRow = ({ centre, candidates, ...r }: ExploreRead): ReadRow => ({ ...r, lon: centre[0], lat: centre[1], candidates: JSON.stringify(candidates) });
export const readFromRow = ({ lon, lat, candidates, ...r }: ReadRow): ExploreRead => ({ ...r, centre: [lon, lat], candidates: JSON.parse(candidates) as PlaceCandidate[] });
