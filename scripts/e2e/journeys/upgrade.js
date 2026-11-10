// Moment table, MT9 (decision 0123): an app upgraded over a browser that kept moments at IndexedDB version 17 shows
// them as before. The database is seeded at version 17 from the frozen schema (fixtures/web17.js) before the app's
// code first runs, then the app opens it at its own version and folds every capture into a moment. E2E_ONLY=upgrade.

const { migrate17 } = require('../fixtures/web17');

// Runs in the page, before any of the app's code, once per browser: the old schema, then the old rows.
const SEED = ({ migrate, now }) => {
  if (sessionStorage.getItem('seeded17')) return;
  sessionStorage.setItem('seeded17', '1');
  const migrate17 = new Function(`return (${migrate})`)();
  const DAY = 86400000;
  const LAT = 41.8236, LON = -71.4014;
  const walk = { id: 'w-old', started_at: now - 3 * DAY, ended_at: now - 3 * DAY + 3600000, title: 'Old walk', epilogue: null, open: false, area: null, snapped_build: null };
  const cap = (id, walk_id, t, kind, body) => ({ id, walk_id, t, lat: LAT, lon: LON, kind, file_path: null, body, segment_id: null, caption: null, caption_y: null, thumb_path: null, edit: null });
  const caps = [
    cap('c-walk', 'w-old', walk.started_at + 600000, 'text', 'A green door on the old walk.'),
    cap('c-loose', null, now - 2 * DAY, 'text', 'A loose note from before the upgrade.'),
    cap('c-loose2', null, now - DAY, 'text', 'Another loose note, answering the first.'),
  ];
  const open = indexedDB.open('chronicles', 17);
  open.onupgradeneeded = (e) => migrate17(open.result, open.transaction, e.oldVersion);
  open.onsuccess = () => {
    const d = open.result;
    const tx = d.transaction(['walk', 'walk_summary', 'capture', 'recall', 'thread', 'thread_member', 'moment_link'], 'readwrite');
    tx.objectStore('walk').put(walk);
    tx.objectStore('walk_summary').put({ walk_id: 'w-old', build: 'old', distance_m: 1200, duration_ms: 3600000, new_streets: 0, streets_walked: 0, photos: 0, videos: 0, voices: 0, notes: 1, streets_read: false });
    for (const c of caps) tx.objectStore('capture').put(c);
    tx.objectStore('recall').put({ capture_id: 'c-loose', frequency: 'always', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null });
    tx.objectStore('thread').put({ id: 't-old', name: 'Before the upgrade', created_at: now - DAY });
    tx.objectStore('thread_member').put({ thread_id: 't-old', moment_id: 'c-loose', added_at: now - DAY });
    tx.objectStore('thread_member').put({ thread_id: 't-old', moment_id: 'c-loose2', added_at: now - DAY });
    tx.objectStore('moment_link').put({ from_id: 'c-loose2', to_id: 'c-loose', created_at: now - DAY });
    tx.oncomplete = () => d.close();
  };
  // A newer app asking to open it waits for the seed to close it (IndexedDB queues the open).
  open.onblocked = () => {};
};

const version = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => { const d = req.result; const out = { v: d.version, stores: [...d.objectStoreNames] }; d.close(); resolve(out); };
}));

async function run(h) {
  const { url, check, shot, tabTo, freshPage } = h;
  const { c, pg } = await freshPage('upgrade');
  await c.addInitScript(SEED, { migrate: migrate17.toString(), now: Date.now() });
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  const db = await version(pg);
  check(db.v === 18 && db.stores.includes('moment') && !db.stores.includes('capture'), `MT9: the app opened a version-17 database and upgraded it (${JSON.stringify(db)})`);

  await tabTo(pg, 'chronicle', 'memories');
  const thread = await pg.waitForSelector('[data-testid=my-thread-row]:has-text("Before the upgrade")', { timeout: 20000 }).then(() => true, () => false);
  check(thread, 'MT9: the thread made before the upgrade is listed, by its name');
  if (thread) {
    await pg.locator('[data-testid=my-thread-row]:has-text("Before the upgrade")').first().click();
    const both = await pg.waitForSelector('[data-testid=own-thread] [data-testid=moment-card]:has-text("answering the first")', { timeout: 10000 }).then(() => true, () => false);
    check(both && (await pg.locator('[data-testid=own-thread] [data-testid=moment-card]:has-text("A loose note from before")').count()) > 0,
      'MT9: its two moments are in it, as before');
    await pg.locator('[data-testid=own-thread] [data-testid=moment-card]:has-text("A loose note from before") [data-testid=moment-open]').first().click();
    const opened = await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 }).then(() => true, () => false);
    check(opened && (await pg.locator('text=A loose note from before the upgrade.').count()) > 0, 'MT9: a moment from before the upgrade opens in the viewer with its words');
    await shot(pg, '90-upgrade-viewer');
    if (opened) await pg.click('[data-testid=viewer-close]');
  }

  await tabTo(pg, 'chronicle');
  // The walks list is in the home sheet's Walks section (as the chronicle journey opens it).
  await pg.waitForSelector('[data-testid=sheet-walks]', { timeout: 20000 }).catch(() => {});
  await pg.click('[data-testid=sheet-walks]').catch(() => {});
  const walk = await pg.waitForSelector('[data-testid=walk-row]:has-text("Old walk")', { timeout: 20000 }).then(() => true, () => false);
  check(walk, 'MT9: the walk from before the upgrade is in the walks list');
  await c.close();
}

module.exports = {
  name: 'upgrade',
  covers: [
    'src/lib/db/**',
    'src/lib/moment.ts',
  ],
  run,
};
