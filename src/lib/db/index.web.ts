import type { Capture, StreetSegment, TracePoint, VisitedSegment, Walk } from '../types';
import { intersects, segmentBbox } from './segmentBounds';
import type { Db } from './types';

// Same tables as the native SQLite store, as IndexedDB object stores.
const DB_NAME = 'chronicles';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
function conn(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        d.createObjectStore('walk', { keyPath: 'id' });
        d.createObjectStore('trace_point', { autoIncrement: true }).createIndex('walk_id', 'walk_id');
        d.createObjectStore('capture', { keyPath: 'id' }).createIndex('walk_id', 'walk_id');
        d.createObjectStore('street_segment', { keyPath: 'id' });
        d.createObjectStore('visited_segment', { keyPath: ['segment_id', 'walk_id'] }).createIndex('walk_id', 'walk_id');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
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
    tx.onabort = () => reject(tx.error);
  });

async function store(name: string, mode: IDBTransactionMode = 'readonly') {
  return (await conn()).transaction(name, mode).objectStore(name);
}

async function byWalk<T>(name: string, walkId: string): Promise<T[]> {
  return done((await store(name)).index('walk_id').getAll(walkId)) as Promise<T[]>;
}

async function patch<T extends { id: string }>(name: string, id: string, p: Partial<T>) {
  const s = await store(name, 'readwrite');
  const cur = (await done(s.get(id))) as T | undefined;
  if (cur) await done(s.put({ ...cur, ...p }));
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

  async putSegments(segments) {
    const tx = (await conn()).transaction('street_segment', 'readwrite');
    const s = tx.objectStore('street_segment');
    for (const seg of segments) s.put(seg);
    await committed(tx);
  },
  async getSegmentsIn(bounds) {
    const all = (await done((await store('street_segment')).getAll())) as StreetSegment[];
    return all.filter((s) => intersects(segmentBbox(s), bounds));
  },
  async setVisited(walkId, rows) {
    const tx = (await conn()).transaction('visited_segment', 'readwrite');
    const s = tx.objectStore('visited_segment');
    const old = (await done(s.index('walk_id').getAllKeys(walkId))) as IDBValidKey[];
    for (const k of old) s.delete(k);
    for (const r of rows) s.put(r);
    await committed(tx);
  },
  async getVisited(walkId) {
    if (walkId) return byWalk<VisitedSegment>('visited_segment', walkId);
    return (await done((await store('visited_segment')).getAll())) as VisitedSegment[];
  },
};
