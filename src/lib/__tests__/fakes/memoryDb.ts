import { staleAreas } from '../../areas/assign';
import type { Area, WalkArea } from '../../areas/types';
import { intersects, segmentBbox } from '../../db/segmentBounds';
import { DERIVED_STORES } from '../../db/stores';
import type { Db } from '../../db/types';
import type { Mark, Offered, Place, Recall } from '../../discovery/types';
import type { LandingRow } from '../../landing/view';
import type { Capture, Pause, StreetSegment, TracePoint, VisitedSegment, Walk, WalkSummary } from '../../types';

/** The `Db` methods that only read: left out of a fake's `effects()` log. */
export const DB_READS = [
  'getWalk', 'listWalks', 'getOpenWalk', 'getPoints', 'getCaptures', 'getCapturesByIds', 'capturesIn', 'getPauses',
  'listAreas', 'listWalkAreas', 'getSegmentsIn', 'getVisited', 'visitedSegmentIds', 'streetKeysBefore', 'listSummaries',
  'placesIn', 'listOffered', 'listMarks', 'listRecalls', 'listLandings', 'getMeta',
] as const;

/**
 * An in-memory `Db` for shell tests, matching the IndexedDB store's behavior
 * (`db/index.web.ts`); `dbContract.ts` checks the two against each other.
 * Rows are copied in and out, as a real store's are, so a caller mutating a
 * returned object changes nothing stored. A write that would fail part-way
 * (a duplicate id) fails before changing anything, like a transaction.
 */
export function memoryDb(): Db {
  const copy = <T>(v: T): T => structuredClone(v);
  const walks = new Map<string, Walk>();
  const points: TracePoint[] = [];
  const captures = new Map<string, Capture>();
  const pauses: Pause[] = [];
  const segments = new Map<string, StreetSegment>();
  const visited = new Map<string, VisitedSegment>(); // keyed `${segment_id}|${walk_id}`
  const summaries = new Map<string, WalkSummary>();
  const areas = new Map<string, Area>();
  const walkAreas = new Map<string, WalkArea>(); // keyed `${walk_id}|${area_key}`
  const places = new Map<string, Place>();
  const offered = new Map<string, Offered>();
  const marks = new Map<string, Mark>();
  const recalls = new Map<string, Recall>();
  const landings = new Map<string, LandingRow>();
  const meta = new Map<string, string>();

  const byT = <T extends { t: number }>(a: T, b: T) => a.t - b.t;
  const constraint = (what: string) => Object.assign(new Error(`Key already exists: ${what}`), { name: 'ConstraintError' });
  const putSegment = (s: StreetSegment) => segments.set(s.id, copy(s));

  const db: Db = {
    async createWalk(w) {
      if (walks.has(w.id)) throw constraint(`walk ${w.id}`);
      walks.set(w.id, copy(w));
    },
    async updateWalk(id, p) {
      const cur = walks.get(id);
      if (cur) walks.set(id, { ...cur, ...copy(p) });
    },
    async getWalk(id) {
      const w = walks.get(id);
      return w ? copy(w) : null;
    },
    async listWalks() {
      return [...walks.values()].map(copy).sort((a, b) => b.started_at - a.started_at);
    },
    async getOpenWalk() {
      return (await db.listWalks()).find((w) => w.open) ?? null;
    },

    async appendPoints(ps) {
      for (const p of ps) points.push(copy(p));
    },
    async getPoints(walkId) {
      return points.filter((p) => p.walk_id === walkId).map(copy).sort(byT);
    },

    async addCapture(c) {
      if (captures.has(c.id)) throw constraint(`capture ${c.id}`);
      captures.set(c.id, copy(c));
    },
    async updateCapture(id, p) {
      const cur = captures.get(id);
      if (cur) captures.set(id, { ...cur, ...copy(p) });
    },
    async getCaptures(walkId) {
      return [...captures.values()].filter((c) => c.walk_id === walkId).map(copy).sort(byT);
    },
    async getCapturesByIds(ids) {
      return ids.flatMap((id) => (captures.has(id) ? [copy(captures.get(id)!)] : [])).sort(byT);
    },
    async capturesIn([w, s, e, n]) {
      return [...captures.values()]
        .filter((c) => c.lat != null && c.lon != null && c.lat >= s && c.lat <= n && c.lon >= w && c.lon <= e)
        .map(copy)
        .sort(byT);
    },

    async startPause(walkId, at) {
      // At most one open pause per walk; a pause at the same instant replaces it (same key).
      if (pauses.some((p) => p.walk_id === walkId && p.ended_at == null)) return;
      const same = pauses.findIndex((p) => p.walk_id === walkId && p.started_at === at);
      const row = { walk_id: walkId, started_at: at, ended_at: null };
      if (same >= 0) pauses[same] = row;
      else pauses.push(row);
    },
    async endPause(walkId, at) {
      for (const p of pauses) if (p.walk_id === walkId && p.ended_at == null) p.ended_at = at;
    },
    async getPauses(walkId) {
      return pauses.filter((p) => p.walk_id === walkId).map(copy).sort((a, b) => a.started_at - b.started_at);
    },

    async putSegments(ss) {
      ss.forEach(putSegment);
    },
    async saveSnap(walkId, segs, vis, summary, placed, complete = true) {
      segs.forEach(putSegment);
      for (const k of [...visited.keys()]) if (visited.get(k)!.walk_id === walkId) visited.delete(k);
      for (const v of vis) visited.set(`${v.segment_id}|${v.walk_id}`, copy(v));
      summaries.set(summary.walk_id, copy(summary));
      const w = walks.get(walkId);
      if (w) walks.set(walkId, { ...w, snapped_build: complete ? summary.build : null });
      if (placed) {
        for (const k of [...walkAreas.keys()]) if (walkAreas.get(k)!.walk_id === walkId) walkAreas.delete(k);
        for (const a of placed.areas) areas.set(a.key, copy(a));
        for (const r of placed.rows) walkAreas.set(`${r.walk_id}|${r.area_key}`, copy(r));
        for (const key of staleAreas([...areas.keys()], [...walkAreas.values()])) areas.delete(key);
      }
    },
    async listAreas() {
      return [...areas.values()].map(copy);
    },
    async listWalkAreas() {
      return [...walkAreas.values()].map(copy);
    },
    async getSegmentsIn(bounds) {
      return [...segments.values()].filter((s) => intersects(segmentBbox(s), bounds)).map(copy);
    },
    async getVisited(walkId) {
      return [...visited.values()].filter((v) => v.walk_id === walkId).map(copy);
    },
    async visitedSegmentIds() {
      return new Set([...visited.values()].map((v) => v.segment_id));
    },
    async streetKeysBefore(startedAt) {
      const earlier = new Set([...walks.values()].filter((w) => w.started_at < startedAt).map((w) => w.id));
      return new Set([...visited.values()].filter((v) => earlier.has(v.walk_id)).map((v) => v.street_key));
    },
    async listSummaries() {
      return [...summaries.values()].map(copy);
    },

    async putPlaces(ps) {
      for (const p of ps) places.set(p.key, copy(p));
    },
    async placesIn([w, s, e, n]) {
      return [...places.values()].filter((p) => p.at[1] >= s && p.at[1] <= n && p.at[0] >= w && p.at[0] <= e).map(copy);
    },
    async addOffered(rows) {
      // First offer wins: re-offering never moves the record.
      for (const o of rows) if (!offered.has(o.key)) offered.set(o.key, copy(o));
    },
    async listOffered() {
      return [...offered.values()].map(copy);
    },
    async saveScan({ replace, marks: fresh, offered: rows }) {
      const ids = new Set<string>();
      for (const m of fresh) {
        if (marks.has(m.id) || ids.has(m.id)) throw constraint(`mark ${m.id}`);
        ids.add(m.id);
      }
      for (const id of replace) {
        const m = marks.get(id);
        if (m && m.state === 'open') marks.set(id, { ...m, state: 'replaced' });
      }
      for (const m of fresh) marks.set(m.id, copy(m));
      for (const o of rows) if (!offered.has(o.key)) offered.set(o.key, copy(o));
    },
    async listMarks(walkId) {
      return [...marks.values()]
        .filter((m) => (walkId == null ? m.walk_id == null : m.walk_id === walkId))
        .map(copy)
        .sort((a, b) => a.created_at - b.created_at);
    },
    async updateMark(id, p) {
      const cur = marks.get(id);
      if (cur) marks.set(id, { ...cur, ...copy(p) });
    },
    async setRecall(r) {
      recalls.set(r.capture_id, copy(r));
    },
    async clearRecall(captureId) {
      recalls.delete(captureId);
    },
    async listRecalls() {
      return [...recalls.values()].map(copy);
    },

    async putLanding(r) {
      landings.set(r.key, copy(r));
    },
    async listLandings() {
      return [...landings.values()].map(copy);
    },

    async getMeta(key) {
      return meta.get(key) ?? null;
    },
    async setMeta(key, value) {
      meta.set(key, value);
    },
    async purgeDerived() {
      const stores: Record<string, Map<string, unknown>> = { street_segment: segments, place: places };
      for (const name of DERIVED_STORES) {
        // A new derived store must be added here too, or the fake would keep it.
        if (!stores[name]) throw new Error(`memoryDb: no store for derived store '${name}'`);
        stores[name].clear();
      }
      for (const [id, w] of walks) walks.set(id, { ...w, snapped_build: null });
    },
  };
  return db;
}
