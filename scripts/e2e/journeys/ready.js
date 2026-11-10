// Navigate, ready (NR1-NR13) and its audit (navigate-ready audit 1-12), then the touch drag: three
// flows in fresh browsers, in the order the full flow ran them.

async function run(h) {
  const { url, navUrl, BASE, browser, page, errors, start, at, dLon, check, shot, metricRegion, metaOf, tabTo, tabBarShown, tileRoute, freshPage, openWalk, tiles } = h;
  // Navigate, ready (NR1-NR13): Navigate is the walk screen, ready with no walk open, and Start records
  // in place. In fresh browsers, at 390×844 and at 375×667. E2E_ONLY=ready runs it alone.
  const readyScenario = async () => {
    const boxOf = async (pg, id) => {
      const b = await pg.locator(`[data-testid=${id}]`).filter({ visible: true }).first().boundingBox({ timeout: 3000 }).catch(() => null);
      return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    const same = (a, b, tol = 2) => !!a && !!b && Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol && Math.abs(a.w - b.w) <= tol && Math.abs(a.h - b.h) <= tol;
    const pathOf = (pg) => new URL(pg.url()).pathname;
    const selected = (pg, id) => pg.locator(`[data-testid=tab-${id}][aria-selected=true]`).count().then((n) => n === 1);
    const stats = (pg) => pg.locator('[data-testid=walk-stats]').filter({ visible: true }).first().innerText();
    const rows = (pg) => pg.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
        g.onsuccess = () => resolve(g.result);
      };
    }));
    const { c, pg } = await freshPage('ready');
    // The map's test hooks (`__turn`, for the compass: CP2), defined only when the page is measuring.
    await c.addInitScript(() => { window.__perf = {}; });
    await pg.goto(url);
    await pg.waitForSelector('[data-testid=tab-chronicle][aria-selected=true]');
    await pg.waitForTimeout(1200);
    // NR3 (amended Nov 9, decision 0112): with no walk open the app opens on Chronicle, at `/`.
    check(pathOf(pg) === `${BASE}/` && (await pg.locator('[data-testid=ready-bar]').count()) === 0 && (await tabBarShown(pg)),
      `ready NR3: with no walk open, the app opens on Chronicle (${pathOf(pg)})`);
    // The rest begins on Explore, whose own map the ready screen opens over.
    await pg.click('[data-testid=tab-explore]');
    await pg.waitForSelector('[data-testid=tab-explore][aria-selected=true]');
    await pg.waitForTimeout(1200);
    // NR1: Navigate opens the ready walk screen over it, with no tab bar.
    await pg.click('[data-testid=tab-navigate]');
    await pg.waitForSelector('[data-testid=start]');
    await pg.waitForTimeout(1200);
    check(pathOf(pg) === `${BASE}/walk` && (await pg.locator('[data-testid=ready-bar]').isVisible()) && !(await tabBarShown(pg)),
      `ready NR1: Navigate opens the ready walk screen, with no tab bar (${pathOf(pg)})`);
    const s0 = await stats(pg);
    await pg.waitForTimeout(2500);
    check(/^0:00 · 0(\.0+)? ?(m|km|mi|ft)$/.test(s0) && (await stats(pg)) === s0 && (await pg.locator('[data-testid=stop]').count()) === 0,
      `ready NR1, NR5: at rest the bar reads 0:00 and no distance, and nothing ticks (${s0})`);
    check((await pg.locator('canvas.maplibregl-canvas').count()) === 1 && (await boxOf(pg, 'locate')) !== null,
      'ready NR1, NR12: one map, and Locate');

    // NR9: camera, mic and note stacked at the right edge, Locate above them.
    const cam = await boxOf(pg, 'moment-photo');
    const mic = await boxOf(pg, 'moment-voice');
    const pen = await boxOf(pg, 'moment-note');
    const loc = await boxOf(pg, 'locate');
    const cx = (b) => b.x + b.w / 2;
    check(cam && mic && pen && loc && Math.abs(cx(cam) - cx(mic)) <= 1 && Math.abs(cx(mic) - cx(pen)) <= 1 && Math.abs(cx(loc) - cx(cam)) <= 1
      && pen.y < mic.y && mic.y < cam.y && loc.y + loc.h <= pen.y && cam.x + cam.w >= 390 - 18 && cam.x + cam.w <= 390 - 14,
      `ready NR9: camera, mic and note stacked at the right edge, Locate above (${JSON.stringify({ cam, mic, pen, loc })})`);

    // CP2: turned, the compass takes the slot above Locate in the same column; at north-up it is not drawn.
    {
      const noneBefore = (await boxOf(pg, 'compass')) === null;
      await pg.evaluate(() => window.__turn && window.__turn(45)).catch(() => {});
      await pg.waitForTimeout(500);
      const comp = await boxOf(pg, 'compass');
      const loc2 = await boxOf(pg, 'locate');
      check(noneBefore && comp && loc2 && Math.abs(cx(comp) - cx(loc2)) <= 1 && comp.y + comp.h <= loc2.y && comp.w === 44,
        `ready CP2: turned, the compass sits above Locate in its column, and not at north-up (${JSON.stringify({ noneBefore, comp, loc2 })})`);
      await pg.click('[data-testid=compass]');
      await pg.waitForTimeout(1200);
      check((await boxOf(pg, 'compass')) === null, 'ready CP4: a tap on the compass sends the map back to north and it leaves');
    }

    // NR4: the chevron goes back to the tab beneath, here Explore.
    await pg.click('[data-testid=ready-close]');
    await pg.waitForTimeout(800);
    check(pathOf(pg) === `${BASE}/explore` && (await selected(pg, 'explore')) && (await tabBarShown(pg)), `ready NR4: from Explore the chevron goes back to Explore (${pathOf(pg)})`);
    // NR1 from Chronicle, then NR4 back to it, by the chevron and by the browser's back.
    await tabTo(pg, 'chronicle');
    await pg.waitForTimeout(600);
    await tabTo(pg, 'navigate');
    await pg.waitForSelector('[data-testid=ready-bar]');
    await pg.waitForTimeout(600);
    check(pathOf(pg) === `${BASE}/walk` && !(await tabBarShown(pg)), `ready NR1: from Chronicle, Navigate opens the ready screen (${pathOf(pg)})`);
    await pg.click('[data-testid=ready-close]');
    await pg.waitForTimeout(800);
    const viaChevron = pathOf(pg);
    await tabTo(pg, 'navigate');
    await pg.waitForSelector('[data-testid=ready-bar]');
    await pg.waitForTimeout(600);
    await pg.goBack();
    await pg.waitForTimeout(800);
    check(viaChevron === `${BASE}/` && pathOf(pg) === `${BASE}/` && (await selected(pg, 'chronicle')),
      `ready NR4: the chevron and the browser's back return to Chronicle (${viaChevron}, ${pathOf(pg)})`);

    // NR3: a reload of /walk, or a link to /navigate, opens the ready screen (over Chronicle, since 0112).
    await pg.goto(`${url}walk`);
    await pg.waitForSelector('[data-testid=ready-bar]');
    const onWalk = pathOf(pg);
    await pg.goto(`${url}navigate`);
    await pg.waitForSelector('[data-testid=ready-bar]');
    await pg.waitForTimeout(1500);
    check(onWalk === `${BASE}/walk` && pathOf(pg) === `${BASE}/walk` && (await pg.locator('[data-testid=ready-bar]').isVisible()),
      `ready NR3: a reload of /walk and a link to /navigate open the ready screen (${onWalk}, ${pathOf(pg)})`);

    // NR8: a long press sets the destination, said in one line at rest.
    check((await pg.locator('[data-testid=ready-dest]').count()) === 0, 'ready NR8: with no destination, no line');
    {
      const box = await pg.locator('canvas.maplibregl-canvas').boundingBox();
      await pg.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 3);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
      await pg.waitForSelector('[data-testid=ready-dest]', { timeout: 5000 }).catch(() => {});
    }
    const destText = await pg.locator('[data-testid=ready-dest]').innerText().catch(() => '');
    check(/^To Your spot · \d+ m away$/.test(destText), `ready NR8: a long press puts the destination on the resting bar (${destText})`);

    // NR7: pull the bar up for the settings; Start stays at its foot.
    const startRest = await boxOf(pg, 'start');
    const barRest = await boxOf(pg, 'ready-bar');
    {
      const g = await pg.locator('[data-testid=ready-grip]').boundingBox();
      await pg.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await pg.mouse.down();
      await pg.mouse.move(g.x + g.width / 2, 120, { steps: 8 });
      await pg.mouse.up();
      await pg.waitForTimeout(900);
    }
    const startUp = await boxOf(pg, 'start');
    const barUp = await boxOf(pg, 'ready-bar');
    check((await pg.locator('[data-testid=start-settings]').isVisible()) && (await pg.locator('[data-testid=mode-quiet]').isVisible()) && same(startRest, startUp) && barUp.h > barRest.h + 300,
      `ready NR7: a pull on the grip raises the settings, Start where it was (${JSON.stringify({ startRest, startUp, barRest: barRest.h, barUp: barUp.h })})`);
    await pg.click('[data-testid=mode-explore]');
    await pg.waitForTimeout(600);
    const ring = await pg.locator('[data-ring]').last().getAttribute('data-ring').catch(() => null);
    check(!!ring && ring !== '', `ready NR7: in Explore, the range ring shows while the settings are up (${ring})`);
    await pg.click('[data-testid=dest-clear]');
    await pg.waitForTimeout(300);
    await pg.keyboard.press('Escape');
    await pg.waitForFunction(() => !document.querySelector('[data-testid=start-settings]'), null, { timeout: 4000 }).catch(() => {});
    {
      const left = { settings: await pg.locator('[data-testid=start-settings]').count(), dest: await pg.locator('[data-testid=ready-dest]').count(), bar: await boxOf(pg, 'ready-bar') };
      check(left.settings === 0 && left.dest === 0 && same(left.bar, barRest),
        `ready NR7, NR8: Escape lowers the bar; Clear took the destination line with it (${JSON.stringify(left)})`);
    }
    check((await metaOf(pg, 'start_mode')) === 'explore', 'ready NR7: the mode saved as it changed (NV22)');
    // A tap on the numbers raises it too; back to Quiet for the walk below.
    await pg.click('[data-testid=walk-stats]');
    await pg.waitForTimeout(1200);
    const tapped = await pg.locator('[data-testid=start-settings]').isVisible();
    await pg.click('[data-testid=mode-quiet]');
    await pg.click('[data-testid=ready-grip]');
    await pg.waitForFunction(() => !document.querySelector('[data-testid=start-settings]'), null, { timeout: 4000 }).catch(() => {});
    {
      const left = await pg.locator('[data-testid=start-settings]').count();
      check(tapped && left === 0, `ready NR7: a tap on the bar raises the settings, a tap on the grip lowers them (raised ${tapped}, left ${left})`);
    }

    // NR10: a memo in the stack; Start waits; the chevron saves it.
    await pg.click('[data-testid=moment-voice]');
    await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 });
    await pg.waitForTimeout(1400);
    const save = await boxOf(pg, 'moment-voice-save');
    const discard = await boxOf(pg, 'moment-voice-discard');
    const timer = await boxOf(pg, 'voice-timer');
    check(same(save, mic) && discard && Math.abs(cx(discard) - cx(cam)) <= 1 && Math.abs(discard.y + discard.h / 2 - (cam.y + cam.h / 2)) <= 1
      && timer && timer.x + timer.w <= save.x && (await pg.locator('[data-testid=start][aria-disabled=true]').count()) === 1,
      `ready NR10: Save in the mic's slot, Discard in the camera's, the timer beside, Start disabled (${JSON.stringify({ save, mic, discard, timer })})`);
    const voicesBefore = (await rows(pg)).filter((r) => r.kind === 'voice').length;
    await pg.click('[data-testid=ready-close]');
    await pg.waitForTimeout(1500);
    const voicesAfter = (await rows(pg)).filter((r) => r.kind === 'voice').length;
    check(voicesAfter === voicesBefore + 1 && pathOf(pg) === `${BASE}/`, `ready NR10: the chevron mid-memo closes and keeps the memo (${voicesBefore} → ${voicesAfter})`);
    await tabTo(pg, 'navigate');
    await pg.waitForSelector('[data-testid=ready-bar]');
    await pg.waitForTimeout(1200);

    // A moment before Start (NR9).
    await pg.click('[data-testid=moment-note]');
    await pg.fill('[data-testid=moment-note-input]', 'Before the walk');
    await pg.click('[data-testid=moment-note-save]');
    await pg.waitForTimeout(800);

    // NR5, NR6: Start records in place.
    const before = { cam: await boxOf(pg, 'moment-photo'), mic: await boxOf(pg, 'moment-voice'), pen: await boxOf(pg, 'moment-note'), chev: await boxOf(pg, 'ready-close'), start: await boxOf(pg, 'start'), bar: await boxOf(pg, 'ready-bar'), loc: await boxOf(pg, 'locate') };
    // One screen and one map across Start (the owner, Nov 3): the canvas is marked, and must be the same one after.
    await pg.evaluate(() => { document.querySelector('canvas.maplibregl-canvas').__readyMark = 1; });
    await pg.evaluate(() => { window.__navs = 0; window.addEventListener('popstate', () => window.__navs++); const p = history.pushState; history.pushState = function (...a) { window.__navs++; return p.apply(this, a); }; });
    await pg.click('[data-testid=start]');
    await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 });
    await pg.waitForTimeout(600);
    const after = { cam: await boxOf(pg, 'cap-photo'), mic: await boxOf(pg, 'cap-voice'), pen: await boxOf(pg, 'cap-note'), chev: await boxOf(pg, 'walk-minimize'), stop: await boxOf(pg, 'stop') };
    const notice = (await pg.locator('[data-testid=lift-in]').allInnerTexts()).join(' | ');
    check(pathOf(pg) === `${BASE}/walk` && (await pg.evaluate(() => window.__navs)) === 0 && same(before.cam, after.cam) && same(before.mic, after.mic) && same(before.pen, after.pen) && same(before.chev, after.chev),
      `ready NR6: Start records in place; the stack and the chevron don't move (${JSON.stringify({ before, after })})`);
    // fix minimize-top-align: 4 pt under the safe area top edge (0 in the headless browser), not the old 12.
    check(Math.abs(before.chev.y - 4) <= 1 && Math.abs(after.chev.y - 4) <= 1, `ready fix minimize-top-align: the chevron and Minimize sit 4 pt below the top (${before.chev.y}, ${after.chev.y})`);
    check(Math.abs(before.start.x + before.start.w - (after.stop.x + after.stop.w)) <= 2 && Math.abs(before.start.y + before.start.h / 2 - (after.stop.y + after.stop.h / 2)) <= 2,
      `ready NR5: Start sits in the strip where Stop sits (${JSON.stringify({ start: before.start, stop: after.stop })})`);
    check(/Walk started · recording/.test(notice), `ready NR6: the notice says the walk is recording (${notice})`);
    {
      // banner-spacing: the notice banner, the chevron and the capture stack keep a 16 pt gutter from the screen's edge.
      const vw = pg.viewportSize().width;
      const banner = await boxOf(pg, 'lift-in');
      const gutters = [after.chev.x, vw - (banner.x + banner.w), vw - (after.cam.x + after.cam.w)];
      check(gutters.every((g) => g >= 15.5), `banner-spacing: chevron, banner and capture stack sit 16 pt from the edge (${JSON.stringify(gutters)})`);
      // fix banner-spacing audit 1: nothing is wider than the screen, so nothing is cropped at its edges.
      const over = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(over <= 0, `banner-spacing audit 1: the walk screen has no horizontal overflow (${over} px)`);
    }
    {
      const sameMap = await pg.evaluate(() => { const cs = [...document.querySelectorAll('canvas.maplibregl-canvas')]; return cs.length === 1 && cs[0].__readyMark === 1; });
      check(sameMap, 'ready NR6, navigate-ready audit 2: one screen, one map: the map shown before Start is the same one recording after it, never rebuilt');
    }
    await pg.waitForTimeout(2200);
    check(!/^0:00/.test(await stats(pg)), `ready NR6: the time ticks (${await stats(pg)})`);
    // NR9: a note now belongs to the walk; the one before it is a moment.
    await pg.click('[data-testid=cap-note]');
    await pg.fill('[data-testid=note-input]', 'On the walk');
    await pg.click('[data-testid=note-save]');
    await pg.waitForTimeout(800);
    {
      const w = await openWalk(pg);
      const all = await rows(pg);
      const pre = all.find((r) => r.body === 'Before the walk');
      const on = all.find((r) => r.body === 'On the walk');
      check(!!w && pre && pre.walk_id == null && on && on.walk_id === w.id, `ready NR9: before Start a moment, after it the walk's (${pre?.walk_id}, ${on?.walk_id})`);
    }

    // NR2, NR4: minimize to the tab beneath; Navigate opens that walk again.
    await pg.click('[data-testid=walk-minimize]');
    await pg.waitForTimeout(800);
    const minimizedTo = pathOf(pg);
    const bar = await pg.locator('[data-testid=recording-bar]').count();
    await tabTo(pg, 'navigate');
    await pg.waitForSelector('[data-testid=stop]', { timeout: 10000 });
    await pg.waitForTimeout(600);
    check(minimizedTo === `${BASE}/` && bar === 1 && (await pg.locator('[data-testid=ready-bar]').count()) === 0 && !/^0:00/.test(await stats(pg)),
      `ready NR2, NR4: minimized to Chronicle with the recording bar; Navigate opens that walk (${minimizedTo}, bar ${bar})`);
    check((await pg.locator('canvas.maplibregl-canvas').count()) === 1, 'ready NR12: one map during the walk');
    await c.close();

    // NR11: nothing overlaps on a small phone, ready and walking with every edge button up.
    {
      const small = await browser.newContext({ viewport: { width: 375, height: 667 }, permissions: ['geolocation'], geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 } });
      await metricRegion(small);
      await small.route('https://tiles.openfreemap.org/**', tileRoute);
      const sp = await small.newPage();
      sp.on('pageerror', (e) => errors.push(`ready-small: ${e}`));
      const layout = async (ids) => {
        const boxes = {};
        for (const id of ids) boxes[id] = await boxOf(sp, id);
        const scale = await sp.locator('[data-testid=scale-bar]').first().boundingBox().catch(() => null);
        if (scale) boxes['scale-bar'] = { x: Math.round(scale.x), y: Math.round(scale.y), w: Math.round(scale.width), h: Math.round(scale.height) };
        const bad = [];
        const list = Object.entries(boxes);
        for (const [id, b] of list) {
          if (!b) { bad.push(`${id} missing`); continue; }
          if (b.x < 0 || b.y < 0 || b.x + b.w > 375 || b.y + b.h > 667) bad.push(`${id} off screen`);
          if (id !== 'scale-bar' && (b.w < 44 || b.h < 44)) bad.push(`${id} under 44`);
        }
        for (let i = 0; i < list.length; i++)
          for (let j = i + 1; j < list.length; j++) {
            const [ia, a] = list[i];
            const [ib, b] = list[j];
            if (a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) bad.push(`${ia} × ${ib}`);
          }
        return bad;
      };
      await sp.goto(`${url}navigate`);
      await sp.waitForSelector('[data-testid=start]');
      await sp.waitForTimeout(1500);
      const readyBad = await layout(['ready-close', 'locate', 'moment-photo', 'moment-voice', 'moment-note', 'start']);
      check(readyBad.length === 0, `ready NR11: at 375×667 the ready screen's buttons are on screen, 44 or more, apart (${readyBad.join(', ')})`);
      await sp.click('[data-testid=start]');
      await sp.waitForSelector('[data-testid=stop]', { timeout: 15000 });
      // A first fix for the walk, as the main flow gives it; then 70 m east at a walker's pace so Walk me
      // back shows, then a pan so Recenter does.
      await small.setGeolocation({ longitude: start[0], latitude: start[1] + 0.000002, accuracy: 6 });
      await sp.waitForTimeout(2500);
      for (let i = 1; i <= 14; i++) {
        await small.setGeolocation({ longitude: start[0] + i * 0.05 * dLon, latitude: start[1], accuracy: 6 });
        await sp.waitForTimeout(1000);
      }
      await sp.waitForSelector('[data-testid=walk-back]', { timeout: 10000 }).catch(() => {});
      {
        const box = await sp.locator('canvas.maplibregl-canvas').boundingBox();
        await sp.mouse.move(box.x + 80, box.y + 200);
        await sp.mouse.down();
        await sp.mouse.move(box.x + 160, box.y + 260, { steps: 6 });
        await sp.mouse.up();
        await sp.waitForTimeout(600);
      }
      await shot(sp, 'ready-nr11-walk');
      const walkBad = await layout(['walk-minimize', 'unwalked', 'walk-back', 'recenter', 'cap-photo', 'cap-voice', 'cap-note', 'pause-walk', 'stop']);
      check(walkBad.length === 0, `ready NR11: at 375×667 the walk's buttons, with every edge button up, are on screen, 44 or more, apart (${walkBad.join(', ')}; ${await stats(sp)})`);
      await small.close();
    }

    // NR13: the notices on the ready screen: the web's one-time note, and a denied location's.
    {
      const { c: c2, pg: pg2 } = await freshPage('ready-notes', { permissions: [] });
      await pg2.goto(`${url}navigate`);
      await pg2.waitForSelector('[data-testid=ready-bar]');
      await pg2.waitForTimeout(1200);
      const texts = (await pg2.locator('[data-testid=lift-in]').allInnerTexts()).join(' | ');
      check(/a walk is traced while this page is open/.test(texts), `ready NR13: the web's note shows on the first ready screen (${texts})`);
      await pg2.locator('[data-testid=locate]').filter({ visible: true }).first().click();
      await pg2.waitForTimeout(1500);
      const denied = (await pg2.locator('[data-testid=lift-in]').allInnerTexts()).join(' | ');
      check(/Location permission was denied/.test(denied) && (await pg2.locator('[data-testid=ready-bar]').count()) === 1,
        `ready NR13: a denied location says so on the ready screen (${denied})`);
      // M2 on the ready screen: a moment with no fix is kept and says so.
      await pg2.click('[data-testid=moment-note]');
      await pg2.fill('[data-testid=moment-note-input]', 'No fix here');
      await pg2.click('[data-testid=moment-note-save]');
      check(await pg2.waitForSelector('text=/No location/', { timeout: 20000 }).then(() => true, () => false), 'ready M2: a moment with no fix is kept and says "No location"');
      await c2.close();
    }
  };

  // The Navigate, ready audit (2026-11-03): each accepted finding's regression check, `navigate-ready audit N`.
  // The handle is what a thumb reaches for (the owner, Nov 4: "I cannot lift the drawer"). Chromium sent a touch on
  // the handle's strip to the map's canvas, not the bar, unless the grip is focusable, so a mouse drag passed while
  // a finger's did nothing. This one drags it with touch events, never the mouse.
  const readyTouch = async () => {
    const { c, pg } = await freshPage('ready-touch', { touch: true });
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=ready-bar]', { timeout: 20000 });
    await pg.waitForTimeout(1200);
    const cdp = await c.newCDPSession(pg);
    // A finger's drag from `dy` below the bar's top edge, x at `fx` of its width; true if the settings came up.
    const fingerLift = async (dy, fx) => {
      const b = await pg.locator('[data-testid=ready-bar]').boundingBox();
      const x = b.x + b.width * fx;
      const y = b.y + dy;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 22 }] });
        await pg.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const up = await pg.waitForSelector('[data-testid=start-settings]', { timeout: 4000 }).then(() => true, () => false);
      await pg.keyboard.press('Escape');
      await pg.waitForFunction(() => !document.querySelector('[data-testid=start-settings]'), null, { timeout: 4000 }).catch(() => {});
      await pg.waitForTimeout(500);
      return up;
    };
    // The handle sits 5 px below the edge; a thumb lands anywhere in the 28 px band above the numbers (the old
    // strip was 10 px, and a touch there went to the map).
    const hits = [];
    for (const [dy, fx] of [[5, 0.5], [14, 0.5], [22, 0.5], [5, 0.9], [14, 0.2]]) hits.push(await fingerLift(dy, fx));
    check(hits.every(Boolean), `navigate-ready touch 1: a finger's drag from the handle or the band under it lifts the bar to the walk settings (${hits.join(',')})`);
    // Start, under the band's right end, still starts (a tap, as a thumb makes it).
    const sb = await pg.locator('[data-testid=start]').boundingBox();
    await pg.touchscreen.tap(sb.x + sb.width / 2, sb.y + 6);
    const started = await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 }).then(() => true, () => false);
    check(started, `navigate-ready touch 2: a tap on the top edge of Start still starts the walk (${started})`);
    await c.close();
  };

  const readyAudit = async () => {
    const box = async (pg, id) => {
      const b = await pg.locator(`[data-testid=${id}]`).filter({ visible: true }).first().boundingBox({ timeout: 3000 }).catch(() => null);
      return b && { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const meets = (a, b) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const settled = (pg) => pg.waitForFunction(() => !document.querySelector('[data-testid=start-settings]'), null, { timeout: 4000 }).catch(() => {});
    const raise = async (pg) => {
      const g = await pg.locator('[data-testid=ready-grip]').boundingBox();
      await pg.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
      await pg.mouse.down();
      await pg.mouse.move(g.x + g.width / 2, 120, { steps: 8 });
      await pg.mouse.up();
      await pg.waitForTimeout(1200);
    };
    const { c, pg } = await freshPage('ready-audit', { permissions: ['geolocation', 'microphone'] });
    await c.addInitScript(() => { window.__perf = {}; });
    await pg.goto(`${url}navigate`);
    await pg.waitForSelector('[data-testid=start]');
    await pg.waitForTimeout(1500);

    // audit 1: with the bar up in Explore, the ring is on the map left above the bar, not under it.
    await raise(pg);
    await pg.click('[data-testid=mode-explore]');
    await pg.waitForTimeout(1500);
    {
      const walker = ((await pg.locator('[data-walker]').last().getAttribute('data-walker')) || '').split(',').map(Number);
      const [x, y] = walker.length === 2 ? await pg.evaluate((p) => window.__project(p), walker) : [NaN, NaN];
      const bar = await box(pg, 'ready-bar');
      check(Number.isFinite(y) && bar && y < bar.y && y > 0, `navigate-ready audit 1: with the bar up in Explore, the ring's centre is on the map above the bar (centre y ${Math.round(y)}, bar top ${bar && Math.round(bar.y)})`);
      void x;
    }
    // A range set here is the one the walk's drawer shows after Start, with no reload between (fix walk-drawer-settings audit 1).
    await pg.click('[data-testid=range-plus]');
    await pg.waitForTimeout(300);
    await pg.click('[data-testid=mode-quiet]');
    await pg.keyboard.press('Escape');
    await settled(pg);

    // audit 6: the bar is a button a keyboard reaches; its name carries the numbers and the destination.
    {
      const m = await pg.locator('canvas.maplibregl-canvas').boundingBox();
      await pg.mouse.move(m.x + m.width / 2 - 60, m.y + m.height / 3);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
      await pg.waitForSelector('[data-testid=ready-dest]', { timeout: 5000 }).catch(() => {});
      const summary = pg.locator('[data-testid=ready-summary]');
      const name = (await summary.getAttribute('aria-label', { timeout: 3000 }).catch(() => '')) ?? '';
      await summary.focus({ timeout: 3000 }).catch(() => {});
      await pg.keyboard.press('Enter');
      await pg.waitForTimeout(1200);
      const raised = await pg.locator('[data-testid=start-settings]').isVisible().catch(() => false);
      check(raised && /0:00/.test(name) && /To Your spot/.test(name), `navigate-ready audit 6: Enter on the bar raises the settings, and its name says the numbers and where to (${raised}, "${name}")`);
      if (raised) {
        await pg.click('[data-testid=dest-clear]');
        await pg.keyboard.press('Escape');
        await settled(pg);
      }
    }

    // audit 4: a drag up mid-memo is refused, and the bar is back at rest, never left part-way over Save.
    {
      const rest = await box(pg, 'ready-bar');
      await pg.click('[data-testid=moment-voice]');
      await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 });
      await pg.waitForTimeout(1200);
      await raise(pg);
      const after = await box(pg, 'ready-bar');
      check(rest && after && Math.abs(after.h - rest.h) <= 1 && (await pg.locator('[data-testid=moment-voice-save]').isVisible()),
        `navigate-ready audit 4: a drag up mid-memo leaves the bar at rest, Save uncovered (${rest && Math.round(rest.h)} → ${after && Math.round(after.h)})`);
      await pg.click('[data-testid=moment-voice-save]');
      await pg.waitForTimeout(800);
    }

    // audit 5: the walk's options card leaves the stack's column free.
    await pg.click('[data-testid=start]');
    await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 });
    await pg.waitForTimeout(800);
    // The options are the walk strip's drawer (no button): pulled up, it is the settings, not a card among the stack.
    await pg.click('[data-testid=walk-summary]');
    await pg.waitForSelector('[data-testid=options-card]');
    {
      // fix walk-drawer-settings audit 1: the range set on the ready bar shows in the walk's drawer, no reload between.
      await pg.click('[data-testid=explore-walk]');
      await pg.waitForSelector('[data-testid=range-slider]');
      const shown = await pg.locator('[data-testid=range-value]').innerText();
      check(shown === '120 m', `fix walk-drawer-settings audit 1: the range set on the ready bar (120 m) is the walk drawer's (${shown})`);
      await pg.click('[data-testid=range-minus]');
      await pg.waitForTimeout(300);
      await pg.click('[data-testid=explore-walk]');
    }
    await pg.click('[data-testid=walk-summary]');
    await pg.waitForTimeout(600);

    // audit 11: a pill (a memo discarded, with Undo) clears the scale bar at 375 wide.
    {
      await pg.setViewportSize({ width: 375, height: 667 });
      await pg.waitForTimeout(800);
      await pg.click('[data-testid=cap-voice]');
      await pg.waitForSelector('[data-testid=voice-save]', { timeout: 10000 });
      await pg.waitForTimeout(1200);
      await pg.click('[data-testid=voice-discard]');
      await pg.waitForSelector('[data-testid=voice-undo]', { timeout: 5000 });
      const scale = await pg.locator('[data-testid=scale-bar]').last().boundingBox().catch(() => null);
      const pill = await pg.locator('[data-testid=voice-undo]').evaluate((e) => { const r = e.parentElement.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      check(scale && !meets(pill, { x: scale.x, y: scale.y, w: scale.width, h: scale.height }) && pill.x >= 0,
        `navigate-ready audit 11: at 375 wide a pill clears the scale bar and the screen's edge (${JSON.stringify({ pill, scale })})`);
      await pg.click('[data-testid=voice-undo]').catch(() => {});
      await pg.setViewportSize({ width: 390, height: 844 });
    }
    await c.close();

    // audit 7: from a link to /navigate, the chevron then the browser's back never reopens Navigate.
    {
      const { c: c2, pg: pg2 } = await freshPage('ready-audit-back');
      await pg2.goto(`${url}navigate`);
      await pg2.waitForSelector('[data-testid=ready-bar]');
      await pg2.waitForTimeout(1200);
      await pg2.click('[data-testid=ready-close]');
      await pg2.waitForTimeout(800);
      await pg2.goBack().catch(() => {});
      await pg2.waitForTimeout(1500);
      const reopened = await pg2.locator('[data-testid=ready-bar]').count();
      check(reopened === 0, `navigate-ready audit 7: from a link to /navigate, the chevron then Back doesn't reopen Navigate (${new URL(pg2.url()).pathname}, ${reopened})`);
      await c2.close();
    }
  };

  await readyScenario();
  await readyAudit();
  await readyTouch();
}

module.exports = {
  name: 'ready',
  covers: [
    'src/app/walk.tsx',
    'src/app/(tabs)/{_layout,navigate}.tsx',
    'src/components/walk/**',
    'src/components/{MomentBar,StartSettings,LocateButton,CompassButton}.tsx',
    'src/lib/{readyNav,walkNav,walkGate,useStartWalk}.ts',
    'src/lib/discovery/recallCheck.ts',
  ],
  run,
};
