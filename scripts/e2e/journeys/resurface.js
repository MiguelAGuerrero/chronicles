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
    note('l1', now - 2 * DAY, 'quiet '.repeat(700).trim(), null),
  ];
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'moment'], 'readwrite');
      tx.objectStore('walk').put(walk);
      for (const c of caps) tx.objectStore('moment').put(((c) => ({ id: c.id, walk_id: c.walk_id ?? null, t: c.t, lat: c.lat ?? null, lon: c.lon ?? null, segment_id: c.segment_id ?? null, piece_ids: [c.id], pieces: [Object.fromEntries(Object.entries({ ...c, moment_id: c.id }).filter(([k]) => !['walk_id', 'lat', 'lon', 'segment_id'].includes(k)))] }))(c));
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


// Memories in context (MC1-MC16): a street cache, a walk with a pause, and moments at known minutes.
const SEED_CONTEXT = () => {
  const DAY = 86400000;
  const now = Date.now();
  const lat = 41.8;
  const lon = -71.4;
  const z = 2 ** 14;
  const tile = `${Math.floor(((lon + 180) / 360) * z)},${Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * z)}`;
  const day = (back, h, m = 0) => { const d = new Date(now - back * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
  const start = day(3, 18);
  const walk = { id: 'w2', started_at: start, ended_at: start + 3600000, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
  const note = (id, t, body, walk_id, fix = true, seg = null) => ({ id, walk_id, t, lat: fix ? lat : null, lon: fix ? lon : null, kind: 'text', file_path: null, body, segment_id: seg });
  const year = new Date(now); year.setFullYear(year.getFullYear() - 1); year.setHours(12, 0, 0, 0);
  const caps = [
    note('c1', start + 5 * 60000, 'harbor bench', 'w2', true, 's1'),
    note('c2', start + 40 * 60000, 'orchard blossoms', 'w2', true, 's1'),
    note('c3', day(2, 10), 'loose near hope', null, true, null),
    note('c4', day(5, 9), 'loose and unplaced', null, false, null),
    { id: 'c5', walk_id: null, t: year.getTime(), lat: null, lon: null, kind: 'voice', file_path: 'x', body: '42000', segment_id: null },
  ];
  const segment = { id: 's1', name: 'Hope Street', kind_detail: 'residential', length_m: 100, geometry: [[[lon - 0.001, lat], [lon + 0.001, lat]]], build: 'b', tile };
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'moment', 'street_segment', 'pause'], 'readwrite');
      tx.objectStore('walk').put(walk);
      for (const c of caps) tx.objectStore('moment').put(((c) => ({ id: c.id, walk_id: c.walk_id ?? null, t: c.t, lat: c.lat ?? null, lon: c.lon ?? null, segment_id: c.segment_id ?? null, piece_ids: [c.id], pieces: [Object.fromEntries(Object.entries({ ...c, moment_id: c.id }).filter(([k]) => !['walk_id', 'lat', 'lon', 'segment_id'].includes(k)))] }))(c));
      tx.objectStore('street_segment').put(segment);
      tx.objectStore('pause').put({ walk_id: 'w2', started_at: start + 20 * 60000, ended_at: start + 30 * 60000 });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
};

// Each step is a todo until its code lands; a step that throws is false, never a crash.
const attempt = async (fn) => { try { return !!(await fn()); } catch { return false; } };

async function contextRun(h) {
  const { url, check, shot, tabTo, freshPage, toThreads, toJournal } = h;
  const { c, pg } = await freshPage('resurface-context');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  // The app clears derived caches such as streets when it starts on a fresh database, so the street cache is
  // seeded once it is running and Memories reads it as the tab comes to the front.
  await pg.waitForTimeout(1500);
  await pg.evaluate(SEED_CONTEXT);
  // The app opens on Memories (0112): away and back, so Memories reads the seeded moments as a new open.
  await tabTo(pg, 'explore');
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=moment-card]', { timeout: 20000 });
  const cardOf = (words) => pg.locator(`[data-testid=moment-card]:has-text("${words}")`).first();
  const textOf = async (words) => (await cardOf(words).innerText()).replace(/\s+/g, ' ');

  // The lines are read after the cards come (the street, and now a complex already on the phone): wait until the last one has its words.
  await pg.waitForSelector('[data-testid=moment-card]:has-text("No location")', { timeout: 15000 }).catch(() => {});
  const placeOk = await attempt(async () => /Hope Street, Fox Point/.test(await textOf('harbor bench')) && /Hope Street/.test(await textOf('loose near hope')) && !/Fox Point/.test(await textOf('loose near hope')) && /No location/.test(await textOf('loose and unplaced')));
  check(placeOk, 'MC1: an entry shows its street and town, the street alone outside a walk, else "No location" (the journal\'s dateline, JN5)');
  const minutesOk = await attempt(async () => /Five minutes in/.test(await textOf('harbor bench')) && /Thirty minutes in/.test(await textOf('orchard blossoms')) && !/ in\b/.test(await cardOf('loose near hope').locator('[data-testid=entry-dateline]').innerText()));
  check(minutesOk, 'MC3: an entry says how far into the walk it was, pauses not counted, and nothing of a walk outside one');
  const dateOf = async (words) => (await cardOf(words).locator('[data-testid=entry-dateline]').innerText()).trim();
  const dayOk = await attempt(async () => /^\d{1,2}:\d{2} (am|pm) · /.test(await dateOf('harbor bench')));
  check(dayOk, 'MC4: an entry says when in the day it was, by the clock under its day\'s heading (amended by JN5)');
  const noDigit = await attempt(async () => !/\d/.test((await dateOf('harbor bench')).replace(/^\d{1,2}:\d{2} /, '')));
  check(noDigit, 'MC7: past its time, an entry\'s dateline holds no digit');

  // Audit 18: the top card's context is short and does not repeat the walk. Audit 17: a street found by nearness is "Near".
  const heroShort = await attempt(async () => {
    const t = (await pg.locator('[data-testid=resurfaced-context]').innerText()).trim();
    return !/From/.test(t) && t.split(' · ').length <= 3;
  });
  check(heroShort, 'memories-context audit 18: the top card holds no "From" and at most three segments');
  const nearOk = await attempt(async () => /Near Hope Street/.test(await textOf('loose near hope')) && !/Near/.test(await textOf('harbor bench')));
  check(nearOk, 'memories-context audit 17: a street found by nearness reads "Near", the snapped one bare');
  const footOk = await attempt(async () => !/Fox Point/.test(await cardOf('harbor bench').locator('[data-testid=moment-walk]').innerText()));
  check(footOk, 'memories-context audit 3: the foot line names the walk without its town');

  // MC15: the owner's words are italic; the app's placeholder is upright.
  const face = (sel) => pg.locator(sel).first().evaluate((e) => getComputedStyle(e).fontFamily);
  const italicOk = await attempt(async () => /serif/.test((await face('[data-testid=moment-card] >> text=harbor bench')).replace(/sans-serif/g, '')) && !/serif/.test((await face('[data-testid=resurfaced] >> text=A voice note')).replace(/sans-serif/g, '')));
  check(italicOk, "MC15: your words are in the serif and the app's placeholder in its sans (JN4)");

  // MC8-MC10: the header menu.
  const menu = async (item) => { await pg.click('[data-testid=memories-menu]'); await pg.click(`[data-testid=${item}]`); };
  // The switch flips in place, the sheet staying up (tend memories T54): flipped, the sheet is closed with its Close.
  const menuSwitch = async () => {
    await menu('menu-off');
    await pg.waitForTimeout(300);
    await pg.click('[data-testid=menu-close]');
    await pg.waitForSelector('[data-testid=memories-menu-sheet]', { state: 'detached', timeout: 4000 }).catch(() => {});
  };
  const hiddenOk = await attempt(async () => {
    await pg.click('[data-testid=resurfaced-more]');
    await pg.click('[data-testid=menu-hide]');
    await menu('menu-hidden');
    const row = pg.locator('[data-testid=hidden-row]').first();
    const text = await row.innerText();
    const noPicture = (await row.locator('img').count()) === 0;
    await pg.click('[data-testid=hidden-bring-back]');
    return noPicture && /voice memo/i.test(text) && (await pg.locator('[data-testid=hidden-row]').count()) === 0;
  });
  check(hiddenOk, 'MC8: Hidden lists what was hidden by kind and context, with no picture, and Bring back restores it');
  // tend memories audit 5: the drawn switch shows the setting as it is, its row and its picture both, on and then off.
  const drawn = () => pg.locator('[data-testid=menu-off]').evaluate((e) => ({ row: e.getAttribute('aria-checked'), input: e.querySelector('input')?.checked ?? null }));
  let drawnOn = null;
  let drawnOff = null;
  // tend memories T54 (the owner's yes, Nov 21; its mock-up approved as drawn, decision 0252): what the sheet shows right
  // after each tap on the switch, read with the sheet still up.
  const t54 = {};
  const sheetUp = () => pg.locator('[data-testid=memories-menu-sheet]').isVisible().catch(() => false);
  const noteSays = () => pg.locator('[data-testid=menu-off-note]').innerText().catch(() => null);
  const toastSays = () => pg.locator('[data-testid=memories-toast]').innerText().catch(() => '');
  const focusInRow = () => pg.evaluate(() => !!document.activeElement?.closest('[data-testid=menu-off]'));
  const offOk = await attempt(async () => {
    await pg.click('[data-testid=hidden-back]');
    await pg.click('[data-testid=memories-menu]');
    drawnOn = await drawn();
    const toastBefore = await toastSays();
    await pg.click('[data-testid=menu-off]');
    await pg.waitForTimeout(400);
    const says = await pg.locator('[data-testid=menu-off]').innerText();
    drawnOff = await drawn();
    t54.off = { up: await sheetUp(), note: await noteSays(), focus: await focusInRow(), toast: (await toastSays()) === toastBefore };
    // Pictured after the Modal's fade, at 390 and 320 px.
    await pg.waitForTimeout(800);
    await shot(pg, 'resurface-t54-contents-switch-off-390');
    const was = pg.viewportSize();
    await pg.setViewportSize({ width: 320, height: was.height });
    await pg.waitForTimeout(800);
    t54.at320 = { up: await sheetUp(), note: await noteSays(), over: await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) };
    await shot(pg, 'resurface-t54-contents-switch-off-320');
    await pg.setViewportSize(was);
    await pg.waitForTimeout(600);
    // Tapped again, it reads On in place; and once more, Off, for the steps below.
    await pg.click('[data-testid=menu-off]');
    await pg.waitForTimeout(400);
    t54.on = { up: await sheetUp(), note: await noteSays(), drawn: await drawn() };
    await pg.click('[data-testid=menu-off]');
    await pg.waitForTimeout(400);
    t54.offAgain = { up: await sheetUp(), note: await noteSays(), drawn: await drawn() };
    await pg.click('[data-testid=menu-close]');
    t54.closed = await pg.waitForSelector('[data-testid=memories-menu-sheet]', { state: 'detached', timeout: 4000 }).then(() => true, () => false);
    return /Off/.test(says) && (await pg.locator('[data-testid=resurfaced]').count()) === 0 && (await pg.locator('[data-testid=moment-card]').count()) > 0;
  });
  check(offOk, 'MC9: with the switch off there is no slip, the contents says Off, and the page stays');
  check(t54.off?.up && t54.off.note === 'Off' && t54.off.focus && t54.off.toast && drawnOff?.row === 'false' && drawnOff?.input === false
    && t54.at320?.up && t54.at320.note === 'Off' && t54.at320.over <= 0
    && t54.on?.up && t54.on.note === 'On' && t54.on.drawn?.row === 'true' && t54.offAgain?.up && t54.offAgain.note === 'Off' && t54.closed,
    `tend memories T54: a tap on Bring moments back leaves Contents up, the switch drawn off and its note reading Off in place, focus on its row, no toast; tapped again it reads On in place; Close then leaves (${JSON.stringify({ ...t54, drawnOff })})`);
  // tend memories T54: with the switch flipped, Escape and a tap on the dimmed page leave the sheet as Close does.
  {
    const leftBy = {};
    await pg.click('[data-testid=memories-menu]').catch(() => {});
    await pg.waitForSelector('[data-testid=memories-menu-sheet]', { timeout: 4000 }).catch(() => {});
    await pg.click('[data-testid=menu-off]').catch(() => {});
    await pg.waitForTimeout(400);
    const stayed = await sheetUp();
    await pg.keyboard.press('Escape');
    leftBy.escape = await pg.waitForSelector('[data-testid=memories-menu-sheet]', { state: 'detached', timeout: 4000 }).then(() => true, () => false);
    await pg.click('[data-testid=memories-menu]').catch(() => {});
    await pg.waitForSelector('[data-testid=memories-menu-sheet]', { timeout: 4000 }).catch(() => {});
    await pg.click('[data-testid=menu-off]').catch(() => {});
    await pg.waitForTimeout(400);
    const spot = await pg.evaluate(() => {
      const sheet = document.querySelector('[data-testid=memories-menu-sheet]')?.getBoundingClientRect();
      for (const [x, y] of [[8, 8], [window.innerWidth - 8, 8], [8, window.innerHeight - 8], [window.innerWidth / 2, window.innerHeight - 8]])
        if (sheet && !(x >= sheet.left && x <= sheet.right && y >= sheet.top && y <= sheet.bottom)) return [x, y];
      return null;
    });
    if (spot) await pg.mouse.click(spot[0], spot[1]);
    leftBy.scrim = !!spot && (await pg.waitForSelector('[data-testid=memories-menu-sheet]', { state: 'detached', timeout: 4000 }).then(() => true, () => false));
    const offStill = (await prefsOf(pg))?.off === true;
    check(stayed && leftBy.escape && leftBy.scrim && offStill,
      `tend memories T54: after a flip, Escape and a tap on the dimmed page leave Contents, the switch as last set (${JSON.stringify({ stayed, ...leftBy, spot, offStill })})`);
  }
  check(drawnOn?.row === 'true' && drawnOn?.input === true && drawnOff?.row === 'false' && drawnOff?.input === false,
    `tend memories audit 5: Contents' switch is drawn on while moments come back and off once switched off, its row and its picture alike (${JSON.stringify({ drawnOn, drawnOff })})`);
  const forgetOk = await attempt(async () => {
    await menu('menu-forget');
    const said = await pg.locator('[data-testid=forget-confirm-text]').innerText();
    await pg.click('[data-testid=forget-confirm]');
    await pg.waitForTimeout(400);
    return /offered again/.test(said) && (await prefsOf(pg)).off === true && (await pg.locator('[data-testid=resurfaced]').count()) === 0;
  });
  check(forgetOk, 'MC10: Forget my choices asks once, says what returns, and keeps the switch off');
  const toastOk = await attempt(async () => {
    await menuSwitch();
    await pg.click('[data-testid=resurfaced-more]');
    await pg.click('[data-testid=menu-hide]');
    // An earlier toast may still be up: wait for this choice's own.
    await pg.waitForFunction(() => /Hidden\./.test(document.querySelector('[data-testid=memories-toast]')?.textContent ?? ''), null, { timeout: 5000 });
    return /Hidden\. It stays in your journal and in its walk\./.test(await pg.locator('[data-testid=memories-toast]').innerText());
  });
  check(toastOk, 'MC14: the toast states a fact, Hidden. It stays in your journal and in its walk.');
  // Audit 7: the toast names the word as the owner wrote it, and Undo takes it back.
  // Entries have no More since SW19 (decision 0197): Show less like this is the resurfaced card's (fix resurface-journey).
  let slipSaid = '';
  const fewerOk = await attempt(async () => {
    slipSaid = (await pg.locator('[data-testid=resurfaced]').innerText()).replace(/\s+/g, ' ');
    await pg.click('[data-testid=resurfaced-more]');
    await pg.click('[data-testid=menu-less]');
    // The earlier toast may still be up: wait for this one.
    await pg.waitForFunction(() => /Fewer like this/.test(document.querySelector('[data-testid=memories-toast]')?.textContent ?? ''), null, { timeout: 5000 });
    const said = await pg.locator('[data-testid=memories-toast]').innerText();
    await pg.click('[data-testid=memories-undo]');
    // A word that stands whole in the moment the card shows. No seeded word here stems differently, so this cannot
    // catch a stem shown for the written word ("cooky"); the unit test does (fix resurface-journey audit 1, filed).
    const word = /Fewer like this: (\S+)/.exec(said)?.[1] ?? '';
    return word.length > 0 && new RegExp(`\\b${word}\\b`).test(slipSaid);
  });
  check(fewerOk, `memories-context audit 7: Show less like this names the word as written (${slipSaid.slice(0, 80)})`);
  // Audit 5: Forget leaves a toast with Undo that brings back what it cleared.
  const forgetUndoOk = await attempt(async () => {
    const hiddenEarlier = (await prefsOf(pg)).hidden.length;
    await pg.click('[data-testid=resurfaced-more]');
    await pg.click('[data-testid=menu-hide]');
    await pg.waitForTimeout(400);
    const hiddenBefore = (await prefsOf(pg)).hidden.length;
    // Its own hide counts: one more than before it (fix resurface-journey audit 4).
    if (hiddenBefore !== hiddenEarlier + 1) return false;
    await menu('menu-forget');
    await pg.click('[data-testid=forget-confirm]');
    await pg.waitForFunction(() => /Choices forgotten/.test(document.querySelector('[data-testid=memories-toast]')?.textContent ?? ''), null, { timeout: 5000 });
    const said = await pg.locator('[data-testid=memories-toast]').innerText();
    await pg.waitForTimeout(400);
    const cleared = (await prefsOf(pg)).hidden.length === 0;
    await pg.click('[data-testid=memories-undo]');
    await pg.waitForTimeout(400);
    const back = hiddenBefore >= 1 && (await prefsOf(pg)).hidden.length === hiddenBefore;
    return /Choices forgotten\./.test(said) && cleared && back;
  });
  check(forgetUndoOk, 'memories-context audit 5: Forget says so, and Undo restores what it cleared');
  // Audit 15: the switch survives a reload.
  const offKeptOk = await attempt(async () => {
    await menuSwitch();
    // The choice is kept a moment after the tap: reload once it has landed.
    for (let i = 0; i < 30 && !((await prefsOf(pg)) ?? {}).off; i++) await pg.waitForTimeout(100);
    await pg.reload();
    await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
    await tabTo(pg, 'chronicle', 'memories');
    await pg.waitForSelector('[data-testid=moment-card]', { timeout: 15000 });
    await pg.waitForTimeout(1500);
    return (await prefsOf(pg)).off === true && (await pg.locator('[data-testid=resurfaced]').count()) === 0;
  });
  check(offKeptOk, 'memories-context audit 15: the switch stays off after a reload');
  await c.close();

  const empty = await freshPage('resurface-context-empty');
  await empty.pg.goto(url);
  await empty.pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(empty.pg, 'chronicle', 'memories');
  const emptyOk = await attempt(async () => {
    await empty.pg.waitForSelector('[data-testid=day-heading]', { timeout: 15000 });
    // The page itself: the toolbar's one hint, "What’s on your mind?", is the only question allowed (0171, 0178).
    const said = await empty.pg.locator('[data-testid=journal-page]').innerText();
    return (await empty.pg.locator('[data-testid=day-heading]').count()) === 1 && !/walk somewhere|nothing kept/i.test(said) && !/\?/.test(said);
  });
  check(emptyOk, 'MC14: the empty journal is today\'s date and the open line, and gives no instruction (JN2)');
  await empty.c.close();
}

async function run(h) {
  const { url, check, shot, tabTo, freshPage, toThreads, toJournal } = h;
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

  // RM1: it opens on Memories, with its sections (Media the fifth since MG1) and no map.
  check((await pg.locator('[data-testid=chronicle-sections] [role=tab]').count()) === 5
    && (await pg.locator('[data-testid=section-memories][aria-selected=true]').count()) === 1
    && !(await has('[data-testid=home-sheet]')), 'RM1: Chronicle opens on Memories, with Memories, Walks, Days, Map and Media (MG1), and no map');

  // RM5, RM6: the resurfaced moment leads with the user's own words, and says why it is here.
  check((await label()) === 'A year ago today' && /waiting for someone/.test(await pg.locator('[data-testid=resurfaced]').innerText()),
    'RM5, RM6: the top card is the moment from a year ago today, in its own words');
  check(!(await has('[data-testid=resurfaced]:has-text("Just now")')), 'RM7: a moment from the last day is not resurfaced');

  // RM22: no number is a score; nothing on Memories holds a digit here.
  const text = (await pg.locator('[data-testid=memories]').innerText()).replace(/\b\d{1,2}:\d{2}\b/g, '').replace(/\b[A-Z][a-z]+ \d{1,2}(, \d{4})?\b/g, '');
  check(!/\d/.test(text), `RM22: past its dates and times, Memories shows no digit (${text.replace(/\s+/g, ' ').slice(0, 120)})`);
  // RM25: the top card reads as one named button, and Another, Relive it and More are named buttons; the rail is a list.
  const named = async (name) => (await pg.getByRole('button', { name }).filter({ visible: true }).count()) > 0;
  await pg.click('[data-testid=resurfaced-more]');
  await pg.waitForSelector('[data-testid=memory-menu]');
  const inMore = (await pg.locator('[data-testid=resurfaced-relive]').count()) === 1 && (await pg.locator('[data-testid=resurfaced-another]').count()) === 1;
  await pg.click('[data-testid=menu-cancel]');
  const slipNamed = (await named(/Open$/)) && (await named('More about this moment'));
  await shot(pg, '60-memories');
  await toThreads(pg);
  check(slipNamed && inMore && (await pg.locator('[data-testid=threads-rail] [role=list]').count()) === 1, 'RM25: the slip and its More are named buttons, Relive it and Another are in More (JN20), and the rail is a list');

  // RM14: the threads rail, a tile with a line in words.
  await toThreads(pg);
  const tile = await pg.locator('[data-testid=thread-tile]').allInnerTexts();
  check(tile.length === 1 && /^\W*Harbor\b/.test(tile[0]) && /Just beginning/.test(tile[0]), `RM14: one thread, Harbor, with a line in words (${tile.join('|').replace(/\n/g, ' ')})`);

  // RM17, RM18: the page lists every moment, an entry opens the viewer.
  await toJournal(pg);
  check((await pg.locator('[data-testid=moment-card]').count()) === 7, 'RM17: the page lists the seven moments, the resurfaced one among them');
  // Audit 12: a very long note leaves its card's buttons on screen. Audit 13: the rail is a list, the targets are 44 px.
  const longCard = pg.locator('[data-testid=moment-card]:has-text("quiet quiet")').first();
  await longCard.scrollIntoViewIfNeeded();
  const lb = await longCard.boundingBox();
  // Its actions are the quick-action row since SW19 took More off entries (decision 0197; fix resurface-journey).
  const mb = await longCard.locator('[data-testid=quick-actions]').boundingBox({ timeout: 10000 }).catch(() => null);
  // Each condition said apart, so a missing row is never read as a tall card (fix resurface-journey audit 2).
  const rowIn = !!(lb && mb && mb.x >= 0 && mb.x + mb.width <= 390 && mb.y + mb.height <= lb.y + lb.height + 1);
  check(lb && mb && lb.height < 800 && rowIn, `audit 12: a 4,000-character note keeps its card short and its actions in view (card ${Math.round(lb?.height ?? 0)} px; row ${mb ? `${Math.round(mb.x)},${Math.round(mb.y)} ${Math.round(mb.width)}x${Math.round(mb.height)}` : 'not drawn'}, inside the card ${rowIn})`);
  const sb = await pg.locator('[data-testid=section-memories]').boundingBox();
  await toThreads(pg);
  check((await pg.locator('[data-testid=threads-rail] [role=listitem]').count()) === 1 && sb && sb.height >= 44, 'audit 13: the threads rail is a list, and the section tabs are 44 px tall');
  await toJournal(pg);
  await pg.locator('[data-testid=moment-open]').first().click();
  check(await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 }).then(() => true, () => false), 'RM18: a card opens the moment in the viewer');
  await pg.click('[data-testid=viewer-close]');
  await pg.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 10000 }).catch(() => {});

  // RM8: Another shows a different moment, and says it is a thread.
  await pg.locator('[data-testid=resurfaced]').scrollIntoViewIfNeeded();
  await pg.click('[data-testid=resurfaced-more]');
  await pg.click('[data-testid=resurfaced-another]');
  await pg.waitForTimeout(400);
  check(/You keep coming back to harbor/.test(await label()), 'RM8: Another steps to a moment in the harbor thread, and says so');

  // RM20, RM21: Show less like this, kept, with Undo.
  await pg.click('[data-testid=resurfaced-more]');
  await pg.click('[data-testid=menu-less]');
  await pg.waitForSelector('[data-testid=memories-toast]');
  await pg.waitForTimeout(300);
  const ub = await pg.locator('[data-testid=memories-undo]').boundingBox();
  check(ub && ub.width >= 44 && ub.height >= 44, `audit 13: Undo is a 44 px target (${Math.round(ub?.width ?? 0)}x${Math.round(ub?.height ?? 0)})`);
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
  check(prefs && prefs.hidden.length === 1 && (await pg.locator('[data-testid=resurfaced]').innerText()) !== was && (await pg.locator('[data-testid=moment-card]').count()) === 7,
    'RM20: Not this one is kept, the slip moves on, and the moment stays on the page');

  // RM9: Relive it opens the day of a moment made outside a walk.
  await pg.click('[data-testid=resurfaced-more]');
  await pg.click('[data-testid=resurfaced-relive]');
  const lived = await pg.waitForURL(/\/(day|replay)\//, { timeout: 15000 }).then(() => true, () => false);
  check(lived, 'RM9: Relive it opens the replay of its day (or its walk)');
  await pg.goBack();
  await pg.waitForSelector('[data-testid=resurfaced]', { timeout: 20000 });

  // RM15, RM16: a thread's screen; rename and Not a thread are kept.
  await toThreads(pg);
  await pg.click('[data-testid=thread-tile]');
  await pg.waitForSelector('[data-testid=thread-screen]');
  check((await pg.locator('[data-testid=thread-title]').innerText()) === 'Harbor' && (await pg.locator('[data-testid=thread-quote]').count()) === 2
    && (await pg.locator('[data-testid=thread-screen] [data-testid=moment-card]').count()) === 3, 'RM15: the thread shows its name, two of the user\'s own sentences, and its three moments');
  // tend chronicle 11 (decision 0172, the accent at rest): the "Thread" label and the quotes' rule are ink (#1d2430).
  const threadInk = await pg.locator('[data-testid=thread-screen]').evaluate((el) => ({
    label: [...el.querySelectorAll('div')].filter((e) => e.childElementCount === 0 && e.textContent === 'Thread').map((e) => getComputedStyle(e).color),
    rules: [...el.querySelectorAll('[data-testid=thread-quote]')].map((e) => getComputedStyle(e).borderLeftColor),
  }));
  check(threadInk.label.length === 1 && [...threadInk.label, ...threadInk.rules].every((c) => c === 'rgb(29, 36, 48)') && threadInk.rules.length === 2,
    `tend chronicle 11: a thread's "Thread" label and its quotes' rule are ink at rest (${JSON.stringify(threadInk)})`);
  // tend chronicle 13: Keep as my thread is the screen's one button, on one row, and Rename and Not a thread are in a
  // More beside the "Thread" label, at 320 px and at 390 px (ui-patterns, "Nothing wraps on a 320 px phone"; matrix 3).
  {
    const vp = pg.viewportSize();
    const head = () => pg.evaluate(() => {
      const s = document.querySelector('[data-testid=thread-screen]');
      const r = (e) => { const b = e?.getBoundingClientRect(); return b && b.width ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null; };
      const label = [...s.querySelectorAll('div')].find((e) => e.childElementCount === 0 && e.textContent === 'Thread');
      const buttons = [...s.querySelectorAll('[role=button]')].filter((e) => !e.closest('[data-testid=moment-card]') && !['thread-back', 'thread-more'].includes(e.dataset.testid)).map((e) => e.dataset.testid);
      const keep = s.querySelector('[data-testid=thread-keep]');
      return { label: r(label), more: r(s.querySelector('[data-testid=thread-more]')), moreName: s.querySelector('[data-testid=thread-more]')?.getAttribute('aria-label') ?? null, keep: r(keep), keepBg: keep ? getComputedStyle(keep).backgroundColor : null, keepWrapped: keep ? keep.scrollWidth > keep.clientWidth + 1 || keep.getBoundingClientRect().height > 56 : null, buttons, loose: !!s.querySelector('[data-testid=thread-rename], [data-testid=thread-remove]'), vw: window.innerWidth };
    });
    const menuItems = async () => {
      await pg.click('[data-testid=thread-more]');
      await pg.waitForSelector('[data-testid=thread-menu]', { timeout: 4000 }).catch(() => {});
      await pg.waitForTimeout(800);
      return pg.locator('[data-testid=thread-menu] [role=button]').allInnerTexts();
    };
    const at = {};
    for (const width of [320, 390]) {
      await pg.setViewportSize({ width, height: vp.height });
      await pg.waitForTimeout(600);
      const h = await head();
      await shot(pg, `tend-chronicle-13-thread-${width}`);
      const items = await menuItems();
      await shot(pg, `tend-chronicle-13-thread-more-${width}`);
      await pg.click('[data-testid=thread-more-cancel]').catch(() => {});
      await pg.waitForSelector('[data-testid=thread-menu]', { state: 'detached', timeout: 4000 }).catch(() => {});
      at[width] = { ...h, items };
    }
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(400);
    const ok = (h) => !!h.label && !!h.more && !!h.keep && h.buttons.join() === 'thread-keep' && !h.loose && !h.keepWrapped
      && Math.abs(h.more.y + h.more.h / 2 - (h.label.y + h.label.h / 2)) <= 4 && h.more.x > h.label.x + h.label.w && h.more.x + h.more.w <= h.vw && h.more.w >= 44 && h.more.h >= 44
      && h.keep.x + h.keep.w <= h.vw && h.moreName === 'More for Harbor' && h.keepBg !== 'rgba(0, 0, 0, 0)'
      && h.items.map((t) => t.split('\n')[0]).join('|') === 'Rename|Not a thread|Cancel';
    // tend chronicle audit 9: the owner's two hints, under the rows they explain (the owner, Nov 17).
    check([320, 390].every((w) => at[w].items.join('|') === 'Rename\nGive it your own name|Not a thread\nOff the list for good; the moments stay|Cancel'),
      `tend chronicle audit 9: the thread's More says what Rename and Not a thread do (${JSON.stringify([at[320].items, at[390].items])})`);
    check(ok(at[320]) && ok(at[390]), `tend chronicle 13: Keep as my thread is the thread's one button, and Rename and Not a thread are in its More beside "Thread", at 320 and 390 px (${JSON.stringify(at)})`);
  }
  await pg.click('[data-testid=thread-more]');
  await pg.click('[data-testid=thread-rename]');
  await pg.waitForSelector('[data-testid=thread-name]');
  await pg.waitForTimeout(600);
  // The field has the keyboard once the sheet is gone: the sheet's focus trap gave focus back to the More (tend chronicle 13).
  check(await pg.evaluate(() => document.activeElement?.dataset?.testid === 'thread-name'), 'tend chronicle 13: Rename from the More puts the caret in the name field');
  // tend chronicle audit 7: the rename state at 320 and 390 px: Save and Cancel on one row, no More while it is open,
  // and what is typed stays until Save or Cancel.
  {
    const vp = pg.viewportSize();
    await pg.keyboard.type('The harbor, typed');
    const at7 = {};
    for (const width of [320, 390]) {
      await pg.setViewportSize({ width, height: vp.height });
      await pg.waitForTimeout(600);
      at7[width] = await pg.evaluate(() => {
        const s = document.querySelector('[data-testid=thread-screen]');
        const r = (sel) => { const b = s.querySelector(sel)?.getBoundingClientRect(); return b && b.width ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null; };
        const cancel = [...s.querySelectorAll('[role=button]')].find((e) => e.textContent.trim() === 'Cancel');
        const c = cancel?.getBoundingClientRect();
        return { save: r('[data-testid=thread-save]'), cancel: c ? { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height) } : null, more: !!s.querySelector('[data-testid=thread-more]'), value: s.querySelector('[data-testid=thread-name]')?.value ?? null, vw: window.innerWidth };
      });
      await shot(pg, `tend-chronicle-audit-7-thread-rename-${width}`);
    }
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(400);
    const ok7 = (t) => !!t.save && !!t.cancel && Math.abs(t.save.y - t.cancel.y) <= 2 && t.cancel.x + t.cancel.w <= t.vw && !t.more && !!t.value && t.value.includes('The harbor, typed') && t.value.replace('The harbor, typed', '') === 'Harbor';
    check(ok7(at7[320]) && ok7(at7[390]), `tend chronicle audit 7: renaming a thread, Save and Cancel are one row, no More is offered, and the typed words stay, at 320 and 390 px (${JSON.stringify(at7)})`);
  }
  await pg.fill('[data-testid=thread-name]', 'The harbor');
  await pg.click('[data-testid=thread-save]');
  check((await pg.locator('[data-testid=thread-title]').innerText()) === 'The harbor', 'RM16: Rename shows the new name');
  await pg.click('[data-testid=thread-back]');
  await pg.waitForSelector('[data-testid=thread-tile]');
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await toThreads(pg);
  await pg.waitForSelector('[data-testid=thread-tile]', { timeout: 20000 });
  check(/The harbor/.test(await pg.locator('[data-testid=thread-tile]').first().innerText()), 'RM16, RM21: the rename survives a reload');
  await pg.click('[data-testid=thread-tile]');
  await pg.click('[data-testid=thread-more]');
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
  check(await empty.pg.waitForSelector('[data-testid=day-heading]', { timeout: 15000 }).then(() => true, () => false)
    && (await empty.pg.locator('[data-testid=memories-navigate]').count()) === 0 && (await empty.pg.locator('[data-testid=bar-compose]').count()) === 1
    && (await empty.pg.locator('[data-testid=resurfaced]').count()) === 0 && (await empty.pg.locator('[data-testid=moment-card]').count()) === 0,
    'RM4: with nothing kept, today\'s date and the open line, and no slip or entry (amended by JN2)');
  await empty.c.close();
  await contextRun(h);
}

module.exports = {
  name: 'resurface',
  covers: [
    'src/components/chronicle/**',
    'src/lib/resurface/**',
  ],
  run,
};
