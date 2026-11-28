// A walk left running (specs/forgotten-stop, QE1-QE10; G16, decision 0272): a walk on the street grid, left running, its
// whole past moved 20 hours back in storage, and the page opened again 400 m away the next day. The walk screen's held Stop
// asks whether to end it where it went quiet (End it: the replay's card says the walk's own time, its end mark at the last
// corner, no dotted hop); a second walk, left the same way, is asked on the recording bar's Stop above Chronicle, kept
// whole (Keep it all, as today), then ended where it went quiet from its More (⋯). The paused strip's Resume and Stop at
// 320 px beside a day-long time. E2E_ONLY=quietend runs it alone.

const SHIFT = 20 * 3600_000;

async function run(h) {
  const { url, navUrl, BASE, at, distanceM, check, shot, freshPage, toStop, tabTo, scriptsDir } = h;
  const photoFile = require('path').join(scriptsDir, 'fixtures', 'photo.jpg');
  const { c, pg } = await freshPage('quietend');
  const until = async (ok, ms) => {
    for (const end = Date.now() + ms; Date.now() < end; await pg.waitForTimeout(250)) if (await ok()) return true;
    return false;
  };
  const shots = async (name) => {
    const vp = pg.viewportSize();
    await shot(pg, `${name}-390`);
    await pg.setViewportSize({ width: 320, height: vp.height });
    await pg.waitForTimeout(900);
    await shot(pg, `${name}-320`);
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(400);
  };
  const hold = async (sel) => {
    const box = await pg.locator(sel).filter({ visible: true }).first().boundingBox();
    await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1500);
    await pg.mouse.up();
  };
  const text = async (sel) => ((await pg.locator(sel).filter({ visible: true }).first().textContent({ timeout: 3000 }).catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
  const shown = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  // A walk on the grid's streets: along Transit Street, then up the next cross street; its last corner is where it went quiet.
  const walkOn = async () => {
    for (let k = 0; k < 30; k++) {
      const p = k < 16 ? at(-0.5 + k * 0.06, -0.5) : at(-0.5 + 15 * 0.06, -0.5 + (k - 15) * 0.06);
      await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    return at(-0.5 + 15 * 0.06, -0.5 + 14 * 0.06);
  };
  // Left running: the open walk's start, its readings and its still spells moved 20 hours back.
  const leaveRunning = () => pg.evaluate((shift) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const d = req.result;
      const tx = d.transaction(['walk', 'trace_point', 'still'], 'readwrite');
      const w = tx.objectStore('walk');
      w.getAll().onsuccess = (e) => {
        const open = e.target.result.find((x) => x.open);
        if (!open) return;
        w.put({ ...open, started_at: open.started_at - shift });
        const tp = tx.objectStore('trace_point');
        tp.openCursor().onsuccess = (ev) => {
          const cur = ev.target.result;
          if (!cur) return;
          if (cur.value.walk_id === open.id) cur.update({ ...cur.value, t: cur.value.t - shift });
          cur.continue();
        };
        const st = tx.objectStore('still');
        st.openCursor().onsuccess = (ev) => {
          const cur = ev.target.result;
          if (!cur) return;
          if (cur.value.walk_id === open.id) cur.update({ ...cur.value, started_at: cur.value.started_at - shift, ended_at: cur.value.ended_at == null ? null : cur.value.ended_at - shift });
          cur.continue();
        };
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(`error ${tx.error}`);
    };
    req.onerror = () => resolve('open error');
  }), SHIFT);
  // The next day, home: 400 m from where the walk went quiet, the page opened again, a few readings standing there.
  const home = at(3.5, 2.5);
  const nextDay = async () => {
    await c.setGeolocation({ longitude: home[0], latitude: home[1], accuracy: 12 });
    await pg.reload();
    await pg.waitForTimeout(6000);
    for (let k = 0; k < 8; k++) {
      await c.setGeolocation({ longitude: home[0] + (k % 2) * 0.00002, latitude: home[1], accuracy: 12 });
      await pg.waitForTimeout(1000);
    }
  };
  const toCard = async () => {
    await pg.waitForURL((u) => u.pathname.startsWith(`${BASE}/replay/`), { timeout: 20000 }).catch(() => {});
    await pg.waitForSelector('[data-testid=skip]', { timeout: 20000 }).catch(() => {});
    if (await shown('[data-testid=skip]')) await pg.click('[data-testid=skip]').catch(() => {});
    await pg.waitForSelector('[data-testid=card-line]', { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(4000);
  };
  // The replay card's map: its dotted joins across breaks and its end mark.
  const cardMap = () => pg.evaluate(() => {
    const el = [...document.querySelectorAll('[data-gaplinks]')].find((e) => e.getBoundingClientRect().width > 0);
    return el ? { links: Number(el.getAttribute('data-gaplinks')), ends: el.getAttribute('data-ends') ?? '' } : null;
  });
  const endOf = (ends) => {
    const e = (ends || '').split('|')[1];
    return e ? e.split(',').map(Number) : null;
  };
  const dayLong = (s) => /\b\d+ h\b/.test(s);
  const quietWords = /^This walk went quiet at \d{1,2}:\d{2} [ap]m( yesterday)?\.$/;

  try {
    // 1. A walk, left running, opened the next day at home.
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    const corner = await walkOn();
    check((await leaveRunning()) === true, 'quietend: the walk is moved 20 hours back in storage');
    await nextDay();
    if (await shown('[data-testid=walk-minimize]')) {
      // Reopened on Chronicle with the bar: back into the walk.
      await pg.click('[data-testid=recording-return]').catch(() => {});
    }
    await toStop(pg, 30000);
    await pg.waitForTimeout(1000);

    // QE10: paused beside a day-long time, at 320, Resume's and Stop's words whole.
    await pg.setViewportSize({ width: 320, height: 844 });
    await pg.waitForTimeout(1200);
    const strip = await pg.evaluate(() => {
      const word = (id) => {
        const el = document.querySelector(`[data-testid=${id}]`);
        const t = el && [...el.querySelectorAll('div')].find((d) => /^(Resume|Stop)$/.test((d.textContent || '').trim()) && !d.querySelector('div'));
        return t ? { text: t.textContent.trim(), whole: t.scrollWidth <= t.clientWidth + 1 } : null;
      };
      const stats = document.querySelector('[data-testid=walk-stats]');
      const r = (sel) => document.querySelector(sel)?.getBoundingClientRect();
      // The numbers end before Resume begins: never drawn under it.
      const clear = stats && r('[data-testid=resume-walk]') ? Math.round(r('[data-testid=resume-walk]').left - stats.getBoundingClientRect().right) : null;
      return { stats: (stats?.textContent || '').trim(), resume: word('resume-walk'), stop: word('stop'), clear };
    });
    check(dayLong(strip.stats) && strip.resume?.whole && strip.stop?.whole && strip.resume.text === 'Resume' && strip.clear >= 0,
      `QE10: the paused strip's Resume and Stop stay whole at 320 px beside a day-long time (${JSON.stringify(strip)})`);
    await shot(pg, 'qe-paused-320');
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.waitForTimeout(800);

    // QE3: Stop held asks, and nothing has ended.
    await hold('[data-testid=stop]');
    await until(() => shown('[data-testid=quiet-ask]'), 15000);
    const line = await text('[data-testid=quiet-line]');
    const endLabel = await text('[data-testid=quiet-end]');
    check(quietWords.test(line) && /^End it at \d{1,2}:\d{2} [ap]m$/.test(endLabel) && (await text('[data-testid=quiet-other]')) === 'Keep it all' && new URL(pg.url()).pathname === `${BASE}/walk`,
      `QE3: Stop held on a walk quiet 30 min or more shows the card, its words and both buttons, and the walk is still open ("${line}", "${endLabel}")`);
    // forgotten-stop steward 4: End it is the only filled accent; a tap on the strip closes the card and ends nothing.
    const accents = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=resume-walk], [data-testid=quiet-end]')]
      .map((e) => ({ id: e.getAttribute('data-testid'), bg: getComputedStyle(e).backgroundColor })));
    check(accents.filter((a) => a.bg === 'rgb(194, 65, 12)').map((a) => a.id).join() === 'quiet-end',
      `forgotten-stop steward 4: while the card shows, End it is the screen's only filled accent (${JSON.stringify(accents)})`);
    // forgotten-stop audit 13: the walk screen's card is not modal to a screen reader: the capture stack stays reachable.
    check.todo((await pg.locator('[data-testid=quiet-ask]').getAttribute('aria-modal')) == null,
      'forgotten-stop audit 13: the walk screen\'s quiet ask is not modal to the screen reader, the capture stack reachable');
    await shots('qe-ask');
    await pg.click('[data-testid=resume-walk]');
    await pg.waitForTimeout(800);
    check(!(await shown('[data-testid=quiet-ask]')) && (await shown('[data-testid=resume-walk]')) && new URL(pg.url()).pathname === `${BASE}/walk`,
      'forgotten-stop steward 4: Resume under the ask closes it and ends nothing');
    // forgotten-stop steward 2: with the ask up, the camera opens in one tap.
    await hold('[data-testid=stop]');
    await until(() => shown('[data-testid=quiet-ask]'), 15000);
    const chooser = pg.waitForEvent('filechooser', { timeout: 5000 }).then(() => true, () => false);
    await pg.click('[data-testid=cap-photo]');
    const opened = await chooser;
    await pg.waitForTimeout(600);
    check(opened && !(await shown('[data-testid=quiet-ask]')), `forgotten-stop steward 2: with the ask up, the camera opens in one tap (camera ${opened})`);
    await pg.keyboard.press('Escape').catch(() => {});
    await pg.waitForTimeout(800);

    // QE5: End it: the replay's card says the walk's own time, its end mark at the last corner, no dotted hop.
    await hold('[data-testid=stop]');
    await until(() => shown('[data-testid=quiet-ask]'), 15000);
    await pg.click('[data-testid=quiet-end]');
    await toCard();
    const ended = await text('[data-testid=card-line]');
    const map1 = await cardMap();
    const end1 = endOf(map1?.ends);
    check(!!ended && !dayLong(ended) && map1?.links === 0 && end1 && distanceM(end1, corner) < 30,
      `QE5: End it: the replay's card says the walk's own time ("${ended}"), its end mark where the walking stopped (${end1 ? Math.round(distanceM(end1, corner)) : '?'} m from the last corner), and no dotted hop (${map1?.links})`);
    await shot(pg, 'qe-ended-card');

    // 2. A second walk, left the same way, stopped from the recording bar over Chronicle.
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await walkOn();
    check((await leaveRunning()) === true, 'quietend: the second walk is moved 20 hours back in storage');
    await nextDay();
    if (await shown('[data-testid=walk-minimize]')) await pg.click('[data-testid=walk-minimize]');
    await pg.waitForTimeout(1200);
    await tabTo(pg, 'chronicle', 'memories');
    await pg.waitForSelector('[data-testid=bar-stop]', { timeout: 15000 });
    await hold('[data-testid=bar-stop]');
    await until(() => shown('[data-testid=quiet-ask]'), 15000);
    const barLine = await text('[data-testid=quiet-line]');
    const barBox = await pg.evaluate(() => {
      const a = document.querySelector('[data-testid=quiet-ask]')?.getBoundingClientRect();
      const b = document.querySelector('[data-testid=recording-bar]')?.getBoundingClientRect();
      return a && b ? { askBottom: Math.round(a.bottom), barTop: Math.round(b.top) } : null;
    });
    check(quietWords.test(barLine) && (await text('[data-testid=quiet-other]')) === 'Keep it all' && barBox && barBox.askBottom <= barBox.barTop + 1,
      `QE4: the recording bar's held Stop asks the same, with the same words, above the bar ("${barLine}", ${JSON.stringify(barBox)})`);
    await shots('qe-bar-ask');
    // forgotten-stop audit 14: another tab, or a tap on the page, closes the bar's ask and ends nothing.
    await tabTo(pg, 'explore');
    await pg.waitForTimeout(1500);
    const afterTab = !(await shown('[data-testid=quiet-ask]')) && (await shown('[data-testid=bar-stop]'));
    await tabTo(pg, 'chronicle', 'memories');
    await pg.waitForSelector('[data-testid=bar-stop]', { timeout: 15000 });
    await hold('[data-testid=bar-stop]');
    await until(() => shown('[data-testid=quiet-ask]'), 15000);
    await pg.mouse.click(200, 300);
    await pg.waitForTimeout(800);
    const afterTap = !(await shown('[data-testid=quiet-ask]')) && (await shown('[data-testid=bar-stop]'));
    check.todo(afterTab && afterTap, `forgotten-stop audit 14: with the bar's ask up, another tab or a tap on the page closes it and ends nothing (tab ${afterTab}, tap ${afterTap})`);
    await hold('[data-testid=bar-stop]');
    await until(() => shown('[data-testid=quiet-ask]'), 15000);

    // QE6: Keep it all is today's Stop: the replay with the day-long time.
    await pg.click('[data-testid=quiet-other]');
    await toCard();
    const kept = await text('[data-testid=card-line]');
    check(dayLong(kept), `QE6: Keep it all is today's Stop exactly: the card says the day-long time ("${kept}")`);

    // QE7: its More (⋯) offers the same ask; End it; the row is gone after it.
    await pg.click('[data-testid=card-more]');
    await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 5000 });
    await pg.waitForSelector('[data-testid=action-quiet-end]', { timeout: 8000 }).catch(() => {});
    await pg.waitForTimeout(800);
    const row = await text('[data-testid=action-quiet-end]');
    const order = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=walk-actions] [data-testid^=action-]')].map((e) => e.getAttribute('data-testid')));
    const rowOk = [row.includes('End it where it went quiet'), row.endsWith('what came after it leaves the walk'), order.indexOf('action-quiet-end') === order.indexOf('action-rename') + 1, order.indexOf('action-gps-log') === order.indexOf('action-quiet-end') + 1];
    check(rowOk.every(Boolean),
      `QE7: a kept walk quiet at its end has "End it where it went quiet" in its More, between Rename and Share GPS log ("${row}", ${order.join(' ')})`);
    await shots('qe-more-row');
    const zoomBefore = await pg.evaluate(() => Number([...document.querySelectorAll('[data-zoom]')].find((e) => e.getBoundingClientRect().width > 0)?.getAttribute('data-zoom')));
    await pg.click('[data-testid=action-quiet-end]');
    await pg.waitForSelector('[data-testid=quiet-sheet]', { timeout: 5000 });
    await pg.waitForTimeout(600);
    // forgotten-stop audit 10: in a row, Cancel leads and End it trails, as the sheet's Delete confirm.
    const askOrder = await pg.evaluate(() => ['quiet-other', 'quiet-end'].map((id) => Math.round(document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect().left ?? -1)));
    check.todo(askOrder[0] >= 0 && askOrder[0] < askOrder[1], `forgotten-stop audit 10: the More's ask puts Cancel leading and End it trailing in a row (${askOrder.join(', ')})`);
    check(quietWords.test(await text('[data-testid=quiet-line]')) && (await text('[data-testid=quiet-other]')) === 'Cancel' && /^End it at /.test(await text('[data-testid=quiet-end]')),
      'QE7: the row asks with the same words and buttons, End it and Cancel');
    await shots('qe-more-ask');
    await pg.click('[data-testid=quiet-end]');
    await until(async () => !(await shown('[data-testid=walk-actions]')) && !dayLong(await text('[data-testid=card-line]')), 30000);
    const after = await text('[data-testid=card-line]');
    const map2 = await cardMap();
    check(!dayLong(after) && map2?.links === 0, `QE7: after End it from the More, the card says the walk's own time ("${after}") and no dotted hop (${map2?.links})`);
    await pg.waitForTimeout(2500);
    const zoomAfter = await pg.evaluate(() => Number([...document.querySelectorAll('[data-zoom]')].find((e) => e.getBoundingClientRect().width > 0)?.getAttribute('data-zoom')));
    check.todo(zoomAfter > zoomBefore + 0.3, `forgotten-stop audit 11: after End it from the More, the replay frames the walk up to its new end (zoom ${zoomBefore} to ${zoomAfter})`);
    await shot(pg, 'qe-more-ended-card');
    await pg.click('[data-testid=card-more]');
    await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 5000 });
    await pg.waitForTimeout(1500);
    check(!(await shown('[data-testid=action-quiet-end]')), 'QE7: after it the row is gone');
    await pg.click('[data-testid=actions-cancel]');
    await pg.waitForTimeout(800);

    // QE5: Chronicle's rows say each walk's own time.
    await pg.goto(url);
    await pg.waitForTimeout(3000);
    await tabTo(pg, 'chronicle', 'walks');
    await pg.waitForSelector('[data-testid=walk-row]', { timeout: 15000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    const rows = await pg.locator('[data-testid=walk-row]').allInnerTexts().catch(() => []);
    check(rows.length >= 2 && rows.every((r) => !dayLong(r)), `QE5: Chronicle's rows say the walks' own time (${JSON.stringify(rows.map((r) => r.replace(/\s+/g, ' ')))})`);
    await shot(pg, 'qe-chronicle-rows');

    // 3. A third walk, left the same way: with the bar's ask up, a photo from the page's own line closes the ask, and the
    // photo is the walk's last activity, so the next hold ends it as today, the photo inside it (forgotten-stop audit 5).
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await walkOn();
    check((await leaveRunning()) === true, 'quietend: the third walk is moved 20 hours back in storage');
    await nextDay();
    if (await shown('[data-testid=walk-minimize]')) await pg.click('[data-testid=walk-minimize]');
    await pg.waitForTimeout(1200);
    await tabTo(pg, 'chronicle', 'memories');
    await pg.waitForSelector('[data-testid=bar-stop]', { timeout: 15000 });
    await hold('[data-testid=bar-stop]');
    await until(() => shown('[data-testid=quiet-ask]'), 15000);
    const [chooser3] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.locator('[data-testid=band-photo]').filter({ visible: true }).first().click()]);
    await chooser3.setFiles(photoFile);
    await pg.waitForSelector('[data-testid=media-editor]', { timeout: 15000 }).catch(() => {});
    await pg.click('[data-testid=edit-close]').catch(() => {});
    await pg.waitForTimeout(2000);
    const closedByPhoto = !(await shown('[data-testid=quiet-ask]'));
    await hold('[data-testid=bar-stop]');
    await pg.waitForTimeout(1500);
    const askedAgain = await shown('[data-testid=quiet-ask]');
    await toCard();
    const kept3 = await text('[data-testid=card-kept]');
    check.todo(closedByPhoto && !askedAgain && /photo/i.test(kept3),
      `forgotten-stop audit 5: a photo kept from the page with the bar's ask up closes it; the next hold ends the walk as today, the photo inside it (closed ${closedByPhoto}, asked again ${askedAgain}, "${kept3}")`);
  } finally {
    await c.close();
  }
}

module.exports = {
  name: 'quietend',
  covers: [
    'src/lib/quietEnd/**',
    'src/components/QuietEndAsk.tsx',
    'src/lib/unsaved/stopEnd/**',
    'src/components/WalkActions.tsx',
  ],
  run,
};
