import { staleAreas } from '../../areas/assign';
import type { Area, WalkArea } from '../../areas/types';
import type { OutlineTile } from '../../areas/outlines';
import type { WalkTile } from '../../walk/types';
import type { AtlasArea } from '../../atlas/atlas';
import { intersects, segmentBbox, segmentTile, tileKeysFor } from '../../db/segmentBounds';
import { DERIVED_STORES } from '../../db/stores';
import type { Db } from '../../db/types';
import { countsOf, recountNewStreets } from '../../deletion/core';
import type { Mark, Offered, Place, Recall } from '../../discovery/types';
import { exploredKey, type ChecklistArea, type ChecklistItem, type ExploreRead, type Find } from '../../explore/explore';
import type { LandingRow } from '../../landing/view';
import { parseEdit } from '../../mediaEdit';
import type { Capture, GapDecision, Pause, Still, StreetSegment, TracePoint, VisitedSegment, Walk, WalkSummary } from '../../types';

/** The `Db` methods that only read: left out of a fake's `effects()` log. */
export const DB_READS = [
  'getWalk', 'listWalks', 'getOpenWalk', 'getPoints', 'getCaptures', 'capturesBetween', 'getCapturesByIds', 'capturesIn',
  'getPauses', 'getStills', 'getGapDecisions',
  'listAreas', 'listWalkAreas', 'getSegmentsIn', 'getVisited', 'visitedSegmentIds', 'streetKeysBefore', 'listSummaries',
  'placesIn', 'listOffered', 'listMarks', 'listRecalls', 'listLandings', 'listAtlasAreas', 'getOutlineTiles', 'getWalkTiles',
  'listChecklistAreas', 'checklistItemsIn', 'listExploreReads', 'listFinds', 'getMeta',
] as const;

/** An IndexedDB key, as the web store's keys are: a number, a string, or an array of them. */
type Key = number | string | Key[];

const validKey = (k: unknown): k is Key =>
  (typeof k === 'number' && !Number.isNaN(k)) || typeof k === 'string' || (Array.isArray(k) && k.every(validKey));

/** IndexedDB's key order: numbers before strings before arrays; arrays element by element. */
function cmpKey(a: Key, b: Key): number {
  const rank = (k: Key) => (typeof k === 'number' ? 0 : typeof k === 'string' ? 1 : 2);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const c = cmpKey(a[i], b[i]);
      if (c) return c;
    }
    return a.length - b.length;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

const constraint = (what: string) => Object.assign(new Error(`Key already exists: ${what}`), { name: 'ConstraintError' });
const dataError = (what: string) => Object.assign(new Error(what), { name: 'DataError' });

/**
 * One object store: rows by primary key, read back in key order as
 * IndexedDB's are. Rows are held as copies; callers copy on the way out.
 */
class Table<T> {
  private rows = new Map<string, { key: Key; row: T }>();
  constructor(private keyOf: (row: T) => Key) {}

  get(key: Key): T | undefined {
    return this.rows.get(JSON.stringify(key))?.row;
  }
  has(key: Key): boolean {
    return this.rows.has(JSON.stringify(key));
  }
  put(row: T): void {
    const key = this.keyOf(row);
    if (!validKey(key)) throw dataError(`invalid key: ${JSON.stringify(key)}`);
    this.rows.set(JSON.stringify(key), { key, row: structuredClone(row) });
  }
  delete(key: Key): void {
    this.rows.delete(JSON.stringify(key));
  }
  clear(): void {
    this.rows.clear();
  }
  /** Every row, in primary-key order. */
  all(): T[] {
    return [...this.rows.values()].sort((a, b) => cmpKey(a.key, b.key)).map((r) => r.row);
  }
  keys(): Key[] {
    return [...this.rows.values()].map((r) => r.key).sort(cmpKey);
  }
  /**
   * An index read: rows whose index value is a valid key and passes `inRange`,
   * in (index value, primary key) order. Rows with a null index value are not
   * in the index, as in IndexedDB.
   */
  index(valueOf: (row: T) => unknown, inRange: (v: Key) => boolean): T[] {
    const hits: { v: Key; key: Key; row: T }[] = [];
    for (const r of this.rows.values()) {
      const v = valueOf(r.row);
      if (validKey(v) && inRange(v)) hits.push({ v, key: r.key, row: r.row });
    }
    return hits.sort((a, b) => cmpKey(a.v, b.v) || cmpKey(a.key, b.key)).map((h) => h.row);
  }
  /** Rows whose index value equals `value`, in primary-key order. */
  where(valueOf: (row: T) => unknown, value: Key): T[] {
    return this.index(valueOf, (v) => cmpKey(v, value) === 0);
  }
  /** Deletes the rows whose index value equals `value`. */
  dropWhere(valueOf: (row: T) => unknown, value: Key): void {
    for (const r of this.where(valueOf, value)) this.delete(this.keyOf(r));
  }
}

/** `IDBKeyRange.bound(lo, hi)`: throws as it does when the range is empty or not a key. */
function band(lo: number, hi: number): (v: Key) => boolean {
  if (!validKey(lo) || !validKey(hi) || cmpKey(lo, hi) > 0) throw dataError('invalid key range');
  return (v) => cmpKey(v, lo) >= 0 && cmpKey(v, hi) <= 0;
}

/**
 * An in-memory `Db` for shell tests, matching the IndexedDB store's behavior
 * (`db/index.web.ts`); `dbContract.ts` checks the two against each other.
 * Rows are copied in and out, as a real store's are, so a caller mutating a
 * returned object changes nothing stored, and lists come back in the store's
 * key order. A write that would fail part-way (a duplicate id) fails before
 * changing anything, like a transaction.
 */
export function memoryDb(): Db {
  const copy = <T>(v: T): T => structuredClone(v);
  // As the real stores: a capture's edit is read through parseEdit (media-editing audit 7).
  const withEdit = (c: Capture): Capture => (c.edit === undefined ? c : { ...c, edit: parseEdit(c.edit) });
  const out = <T>(rows: T[]): T[] => rows.map(copy);
  const walks = new Table<Walk>((w) => w.id);
  const points = new Table<TracePoint & { seq: number }>((p) => p.seq); // autoIncrement
  let seq = 0;
  const captures = new Table<Capture>((c) => c.id);
  const pauses = new Table<Pause>((p) => [p.walk_id, p.started_at]);
  const stills = new Table<Still>((p) => [p.walk_id, p.started_at]);
  const gapFills = new Table<GapDecision>((d) => [d.walk_id, d.t0]);
  const segments = new Table<StreetSegment & { tile: string }>((s) => s.id);
  const visited = new Table<VisitedSegment>((v) => [v.segment_id, v.walk_id]);
  const summaries = new Table<WalkSummary>((s) => s.walk_id);
  const areas = new Table<Area>((a) => a.key);
  const walkAreas = new Table<WalkArea>((r) => [r.walk_id, r.area_key]);
  const places = new Table<Place>((p) => p.key);
  const offered = new Table<Offered>((o) => o.key);
  const marks = new Table<Mark>((m) => m.id);
  const recalls = new Table<Recall>((r) => r.capture_id);
  const landings = new Table<LandingRow>((r) => r.key);
  const atlas = new Table<AtlasArea>((r) => r.key);
  const outlineTiles = new Table<OutlineTile>((r) => r.key);
  const walkTiles = new Table<WalkTile>((r) => r.key);
  const checklistAreas = new Table<ChecklistArea>((a) => a.key);
  const checklistItems = new Table<ChecklistItem>((i) => i.key);
  const finds = new Table<Find>((f) => f.key);
  const exploreReads = new Table<ExploreRead>((r) => r.key);
  const meta = new Table<{ key: string; value: string }>((m) => m.key);

  const byT = <T extends { t: number }>(a: T, b: T) => a.t - b.t;
  const byStart = <T extends { started_at: number }>(a: T, b: T) => a.started_at - b.started_at;
  const walkOf = (r: { walk_id: string | null }) => r.walk_id;
  const patch = <T extends { id: string }>(t: Table<T>, id: string, p: Partial<NoInfer<T>>) => {
    const cur = t.get(id);
    if (cur) t.put({ ...cur, ...p });
  };
  const stripTile = ({ tile: _t, ...s }: StreetSegment & { tile: string }): StreetSegment => copy(s);
  /** First offer wins: re-offering never moves the record. */
  const offerOnce = (rows: Offered[]) => {
    for (const o of rows) if (!offered.has(o.key)) offered.put(o);
  };

  const db: Db = {
    async createWalk(w) {
      if (walks.has(w.id)) throw constraint(`walk ${w.id}`);
      walks.put(w);
    },
    async updateWalk(id, p) {
      patch(walks, id, p);
    },
    async getWalk(id) {
      const w = walks.get(id);
      return w ? copy(w) : null;
    },
    async listWalks() {
      return out(walks.all()).sort((a, b) => b.started_at - a.started_at);
    },
    async getOpenWalk() {
      return (await db.listWalks()).find((w) => w.open) ?? null;
    },

    async appendPoints(ps) {
      for (const p of ps) points.put({ ...p, seq: ++seq });
    },
    async getPoints(walkId) {
      return points.where(walkOf, walkId).map(({ seq: _s, ...p }) => copy(p)).sort(byT);
    },

    async addCapture(c) {
      if (captures.has(c.id)) throw constraint(`capture ${c.id}`);
      captures.put(c);
    },
    async updateCapture(id, p) {
      patch(captures, id, p);
    },
    async getCaptures(walkId) {
      return out(captures.where(walkOf, walkId)).map(withEdit).sort(byT);
    },
    async capturesBetween(from, to) {
      if (!(to > from)) return [];
      return out(captures.index((c) => c.t, (t) => typeof t === 'number' && t >= from && t < to)).map(withEdit);
    },
    async getCapturesByIds(ids) {
      return ids.flatMap((id) => {
        const c = captures.get(id);
        return c ? [withEdit(copy(c))] : [];
      }).sort(byT);
    },
    async capturesIn([w, s, e, n]) {
      return out(captures.index((c) => c.lat, band(s, n)))
        .map(withEdit)
        .filter((c) => c.lon != null && c.lon >= w && c.lon <= e)
        .sort(byT);
    },

    async deleteWalk(walkId) {
      for (const c of captures.where(walkOf, walkId)) {
        captures.delete(c.id);
        recalls.delete(c.id);
      }
      points.dropWhere(walkOf, walkId);
      pauses.dropWhere(walkOf, walkId);
      stills.dropWhere(walkOf, walkId);
      gapFills.dropWhere(walkOf, walkId);
      visited.dropWhere(walkOf, walkId);
      walkAreas.dropWhere(walkOf, walkId);
      finds.dropWhere(walkOf, walkId);
      marks.dropWhere(walkOf, walkId);
      summaries.delete(walkId);
      meta.delete(exploredKey(walkId));
      walks.delete(walkId);
      // Places only this walk was in go (D8).
      for (const key of staleAreas(areas.keys() as string[], walkAreas.all())) areas.delete(key);
      // Later walks are counted again without it (D7).
      const sums = summaries.all();
      const byId = new Map(sums.map((x) => [x.walk_id, x]));
      for (const ch of recountNewStreets(walks.all(), visited.all(), new Map(sums.map((x) => [x.walk_id, x.new_streets])))) {
        summaries.put({ ...byId.get(ch.walk_id)!, new_streets: ch.new_streets });
      }
    },
    async deleteCaptures(ids, opts = {}) {
      if (!ids.length) return;
      const got = ids.flatMap((id) => {
        const c = captures.get(id);
        return c ? [c] : [];
      });
      for (const c of got) {
        captures.delete(c.id);
        recalls.delete(c.id);
      }
      if (!opts.keepFinds && got.length) {
        // As the web store: finds are looked up by their captures' walks (all of them when a
        // loose moment is among them), so only a find filed under its capture's walk goes.
        const gone = new Set(got.map((c) => c.id));
        const walkIds = [...new Set(got.map((c) => c.walk_id))];
        const rows = walkIds.includes(null) ? finds.all() : walkIds.flatMap((w) => finds.where(walkOf, w!));
        for (const f of rows) if (gone.has(f.capture_id)) finds.delete(f.key);
      }
      // The walks' counts follow, from the rows left (D9, audit 3).
      for (const w of new Set(got.map((c) => c.walk_id))) {
        if (w == null) continue;
        const s = summaries.get(w);
        if (s) summaries.put({ ...s, ...countsOf(captures.where(walkOf, w)) });
      }
    },

    async startPause(walkId, at) {
      // At most one open pause per walk; a pause at the same instant is replaced (same key).
      if (!pauses.where(walkOf, walkId).some((p) => p.ended_at == null)) pauses.put({ walk_id: walkId, started_at: at, ended_at: null });
    },
    async endPause(walkId, at) {
      for (const p of pauses.where(walkOf, walkId)) if (p.ended_at == null) pauses.put({ ...p, ended_at: at });
    },
    async getPauses(walkId) {
      return out(pauses.where(walkOf, walkId)).sort(byStart);
    },
    async startStill(walkId, at) {
      if (!stills.where(walkOf, walkId).some((p) => p.ended_at == null)) stills.put({ walk_id: walkId, started_at: at, ended_at: null });
    },
    async endStill(walkId, at) {
      for (const p of stills.where(walkOf, walkId)) if (p.ended_at == null) stills.put({ ...p, ended_at: at });
    },
    async getStills(walkId) {
      return out(stills.where(walkOf, walkId)).sort(byStart);
    },

    async getGapDecisions(walkId) {
      return out(gapFills.where(walkOf, walkId)).sort((a, b) => a.t0 - b.t0);
    },
    async putGapDecision(d) {
      gapFills.put(d);
    },

    async putSegments(ss) {
      for (const x of ss) segments.put({ ...x, tile: segmentTile(x) });
    },
    async saveSnap(walkId, segs, vis, summary, placed, complete = true) {
      const w = walks.get(walkId);
      // A walk deleted while its streets were read gets nothing back (audit 2).
      if (!w) return;
      // Counts from the rows as they stand now, so a moment deleted meanwhile isn't counted (audit 3).
      summary = { ...summary, ...countsOf(captures.where(walkOf, walkId)) };
      for (const x of segs) segments.put({ ...x, tile: segmentTile(x) });
      visited.dropWhere(walkOf, walkId);
      for (const v of vis) visited.put(v);
      summaries.put(summary);
      walks.put({ ...w, snapped_build: complete ? summary.build : null });
      if (placed) {
        walkAreas.dropWhere(walkOf, walkId);
        for (const a of placed.areas) areas.put(a);
        for (const r of placed.rows) walkAreas.put(r);
        // Areas no walk refers to any more (a renamed place, say) go.
        for (const key of staleAreas(areas.keys() as string[], walkAreas.all())) areas.delete(key);
      }
    },
    async listAreas() {
      return out(areas.all());
    },
    async listWalkAreas() {
      return out(walkAreas.all());
    },
    async getSegmentsIn(bounds) {
      // By tile, as the web store reads them: a piece is filed under its box's centre tile.
      return tileKeysFor(bounds)
        .flatMap((k) => segments.where((s) => s.tile, k))
        .filter((s) => intersects(segmentBbox(s), bounds))
        .map(stripTile);
    },
    async getVisited(walkId) {
      return out(visited.where(walkOf, walkId));
    },
    async visitedSegmentIds() {
      return new Set(visited.all().map((v) => v.segment_id));
    },
    async streetKeysBefore(startedAt) {
      const earlier = new Set(walks.all().filter((w) => w.started_at < startedAt).map((w) => w.id));
      return new Set(visited.all().filter((v) => earlier.has(v.walk_id)).map((v) => v.street_key));
    },
    async listSummaries() {
      return out(summaries.all());
    },

    async putPlaces(ps) {
      for (const p of ps) places.put(p);
    },
    async placesIn([w, s, e, n]) {
      return out(places.index((p) => p.at[1], band(s, n)).filter((p) => p.at[0] >= w && p.at[0] <= e));
    },
    async addOffered(rows) {
      offerOnce(rows);
    },
    async listOffered() {
      return out(offered.all());
    },
    async saveScan({ replace, marks: fresh, offered: rows }) {
      // All or nothing: a duplicate mark id fails the whole scan.
      const ids = new Set<string>();
      for (const m of fresh) {
        if (marks.has(m.id) || ids.has(m.id)) throw constraint(`mark ${m.id}`);
        ids.add(m.id);
      }
      for (const id of replace) {
        const m = marks.get(id);
        if (m && m.state === 'open') marks.put({ ...m, state: 'replaced' });
      }
      for (const m of fresh) marks.put(m);
      offerOnce(rows);
    },
    async listMarks(walkId) {
      // The web store reads the home's by a scan of the store (an index skips null), a walk's by index.
      const rows = walkId == null ? marks.all().filter((m) => m.walk_id == null) : marks.where(walkOf, walkId);
      return out(rows).sort((a, b) => a.created_at - b.created_at);
    },
    async updateMark(id, p) {
      patch(marks, id, p);
    },
    async setRecall(r) {
      recalls.put(r);
    },
    async clearRecall(captureId) {
      recalls.delete(captureId);
    },
    async listRecalls() {
      return out(recalls.all());
    },

    async putLanding(r) {
      landings.put(r);
    },
    async listLandings() {
      return out(landings.all());
    },
    async putAtlasAreas(rows) {
      for (const r of rows) atlas.put(r);
    },
    async listAtlasAreas() {
      return out(atlas.all());
    },
    async putOutlineTiles(tiles) {
      for (const t of tiles) outlineTiles.put(t);
    },
    async getOutlineTiles(keys) {
      return out([...new Set(keys)].sort().flatMap((k) => outlineTiles.all().filter((t) => t.key === k)));
    },

    async putWalkTiles(tiles) {
      for (const t of tiles) walkTiles.put(t);
    },
    async getWalkTiles(keys) {
      return out([...new Set(keys)].sort().flatMap((k) => walkTiles.all().filter((t) => t.key === k)));
    },

    async saveChecklists({ areas: built, items, read }) {
      // A rebuilt area's old items go first (E4); keys gone from the new list don't linger.
      for (const a of built) checklistItems.dropWhere((x) => x.area_key, a.key);
      for (const i of items) checklistItems.put(i);
      for (const a of built) checklistAreas.put(a);
      exploreReads.put(read);
    },
    async listChecklistAreas() {
      return out(checklistAreas.all());
    },
    async checklistItemsIn([w, s, e, n]) {
      return out(checklistItems.index((i) => i.at[1], band(s, n)).filter((i) => i.at[0] >= w && i.at[0] <= e));
    },
    async listExploreReads() {
      return out(exploreReads.all());
    },
    async addFind(f) {
      // The first find of a place stands.
      if (!finds.has(f.key)) finds.put(f);
    },
    async listFinds(walkId) {
      return out(walkId ? finds.where(walkOf, walkId) : finds.all());
    },

    async getMeta(key) {
      return meta.get(key)?.value ?? null;
    },
    async setMeta(key, value) {
      meta.put({ key, value });
    },
    async purgeDerived() {
      const stores: Record<string, { clear(): void }> = { street_segment: segments, place: places, explore_read: exploreReads, atlas_area: atlas, outline_tile: outlineTiles, walk_tile: walkTiles };
      for (const name of DERIVED_STORES) {
        // A new derived store must be added here too, or the fake would keep it.
        if (!stores[name]) throw new Error(`memoryDb: no store for derived store '${name}'`);
      }
      for (const name of DERIVED_STORES) stores[name].clear();
      for (const w of walks.all()) walks.put({ ...w, snapped_build: null });
    },
  };

  return db;
}
