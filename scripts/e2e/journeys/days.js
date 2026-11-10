// Moments and days (M1-M17): the days list, a day's page and its timeline, in a browser of its own
// with nothing kept yet. Self-contained: the context is created here.

async function checks(h) {
  const { navUrl, BASE, browser, errors, hosts, start, at, dLon, OVERTURE_HOST, check, shot, metricRegion, tabTo, tileRoute, overtureRoute, tiles } = h;
    // Moments and days (the concept doc's "Moments and days" tab, M1-M17), in a fresh browser: nothing kept yet.
    {
      const ctx2 = await browser.newContext({
        viewport: { width: 390, height: 844 },
        permissions: ['geolocation', 'microphone'],
        geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 },
      });
      await metricRegion(ctx2);
      await ctx2.route('https://tiles.openfreemap.org/**', tileRoute);
      await ctx2.route(`https://${OVERTURE_HOST}/**`, overtureRoute);
      ctx2.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol)) hosts.add(u.host); });
      // Location watches started and cleared, so a moment is seen to leave none running (M5).
      await ctx2.addInitScript(() => {
        const g = navigator.geolocation;
        const watch = g.watchPosition.bind(g);
        const clear = g.clearWatch.bind(g);
        window.__watches = new Set();
        g.watchPosition = (...a) => { const id = watch(...a); window.__watches.add(id); return id; };
        g.clearWatch = (id) => { window.__watches.delete(id); clear(id); };
      });
      const p2 = await ctx2.newPage();
      p2.on('pageerror', (e) => errors.push(`moments: ${e}`));
      p2.on('console', (m) => m.type() === 'error' && errors.push(`moments: ${m.text()}`));
      const captureRows = () => p2.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
          g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).sort((a, b) => a.t - b.t));
        };
      }));
      const note = async (open, input, save, text) => {
        await p2.click(open);
        await p2.fill(input, text);
        await p2.click(save);
      };
      await p2.goto(navUrl);
      await p2.waitForSelector('[data-testid=moment-note]');
      check((await p2.locator('[data-testid=moment-photo]').count()) === 1 && (await p2.locator('[data-testid=moment-voice]').count()) === 1
        && (await p2.locator('[data-testid=start]').count()) === 1, 'Navigate offers camera, mic and pencil beside Start, with no walk open (M1, NV18)');
      // Navigate's map is around one fix, read as the tab comes to the front; nothing keeps watching (NV17).
      await p2.waitForTimeout(2500);
      const reads0 = await p2.evaluate(() => ({ live: window.__watches.size }));
      await tabTo(p2, 'chronicle');
      await p2.waitForTimeout(500);
      await tabTo(p2, 'navigate');
      await p2.waitForTimeout(2500);
      check(reads0.live === 0 && (await p2.evaluate(() => window.__watches.size)) === 0, 'Navigate reads one fix each time it comes to the front, and leaves no watch running (NV17)');

      // A note from the home is kept at once and placed by one fix (M1, M2), with no watch left running (M5).
      await note('[data-testid=moment-note]', '[data-testid=moment-note-input]', '[data-testid=moment-note-save]', 'A green dress in the window.');
      check(await p2.waitForSelector('text=Note kept here', { timeout: 15000 }).then(() => true, () => false), 'a note from the home is kept, and says it was placed (M2)');
      let rows = await captureRows();
      check(rows.length === 1 && rows[0].walk_id == null && rows[0].lat != null && Math.abs(rows[0].lon - start[0]) < 1e-5,
        `the moment belongs to no walk and sits where it was made (M1, M2)`);
      check((await p2.evaluate(() => window.__watches.size)) === 0, 'no location watch keeps running after a moment (M5)');
      // The moment is a pin where it was made, on Navigate, and the pin opens it (M16, moment pins 1-2).
      check(await p2.waitForSelector('[aria-label="Note. Open"]', { timeout: 15000 }).then(() => true, () => false), 'a placed moment shows as a pin on Navigate (M16, moment pins 1)');
      await shot(p2, '20-moment-home');
      await p2.click('[aria-label="Note. Open"]');
      check(await p2.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 }).then(() => true, () => false)
        && (await p2.getByText('A green dress in the window.').count()) > 0, 'the moment\'s pin on Navigate opens it in the viewer (M16, moment pins 2)');
      await p2.click('[data-testid=viewer-close]');
      await p2.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 10000 }).catch(() => {});

      // With nothing walked yet, Chronicle frames the moment, so its pin is in view, not the world (moment pins 3).
      await tabTo(p2, 'chronicle');
      check(await p2.waitForSelector('[aria-label="Note. Open"]', { timeout: 15000 }).then(() => true, () => false), 'Chronicle frames a moment made before any walk, and shows its pin (M16, moment pins 3)');

      // Today is listed in Chronicle's sheet with its moment (M7, M9, NV18).
      await h.mapUp(p2);
      await p2.click('[data-testid=sheet-days]');
      await p2.waitForSelector('[data-testid=day-row]');
      const dayRow = await p2.locator('[data-testid=day-row]').first().innerText();
      check(/^Today/.test(dayRow) && /1 moment\b/.test(dayRow), `the days list starts with today and its moment (${dayRow.replace(/\n/g, ' · ')})`);
      await p2.click('[data-testid=sheet-map]');

      // A walk with a note of its own, in the same day (M3).
      await tabTo(p2, 'navigate');
      await p2.click('[data-testid=start]');
      await p2.waitForURL(/\/walk/, { timeout: 15000 });
      const route2 = [];
      for (let k = 1; k <= 30; k++) route2.push([start[0] + (k / 30) * 1.5 * dLon, start[1]]);
      for (let k = 0; k < route2.length; k++) {
        await ctx2.setGeolocation({ longitude: route2[k][0], latitude: route2[k][1], accuracy: 6 });
        await p2.waitForTimeout(1000);
        if (k === 25) {
          await note('[data-testid=cap-note]', '[data-testid=note-input]', '[data-testid=note-save]', 'The tailor on the corner.');
          await p2.waitForSelector('text=Note saved here');
        }
      }
      const stopBox = await p2.locator('[data-testid=stop]').boundingBox();
      await p2.mouse.move(stopBox.x + stopBox.width / 2, stopBox.y + stopBox.height / 2);
      await p2.mouse.down();
      await p2.waitForTimeout(1100);
      await p2.mouse.up();
      await p2.waitForURL(/replay/, { timeout: 30000 });
      await p2.waitForSelector('[data-testid=skip]', { timeout: 30000 });
      await p2.click('[data-testid=skip]');
      await p2.click('[data-testid=to-name]');
      await p2.click('[data-testid=save]');
      await h.mapUp(p2);
      await p2.waitForSelector('[data-testid=home-sheet]');
      rows = await captureRows();
      check(rows.length === 2 && rows[1].walk_id != null, 'a note made on a walk belongs to that walk (M3)');

      // Mid-memo, the drawer stays down, Start can't be pressed, and the memo keeps recording (audit 1, NV28).
      await tabTo(p2, 'navigate');
      await p2.click('[data-testid=moment-voice]');
      await p2.waitForSelector('[data-testid=moment-voice-save]');
      await p2.waitForTimeout(1500);
      await p2.click('[data-testid=walk-stats]');
      await p2.waitForTimeout(500);
      check((await p2.locator('[data-testid=start-settings]').count()) === 0 && (await p2.locator('[data-testid=mode-quiet]').count()) === 0 && (await p2.locator('[data-testid=moment-voice-save]').isVisible())
        && (await p2.locator('[data-testid=start][aria-disabled=true]').count()) === 1,
        'raising the bar mid-memo does nothing, Start is disabled, and the memo keeps recording (audit 1, NV28, NR10)');
      await p2.click('[data-testid=moment-voice-discard]');
      await p2.waitForSelector('[data-testid=moment-voice-undo]');
      check(true, 'a memo discarded on the home can be undone (audit 14)');

      // With no fix coming, a moment is shown at once (audit 2), then said to have no place (M2).
      await p2.evaluate(() => {
        navigator.geolocation.watchPosition = () => 999;
      });
      await note('[data-testid=moment-note]', '[data-testid=moment-note-input]', '[data-testid=moment-note-save]', 'Sale on linen, ends Friday.');
      await p2.waitForTimeout(500);
      await tabTo(p2, 'chronicle');
      await h.mapUp(p2);
      await p2.click('[data-testid=sheet-days]');
      await p2.waitForSelector('[data-testid=day-row]');
      const early = await p2.locator('[data-testid=day-row]').first().innerText();
      check(/3 moments\b/.test(early), `a moment shows in its day at once, before its fix is settled (audit 2: ${early.replace(/\n/g, ' · ')})`);
      await p2.click('[data-testid=sheet-map]');
      // Leaving Navigate closes its screen, so the moment's "No location" toast is checked in the ready
      // scenario (NR13), where the screen stays up; here the stored row settles without a place.
      for (let i = 0; i < 30; i++) {
        rows = await captureRows();
        if (rows.length === 3 && rows[2].lat == null && Date.now() - rows[2].t > 11000) break;
        await p2.waitForTimeout(500);
      }
      check(rows.length === 3 && rows[2].walk_id == null && rows[2].lat == null, 'the moment with no fix is stored without a place');

      // The day's timeline: moment, walk, moment, in time order; the walk is one row (M8).
      await h.mapUp(p2);
      await p2.click('[data-testid=sheet-days]');
      await p2.click('[data-testid=day-row]');
      await p2.waitForSelector('[data-testid=day-title]');
      const order = await p2.locator('[data-testid=timeline-moment], [data-testid=timeline-walk]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
      check(order.join(',') === 'timeline-moment,timeline-walk,timeline-moment', `the day lists its moments and walk in time order (${order.join(', ')})`);
      check(/1 moment\b/.test(await p2.locator('[data-testid=timeline-walk]').innerText()), 'the walk is one row with its moment count (M8)');
      await p2.click('[data-testid=sheet-days-back]');
      await p2.waitForSelector('[data-testid=day-row]');
      check((await p2.locator('[data-testid=day-title]').count()) === 0, 'a day\u2019s timeline goes back to the days list (audit 11)');
      await p2.click('[data-testid=day-row]');
      await p2.waitForSelector('[data-testid=day-title]');
      await shot(p2, '21-day-timeline');
      // A moment opens in the viewer (M8).
      await p2.locator('[data-testid=timeline-moment]').first().click();
      check(await p2.waitForSelector('text=A green dress in the window.', { timeout: 5000 }).then(() => true, () => false), 'a moment in the timeline opens in the viewer');
      await p2.click('[aria-label="Close"]');

      // The day's replay: the dress, then the walk's path and its note, then the moment with no place,
      // in order and with no taps (M10, M11, M14, RR16).
      await p2.click('[data-testid=day-replay]');
      await p2.waitForURL(/\/day\//, { timeout: 15000 });
      const seen = [];
      let dayContinue = false;
      for (let k = 0; k < 240 && !(await p2.locator('[data-testid=day-card]').count()); k++) {
        if (await p2.locator('[data-testid=day-moment]').count()) dayContinue = true;
        const body = await p2.locator('body').innerText();
        for (const [name, re] of [['dress', /green dress/], ['tailor', /tailor/], ['linen', /linen/]]) if (re.test(body) && !seen.includes(name)) seen.push(name);
        if (seen.length === 2 && !seen.shot) {
          await shot(p2, '22-day-replay-walk');
          seen.shot = true;
        }
        await p2.waitForTimeout(250);
      }
      check(seen.join(',') === 'dress,tailor,linen' && !dayContinue, `the day replays its moments in order, the walk's inside it, with no taps (${seen.join(', ')})`);
      await p2.waitForSelector('[data-testid=day-card]', { timeout: 30000 });
      const line = await p2.locator('[data-testid=day-card-line]').innerText();
      const cardText = await p2.locator('[data-testid=day-card]').innerText();
      check(/^3 moments · 2 places$/.test(line) && /walked/.test(cardText) && !/streak|badge/i.test(cardText), `the day ends on a quiet card (${line})`);
      await shot(p2, '23-day-card');
      // Watching again moves on by itself (M12).
      await p2.click('[data-testid=day-again]');
      check(await p2.waitForSelector('[data-testid=day-card]', { timeout: 90000 }).then(() => true, () => false), 'watching the day again reaches the card with no taps (M12)');
      const watchedMeta = await p2.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('meta', 'readonly').objectStore('meta').getAll();
          g.onsuccess = () => resolve(g.result.some((m) => /^day_watched:/.test(m.key ?? m.k ?? '')));
        };
      }));
      check(watchedMeta, 'the day is remembered as watched (M12)');
      await p2.click('[data-testid=day-done]');

      // Back home: the placed moment shows as a pin (M16), and the walk still opens its own replay (M17).
      await p2.waitForSelector('[data-testid=day-title]');
      check(new URL(p2.url()).pathname === `${BASE}/chronicle`, 'the day replay closes back to Chronicle');
      await p2.click('[data-testid=sheet-map]');
      check(await p2.waitForSelector('[aria-label="Note. Open"]', { timeout: 15000 }).then(() => true, () => false), 'a placed moment shows as a pin on the home map (M16)');
      await h.mapUp(p2);
      await p2.click('[data-testid=sheet-days]');
      await p2.click('[data-testid=day-row]');
      await p2.click('[data-testid=timeline-walk]');
      await p2.waitForURL(/\/replay\//, { timeout: 15000 });
      check(await p2.waitForSelector('[data-testid=done]', { timeout: 90000 }).then(() => true, () => false), 'a walk in the timeline opens its own replay, as before (M8, M17)');
      await ctx2.close();
    }
}

async function run(h) {
  await checks(h);
}

module.exports = {
  name: 'days',
  covers: [
    'src/app/day/**',
    'src/lib/{days,momentPins,useLocate}.ts',
    'src/lib/locate/**',
    'src/components/MomentBar.tsx',
    'src/lib/explore/momentFind/**',
  ],
  run,
  checks,
};
