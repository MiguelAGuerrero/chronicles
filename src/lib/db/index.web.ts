import { staleAreas } from '../areas/assign';
import type { Area, WalkArea } from '../areas/types';
import type { Offered, Place } from '../discovery/types';
import { DERIVED_STORES } from './stores';
import type { Capture, Pause, StreetSegment, TracePoint, VisitedSegment, Walk, WalkSummary } from '../types';
import { intersects, segmentBbox } from './segmentBounds';
import type { Db } from './types';

// Same tables as the native SQLite store, as IndexedDB object stores.
const DB_NAME = 'chronicles';
const VERSION = 5;

/** Raised when another open tab holds an older version of the database. */
export class BlockedByOtherTabError extends Error {
  constructor() {
    super('Chronicles is open in another tab with an older version. Close the other tab to continue.');
  }
}

function migrate(d: IDBDatabase, tx: IDBTransaction, oldVersion: number) {
  if (oldVersion < 1) {
    d.createObjectStore('walk', { keyPath: 'id' });
    d.createObjectStore('trace_point', { autoIncrement: true }).createIndex('walk_id', 'walk_id');
    d.createObjectStore('capture', { keyPath: 'id' }).createIndex('walk_id', 'walk_id');
    d.createObjectStore('street_segment', { keyPath: 'id' });
    d.createObjectStore('visited_segment', { keyPath: ['segment_id', 'walk_id'] }).createIndex('walk_id', 'walk_id');
  }
  if (oldVersion < 2) {
    // Segments are now tagged with their tile build; old rows are rebuilt.
    tx.objectStore('street_segment').clear();
    tx.objectStore('visited_segment').clear();
    d.createObjectStore('walk_summary', { keyPath: 'walk_id' });
    d.createObjectStore('meta', { keyPath: 'key' });
    d.createObjectStore('media', { keyPath: 'key' });
  }
  if (oldVersion < 3) {
    d.createObjectStore('pause', { keyPath: ['walk_id', 'started_at'] }).createIndex('walk_id', 'walk_id');
  }
  if (oldVersion < 4) {
    // v0.5: the places each walk was in (a cache, rebuilt when a walk is placed again).
    d.createObjectStore('area', { keyPath: 'key' });
    const wa = d.createObjectStore('walk_area', { keyPath: ['walk_id', 'area_key'] });
    wa.createIndex('walk_id', 'walk_id');
    wa.createIndex('area_key', 'area_key');
  }
  if (oldVersion < 5) {
    // v1 discovery: the place cache, and the truth of what was offered, marked and recalled.
    d.createObjectStore('place', { keyPath: 'key' }).createIndex('lat', 'lat');
    d.createObjectStore('offered', { keyPath: 'key' });
    d.createObjectStore('mark', { keyPath: 'id' }).createIndex('walk_id', 'walk_id');
    d.createObjectStore('recall', { keyPath: 'capture_id' });
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;
function conn(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = (e) => migrate(req.result, req.transaction!, e.oldVersion);
      req.onblocked = () => reject(new BlockedByOtherTabError());
      req.onsuccess = () => {
        const d = req.result;
        // A newer version opened in another tab: step aside so it can upgrade.
        d.onversionchange = () => {
          d.close();
          // This tab's code is older than the database now: it cannot open it again.
          dbPromise = Promise.reject(new Error('A newer version of Chronicles is open in another tab. Reload this page to keep going.'));
          dbPromise.catch(() => {});
        };
        d.onclose = () => {
          dbPromise = null;
        };
        resolve(d);
      };
      req.onerror = () => reject(req.error);
    }).catch((e) => {
      dbPromise = null; // retry on the next call instead of failing forever
      throw e;
    });
  }
  return dbPromise;
}

const done = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const committed = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });

async function store(name: string, mode: IDBTransactionMode = 'readonly') {
  return (await conn()).transaction(name, mode).objectStore(name);
}

async function byWalk<T>(name: string, walkId: string): Promise<T[]> {
  return done((await store(name)).index('walk_id').getAll(walkId)) as Promise<T[]>;
}

async function patch<T extends { id: string }>(name: string, id: string, p: Partial<T>) {
  const tx = (await conn()).transaction(name, 'readwrite');
  const s = tx.objectStore(name);
  const cur = (await done(s.get(id))) as T | undefined;
  if (cur) s.put({ ...cur, ...p });
  await committed(tx);
}

export const db: Db = {
  async createWalk(w) {
    await done((await store('walk', 'readwrite')).add(w));
  },
  async updateWalk(id, p) {
    await patch<Walk>('walk', id, p);
  },
  async getWalk(id) {
    return ((await done((await store('walk')).get(id))) as Walk | undefined) ?? null;
  },
  async listWalks() {
    const all = (await done((await store('walk')).getAll())) as Walk[];
    return all.sort((a, b) => b.started_at - a.started_at);
  },
  async getOpenWalk() {
    return (await db.listWalks()).find((w) => w.open) ?? null;
  },

  async appendPoints(points) {
    if (points.length === 0) return;
    const tx = (await conn()).transaction('trace_point', 'readwrite');
    const s = tx.objectStore('trace_point');
    for (const p of points) s.add(p);
    await committed(tx);
  },
  async getPoints(walkId) {
    return (await byWalk<TracePoint>('trace_point', walkId)).sort((a, b) => a.t - b.t);
  },

  async addCapture(c) {
    await done((await store('capture', 'readwrite')).add(c));
  },
  async updateCapture(id, p) {
    await patch<Capture>('capture', id, p);
  },
  async getCaptures(walkId) {
    return (await byWalk<Capture>('capture', walkId)).sort((a, b) => a.t - b.t);
  },

  async capturesIn([w, s, e, n]) {
    const all = (await done((await store('capture')).getAll())) as Capture[];
    return all
      .filter((c) => c.lat != null && c.lon != null && c.lat >= s && c.lat <= n && c.lon >= w && c.lon <= e)
      .sort((a, b) => a.t - b.t);
  },

  async startPause(walkId, at) {
    const tx = (await conn()).transaction('pause', 'readwrite');
    const st = tx.objectStore('pause');
    const mine = (await done(st.index('walk_id').getAll(walkId))) as Pause[];
    if (!mine.some((p) => p.ended_at == null)) st.put({ walk_id: walkId, started_at: at, ended_at: null });
    await committed(tx);
  },
  async endPause(walkId, at) {
    const tx = (await conn()).transaction('pause', 'readwrite');
    const st = tx.objectStore('pause');
    for (const p of (await done(st.index('walk_id').getAll(walkId))) as Pause[]) {
      if (p.ended_at == null) st.put({ ...p, ended_at: at });
    }
    await committed(tx);
  },
  async getPauses(walkId) {
    return (await byWalk<Pause>('pause', walkId)).sort((a, b) => a.started_at - b.started_at);
  },

  async putSegments(segments) {
    if (segments.length === 0) return;
    const tx = (await conn()).transaction('street_segment', 'readwrite');
    const st = tx.objectStore('street_segment');
    for (const x of segments) st.put(x);
    await committed(tx);
  },

  async saveSnap(walkId, segments, visited, summary, placed, complete = true) {
    const names = ['street_segment', 'visited_segment', 'walk_summary', 'walk', 'area', 'walk_area'];
    const tx = (await conn()).transaction(names, 'readwrite');
    const seg = tx.objectStore('street_segment');
    for (const x of segments) seg.put(x);
    const vis = tx.objectStore('visited_segment');
    for (const k of (await done(vis.index('walk_id').getAllKeys(walkId))) as IDBValidKey[]) vis.delete(k);
    for (const v of visited) vis.put(v);
    tx.objectStore('walk_summary').put(summary);
    const walks = tx.objectStore('walk');
    const w = (await done(walks.get(walkId))) as Walk | undefined;
    if (w) walks.put({ ...w, snapped_build: complete ? summary.build : null });
    if (placed) {
      const wa = tx.objectStore('walk_area');
      for (const k of (await done(wa.index('walk_id').getAllKeys(walkId))) as IDBValidKey[]) wa.delete(k);
      const areas = tx.objectStore('area');
      for (const a of placed.areas) areas.put(a);
      for (const r of placed.rows) wa.put(r);
      // Areas no walk refers to any more (a renamed place, say) go.
      const rows = ((await done(wa.getAll())) as WalkArea[]);
      for (const key of staleAreas((await done(areas.getAllKeys())) as string[], rows)) areas.delete(key);
    }
    await committed(tx);
  },
  async listAreas() {
    return (await done((await store('area')).getAll())) as Area[];
  },
  async listWalkAreas() {
    return (await done((await store('walk_area')).getAll())) as WalkArea[];
  },
  async getSegmentsIn(bounds) {
    const all = (await done((await store('street_segment')).getAll())) as StreetSegment[];
    return all.filter((s) => intersects(segmentBbox(s), bounds));
  },
  async getVisited(walkId) {
    return byWalk<VisitedSegment>('visited_segment', walkId);
  },
  async visitedSegmentIds() {
    const keys = (await done((await store('visited_segment')).getAllKeys())) as [string, string][];
    return new Set(keys.map((k) => k[0]));
  },
  async streetKeysBefore(startedAt) {
    const earlier = new Set((await db.listWalks()).filter((w) => w.started_at < startedAt).map((w) => w.id));
    const all = (await done((await store('visited_segment')).getAll())) as VisitedSegment[];
    return new Set(all.filter((v) => earlier.has(v.walk_id)).map((v) => v.street_key));
  },
  async listSummaries() {
    return (await done((await store('walk_summary')).getAll())) as WalkSummary[];
  },

  async getMeta(key) {
    const r = (await done((await store('meta')).get(key))) as { value: string } | undefined;
    return r?.value ?? null;
  },
  async setMeta(key, value) {
    await done((await store('meta', 'readwrite')).put({ key, value }));
  },
  async putPlaces(places) {
    if (places.length === 0) return;
    const tx = (await conn()).transaction('place', 'readwrite');
    const st = tx.objectStore('place');
    // `lat` is stored beside `at` for the index (a key path can't reach into an array).
    for (const p of places) st.put({ ...p, lat: p.at[1] });
    await committed(tx);
  },
  async placesIn([w, s, e, n]) {
    const rows = (await done((await store('place')).index('lat').getAll(IDBKeyRange.bound(s, n)))) as (Place & { lat?: number })[];
    return rows.filter((p) => p.at[0] >= w && p.at[0] <= e).map(({ lat: _lat, ...p }) => p);
  },
  async addOffered(rows) {
    if (rows.length === 0) return;
    const tx = (await conn()).transaction('offered', 'readwrite');
    const st = tx.objectStore('offered');
    // First offer wins: re-offering never moves the record.
    for (const o of rows) st.add(o).onerror = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    await committed(tx);
  },
  async listOffered() {
    return (await done((await store('offered')).getAll())) as Offered[];
  },
  async purgeDerived() {
    const tx = (await conn()).transaction([...DERIVED_STORES, 'walk'], 'readwrite');
    for (const s of DERIVED_STORES) tx.objectStore(s).clear();
    const walks = tx.objectStore('walk');
    for (const w of (await done(walks.getAll())) as Walk[]) walks.put({ ...w, snapped_build: null });
    await committed(tx);
  },
};

/** Web media lives in its own store, as Blobs, keyed from Capture.file_path. */
export const mediaStore = {
  async put(key: string, blob: Blob) {
    await done((await store('media', 'readwrite')).put({ key, blob }));
  },
  async get(key: string): Promise<Blob | null> {
    const r = (await done((await store('media')).get(key))) as { blob: Blob } | undefined;
    return r?.blob ?? null;
  },
};
