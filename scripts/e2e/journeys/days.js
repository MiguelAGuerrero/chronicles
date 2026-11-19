// Moments and days (M1-M17): the days list, a day's page and its timeline, in a browser of its own
// with nothing kept yet. Self-contained: the context is created here.

async function checks(h) {
  const { navUrl, BASE, browser, errors, hosts, start, at, dLon, OVERTURE_HOST, check, shot, metricRegion, tabTo, tileRoute, overtureRoute, tiles, toStop } = h;
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
      await note('[data-testid=moment-note]', '[data-testid=note-input]', '[data-testid=note-done]', 'A green dress in the window.');
      check(await p2.waitForSelector('text=Note kept here', { timeout: 15000 }).then(() => true, () => false), 'a note from the home is kept, and says it was placed (M2)');
      let rows = await captureRows();
      check(rows.length === 1 && rows[0].walk_id == null && rows[0].lat != null && Math.abs(rows[0].lon - start[0]) < 1e-5,
        `the moment belongs to no walk and sits where it was made (M1, M2)`);
      check((await p2.evaluate(() => window.__watches.size)) === 0, 'no location watch keeps running after a moment (M5)');
      // The moment is a pin where it was made, on Navigate, and the pin opens it (M16, moment pins 1-2).
      check(await p2.waitForSelector('.maplibregl-map [aria-label^="Note, "][aria-label$=". Open"]', { timeout: 15000 }).then(() => true, () => false), 'a placed moment shows as a pin on Navigate (M16, moment pins 1)');
      // tend map T28: the ready screen has no walk clock, so the pin says the part of the day, as the moment's own line does.
      // tend map audit 31: scoped to the map (a journal entry can carry the same words), and a run just past midnight.
      const today = /^Note, (this (morning|afternoon|evening)|tonight|late last night|yesterday night)\. Open$/;
      const readyLabel = await p2.locator('.maplibregl-map [aria-label^="Note, "][aria-label$=". Open"]').first().getAttribute('aria-label').catch(() => null);
      check(today.test(readyLabel ?? ''), `tend map T28: a moment's pin on the ready screen says the part of the day (${readyLabel})`);
      await shot(p2, '20-moment-home');
      await p2.click('.maplibregl-map [aria-label^="Note, "][aria-label$=". Open"]');
      check(await p2.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 }).then(() => true, () => false)
        && (await p2.getByText('A green dress in the window.').count()) > 0, 'the moment\'s pin on Navigate opens it in the viewer (M16, moment pins 2)');
      await p2.click('[data-testid=viewer-close]');
      await p2.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 10000 }).catch(() => {});

      // With nothing walked yet, Chronicle frames the moment, so its pin is in view, not the world (moment pins 3).
      await tabTo(p2, 'chronicle');
      check(await p2.waitForSelector('.maplibregl-map [aria-label^="Note, "][aria-label$=". Open"]', { timeout: 15000 }).then(() => true, () => false), 'Chronicle frames a moment made before any walk, and shows its pin (M16, moment pins 3)');
      const chronicleLabel = await p2.locator('.maplibregl-map [aria-label^="Note, "][aria-label$=". Open"]').first().getAttribute('aria-label').catch(() => null);
      check(today.test(chronicleLabel ?? ''), `tend map T28: the moment's pin on Chronicle's map says the part of the day (${chronicleLabel})`);

      // Today is listed in Chronicle's sheet with its moment (M7, M9, NV18).
      await h.mapUp(p2);
      // tend tabs T10: with nothing walked and nothing open, the peek offers Navigate alone; Days is the section bar's.
      check(await p2.waitForSelector('[data-testid=sheet-empty]', { timeout: 10000 }).then(() => true, () => false)
        && (await p2.locator('[data-testid=sheet-days]').count()) === 0 && (await p2.locator('[data-testid=sheet-navigate]').count()) === 1,
        'tend tabs T10: with a day kept and nothing walked, the peek offers Navigate and no Days (the section bar holds it)');
      await shot(p2, 'days-0-peek-a-day-and-nothing-walked');
      await p2.click('[data-testid=section-days]');
      await p2.waitForSelector('[data-testid=day-row]');
      const dayRow = await p2.locator('[data-testid=day-row]').first().innerText();
      check(/^Today/.test(dayRow) && /\bOne[ \u00a0]moment\b/.test(dayRow), `the days list starts with today and its moment (${dayRow.replace(/\n/g, ' · ')})`);
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
          await note('[data-testid=cap-note]', '[data-testid=note-input]', '[data-testid=note-done]', 'The tailor on the corner.');
          await p2.waitForSelector('text=Note saved here');
        }
      }
      await toStop(p2);
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
      check((await p2.locator('[data-testid=start-settings]').count()) === 0 && (await p2.locator('[data-testid=moment-voice-save]').isVisible())
        && (await p2.locator('[data-testid=start][aria-disabled=true]').count()) === 1,
        'raising the bar mid-memo does nothing, Start is disabled, and the memo keeps recording (audit 1, NV28, NR10)');
      await p2.click('[data-testid=moment-voice-discard]');
      await p2.waitForSelector('[data-testid=moment-voice-undo]');
      check(true, 'a memo discarded on the home can be undone (audit 14)');

      // With no fix coming, a moment is shown at once (audit 2), then said to have no place (M2).
      await p2.evaluate(() => {
        navigator.geolocation.watchPosition = () => 999;
      });
      await note('[data-testid=moment-note]', '[data-testid=note-input]', '[data-testid=note-done]', 'Sale on linen, ends Friday.');
      await p2.waitForTimeout(500);
      await tabTo(p2, 'chronicle');
      await h.mapUp(p2);
      await p2.click('[data-testid=sheet-days]');
      await p2.waitForSelector('[data-testid=day-row]');
      const early = await p2.locator('[data-testid=day-row]').first().innerText();
      check(/\bThree[ \u00a0]moments\b/.test(early), `a moment shows in its day at once, before its fix is settled (audit 2: ${early.replace(/\n/g, ' · ')})`);
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
      // tend tabs T32 (the owner's yes, Nov 14): the days list and a day's header say their counts in words, "Three moments
      // · one walk", as the timeline under them does, and the row's spoken name says them too; whole at 390 and 320 px.
      await p2.waitForSelector('[data-testid=day-row]');
      const metaOf32 = (sel) => p2.evaluate((q) => {
        const e = document.querySelector(q);
        if (!e) return null;
        const r = e.getBoundingClientRect();
        return { text: e.textContent.replace(/\u00a0/g, ' '), right: Math.round(r.right), cut: e.scrollWidth > e.clientWidth + 1, name: e.closest('[data-testid=day-row]')?.getAttribute('aria-label') ?? null };
      }, sel);
      for (const w of [390, 320]) {
        await p2.setViewportSize({ width: w, height: 844 });
        await p2.waitForTimeout(600);
        const row = await metaOf32('[data-testid=day-row-meta]');
        check(row && row.text === 'Three moments · one walk' && row.right <= w && !row.cut && /^Today, three moments, one walk$/.test(row.name ?? ''),
          `tend tabs T32: at ${w} px the days list says "Three moments · one walk", and its row is named in words (${JSON.stringify(row)})`);
        await shot(p2, `days-t32-list-${w}`);
      }
      await p2.click('[data-testid=day-row]');
      await p2.waitForSelector('[data-testid=day-title]');
      // Whole at 390 and 375 px, on two lines where it needs them. At 320 px the header's text has about 88 px beside
      // Days and Map: its line wraps between words and ends in an ellipsis (tend tabs audit 25).
      for (const w of [320, 375, 390]) {
        await p2.setViewportSize({ width: w, height: 844 });
        await p2.waitForTimeout(600);
        const head = await p2.evaluate(() => {
          const e = document.querySelector('[data-testid=day-meta]');
          if (!e) return null;
          const r = e.getBoundingClientRect();
          return { text: e.textContent.replace(/\u00a0/g, ' '), right: Math.round(r.right), cut: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 };
        });
        // tend tabs audit 25 (the review's steward 1): at 320 px the header's line wraps between words, no word broken
        // across two lines; what does not fit ends in an ellipsis.
        if (w === 320) {
          const split = await p2.evaluate(() => {
            const e = document.querySelector('[data-testid=day-meta]');
            const node = e && [...e.childNodes].find((n) => n.nodeType === 3);
            if (!node) return null;
            const broken = [];
            const re = /\S+/g;
            let m;
            while ((m = re.exec(node.textContent))) {
              const r = document.createRange();
              r.setStart(node, m.index);
              r.setEnd(node, m.index + m[0].length);
              const tops = new Set([...r.getClientRects()].filter((b) => b.width > 0).map((b) => Math.round(b.top)));
              if (tops.size > 1) broken.push(m[0]);
            }
            return broken;
          });
          check(split && split.length === 0, `tend tabs audit 25: at 320 px a day's header breaks no word across its lines (${JSON.stringify(split)}; ${JSON.stringify(head)})`);
        } else check(head && head.text === 'Three moments · one walk' && head.right <= w && !head.cut,
          `tend tabs T32: at ${w} px a day's header says "Three moments · one walk", whole (${JSON.stringify(head)})`);
        await shot(p2, `days-t32-header-${w}`);
      }
      const order = await p2.locator('[data-testid=timeline-moment], [data-testid=timeline-walk]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
      check(order.join(',') === 'timeline-moment,timeline-walk,timeline-moment', `the day lists its moments and walk in time order (${order.join(', ')})`);
      check(/\bone[ \u00a0]moment\b/.test(await p2.locator('[data-testid=timeline-walk]').innerText()), 'the walk is one row with its moment count, in words (M8, tend tabs 11)');
      await p2.click('[data-testid=sheet-days-back]');
      await p2.waitForSelector('[data-testid=day-row]');
      check((await p2.locator('[data-testid=day-title]').count()) === 0, 'a day\u2019s timeline goes back to the days list (audit 11)');
      await p2.click('[data-testid=day-row]');
      await p2.waitForSelector('[data-testid=day-title]');
      await shot(p2, '21-day-timeline');
      // tend tabs 11 (decision 0172, O18): the walk's line says its moments in words, and its More is named by the title
      // it shows, at 390 and 320 px.
      for (const w of [390, 320]) {
        if (w !== 390) {
          await p2.setViewportSize({ width: w, height: 844 });
          await p2.waitForTimeout(500);
          await shot(p2, `21-day-timeline-${w}`);
        }
        const row = await p2.evaluate(() => {
          const e = document.querySelector('[data-testid=timeline-walk]');
          const more = e?.parentElement?.querySelector('[data-testid=walk-more]');
          const texts = e ? [...e.querySelectorAll('div, span')].filter((x) => !x.childElementCount).map((x) => x.textContent) : [];
          const at = texts.findIndex((t) => /^Walk( · |$)/.test(t));
          // The title is the line above the walk's line.
          return { line: at >= 0 ? texts[at] : null, title: at > 0 ? texts[at - 1] : null, more: more?.getAttribute('aria-label') ?? null, right: more ? Math.round(more.getBoundingClientRect().right) : null };
        });
        check(/^Walk( · .+)? · one\u00a0moment$/.test(row.line ?? '') && row.more === `More for ${row.title}` && row.right <= w,
          `tend tabs 11, tend tabs audit 24: at ${w} px a day's walk says its moments in words, the count on its noun's line, its More named by its title (${JSON.stringify(row)})`);
      }
      await p2.setViewportSize({ width: 390, height: 844 });
      await p2.waitForTimeout(300);
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
      check(/^Three moments(, around .+| around .+)?$/.test(line) && /walked/.test(cardText) && !/streak|badge/i.test(cardText), `the day ends on a quiet card, its moments a clause (tend replay T19: ${line})`);
      // tend replay audit 12 (the owner, Nov 14, "Only when all are placed"): the linen moment has no place, so the day
      // names no place or area, only its count.
      check(line === 'Three moments', `tend replay audit 12: a day with a moment that has no place says its count alone (${line})`);
      await shot(p2, '23-day-card');
      // tend map T28, audit 28: on the day's map every pin says when: a pin of its one walk the minutes in (a day of
      // several walks would say each one's part of the day), a moment outside a walk its part of the day.
      const dayPins = await p2.$$eval('.maplibregl-map [aria-label$=". Open"]', (es) => es.map((e) => e.getAttribute('aria-label')));
      const said = /, (at the start|.+ minutes? in|from .+|this (morning|afternoon|evening)|tonight|late last night|yesterday night)\. Open$/;
      check(dayPins.length >= 1 && dayPins.every((l) => said.test(l)), `tend map audit 28: the day replay's pins each say when (${dayPins.join(' / ')})`);
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
      check(new URL(p2.url()).pathname === `${BASE}/`, 'the day replay closes back to Chronicle');
      await p2.click('[data-testid=sheet-map]');
      check(await p2.waitForSelector('.maplibregl-map [aria-label^="Note, "][aria-label$=". Open"]', { timeout: 15000 }).then(() => true, () => false), 'a placed moment shows as a pin on the home map (M16)');
      await h.mapUp(p2);
      await p2.click('[data-testid=sheet-days]');
      await p2.click('[data-testid=day-row]');
      await p2.click('[data-testid=timeline-walk]');
      await p2.waitForURL(/\/replay\//, { timeout: 15000 });
      check(await p2.waitForSelector('[data-testid=done]', { timeout: 90000 }).then(() => true, () => false), 'a walk in the timeline opens its own replay, as before (M8, M17)');
      await ctx2.close();
    }

    // tend map 11 (decision 0172, O16, "The span alone"): a pin of moments from two years ago says how long ago alone,
    // "Two notes, two years ago. Open": no month, no part of the day. Seeded in a browser of its own, so no old day
    // joins the days list above.
    {
      const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 } });
      await metricRegion(ctx3);
      await ctx3.route('https://tiles.openfreemap.org/**', tileRoute);
      await ctx3.route(`https://${OVERTURE_HOST}/**`, overtureRoute);
      ctx3.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol)) hosts.add(u.host); });
      const p3 = await ctx3.newPage();
      p3.on('pageerror', (e) => errors.push(`old pin: ${e}`));
      p3.on('console', (m) => m.type() === 'error' && errors.push(`old pin: ${m.text()}`));
      await p3.goto(navUrl);
      await p3.waitForSelector('[data-testid=moment-note]');
      // About thirty months back, so "two years ago" holds on any date (whole years elapsed, tend map audit 32).
      const then = new Date(new Date().getFullYear() - 2, new Date().getMonth() - 6, 4, 19).getTime();
      const spot = [start[0] + 0.3 * dLon, start[1]];
      await p3.evaluate(([t, lon, lat]) => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const tx = req.result.transaction('moment', 'readwrite');
          [['old-a', 'Bought plums at the corner.', 0], ['old-b', 'The bells rang at seven.', 1]].forEach(([id, body, k]) => {
            const at = t + k * 300000;
            tx.objectStore('moment').put({ id, walk_id: null, t: at, lat: lat + k * 0.000005, lon, segment_id: null, piece_ids: [id], pieces: [{ id, moment_id: id, kind: 'text', file_path: null, body, t: at, caption: null, caption_y: null }] });
          });
          tx.oncomplete = () => resolve(true);
        };
      }), [then, spot[0], spot[1]]);
      await p3.reload();
      const oldPin = '.maplibregl-map [aria-label^="Two notes, "][aria-label$=". Open"]';
      const up = await p3.waitForSelector(oldPin, { timeout: 20000 }).then(() => true, () => false);
      for (const w of [390, 320]) {
        await p3.setViewportSize({ width: w, height: 844 });
        await p3.waitForTimeout(1200);
        const name = await p3.locator(oldPin).first().getAttribute('aria-label').catch(() => null);
        check(up && name === 'Two notes, two years ago. Open', `tend map 11: at ${w} px an old pin says how long ago alone, no month and no part of the day (${name})`);
        await shot(p3, `days-o16-old-pin-${w}`);
      }
      await ctx3.close();
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
  ],
  run,
  checks,
};
