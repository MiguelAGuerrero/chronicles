// @layer shell
import { distanceM } from '../geo';
import type { StreetSegment, LngLat } from '../types';
import { matchesAny, type Candidate, type Want } from './candidates';
import type { Area } from './areas';
import { planJourneys, type Journey } from './journeys';
import { LEANINGS, MIXED } from './leanings';
import { outingCandidates, type TileShop } from './storesMerge';
import { readStores, type StoresSource } from './storesRead';
import { planOuting, planStops, type Outing, type OutingReason } from './plan';
import { swapCandidate } from './swap';
import { legOver } from '../walkPlanner/service';

/*
 * The outing's reads and plans (QC7, QC21, QC24, QC29): when an entry is picked, the tiles around the walker and, only then, the stores
 * pack; the routes; a swap; and a stop's name looked up from the data at a tap or on arrival. Nothing is read before a pick and nothing
 * is kept: a session is the page's own memory and goes with it.
 */

/** How far around the walker is read: a loop's farthest stop is half the ceiling away, and the ceiling is at most 5 km. */
export const READ_M = 2600;

export interface OutingDeps {
  /** The shops (the tiles' places with their presence classes) and the streets around a point; null when there is no map. */
  read(at: LngLat, radiusM: number): Promise<{ shops: TileShop[]; segments: StreetSegment[]; spots?: Candidate[] } | null>;
  /** The stores pack by tile; null until a pack is published (QC14). */
  stores: StoresSource | null;
}

export interface Session {
  from: LngLat;
  shops: TileShop[];
  stores: Awaited<ReturnType<typeof readStores>>;
  segments: StreetSegment[];
  /** OJ38: the attractions around the same point, as candidates beside the shops. */
  spots: Candidate[];
}

export interface PlanRequest {
  session: Session;
  picked: readonly Want[];
  mode: 'loop' | 'oneway';
  ceilingM: number;
  chains: boolean;
}

export interface PlanAnswer {
  outing: Outing | null;
  reasons: OutingReason[];
  cands: Candidate[];
}

const candsOf = (s: Session, chains: boolean): Candidate[] => [...outingCandidates(s.stores, s.shops, { chains }), ...s.spots];

export function createOutingService(deps: OutingDeps) {
  return {
    /** QC29: reads only when something is picked; with nothing, nothing is read and no session exists. */
    async open(from: LngLat | null, picked: readonly Want[]): Promise<Session | null> {
      if (!from || !picked.length) return null;
      const read = await deps.read(from, READ_M).catch(() => null);
      if (!read) return null;
      const stores = await readStores(deps.stores, from, READ_M);
      return { from, shops: read.shops, stores, segments: read.segments, spots: read.spots ?? [] };
    },

    plan(req: PlanRequest): PlanAnswer {
      const cands = candsOf(req.session, req.chains);
      if (!req.session.segments.length) return { outing: null, reasons: ['noRoute'], cands };
      const r = planOuting({ cands, match: (c) => matchesAny(req.picked, c), from: req.session.from, mode: req.mode, ceilingM: req.ceilingM }, legOver(req.session.segments));
      return { ...r, cands };
    },

    /**
     * OJ17, OJ38, OJ44: the journeys for the picked chips over every area read, each with its own shops, attractions and streets:
     * around where you stand is one area, a reach or a way toward a place several, and the planner is the same.
     */
    journeys(req: { reads: readonly { area: Area; session: Session }[]; origin: LngLat | null; picked: readonly Want[]; ceilingM: number; chains: boolean; toward: boolean; salts?: Readonly<Record<string, number>> }): { journeys: Journey[]; reasons: OutingReason[] } {
      const areas = req.reads.map((r) => ({ area: r.area, from: r.session.from, cands: candsOf(r.session, req.chains), leg: legOver(r.session.segments) }));
      return planJourneys({ areas, origin: req.origin, picked: req.picked, leanings: LEANINGS, mixed: MIXED, ceilingM: req.ceilingM, toward: req.toward, salts: req.salts });
    },

    /** The candidates of one read, for a swap in its chapter. */
    candidates: (session: Session, chains: boolean): Candidate[] => candsOf(session, chains),

    /**
     * QC21: the stop at `index` replaced by the nearest other store not held and not offered for that slot, the stops routed again; a
     * store that no longer fits the ceiling is passed over and counted as offered. None left: null, and the caller says so.
     */
    swap(req: PlanRequest & { outing: Outing; cands: readonly Candidate[]; index: number; offered: ReadonlySet<string> }): { outing: Outing | null; offered: string[] } {
      const leg = legOver(req.session.segments);
      const offered = new Set(req.offered);
      const gone: string[] = [];
      for (;;) {
        const next = swapCandidate(req.outing.stops[req.index], req.outing.stops, req.cands, (c) => matchesAny(req.picked, c), req.session.from, req.ceilingM, offered);
        if (!next) return { outing: null, offered: gone };
        offered.add(next.id);
        gone.push(next.id);
        const stops = req.outing.stops.map((s, i) => (i === req.index ? next : s));
        const outing = planStops(stops, req.session.from, req.mode, req.ceilingM, leg);
        if (outing) return { outing, offered: gone };
      }
    },

    /** Start (QC22; as WP24): the same stops ordered and routed again from where the walker is now; null when they no longer fit. */
    again(req: PlanRequest & { stops: readonly Candidate[]; from: LngLat }): Outing | null {
      return planStops(req.stops, req.from, req.mode, req.ceilingM, legOver(req.session.segments));
    },

    /** QC24: the name of the shop at a stop's position, from the data now (a tap or arrival); never stored. */
    async nameNear(at: LngLat, chains: boolean): Promise<string | null> {
      const read = await deps.read(at, 150).catch(() => null);
      const stores = await readStores(deps.stores, at, 150);
      const cands = [...outingCandidates(stores, read?.shops ?? [], { chains }), ...(read?.spots ?? [])];
      let best: Candidate | null = null;
      for (const c of cands) if (distanceM(c.at, at) <= 60 && (!best || distanceM(c.at, at) < distanceM(best.at, at))) best = c;
      return best?.name ?? null;
    },
  };
}

export type OutingService = ReturnType<typeof createOutingService>;
