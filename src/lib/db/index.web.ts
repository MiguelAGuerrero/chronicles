// @layer adapter
import { staleAreas } from '../areas/assign';
import type { Area, WalkArea } from '../areas/types';
import { exploredKey, type ChecklistArea, type ChecklistItem, type ExploreRead, type Find } from '../explore/explore';
import { countsOf, recountNewStreets } from '../deletion/core';
import type { LandingRow } from '../landing/view';
import type { OutlineTile } from '../areas/outlines';
import type { WalkTile } from '../walk/types';
import type { AtlasArea } from '../atlas/atlas';
import type { Complex } from '../complexes/types';
import type { Mark, Place, Recall } from '../discovery/types';
import { DERIVED_STORES } from './stores';
import type { Capture, GapDecision, Moment, Pause, Still, StreetSegment, TracePoint, VisitedSegment, Walk, WalkSummary } from '../types';
import { intersects, segmentBbox, segmentTile, tileKeysFor } from './segmentBounds';
import { thinThreads } from '../threads/rules';
import type { Link, Member, Thread, ThreadsChange } from '../threads/types';
import type { Db } from './types';
import { parseEdit } from '../mediaEdit';
import { momentOf, type Flat } from '../moment';

// Same tables as the native SQLite store, as IndexedDB object stores.
const DB_NAME = 'chronicles';
const VERSION = 19;

/** Raised when another open tab holds an older version of the database. */
export class BlockedByOtherTabError extends Error {
  constructor() {
    super('Chronicles is open in another tab with an older version. Close the other tab to continue.');
  }
}

/**
 * The upgrade steps from `oldVersion` up to `upTo` (the store's VERSION; a test opens an older one, MT1). Steps up to
 * 17 run whatever `upTo` is: a database is never opened below 17 but by the frozen copy of these steps.
 */
export function migrate(d: IDBDatabase, tx: IDBTransaction, oldVersion: number, upTo: number = VERSION) {
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
  if (oldVersion < 6) {
    // v1.5 landing: areas analyzed for where to start (a cache, kept across builds and shown stale).
    d.createObjectStore('landing', { keyPath: 'key' });
  }
  if (oldVersion < 7) {
    // Street pieces filed by z14 tile, so a read near you never loads the whole cache (perf, Nov 1).
    const seg = tx.objectStore('street_segment');
    seg.createIndex('tile', 'tile');
    const cur = seg.openCursor();
    cur.onsuccess = () => {
      const c = cur.result;
      if (!c) return;
      c.update({ ...c.value, tile: segmentTile(c.value as StreetSegment) });
      c.continue();
    };
  }
  if (oldVersion < 8) {
    // v1 explore: checklists and finds (kept), and where reads happened (derived).
    d.createObjectStore('checklist_area', { keyPath: 'key' });
    const items = d.createObjectStore('checklist_item', { keyPath: 'key' });
    items.createIndex('area_key', 'area_key');
    // Read by latitude, never the whole kept store (audit 7; iPhone memory).
    items.createIndex('lat', 'lat');
    d.createObjectStore('find', { keyPath: 'key' }).createIndex('walk_id', 'walk_id');
    d.createObjectStore('explore_read', { keyPath: 'key' });
  }
  if (oldVersion < 9) {
    // Memories on revisit read captures by place every 50 m: by latitude, never the whole store
    // (audit 2; iPhone memory). A capture with no place has no lat and isn't in the index.
    tx.objectStore('capture').createIndex('lat', 'lat');
  }
  if (oldVersion < 10) {
    // Moments (M6): captures read by time for days, never the whole store.
    tx.objectStore('capture').createIndex('t', 't');
  }
  if (oldVersion < 11) {
    // Still spells told by the motion sensors (Motion, MO8), kept with the walk like pauses.
    d.createObjectStore('still', { keyPath: ['walk_id', 'started_at'] }).createIndex('walk_id', 'walk_id');
  }
  if (oldVersion < 12) {
    // Stretches kept or dismissed across gaps in the trace (Filling gaps, G10): truth, kept with the walk.
    d.createObjectStore('gap_fill', { keyPath: ['walk_id', 't0'] }).createIndex('walk_id', 'walk_id');
  }
  if (oldVersion < 13) {
    // Explore atlas (AT12): areas near you and what their rings hold, a cache cleared with the derived stores.
    d.createObjectStore('atlas_area', { keyPath: 'key' });
  }
  if (oldVersion < 14) {
    // Town outlines (TO12): what each read tile held, a cache cleared with the derived stores.
    d.createObjectStore('outline_tile', { keyPath: 'key' });
  }
  if (oldVersion < 15) {
    // Town borders (TB7): tiles are keyed by zoom now (z/x/y); the cache's old x/y rows are dropped and read again.
    tx.objectStore('outline_tile').clear();
  }
  if (oldVersion < 16) {
    // Walkability (WK2): what each read z14 tile held, a cache cleared with the derived stores.
    d.createObjectStore('walk_tile', { keyPath: 'key' });
  }
  if (oldVersion < 17) {
    // Owner threads (OT21, decision 0104): threads, memberships and replies. Truth, never cleared by the app.
    d.createObjectStore('thread', { keyPath: 'id' });
    const members = d.createObjectStore('thread_member', { keyPath: ['thread_id', 'moment_id'] });
    members.createIndex('thread_id', 'thread_id');
    members.createIndex('moment_id', 'moment_id');
    const links = d.createObjectStore('moment_link', { keyPath: ['from_id', 'to_id'] });
    links.createIndex('from_id', 'from_id');
    links.createIndex('to_id', 'to_id');
  }
  if (oldVersion < 18 && upTo >= 18) {
    // The moment table (MT1, decision 0123): one record per moment, its pieces inside it, so a read is one request
    // and a moment with its pieces is one write. Every capture becomes a one-piece moment under its own id, so
    // threads, replies, reminders and finds keep pointing at it. The capture store goes in the same upgrade.
    const moments = d.createObjectStore('moment', { keyPath: 'id' });
    moments.createIndex('walk_id', 'walk_id');
    moments.createIndex('t', 't');
    moments.createIndex('lat', 'lat');
    moments.createIndex('piece_ids', 'piece_ids', { multiEntry: true });
    const cur = tx.objectStore('capture').openCursor();
    cur.onsuccess = () => {
      const c = cur.result;
      if (!c) {
        d.deleteObjectStore('capture');
        return;
      }
      moments.put(toRecord(momentOf(c.value as Flat)));
      c.continue();
    };
  }
  if (oldVersion < 19 && upTo >= 19) {
    // Complexes (CX14, specs/complexes): derived rows, one per named building made of other places; cleared with the derived stores.
    d.createObjectStore('complex', { keyPath: 'id' });
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

/**
 * Runs a transaction's body; any error aborts it, so a delete that fails
 * halfway leaves storage as it was (D6), then rethrows.
 */
async function atomically(tx: IDBTransaction, body: () => Promise<void>): Promise<void> {
  const finished = committed(tx);
  try {
    await body();
  } catch (e) {
    finished.catch(() => {});
    try {
      tx.abort();
    } catch {
      // already finished
    }
    throw e;
  }
  return finished;
}

/** Deletes every row of a store whose index holds the key, inside the caller's transaction. */
/** Drops the threads, among `ids`, that fewer than two moments belong to, with their memberships (OT15). */
async function dissolveThin(tx: IDBTransaction, ids: Iterable<string>) {
  const members = tx.objectStore('thread_member');
  for (const id of new Set(ids)) {
    const left = (await done(members.index('thread_id').getAll(id))) as Member[];
    if (!thinThreads([id], left).length) continue;
    tx.objectStore('thread').delete(id);
    for (const m of left) members.delete([m.thread_id, m.moment_id]);
  }
}
/** The memberships and links of deleted moments go with them, and a thread left thin dissolves (OT16, OT17). */
async function dropMoments(tx: IDBTransaction, ids: string[]) {
  const members = tx.objectStore('thread_member');
  const links = tx.objectStore('moment_link');
  const affected = new Set<string>();
  for (const id of ids) {
    for (const m of (await done(members.index('moment_id').getAll(id))) as Member[]) {
      members.delete([m.thread_id, m.moment_id]);
      affected.add(m.thread_id);
    }
    for (const side of ['from_id', 'to_id']) {
      for (const l of (await done(links.index(side).getAll(id))) as Link[]) links.delete([l.from_id, l.to_id]);
    }
  }
  await dissolveThin(tx, affected);
}
async function dropBy(st: IDBObjectStore, index: string, key: IDBValidKey) {
  for (const k of (await done(st.index(index).getAllKeys(key))) as IDBValidKey[]) st.delete(k);
}

async function patch<T extends { id: string }>(name: string, id: string, p: Partial<T>) {
  const tx = (await conn()).transaction(name, 'readwrite');
  const s = tx.objectStore(name);
  const cur = (await done(s.get(id))) as T | undefined;
  if (cur) s.put({ ...cur, ...p });
  await committed(tx);
}

/** A piece as read (ME21): its stored edit parsed, so a newer or broken one is none (media-editing audit 7). */
const withEdit = (c: Capture): Capture => (c.edit === undefined ? c : { ...c, edit: parseEdit(c.edit) });

/** A moment as stored: with its pieces' ids beside them, for the multiEntry index a piece's update reads. */
type MomentRecord = Moment & { piece_ids: string[] };
function toRecord(m: Moment): MomentRecord {
  return { ...m, piece_ids: m.pieces.map((p) => p.id) };
}
const fromRecord = ({ piece_ids: _ids, ...m }: MomentRecord): Moment => ({ ...m, pieces: m.pieces.map(withEdit) });
const byT = (a: { t: number }, b: { t: number }) => a.t - b.t;
const piecesOf = (rows: MomentRecord[]) => rows.flatMap((m) => m.pieces);

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

  async addMoment(m) {
    if (!m.pieces.length) throw new Error(`A moment is never kept without a piece (${m.id}).`);
    await done((await store('moment', 'readwrite')).add(toRecord(m)));
  },
  async updateMoment(id, p) {
    await patch<MomentRecord>('moment', id, p);
  },
  async updatePiece(id, p) {
    const tx = (await conn()).transaction('moment', 'readwrite');
    const st = tx.objectStore('moment');
    const m = (await done(st.index('piece_ids').get(id))) as MomentRecord | undefined;
    if (m) st.put({ ...m, pieces: m.pieces.map((x) => (x.id === id ? { ...x, ...p } : x)) });
    await committed(tx);
  },
  async addPiece(momentId, p) {
    const tx = (await conn()).transaction('moment', 'readwrite');
    return atomically(tx, async () => {
      const st = tx.objectStore('moment');
      const m = (await done(st.get(momentId))) as MomentRecord | undefined;
      if (!m) throw new Error(`No moment ${momentId}.`);
      if ((await done(st.index('piece_ids').count(p.id))) > 0) throw new Error(`A piece ${p.id} is kept already.`);
      st.put(toRecord({ ...m, pieces: [...m.pieces, { ...p, moment_id: momentId }].sort(byT) }));
    });
  },
  async deletePieces(ids) {
    if (!ids.length) return;
    const tx = (await conn()).transaction(['moment', 'walk_summary'], 'readwrite');
    return atomically(tx, async () => {
      const st = tx.objectStore('moment');
      const gone = new Set(ids);
      const hit = new Map<string, MomentRecord>();
      for (const id of ids) {
        const m = (await done(st.index('piece_ids').get(id))) as MomentRecord | undefined;
        if (m) hit.set(m.id, m);
      }
      for (const m of hit.values()) {
        const pieces = m.pieces.filter((p) => !gone.has(p.id));
        if (!pieces.length) throw new Error('Deleting every piece of a moment is deleting the moment.');
        st.put(toRecord({ ...m, pieces }));
      }
      const sums = tx.objectStore('walk_summary');
      for (const w of new Set([...hit.values()].map((m) => m.walk_id))) {
        if (w == null) continue;
        const s = (await done(sums.get(w))) as WalkSummary | undefined;
        const left = (await done(st.index('walk_id').getAll(w))) as MomentRecord[];
        if (s) sums.put({ ...s, ...countsOf(piecesOf(left)) });
      }
    });
  },
  async splitPiece(pieceId, nm) {
    const tx = (await conn()).transaction('moment', 'readwrite');
    return atomically(tx, async () => {
      const st = tx.objectStore('moment');
      const m = (await done(st.index('piece_ids').get(pieceId))) as MomentRecord | undefined;
      if (!m) throw new Error(`No piece ${pieceId}.`);
      if (m.pieces.length < 2) throw new Error('A moment\'s last piece is the moment.');
      if (await done(st.get(nm.id))) throw new Error(`A moment ${nm.id} is kept already.`);
      const p = m.pieces.find((x) => x.id === pieceId)!;
      st.put(toRecord({ ...m, pieces: m.pieces.filter((x) => x.id !== pieceId) }));
      st.add(toRecord({ ...nm, pieces: [{ ...p, moment_id: nm.id }] }));
    });
  },
  async getMoments(walkId) {
    return (await byWalk<MomentRecord>('moment', walkId)).map(fromRecord).sort(byT);
  },

  async momentsBetween(from, to) {
    if (!(to > from)) return [];
    const range = IDBKeyRange.bound(from, to, false, true);
    return ((await done((await store('moment')).index('t').getAll(range))) as MomentRecord[]).map(fromRecord);
  },
  async getMomentsByIds(ids) {
    const st = await store('moment');
    const got = await Promise.all(ids.map((id) => done(st.get(id)) as Promise<MomentRecord | undefined>));
    return got.filter((m): m is MomentRecord => !!m).map(fromRecord).sort(byT);
  },
  async momentsIn([w, s, e, n]) {
    const band = (await done((await store('moment')).index('lat').getAll(IDBKeyRange.bound(s, n)))) as MomentRecord[];
    return band
      .filter((m) => m.lon != null && m.lon >= w && m.lon <= e)
      .map(fromRecord)
      .sort(byT);
  },

  async listThreads() {
    const tx = (await conn()).transaction(['thread', 'thread_member', 'moment_link'], 'readonly');
    const all = <T>(n: string) => done(tx.objectStore(n).getAll()) as Promise<T[]>;
    const [threads, members, links] = await Promise.all([all<Thread>('thread'), all<Member>('thread_member'), all<Link>('moment_link')]);
    return { threads, members, links };
  },
  async applyThreads(c: ThreadsChange) {
    const tx = (await conn()).transaction(['thread', 'thread_member', 'moment_link'], 'readwrite');
    return atomically(tx, async () => {
      const threads = tx.objectStore('thread');
      const members = tx.objectStore('thread_member');
      const links = tx.objectStore('moment_link');
      for (const t of c.putThreads ?? []) threads.put(t);
      for (const m of c.putMembers ?? []) members.put(m);
      for (const l of c.putLinks ?? []) links.put(l);
      for (const id of c.deleteThreads ?? []) {
        threads.delete(id);
        await dropBy(members, 'thread_id', id);
      }
      for (const d of c.deleteMembers ?? []) members.delete([d.thread_id, d.moment_id]);
      for (const d of c.deleteLinks ?? []) links.delete([d.from_id, d.to_id]);
      await dissolveThin(tx, [
        ...(c.putThreads ?? []).map((t) => t.id),
        ...(c.putMembers ?? []).map((m) => m.thread_id),
        ...(c.deleteMembers ?? []).map((m) => m.thread_id),
      ]);
    });
  },

  async deleteWalk(walkId) {
    const names = ['walk', 'trace_point', 'moment', 'pause', 'still', 'gap_fill', 'visited_segment', 'walk_summary', 'walk_area', 'area', 'find', 'recall', 'mark', 'meta', 'thread', 'thread_member', 'moment_link'];
    const tx = (await conn()).transaction(names, 'readwrite');
    const os = (n: string) => tx.objectStore(n);
    return atomically(tx, async () => {
      const caps = (await done(os('moment').index('walk_id').getAll(walkId))) as MomentRecord[];
      await dropMoments(tx, caps.map((c) => c.id));
      for (const c of caps) {
        os('moment').delete(c.id);
        os('recall').delete(c.id);
      }
      await dropBy(os('trace_point'), 'walk_id', walkId);
      await dropBy(os('pause'), 'walk_id', walkId);
      await dropBy(os('still'), 'walk_id', walkId);
      await dropBy(os('gap_fill'), 'walk_id', walkId);
      await dropBy(os('visited_segment'), 'walk_id', walkId);
      await dropBy(os('walk_area'), 'walk_id', walkId);
      await dropBy(os('find'), 'walk_id', walkId);
      await dropBy(os('mark'), 'walk_id', walkId);
      os('walk_summary').delete(walkId);
      os('meta').delete(exploredKey(walkId));
      os('walk').delete(walkId);
      // Places only this walk was in go (D8).
      const rows = (await done(os('walk_area').getAll())) as WalkArea[];
      for (const key of staleAreas((await done(os('area').getAllKeys())) as string[], rows)) os('area').delete(key);
      // Later walks are counted again without it (D7).
      const walks = (await done(os('walk').getAll())) as Walk[];
      const visited = (await done(os('visited_segment').getAll())) as VisitedSegment[];
      const sums = (await done(os('walk_summary').getAll())) as WalkSummary[];
      const byId = new Map(sums.map((x) => [x.walk_id, x]));
      for (const ch of recountNewStreets(walks, visited, new Map(sums.map((x) => [x.walk_id, x.new_streets])))) {
        os('walk_summary').put({ ...byId.get(ch.walk_id)!, new_streets: ch.new_streets });
      }
    });
  },
  async deleteMoments(ids, opts = {}) {
    if (!ids.length) return;
    const tx = (await conn()).transaction(['moment', 'recall', 'find', 'walk_summary', 'thread', 'thread_member', 'moment_link'], 'readwrite');
    return atomically(tx, async () => {
      const capStore = tx.objectStore('moment');
      const got = (await Promise.all(ids.map((id) => done(capStore.get(id)) as Promise<MomentRecord | undefined>))).filter((c): c is MomentRecord => !!c);
      await dropMoments(tx, got.map((c) => c.id));
      for (const c of got) {
        capStore.delete(c.id);
        tx.objectStore('recall').delete(c.id);
      }
      if (!opts.keepFinds && got.length) {
        // The find store is indexed by walk only, and an index skips a loose moment's null walk.
        const gone = new Set(got.map((c) => c.id));
        const finds = tx.objectStore('find');
        const walkIds = [...new Set(got.map((c) => c.walk_id))];
        const rows = walkIds.includes(null)
          ? ((await done(finds.getAll())) as Find[])
          : (await Promise.all(walkIds.map((w) => done(finds.index('walk_id').getAll(w!)) as Promise<Find[]>))).flat();
        for (const f of rows) if (gone.has(f.capture_id)) finds.delete(f.key);
      }
      // The walks' counts follow, from the rows left (D9, audit 3).
      const sums = tx.objectStore('walk_summary');
      for (const w of new Set(got.map((c) => c.walk_id))) {
        if (w == null) continue;
        const s = (await done(sums.get(w))) as WalkSummary | undefined;
        const left = (await done(capStore.index('walk_id').getAll(w))) as MomentRecord[];
        if (s) sums.put({ ...s, ...countsOf(piecesOf(left)) });
      }
    });
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
  async startStill(walkId, at) {
    const tx = (await conn()).transaction('still', 'readwrite');
    const st = tx.objectStore('still');
    const mine = (await done(st.index('walk_id').getAll(walkId))) as Still[];
    if (!mine.some((p) => p.ended_at == null)) st.put({ walk_id: walkId, started_at: at, ended_at: null });
    await committed(tx);
  },
  async endStill(walkId, at) {
    const tx = (await conn()).transaction('still', 'readwrite');
    const st = tx.objectStore('still');
    for (const p of (await done(st.index('walk_id').getAll(walkId))) as Still[]) {
      if (p.ended_at == null) st.put({ ...p, ended_at: at });
    }
    await committed(tx);
  },
  async getStills(walkId) {
    return (await byWalk<Still>('still', walkId)).sort((a, b) => a.started_at - b.started_at);
  },

  async getGapDecisions(walkId) {
    return (await byWalk<GapDecision>('gap_fill', walkId)).sort((a, b) => a.t0 - b.t0);
  },
  async putGapDecision(d) {
    const tx = (await conn()).transaction('gap_fill', 'readwrite');
    tx.objectStore('gap_fill').put(d);
    await committed(tx);
  },

  async putSegments(segments) {
    if (segments.length === 0) return;
    const tx = (await conn()).transaction('street_segment', 'readwrite');
    const st = tx.objectStore('street_segment');
    for (const x of segments) st.put({ ...x, tile: segmentTile(x) });
    await committed(tx);
  },

  async saveSnap(walkId, segments, visited, summary, placed, complete = true) {
    const names = ['street_segment', 'visited_segment', 'walk_summary', 'walk', 'area', 'walk_area', 'moment'];
    const tx = (await conn()).transaction(names, 'readwrite');
    const walks = tx.objectStore('walk');
    const w = (await done(walks.get(walkId))) as Walk | undefined;
    // A walk deleted while its streets were read gets nothing back (audit 2).
    if (!w) return committed(tx);
    // Counts from the rows as they stand now, so a moment deleted meanwhile isn't counted (audit 3).
    const rowsNow = (await done(tx.objectStore('moment').index('walk_id').getAll(walkId))) as MomentRecord[];
    summary = { ...summary, ...countsOf(piecesOf(rowsNow)) };
    const seg = tx.objectStore('street_segment');
    for (const x of segments) seg.put({ ...x, tile: segmentTile(x) });
    const vis = tx.objectStore('visited_segment');
    for (const k of (await done(vis.index('walk_id').getAllKeys(walkId))) as IDBValidKey[]) vis.delete(k);
    for (const v of visited) vis.put(v);
    tx.objectStore('walk_summary').put(summary);
    walks.put({ ...w, snapped_build: complete ? summary.build : null });
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
    // By tile, not the whole store (perf, Nov 1).
    const idx = (await conn()).transaction('street_segment', 'readonly').objectStore('street_segment').index('tile');
    const rows = await Promise.all(tileKeysFor(bounds).map((k) => done(idx.getAll(k)) as Promise<(StreetSegment & { tile?: string })[]>));
    return rows.flat().filter((s) => intersects(segmentBbox(s), bounds)).map(({ tile: _t, ...s }) => s);
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

  async saveChecklists({ areas, items, read }) {
    const tx = (await conn()).transaction(['checklist_area', 'checklist_item', 'explore_read'], 'readwrite');
    const itemStore = tx.objectStore('checklist_item');
    const finished = committed(tx);
    // A rebuilt area's old items go first (E4); keys gone from the new list don't linger.
    await Promise.all(
      areas.map(
        (a) =>
          new Promise<void>((resolve, reject) => {
            const req = itemStore.index('area_key').openKeyCursor(IDBKeyRange.only(a.key));
            req.onsuccess = () => {
              const c = req.result;
              if (!c) return resolve();
              itemStore.delete(c.primaryKey);
              c.continue();
            };
            req.onerror = () => reject(req.error);
          }),
      ),
    );
    for (const i of items) itemStore.put({ ...i, lat: i.at[1] });
    for (const a of areas) tx.objectStore('checklist_area').put(a);
    tx.objectStore('explore_read').put(read);
    return finished;
  },
  async listChecklistAreas() {
    return (await done((await store('checklist_area')).getAll())) as ChecklistArea[];
  },
  async checklistItemsIn([w, s, e, n]) {
    const band = (await done((await store('checklist_item')).index('lat').getAll(IDBKeyRange.bound(s, n)))) as (ChecklistItem & { lat?: number })[];
    return band.filter((i) => i.at[0] >= w && i.at[0] <= e).map(({ lat: _lat, ...i }) => i);
  },
  async listExploreReads() {
    return (await done((await store('explore_read')).getAll())) as ExploreRead[];
  },
  async addFind(f) {
    const tx = (await conn()).transaction('find', 'readwrite');
    // The first find of a place stands.
    tx.objectStore('find').add(f).onerror = (e) => e.preventDefault();
    return committed(tx).catch(() => {});
  },
  async listFinds(walkId) {
    return (walkId ? await byWalk<Find>('find', walkId) : ((await done((await store('find')).getAll())) as Find[]));
  },
  async putLanding(r) {
    const tx = (await conn()).transaction('landing', 'readwrite');
    tx.objectStore('landing').put(r);
    await committed(tx);
  },
  async listLandings() {
    return (await done((await store('landing')).getAll())) as LandingRow[];
  },
  async putAtlasAreas(rows) {
    if (!rows.length) return;
    const tx = (await conn()).transaction('atlas_area', 'readwrite');
    for (const r of rows) tx.objectStore('atlas_area').put(r);
    await committed(tx);
  },
  async listAtlasAreas() {
    return (await done((await store('atlas_area')).getAll())) as AtlasArea[];
  },
  async putComplexes(rows) {
    if (!rows.length) return;
    const tx = (await conn()).transaction('complex', 'readwrite');
    for (const c of rows) tx.objectStore('complex').put(c);
    await committed(tx);
  },
  async complexesNear(at, spanDeg) {
    // A derived store of a few hundred rows at most: read whole and filtered by box.
    const all = (await done((await store('complex')).getAll())) as Complex[];
    return all
      .filter((c) => c.bbox[1] <= at[1] + spanDeg && c.bbox[3] >= at[1] - spanDeg && c.bbox[0] <= at[0] + spanDeg && c.bbox[2] >= at[0] - spanDeg)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  },
  async putOutlineTiles(tiles) {
    if (!tiles.length) return;
    const tx = (await conn()).transaction('outline_tile', 'readwrite');
    for (const t of tiles) tx.objectStore('outline_tile').put(t);
    await committed(tx);
  },
  async getOutlineTiles(keys) {
    if (!keys.length) return [];
    const s = await store('outline_tile');
    const got = await Promise.all([...new Set(keys)].sort().map((k) => done(s.get(k)) as Promise<OutlineTile | undefined>));
    return got.filter((t): t is OutlineTile => !!t);
  },
  async putWalkTiles(tiles) {
    if (!tiles.length) return;
    const tx = (await conn()).transaction('walk_tile', 'readwrite');
    for (const t of tiles) tx.objectStore('walk_tile').put(t);
    await committed(tx);
  },
  async getWalkTiles(keys) {
    if (!keys.length) return [];
    const s = await store('walk_tile');
    const got = await Promise.all([...new Set(keys)].sort().map((k) => done(s.get(k)) as Promise<WalkTile | undefined>));
    return got.filter((t): t is WalkTile => !!t);
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
  async listMarks(walkId) {
    // IndexedDB indexes skip null keys, so the home's marks are found by a scan of the store.
    const all = walkId == null
      ? ((await done((await store('mark')).getAll())) as Mark[]).filter((x) => x.walk_id == null)
      : await byWalk<Mark>('mark', walkId);
    return all.sort((a, b) => a.created_at - b.created_at);
  },
  async setRecall(r) {
    const tx = (await conn()).transaction('recall', 'readwrite');
    tx.objectStore('recall').put(r);
    await committed(tx);
  },
  async clearRecall(captureId) {
    const tx = (await conn()).transaction('recall', 'readwrite');
    tx.objectStore('recall').delete(captureId);
    await committed(tx);
  },
  async listRecalls() {
    return (await done((await store('recall')).getAll())) as Recall[];
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
  /** Removes media by key, and every key under each folder prefix (`walks/<id>/`), in one transaction. */
  async remove(keys: string[], folders: string[] = []) {
    if (!keys.length && !folders.length) return;
    const tx = (await conn()).transaction('media', 'readwrite');
    const st = tx.objectStore('media');
    for (const k of keys) st.delete(k);
    for (const f of folders) st.delete(IDBKeyRange.bound(f, `${f}\uffff`));
    await committed(tx);
  },
  /** Bytes held by the keys, and by every key under each folder prefix, each counted once. */
  async bytes(keys: string[], folders: string[] = []): Promise<number> {
    const st = await store('media');
    const sizes = new Map<string, number>();
    for (const f of folders) {
      const rows = (await done(st.getAll(IDBKeyRange.bound(f, `${f}\uffff`)))) as { key: string; blob: Blob }[];
      for (const r of rows) sizes.set(r.key, r.blob.size);
    }
    for (const k of keys) {
      if (sizes.has(k)) continue;
      const r = (await done(st.get(k))) as { blob: Blob } | undefined;
      if (r) sizes.set(k, r.blob.size);
    }
    let n = 0;
    for (const v of sizes.values()) n += v;
    return n;
  },
};
