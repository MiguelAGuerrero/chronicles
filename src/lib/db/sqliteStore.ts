// @layer adapter
/**
 * The native store over SQLite (expo-sqlite), as a factory taking how to open the database, so `npm test` runs it
 * over Node's built-in SQLite under the same Db contract as the web store (MT11). The app's instance is
 * `db/index.native.ts`.
 */
import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS } from './migrations';
import { areaFromRow, areaToRow, findFromRow, findToRow, itemFromRow, itemToRow, readFromRow, readToRow, type AreaRow, type FindRow, type ItemRow, type ReadRow } from './exploreRow';
import { placeFromRow, placeToRow, type PlaceRow } from './placeRow';
import type { Area, WalkArea } from '../areas/types';
import type { LandingRow } from '../landing/view';
import type { OutlineTile } from '../areas/outlines';
import type { WalkTile } from '../walk/types';
import type { AtlasArea } from '../atlas/atlas';
import type { Complex } from '../complexes/types';
import type { Mark, Recall } from '../discovery/types';
import { countsOf, recountNewStreets } from '../deletion/core';
import { exploredKey } from '../explore/explore';
import { DERIVED_STORES } from './stores';
import type { Capture, GapDecision, Moment, LngLat, Pause, Still, StreetSegment, TracePoint, VisitedSegment, Walk, WalkSummary } from '../types';
import { segmentBbox } from './segmentBounds';
import { thinThreads } from '../threads/rules';
import type { Link, Member, Thread, ThreadsChange } from '../threads/types';
import type { Db } from './types';
import { serializeEdit } from '../mediaEdit';
import { foldRows, type JoinedRow } from '../moment';


/** Drops the threads, among `ids`, that fewer than two moments belong to, with their memberships (OT15). */
async function dissolveThin(t: SQLiteDatabase, ids: Iterable<string>) {
  for (const id of new Set(ids)) {
    const left = await t.getAllAsync<Member>('SELECT * FROM thread_member WHERE thread_id = ?', id);
    if (!thinThreads([id], left).length) continue;
    await t.runAsync('DELETE FROM thread_member WHERE thread_id = ?', id);
    await t.runAsync('DELETE FROM thread WHERE id = ?', id);
  }
}
/** The memberships and links of deleted moments go with them, and a thread left thin dissolves (OT16, OT17). */
async function dropMoments(t: SQLiteDatabase, ids: string[]) {
  if (!ids.length) return;
  const marks = ids.map(() => '?').join(',');
  const affected = await t.getAllAsync<{ thread_id: string }>(`SELECT DISTINCT thread_id FROM thread_member WHERE moment_id IN (${marks})`, ...ids);
  await t.runAsync(`DELETE FROM thread_member WHERE moment_id IN (${marks})`, ...ids);
  await t.runAsync(`DELETE FROM moment_link WHERE from_id IN (${marks}) OR to_id IN (${marks})`, ...ids, ...ids);
  await dissolveThin(t, affected.map((r) => r.thread_id));
}

const toPlace = placeFromRow;
type MarkRow = Omit<Mark, 'at' | 'generic'> & { lon: number; lat: number; generic: number };
const toMark = ({ lon, lat, generic, ...r }: MarkRow): Mark => ({ ...r, at: [lon, lat], generic: generic === 1 });

type WalkRow = Omit<Walk, 'open'> & { open: number };
const toWalk = (r: WalkRow): Walk => ({ ...r, open: r.open === 1 });

const WALK_COLUMNS = ['started_at', 'ended_at', 'title', 'epilogue', 'open', 'area', 'snapped_build'] as const;
const MOMENT_COLUMNS = ['walk_id', 'lat', 'lon', 'segment_id'] as const;
const PIECE_COLUMNS = ['t', 'kind', 'file_path', 'body', 'caption', 'caption_y', 'thumb_path', 'edit'] as const;

/**
 * Moments joined to their pieces, one statement per read (MT7): the piece's columns are prefixed `p_` and
 * `foldRows` folds the rows into moments. `where` names the moment's columns as `m.`.
 */
const MOMENT_SELECT =
  'SELECT m.id, m.walk_id, m.t, m.lat, m.lon, m.segment_id, c.id AS p_id, c.t AS p_t, c.kind AS p_kind, c.file_path AS p_file_path, ' +
  'c.body AS p_body, c.caption AS p_caption, c.caption_y AS p_caption_y, c.thumb_path AS p_thumb_path, c.edit AS p_edit ' +
  'FROM moment m JOIN capture c ON c.moment_id = m.id';
const ORDER = ' ORDER BY m.t, m.id, c.t';

/** UPDATE ... SET for the given patch; only known column names reach the SQL. */
function setClause(patch: Record<string, unknown>, allowed: readonly string[]) {
  const keys = Object.keys(patch).filter((k) => allowed.includes(k));
  const values = keys.map((k) => {
    const v = patch[k];
    return typeof v === 'boolean' ? (v ? 1 : 0) : (v as SQLiteBindValue);
  });
  return { sql: keys.map((k) => `${k} = ?`).join(', '), values };
}

export function makeSqliteDb(open: () => Promise<SQLiteDatabase>): Db {
  let dbPromise: Promise<SQLiteDatabase> | null = null;
  function conn() {
    if (!dbPromise) {
      dbPromise = (async () => {
        const d = await open();
        await d.execAsync('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
        const row = await d.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        for (let v = row?.user_version ?? 0; v < MIGRATIONS.length; v++) {
          await d.withExclusiveTransactionAsync(async (txn) => {
            await txn.execAsync(MIGRATIONS[v]);
            await txn.execAsync(`PRAGMA user_version = ${v + 1}`);
          });
        }
        return d;
      })().catch((e) => {
        dbPromise = null; // let the next call try again instead of failing forever
        throw e;
      });
    }
    return dbPromise;
  }

  // Every write goes through one queue and one exclusive transaction, so the
  // background location task and the UI never collide on the connection.
  let queue: Promise<unknown> = Promise.resolve();
  function write(task: (txn: SQLiteDatabase) => Promise<void>): Promise<void> {
    const run = queue.then(async () => (await conn()).withExclusiveTransactionAsync(task));
    queue = run.catch(() => {});
    return run;
  }

  const db: Db = {
    createWalk(w) {
      return write((t) => t.runAsync(
        'INSERT INTO walk (id, started_at, ended_at, title, epilogue, open, area, snapped_build) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        w.id, w.started_at, w.ended_at, w.title, w.epilogue, w.open ? 1 : 0, w.area, w.snapped_build,
      ).then(() => {}));
    },
    updateWalk(id, patch) {
      const { sql, values } = setClause(patch, WALK_COLUMNS);
      if (!sql) return Promise.resolve();
      return write((t) => t.runAsync(`UPDATE walk SET ${sql} WHERE id = ?`, ...values, id).then(() => {}));
    },
    async getWalk(id) {
      const r = await (await conn()).getFirstAsync<WalkRow>('SELECT * FROM walk WHERE id = ?', id);
      return r ? toWalk(r) : null;
    },
    async listWalks() {
      const rows = await (await conn()).getAllAsync<WalkRow>('SELECT * FROM walk ORDER BY started_at DESC');
      return rows.map(toWalk);
    },
    async getOpenWalk() {
      const r = await (await conn()).getFirstAsync<WalkRow>(
        'SELECT * FROM walk WHERE open = 1 ORDER BY started_at DESC LIMIT 1',
      );
      return r ? toWalk(r) : null;
    },

    appendPoints(points) {
      if (points.length === 0) return Promise.resolve();
      return write(async (t) => {
        const stmt = await t.prepareAsync(
          'INSERT INTO trace_point (walk_id, t, lat, lon, accuracy_m, speed, course) VALUES (?, ?, ?, ?, ?, ?, ?)',
        );
        try {
          for (const p of points) await stmt.executeAsync(p.walk_id, p.t, p.lat, p.lon, p.accuracy_m, p.speed, p.course);
        } finally {
          await stmt.finalizeAsync();
        }
      });
    },
    async getPoints(walkId) {
      return (await conn()).getAllAsync<TracePoint>('SELECT * FROM trace_point WHERE walk_id = ? ORDER BY t', walkId);
    },

    addMoment(m) {
      if (!m.pieces.length) return Promise.reject(new Error(`A moment is never kept without a piece (${m.id}).`));
      return write(async (t) => {
        await t.runAsync(
          'INSERT INTO moment (id, walk_id, t, lat, lon, segment_id) VALUES (?, ?, ?, ?, ?, ?)',
          m.id, m.walk_id, m.t, m.lat, m.lon, m.segment_id,
        );
        for (const c of m.pieces) {
          await t.runAsync(
            'INSERT INTO capture (id, moment_id, t, kind, file_path, body, caption, caption_y, thumb_path, edit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            c.id, m.id, c.t, c.kind, c.file_path, c.body, c.caption ?? null, c.caption_y ?? null, c.thumb_path ?? null, serializeEdit(c.edit),
          );
        }
      });
    },
    updateMoment(id, patch) {
      const { sql, values } = setClause(patch, MOMENT_COLUMNS);
      if (!sql) return Promise.resolve();
      return write((t) => t.runAsync(`UPDATE moment SET ${sql} WHERE id = ?`, ...values, id).then(() => {}));
    },
    updatePiece(id, patch) {
      const { sql, values } = setClause('edit' in patch ? { ...patch, edit: serializeEdit(patch.edit) } : patch, PIECE_COLUMNS);
      if (!sql) return Promise.resolve();
      return write((t) => t.runAsync(`UPDATE capture SET ${sql} WHERE id = ?`, ...values, id).then(() => {}));
    },
    addPiece(momentId, c) {
      return write(async (t) => {
        if (!(await t.getFirstAsync('SELECT 1 FROM moment WHERE id = ?', momentId))) throw new Error(`No moment ${momentId}.`);
        await t.runAsync(
          'INSERT INTO capture (id, moment_id, t, kind, file_path, body, caption, caption_y, thumb_path, edit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          c.id, momentId, c.t, c.kind, c.file_path, c.body, c.caption ?? null, c.caption_y ?? null, c.thumb_path ?? null, serializeEdit(c.edit),
        );
      });
    },
    deletePieces(ids) {
      if (!ids.length) return Promise.resolve();
      const marks = ids.map(() => '?').join(',');
      return write(async (t) => {
        const hit = await t.getAllAsync<{ moment_id: string; walk_id: string | null }>(
          `SELECT DISTINCT c.moment_id, m.walk_id FROM capture c JOIN moment m ON c.moment_id = m.id WHERE c.id IN (${marks})`, ...ids,
        );
        await t.runAsync(`DELETE FROM capture WHERE id IN (${marks})`, ...ids);
        for (const h of hit) {
          if (!(await t.getFirstAsync('SELECT 1 FROM capture WHERE moment_id = ?', h.moment_id))) {
            throw new Error('Deleting every piece of a moment is deleting the moment.'); // rolls the transaction back
          }
        }
        for (const w of new Set(hit.map((h) => h.walk_id))) {
          if (w == null) continue;
          const left = await t.getAllAsync<{ kind: Capture['kind'] }>('SELECT c.kind FROM capture c JOIN moment m ON c.moment_id = m.id WHERE m.walk_id = ?', w);
          const s = countsOf(left);
          await t.runAsync('UPDATE walk_summary SET photos = ?, videos = ?, voices = ?, notes = ? WHERE walk_id = ?', s.photos, s.videos ?? 0, s.voices, s.notes, w);
        }
      });
    },
    splitPiece(pieceId, nm) {
      return write(async (t) => {
        const row = await t.getFirstAsync<{ moment_id: string }>('SELECT moment_id FROM capture WHERE id = ?', pieceId);
        if (!row) throw new Error(`No piece ${pieceId}.`);
        const left = await t.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM capture WHERE moment_id = ?', row.moment_id);
        if (!left || left.n < 2) throw new Error("A moment's last piece is the moment.");
        await t.runAsync(
          'INSERT INTO moment (id, walk_id, t, lat, lon, segment_id) VALUES (?, ?, ?, ?, ?, ?)',
          nm.id, nm.walk_id, nm.t, nm.lat, nm.lon, nm.segment_id,
        );
        await t.runAsync('UPDATE capture SET moment_id = ? WHERE id = ?', nm.id, pieceId);
      });
    },
    async getMoments(walkId) {
      return foldRows(await (await conn()).getAllAsync<JoinedRow>(`${MOMENT_SELECT} WHERE m.walk_id = ?${ORDER}`, walkId));
    },

    async momentsBetween(from, to) {
      return foldRows(await (await conn()).getAllAsync<JoinedRow>(`${MOMENT_SELECT} WHERE m.t >= ? AND m.t < ?${ORDER}`, from, to));
    },
    async getMomentsByIds(ids) {
      if (!ids.length) return [];
      return foldRows(await (await conn()).getAllAsync<JoinedRow>(`${MOMENT_SELECT} WHERE m.id IN (${ids.map(() => '?').join(',')})${ORDER}`, ...ids));
    },
    async momentsIn([w, s, e, n]) {
      return foldRows(await (await conn()).getAllAsync<JoinedRow>(
        `${MOMENT_SELECT} WHERE m.lat BETWEEN ? AND ? AND m.lon BETWEEN ? AND ?${ORDER}`, s, n, w, e,
      ));
    },

    async listThreads() {
      const c = await conn();
      const [threads, members, links] = await Promise.all([
        c.getAllAsync<Thread>('SELECT * FROM thread ORDER BY created_at'),
        c.getAllAsync<Member>('SELECT * FROM thread_member ORDER BY added_at'),
        c.getAllAsync<Link>('SELECT * FROM moment_link ORDER BY created_at'),
      ]);
      return { threads, members, links };
    },
    applyThreads(c: ThreadsChange) {
      return write(async (t) => {
        for (const x of c.putThreads ?? []) await t.runAsync('INSERT OR REPLACE INTO thread (id, name, created_at) VALUES (?, ?, ?)', x.id, x.name, x.created_at);
        for (const x of c.putMembers ?? []) await t.runAsync('INSERT OR REPLACE INTO thread_member (thread_id, moment_id, added_at) VALUES (?, ?, ?)', x.thread_id, x.moment_id, x.added_at);
        for (const x of c.putLinks ?? []) await t.runAsync('INSERT OR REPLACE INTO moment_link (from_id, to_id, created_at) VALUES (?, ?, ?)', x.from_id, x.to_id, x.created_at);
        for (const id of c.deleteThreads ?? []) {
          await t.runAsync('DELETE FROM thread_member WHERE thread_id = ?', id);
          await t.runAsync('DELETE FROM thread WHERE id = ?', id);
        }
        for (const d of c.deleteMembers ?? []) await t.runAsync('DELETE FROM thread_member WHERE thread_id = ? AND moment_id = ?', d.thread_id, d.moment_id);
        for (const d of c.deleteLinks ?? []) await t.runAsync('DELETE FROM moment_link WHERE from_id = ? AND to_id = ?', d.from_id, d.to_id);
        await dissolveThin(t, [
          ...(c.putThreads ?? []).map((x) => x.id),
          ...(c.putMembers ?? []).map((x) => x.thread_id),
          ...(c.deleteMembers ?? []).map((x) => x.thread_id),
        ]);
      });
    },

    deleteWalk(walkId) {
      return write(async (t) => {
        await dropMoments(t, (await t.getAllAsync<{ id: string }>('SELECT id FROM moment WHERE walk_id = ?', walkId)).map((r) => r.id));
        await t.runAsync('DELETE FROM recall WHERE capture_id IN (SELECT id FROM moment WHERE walk_id = ?)', walkId);
        await t.runAsync('DELETE FROM capture WHERE moment_id IN (SELECT id FROM moment WHERE walk_id = ?)', walkId);
        for (const table of ['moment', 'trace_point', 'pause', 'still', 'gap_fill', 'visited_segment', 'walk_area', 'find', 'mark', 'walk_summary']) {
          await t.runAsync(`DELETE FROM ${table} WHERE walk_id = ?`, walkId);
        }
        await t.runAsync('DELETE FROM meta WHERE key = ?', exploredKey(walkId));
        await t.runAsync('DELETE FROM walk WHERE id = ?', walkId);
        // Places only this walk was in go (D8).
        await t.runAsync('DELETE FROM area WHERE key NOT IN (SELECT DISTINCT area_key FROM walk_area)');
        // Later walks are counted again without it (D7).
        const walks = await t.getAllAsync<{ id: string; started_at: number }>('SELECT id, started_at FROM walk');
        const visited = await t.getAllAsync<{ walk_id: string; street_key: string }>('SELECT walk_id, street_key FROM visited_segment');
        const stored = await t.getAllAsync<{ walk_id: string; new_streets: number }>('SELECT walk_id, new_streets FROM walk_summary');
        for (const ch of recountNewStreets(walks, visited, new Map(stored.map((r) => [r.walk_id, r.new_streets])))) {
          await t.runAsync('UPDATE walk_summary SET new_streets = ? WHERE walk_id = ?', ch.new_streets, ch.walk_id);
        }
      });
    },
    deleteMoments(ids, opts = {}) {
      if (!ids.length) return Promise.resolve();
      const marks = ids.map(() => '?').join(',');
      return write(async (t) => {
        const got = await t.getAllAsync<Omit<Moment, 'pieces'>>(`SELECT * FROM moment WHERE id IN (${marks})`, ...ids);
        await dropMoments(t, got.map((c) => c.id));
        await t.runAsync(`DELETE FROM capture WHERE moment_id IN (${marks})`, ...ids);
        await t.runAsync(`DELETE FROM moment WHERE id IN (${marks})`, ...ids);
        await t.runAsync(`DELETE FROM recall WHERE capture_id IN (${marks})`, ...ids);
        if (!opts.keepFinds) await t.runAsync(`DELETE FROM find WHERE capture_id IN (${marks})`, ...ids);
        // The walks' counts follow, from the rows left (D9, audit 3).
        for (const w of new Set(got.map((c) => c.walk_id))) {
          if (w == null) continue;
          const left = await t.getAllAsync<{ kind: Capture['kind'] }>('SELECT c.kind FROM capture c JOIN moment m ON c.moment_id = m.id WHERE m.walk_id = ?', w);
          const s = countsOf(left);
          await t.runAsync(
            'UPDATE walk_summary SET photos = ?, videos = ?, voices = ?, notes = ? WHERE walk_id = ?',
            s.photos, s.videos ?? 0, s.voices, s.notes, w,
          );
        }
      });
    },

    startPause(walkId, at) {
      return write(async (t) => {
        const open = await t.getFirstAsync('SELECT 1 FROM pause WHERE walk_id = ? AND ended_at IS NULL', walkId);
        if (!open) await t.runAsync('INSERT INTO pause (walk_id, started_at, ended_at) VALUES (?, ?, NULL)', walkId, at);
      });
    },
    endPause(walkId, at) {
      return write((t) => t.runAsync('UPDATE pause SET ended_at = ? WHERE walk_id = ? AND ended_at IS NULL', at, walkId).then(() => {}));
    },
    async getPauses(walkId) {
      return (await conn()).getAllAsync<Pause>('SELECT * FROM pause WHERE walk_id = ? ORDER BY started_at', walkId);
    },
    startStill(walkId, at) {
      return write(async (t) => {
        const open = await t.getFirstAsync('SELECT 1 FROM still WHERE walk_id = ? AND ended_at IS NULL', walkId);
        if (!open) await t.runAsync('INSERT OR IGNORE INTO still (walk_id, started_at, ended_at) VALUES (?, ?, NULL)', walkId, at);
      });
    },
    endStill(walkId, at) {
      return write((t) => t.runAsync('UPDATE still SET ended_at = ? WHERE walk_id = ? AND ended_at IS NULL', at, walkId).then(() => {}));
    },
    async getStills(walkId) {
      return (await conn()).getAllAsync<Still>('SELECT * FROM still WHERE walk_id = ? ORDER BY started_at', walkId);
    },

    async getGapDecisions(walkId) {
      const rows = await (await conn()).getAllAsync<Omit<GapDecision, 'path' | 'state'> & { path: string; state: string }>(
        'SELECT * FROM gap_fill WHERE walk_id = ? ORDER BY t0', walkId,
      );
      return rows.map((r) => ({ ...r, state: r.state === 'kept' ? 'kept' : 'dismissed', path: JSON.parse(r.path) as LngLat[] }));
    },
    putGapDecision(d) {
      return write((t) =>
        t.runAsync(
          'INSERT OR REPLACE INTO gap_fill (walk_id, t0, t1, state, path, length_m, street, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          d.walk_id, d.t0, d.t1, d.state, JSON.stringify(d.path), d.length_m, d.street, d.decided_at,
        ).then(() => {}),
      );
    },

    putSegments(segments) {
      if (segments.length === 0) return Promise.resolve();
      return write(async (t) => {
        const seg = await t.prepareAsync(
          'INSERT OR REPLACE INTO street_segment (id, name, kind_detail, length_m, geometry, w, s, e, n, build) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );
        try {
          for (const x of segments) {
            const [w, so, e, n] = segmentBbox(x);
            await seg.executeAsync(x.id, x.name, x.kind_detail, x.length_m, JSON.stringify(x.geometry), w, so, e, n, x.build);
          }
        } finally {
          await seg.finalizeAsync();
        }
      });
    },

    saveSnap(walkId, segments, visited, snapSummary, placed, complete = true) {
      return write(async (t) => {
        // A walk deleted while its streets were read gets nothing back (audit 2).
        if (!(await t.getFirstAsync('SELECT 1 FROM walk WHERE id = ?', walkId))) return;
        // Counts from the rows as they stand now, so a moment deleted meanwhile isn't counted (audit 3).
        const rowsNow = await t.getAllAsync<{ kind: Capture['kind'] }>('SELECT c.kind FROM capture c JOIN moment m ON c.moment_id = m.id WHERE m.walk_id = ?', walkId);
        const s = { ...snapSummary, ...countsOf(rowsNow) };
        const seg = await t.prepareAsync(
          'INSERT OR REPLACE INTO street_segment (id, name, kind_detail, length_m, geometry, w, s, e, n, build) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );
        try {
          for (const x of segments) {
            const [w, so, e, n] = segmentBbox(x);
            await seg.executeAsync(x.id, x.name, x.kind_detail, x.length_m, JSON.stringify(x.geometry), w, so, e, n, x.build);
          }
        } finally {
          await seg.finalizeAsync();
        }
        await t.runAsync('DELETE FROM visited_segment WHERE walk_id = ?', walkId);
        for (const v of visited) {
          await t.runAsync(
            'INSERT INTO visited_segment (segment_id, walk_id, covered_fraction, first_t, street_key) VALUES (?, ?, ?, ?, ?)',
            v.segment_id, v.walk_id, v.covered_fraction, v.first_t, v.street_key,
          );
        }
        await t.runAsync(
          `INSERT OR REPLACE INTO walk_summary (walk_id, build, distance_m, duration_ms, new_streets, streets_walked, photos, videos, voices, notes, streets_read, ride_m)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          s.walk_id, s.build, s.distance_m, s.duration_ms, s.new_streets, s.streets_walked, s.photos, s.videos ?? 0, s.voices, s.notes, s.streets_read ? 1 : 0, s.ride_m ?? 0,
        );
        await t.runAsync('UPDATE walk SET snapped_build = ? WHERE id = ?', complete ? s.build : null, walkId);
        if (placed) {
          await t.runAsync('DELETE FROM walk_area WHERE walk_id = ?', walkId);
          for (const a of placed.areas) {
            await t.runAsync(
              'INSERT OR REPLACE INTO area (key, level, name, parent_key, lon, lat, rules) VALUES (?, ?, ?, ?, ?, ?, ?)',
              a.key, a.level, a.name, a.parent_key, a.lon, a.lat, a.rules,
            );
          }
          for (const r of placed.rows) {
            await t.runAsync(
              'INSERT INTO walk_area (walk_id, area_key, metres, first_t, last_t, lon, lat) VALUES (?, ?, ?, ?, ?, ?, ?)',
              r.walk_id, r.area_key, r.metres, r.first_t, r.last_t, r.lon, r.lat,
            );
          }
          await t.runAsync('DELETE FROM area WHERE key NOT IN (SELECT DISTINCT area_key FROM walk_area)');
        }
      });
    },
    async listAreas() {
      return (await conn()).getAllAsync<Area>('SELECT * FROM area');
    },
    async listWalkAreas() {
      return (await conn()).getAllAsync<WalkArea>('SELECT * FROM walk_area');
    },
    async getSegmentsIn([w, s, e, n]) {
      const rows = await (await conn()).getAllAsync<Omit<StreetSegment, 'geometry'> & { geometry: string }>(
        'SELECT id, name, kind_detail, length_m, geometry, build FROM street_segment WHERE w <= ? AND e >= ? AND s <= ? AND n >= ?',
        e, w, n, s,
      );
      return rows.map((r) => ({ ...r, geometry: JSON.parse(r.geometry) }));
    },
    async getVisited(walkId) {
      return (await conn()).getAllAsync<VisitedSegment>('SELECT * FROM visited_segment WHERE walk_id = ?', walkId);
    },
    async visitedSegmentIds() {
      const rows = await (await conn()).getAllAsync<{ segment_id: string }>('SELECT DISTINCT segment_id FROM visited_segment');
      return new Set(rows.map((r) => r.segment_id));
    },
    async streetKeysBefore(startedAt) {
      const rows = await (await conn()).getAllAsync<{ street_key: string }>(
        'SELECT DISTINCT v.street_key FROM visited_segment v JOIN walk w ON w.id = v.walk_id WHERE w.started_at < ?',
        startedAt,
      );
      return new Set(rows.map((r) => r.street_key));
    },
    async listSummaries() {
      const rows = await (await conn()).getAllAsync<Omit<WalkSummary, 'streets_read'> & { streets_read: number }>(
        'SELECT * FROM walk_summary',
      );
      return rows.map((r) => ({ ...r, ride_m: r.ride_m ?? undefined, streets_read: r.streets_read === 1 }));
    },

    saveChecklists({ areas, items, read }) {
      return write(async (t) => {
        // A rebuilt area's old items go first (E4).
        for (const a of areas) await t.runAsync('DELETE FROM checklist_item WHERE area_key = ?', a.key);
        const st = await t.prepareAsync(
          'INSERT OR REPLACE INTO checklist_item (key, area_key, name, category, kind, lon, lat, generic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        );
        try {
          for (const i of items) {
            const r = itemToRow(i);
            await st.executeAsync(r.key, r.area_key, r.name, r.category, r.kind, r.lon, r.lat, r.generic);
          }
        } finally {
          await st.finalizeAsync();
        }
        for (const a of areas) {
          const r = areaToRow(a);
          await t.runAsync(
            'INSERT OR REPLACE INTO checklist_area (key, level, name, lon, lat, build, built_at, count, archive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            r.key, r.level, r.name, r.lon, r.lat, r.build, r.built_at, r.count, r.archive ?? null,
          );
        }
        const r = readToRow(read);
        await t.runAsync(
          'INSERT OR REPLACE INTO explore_read (key, lon, lat, build, read_at, candidates) VALUES (?, ?, ?, ?, ?, ?)',
          r.key, r.lon, r.lat, r.build, r.read_at, r.candidates,
        );
      });
    },
    async listChecklistAreas() {
      return (await (await conn()).getAllAsync<AreaRow>('SELECT * FROM checklist_area')).map(areaFromRow);
    },
    async checklistItemsIn([w, s, e, n]) {
      const rows = await (await conn()).getAllAsync<ItemRow>(
        'SELECT * FROM checklist_item WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?', s, n, w, e,
      );
      return rows.map(itemFromRow);
    },
    async listExploreReads() {
      return (await (await conn()).getAllAsync<ReadRow>('SELECT * FROM explore_read')).map(readFromRow);
    },
    addFind(f) {
      const r = findToRow(f);
      return write((t) =>
        t.runAsync(
          // The first find of a place stands.
          `INSERT OR IGNORE INTO find (key, area_key, walk_id, capture_id, found_at, name, category, kind, lon, lat, generic)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          r.key, r.area_key, r.walk_id, r.capture_id, r.found_at, r.name, r.category, r.kind, r.lon, r.lat, r.generic,
        ).then(() => {}),
      );
    },
    async listFinds(walkId) {
      const d = await conn();
      const rows = walkId
        ? await d.getAllAsync<FindRow>('SELECT * FROM find WHERE walk_id = ? ORDER BY found_at', walkId)
        : await d.getAllAsync<FindRow>('SELECT * FROM find ORDER BY found_at');
      return rows.map(findFromRow);
    },
    putLanding(r) {
      return write((t) =>
        t.runAsync(
          'INSERT OR REPLACE INTO landing (key, lon, lat, analysis, build, rules, analyzed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          r.key, r.centre[0], r.centre[1], JSON.stringify(r.analysis), r.build, r.rules, r.analyzed_at,
        ).then(() => {}),
      );
    },
    putAtlasAreas(rows) {
      if (!rows.length) return Promise.resolve();
      return write(async (t) => {
        for (const r of rows) {
          await t.runAsync(
            'INSERT OR REPLACE INTO atlas_area (key, level, name, lon, lat, reach_m, build, code, listed_at, read_at, failed_at, profile) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            r.key, r.level, r.name, r.at[0], r.at[1], r.reachM, r.build, r.code, r.listed_at, r.read_at, r.failed_at, r.profile ? JSON.stringify(r.profile) : null,
          );
        }
      });
    },
    async listAtlasAreas() {
      type Row = { key: string; level: AtlasArea['level']; name: string; lon: number; lat: number; reach_m: number; build: string; code: string; listed_at: number; read_at: number | null; failed_at: number | null; profile: string | null };
      const rows = await (await conn()).getAllAsync<Row>('SELECT * FROM atlas_area');
      return rows.map((r) => ({
        key: r.key, level: r.level, name: r.name, at: [r.lon, r.lat] as [number, number], reachM: r.reach_m, build: r.build, code: r.code,
        listed_at: r.listed_at, read_at: r.read_at, failed_at: r.failed_at, profile: r.profile ? JSON.parse(r.profile) : null,
      }));
    },
    putComplexes(rows) {
      if (!rows.length) return Promise.resolve();
      return write(async (t) => {
        for (const c of rows) {
          await t.runAsync(
            'INSERT OR REPLACE INTO complex (id, name, kind, release, code, lon, lat, west, south, east, north, polygons) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            c.id, c.name, c.kind, c.release, c.code, c.at[0], c.at[1], c.bbox[0], c.bbox[1], c.bbox[2], c.bbox[3], JSON.stringify(c.polygons),
          );
        }
      });
    },
    async complexesNear(at, spanDeg) {
      type Row = { id: string; name: string; kind: Complex['kind']; release: string; code: string; lon: number; lat: number; west: number; south: number; east: number; north: number; polygons: string };
      const rows = await (await conn()).getAllAsync<Row>(
        'SELECT * FROM complex WHERE south <= ? AND north >= ? AND west <= ? AND east >= ? ORDER BY id',
        at[1] + spanDeg, at[1] - spanDeg, at[0] + spanDeg, at[0] - spanDeg,
      );
      return rows.map((r) => ({ id: r.id, name: r.name, kind: r.kind, release: r.release, code: r.code, at: [r.lon, r.lat] as [number, number], bbox: [r.west, r.south, r.east, r.north] as [number, number, number, number], polygons: JSON.parse(r.polygons) }));
    },
    putOutlineTiles(tiles) {
      if (!tiles.length) return Promise.resolve();
      return write(async (t) => {
        for (const r of tiles) {
          await t.runAsync(
            'INSERT OR REPLACE INTO outline_tile (key, z, x, y, release, read_at, pieces, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            r.key, r.z, r.x, r.y, r.release, r.read_at, JSON.stringify(r.pieces), JSON.stringify(r.points),
          );
        }
      });
    },
    async getOutlineTiles(keys) {
      if (!keys.length) return [];
      const want = [...new Set(keys)].sort();
      type Row = Omit<OutlineTile, 'pieces' | 'points'> & { pieces: string; points: string };
      const rows = await (await conn()).getAllAsync<Row>(`SELECT * FROM outline_tile WHERE key IN (${want.map(() => '?').join(', ')}) ORDER BY key`, ...want);
      return rows.map((r) => ({ ...r, pieces: JSON.parse(r.pieces), points: JSON.parse(r.points) }));
    },
    putWalkTiles(tiles) {
      if (!tiles.length) return Promise.resolve();
      return write(async (t) => {
        for (const r of tiles) {
          await t.runAsync(
            'INSERT OR REPLACE INTO walk_tile (key, x, y, build, code, source, read_at, ways, junctions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            r.key, r.x, r.y, r.build, r.code, r.from, r.read_at, JSON.stringify(r.ways), JSON.stringify(r.junctions),
          );
        }
      });
    },
    async getWalkTiles(keys) {
      if (!keys.length) return [];
      const want = [...new Set(keys)].sort();
      type Row = { key: string; x: number; y: number; build: string; code: string; source: WalkTile['from']; read_at: number; ways: string; junctions: string | null };
      const rows = await (await conn()).getAllAsync<Row>(`SELECT * FROM walk_tile WHERE key IN (${want.map(() => '?').join(', ')}) ORDER BY key`, ...want);
      return rows.map(({ source, ways, junctions, ...r }) => ({ ...r, from: source, ways: JSON.parse(ways), junctions: junctions ? JSON.parse(junctions) : [] }));
    },
    async listLandings() {
      const rows = await (await conn()).getAllAsync<Omit<LandingRow, 'centre' | 'analysis'> & { lon: number; lat: number; analysis: string }>('SELECT * FROM landing');
      return rows.map(({ lon, lat, analysis, ...r }) => ({ ...r, centre: [lon, lat] as [number, number], analysis: JSON.parse(analysis) }));
    },
    async getMeta(key) {
      const r = await (await conn()).getFirstAsync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key);
      return r?.value ?? null;
    },
    setMeta(key, value) {
      return write((t) => t.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value).then(() => {}));
    },
    putPlaces(places) {
      if (places.length === 0) return Promise.resolve();
      return write(async (t) => {
        const st = await t.prepareAsync(
          'INSERT OR REPLACE INTO place (key, name, category, lon, lat, generic, build, markable) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        );
        try {
          for (const p of places) {
            const r = placeToRow(p);
            await st.executeAsync(r.key, r.name, r.category, r.lon, r.lat, r.generic, r.build, r.markable);
          }
        } finally {
          await st.finalizeAsync();
        }
      });
    },
    async placesIn([w, s, e, n]) {
      const rows = await (await conn()).getAllAsync<PlaceRow>(
        'SELECT * FROM place WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?', s, n, w, e,
      );
      return rows.map(toPlace);
    },
    async listMarks(walkId) {
      const d = await conn();
      const rows = walkId == null
        ? await d.getAllAsync<MarkRow>('SELECT * FROM mark WHERE walk_id IS NULL ORDER BY created_at')
        : await d.getAllAsync<MarkRow>('SELECT * FROM mark WHERE walk_id = ? ORDER BY created_at', walkId);
      return rows.map(toMark);
    },
    setRecall(r) {
      return write((t) =>
        t.runAsync(
          'INSERT OR REPLACE INTO recall (capture_id, frequency, until, last_fired_at, fired_count, last_walk_id) VALUES (?, ?, ?, ?, ?, ?)',
          r.capture_id, r.frequency, r.until, r.last_fired_at, r.fired_count, r.last_walk_id,
        ).then(() => {}),
      );
    },
    clearRecall(captureId) {
      return write((t) => t.runAsync('DELETE FROM recall WHERE capture_id = ?', captureId).then(() => {}));
    },
    async listRecalls() {
      return (await conn()).getAllAsync<Recall>('SELECT * FROM recall');
    },
    purgeDerived() {
      const clear = DERIVED_STORES.map((s) => `DELETE FROM ${s};`).join(' ');
      return write((t) => t.execAsync(`${clear} UPDATE walk SET snapped_build = NULL;`));
    },
  };
  return db;
}
