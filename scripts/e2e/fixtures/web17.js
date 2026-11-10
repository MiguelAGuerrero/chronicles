// The web store's schema at IndexedDB version 17, frozen: a copy of `migrate` in src/lib/db/index.web.ts as it
// stood before the moment table (decision 0123, MT1). An old schema never changes, so this copy stays exact. The
// upgrade journey runs it in the browser (as a string, `migrate17.toString()`) to seed a version-17 database
// before the app loads; momentMigration.test.ts holds it to the store's own steps up to 17.
function migrate17(d, tx, oldVersion) {
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
    // (the app re-filed existing rows here; a database seeded fresh has none)
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
}

module.exports = { migrate17 };
