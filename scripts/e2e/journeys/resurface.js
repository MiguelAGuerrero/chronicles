// Resurfaced moments (RM1-RM25): Chronicle opens on Memories, the resurfaced moment, threads from the
// user's own words, Lately, "less like this", and the other sections as they were. Seeded straight into
// IndexedDB: moments made on other days, in a browser of its own. E2E_ONLY=resurface runs it alone.

const SEED = () => {
  const DAY = 86400000;
  const now = Date.now();
  const d = new Date(now);
  const yearAgo = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate(), 12).getTime();
  const walk = { id: 'w1', started_at: now - 40 * DAY, ended_at: now - 40 * DAY + 3600000, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
  const note = (id, t, body, walk_id) => ({ id, walk_id, t, lat: null, lon: null, kind: 'text', file_path: null, body, segment_id: null });
  const caps = [
    note('a1', yearAgo, 'The fox statue by the river looked like it was waiting for someone.', null),
    note('h1', now - 40 * DAY + 600000, 'The harbor at dusk.', 'w1'),
    note('h2', now - 30 * DAY, 'Harbor lights again.', null),
    note('h3', now - 20 * DAY, 'Out to the harbor early.', null),
    note('o1', now - 3 * DAY, 'Orchard blossoms everywhere.', null),
    note('r1', now - 3600000, 'Just now.', null),
  ];
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'capture'], 'readwrite');
      tx.objectStore('walk').put(walk);
      for (const c of caps) tx.objectStore('capture').put(c);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
};

const prefsOf = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const g = req.result.transaction('meta', 'readonly').objectStore('meta').get('resurface_prefs');
    g.onsuccess = () => resolve(g.result ? JSON.parse(g.result.value) : null);
  };
}));

async function run(h) {
  const { url, check, shot, tabTo, freshPage } = h;
  const { c, pg } = await freshPage('resurface');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await pg.evaluate(SEED);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=resurfaced]', { timeout: 20000 });
  const has = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const label = () => pg.locator('[data-testid=resurfaced-label]').textContent();

  // RM1: it opens on Memories, with four sections and no map.
  check((await pg.locator('[data-testid=chronicle-sections] [role=tab]').count()) === 4
    && (await pg.locator('[data-testid=section-memories][aria-selected=true]').count()) === 1
    && !(await has('[data-testid=home-sheet]')), 'RM1: Chronicle opens on Memories, with Memories, Walks, Days and Map, and no map');

  // RM5, RM6: the resurfaced moment leads with the user's own words, and says why it is here.
  check((await label()) === 'A year ago today' && /waiting for someone/.test(await pg.locator('[data-testid=resurfaced]').innerText()),
    'RM5, RM6: the top card is the moment from a year ago today, in its own words');
  check(!(await has('[data-testid=resurfaced]:has-text("Just now")')), 'RM7: a moment from the last day is not resurfaced');

  // RM22: no number is a score; nothing on Memories holds a digit here.
  const text = await pg.locator('[data-testid=memories]').innerText();
  check(!/\d/.test(text), `RM22: Memories shows no digit (${text.replace(/\s+/g, ' ').slice(0, 120)})`);
  await shot(pg, '60-memories');

  // RM14: the threads rail, a tile with a line in words.
  const tile = await pg.locator('[data-testid=thread-tile]').allInnerTexts();
  check(tile.length === 1 && /^Harbor\b/.test(tile[0]) && /Just beginning/.test(tile[0]), `RM14: one thread, Harbor, with a line in words (${tile.join('|').replace(/\n/g, ' ')})`);

  // RM17, RM18: Lately lists every moment, a card opens the viewer.
  check((await pg.locator('[data-testid=moment-card]').count()) === 6, 'RM17: Lately lists the six moments, the top card among them');
  await pg.locator('[data-testid=moment-open]').first().click();
  check(await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 }).then(() => true, () => false), 'RM18: a card opens the moment in the viewer');
  await pg.click('[data-testid=viewer-close]');
  await pg.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 10000 }).catch(() => {});

  // RM8: Another shows a different moment, and says it is a thread.
  await pg.click('[data-testid=resurfaced-another]');
  check(/You keep coming back to harbor/.test(await label()), 'RM8: Another steps to a moment in the harbor thread, and says so');

  // RM20, RM21: Show less like this, kept, with Undo.
  await pg.click('[data-testid=resurfaced-more]');
  await pg.click('[data-testid=menu-less]');
  await pg.waitForSelector('[data-testid=memories-toast]');
  await pg.waitForTimeout(300);
  let prefs = await prefsOf(pg);
  check(prefs && prefs.less.includes('harbor') && prefs.dim.length === 1, 'RM20, RM21: Show less like this is kept in meta (the term and the moment)');
  await pg.click('[data-testid=memories-undo]');
  await pg.waitForTimeout(300);
  prefs = await prefsOf(pg);
  check(prefs && prefs.less.length === 0 && prefs.dim.length === 0, 'RM20: Undo puts the choice back, in meta too');

  // RM20: Not this one never resurfaces it, and leaves it in Lately.
  const was = await pg.locator('[data-testid=resurfaced]').innerText();
  await pg.click('[data-testid=resurfaced-more]');
  await pg.click('[data-testid=menu-hide]');
  await pg.waitForTimeout(300);
  prefs = await prefsOf(pg);
  check(prefs && prefs.hidden.length === 1 && (await pg.locator('[data-testid=resurfaced]').innerText()) !== was && (await pg.locator('[data-testid=moment-card]').count()) === 6,
    'RM20: Not this one is kept, the top card moves on, and the moment stays in Lately');

  // RM9: Relive it opens the day of a moment made outside a walk.
  await pg.click('[data-testid=resurfaced-relive]');
  check(await pg.waitForURL(/\/(day|replay)\//, { timeout: 15000 }).then(() => true, () => false), 'RM9: Relive it opens the replay of its day (or its walk)');
  await pg.goBack();
  await pg.waitForSelector('[data-testid=resurfaced]', { timeout: 20000 });

  // RM15, RM16: a thread's screen; rename and Not a thread are kept.
  await pg.click('[data-testid=thread-tile]');
  await pg.waitForSelector('[data-testid=thread-screen]');
  check((await pg.locator('[data-testid=thread-title]').innerText()) === 'Harbor' && (await pg.locator('[data-testid=thread-quote]').count()) === 2
    && (await pg.locator('[data-testid=thread-screen] [data-testid=moment-card]').count()) === 3, 'RM15: the thread shows its name, two of the user\'s own sentences, and its three moments');
  await pg.click('[data-testid=thread-rename]');
  await pg.fill('[data-testid=thread-name]', 'The harbor');
  await pg.click('[data-testid=thread-save]');
  check((await pg.locator('[data-testid=thread-title]').innerText()) === 'The harbor', 'RM16: Rename shows the new name');
  await pg.click('[data-testid=thread-back]');
  await pg.waitForSelector('[data-testid=thread-tile]');
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=thread-tile]', { timeout: 20000 });
  check(/The harbor/.test(await pg.locator('[data-testid=thread-tile]').first().innerText()), 'RM16, RM21: the rename survives a reload');
  await pg.click('[data-testid=thread-tile]');
  await pg.click('[data-testid=thread-remove]');
  await pg.waitForSelector('[data-testid=threads-hint]');
  check(!(await has('[data-testid=threads-rail]')), 'RM14, RM16: Not a thread takes the rail away, and a quiet line says threads appear when you keep coming back');

  // RM2: the other sections, as they were.
  await pg.click('[data-testid=section-walks]');
  check(await pg.waitForSelector('[data-testid=home-sheet]', { timeout: 15000 }).then(() => true, () => false), 'RM2: Walks shows the home sheet\'s walks list');
  await pg.click('[data-testid=section-days]');
  check(await pg.waitForSelector('[data-testid=day-row]', { timeout: 15000 }).then(() => true, () => false), 'RM2: Days lists the days');
  await pg.click('[data-testid=section-map]');
  check(await pg.waitForSelector('[data-testid=sheet-days]', { timeout: 15000 }).then(() => true, () => false), 'RM2: Map shows the sheet at rest');

  // RM1: leaving for another tab puts Chronicle back on Memories.
  await pg.click('[data-testid=tab-explore]');
  await pg.waitForTimeout(500);
  await tabTo(pg, 'chronicle', 'memories');
  check(await pg.waitForSelector('[data-testid=section-memories][aria-selected=true]', { timeout: 10000 }).then(() => true, () => false), 'RM1: coming back from another tab opens Memories again');
  await c.close();

  // RM4: nothing kept yet.
  const empty = await freshPage('resurface-empty');
  await empty.pg.goto(url);
  await empty.pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(empty.pg, 'chronicle', 'memories');
  check(await empty.pg.waitForSelector('[data-testid=memories-empty]', { timeout: 15000 }).then(() => true, () => false)
    && (await empty.pg.locator('[data-testid=memories-navigate]').count()) === 1
    && (await empty.pg.locator('[data-testid=resurfaced]').count()) === 0 && (await empty.pg.locator('[data-testid=threads-rail]').count()) === 0,
    'RM4: with nothing kept, one quiet line and a Navigate button, and no card or rail');
  await empty.c.close();
}

module.exports = {
  name: 'resurface',
  covers: [
    'src/components/chronicle/**',
    'src/lib/resurface/**',
  ],
  run,
};
