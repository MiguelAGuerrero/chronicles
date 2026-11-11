// @layer shell
import { boundsOf, distanceToLinesM } from '../geo';
import type { Ports } from '../ports/types';
import { nearbyPlaces, placeEntries, REF_RULES, timeEntries, type KeywordEntry, type NearPlace } from '../refKeywords';
import type { LngLat } from '../types';

/** How long a place read may take before the palette goes on without it (RK14). */
export const REF_READ_MS = 2500;

/** The device's offset from UTC at a moment, in minutes: core takes it as an argument. */
const offsetAt = (t: number) => -new Date(t).getTimezoneOffset();

/**
 * Reference keywords' resolver (specs/reference-keywords, RK4, RK11, RK14, RK15). It is handed a fix and never asks for
 * one; it reads only the places and streets the app already cached (`db.placesIn`, `db.getSegmentsIn`), so nothing
 * leaves the device; and a slow or failed read leaves the palette with what it has, never blocking typing.
 */
export function createRefResolver(p: Pick<Ports, 'db'>, o: { readMs?: number; offsetOf?: (t: number) => number } = {}) {
  const readMs = o.readMs ?? REF_READ_MS;
  const offsetOf = o.offsetOf ?? offsetAt;

  /** A read that gives up after `readMs` and answers `none` on a failure: nothing here ever rejects. */
  const within = <T,>(read: Promise<T>, none: T): Promise<T> =>
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(none), readMs);
      read.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        () => {
          clearTimeout(timer);
          resolve(none);
        },
      );
    });

  /** The moment's own fix wins: its saved one, else the stamp the editor holds (RK4, RK13). */
  const fixOf = (f: { saved: LngLat | null; stamp: LngLat | null }): LngLat | null => f.saved ?? f.stamp;

  const near = async (fix: LngLat): Promise<{ places: NearPlace[]; street: string | null }> => {
    const box = boundsOf([fix], REF_RULES.listM)!;
    const [places, street] = await Promise.all([
      within(
        p.db.placesIn(box).then((ps) => ps.filter((x) => x.markable !== false && !x.generic).map((x) => ({ name: x.name, at: x.at }))),
        [] as NearPlace[],
      ),
      within(
        p.db.getSegmentsIn(box).then((segs) => {
          const named = segs.filter((s) => s.name).map((s) => ({ name: s.name as string, d: distanceToLinesM(fix, s.geometry) }));
          named.sort((a, b) => a.d - b.d);
          return named[0] && named[0].d <= REF_RULES.hereM ? named[0].name : null;
        }),
        null as string | null,
      ),
    ]);
    return { places, street };
  };

  return {
    /** The time words at once (RK14); they need only the moment's time. */
    timeEntries: (t: number, minutesIn: number | null = null): KeywordEntry[] => timeEntries(t, offsetOf(t), minutesIn),
    /** The place entries once the read answers; with no fix, or a failed read, only "over there" (RK6). */
    async placeEntries(f: { saved: LngLat | null; stamp: LngLat | null }): Promise<KeywordEntry[]> {
      const fix = fixOf(f);
      if (!fix) return placeEntries({ fix: null, places: [], street: null });
      return placeEntries({ fix, ...(await near(fix)) });
    },
    /** The resolution picker's places (RK18): by distance, in words. */
    async nearby(f: { saved: LngLat | null; stamp: LngLat | null }): Promise<{ name: string; at: LngLat; how: string }[]> {
      const fix = fixOf(f);
      if (!fix) return [];
      return nearbyPlaces(fix, (await near(fix)).places);
    },
  };
}
