// @layer adapter
/**
 * The native store's schema, as ordered SQL (`db/sqliteStore.ts`): `PRAGMA user_version` records how many have run.
 * Plain strings with no React Native, so `npm test` runs every one in Node's built-in SQLite (MT1, MT11). Never
 * edit an entry; append one (a test holds the old ones to their hashes).
 */
export const MIGRATIONS: readonly string[] = [
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
  // 11: moments (M3, M6): a capture, and a find, may belong to no walk. SQLite
  // can't drop NOT NULL in place, so both tables are rebuilt; read by time for days.
  `
  CREATE TABLE capture_new (
    id TEXT PRIMARY KEY, walk_id TEXT, t INTEGER NOT NULL, lat REAL, lon REAL,
    kind TEXT NOT NULL, file_path TEXT, body TEXT, segment_id TEXT, caption TEXT, caption_y REAL
  );
  INSERT INTO capture_new (id, walk_id, t, lat, lon, kind, file_path, body, segment_id, caption, caption_y)
    SELECT id, walk_id, t, lat, lon, kind, file_path, body, segment_id, caption, caption_y FROM capture;
  DROP TABLE capture;
  ALTER TABLE capture_new RENAME TO capture;
  CREATE INDEX capture_walk ON capture (walk_id, t);
  CREATE INDEX capture_place ON capture (lat, lon);
  CREATE INDEX capture_t ON capture (t);
  CREATE TABLE find_new (
    key TEXT PRIMARY KEY, area_key TEXT, walk_id TEXT, capture_id TEXT NOT NULL, found_at INTEGER NOT NULL,
    name TEXT NOT NULL, category TEXT NOT NULL, kind TEXT NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL, generic INTEGER NOT NULL
  );
  INSERT INTO find_new SELECT key, area_key, walk_id, capture_id, found_at, name, category, kind, lon, lat, generic FROM find;
  DROP TABLE find;
  ALTER TABLE find_new RENAME TO find;
  CREATE INDEX find_walk ON find (walk_id);
  `,
  // 12: a photo's small copy for previews (TH1, TH5). Null until made.
  `
  ALTER TABLE capture ADD COLUMN thumb_path TEXT;
  `,
  // 13: still spells told by the motion sensors (Motion, MO8), kept with the walk like pauses.
  `
  CREATE TABLE still (walk_id TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, PRIMARY KEY (walk_id, started_at));
  `,
  // 14: stretches kept or dismissed across gaps in the trace (Filling gaps, G10): truth, kept with the walk.
  `
  CREATE TABLE gap_fill (
    walk_id TEXT NOT NULL, t0 INTEGER NOT NULL, t1 INTEGER NOT NULL, state TEXT NOT NULL,
    path TEXT NOT NULL, length_m REAL NOT NULL, street TEXT, decided_at INTEGER NOT NULL,
    PRIMARY KEY (walk_id, t0)
  );
  `,
  // 15: Explore atlas (AT12): areas near you and what their rings hold, a cache cleared with the derived stores.
  `
  CREATE TABLE atlas_area (
    key TEXT PRIMARY KEY, level TEXT NOT NULL, name TEXT NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL, reach_m REAL NOT NULL,
    build TEXT NOT NULL, code TEXT NOT NULL, listed_at INTEGER NOT NULL, read_at INTEGER, failed_at INTEGER, profile TEXT
  );
  `,
  // 16: town outlines (TO12): what each read tile held, a cache cleared with the derived stores.
  `
  CREATE TABLE outline_tile (
    key TEXT PRIMARY KEY, x INTEGER NOT NULL, y INTEGER NOT NULL, release TEXT NOT NULL, read_at INTEGER NOT NULL,
    pieces TEXT NOT NULL, points TEXT NOT NULL
  );
  `,
  // 17: a photo's or video's edits (ME21, decision 0090): truth, JSON, null for none.
  `
  ALTER TABLE capture ADD COLUMN edit TEXT;
  `,
  // 18: town borders (TB7): tiles keyed by zoom (z/x/y), z10 to draw beside z12 to decide; the old x/y rows are dropped.
  `
  DELETE FROM outline_tile;
  ALTER TABLE outline_tile ADD COLUMN z INTEGER NOT NULL DEFAULT 12;
  `,
  // 19: walkability (WK2): what each read z14 tile held, a cache cleared with the derived stores.
  `
  CREATE TABLE walk_tile (
    key TEXT PRIMARY KEY, x INTEGER NOT NULL, y INTEGER NOT NULL, build TEXT NOT NULL, code TEXT NOT NULL,
    source TEXT NOT NULL, read_at INTEGER NOT NULL, ways TEXT NOT NULL
  );
  `,
  // 20: urban form (UF3, UF8): where streets meet, kept beside the ways; a cache, so older rows (code w1) are read again.
  `
  ALTER TABLE walk_tile ADD COLUMN junctions TEXT;
  `,
  // 21: places worth the stop (PW12): the places archive version a checklist area was built with (null before).
  `
  ALTER TABLE checklist_area ADD COLUMN archive TEXT;
  `,
  // 22: owner threads (OT21, decision 0104): threads, their members and replies. Truth, never derived; no foreign keys,
  // the delete transactions cascade (OT16, OT17).
  `
  CREATE TABLE thread (
    id TEXT PRIMARY KEY, name TEXT, created_at INTEGER NOT NULL
  );
  CREATE TABLE thread_member (
    thread_id TEXT NOT NULL, moment_id TEXT NOT NULL, added_at INTEGER NOT NULL,
    PRIMARY KEY (thread_id, moment_id)
  );
  CREATE INDEX thread_member_moment ON thread_member (moment_id);
  CREATE TABLE moment_link (
    from_id TEXT NOT NULL, to_id TEXT NOT NULL, created_at INTEGER NOT NULL,
    PRIMARY KEY (from_id, to_id)
  );
  CREATE INDEX moment_link_to ON moment_link (to_id);
  `,
  // 22: the moment table (MT1, decision 0123): a moment holds its media. Every capture becomes a one-piece moment
  // under its own id, so threads, replies, reminders and finds keep pointing at it; a capture is a piece, read
  // through its moment. The capture table's own walk_id, lat, lon and segment_id are left as they were and no
  // longer read or written (dropping them would rebuild the table; docs/DEFERRED.md).
  `
  CREATE TABLE moment (
    id TEXT PRIMARY KEY, walk_id TEXT, t INTEGER NOT NULL, lat REAL, lon REAL, segment_id TEXT
  );
  INSERT INTO moment (id, walk_id, t, lat, lon, segment_id) SELECT id, walk_id, t, lat, lon, segment_id FROM capture;
  ALTER TABLE capture ADD COLUMN moment_id TEXT;
  UPDATE capture SET moment_id = id;
  CREATE INDEX moment_walk ON moment (walk_id, t);
  CREATE INDEX moment_place ON moment (lat, lon);
  CREATE INDEX moment_t ON moment (t);
  CREATE INDEX capture_moment ON capture (moment_id, t);
  `,
  // Complexes (CX14, specs/complexes): derived rows, one per named building that is made of other places; cleared with the
  // derived stores. The bounding box is four columns so a moment's fix finds its complex without reading them all.
  `
  CREATE TABLE complex (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, release TEXT NOT NULL, code TEXT NOT NULL,
    lon REAL NOT NULL, lat REAL NOT NULL,
    west REAL NOT NULL, south REAL NOT NULL, east REAL NOT NULL, north REAL NOT NULL,
    polygons TEXT NOT NULL
  );
  CREATE INDEX complex_box ON complex (south, north);
  `,
];
