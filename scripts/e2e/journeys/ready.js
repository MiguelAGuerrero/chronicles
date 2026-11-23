// Navigate, ready (NR1-NR13) and its audit (navigate-ready audit 1-12), then the touch drag: three
// flows in fresh browsers, in the order the full flow ran them.

const path = require('path');

async function run(h) {
  const { url, navUrl, BASE, browser, page, errors, start, at, dLon, check, shot, metricRegion, metaOf, tabTo, tabBarShown, tileRoute, freshPage, openWalk, tiles, toStop, scriptsDir } = h;
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
        const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
        g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })));
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
    check(/^0:00 · 0(\.0+)?[ \u00a0]?(m|km|mi|ft)$/.test(s0) && (await stats(pg)) === s0 && (await pg.locator('[data-testid=stop]').count()) === 0,
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
    check(/^To Your spot · \d+[ \u00a0]m away$/.test(destText), `ready NR8: a long press puts the destination on the resting bar (${destText})`);

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
    check((await pg.locator('[data-testid=start-settings]').isVisible()) && same(startRest, startUp) && barUp.h > barRest.h + 300,
      `ready NR7: a pull on the grip raises the settings, Start where it was (${JSON.stringify({ startRest, startUp, barRest: barRest.h, barUp: barUp.h })})`);
    // Places is on by default on the ready map (decision 0234): the ring shows with no mode to pick.
    // tend walk-screen 10 (the sweep's auditor 1, ux 1; PL12, WCAG 2.4.6), kept as it still holds: the settings' "On the map"
    // heading is only ever over its rows. With Places on (listed on every map since MD13) the key is there, under the heading.
    {
      const settingsText = await pg.locator('[data-testid=start-settings]').innerText();
      const heading = /On the map/.test(settingsText);
      const rows = await pg.locator('[data-testid=start-settings] [data-testid=layers-key]').count();
      check(heading === (rows === 1) && rows === 1,
        `tend walk-screen 10, MD13: the ready bar's "On the map" heads the key that lists Places, never an empty one (${JSON.stringify({ heading, rows })})`);
    }
    await pg.waitForTimeout(600);
    // tend walk-screen audit 15 (the diff review's ux 6): Explore's block of the settings pictured, the range and "Passing a
    // place" in view.
    await pg.locator('[data-testid=start-settings] [data-testid=range-slider]').last().scrollIntoViewIfNeeded().catch(() => {});
    await pg.waitForTimeout(300);
    await shot(pg, 'ready-settings-explore');
    const ring = await pg.locator('[data-ring]').last().getAttribute('data-ring').catch(() => null);
    check(!!ring && ring !== '', `ready NR7: with Places on, the range ring shows while the settings are up (${ring})`);
    await pg.click('[data-testid=dest-clear]');
    await pg.waitForTimeout(300);
    await pg.keyboard.press('Escape');
    await pg.waitForFunction(() => !document.querySelector('[data-testid=start-settings]'), null, { timeout: 4000 }).catch(() => {});
    {
      const left = { settings: await pg.locator('[data-testid=start-settings]').count(), dest: await pg.locator('[data-testid=ready-dest]').count(), bar: await boxOf(pg, 'ready-bar') };
      check(left.settings === 0 && left.dest === 0 && same(left.bar, barRest),
        `ready NR7, NR8: Escape lowers the bar; Clear took the destination line with it (${JSON.stringify(left)})`);
    }
    check(!(await metaOf(pg, 'start_mode')), 'ready NR7: no mode is kept (decision 0234)');
    // A tap on the numbers raises it too.
    await pg.click('[data-testid=walk-stats]');
    await pg.waitForTimeout(1200);
    const tapped = await pg.locator('[data-testid=start-settings]').isVisible();
    await pg.click('[data-testid=ready-grip]');
    await pg.waitForFunction(() => !document.querySelector('[data-testid=start-settings]'), null, { timeout: 4000 }).catch(() => {});
    {
      const left = await pg.locator('[data-testid=start-settings]').count();
      check(tapped && left === 0, `ready NR7: a tap on the bar raises the settings, a tap on the grip lowers them (raised ${tapped}, left ${left})`);
    }

    // NR10 as T44 amends it (decision 0233, "Camera stays"): a memo in the stack; Start waits; the chevron saves it.
    await pg.click('[data-testid=moment-voice]');
    await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 });
    await pg.waitForTimeout(1400);
    const save = await boxOf(pg, 'moment-voice-save');
    const discard = await boxOf(pg, 'moment-voice-discard');
    const timer = await boxOf(pg, 'voice-timer');
    const camMid = await boxOf(pg, 'moment-photo');
    const midY = (b) => b.y + b.h / 2;
    // The camera keeps its slot and its name says where its photo goes; Discard, then the timer, sit beside Save, left of
    // the stack, on Save's line; the note's slot is empty.
    const memoRow = (s, d, t, c) => !!s && !!d && !!t && !!c && same(c, cam) && d.x + d.w <= t.x && t.x + t.w <= s.x
      && Math.abs(midY(d) - midY(s)) <= 1 && Math.abs(midY(t) - midY(s)) <= 1 && d.w >= 44 && d.h >= 44;
    check(same(save, mic) && memoRow(save, discard, timer, camMid)
      && (await pg.locator('[data-testid=moment-photo][aria-label="Add a photo to this memo"]').count()) === 1
      && !(await boxOf(pg, 'moment-note')) && (await pg.locator('[data-testid=start][aria-disabled=true]').count()) === 1,
      `ready NR10, tend walk-screen T44: Save in the mic's slot, the camera in its own, Discard and the timer beside Save, Start disabled (${JSON.stringify({ save, mic, camMid, cam, discard, timer })})`);
    await shot(pg, 'ws-t44-memo-390');
    // At 320 px the row still fits left of the stack, whole.
    {
      const was = pg.viewportSize();
      await pg.setViewportSize({ width: 320, height: was.height });
      await pg.waitForTimeout(600);
      const s320 = await boxOf(pg, 'moment-voice-save');
      const d320 = await boxOf(pg, 'moment-voice-discard');
      const t320 = await boxOf(pg, 'voice-timer');
      const c320 = await boxOf(pg, 'moment-photo');
      const m320 = await boxOf(pg, 'moment-voice-save');
      const whole = await pg.evaluate(() => {
        const t = document.querySelector('[data-testid=voice-timer]');
        return !!t && t.scrollWidth <= t.clientWidth + 1 && [...t.querySelectorAll('div')].every((e) => e.scrollWidth <= e.clientWidth + 1);
      });
      await shot(pg, 'ws-t44-memo-320');
      await pg.setViewportSize(was);
      await pg.waitForTimeout(600);
      check(!!d320 && !!t320 && !!c320 && !!m320 && d320.x >= 16 && d320.x + d320.w <= t320.x && t320.x + t320.w <= s320.x && c320.x + c320.w <= 320 - 14 && whole,
        `tend walk-screen T44: at 320 px Discard and the timer fit whole left of the stack (${JSON.stringify({ d320, t320, s320, c320, whole })})`);
    }
    // A photo mid-memo goes with the memo: kept as the moment, and the memo, saved after, joins it (MS2's `into`).
    {
      const momentsBefore = (await rows(pg)).length;
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=moment-photo]')]);
      // A photo only: a video would want the microphone the memo holds.
      const accepts = chooser.element ? await chooser.element().getAttribute('accept').catch(() => null) : null;
      await chooser.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
      // tend walk-screen audit 20 (the owner's "Editor waits", decision 0261): while the memo records, no editor opens
      // after the photo; Save and Discard stay one tap away. Once the memo is saved, the editor opens on that photo.
      // tend walk-screen audit 25 (T44's review, auditor 8): measured as soon as the photo's moment is placed, which is
      // when its toast is set (MomentBar's `onMoment`), so the check meets the toast while it would show.
      const placed = await pg.waitForFunction(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
          g.onsuccess = () => resolve(g.result.some((m) => m.pieces.some((x) => x.kind === 'photo') && m.lat != null));
        };
      }), null, { timeout: 30000, polling: 100 }).then(() => true, () => false);
      await pg.waitForTimeout(400);
      const rowClear = await pg.evaluate(() => {
        const r = (id) => document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect();
        const toast = r('moment-toast');
        const row = [r('moment-voice-discard'), r('voice-timer')];
        const over = (a, b) => !!a && !!b && a.width > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return !row.some((b) => over(toast, b));
      });
      check(placed && rowClear, `tend walk-screen audit 25: mid-memo, once the photo is placed and its toast set, the toast never stands over Discard and the timer (${JSON.stringify({ placed, rowClear })})`);
      await pg.waitForTimeout(1100);
      const editorMid = await pg.locator('[data-testid=media-editor]').count();
      const saveMid = await boxOf(pg, 'moment-voice-save');
      const discardMid = await boxOf(pg, 'moment-voice-discard');
      await shot(pg, 'ws-t44-after-photo-390');
      const stillRecording = (await pg.locator('[data-testid=moment-voice-save]').count()) === 1;
      await pg.click('[data-testid=moment-voice-save]');
      await pg.waitForSelector('[data-testid=moment-voice]', { timeout: 10000 });
      const editorAfter = await pg.waitForSelector('[data-testid=media-editor]', { timeout: 10000 }).then(() => true, () => false);
      const editorSays = editorAfter ? await pg.locator('[data-testid=media-editor]').innerText().catch(() => '') : '';
      await pg.waitForTimeout(800);
      await shot(pg, 'ws-t44-editor-after-save-390');
      await pg.click('[data-testid=edit-close]').catch(() => {});
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
      check(editorMid === 0 && !!saveMid && !!discardMid && editorAfter && /Photo kept/.test(editorSays),
        `tend walk-screen audit 20: mid-memo, after a photo, no editor opens and Save and Discard are one tap away; after Save the editor opens on the photo (${JSON.stringify({ editorMid, saveMid, discardMid, editorAfter })})`);
      await pg.waitForTimeout(1500);
      const joined = await pg.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
          g.onsuccess = () => resolve(g.result.filter((m) => m.pieces.some((p) => p.kind === 'photo') && m.pieces.some((p) => p.kind === 'voice'))
            .map((m) => ({ id: m.id, kinds: m.pieces.map((p) => p.kind), face: m.pieces.find((p) => p.id === m.id)?.kind })));
        };
      }));
      const momentsAfter = (await rows(pg)).length;
      check(stillRecording && joined.length === 1 && joined[0].kinds.length === 2 && joined[0].face === 'photo' && momentsAfter === momentsBefore + 1
        && !/video/.test(accepts ?? ''),
        `tend walk-screen T44: a photo taken mid-memo is kept as one moment with the memo saved after it (${JSON.stringify({ stillRecording, joined, momentsBefore, momentsAfter, accepts })})`);
    }
    // tend walk-screen audit 24 (T44's review: steward S6, ux U5, auditor 6, 11): Save stops the recorder at the tap, then
    // waits (bounded) for a mid-memo photo still being kept, and the memo still joins its moment. The photo's keep is held
    // back 2 s by delaying its file's read, so the tap lands while it is being kept.
    {
      const joinedCount = () => pg.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
          g.onsuccess = () => resolve(g.result.filter((m) => m.pieces.some((p) => p.kind === 'photo') && m.pieces.some((p) => p.kind === 'voice')).length);
        };
      }));
      const joinedBefore = await joinedCount();
      await pg.evaluate(() => {
        if (!window.__fetchWas) window.__fetchWas = window.fetch;
        window.__slowBlob = true;
        window.__slowBlobHit = false;
        window.fetch = async (u, ...rest) => {
          if (window.__slowBlob && String(u).startsWith('blob:')) {
            window.__slowBlob = false;
            window.__slowBlobHit = true;
            await new Promise((r) => setTimeout(r, 2000));
          }
          return window.__fetchWas(u, ...rest);
        };
      });
      await pg.click('[data-testid=moment-voice]');
      await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 });
      await pg.waitForTimeout(1400);
      const [ch] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=moment-photo]')]);
      await ch.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
      const hit = await pg.waitForFunction(() => window.__slowBlobHit, null, { timeout: 10000 }).then(() => true, () => false);
      const tapAt = Date.now();
      await pg.click('[data-testid=moment-voice-save]');
      const stoppedAtTap = await pg.waitForSelector('[data-testid=moment-voice]', { timeout: 900 }).then(() => Date.now() - tapAt, () => null);
      // Its editor opens once the memo is saved; closed, the photo as taken.
      await pg.waitForSelector('[data-testid=media-editor]', { timeout: 15000 }).then(() => pg.click('[data-testid=edit-close]')).catch(() => {});
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(1000);
      const joinedAfter = await joinedCount();
      await pg.evaluate(() => { window.__slowBlob = false; if (window.__fetchWas) window.fetch = window.__fetchWas; });
      check(hit && stoppedAtTap != null && joinedAfter === joinedBefore + 1,
        `tend walk-screen audit 24: a Save tapped while a mid-memo photo is being kept stops recording at the tap and still joins the photo's moment (${JSON.stringify({ hit, stoppedAtTap, joinedBefore, joinedAfter })})`);
    }
    // tend walk-screen audit 20, on Discard: the photo stays, the memo goes, and the photo's editor opens then.
    {
      await pg.click('[data-testid=moment-voice]');
      await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 });
      await pg.waitForTimeout(1400);
      const [ch] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=moment-photo]')]);
      await ch.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
      await pg.waitForTimeout(2500);
      const editorMid = await pg.locator('[data-testid=media-editor]').count();
      await pg.click('[data-testid=moment-voice-discard]');
      const editorAfter = await pg.waitForSelector('[data-testid=media-editor]', { timeout: 10000 }).then(() => true, () => false);
      await pg.click('[data-testid=edit-close]').catch(() => {});
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
      check(editorMid === 0 && editorAfter, `tend walk-screen audit 20: on Discard the photo's editor opens, not before (${JSON.stringify({ editorMid, editorAfter })})`);
      // Let the discarded memo go with its Undo, so the steps below meet the screen as before.
      await pg.waitForSelector('[data-testid=moment-voice-undo]', { state: 'detached', timeout: 12000 }).catch(() => {});
    }
    // tend walk-screen audit 23 (T44's review, auditor 4): a photo whose save fails mid-memo is held for Retry; its pill,
    // in the pills' place, never stands over Discard and the timer while the memo records (the walk keeps its pills back
    // mid-memo too), and shows once the memo is saved. The photo's file read is made to fail once.
    {
      await pg.evaluate(() => {
        if (!window.__fetchWas) window.__fetchWas = window.fetch;
        window.__failBlob = true;
        window.fetch = async (u, ...rest) => {
          if (window.__failBlob && String(u).startsWith('blob:')) {
            window.__failBlob = false;
            throw new TypeError('Failed to fetch');
          }
          return window.__fetchWas(u, ...rest);
        };
      });
      await pg.click('[data-testid=moment-voice]');
      await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 });
      await pg.waitForTimeout(1400);
      const [ch] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=moment-photo]')]);
      await ch.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
      await pg.waitForFunction(() => !window.__failBlob, null, { timeout: 10000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const heldClear = await pg.evaluate(() => {
        // Every element of the id, the shown one among them (another screen may hold a hidden one).
        const all = (id) => [...document.querySelectorAll(`[data-testid=${id}]`)].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
        const row = [...all('moment-voice-discard'), ...all('voice-timer')];
        const over = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        return row.length === 2 && !['held-captures', 'held-memo'].some((id) => all(id).some((a) => row.some((b) => over(a, b))));
      });
      await pg.evaluate(() => { window.__failBlob = false; if (window.__fetchWas) window.fetch = window.__fetchWas; });
      await pg.click('[data-testid=moment-voice-save]');
      await pg.waitForSelector('[data-testid=moment-voice]', { timeout: 10000 });
      const heldAfter = await pg.locator('[data-testid=held-captures]').filter({ visible: true }).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
      check(heldClear && heldAfter, `tend walk-screen audit 23: on the ready screen a photo held mid-memo stands over neither Discard nor the timer, and is offered once the memo is saved (${JSON.stringify({ heldClear, heldAfter })})`);
      // Retry keeps it, so the steps below meet the screen as before; its editor, if it opens, is closed.
      await pg.locator('[data-testid=held-retry]').filter({ visible: true }).first().click({ timeout: 5000 }).catch(() => {});
      await pg.locator('[data-testid=held-captures]').filter({ visible: true }).first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=media-editor]', { timeout: 3000 }).then(() => pg.click('[data-testid=edit-close]')).catch(() => {});
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
    }
    await pg.click('[data-testid=moment-voice]');
    await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 });
    await pg.waitForTimeout(1400);
    const voicesBefore = (await rows(pg)).filter((r) => r.kind === 'voice').length;
    await pg.click('[data-testid=ready-close]');
    await pg.waitForTimeout(1500);
    const voicesAfter = (await rows(pg)).filter((r) => r.kind === 'voice').length;
    check(voicesAfter === voicesBefore + 1 && pathOf(pg) === `${BASE}/`, `ready NR10: the chevron mid-memo closes and keeps the memo (${voicesBefore} → ${voicesAfter})`);
    // tend walk-screen audit 26 (T44's review: steward S3, ux U6; the owner's "Keep the photo's", decision 0261): the
    // photo-and-memo moment, opened from Chronicle, pictured; its time and place are the photo's, and the memo keeps its own
    // earlier time as a piece.
    {
      const entry = pg.locator('[aria-label^="Photo, with more in this moment"]').filter({ visible: true }).first();
      const opened = await entry.click({ timeout: 5000 }).then(() => pg.waitForSelector('[data-testid=capture-viewer]', { timeout: 5000 })).then(() => true, () => false);
      await pg.waitForTimeout(800);
      await shot(pg, 'ws-t44-moment-390');
      const times = await pg.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
          g.onsuccess = () => resolve(g.result.filter((m) => m.pieces.some((x) => x.kind === 'photo') && m.pieces.some((x) => x.kind === 'voice'))
            .map((m) => ({ t: m.t, lat: m.lat, photoT: m.pieces.find((x) => x.id === m.id)?.t, voiceT: m.pieces.find((x) => x.kind === 'voice')?.t, first: m.pieces[0].kind })));
        };
      }));
      await pg.click('[data-testid=viewer-close]').catch(() => {});
      await pg.waitForSelector('[data-testid=capture-viewer]', { state: 'detached', timeout: 5000 }).catch(() => {});
      check(opened && times.length >= 1 && times.every((x) => x.t === x.photoT && x.voiceT < x.t && x.lat != null && x.first === 'voice'),
        `tend walk-screen audit 26: a memo joined by a mid-memo photo keeps its own start time as a piece; the moment's time and place are the photo's (${JSON.stringify({ opened, times })})`);
    }
    await tabTo(pg, 'navigate');
    await pg.waitForSelector('[data-testid=ready-bar]');
    await pg.waitForTimeout(1200);
    // tend walk-screen 14 (the sweep's ux 5, auditor 5): the ready screen's pill buttons are 44 pt themselves, as the
    // walk's are; react-native-web has no hitSlop (.claude/rules/tabs-and-home.md). A memo discarded shows Undo.
    {
      await pg.click('[data-testid=moment-voice]');
      await pg.waitForSelector('[data-testid=moment-voice-discard]', { timeout: 10000 });
      await pg.waitForTimeout(1400);
      await pg.click('[data-testid=moment-voice-discard]');
      await pg.waitForSelector('[data-testid=moment-voice-undo]', { timeout: 5000 }).catch(() => {});
      const undo = await boxOf(pg, 'moment-voice-undo');
      check(!!undo && undo.h >= 44, `tend walk-screen 14: the ready screen's Undo is 44 pt high itself (${JSON.stringify(undo)})`);
      // Let it go: the discarded memo leaves with its Undo, so the steps below meet the screen as before.
      await pg.waitForSelector('[data-testid=moment-voice-undo]', { state: 'detached', timeout: 12000 }).catch(() => {});
    }

    // A moment before Start (NR9).
    await pg.click('[data-testid=moment-note]');
    await pg.fill('[data-testid=note-input]', 'Before the walk');
    await pg.click('[data-testid=note-done]');
    await pg.waitForTimeout(800);

    // NR5, NR6: Start records in place.
    const before = { cam: await boxOf(pg, 'moment-photo'), mic: await boxOf(pg, 'moment-voice'), pen: await boxOf(pg, 'moment-note'), chev: await boxOf(pg, 'ready-close'), start: await boxOf(pg, 'start'), bar: await boxOf(pg, 'ready-bar'), loc: await boxOf(pg, 'locate') };
    // One screen and one map across Start (the owner, Nov 3): the canvas is marked, and must be the same one after.
    await pg.evaluate(() => { document.querySelector('canvas.maplibregl-canvas').__readyMark = 1; });
    await pg.evaluate(() => { window.__navs = 0; window.addEventListener('popstate', () => window.__navs++); const p = history.pushState; history.pushState = function (...a) { window.__navs++; return p.apply(this, a); }; });
    await pg.click('[data-testid=start]');
    await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 });
    await pg.waitForTimeout(600);
    const after = { cam: await boxOf(pg, 'cap-photo'), mic: await boxOf(pg, 'cap-voice'), pen: await boxOf(pg, 'cap-note'), chev: await boxOf(pg, 'walk-minimize'), stop: await boxOf(pg, 'walk-actions') };
    const notice = (await pg.locator('[data-testid=lift-in]').allInnerTexts()).join(' | ');
    check(pathOf(pg) === `${BASE}/walk` && (await pg.evaluate(() => window.__navs)) === 0 && same(before.cam, after.cam) && same(before.mic, after.mic) && same(before.pen, after.pen) && same(before.chev, after.chev),
      `ready NR6: Start records in place; the stack and the chevron don't move (${JSON.stringify({ before, after })})`);
    // fix minimize-top-align: 4 pt under the safe area top edge (0 in the headless browser), not the old 12.
    check(Math.abs(before.chev.y - 4) <= 1 && Math.abs(after.chev.y - 4) <= 1, `ready fix minimize-top-align: the chevron and Minimize sit 4 pt below the top (${before.chev.y}, ${after.chev.y})`);
    check(Math.abs(before.start.x + before.start.w - (after.stop.x + after.stop.w)) <= 2 && Math.abs(before.start.y + before.start.h / 2 - (after.stop.y + after.stop.h / 2)) <= 2,
      `ready NR5: Start sits in the strip where the walk's actions end (Pause, then Resume and Stop; 0220) (${JSON.stringify({ start: before.start, stop: after.stop })})`);
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
    await pg.click('[data-testid=note-done]');
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
    await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 10000 });
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
      await sp.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 });
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
      const walkBad = await layout(['walk-minimize', 'walk-back', 'recenter', 'cap-photo', 'cap-voice', 'cap-note', 'pause-walk']);
      check(walkBad.length === 0, `ready NR11: at 375×667 the walk's buttons, with every edge button up, are on screen, 44 or more, apart (${walkBad.join(', ')}; ${await stats(sp)})`);
      // Paused, Resume and Stop take Pause's place (decision 0220): the same rule holds.
      await toStop(sp);
      await shot(sp, 'ready-nr11-walk-paused');
      const pausedBad = await layout(['walk-minimize', 'walk-back', 'recenter', 'cap-photo', 'cap-voice', 'cap-note', 'resume-walk', 'stop']);
      check(pausedBad.length === 0, `ready NR11, 0220: paused, Resume and Stop are on screen, 44 or more, apart from the rest (${pausedBad.join(', ')}; ${await stats(sp)})`);
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
      // tend map T17: refused, Locate says where to turn location on (the quiet notice, `locate/notice.ts`).
      check(/Location is off for this site/.test(denied) && (await pg2.locator('[data-testid=ready-bar]').count()) === 1,
        `ready NR13: a denied location says so on the ready screen (${denied})`);
      // M2 on the ready screen: a moment with no fix is kept and says so.
      await pg2.click('[data-testid=moment-note]');
      await pg2.fill('[data-testid=note-input]', 'No fix here');
      await pg2.click('[data-testid=note-done]');
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
    const started = await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 }).then(() => true, () => false);
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
    await pg.waitForTimeout(1500);
    {
      const walker = ((await pg.locator('[data-walker]').last().getAttribute('data-walker')) || '').split(',').map(Number);
      const [x, y] = walker.length === 2 ? await pg.evaluate((p) => window.__project(p), walker) : [NaN, NaN];
      const bar = await box(pg, 'ready-bar');
      check(Number.isFinite(y) && bar && y < bar.y && y > 0, `navigate-ready audit 1: with the bar up and Places on, the ring's centre is on the map above the bar (centre y ${Math.round(y)}, bar top ${bar && Math.round(bar.y)})`);
      void x;
    }
    // A range set here is the one the walk's drawer shows after Start, with no reload between (fix walk-drawer-settings audit 1).
    await pg.click('[data-testid=range-plus]');
    await pg.waitForTimeout(300);
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
    await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 });
    await pg.waitForTimeout(800);
    // The options are the walk strip's drawer (no button): pulled up, it is the settings, not a card among the stack.
    await pg.click('[data-testid=walk-summary]');
    await pg.waitForSelector('[data-testid=options-card]');
    {
      // fix walk-drawer-settings audit 1: the range set on the ready bar shows in the walk's drawer, no reload between.
      await pg.waitForSelector('[data-testid=range-slider]');
      const shown = await pg.locator('[data-testid=range-value]').innerText();
      check(/^120[ \u00a0]m$/.test(shown), `fix walk-drawer-settings audit 1: the range set on the ready bar (120 m) is the walk drawer's (${shown})`);
      await pg.click('[data-testid=range-minus]');
      await pg.waitForTimeout(300);
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
