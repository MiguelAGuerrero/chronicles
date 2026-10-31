import type { CategoryId, Place } from '../discovery/types';

/** A place as SQLite stores it; pure, so a test can round-trip it (audit: `markable` was lost on native). */
export type PlaceRow = { key: string; name: string; category: CategoryId; lon: number; lat: number; generic: number; build: string; markable: number | null };

export const placeToRow = (p: Place): PlaceRow => ({
  key: p.key, name: p.name, category: p.category, lon: p.at[0], lat: p.at[1], generic: p.generic ? 1 : 0, build: p.build,
  markable: p.markable == null ? null : p.markable ? 1 : 0,
});

export const placeFromRow = ({ lon, lat, generic, markable, ...r }: PlaceRow): Place => ({
  ...r, at: [lon, lat], generic: generic === 1, ...(markable == null ? {} : { markable: markable === 1 }),
});
