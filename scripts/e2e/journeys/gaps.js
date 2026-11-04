// Filling gaps (G5, G6, G9, G10, G12): a walk whose GPS was out twice, written into storage
// with past times (a real gap would take minutes), then reloaded. Along Thayer Street, with
// nowhere else to have been, the gap fills by itself; along Transit Street in a grid, slowly,
// it is offered faint until kept. E2E_ONLY=gaps runs it alone.

async function run(h) {
  const { navUrl, BASE, start, at, check, metaOf, freshPage, openWalk, tiles } = h;
    const { c, pg } = await freshPage('gaps');
    await c.addInitScript(() => { window.__perf = {}; });
    const here = at(3.0, -0.5);
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    for (let k = 0; k < 3; k++) {
      await c.setGeolocation({ longitude: here[0], latitude: here[1] + k * 0.000001, accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    for (let k = 0; k < 15 && !(await metaOf(pg, 'tile_url')); k++) await pg.waitForTimeout(1000);
    const walk = await openWalk(pg);
    const now = Date.now();
    const min = 60_000;
    // Fixes along a line at 1.4 m/s, one every 5 s, from t0.
    const along = (from, to, t0) => {
      const pts = [];
      const d = Math.hypot((to[0] - from[0]) * 100, (to[1] - from[1]) * 100);
      const n = Math.max(1, Math.round(d / 7));
      for (let k = 0; k <= n; k++) {
        const p = at(from[0] + ((to[0] - from[0]) * k) / n, from[1] + ((to[1] - from[1]) * k) / n);
        pts.push({ walk_id: walk.id, t: t0 + k * 5000, lon: p[0], lat: p[1], accuracy_m: 6, speed: 1.4, course: null });
      }
      return pts;
    };
    const points = [
      // Thayer Street north, then 5 min out over 400 m, then on: nowhere else to have been (G5).
      ...along([11, -2.9], [11, -1.9], now - 70 * min),
      ...along([11, 2.1], [11, 2.9], now - 63 * min),
      // 35 min later: Transit Street east, then 10 min out over 340 m, time to go round a block (G6).
      ...along([-1.9, -0.5], [-1.2, -0.5], now - 27 * min),
      ...along([2.2, -0.5], [3.0, -0.5], now - 16 * min),
    ];
    await pg.evaluate(([id, startedAt, pts]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['walk', 'trace_point'], 'readwrite');
        const w = tx.objectStore('walk').get(id);
        w.onsuccess = () => tx.objectStore('walk').put({ ...w.result, started_at: startedAt });
        for (const p of pts) tx.objectStore('trace_point').add(p);
        tx.oncomplete = () => resolve(true);
      };
    }), [walk.id, now - 70 * min - 1000, points]);
    await pg.reload();
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
    const mapState = () => pg.locator('[data-faint]').last().evaluate((e) => ({ runs: Number(e.dataset.runs), faint: Number(e.dataset.faint), links: Number(e.dataset.gaplinks ?? -1), drawing: Number(e.dataset.drawing ?? -1), center: e.dataset.center ?? '' }));
    let st = await mapState();
    for (let k = 0; k < 20 && !(st.faint === 1 && st.runs === 3); k++) {
      await pg.waitForTimeout(1000);
      st = await mapState();
    }
    // Without filling there would be five lines (Thayer's two halves, Transit's two, and the fixes
    // here now, 15 min after the last). Thayer's gap joins its line, the 15 min standing here is
    // joined straight (every break is a gap, Nov 3), and Transit's is faint.
    check(st.runs === 3, `gaps: a gap along a street with nowhere else to go fills by itself, one line (G5: ${JSON.stringify(st)})`);
    check(st.faint === 1, `gaps: a gap with time to go round a block is offered faint (G6: ${JSON.stringify(st)})`);
    const km = (t) => { const m = /([\d.]+) (k?m)\b/.exec(t); return m ? Number(m[1]) * (m[2] === 'km' ? 1000 : 1) : NaN; };
    const before = km(await pg.locator('[data-testid=walk-stats]').innerText());
    // A tap on the faint stretch opens its card (G9).
    await pg.waitForFunction(() => typeof window.__project === 'function');
    const tap = async (p) => {
      const [x, y] = await pg.evaluate((q) => window.__project(q), p);
      await pg.mouse.click(x, y);
      await pg.waitForTimeout(900);
    };
    // Away from the line's ends, which are the recorded trace's (audit 8).
    await tap(at(1.6, -0.5));
    const title = await pg.locator('[data-testid=gap-title]').innerText().catch(() => '');
    check(title === 'Probably along Transit Street' && (await pg.locator('[data-testid=gap-keep]').count()) === 1,
      `gaps: tapping the faint stretch opens its card, with Keep (G9: "${title}")`);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(400);
    check((await pg.locator('[data-testid=gap-card]').count()) === 0, 'gaps: Escape closes the card (G9)');
    // Another card in the slot closes it for good, rather than hiding it to come back (gaps audit 7).
    await tap(at(1.6, -0.5));
    await pg.click('[data-testid=walk-summary]');
    await pg.waitForTimeout(400);
    const underOptions = await pg.locator('[data-testid=gap-card]').count();
    await pg.click('[data-testid=walk-summary]');
    await pg.waitForTimeout(400);
    check(underOptions === 0 && (await pg.locator('[data-testid=gap-card]').count()) === 0, `gaps audit 7: the walk's options close the stretch's card, and it doesn't come back (${underOptions})`);
    // Drawing on the walk screen (GW1, GW8): the card offers Draw my way; drawing hides the capture
    // row and stops following, so a new fix doesn't move the map; Cancel leaves the gap as it was.
    await tap(at(1.6, -0.5));
    check((await pg.locator('[data-testid=gap-draw]').count()) === 1, 'GW1: an offered stretch\'s card has Draw my way');
    await pg.click('[data-testid=gap-draw]').catch(() => {});
    await pg.waitForSelector('[data-testid=gap-draw-bar]', { timeout: 5000 }).catch(() => {});
    const centerBefore = (await mapState()).center;
    await c.setGeolocation({ longitude: here[0] + 0.0004, latitude: here[1], accuracy: 6 });
    await pg.waitForTimeout(2500);
    const drawingNow = await mapState();
    check((await pg.locator('[data-testid=gap-draw-bar]').count()) === 1 && !(await pg.locator('[data-testid=cap-photo]').isVisible().catch(() => false)) && drawingNow.center === centerBefore,
      `GW8: drawing on the walk screen hides the capture row and a new fix doesn't move the map (${centerBefore} → ${drawingNow.center})`);
    await pg.click('[data-testid=gap-draw-cancel]').catch(() => {});
    await pg.waitForTimeout(600);
    const afterCancel = await mapState();
    check((await pg.locator('[data-testid=gap-draw-bar]').count()) === 0 && afterCancel.faint === 1 && afterCancel.drawing === 0, `GW4: Cancel leaves the gap as it was (${JSON.stringify(afterCancel)})`);
    await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
    await pg.waitForTimeout(1500);
    await tap(at(1.6, -0.5));
    await pg.click('[data-testid=gap-keep]');
    for (let k = 0; k < 10 && (st = await mapState()).runs !== 2; k++) await pg.waitForTimeout(500);
    await pg.waitForTimeout(2500);
    const after = km(await pg.locator('[data-testid=walk-stats]').innerText());
    check(st.runs === 2 && st.faint === 0, `gaps: Keep draws it solid, joined to the trace (G10: ${JSON.stringify(st)})`);
    check(after - before > 250 && after - before < 450, `gaps: a kept stretch counts as walked distance (G11: ${before} m → ${after} m)`);
    const rows = () => pg.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('gap_fill', 'readonly').objectStore('gap_fill').getAll();
        g.onsuccess = () => resolve(g.result.map((r) => `${r.state}:${r.street}`));
      };
    }));
    check(JSON.stringify(await rows()) === '["kept:Transit Street"]', `gaps: Keep is stored with the walk (G10: ${JSON.stringify(await rows())})`);
    // On the replay, the filled stretch along Thayer has its own card; Not this way breaks the line again (G9, G10, G12).
    const b = await pg.locator('[data-testid=stop]').boundingBox();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1100);
    await pg.mouse.up();
    await pg.waitForURL(/replay/, { timeout: 30000 });
    await pg.waitForSelector('[data-testid=skip]', { timeout: 60000 });
    await pg.click('[data-testid=skip]');
    await pg.waitForSelector('[data-testid=to-name], [data-testid=done]', { timeout: 30000 });
    await pg.waitForTimeout(1500);
    const firstCard = await mapState();
    // A later session: nothing inferred is remembered, and the filled stretch must still be there (gaps audit 2).
    await pg.reload();
    await pg.waitForSelector('[data-testid=skip], [data-testid=to-name], [data-testid=done]', { timeout: 60000 });
    if (await pg.locator('[data-testid=skip]').count()) await pg.click('[data-testid=skip]');
    await pg.waitForSelector('[data-testid=to-name], [data-testid=done]', { timeout: 30000 });
    let onCard = await mapState();
    for (let k = 0; k < 20 && onCard.runs !== firstCard.runs; k++) {
      await pg.waitForTimeout(500);
      onCard = await mapState();
    }
    check(onCard.runs === firstCard.runs, `gaps audit 2: after a reload, the replay still fills its gaps (${firstCard.runs} → ${onCard.runs})`);
    await pg.waitForFunction(() => typeof window.__project === 'function');
    check(onCard.faint === 0, `gaps: the replay draws no faint stretch once kept (${JSON.stringify(onCard)})`);
    await tap(at(11, 0.6));
    const filled = await pg.locator('[data-testid=gap-title]').innerText().catch(() => '');
    check(filled === 'Filled in along Thayer Street' && (await pg.locator('[data-testid=gap-keep]').count()) === 0,
      `gaps: on the replay, a stretch filled by itself has a card with Not this way only (G9, G12: "${filled}")`);
    if (filled) {
      await pg.click('[data-testid=gap-dismiss]');
      let r = await mapState();
      for (let k = 0; k < 30 && r.runs <= onCard.runs; k++) {
        await pg.waitForTimeout(500);
        r = await mapState();
      }
      check(r.runs === onCard.runs + 1, `gaps: Not this way breaks the line again on the replay (G10, G12: ${onCard.runs} → ${r.runs})`);
      const stored = await rows();
      check(stored.includes('dismissed:Thayer Street'), `gaps: Not this way is stored too (G10: ${JSON.stringify(stored)})`);
      // A dismissed gap is joined by a dotted line; tapping it opens its card, and its way can be drawn (GW1-GW5, GW7).
      let dotted = await mapState();
      for (let k = 0; k < 10 && dotted.links !== 1; k++) {
        await pg.waitForTimeout(500);
        dotted = await mapState();
      }
      check(dotted.links === 1, `GW2: a dismissed gap is joined by a dotted line (${JSON.stringify(dotted)})`);
      await tap(at(11, 0.6));
      const empty = await pg.locator('[data-testid=gap-title]').innerText().catch(() => '');
      check(/^Not recorded for \d+ min$/.test(empty) && (await pg.locator('[data-testid=gap-draw]').count()) === 1 && (await pg.locator('[data-testid=gap-keep]').count()) === 0,
        `GW1, GW2: tapping the dotted line opens its card, with Draw my way ("${empty}")`);
      // Paths slow to come: Done waits for them, and says so (gap-drawing audit 4).
      tiles.delayMs = 4000;
      await pg.click('[data-testid=gap-draw]').catch(() => {});
      await pg.waitForSelector('[data-testid=gap-draw-bar]', { timeout: 5000 }).catch(() => {});
      const waiting = await pg.locator('[data-testid=gap-draw-bar]').innerText().catch(() => '');
      const doneOff = await pg.locator('[data-testid=gap-draw-done]').evaluate((e) => e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('disabled')).catch(() => false);
      check(/Reading the paths/.test(waiting) && doneOff, `gap-drawing audit 4: Done waits for the paths ("${waiting.replace(/\n/g, ' · ')}", disabled ${doneOff})`);
      tiles.delayMs = 0;
      await pg.waitForFunction(() => !/Reading the paths/.test(document.querySelector('[data-testid=gap-draw-bar]')?.innerText ?? ''), null, { timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(500);
      const startPts = (await mapState()).drawing;
      // Two taps along Thayer Street; Undo takes the second away; tap it again.
      await tap(at(11, -0.8));
      await tap(at(11, 1.2));
      const two = (await mapState()).drawing;
      await pg.click('[data-testid=gap-draw-undo]').catch(() => {});
      await pg.waitForTimeout(500);
      const undone = (await mapState()).drawing;
      check(startPts >= 1 && two > undone && undone > startPts, `GW3, GW4: taps grow the line along the street, and Undo takes the last away (${startPts} → ${two} → ${undone} points)`);
      await tap(at(11, 1.2));
      const barText = await pg.locator('[data-testid=gap-draw-bar]').innerText().catch(() => '');
      check(!/couldn.t be read/i.test(barText), `GW7: the paths around the taps were read ("${barText.replace(/\n/g, ' · ')}")`);
      await pg.click('[data-testid=gap-draw-done]').catch(() => {});
      let drawn = await mapState();
      for (let k = 0; k < 30 && drawn.runs !== onCard.runs; k++) {
        await pg.waitForTimeout(500);
        drawn = await mapState();
      }
      const keptNow = await rows();
      check(drawn.runs === onCard.runs && drawn.links === 0 && drawn.drawing === 0 && keptNow.filter((x) => x.startsWith('kept')).length === 2,
        `GW5: Done keeps the drawn way: one line again, no dotted join (${JSON.stringify(drawn)}, ${JSON.stringify(keptNow)})`);
    }
    await c.close();
}

module.exports = {
  name: 'gaps',
  covers: [
    'src/lib/gaps/**',
    'src/components/{GapCard,GapDraw}.tsx',
    'src/app/replay/**',
    'src/app/walk.tsx',
  ],
  run,
};
