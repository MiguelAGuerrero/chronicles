// The tabs audit (Navigation & tabs): each accepted finding's regression check, `tabs audit N`, in a
// fresh browser. E2E_ONLY=tabs runs it alone.

async function run(h) {
  const { url, navUrl, BASE, page, start, at, dLat, dLon, check, glyph, iconOf, metaOf, drawerTo, tabTo, shownCount, tabBarShown, freshPage, openWalk } = h;
    const { c, pg } = await freshPage('tabs-audit');
    await c.addInitScript(() => {
      window.__perf = {};
      // Location watches begun, so Navigate is seen to start none of its own while a walk is open (U2).
      const g = navigator.geolocation;
      const watch = g.watchPosition.bind(g);
      window.__watchCalls = 0;
      g.watchPosition = (...a) => { window.__watchCalls++; return watch(...a); };
    });
    const rows = (pg2, kind) => pg2.evaluate((k) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
        g.onsuccess = () => resolve(g.result.filter((x) => !k || x.kind === k));
      };
    }), kind);
    const vh = 844;
    let w = null;
    // E2E_SOFT=1: a step that throws (an element missing on code from before a fix) is reported, and the next runs.
    const step = async (name, fn) => {
      try {
        await fn();
      } catch (e) {
        if (!process.env.E2E_SOFT) throw e;
        console.log(`not ok - ${name}: ${String(e.message).split('\n')[0]}`);
      }
    };
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.waitForTimeout(1500);

    await step('tabs audit U9 and the banner', async () => {
      // tabs audit U9: the web's note can be dismissed, and stays dismissed after a reload.
      const noteText = 'text=On the web, a walk is traced while this page is open and on screen.';
      const noteShown = (await pg.locator(noteText).count()) === 1;
      const closeBox = noteShown ? await pg.locator('[data-testid=banner-dismiss]').boundingBox() : null;
      // tabs audit U4: the banner's ✕ is 44 pt itself (react-native-web has no hit slop).
      check(closeBox && closeBox.width >= 44 && closeBox.height >= 44, `tabs audit U4: the banner's ✕ is at least 44 pt (${closeBox && `${closeBox.width}×${closeBox.height}`})`);
      await pg.click('[data-testid=banner-dismiss]');
      await pg.waitForTimeout(400);
      await pg.reload();
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(1500);
      check(noteShown && (await pg.locator(noteText).count()) === 0, 'tabs audit U9: Navigate’s web note can be dismissed, and stays dismissed after a reload');

    });
    await step('tabs audit U1, U4, U12 in the ready bar', async () => {
      // tabs audit U1, NR9: Start and the capture stack sit low on the screen and can be tapped.
      const r = await (async () => {
        const vh = pg.viewportSize().height;
        const out = [];
        for (const id of ['moment-photo', 'moment-voice', 'moment-note', 'start']) {
          const b = await pg.locator(`[data-testid=${id}]`).boundingBox();
          const hit = b && await pg.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'), { x: b.x + b.width / 2, y: b.y + b.height / 2 });
          out.push(b && hit === id && b.y > vh * 0.6 ? 'ok' : `${id}:${b && Math.round(b.y)}:${hit}`);
        }
        return out;
      })();
      check(r.every((x) => x === 'ok'), `tabs audit U1: Start and the camera, mic and pencil sit low on the screen and can be tapped (${r.join(', ')})`);
      // NR7: the bar pulls up to every setting in one scroll, and Escape lowers it as it was.
      const restBox = await pg.locator('[data-testid=ready-bar]').boundingBox();
      await drawerTo(pg, 'half');
      check((await pg.locator('[data-testid=start-settings]').count()) === 1 && (await pg.locator('[data-testid=mode-quiet]').isVisible())
        && (await pg.locator('[data-testid=notify-settings]').count()) === 1 && (await pg.locator('[data-testid=kind-churches]').count()) === 0,
        'NR7: the bar pulled up: the mode, the destination, reminders and alerts (no kinds with Quiet)');
      await drawerTo(pg, 'peek');
      check((await pg.locator('[data-testid=start-settings]').count()) === 0 && Math.round((await pg.locator('[data-testid=ready-bar]').boundingBox()).height) === Math.round(restBox.height),
        'NR7: Escape lowers the bar, as it was');
      await drawerTo(pg, 'half');
      // The settings scroll above the bar's Start: the last setting can be brought into view above it.
      {
        await pg.locator('[data-testid=notify-test]').scrollIntoViewIfNeeded();
        await pg.waitForTimeout(300);
        const btn = await pg.locator('[data-testid=notify-test]').boundingBox();
        const foot = await pg.locator('[data-testid=start]').boundingBox();
        check(btn && btn.y + btn.height <= foot.y, `NR7: the settings scroll above Start, never under it (${btn && Math.round(btn.y + btn.height)} ≤ ${Math.round(foot.y)})`);
      }
      // tabs audit U12: no second "Notifications" heading under "Reminders and alerts".
      const heads = await pg.locator('[data-testid=start-settings] [role=heading]').allInnerTexts();
      check(heads.includes('Reminders and alerts') && !heads.includes('Notifications'), `tabs audit U12: Reminders and alerts, with no Notifications heading under it (${heads.join(', ')})`);
      // tabs audit U4: a whole switch row flips its switch, tapped on its words.
      {
        const isOn = () => pg.locator('[data-testid=notify-pause] input').isChecked();
        const before = await isOn();
        await pg.locator('[data-testid=notify-pause]').getByText('Pause reminder', { exact: true }).click();
        await pg.waitForTimeout(300);
        const after = await isOn();
        await pg.locator('[data-testid=notify-pause]').getByText('Pause reminder', { exact: true }).click();
        await pg.waitForTimeout(300);
        check(before === true && after === false && (await isOn()) === true && (await metaOf(pg, 'notify_off')) !== null,
          `tabs audit U4: tapping a switch row's words flips its switch (${before} → ${after})`);
      }
      // tabs audit U4: the range's − and + are 44 pt.
      await pg.locator('[data-testid=mode-explore]').scrollIntoViewIfNeeded();
      await pg.click('[data-testid=mode-explore]');
      await pg.waitForTimeout(400);
      {
        const m = await pg.locator('[data-testid=range-minus]').boundingBox();
        const p = await pg.locator('[data-testid=range-plus]').boundingBox();
        check(m.width >= 44 && m.height >= 44 && p.width >= 44 && p.height >= 44, `tabs audit U4: the range's − and + are at least 44 pt (${m.width}×${m.height}, ${p.width}×${p.height})`);
        const kindRow = pg.locator('[data-testid=kind-public_art]');
        const was = await kindRow.locator('input').isChecked();
        await kindRow.getByText('Public art', { exact: true }).click();
        await pg.waitForTimeout(300);
        const now = await kindRow.locator('input').isChecked();
        await kindRow.getByText('Public art', { exact: true }).click();
        await pg.waitForTimeout(300);
        check(was !== now, 'tabs audit U4: a kind’s row flips its switch, tapped on its name');
      }
      await pg.locator('[data-testid=mode-quiet]').scrollIntoViewIfNeeded();
      await pg.click('[data-testid=mode-quiet]');
      await drawerTo(pg, 'peek');
      check((await metaOf(pg, 'start_mode')) === 'quiet', 'NV22: back to Quiet, saved as it changed');

    });
    // Chronicle with no walks (tabs audit U7): the peek holds the empty line and a way to Navigate.
    const emptyPeek = async (when) => {
      const sheet = await pg.locator('[data-testid=home-sheet]').boundingBox();
      const nav = await pg.locator('[data-testid=sheet-navigate]').boundingBox().catch(() => null);
      const said = (await pg.locator('[data-testid=home-sheet]').innerText()).includes('Walk somewhere and it is starred here');
      check(said && nav && sheet && nav.y >= sheet.y && nav.y + nav.height <= sheet.y + sheet.height + 1 && (await shownCount(pg, '[data-testid=sheet-navigate]')) === 1,
        `tabs audit U7: ${when}, Chronicle's peek says how walks get here and offers Navigate (${said}, ${nav && Math.round(nav.y)})`);
      if (await pg.locator('[data-testid=sheet-navigate]').count()) await pg.click('[data-testid=sheet-navigate]');
      else await tabTo(pg, 'navigate');
      await pg.waitForTimeout(1000);
      // Navigate is the walk screen (NR1, NR2): ready with no walk open, the walk with one.
      check(new URL(pg.url()).pathname === `${BASE}/walk` && (await pg.locator('[data-testid=ready-bar], [data-testid=stop]').count()) === 1,
        `tabs audit U7: ${when}, the peek's Navigate opens Navigate, the walk screen (${new URL(pg.url()).pathname})`);
    };
    await step('tabs audit Chronicle read before the walk', async () => {
      // Chronicle is opened once before any walk: its last read says no walk is open (tabs audit 2).
      await pg.click('[data-testid=ready-close]');
      await pg.waitForTimeout(600);
      await tabTo(pg, 'chronicle');
      await h.mapUp(pg);
      await pg.waitForSelector('[data-testid=home-sheet]');
      await pg.waitForTimeout(800);
      await emptyPeek('with nothing walked');

    });
    await step('tabs audit 3: a memo, then Walk here', async () => {
      // tabs audit 3: a memo recording on Navigate is saved when another tab comes to the front, and
      // Walk here started meanwhile waits for it: never a walk under a recording memo.
      await pg.click('[data-testid=moment-voice]');
      await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 });
      await pg.waitForTimeout(1600);
      // Leaving mid-memo is the chevron now (NR10), back to Chronicle beneath; then Explore.
      await pg.click('[data-testid=ready-close]');
      await pg.waitForTimeout(600);
      await tabTo(pg, 'explore');
      await pg.waitForSelector('[data-testid=atlas-carousel]');
      await pg.waitForTimeout(1500);
      // Explore is the atlas now (AT1): the grid of areas near you, under a small map.
      check((await pg.locator('[data-testid=atlas-carousel]').count()) === 1, 'Explore opens on the row of areas near you (AT1)');
      {
        const box = await pg.locator('canvas.maplibregl-canvas').boundingBox();
        await pg.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 40);
        await pg.mouse.down();
        await pg.waitForTimeout(700);
        await pg.mouse.up();
      }
      {
        // tabs audit U6: What's good here? is the filled button; Walk here the secondary one.
        await pg.waitForSelector('[data-testid=look-here]');
        const bg = (sel) => pg.locator(sel).evaluate((e) => getComputedStyle(e).backgroundColor);
        const look = await bg('[data-testid=look-here]');
        const walkHere = await bg('[data-testid=walk-here]');
        check(look === 'rgb(194, 65, 12)' && walkHere !== look, `tabs audit U6: on Explore's card, What's good here? is primary and Walk here secondary (${look}, ${walkHere})`);
      }
      await pg.click('[data-testid=walk-here]');
      await pg.waitForURL(/\/walk/, { timeout: 15000 });
      await pg.waitForSelector('[data-testid=stop]');
      w = await openWalk(pg);
      const memos = await rows(pg, 'voice');
      check(memos.length === 1 && memos[0].walk_id == null && memos[0].file_path && w,
        `tabs audit 3: leaving Navigate mid-memo saves the memo, and Walk here starts the walk only after (${memos.length} memo)`);

    });
    const north = async (y0, y1) => {
      for (let y = y0; y <= y1 + 1e-9; y += 0.05) {
        const p = at(-0.5, y);
        await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
        await pg.waitForTimeout(1000);
      }
    };
    await north(-0.5, -0.3);

    await step('tabs audit 1: a double tap on the bar', async () => {
      // tabs audit 1: a double tap on the recording bar opens one walk screen, not two.
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-return]', { timeout: 10000 });
      await pg.waitForTimeout(600);
      // Two quick taps, as a thumb gives them: the second lands before the walk screen has taken the bar away.
      {
        const b = await pg.locator('[data-testid=recording-return]').boundingBox();
        const touch = await c.newCDPSession(pg);
        const pt = [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }];
        for (let k = 0; k < 2; k++) {
          await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        }
      }
      await pg.waitForSelector('[data-testid=stop]');
      await pg.waitForTimeout(1500);
      const canvases = await pg.locator('canvas.maplibregl-canvas').count();
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      await pg.waitForTimeout(800);
      check(canvases === 1 && !/\/walk/.test(new URL(pg.url()).pathname) && (await tabBarShown(pg)),
        `tabs audit 1: a double tap on the recording bar opens one walk screen, and one Minimize goes back to the tabs (${canvases} maps)`);

    });
    await step('tabs audit 2: a reminder tapped minimized', async () => {
      // tabs audit 2: a reminder tapped while the walk is minimized opens on the walk, though Chronicle,
      // read before the walk began, is still mounted under the tabs.
      const memAt = at(-0.5, -0.2);
      await pg.evaluate(({ lon, lat }) => new Promise((resolve, reject) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const tx = req.result.transaction(['capture'], 'readwrite');
          tx.objectStore('capture').put({ id: 'audit-old-note', walk_id: 'old-walk', t: Date.now() - 86_400_000, kind: 'text', file_path: null, body: 'Under the arch', segment_id: null, lat, lon });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }), { lon: memAt[0], lat: memAt[1] });
      const tap = { type: 'notice-response', id: 'recall-audit', data: { captureIds: ['audit-old-note'] }, action: null };
      await pg.evaluate((m) => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: m })), tap);
      const onWalk = await pg.waitForURL(/\/walk/, { timeout: 10000 }).then(() => true, () => false);
      const viewers = onWalk ? await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 }).then(() => pg.locator('[data-testid=viewer-close]').count(), () => 0) : 0;
      check(onWalk && viewers === 1, `tabs audit 2: a reminder tapped with the walk minimized opens on the walk, once (${pg.url()}, ${viewers} viewer)`);
      // The walk's viewer offers Open in Maps for a capture with a place (NH6).
      if (viewers) {
        await pg.click('[data-testid=viewer-more]');
        check((await pg.locator('[data-testid=viewer-handoff]').count()) === 1, 'the walk’s viewer has Open in Maps in its More menu (NH6)');
        // The menu's backdrop covers the screen: a tap beside the menu closes it.
        await pg.mouse.click(20, 420);
        await pg.waitForSelector('[data-testid=viewer-menu]', { state: 'detached', timeout: 5000 });
      }
      await pg.click('[data-testid=viewer-close]');
      await pg.waitForTimeout(400);

    });
    await step('NR2: Navigate opens the open walk', async () => {
      // NR2 (it retires U2's live view): with a walk minimized, Navigate opens that walk, recording.
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      const watches0 = await pg.evaluate(() => window.__watchCalls);
      await tabTo(pg, 'navigate');
      await pg.waitForSelector('[data-testid=stop]', { timeout: 10000 });
      await pg.waitForTimeout(1200);
      check((await pg.evaluate(() => window.__watchCalls)) === watches0 && new URL(pg.url()).pathname === `${BASE}/walk` && (await pg.locator('[data-testid=ready-bar]').count()) === 0
        && (await pg.locator('canvas.maplibregl-canvas').count()) === 1,
        'NR2: with a walk open, Navigate opens it on one map, and reads no fix of its own (the recorder already watches)');
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      await pg.waitForTimeout(800);
    });
    await step('tabs audit U7: Chronicle while minimized', async () => {
      await tabTo(pg, 'chronicle');
      await h.mapUp(pg);
      await pg.waitForSelector('[data-testid=home-sheet]');
      await pg.waitForTimeout(1000);
      await emptyPeek('with a walk minimized and none finished');
    });
    await step('NR2: following the walk', async () => {
      // Chronicle's Navigate opened the walk (U7 above): it goes on there, the trace growing to the walker. A route preview left open from
      // an earlier step shows only its routes (fix preview-clutter), so it is closed first: this step is about the trace.
      if (await pg.locator('[data-testid=route-cancel]').count()) {
        await pg.click('[data-testid=route-cancel]');
        await pg.waitForTimeout(500);
      }
      await north(-0.25, 0.25);
      await pg.waitForTimeout(2200);
      const last = at(-0.5, 0.25);
      const end = ((await pg.locator('[data-trace-end]').last().getAttribute('data-trace-end')) || '0,0').split(',').map(Number);
      const off = Math.hypot((end[0] - last[0]) / dLon, (end[1] - last[1]) / dLat) * 100;
      check(off < 20 && (await pg.locator('[data-testid=stop]').count()) === 1 && (await pg.locator('canvas.maplibregl-canvas').count()) === 1,
        `NR2: Navigate's walk shows its growing trace to the walker, on one live map (${off.toFixed(0)} m off)`);
    });
    await step('tabs audit U10: the bar when paused', async () => {
      // tabs audit U10: paused, the bar shows a pause glyph; its way back doesn't read as "expand".
      await pg.click('[data-testid=pause-walk]');
      await pg.waitForSelector('[data-testid=resume-walk]', { timeout: 10000 });
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      await pg.waitForTimeout(600);
      const pausedGlyph = await pg.locator('[data-testid=recording-bar] [data-testid=recording-paused]').innerText().catch(() => '');
      const go = await pg.locator('[data-testid=recording-bar] [data-testid=recording-go]').innerText().catch(() => '');
      const all = await pg.locator('[data-testid=recording-return]').innerText();
      check(pausedGlyph === glyph('pause'), `tabs audit U10: paused, the recording bar shows a pause glyph, not only a grey dot (${iconOf(pausedGlyph)})`);
      check(go && go !== glyph('chevron-up') && !all.includes(glyph('chevron-up')) && (await pg.locator('[data-testid=recording-return]').count()) === 1,
        `tabs audit U10: the bar's way back to the walk isn't an expand chevron (${iconOf(go)})`);
      await pg.click('[data-testid=recording-return]');
      await pg.waitForSelector('[data-testid=resume-walk]', { timeout: 10000 });
      await pg.click('[data-testid=resume-walk]');
      await pg.waitForSelector('[data-testid=pause-walk]', { timeout: 10000 });
      await pg.waitForTimeout(600);
    });
    const holdStop = async () => {
      const b = await pg.locator('[data-testid=stop]').boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      await pg.waitForURL(/replay/, { timeout: 30000 });
      await pg.waitForSelector('[data-testid=skip]', { timeout: 30000 });
      await pg.click('[data-testid=skip]');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      await pg.waitForTimeout(800);
    };
    const walkRow = (id) => pg.evaluate((wid) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('walk', 'readonly').objectStore('walk').get(wid);
        g.onsuccess = () => resolve(g.result ?? null);
      };
    }), id);
    await step('tabs audit U13, U14, audit 6: the first replay', async () => {
      await north(0.3, 0.5);
      await holdStop();
      // tabs audit U13: no big orange count on the card; new streets are a clause in its line.
      const loud = await pg.evaluate(() => [...document.querySelectorAll('div, span')]
        .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const hit = r.width && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return hit && (hit === e || e.contains(hit));
        })
        .filter((e) => { const cs = getComputedStyle(e); return parseFloat(cs.fontSize) >= 28 || cs.color === 'rgb(194, 65, 12)'; })
        .map((e) => e.textContent.trim()));
      const cardText = (await pg.locator('body').innerText()).replace(/\s+/g, ' ');
      check(loud.length === 0 && !/\b\d+ new streets?\b/.test(cardText), `tabs audit U13: the card has no large accent number (${JSON.stringify(loud)})`);
      // tabs audit U14: a quiet Not now beside naming.
      const notNow = await pg.locator('[data-testid=not-now]').count();
      const notNowBg = notNow ? await pg.locator('[data-testid=not-now]').evaluate((e) => getComputedStyle(e).backgroundColor) : '';
      check(notNow === 1 && (await pg.locator('[data-testid=not-now]').innerText()) === 'Not now' && notNowBg !== 'rgb(194, 65, 12)' && (await pg.locator('[data-testid=to-name]').count()) === 1,
        `tabs audit U14: the first replay's card has a quiet Not now, and Name it stays (${notNow}, ${notNowBg})`);
      // tabs audit audit 6: Back from the first replay goes to Chronicle, like Keep it (NV27).
      await pg.goBack();
      await pg.waitForURL((u) => u.pathname === `${BASE}/chronicle`, { timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const path = new URL(pg.url()).pathname;
      check(path === `${BASE}/chronicle` && (await pg.locator('[data-testid=to-name]').count()) === 0 && (await pg.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1,
        `tabs audit audit 6: Back from the first replay goes to Chronicle, not the tab the walk began on (${path})`);
      const row = await walkRow(w.id);
      check(row && !row.open && row.title == null, 'tabs audit audit 6: the walk is kept, unnamed');
      if (path !== `${BASE}/chronicle`) {
        await pg.goto(`${url}chronicle`);
        await h.mapUp(pg);
        await pg.waitForSelector('[data-testid=home-sheet]');
      }
    });
    await step('tabs audit U8, U13, U15: Chronicle after a walk', async () => {
      await h.mapUp(pg);
      await pg.waitForSelector('[data-testid=home-sheet]');
      await pg.waitForTimeout(2500);
      // tabs audit U15: a fit to one short walk stops around z15, not at street-sign zoom.
      const zoom = await pg.evaluate(() => Number(document.querySelector('[data-zoom]')?.getAttribute('data-zoom') ?? NaN));
      check(zoom > 10 && zoom <= 15.05, `tabs audit U15: Chronicle's fit to a single walk caps its zoom at z15 (z${zoom})`);
      // tabs audit U13: the peek has no "N walks · M places".
      const peekText = await pg.locator('[data-testid=sheet-drag]').innerText();
      check(!/\b\d+ (walk|walks|place|places)\b/.test(peekText), `tabs audit U13: Chronicle's peek carries no counts (${JSON.stringify(peekText)})`);
      // tabs audit U8: a Walks | Days switch in the header at every height.
      const both = async (size) => {
        const head = await pg.locator('[data-testid=sheet-drag]').boundingBox();
        const out = [];
        for (const id of ['sheet-walks', 'sheet-days']) {
          const b = await pg.locator(`[data-testid=${id}]`).boundingBox().catch(() => null);
          out.push(b && b.y >= head.y && b.y + b.height <= head.y + head.height + 1 ? 'ok' : `${id}:${b && Math.round(b.y)}`);
        }
        check(out.every((x) => x === 'ok'), `tabs audit U8: at ${size}, the sheet's header has the Walks | Days switch (${out.join(', ')})`);
      };
      await both('peek');
      await drawerTo(pg, 'half', 'sheet-drag');
      await both('half');
      const rowsText = (await pg.locator('[data-testid=walk-row]').allInnerTexts()).join(' | ');
      check(rowsText && !/new streets?/.test(rowsText), `tabs audit U13: the walks list doesn't count new streets (${rowsText.replace(/\s+/g, ' ')})`);
      await drawerTo(pg, 'full', 'sheet-drag');
      await both('full');
      if (await pg.locator('[data-testid=sheet-days]').count()) {
        await h.mapUp(pg);
        await pg.click('[data-testid=sheet-days]');
        await pg.waitForTimeout(500);
        check((await pg.locator('[data-testid=day-row]').count()) >= 1 && (await pg.locator('[data-testid=sheet-walks]').count()) === 1,
          'tabs audit U8: the switch flips the open sheet between walks and days');
      }
      await drawerTo(pg, 'peek');
    });
    await step('tabs audit U14: Not now', async () => {
      // tabs audit U14: Not now keeps the walk unnamed and goes to Chronicle.
      await tabTo(pg, 'navigate');
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(800);
      await pg.click('[data-testid=start]');
      await pg.waitForURL(/\/walk/, { timeout: 15000 });
      await pg.waitForSelector('[data-testid=stop]');
      const second = await openWalk(pg);
      await north(0.5, 0.6);
      await holdStop();
      await pg.click('[data-testid=not-now]');
      await pg.waitForURL((u) => u.pathname === `${BASE}/chronicle`, { timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(1000);
      const row = second && await walkRow(second.id);
      check(new URL(pg.url()).pathname === `${BASE}/chronicle` && (await pg.locator('[data-testid=section-memories][aria-selected=true]').count()) === 1 && row && row.title == null && !row.open,
        `tabs audit U14, RM3: Not now goes to Chronicle's Memories and leaves the walk unnamed (${pg.url()}, ${row && row.title})`);
    });
    await c.close();
}

module.exports = {
  name: 'tabs',
  covers: [
    'src/app/(tabs)/**',
    'src/app/_layout.tsx',
    'src/app/walk.tsx',
    'src/app/replay/**',
    'src/components/{RecordingBar,OpenWalk,HomeSheet,MomentBar,StartSettings}.tsx',
    'src/lib/{walkNav,walkGate,memoGate,recordingBar,startPlan,useStartWalk,launchRoute}.ts',
  ],
  run,
};
