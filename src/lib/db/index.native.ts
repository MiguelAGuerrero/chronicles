import * as SQLite from 'expo-sqlite';
import { areaFromRow, areaToRow, findFromRow, findToRow, itemFromRow, itemToRow, readFromRow, readToRow, type AreaRow, type FindRow, type ItemRow, type ReadRow } from './exploreRow';
import { placeFromRow, placeToRow, type PlaceRow } from './placeRow';
import type { Area, WalkArea } from '../areas/types';
import type { LandingRow } from '../landing/view';
import type { Mark, MarkOrigin, MarkState, Offered, Recall } from '../discovery/types';
import { DERIVED_STORES } from './stores';
import type { Capture, Pause, StreetSegment, TracePoint, VisitedSegment, Walk, WalkSummary } from '../types';
import { segmentBbox } from './segmentBounds';
import type { Db } from './types';

// Ordered migrations; PRAGMA user_version records how many have run.
const MIGRATIONS = [
  `
  CREATE TABLE walk (
    id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, ended_at INTEGER,
    title TEXT, epilogue TEXT, open INTEGER NOT NULL, area TEXT
  );
  CREATE TABLE trace_point (
    walk_id TEXT NOT NULL, t INTEGER NOT NULL, lat REAL NOT NULL, lon REAL NOT NULL,
    accuracy_m REAL, speed REAL, course REAL
  );
  CREATE INDEX trace_point_walk ON trace_point (walk_id, t);
  CREATE TABLE capture (
    id TEXT PRIMARY KEY, walk_id TEXT NOT NULL, t INTEGER NOT NULL, lat REAL, lon REAL,
    kind TEXT NOT NULL, file_path TEXT, body TEXT, segment_id TEXT
  );
  CREATE INDEX capture_walk ON capture (walk_id, t);
  CREATE TABLE street_segment (
    id TEXT PRIMARY KEY, name TEXT, kind_detail TEXT NOT NULL, length_m REAL NOT NULL,
    geometry TEXT NOT NULL, w REAL NOT NULL, s REAL NOT NULL, e REAL NOT NULL, n REAL NOT NULL
  );
  CREATE INDEX street_segment_bbox ON street_segment (w, e, s, n);
  CREATE TABLE visited_segment (
    segment_id TEXT NOT NULL, walk_id TEXT NOT NULL, covered_fraction REAL NOT NULL, first_t INTEGER NOT NULL,
    PRIMARY KEY (segment_id, walk_id)
  );
  `,
  // Versioned derived cache, per-walk summaries and the media/meta tables.
  `
  ALTER TABLE walk ADD COLUMN snapped_build TEXT;
  DELETE FROM street_segment;
  DELETE FROM visited_segment;
  ALTER TABLE street_segment ADD COLUMN build TEXT NOT NULL DEFAULT '';
  ALTER TABLE visited_segment ADD COLUMN street_key TEXT NOT NULL DEFAULT '';
  CREATE INDEX visited_segment_walk ON visited_segment (walk_id);
  CREATE TABLE walk_summary (
    walk_id TEXT PRIMARY KEY, build TEXT NOT NULL, distance_m REAL NOT NULL, duration_ms INTEGER NOT NULL,
    new_streets INTEGER NOT NULL, streets_walked INTEGER NOT NULL,
    photos INTEGER NOT NULL, voices INTEGER NOT NULL, notes INTEGER NOT NULL, streets_read INTEGER NOT NULL
  );
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
  // Video captures.
  `
  ALTER TABLE walk_summary ADD COLUMN videos INTEGER NOT NULL DEFAULT 0;
  `,
  // Pauses, photo captions, and capture lookup by place.
  `
  CREATE TABLE pause (walk_id TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, PRIMARY KEY (walk_id, started_at));
  ALTER TABLE capture ADD COLUMN caption TEXT;
  ALTER TABLE capture ADD COLUMN caption_y REAL;
  CREATE INDEX capture_place ON capture (lat, lon);
  `,
  // v0.5: the places each walk was in (a cache, rebuilt when a walk is placed again).
  `
  CREATE TABLE area (
    key TEXT PRIMARY KEY, level TEXT NOT NULL, name TEXT NOT NULL, parent_key TEXT,
    lon REAL NOT NULL, lat REAL NOT NULL, rules TEXT NOT NULL
  );
  CREATE TABLE walk_area (
    walk_id TEXT NOT NULL, area_key TEXT NOT NULL, metres REAL NOT NULL,
    first_t INTEGER NOT NULL, last_t INTEGER NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL,
    PRIMARY KEY (walk_id, area_key)
  );
  CREATE INDEX walk_area_area ON walk_area (area_key);
  `,
  // v1 discovery: the place cache, and the truth of what was offered, marked and recalled.
  `
  CREATE TABLE place (
    key TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
    lon REAL NOT NULL, lat REAL NOT NULL, generic INTEGER NOT NULL, build TEXT NOT NULL
  );
  CREATE INDEX place_at ON place (lat, lon);
  CREATE TABLE offered (
    key TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
    lon REAL NOT NULL, lat REAL NOT NULL, generic INTEGER NOT NULL,
    offered_at INTEGER NOT NULL, origin TEXT NOT NULL
  );
  CREATE TABLE mark (
    id TEXT PRIMARY KEY, walk_id TEXT, key TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL,
    lon REAL NOT NULL, lat REAL NOT NULL, generic INTEGER NOT NULL, origin TEXT NOT NULL,
    state TEXT NOT NULL, created_at INTEGER NOT NULL, resolved_at INTEGER, capture_id TEXT
  );
  CREATE INDEX mark_walk ON mark (walk_id);
  CREATE TABLE recall (
    capture_id TEXT PRIMARY KEY, frequency TEXT NOT NULL, until INTEGER,
    last_fired_at INTEGER, fired_count INTEGER NOT NULL, last_walk_id TEXT
  );
  `,
  // v1.5 landing: areas analyzed for where to start (a cache, kept across builds and shown stale).
  `
  CREATE TABLE landing (
    key TEXT PRIMARY KEY, lon REAL NOT NULL, lat REAL NOT NULL, analysis TEXT NOT NULL,
    build TEXT NOT NULL, rules TEXT NOT NULL, analyzed_at INTEGER NOT NULL
  );
  `,
  // 8: whether a place can be a mark (S18-S20); null for rows cached before it, which are not.
  `
  ALTER TABLE place ADD COLUMN markable INTEGER;
  `,
  // 9: explore (E13): checklists and finds are kept; where reads happened is derived.
  `
  CREATE TABLE checklist_area (
    key TEXT PRIMARY KEY, level TEXT NOT NULL, name TEXT NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL,
    build TEXT NOT NULL, built_at INTEGER NOT NULL, count INTEGER NOT NULL
  );
  CREATE TABLE checklist_item (
    key TEXT PRIMARY KEY, area_key TEXT, name TEXT NOT NULL, category TEXT NOT NULL, kind TEXT NOT NULL,
    lon REAL NOT NULL, lat REAL NOT NULL, generic INTEGER NOT NULL
  );
  CREATE INDEX checklist_item_area ON checklist_item (area_key);
  CREATE INDEX checklist_item_lat ON checklist_item (lat);
  CREATE TABLE find (
    key TEXT PRIMARY KEY, area_key TEXT, walk_id TEXT NOT NULL, capture_id TEXT NOT NULL, found_at INTEGER NOT NULL,
    name TEXT NOT NULL, category TEXT NOT NULL, kind TEXT NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL, generic INTEGER NOT NULL
  );
  CREATE INDEX find_walk ON find (walk_id);
  CREATE TABLE explore_read (
    key TEXT PRIMARY KEY, lon REAL NOT NULL, lat REAL NOT NULL, build TEXT NOT NULL, read_at INTEGER NOT NULL, candidates TEXT NOT NULL
  );
  `,
  // 10: ridden distance (rides, R6). Null on summaries written before it, so the replay falls back to the trace's.
  `
  ALTER TABLE walk_summary ADD COLUMN ride_m REAL;
  `,
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
function conn() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const d = await SQLite.openDatabaseAsync('chronicles.db');
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
function write(task: (txn: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  const run = queue.then(async () => (await conn()).withExclusiveTransactionAsync(task));
  queue = run.catch(() => {});
  return run;
}

const toPlace = placeFromRow;
type OfferedRow = Omit<PlaceRow, 'build' | 'markable'> & { offered_at: number; origin: MarkOrigin };
const toOffered = ({ lon, lat, generic, ...r }: OfferedRow): Offered => ({ ...r, at: [lon, lat], generic: generic === 1 });

type MarkRow = Omit<Mark, 'at' | 'generic'> & { lon: number; lat: number; generic: number };
const toMark = ({ lon, lat, generic, ...r }: MarkRow): Mark => ({ ...r, at: [lon, lat], generic: generic === 1 });
const MARK_COLUMNS = ['walk_id', 'state', 'resolved_at', 'capture_id'] as const;
const OFFERED_INSERT =
  'INSERT OR IGNORE INTO offered (key, name, category, lon, lat, generic, offered_at, origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

type WalkRow = Omit<Walk, 'open'> & { open: number };
const toWalk = (r: WalkRow): Walk => ({ ...r, open: r.open === 1 });

const WALK_COLUMNS = ['started_at', 'ended_at', 'title', 'epilogue', 'open', 'area', 'snapped_build'] as const;
const CAPTURE_COLUMNS = ['walk_id', 't', 'lat', 'lon', 'kind', 'file_path', 'body', 'segment_id', 'caption', 'caption_y'] as const;

/** UPDATE ... SET for the given patch; only known column names reach the SQL. */
function setClause(patch: Record<string, unknown>, allowed: readonly string[]) {
  const keys = Object.keys(patch).filter((k) => allowed.includes(k));
  const values = keys.map((k) => {
    const v = patch[k];
    return typeof v === 'boolean' ? (v ? 1 : 0) : (v as SQLite.SQLiteBindValue);
  });
  return { sql: keys.map((k) => `${k} = ?`).join(', '), values };
}

export const db: Db = {
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

  addCapture(c) {
    return write((t) => t.runAsync(
      'INSERT INTO capture (id, walk_id, t, lat, lon, kind, file_path, body, segment_id, caption, caption_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      c.id, c.walk_id, c.t, c.lat, c.lon, c.kind, c.file_path, c.body, c.segment_id, c.caption ?? null, c.caption_y ?? null,
    ).then(() => {}));
  },
  updateCapture(id, patch) {
    const { sql, values } = setClause(patch, CAPTURE_COLUMNS);
    if (!sql) return Promise.resolve();
    return write((t) => t.runAsync(`UPDATE capture SET ${sql} WHERE id = ?`, ...values, id).then(() => {}));
  },
  async getCaptures(walkId) {
    return (await conn()).getAllAsync<Capture>('SELECT * FROM capture WHERE walk_id = ? ORDER BY t', walkId);
  },

  async getCapturesByIds(ids) {
    if (!ids.length) return [];
    return (await conn()).getAllAsync<Capture>(`SELECT * FROM capture WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY t`, ...ids);
  },
  async capturesIn([w, s, e, n]) {
    return (await conn()).getAllAsync<Capture>(
      'SELECT * FROM capture WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? ORDER BY t', s, n, w, e,
    );
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

  saveSnap(walkId, segments, visited, s, placed, complete = true) {
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
          'INSERT OR REPLACE INTO checklist_area (key, level, name, lon, lat, build, built_at, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          r.key, r.level, r.name, r.lon, r.lat, r.build, r.built_at, r.count,
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
  addOffered(rows) {
    if (rows.length === 0) return Promise.resolve();
    return write(async (t) => {
      // First offer wins: re-offering never moves the record.
      const st = await t.prepareAsync(OFFERED_INSERT);
      try {
        for (const o of rows) await st.executeAsync(o.key, o.name, o.category, o.at[0], o.at[1], o.generic ? 1 : 0, o.offered_at, o.origin);
      } finally {
        await st.finalizeAsync();
      }
    });
  },
  async listOffered() {
    return (await (await conn()).getAllAsync<OfferedRow>('SELECT * FROM offered')).map(toOffered);
  },
  saveScan({ replace, marks, offered }) {
    return write(async (t) => {
      const replaced: MarkState = 'replaced';
      for (const id of replace) await t.runAsync('UPDATE mark SET state = ? WHERE id = ? AND state = ?', replaced, id, 'open');
      for (const x of marks) {
        await t.runAsync(
          `INSERT INTO mark (id, walk_id, key, name, category, lon, lat, generic, origin, state, created_at, resolved_at, capture_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          x.id, x.walk_id, x.key, x.name, x.category, x.at[0], x.at[1], x.generic ? 1 : 0, x.origin, x.state, x.created_at, x.resolved_at, x.capture_id,
        );
      }
      for (const o of offered) await t.runAsync(OFFERED_INSERT, o.key, o.name, o.category, o.at[0], o.at[1], o.generic ? 1 : 0, o.offered_at, o.origin);
    });
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
  updateMark(id, patch) {
    const { sql, values } = setClause(patch, MARK_COLUMNS);
    if (!sql) return Promise.resolve();
    return write((t) => t.runAsync(`UPDATE mark SET ${sql} WHERE id = ?`, ...values, id).then(() => {}));
  },
  purgeDerived() {
    const clear = DERIVED_STORES.map((s) => `DELETE FROM ${s};`).join(' ');
    return write((t) => t.execAsync(`${clear} UPDATE walk SET snapped_build = NULL;`));
  },
};
