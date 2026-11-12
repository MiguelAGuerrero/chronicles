// Walk planner (WP1-WP27, KW15): a kind's button opens a page of its own with up to three routes on the map, rows, a strip each,
// settings, Suggest different routes, and Start. Phase two has a walk recording: capture is on the page and Start routes that walk.
// E2E_ONLY=planner runs it alone.

const BANNED = /\b(minutes?|mins?|hours?|ETA|pace|brisk|quick(er|est)?|fast(er|est)?|shorter|longer|more|most|best|densest|less|than|same)\b/i;

async function run(h) {
  const { url, exploreUrl, at, check, freshPage, shot, openWalk, tabTo, tabBarShown } = h;
  const { c, pg } = await freshPage('planner');
  const walksCount = (page) => page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
      g.onsuccess = () => resolve(g.result.length);
    };
  }));
  if (process.env.E2E_DEBUG) pg.on('console', (m) => /^PLAN/.test(m.text()) && console.log('PAGE', m.text()));
  const here = at(-120, 0);
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.goto(exploreUrl);
  const tile = pg.locator('[data-testid=atlas-tile][data-name="Green Row"]');
  await pg.waitForSelector('[data-testid=atlas-tile][data-name="Green Row"][data-read="1"]', { timeout: 60000 }).catch(() => {});
  // Turned, through the planner and back, Explore's map comes back north-up with no compass left over it (CP8; tend map
  // audit 6: the map unmounted under the planner and its last bearing stayed with the compass).
  const compass = pg.locator('[data-testid=compass]').filter({ visible: true });
  let turnOn = null;
  {
    // Two real touches swung 90° in the map's top quarter (as qol's turn), through the DevTools protocol.
    const cdp = await c.newCDPSession(pg);
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const mb = await pg.locator('xpath=//canvas[contains(@class,"maplibregl-canvas")][not(ancestor::*[@aria-hidden="true"])]').last().boundingBox();
    const cx = mb.x + mb.width / 2, cy = mb.y + mb.height / 4, r = 60;
    const pts = (a) => [{ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), id: 1 }, { x: cx - r * Math.cos(a), y: cy - r * Math.sin(a), id: 2 }];
    turnOn = await pg.evaluate((ps) => ps.map((q) => document.elementFromPoint(q.x, q.y)?.className?.toString().slice(0, 30) ?? null), pts(0));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(0) });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts((i * Math.PI) / 24) });
      await pg.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await cdp.detach();
    await pg.waitForTimeout(800);
  }
  await tile.click().catch(() => {});
  await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 }).catch(() => {});
  const before = pg.url();
  const btn = pg.locator('[data-testid=atlas-kind-walk-parks]');
  await btn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const box = await btn.boundingBox().catch(() => null);
  check((await pg.locator('[data-testid=atlas-kind-walk-nightlife]').count()) === 0 && (await btn.count()) === 1, 'KW2: a kind with none has no "Suggest a walk" button, one with some does');
  check((await btn.count()) === 1 && /Suggest a walk/.test(await btn.innerText().catch(() => '')) && !!box && box.width >= 43.5 && box.height >= 43.5, 'KW15: each kind row has a "Suggest a walk" button, at least 44 px to touch');
  check((await btn.getAttribute('aria-label').catch(() => '')) === 'Suggest a walk through green', 'KW15: the button reads as one to a screen reader');
  const cardBox = await pg.locator('[data-testid=atlas-card-pull]').boundingBox().catch(() => null);
  check(!!box && !!cardBox && Math.abs(box.x + box.width - (cardBox.x + cardBox.width - 18)) <= 6, 'KW15: the button is aligned right in its row');

  const turnedBefore = await compass.count();
  const bearingTurned = await pg.evaluate(() => [...document.querySelectorAll('[data-bearing]')].filter((e) => !e.closest('[aria-hidden=true]')).map((e) => e.getAttribute('data-bearing')));

  await btn.click();
  // Green Row has one street, so a loop (the default) cannot be made there without going back the way it came (KW16): said so, and
  // one way is the answer (WP8).
  await pg.waitForSelector('[data-testid=plan-reason-noLoop], [data-testid=plan-row-0]', { timeout: 90000 }).catch(() => {});
  check((await pg.locator('[data-testid=plan-reason-noLoop]').count()) === 1 && (await pg.locator('[data-testid=plan-row-0]').count()) === 0, 'WP8: where a loop cannot be made without retracing, the page says so and offers One way');
  await pg.click('[data-testid=plan-mode-oneway]');
  await pg.waitForSelector('[data-testid=plan-row-0]', { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(500);
  if (process.env.E2E_DEBUG) console.log('PLANNER', ((await pg.locator('[data-testid=planner]').innerText().catch(() => 'none')).replace(/\s+/g, ' ')).slice(0, 700));
  const rows = pg.locator('[data-testid^=plan-row-]:not([data-testid^=plan-row-distance])');
  const n = await pg.locator('[data-testid^="plan-row-"][data-preset]').count();
  check((await pg.locator('[data-testid=planner]').count()) === 1 && pg.url() === before, 'WP1: the button opens the planner over Explore: no new route');
  // Closing the planner leaves the tabs as the card under it had them: hidden while the card is open (audit 12).
  await pg.click('[data-testid=plan-close]');
  await pg.waitForTimeout(600);
  check((await pg.locator('[data-testid=atlas-card]').count()) === 1 && !(await tabBarShown(pg)), 'walk-planner audit 12: closing the planner leaves the tabs hidden while the area card is open');
  await pg.waitForTimeout(1200);
  const bearingBack = await pg.evaluate(() => [...document.querySelectorAll('[data-bearing]')].filter((e) => !e.closest('[aria-hidden=true]')).map((e) => e.getAttribute('data-bearing')));
  check(turnedBefore === 1 && (await compass.count()) === 0, `tend map audit 6: turned, through the planner and back, Explore shows no compass (before ${turnedBefore} at ${JSON.stringify(bearingTurned)} on ${JSON.stringify(turnOn)}, after ${await compass.count()}; bearing ${JSON.stringify(bearingBack)})`);
  await btn.click();
  await pg.waitForSelector('[data-testid=plan-row-0]', { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(500);
  check((await pg.locator('[data-testid=plan-map]').count()) === 1 && n >= 1 && (await pg.locator('[data-testid=plan-settings]').count()) === 1, 'WP2: the planner has the map, a row for each route and the settings');
  check(n >= 1 && n <= 3, `WP4: up to three routes are shown (${n})`);
  const order = await pg.locator('[data-testid^="plan-row-"][data-preset]').evaluateAll((els) => els.map((e) => e.getAttribute('data-preset')));
  const rank = ['middle', 'across', 'edge'];
  check(order.map((p) => rank.indexOf(p)).every((v, i, a) => i === 0 || a[i - 1] < v), `WP4: the rows are in the presets' fixed order (${order.join(',')})`);
  const selected = await pg.locator('[data-testid^="plan-row-"][data-preset]').evaluateAll((els) => els.map((e) => e.getAttribute('data-selected')));
  check(selected[0] === '1' && selected.slice(1).every((s) => s === '0') && !(await pg.locator('[data-testid=plan-start]').isDisabled().catch(() => true)), `WP4, WP18: the first route is selected when it opens, and Start is ready (${selected.join(',')})`);
  const alsoLines = await pg.locator('[data-testid^=plan-also-]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-testid'), e.textContent]));
  check(alsoLines.length === 1 && alsoLines[0][0] === 'plan-also-0' && /^Also passes (some|plenty of) history/.test(alsoLines[0][1] ?? ''), `WP28, audit 14: the selected route names the other kind along it, by kind, and only the selected row does (${JSON.stringify(alsoLines)})`);
  check(!/Memorial/.test(await pg.locator('[data-testid=planner]').innerText()), 'WP28: no place is named');
  const text = await pg.locator('[data-testid=planner]').innerText();
  check(!BANNED.test(text), 'WP7: no time, pace, comparison or superlative anywhere on the page');
  check(!/\b(Plenty|Some|Little)[^.]*\d/.test(text.replace(/About [\d.]+ (km|mi|m|ft)/g, '')), 'WP14: no digit in what a row passes');
  const first = pg.locator('[data-testid=plan-row-0]');
  const dist = await pg.locator('[data-testid=plan-row-distance-0]').innerText().catch(() => '');
  check(/^About \d+(\.\d)? (km|mi|m|ft)/.test(dist), `WP14: a row gives its own distance (${dist})`);
  check((await pg.locator('[data-testid=plan-strip-0]').count()) === 1 && /^Green along this route/.test((await pg.locator('[data-testid=plan-strip-0]').getAttribute('aria-label')) ?? ''), 'WP15: each row has a strip with a text equivalent');
  check(/^(Easy on foot|Part of it|It is not known)/.test(await pg.locator('[data-testid=plan-reach-0]').innerText().catch(() => '')), 'KW10, WP20: each row says whether it can be walked the whole way');
  await shot(pg, 'planner-open');

  const last = pg.locator('[data-testid^="plan-row-"][data-preset]').last();
  await last.click();
  await pg.waitForTimeout(300);
  check(n === 1 || ((await last.getAttribute('data-selected')) === '1' && (await first.getAttribute('data-selected')) === '0'), 'WP18: tapping another row selects it, and Start can go');
  check(((await pg.locator('[data-testid=plan-map]').innerHTML().catch(() => '')).length) > 100 && (await pg.locator('canvas.maplibregl-canvas').count()) >= 1, 'WP16: the map is drawn on the real map');

  // WP12: a setting acts at once, and is kept.
  await pg.click('[data-testid=plan-mode-loop]');
  await pg.waitForSelector('[data-testid=plan-reason-noLoop]', { timeout: 60000 }).catch(() => {});
  check((await pg.locator('[data-testid=plan-reason-noLoop]').count()) === 1 && (await pg.locator('[data-testid^="plan-row-"][data-selected="1"]').count()) === 0, 'WP12: a setting plans again at once');
  await pg.click('[data-testid=plan-mode-oneway]');
  await pg.waitForSelector('[data-testid=plan-row-0]', { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(500);
  const meta = await pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('meta', 'readonly').objectStore('meta').getAll();
      g.onsuccess = () => resolve(g.result.filter((m) => /kindwalk/.test(m.key ?? m.k ?? '')).map((m) => m.key ?? m.k));
    };
  }));
  check(Array.isArray(meta) && meta.includes('kindwalk_mode'), `WP12: the setting is kept (${meta})`);
  // WP13: different routes, with no count and no history.
  await pg.click('[data-testid=plan-different]');
  await pg.waitForTimeout(2500);
  const text2 = await pg.locator('[data-testid=planner]').innerText();
  check(!/\bwas\b|\bearlier\b|\d+ (routes|more)/i.test(text2) && !BANNED.test(text2), 'WP13: Suggest different routes keeps no history and shows no count');

  // A setting changes: the routes are planned again from the first round (WP12), and nothing is highlighted.
  await pg.click('[data-testid=plan-mode-loop]');
  await pg.waitForSelector('[data-testid=plan-reason-noLoop]', { timeout: 60000 }).catch(() => {});
  await pg.click('[data-testid=plan-mode-oneway]');
  await pg.waitForSelector('[data-testid=plan-row-0]', { timeout: 60000 });
  await pg.waitForTimeout(500);

  // WP19, WP21: with no walk open, Start starts one ready, saying distance only.
  await pg.locator('[data-testid^="plan-row-"][data-preset]').first().click();
  await pg.waitForTimeout(300);
  check((await openWalk(pg)) === null, 'WP19: nothing is started until Start');
  await pg.dblclick('[data-testid=plan-start]');
  await pg.waitForSelector('[data-testid=nav-bar]', { timeout: 90000 }).catch(() => {});
  check((await walksCount(pg)) === 1, 'walk-planner audit 11: two taps on Start start one walk');
  const bar = await pg.locator('[data-testid=nav-left]').innerText().catch(() => '');
  check(/^\d/.test(bar) && !/\b(min|mins|minutes?|hours?|h)\b/i.test(bar), `WP19, WP21: Start opens a walk ready, saying distance only (${bar})`);
  check((await openWalk(pg)) !== null && (await pg.locator('[data-testid=planner]').count()) === 0 && (await pg.locator('[data-testid=plan-strip-0]').count()) === 0, 'WP17: the walk is open, and the shading and the strip are on the planner only');
  await shot(pg, 'planner-walk');

  // Phase two: the walk is recording. Minimize it, go back to Explore, and open the planner on the same kind (WP23, WP19).
  const walks = async () => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
      g.onsuccess = () => resolve(g.result.length);
    };
  }));
  const walkId = (await openWalk(pg))?.id;
  await pg.click('[data-testid=walk-minimize]');
  await pg.waitForTimeout(1500);
  await tabTo(pg, 'explore');
  await pg.waitForSelector('[data-testid=atlas-carousel]', { timeout: 30000 });
  await pg.locator('[data-testid=atlas-tile][data-name="Green Row"]').click().catch(() => {});
  await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 });
  await pg.waitForTimeout(800);
  await pg.click('[data-testid=atlas-kind-walk-parks]');
  await pg.waitForSelector('[data-testid=plan-capture]', { timeout: 30000 }).catch(() => {});
  check((await pg.locator('[data-testid=plan-capture]').count()) === 1 && (await pg.locator('[data-testid=plan-cap-photo]').count()) === 1 && (await pg.locator('[data-testid=plan-cap-voice]').count()) === 1 && (await pg.locator('[data-testid=plan-cap-note]').count()) === 1, 'WP23: with a walk recording, the capture stack is on the planner: photo, voice and note, one tap away');
  await pg.click('[data-testid=plan-cap-note]');
  // note-pages audit 13: the planner's pencil opens the note's page too, never the old card.
  const plannerPage = await pg.waitForSelector('[data-testid=note-page] [data-testid=note-input]', { timeout: 8000 }).then(() => true, () => false);
  check(plannerPage && (await pg.locator('[data-testid=plan-note]').count()) === 0, 'note-pages audit 13: the planner\'s pencil opens the note\'s page');
  await pg.fill('[data-testid=note-page] [data-testid=note-input]', 'A note from the planner');
  await pg.click('[data-testid=note-done]');
  await pg.waitForTimeout(1500);
  const saved = await pg.evaluate((id) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
      g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).filter((x) => x.walk_id === id && /A note from the planner/.test(x.body ?? '')).length);
    };
  }), walkId);
  check(saved === 1, `WP23: a note taken on the planner arrives as a moment on the walk (${saved})`);
  // Choose a route and Start: the open walk is routed, no second walk is started.
  await pg.waitForSelector('[data-testid=plan-row-0], [data-testid=plan-reason-noLoop]', { timeout: 60000 }).catch(() => {});
  if ((await pg.locator('[data-testid=plan-row-0]').count()) === 0) {
    await pg.click('[data-testid=plan-mode-oneway]');
    await pg.waitForSelector('[data-testid=plan-row-0]', { timeout: 60000 });
  }
  await pg.locator('[data-testid^="plan-row-"][data-preset]').first().click();
  await pg.click('[data-testid=plan-start]');
  await pg.waitForSelector('[data-testid=nav-bar]', { timeout: 90000 }).catch(() => {});
  check((await walks()) === 1 && (await openWalk(pg))?.id === walkId && (await pg.locator('[data-testid=nav-bar]').count()) === 1, 'WP19: with a walk recording, Start routes that walk and starts no second one');
  await c.close();
}

module.exports = {
  name: 'planner',
  covers: [
    'src/lib/walkPlanner/**',
    'src/lib/kindWalk/**',
    'src/components/planner/**',
    'src/components/atlas/{KindStrip,AtlasCard}.tsx',
    'src/lib/nav/useNavigation.ts',
  ],
  run,
};
