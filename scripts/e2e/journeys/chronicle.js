// After the walk: placing (areas, places of interest, D1), the card's finds and low (E11, U13), naming it,
// Chronicle with its star (H1, H6, H7, NV27), the sheet, the map view across a replay and the tabs (H5,
// NV3, NV4), the walks list (M6), muted playback without a tap, reduce motion (M2), and the ready bar's
// spring (NR7, NR9). Starts on the first walk's card, where the walk journey ends.

async function checks(h) {
  const { navUrl, BASE, browser, ctx, page, errors, start, at, check, shot, pressedScale, drawerTo, tabTo, tabBarShown } = h;
    // The walk is placed, down to its neighborhood, with the town found by the wide read
    // and the state from the bundled outlines.
    const placed = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['area', 'walk_area'], 'readonly');
        const a = tx.objectStore('area').getAll();
        const w = tx.objectStore('walk_area').getAll();
        tx.oncomplete = () => resolve({ areas: a.result, rows: w.result });
      };
    }));
    const levels = Object.fromEntries(placed.areas.map((x) => [x.level, x.name]));
    check(
      levels.neighborhood === 'Fox Point' && levels.town === 'Providence' && levels.state === 'Rhode Island' && levels.country === 'United States of America'
        && placed.rows.length === 4 && placed.rows.every((r) => r.metres > 0),
      `the walk is placed in Fox Point, Providence, Rhode Island (${JSON.stringify(levels)})`,
    );
    // Places of interest are read with the streets and cached, tagged with the build (D1).
    const pois = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const r = req.result.transaction('place', 'readonly').objectStore('place').getAll();
        r.onsuccess = () => resolve(r.result);
      };
    }));
    const poiNames = pois.map((p) => `${p.category}:${p.name}`).sort();
    check(
      poiNames.includes('art:Public art') && poiNames.includes('history:Hessian Memorial') && poiNames.includes('food:Coffee Exchange') && !poiNames.some((n) => /Wickenden at Hope/.test(n))
        && pois.every((p) => p.build === '20261028_001001_pt'),
      `the walk's reads cache its places of interest, and no bus stop (${poiNames.join(', ')})`,
    );
    // The card lists the walk's finds, and keeps what it passed without stopping as a low (E11).
    check((await page.locator('[data-testid=card-finds]').innerText()) === 'Found Hessian Memorial', 'the card lists the places found');
    const low = await page.locator('[data-testid=card-low]').allInnerTexts();
    // Named, never counted (tabs audit U13).
    check(low.length === 1 && /^Passed .+ without stopping$/.test(low[0]) && !/\d/.test(low[0]), `the card keeps the place passed as a low, by name (${low.join(' | ')})`);
    await page.waitForTimeout(800);
    await shot(page, '05-card');
    // The card's zoom groups nearby captures; open the pin holding the note
    // (the last one taken) and step to it.
    const pinsOnCard = page.locator('[aria-label$=". Open"]');
    await pinsOnCard.nth((await pinsOnCard.count()) - 1).click();
    for (let k = 0; k < 6 && !(await page.getByText('The bakery smelled of cardamom.').count()); k++) {
      await page.click('[aria-label="Next moment"]');
      await page.waitForTimeout(300);
    }
    await page.waitForSelector('text=The bakery smelled of cardamom. >> visible=true');
    await page.waitForTimeout(1200);
    await shot(page, '06-pin-opened');
    check(true, 'a pin on the card opens its capture');
    await page.click('[aria-label="Close"]');

    await page.click('[data-testid=to-name]');
    // tend chronicle 5: the name's return key (Next) goes on to the line.
    await page.locator('[data-testid=title-input]').press('Enter');
    await page.waitForTimeout(300);
    const nextFocus = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);
    check(nextFocus === 'epilogue-input', `tend chronicle 5: Next in the first replay's name goes on to the line (focus on ${nextFocus})`);
    // tend chronicle audit 1: the first replay keeps its own line, said just after the walk; Rename's changed (inbox T2).
    const replayLine = await page.evaluate(() => ({
      shown: document.getElementById('epilogue-label')?.textContent ?? '',
      spoken: document.querySelector('[data-testid=epilogue-input]')?.getAttribute('aria-label') ?? '',
    }));
    check(replayLine.shown === 'One line, while the feeling is fresh' && replayLine.spoken === 'One line, while the feeling is fresh',
      `tend chronicle audit 1: the first replay's line still reads "One line, while the feeling is fresh", shown and spoken (${JSON.stringify(replayLine)})`);
    await page.fill('[data-testid=epilogue-input]', 'Cardamom and the river.');
    await page.click('[data-testid=save]');
    // Back on Chronicle: the walk is a star where it was walked (H1, H7, NV27).
    await h.mapUp(page);
    await page.waitForSelector('[data-testid=home-sheet]');
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=home-sheet]').count()) === 1 && (await tabBarShown(page)),
      `closing the replay after Stop returns to Chronicle, once, with the tab bar (NV27: ${page.url()})`);
    await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 15000 });
    await shot(page, '08-home-star');
    check(true, 'the walk is a star on the home map');
    check((await page.locator('[data-testid=enter-bounce]').count()) === 0, 'no star settles before one is selected');
    // tend places T15 (decision 0154, "Ink star, no numeral"): the star is a white star on ink, never the accent, says
    // its walks in words, and shows no digit; selected, it turns over to an ink star on white in an ink ring.
    const starLook = () => page.evaluate(() => {
      const b = document.querySelector('[aria-label^="Fox Point,"]');
      const disc = [...(b?.querySelectorAll('div') ?? [])].find((e) => Math.round(e.getBoundingClientRect().width) === 36 && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)');
      const cs = disc && getComputedStyle(disc);
      const glyph = [...(disc?.querySelectorAll('*') ?? [])].find((e) => !e.childElementCount && e.textContent);
      return { label: b?.getAttribute('aria-label'), bg: cs?.backgroundColor, ring: cs?.borderTopColor, ringW: cs?.borderTopWidth, glyph: glyph && getComputedStyle(glyph).color, text: disc?.innerText ?? '' };
    });
    const ink = 'rgb(29, 36, 48)';
    const rest = await starLook();
    check(rest.label === 'Fox Point, one walk' && rest.bg === ink && rest.ring === 'rgb(255, 255, 255)' && rest.glyph === 'rgb(255, 255, 255)' && !/\d/.test(rest.text),
      `tend places T15: a walked place is a star in ink, not the accent, and says its walks in words (${JSON.stringify(rest)})`);
    // A star lists its place's walks in the sheet, with the place's parents (H6).
    await page.click('[aria-label^="Fox Point,"]');
    await page.waitForSelector('[data-testid=place-title]');
    check(await page.evaluate(() => window.__enters.some((e) => e.kind === 'bounce' && e.animated && /^Fox Point,/.test(e.label))), 'a selected star settles into its ring (M9)');
    const sheet = (await page.locator('[data-testid=home-sheet]').innerText()).replace(/\s+/g, ' ');
    check(/Fox Point/.test(sheet) && /Providence, Rhode Island/.test(sheet) && /Cardamom and the river\./.test(sheet), `a star lists its place's walks (${sheet.slice(0, 120)})`);
    await shot(page, '09-home-place');
    const chosen = await starLook();
    check(chosen.bg === 'rgb(255, 255, 255)' && chosen.ring === ink && chosen.ringW === '3px' && chosen.glyph === ink,
      `tend places T15: a selected star turns over, white in an ink ring, so it reads on the ink (${JSON.stringify(chosen)})`);
    // Back to the map. A mouse drag on the sheet's header settles at a step, never halfway (audit).
    await page.click('[data-testid=sheet-map]');
    await page.waitForTimeout(400);
    const head = await page.locator('[data-testid=sheet-drag]').boundingBox();
    await page.mouse.move(head.x + head.width / 2, head.y + head.height / 2);
    await page.mouse.down();
    await page.mouse.move(head.x + head.width / 2, head.y - 260, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    // The sheet grows into the screen above the tab bar.
    const vh = (await page.locator('[data-testid=tab-navigate]').boundingBox()).y;
    const sheetH = (await page.locator('[data-testid=home-sheet]').boundingBox()).height;
    check([Math.round(vh * 0.5), vh - 56].some((h) => Math.abs(sheetH - h) < 30), `a dragged sheet settles at a step (${Math.round(sheetH)} px)`);
    // section-bar audit 3: a drag up names the list it opens on the bar, and a drag down to rest names Map (SB1).
    const barAfterDrag = await page.locator('[data-testid^=section-][aria-selected=true]').getAttribute('data-testid');
    const listAfterDrag = (await page.locator('[data-testid=walk-row]').count()) ? 'section-walks' : 'section-days';
    // Down as a finger drags it (a mouse drag down is dropped by the browser, .claude/rules/motion-polish.md).
    const headUp = await page.locator('[data-testid=sheet-drag]').boundingBox();
    const fingerDown = await page.context().newCDPSession(page);
    const fx = headUp.x + headUp.width / 2;
    await fingerDown.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fx, y: headUp.y + headUp.height / 2 }] });
    for (let y = headUp.y + 30; y < vh - 10; y += 60) await fingerDown.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: fx, y }] });
    await fingerDown.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await fingerDown.detach();
    await page.waitForTimeout(900);
    const barAfterDown = await page.locator('[data-testid^=section-][aria-selected=true]').getAttribute('data-testid');
    const restAfterDown = (await page.locator('[data-testid=walk-row], [data-testid=day-row]').count()) === 0;
    check(barAfterDrag === listAfterDrag && barAfterDown === 'section-map' && restAfterDown,
      `section-bar audit 3: a drag up moves the bar to its list, a drag down to rest moves it to Map (${barAfterDrag} for ${listAfterDrag}, then ${barAfterDown}, at rest ${restAfterDown})`);
    if (await page.locator('[data-testid=sheet-map]').count()) await page.click('[data-testid=sheet-map]');
    await page.waitForTimeout(400);
    // The section bar names what the sheet shows, and the sheet follows the bar, with one map up (specs/section-bar).
    {
      const selectedSection = () => page.locator('[data-testid^=section-][aria-selected=true]').getAttribute('data-testid');
      const shows = async () => ((await page.locator('[data-testid=walk-row]').count()) ? 'walks'
        : (await page.locator('[data-testid=day-row]').count()) ? 'days'
          : (await page.locator('[data-testid=place-title]').count()) ? 'place' : 'rest');
      const camera = () => page.locator('[data-zoom]').first().evaluate((e) => `${e.getAttribute('data-zoom')} ${e.getAttribute('data-center')}`);
      // The map's own canvas, marked: a remount would bring a new, unmarked one (section-bar audit 2).
      await page.locator('canvas.maplibregl-canvas').first().evaluate((e) => { e.dataset.sbMark = '1'; });
      const canvases = () => page.evaluate(() => `${document.querySelectorAll('canvas.maplibregl-canvas').length}/${document.querySelectorAll('canvas.maplibregl-canvas[data-sb-mark]').length}`);
      const settle = () => page.waitForTimeout(700);
      const cam0 = await camera();
      const seen = [];
      // The sheet to the bar (SB1).
      await page.click('[data-testid=sheet-days]');
      await page.waitForSelector('[data-testid=day-row]', { timeout: 10000 });
      await settle();
      seen.push(['sheet Days', await selectedSection(), await shows(), await canvases(), await camera()]);
      await page.click('[data-testid=sheet-map]');
      await settle();
      seen.push(['sheet Map', await selectedSection(), await shows(), await canvases(), await camera()]);
      // section-bar audit 5: the sheet's Map, pictured with the bar on Map and the sheet at rest.
      await shot(page, 'chronicle-sb-sheet-to-bar');
      const sheetToBar = seen.slice(0, 2);
      check(sheetToBar[0][1] === 'section-days' && sheetToBar[0][2] === 'days' && sheetToBar[1][1] === 'section-map' && sheetToBar[1][2] === 'rest',
        `SB1: the sheet's Days and Map move the section bar with them (${JSON.stringify(sheetToBar.map((x) => x.slice(0, 3)))})`);
      // The bar to the sheet (SB2), with no new map (SB3).
      await page.click('[data-testid=section-days]');
      await page.waitForSelector('[data-testid=day-row]', { timeout: 10000 });
      await settle();
      seen.push(['bar Days', await selectedSection(), await shows(), await canvases(), await camera()]);
      await shot(page, 'chronicle-sb-bar-to-sheet');
      await page.click('[data-testid=section-walks]');
      await page.waitForSelector('[data-testid=walk-row]', { timeout: 10000 });
      await settle();
      seen.push(['bar Walks', await selectedSection(), await shows(), await canvases(), await camera()]);
      await page.click('[data-testid=section-map]');
      await settle();
      seen.push(['bar Map', await selectedSection(), await shows(), await canvases(), await camera()]);
      const barToSheet = seen.slice(2);
      // A place's walks opened from Map keep Map (SB4); the bar's Map, already selected, returns it to rest (SB2).
      await page.click('[aria-label^="Fox Point,"]');
      await page.waitForSelector('[data-testid=place-title]');
      const placeSection = await selectedSection();
      await page.click('[data-testid=section-map]');
      await settle();
      const afterSame = [await selectedSection(), await shows()];
      check(barToSheet[0].slice(1, 3).join() === 'section-days,days' && barToSheet[1].slice(1, 3).join() === 'section-walks,walks'
        && barToSheet[2].slice(1, 3).join() === 'section-map,rest' && placeSection === 'section-map' && afterSame.join() === 'section-map,rest',
        `SB2: the bar's Days, Walks and Map change the sheet, and its selected Map returns a place's walks to rest (${JSON.stringify(barToSheet.map((x) => x.slice(0, 3)))}, place ${placeSection}, then ${afterSame})`);
      check(seen.every((x) => x[3] === '1/1') && seen.every((x) => x[4] === cam0),
        `SB3, section-bar audit 2: the same canvas stands (canvases/marked) and the camera holds across the moves (${JSON.stringify(seen.map((x) => [x[0], x[3], x[4]]))}, from ${cam0})`);
      check(sheetToBar.every((x) => x[1] === `section-${x[2] === 'rest' ? 'map' : x[2]}`) && barToSheet.every((x) => x[1] === `section-${x[2] === 'rest' ? 'map' : x[2]}`),
        'SB5: the bar and the sheet agree each way, pictured (chronicle-sb-sheet-to-bar, chronicle-sb-bar-to-sheet)');
      // section-bar audit 1: Escape on a replay opened from a day's timeline leaves Chronicle as it was: the sheet
      // beneath, out of sight, never takes the key, so Back returns to Days and the day (SB4).
      await page.click('[data-testid=section-days]');
      await page.waitForSelector('[data-testid=day-row]', { timeout: 10000 });
      await page.click('[data-testid=day-row]');
      await page.waitForSelector('[data-testid=day-title]');
      await page.locator('[data-testid=timeline-walk]').first().click();
      await page.waitForURL(/\/replay\//, { timeout: 15000 });
      await page.waitForTimeout(1500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      await page.goBack();
      await page.waitForSelector('[data-testid=home-sheet]', { timeout: 15000 });
      await settle();
      const back = [await selectedSection(), (await page.locator('[data-testid=day-title]').count()) === 1];
      check(back[0] === 'section-days' && back[1] === true,
        `section-bar audit 1: Escape on a replay opened from a day leaves Chronicle on Days and the day (${JSON.stringify(back)})`);
      await page.click('[data-testid=section-map]');
      await settle();
      // inbox T6: the bar's Walks zooms out to every place walked when one is out of view, as the sheet's Walks does
      // (decision 0054): the map is dragged until the star is off the screen, then the bar's Walks frames it above the sheet.
      const box = await page.locator('canvas.maplibregl-canvas').first().boundingBox();
      const from = { x: box.x + 60, y: box.y + box.height * 0.3 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + 320, from.y + 40, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(700);
      const away = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
      const offScreen = !away || away.x > box.x + box.width || away.x + away.width < box.x;
      // tend chronicle audit 3: from the days list the bar's Walks moves nothing, as the sheet's switch from Days does.
      const fitsDays = await page.evaluate(() => window.__perf.fit ?? 0);
      await page.click('[data-testid=section-days]');
      await page.waitForSelector('[data-testid=day-row]', { timeout: 10000 });
      await page.click('[data-testid=section-walks]');
      await page.waitForSelector('[data-testid=walk-row]', { timeout: 10000 });
      await page.waitForTimeout(1200);
      const fitsFromDays = (await page.evaluate(() => window.__perf.fit ?? 0)) - fitsDays;
      const stillAway = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
      check(fitsFromDays === 0 && (!stillAway || stillAway.x > box.x + box.width),
        `tend chronicle audit 3: the bar's Walks from Days zooms out nothing, as the sheet's switch from Days (${fitsFromDays} fits)`);
      await page.click('[data-testid=section-map]');
      await settle();
      const fits0 = await page.evaluate(() => window.__perf.fit ?? 0);
      await page.click('[data-testid=section-walks]');
      await page.waitForSelector('[data-testid=walk-row]', { timeout: 10000 });
      await page.waitForTimeout(1500);
      const framed = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
      const top = (await page.locator('[data-testid=home-sheet]').boundingBox()).y;
      const fits1 = await page.evaluate(() => window.__perf.fit ?? 0);
      // tend chronicle audit 4: the bar's Walks after its zoom-out, pictured.
      await shot(page, 'chronicle-t6-bar-walks-framed');
      check(offScreen && fits1 === fits0 + 1 && framed && framed.x >= box.x && framed.x + framed.width <= box.x + box.width && framed.y + framed.height < top,
        `tend chronicle T6: the bar's Walks zooms out to every place walked when one is out of view (off screen ${offScreen}, ${fits1 - fits0} fit, star at ${framed && Math.round(framed.x)},${framed && Math.round(framed.y)}, sheet at ${Math.round(top)})`);
      await page.click('[data-testid=section-map]');
      await settle();
      // inbox T7: the bar's Walks from Memories mounts the map on its kept view; with the star dragged off the screen,
      // it zooms out once (decision 0054's rule) and frames it above the sheet. From Media with the star in view, none.
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + 320, from.y + 40, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(700);
      const away7 = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
      const offScreen7 = !away7 || away7.x > box.x + box.width || away7.x + away7.width < box.x;
      await page.click('[data-testid=section-memories]');
      await page.waitForTimeout(800);
      const fits7 = await page.evaluate(() => window.__perf.fit ?? 0);
      await page.click('[data-testid=section-walks]');
      await page.waitForSelector('[data-testid=walk-row]', { timeout: 10000 });
      await page.waitForTimeout(2000);
      const framed7 = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
      const box7 = await page.locator('canvas.maplibregl-canvas').first().boundingBox();
      const top7 = (await page.locator('[data-testid=home-sheet]').boundingBox()).y;
      const fitsMount = (await page.evaluate(() => window.__perf.fit ?? 0)) - fits7;
      await shot(page, 'chronicle-t7-walks-from-memories');
      check(offScreen7 && fitsMount === 1 && framed7 && framed7.x >= box7.x && framed7.x + framed7.width <= box7.x + box7.width && framed7.y + framed7.height < top7,
        `tend chronicle T7: the bar's Walks from Memories zooms out once to every place walked when one is out of the kept view (off screen ${offScreen7}, ${fitsMount} fit, star at ${framed7 && Math.round(framed7.x)},${framed7 && Math.round(framed7.y)}, sheet at ${Math.round(top7)})`);
      await page.click('[data-testid=section-media]');
      await page.waitForTimeout(800);
      const fitsIn = await page.evaluate(() => window.__perf.fit ?? 0);
      await page.click('[data-testid=section-walks]');
      await page.waitForSelector('[data-testid=walk-row]', { timeout: 10000 });
      await page.waitForTimeout(1500);
      const fitsKept = (await page.evaluate(() => window.__perf.fit ?? 0)) - fitsIn;
      check(fitsKept === 0, `tend chronicle T7: from Media, with every place walked in the kept view, the map mounts on Walks with no fit (${fitsKept} fits)`);
      await page.click('[data-testid=section-map]');
      await settle();
    }
    // The map view survives a replay (H5): pan, note the star, replay, come back.
    const home = await page.locator('canvas.maplibregl-canvas').first().boundingBox();
    // Grabbed where the map itself is under the pointer: not the star, nor Start or the sheet floating
    // over it (the old grab pressed Start, so this check compared a view that never moved).
    const grab = await page.evaluate(({ w, h }) => {
      for (let y = 140; y < h - 220; y += 40)
        for (let x = 40; x < w - 40; x += 40) {
          const e = document.elementFromPoint(x, y);
          if (e?.tagName === 'CANVAS') return { x, y };
        }
      return null;
    }, { w: home.width, h: home.height });
    const starPanned = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    await page.mouse.move(home.x + grab.x, home.y + grab.y);
    await page.mouse.down();
    await page.mouse.move(home.x + grab.x + 40, home.y + grab.y + 30, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const starMoved = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    check(Math.abs(starMoved.x - starPanned.x - 40) < 6 && Math.abs(starMoved.y - starPanned.y - 30) < 6,
      `a drag on the home map pans it, so the next check compares a moved view (${Math.round(starPanned.x)},${Math.round(starPanned.y)} → ${Math.round(starMoved.x)},${Math.round(starMoved.y)})`);
    const fitsBefore = await page.evaluate(() => window.__perf.fit ?? 0);
    // The Walks list: every stopped walk; one opens its replay as a re-watch (H4, H5).
    // Opening it zooms out to every place walked (M6), framing the star above the sheet.
    await page.click('[data-testid=sheet-walks]');
    await page.waitForSelector('[data-testid=walk-row]');
    await page.waitForTimeout(1200);
    const starBefore = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    const sheetTop = (await page.locator('[data-testid=home-sheet]').boundingBox()).y;
    const fitsAfter = await page.evaluate(() => window.__perf.fit ?? 0);
    check(fitsAfter === fitsBefore && starBefore.y + starBefore.height < sheetTop && starBefore.y > 0,
      `opening the walks list leaves a view that already shows every place alone (M6, audit 7: ${fitsAfter - fitsBefore} fits, star at ${Math.round(starBefore.y)}, sheet at ${Math.round(sheetTop)})`);
    check((await page.locator('[data-testid=walk-row]').count()) === 1, 'the walks list has the one stopped walk');
    await shot(page, '10-home-walks');
    await page.locator('[data-testid=walk-row]').first().click();
    await page.waitForSelector('[data-testid=done]', { timeout: 90000 });
    check(true, 're-watching from the walks list reaches the card with no taps');

    // A replay opened with no tap at all (a fresh page, as after a reload)
    // may not start a video with sound: it plays muted and offers the sound.
    const fresh = await ctx.newPage();
    fresh.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    // iOS's rules, which headless Chromium does not enforce: sound needs a tap first, and a video
    // loads no more than its metadata until a play() is let through, so it never says it can play
    // before then (fix ios-video 1). Chromium loads a blob: video whatever its preload says, so the
    // readyState it reports is held at 1 until then.
    await fresh.addInitScript(() => {
      let tapped = false;
      document.addEventListener('pointerdown', () => (tapped = true), true);
      const P = HTMLMediaElement.prototype;
      const readyState = Object.getOwnPropertyDescriptor(P, 'readyState');
      Object.defineProperty(P, 'readyState', {
        configurable: true,
        get() {
          const r = readyState.get.call(this);
          return this.tagName === 'VIDEO' && !this.__played ? Math.min(r, 1) : r;
        },
      });
      const play = P.play;
      P.play = function () {
        if (!this.muted && !tapped) return Promise.reject(new DOMException('play() needs a tap', 'NotAllowedError'));
        this.__played = true;
        return play.call(this);
      };
    });
    await fresh.goto(page.url());
    // The memo comes first and is refused too: it waits a moment, as a photo does, and moves on.
    await fresh.waitForSelector('[aria-label="Play voice memo"]', { timeout: 90000 });
    const memoAt = Date.now();
    await fresh.waitForSelector('video', { timeout: 15000 });
    const memoMs = Date.now() - memoAt;
    check(memoMs > 3000 && memoMs < 9000, `a refused memo moves on after a few seconds (${(memoMs / 1000).toFixed(1)} s)`);
    // Muted playback with the button, within a second or two (the clip is short and moves on by itself).
    const muted = await fresh
      .waitForFunction(() => {
        const v = document.querySelector('video');
        return !!v && v.muted && !v.paused && !!document.querySelector('[data-testid=video-sound]');
      }, null, { timeout: 3000 })
      .then(() => true, () => false);
    await shot(fresh, '07-video-sound');
    check(muted, 'with no tap yet, the video plays muted with a sound button');
    await fresh.click('[data-testid=video-sound]');
    await fresh.waitForTimeout(500);
    const sound = await fresh.evaluate(() => {
      const v = document.querySelector('video');
      return !!v && !v.muted && !v.paused;
    });
    check(sound, 'a tap on it turns the sound on');
    await fresh.close();
    await page.click('[data-testid=done]');
    await h.mapUp(page);
    await page.waitForSelector('[data-testid=home-sheet]');
    // The sheet kept its walks list (H5), so it is counted rather than Start.
    check((await page.locator('[data-testid=home-sheet]').count()) === 1 && (await page.locator('[data-testid=walk-row]').count()) === 1, 'done returns to the one home, its walks list as it was');
    await page.waitForTimeout(800);
    const starAfter = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    check(Math.abs(starAfter.x - starBefore.x) < 3 && Math.abs(starAfter.y - starBefore.y) < 3, `the map kept its view across the replay (${Math.round(starBefore.x)},${Math.round(starBefore.y)} → ${Math.round(starAfter.x)},${Math.round(starAfter.y)})`);
    // And across the tabs: Chronicle's map is taken down while Navigate is in front (NV4). Chronicle comes back on
    // Memories, with no map (RM1); the Map section comes back where it was (NV3, audit 8).
    await tabTo(page, 'navigate');
    await page.waitForSelector('[data-testid=start]');
    await page.waitForTimeout(800);
    check((await page.locator('canvas.maplibregl-canvas').count()) === 1, 'one live map on Navigate after a walk (NV4)');
    await tabTo(page, 'chronicle', 'memories');
    await page.waitForTimeout(800);
    check((await page.locator('canvas.maplibregl-canvas').count()) === 0 && (await page.locator('[data-testid=section-memories][aria-selected=true]').count()) === 1,
      'Chronicle comes back on Memories, with no map (RM1, NV4)');
    await h.mapUp(page);
    await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 15000 });
    await page.waitForTimeout(1200);
    const starBack = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    check((await page.locator('canvas.maplibregl-canvas').count()) === 1 && Math.abs(starBack.x - starBefore.x) < 3 && Math.abs(starBack.y - starBefore.y) < 3,
      `the Map section comes back where it was, with its stars (RM2, NV3, NV4, audit 8: ${Math.round(starBack.x)},${Math.round(starBack.y)})`);

    // Reduce motion (M2): the same home with the system setting on. Nothing presses down, the sheet snaps.
    {
      const still = await ctx.newPage();
      still.on('pageerror', (e) => errors.push(String(e)));
      await still.emulateMedia({ reducedMotion: 'reduce' });
      await still.goto(page.url());
      await h.mapUp(still);
      await still.waitForSelector('[data-testid=home-sheet]');
      await still.waitForTimeout(800);
      await still.click('[aria-label^="Fox Point,"]');
      await still.waitForTimeout(100);
      const stillEnters = await still.evaluate(() => window.__enters.map((e) => ({ kind: e.kind, animated: e.animated })));
      check(!stillEnters.some((e) => e.animated), `with reduce motion on, a selected star doesn't move (M2, M9: ${JSON.stringify(stillEnters)})`);
      await still.keyboard.press('Escape');
      await still.waitForTimeout(400);
      await tabTo(still, 'navigate');
      await still.waitForSelector('[data-testid=start]');
      await still.waitForTimeout(800);
      const flat = await pressedScale(still, '[data-testid=start]');
      await tabTo(still, 'chronicle');
      await still.waitForTimeout(400);
      const peek = (await still.locator('[data-testid=home-sheet]').boundingBox()).height;
      await still.click('[data-testid=sheet-walks]');
      await still.waitForTimeout(60);
      const open = (await still.locator('[data-testid=home-sheet]').boundingBox()).height;
      check(flat.scale === 1 && flat.opacity < 1 && open - peek > 200,
        `with reduce motion on, nothing moves, the press still shows, and the sheet snaps open (M2, audit 4: scale ${flat.scale}, opacity ${flat.opacity}, ${Math.round(peek)} → ${Math.round(open)} px in 60 ms)`);
      await still.close();
    }
    // A spring cut short by a drag still settles (audit 2), now on the ready bar (NR7): it ends at rest, the
    // settings unmount, and the capture stack never moves with it. Touch, as on a phone: in a browser a mouse
    // drag on a moving element is cancelled.
    const barState = async (pg) => ({
      h: Math.round((await pg.locator('[data-testid=ready-bar]').boundingBox()).height),
      settings: await pg.locator('[data-testid=start-settings]').count(),
      cam: await pg.locator('[data-testid=moment-photo]').filter({ visible: true }).first().boundingBox({ timeout: 3000 }).then((b) => b && Math.round(b.y), () => null),
    });
    {
      const springy = await ctx.newPage();
      springy.on('pageerror', (e) => errors.push(String(e)));
      await springy.goto(navUrl);
      await springy.waitForSelector('[data-testid=start]');
      await springy.waitForTimeout(800);
      const rest = await barState(springy);
      await drawerTo(springy, 'half');
      await springy.keyboard.press('Escape');
      await springy.waitForTimeout(60);
      const hd = await springy.locator('[data-testid=ready-grip]').boundingBox();
      const touch = await springy.context().newCDPSession(springy);
      const x = hd.x + hd.width / 2;
      const vh = springy.viewportSize().height;
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: hd.y + hd.height / 2 }] });
      for (let y = hd.y + 30; y < vh - 10; y += 60) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await springy.waitForFunction(() => !document.querySelector('[data-testid=start-settings]'), null, { timeout: 4000 }).catch(() => {});
      const after = await barState(springy);
      check(after.h === rest.h && after.settings === 0 && after.cam === rest.cam,
        `after a drag cuts the bar's spring short, it settles at rest and the stack never moved (audit 2, NR7: ${JSON.stringify({ rest, after })})`);
      await springy.close();
    }
    // Let go partway down, past the middle: the bar settles at rest, and the stack stays put as it settles.
    {
      const rides = await ctx.newPage();
      rides.on('pageerror', (e) => errors.push(String(e)));
      await rides.goto(navUrl);
      await rides.waitForSelector('[data-testid=start]');
      await rides.waitForTimeout(800);
      const rest = await barState(rides);
      await drawerTo(rides, 'half');
      const hd = await rides.locator('[data-testid=ready-grip]').boundingBox();
      const touch = await rides.context().newCDPSession(rides);
      const x = hd.x + hd.width / 2;
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: hd.y + hd.height / 2 }] });
      for (let i = 1; i <= 4; i++) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: hd.y + hd.height / 2 + i * 120 }] });
        await rides.waitForTimeout(10);
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await rides.waitForTimeout(200);
      const settling = await barState(rides);
      await rides.waitForFunction(() => !document.querySelector('[data-testid=start-settings]'), null, { timeout: 4000 }).catch(() => {});
      const after = await barState(rides);
      check(settling.cam === rest.cam && after.h === rest.h && after.settings === 0,
        `let go partway down, the bar settles at rest and the stack stays put as it settles (NR7, NR9: ${JSON.stringify({ rest, settling, after })})`);
      await rides.close();
    }
}

// Alone: the walk journey first (the first walk, with its captures), then this.
async function run(h) {
  await require('./walk').run(h);
  await checks(h);
}

module.exports = {
  name: 'chronicle',
  covers: [
    'src/app/(tabs)/index.tsx',
    'src/components/{HomeSheet,StarView,AreaPoint,SwitchRow,UndoToast}.tsx',
    'src/lib/{rename,noteEdit,months,walkTitle,rides}.ts',
    'src/lib/areas/**',
    'src/lib/{places,placeAll}.ts',
    'src/lib/backlog/**',
  ],
  run,
  checks,
};
