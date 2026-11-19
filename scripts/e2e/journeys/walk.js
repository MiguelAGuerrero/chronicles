// The walk (the concept's core): the ready bar's settings (NR7, NV20-NV24, NT4, NV23), the hint, the M7
// banners; then 300 m at 5 m/s with a note, a reminder, a photo with a caption, a voice memo, a video and
// a ride check, arrival, hold-to-stop, the leak and render budgets, and the replay with its stops and
// captions. Ends on the first walk's card. Alone: the shared page opens on Explore first.

const path = require('path');

async function checks(h) {
  const { BASE, browser, ctx, page, start, at, dLat, dLon, names, check, shot, toStop, pressedScale, metaOf, drawerTo, openInto, closeInto, tabBarShown, tiles, scriptsDir, onTab, walkMap, walkMarks, walkRoute, walkPts, routed } = h;
    // The ready bar pulled up (NR7, NV20-NV24): the choices, each saved as it changes.
    await onTab('navigate');
    await page.waitForSelector('[data-testid=ready-bar]');
    const barH = async () => Math.round((await page.locator('[data-testid=ready-bar]').boundingBox()).height);
    // The busy streets the walk map draws, by their lines (`data-busy`, "strips:N"): their names are the map's own text, and
    // on the walk maps only within 800 m of you (explore-dense-city DC1, DC18), so the lines say whether they are drawn.
    const busyLines = async () => Number(/strips:(\d+)/.exec((await walkMap().getAttribute('data-storefronts').catch(() => null)) ?? '')?.[1] ?? 0);
    const peekH = await barH();
    await drawerTo(page, 'half');
    check((await page.locator('[data-testid=mode-quiet]').count()) === 0 && (await page.locator('[data-testid=mode-explore]').count()) === 0
      && /Long-press the map/.test(await page.locator('[data-testid=start-settings]').innerText()) && (await page.locator('[data-testid=kind-churches]').count()) === 0
      && (await page.locator('[data-testid=notify-settings]').count()) === 1,
      'pulled up: no mode (decision 0234, MD2), the destination with its hint, reminders and alerts; no kinds in the drawer (NV20, NV21, NR7)');
    // The bar opens at rest each time Navigate opens (NR5).
    await onTab('chronicle');
    await onTab('navigate');
    await page.waitForSelector('[data-testid=ready-bar]');
    check((await barH()) === peekH && (await page.locator('[data-testid=start-settings]').count()) === 0, `the bar opens at rest each time (NR5: ${peekH} px)`);
    // Settings: a switch per kind, both on; the test notification is a real one (NT4, NT6).
    await drawerTo(page, 'half');
    const isOn = (id) => page.locator(`[data-testid=${id}] input`).isChecked();
    check((await isOn('notify-recall')) && (await isOn('notify-pause')), 'notifications: Remind me here and the pause reminder, both on by default (NT4)');
    check((await page.locator('[data-testid=pocket-alert]').count()) === (process.env.E2E_MOBILE ? 1 : 0),
      'the pocket alert is offered on a touch screen only, never on a desktop browser with nothing to buzz (PA6, pocket-alert-nudge audit 4)');
    await page.click('[data-testid=notify-test]');
    await page.waitForSelector('[data-testid=notify-sent]', { timeout: 10000 });
    const shownNotes = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => `${n.title}|${n.tag}`));
    check(shownNotes.includes('A memory from here|test'), `the test notification is shown through the service worker (${shownNotes.join(', ')}) (NT6)`);
    await shot(page, '00a-notify-settings');
    // A kind switched off stays off: saved as it changes, with no Done (NT4, NV22).
    await page.click('[data-testid=notify-pause]');
    await drawerTo(page, 'peek');
    await drawerTo(page, 'full');
    check((await isOn('notify-recall')) && !(await isOn('notify-pause')), 'a notification kind switched off stays off');
    await page.click('[data-testid=notify-pause]');
    // Places is on by default on the ready map: what I'm into and the range show, with the ring on this map (NV21, MD11); saved as they change (NV22).
    const ringNow = () => page.locator('[data-ring]').last().getAttribute('data-ring');
    await page.waitForTimeout(500);
    check((await page.locator('[data-testid=into-row]:visible').count()) === 1 && /^100[ \u00a0]m$/.test(await page.locator('[data-testid=range-value]').innerText()) && (await ringNow()) === '100',
      'with Places on (its default here), the row to what I’m into and the range show, the range drawn as a ring on this map (NV21, WI1, MD11)');
    await page.click('[data-testid=range-plus]');
    await page.waitForTimeout(400);
    check(/^120[ \u00a0]m$/.test(await page.locator('[data-testid=range-value]').innerText()) && (await ringNow()) === '120' && (await metaOf(page, 'explore_range')) === '120',
      'the ring redraws as the range changes, and the range is saved at once (NV22)');
    await page.click('[data-testid=range-minus]');
    await page.waitForTimeout(300);
    check((await metaOf(page, 'explore_range')) === '100', 'the range is saved as it changes (NV22)');
    await drawerTo(page, 'peek');
    await page.waitForTimeout(300);
    check((await ringNow()) === '', 'the ring goes with the bar down (NR7)');
    // There is no mode to open on (MD12).
    await page.reload();
    await page.waitForSelector('[data-testid=ready-bar]');
    await page.waitForTimeout(800);
    await drawerTo(page, 'half');
    check((await page.locator('[data-testid=mode-explore]').count()) === 0 && (await page.locator('[data-testid=into-row]:visible').count()) === 1, 'after a reload there is still no mode, and Places (on) shows the row (MD2, MD12)');
    await drawerTo(page, 'peek');
    // A long press on Navigate's map sets the destination, with its ring (NV23); Clear takes it away.
    {
      // After the reload, the map frames itself around the first fix: press once it has.
      await page.waitForTimeout(1500);
      const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
      await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 3);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.waitForSelector('[data-testid=ready-dest]', { timeout: 5000 }).catch(() => {});
      const line = await page.locator('[data-testid=ready-dest]').innerText().catch(() => '');
      check(/^To Your spot · \d+[ \u00a0]m away$/.test(line), `a long press on Navigate's map sets the destination, said on the bar with its distance (NV23, NR8: ${line})`);
      check(JSON.parse(await metaOf(page, 'nav')).walk_id === null, 'the destination is kept in meta nav, for no walk yet (NV22)');
      await shot(page, '00b-drawer-dest');
      await drawerTo(page, 'half');
      check(/Your spot · \d+[ \u00a0]m away/.test(await page.locator('[data-testid=drawer-dest]').innerText()), 'pulled up, the destination with its straight-line distance and Clear (NV20)');
      await page.click('[data-testid=dest-clear]');
      await page.waitForTimeout(300);
      check((await page.locator('[data-testid=drawer-dest]').count()) === 0 && !(await metaOf(page, 'nav')) && !(await metaOf(page, 'start_mode')), 'Clear takes the destination away; no mode is kept');
      await drawerTo(page, 'peek');
    }
    await shot(page, '00-home-empty');
    const held = await pressedScale(page, '[data-testid=start]');
    check(held.scale > 0.95 && held.scale < 0.99 && held.after === 1, `a large button presses down while held, and springs back (M4: ${held.scale.toFixed(3)} → ${held.after})`);
    // Start starts at once, in place (NV19, NV25, NR6).
    await page.click('[data-testid=start]');
    await page.waitForSelector('[data-testid=walk-actions]');
    check(new URL(page.url()).pathname === `${BASE}/walk` && !(await tabBarShown(page)), 'Start records on the walk screen over the tabs, the tab bar hidden (NV6, NV25, NR6)');
    // A fresh fix, as a phone's GPS gives one: the emulated position is otherwise re-sent with the time it was
    // read on Navigate, and a fix from before the walk began is dropped as stale (MAX_STALE_MS).
    await ctx.setGeolocation({ longitude: start[0], latitude: start[1] + 0.000002, accuracy: 6 });
    // Caught as it appears: the walk's one-time long-press hint (after 100 m), dismissed at once, must
    // leave no copy behind to be read out again (audit 5).
    const hintLoc = page.locator('[data-testid=lift-in]', { hasText: 'Press and hold the map' });
    const hintDismissed = hintLoc.waitFor({ timeout: 180000 }).then(async () => {
      await hintLoc.locator('[aria-label=Dismiss]').click();
      await page.waitForTimeout(60);
      return (await hintLoc.count()) === 0;
    }, () => null);
    await page.waitForTimeout(2500);
    await shot(page, '01-walk-start');

    // Explore (v1 slice 5). A walk starts quiet: no "?" marks, no busy streets, though its checklist
    // is read in the background (E1, E2, E9).
    const placesRead = () => page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['checklist_area', 'checklist_item'], 'readonly');
        const a = tx.objectStore('checklist_area').getAll();
        const i = tx.objectStore('checklist_item').getAll();
        tx.oncomplete = () => resolve({ areas: a.result, items: i.result });
      };
    }));
    let read = { areas: [], items: [] };
    for (let i = 0; i < 30 && !read.areas.length; i++) {
      await page.waitForTimeout(500);
      read = await placesRead();
    }
    const fox = read.areas.find((x) => x.name === 'Fox Point');
    check(fox && fox.count === 4 && read.items.filter((x) => x.area_key === fox.key).map((x) => x.name).sort().join(',') === 'Fox Point Museum,Gano Park,Hessian Memorial,Public art',
      `a quiet walk still builds its neighborhood's checklist, attractions only (${JSON.stringify(read.areas.map((x) => [x.name, x.count]))})`);
    check((await walkMarks().count()) === 0 && (await busyLines()) === 0, 'a quiet walk shows no "?" marks and no busy streets');
    // Settings, from the walk's options: the range previewed as a ring around you (E16, E20, E21).
    await page.click('[data-testid=walk-summary]');
    await page.waitForSelector('[data-testid=options-card]');
    check((await page.locator('[data-testid=explore-walk]').count()) === 0 && (await page.locator('[data-testid=options-card] [data-testid=layer-legend-places]').count()) === 0, 'Places starts off on a new walk, and there is no Explore switch (MD2, MD3)');
    // The range and what I’m into are in the drawer with Places off too (MD6); with Places on the ring shows while the drawer is up.
    check((await page.locator('[data-testid=range-slider]').count()) === 1, 'the drawer holds the range with Places off (MD6)');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await h.switchLayer(page, 'places');
    await page.click('[data-testid=walk-summary]');
    await page.waitForSelector('[data-testid=range-slider]');
    await page.waitForTimeout(500);
    check((await page.locator('[data-testid=options-card] [data-testid=range-slider]').count()) === 1, 'the range and what I’m into are in the walk\'s drawer');
    check(/^100[ \u00a0]m$/.test(await page.locator('[data-testid=range-value]').innerText()) && (await ringNow()) === '100', 'the range is 100 m by default, drawn as a ring on the walk map while settings are open');
    // tend map audit 43 (the review of tend map 21, F1): the other checks accept either space; this one holds that the
    // no-break space formatRange gives reaches the page, so the figure never ends a line apart from its unit.
    const rangeText = await page.locator('[data-testid=range-value]').evaluate((el) => el.textContent);
    check(rangeText === '100\u00a0m', `tend map audit 43: a distance on the page holds U+00A0 between its figure and unit (${JSON.stringify(rangeText)})`);
    await page.click('[data-testid=range-plus]');
    await page.waitForTimeout(300);
    check(/^120[ \u00a0]m$/.test(await page.locator('[data-testid=range-value]').innerText()) && (await ringNow()) === '120', 'the ring redraws as the range changes');
    await page.click('[data-testid=range-minus]');
    for (let i = 0; i < 6; i++) await page.click('[data-testid=range-minus]');
    check(/^60[ \u00a0]m$/.test(await page.locator('[data-testid=range-value]').innerText()), 'the range never goes under 60 m');
    for (let i = 0; i < 2; i++) await page.click('[data-testid=range-plus]');
    check((await page.locator('[data-testid=options-card] [data-testid=into-row]').count()) === 1 && (await page.locator('[data-testid=pocket-alert]').count()) === (process.env.E2E_MOBILE ? 1 : 0), 'the drawer holds the row to what I’m into; the pocket alert only on a touch screen (PA6, pocket-alert-nudge audit 4, WI1)');
    await shot(page, '01a-settings');
    // tend walk-screen audit 16 (the diff review's auditor, its call on 14): the motion row's "Turn on" is 44 pt itself; the
    // harness's motion is blocked, so the row is there.
    {
      const turnOn = await page.locator('[data-testid=motion-on]').boundingBox().catch(() => null);
      check(!!turnOn && turnOn.height >= 44, `tend walk-screen audit 16: the drawer's "Turn on" is 44 pt high (${JSON.stringify(turnOn)})`);
    }
    // tend walk-screen 10 (the sweep's auditor 1, ux 1; PL12, WCAG 2.4.6), kept as it still holds: the drawer's "On the map" heading
    // is only ever over its rows. Places is on for this walk here (switched on above), listed on every map since MD13.
    {
      const drawerText = await page.locator('[data-testid=options-card]').innerText();
      const heading = /On the map/.test(drawerText);
      const rows = await page.locator('[data-testid=options-card] [data-testid=layers-key]').count();
      check(heading && rows === 1, `tend walk-screen 10, MD13: the walk's "On the map" heads the key that lists Places, never an empty one (${JSON.stringify({ heading, rows })})`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    check((await ringNow()) === '', 'the ring is never on the walk map outside the drawer');
    // Motion (M7): banners lift in rather than pop, and a dismissed one leaves no copy behind (audit 5).
    const lifts = await page.evaluate(() => window.__lifts.map((l) => ({ animated: l.animated, text: l.el.innerText.slice(0, 40) })));
    check(lifts.some((l) => /On the web/.test(l.text) && l.animated), `a banner lifts in rather than popping (M7: ${JSON.stringify(lifts.slice(0, 3))})`);


    // Leaks (the owner's iPhone tab crashed mid-walk): nothing may pile up while walking.
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    const leakSample = async () => {
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      const mm = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
      return { bodyDivs: await page.evaluate(() => document.body.children.length), listeners: mm.JSEventListeners, nodes: mm.Nodes };
    };
    // One live map during a walk: the home's is taken down while it isn't on screen (perf, Nov 1).
    check((await page.locator('canvas.maplibregl-canvas').count()) === 1, 'only the walk\u2019s map is live during a walk');
    const leak0 = await leakSample();
    const perf0 = await page.evaluate(() => ({ ...window.__perf }));
    const perfT0 = Date.now();

    // Walk 300 m at 5 m/s, one fix a second (the fix filter rejects anything over 7 m/s).
    const route = walkRoute;
    const pts = walkPts;
    const dotMoves = [];
    // N12: recording, pause, captures and the fog's streets go on while navigating to the "?" (from k 28).
    const navOn = async () => (await page.locator('[data-testid=nav-bar]').count()) === 1;
    const walkedM = async () => Number(/ · (\d+)[ \u00a0]m$/.exec(await page.locator('text=/ · \\d+[ \\u00a0]m$/').first().innerText())?.[1]);
    const n12 = {};
    let dotLast = null;
    for (let k = 0; k < pts.length; k++) {
      await ctx.setGeolocation({ longitude: pts[k][0], latitude: pts[k][1], accuracy: 6 });
      await page.waitForTimeout(1000);
      if (k === 10) {
        // A memo can be thrown away instead of saved.
        await page.click('[data-testid=cap-voice]');
        await page.waitForSelector('[data-testid=voice-discard]');
        await page.waitForTimeout(1500);
        await shot(page, '02-voice-recording');
        check(await page.evaluate(() => navigator.audioSession.type) === 'play-and-record', 'recording a memo switches the page to record');
        await page.click('[data-testid=voice-discard]');
        await page.waitForSelector('[data-testid=voice-undo]');
        await page.waitForTimeout(500);
        check(await page.evaluate(() => navigator.audioSession.type) === 'playback', 'after the memo, sound plays even in silent mode again');
        check((await page.locator('[aria-label^="Voice memo"]').count()) === 0, 'a discarded voice memo is not kept');
        await page.click('[data-testid=voice-undo]');
        await page.waitForSelector('text=/Voice memo discarded/', { state: 'detached' });
        await page.waitForTimeout(2500);
        check((await page.locator('[aria-label^="Voice memo, "][aria-label$=". Open"]').count()) === 1, 'undo brings a discarded memo back');
        // A tap and an immediate save is an accidental tap: not kept, and said so.
        await page.click('[data-testid=cap-voice]');
        await page.waitForSelector('[data-testid=voice-save]');
        await page.click('[data-testid=voice-save]');
        await page.waitForSelector('text=Too short, not kept');
        check(true, 'a memo under a second is not kept, and the walker is told');
        // Walking, there is no Stop to tap by accident (decision 0220): Pause comes first.
        check((await page.locator('[data-testid=stop]').count()) === 0 && (await page.locator('[data-testid=pause-walk]').count()) === 1,
          '0220: while walking the strip has Pause and no Stop');
      }
      if (k === 6) {
        // Places on, for this walk (decision 0234): the busy streets are the Storefronts layer's, as information (E2, S21).
        await page.click('[data-testid=walk-summary]');
        await page.waitForSelector('[data-testid=options-card]');
        await shot(page, '01c-options');
        // Without motion (headless Chromium sends no samples), the walk goes on and says so (MO2).
        check((await page.locator('[data-testid=motion-off]').count()) === 1, 'without motion, the walk\u2019s options say standing still may drift (MO2)');
        // The GPS log goes to the share sheet with every raw reading (the GPS log, Nov 1).
        await page.evaluate(() => { navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; });
        await page.waitForTimeout(500);
        await page.click('[data-testid=share-gps-log]');
        const shared = await page.waitForFunction(() => window.__shared, null, { timeout: 5000 }).then((h) => h.jsonValue()).catch(() => null);
        const rows = shared?.text?.split('\n') ?? [];
        check(rows[0]?.startsWith('# Chronicles GPS log') && rows.includes('s,lat,lon,accuracy_m,speed_ms,course') && rows.filter((r) => /^\d+\.\d,/.test(r)).length >= 5, `the walk's options share its GPS log (${rows.length} lines)`);
        await page.click('[data-testid=walk-summary]');
        // The quiet read kept no busy streets (the owner's call); switching Explore on reads them at once. They are drawn only when
        // the Busy streets layer is on, on any walk (specs/map-layers ML8, ML10): Explore mode no longer draws them by itself.
        check((await busyLines()) === 0, 'ML10: Places on does not draw the busy streets by itself');
        await h.switchLayer(page, 'storefronts');
        await page.waitForFunction(() => [...document.querySelectorAll('.maplibregl-map')].some((m) => /strips:[1-9]/.test(m.dataset.storefronts ?? '')), null, { timeout: 15000 }).catch(() => {});
        check((await busyLines()) >= 1, 'ML8: with the Busy streets layer on, the busy streets around are drawn');
        // AD12: the busy streets draw graded, each grade wider than the one below.
        const graded = ((await walkMap().getAttribute('data-graded')) ?? '').split(',').filter(Boolean).map((g) => g.split(':').map(Number));
        const widths = graded.sort((a, b) => a[0] - b[0]).map((g) => g[1]);
        check(graded.length >= 2 && graded.some((g) => g[0] === 3) && widths.every((w, i) => i === 0 || w > widths[i - 1]),
          `AD12: the walk map draws the busy streets in grades, wider as the grade rises (${JSON.stringify(graded)})`);
      }
      if (k === 8) {
        // 75 m from the memorial: inside the 100 m range, a "?" that doesn't say what it is (E6).
        check((await walkMarks().count()) === 1 && (await page.locator('[aria-label="A place to find. Open"]').count()) === 1, 'a "?" shows for a place within range, and only that one');
      }
      if (k === 18 || k === 32) {
        // The cone as drawn points the way the walk goes: east on the first leg, north on the second
        // (heading 5; the owner walked north and the cone said east, Nov 3). Read a few fixes after the
        // steps that stop for a capture: the dot holds while fixes come late, and the cone hides with it.
        const cone = await page.locator('[data-testid=walker-puck] [data-cone]').evaluate((el) => ({ shown: el.style.display !== 'none', t: el.style.transform }));
        const deg = Number(/rotate\(([-\d.]+)deg\)/.exec(cone.t)?.[1]);
        const want = k === 18 ? 90 : 0;
        const off = Math.abs((((deg - want) % 360) + 540) % 360 - 180);
        check(cone.shown && off <= 20, `heading 5: the cone points ${k === 18 ? 'east' : 'north'} as the walk goes (${cone.shown ? cone.t : 'hidden'})`);
      }
      if (k >= 16 && k <= 20) {
        // The dot moves on every fix, not every 2 s with the trace (the live dot, Nov 1).
        const at = await page.locator('[data-testid=walker-puck]').getAttribute('data-at');
        if (k > 16) dotMoves.push(at !== dotLast);
        dotLast = at;
        if (k === 20) check(dotMoves.length === 4 && dotMoves.every(Boolean), `the dot moves on every fix, as it comes (${dotMoves.join(',')})`);
      }
      if (k === 13) {
        // The live walk's dot is one gliding marker; the layers stay empty for it.
        check((await page.locator('[data-testid=walker-puck]').count()) === 1 && (await page.locator('[data-testid=walker-puck] svg').count()) === 2, 'the walker is one gliding marker, dot and cone');
        // Within 60 m, the memorial's "?" shows what it is (E7).
        check((await page.locator('[aria-label="Hessian Memorial, History. Open"]').count()) === 1, 'a "?" shows its name and category within 60 m');
      }
      if (k === 15) {
        // The camera takes video too. The web caps clips at 15 s; a longer one is turned away.
        const fixtures = path.join(scriptsDir, 'fixtures');
        let [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-testid=cap-photo]')]);
        await chooser.setFiles(path.join(fixtures, 'clip-20s.webm'));
        await page.waitForSelector('text=/Videos can be up to 15 seconds/');
        check(true, 'a video over the web limit is turned away');
        // TC3: a capture near a place finds nothing by itself; tapping the place and "Capture here" arms it.
        check((await page.locator('[aria-label="Found: Hessian Memorial, History"]').count()) === 0, 'TC1: nothing is found by being near a place');
        // tend walk-screen audit 15 (the diff review's ux 6): whether the offer stands before the place is armed, for after Cancel.
        const offerBefore = (await page.locator('[data-testid=add-to-moment]').filter({ visible: true }).count()) > 0;
        await page.locator('[aria-label="Hessian Memorial, History. Open"]').first().click();
        await page.waitForSelector('[data-testid=mark-capture]', { timeout: 5000 });
        await shot(page, '02a-place-card');
        await page.click('[data-testid=mark-capture]');
        await page.waitForSelector('[data-testid=armed-line]', { timeout: 5000 });
        const armedSaid = await page.locator('[data-testid=armed-line]').innerText();
        await page.waitForTimeout(800);
        await shot(page, '02b-armed');
        // tend walk-screen 13 (the sweep's ux 4): while a place is armed its line speaks for the next capture, so the
        // Add to this moment offer, which would join the open moment instead, steps aside (one transient at a time; H4).
        check((await page.locator('[data-testid=add-to-moment]').filter({ visible: true }).count()) === 0,
          'tend walk-screen 13: the Add to this moment offer is hidden while a place is armed');
        const lineBox = await page.locator('[data-testid=armed-line]').boundingBox();
        const cancelBox = await page.locator('[data-testid=armed-cancel]').boundingBox();
        check(!!lineBox && !!cancelBox && cancelBox.width < lineBox.width - 60 && cancelBox.height >= 44, `tap-to-capture-places ui 1: Cancel is a button at its own width, not the whole line (${Math.round(cancelBox?.width ?? 0)} of ${Math.round(lineBox?.width ?? 0)})`);
        check(/The next moment is about Hessian Memorial/.test(armedSaid) && (await page.locator('[data-testid=mark-card]').count()) === 0, `TC3: Capture here closes the card and says whom the next moment is about (${armedSaid.replace(/\n/g, ' ')})`);
        // tend walk-screen audit 15: Cancel gives the offer back as it stood, then the place is armed again for the capture below.
        await page.click('[data-testid=armed-cancel]');
        await page.waitForSelector('[data-testid=armed-line]', { state: 'detached', timeout: 5000 }).catch(() => {});
        const offerAfter = await page.locator('[data-testid=add-to-moment]').filter({ visible: true }).first().waitFor({ timeout: 4000 }).then(() => true, () => false);
        check(offerBefore && offerAfter, `tend walk-screen audit 15: after Cancel the Add to this moment offer is back (${JSON.stringify({ offerBefore, offerAfter })})`);
        await page.locator('[aria-label="Hessian Memorial, History. Open"]').first().click();
        await page.waitForSelector('[data-testid=mark-capture]', { timeout: 5000 });
        await page.click('[data-testid=mark-capture]');
        await page.waitForSelector('[data-testid=armed-line]', { timeout: 5000 });
        [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-testid=cap-photo]')]);
        await chooser.setFiles(path.join(fixtures, 'clip-4s.webm'));
        await page.waitForSelector('text=Video saved here');
        // Within ~30 m at walking zoom, the video shares a pin with the memo. The pins regroup a moment after
        // the save; a fixed 2.5 s wait read the label too early on the /chronicles build (Nov 4 deploy).
        // The memo and the video are kept 25-30 m apart, whichever fix the memo began on; pins share when within
        // 44 px at the zoom shown (rounded to a half step, `useZoomPins`). So the pins are held to that rule: one shared
        // pin when the two are that close, two pins when they are not (the journey's timing decides which).
        const kept = await page.evaluate(() => new Promise((resolve) => {
          const req = indexedDB.open('chronicles');
          req.onsuccess = () => {
            const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
            g.onsuccess = () => resolve(g.result.filter((m) => m.pieces.some((p) => p.kind === 'voice' || p.kind === 'video')).map((m) => ({ kind: m.pieces[0].kind, lat: m.lat, lon: m.lon })));
          };
        }));
        const zoomShown = await page.evaluate(() => Number([...document.querySelectorAll('[data-zoom]')].at(-1)?.getAttribute('data-zoom') ?? NaN));
        const memo = kept.find((m) => m.kind === 'voice');
        const video = kept.find((m) => m.kind === 'video');
        const apartM = memo && video && memo.lat != null && video.lat != null ? h.distanceM([memo.lon, memo.lat], [video.lon, video.lat]) : null;
        const half = Math.round(zoomShown * 2) / 2;
        const reachM = (44 * 40_075_016.686 * Math.cos((Math.round(memo?.lat ?? 42) * Math.PI) / 180)) / (512 * 2 ** half);
        // Wait for the state the rule expects (the pins regroup a moment after the save), never longer than needed.
        const expectShared = apartM == null || apartM <= reachM;
        await page.waitForFunction((one) => {
          const labels = [...document.querySelectorAll('.maplibregl-map [aria-label$=". Open"]')].map((e) => e.getAttribute('aria-label'));
          return one ? labels.some((l) => /^A voice memo and a video, .+\. Open$/.test(l)) : labels.some((l) => /^Voice memo, .+\. Open$/.test(l)) && labels.some((l) => /^Video, .+\. Open$/.test(l));
        }, expectShared, { timeout: 10000 }).catch(() => {});
        // tend map T14: the shared pin names its kinds in words with the minutes in, never "2 captures here".
        const shared = (await page.$$eval('.maplibregl-map [aria-label$=". Open"]', (es) => es.map((e) => e.getAttribute('aria-label')))).filter((l) => /^A voice memo and a video, (at the start|.+ minutes? in)\. Open$/.test(l)).length === 1;
        const pinsAfter = await page.$$eval('.maplibregl-map [aria-label$=". Open"]', (es) => es.map((e) => e.getAttribute('aria-label')));
        // tend map T28: a pin of one moment says its minutes too ("Voice memo, twelve minutes in. Open").
        const one = (kind) => pinsAfter.some((l) => new RegExp(`^${kind}, (at the start|.+ minutes? in)\\. Open$`).test(l));
        const twoPins = one('Voice memo') && one('Video');
        const fair = apartM == null ? shared : apartM <= reachM ? shared : twoPins;
        check(fair, `a short video is kept, sharing a pin with the memo when within the pins' reach (${apartM?.toFixed(1)} m apart, ${reachM.toFixed(1)} m reach at z${zoomShown}: ${pinsAfter.join(' / ')})`);
        // The video is taken about 40 m from the memorial, after "Capture here" on it: it finds it (TC4).
        await page.waitForTimeout(500);
        // tend walk-screen audit 11 (the owner, Nov 14): the found pin is said with the kind of the moment that found it.
        const foundSaid = await page.$$eval('.maplibregl-map [aria-label^="Found"]', (es) => es.map((e) => e.getAttribute('aria-label')));
        check(foundSaid.length === 1 && foundSaid[0] === 'Found with a video: Hessian Memorial, History',
          `a capture within 60 m finds the place, which stays drawn as found; tend walk-screen audit 11: said "Found with a video: Hessian Memorial, History" (${JSON.stringify(foundSaid)})`);
        // tend walk-screen 9 (decision 0172, O26): the found place's pin wears the kept moment's own glyph, here the video's,
        // where it wore a tick (a checklist's "done"); its spoken name is as before. Pictured close at 390 and 320.
        const foundPin = page.locator('[aria-label="Found with a video: Hessian Memorial, History"]');
        const glyphs = async () => foundPin.first().evaluate((e) => [...e.querySelectorAll('[data-testid^=found-kind-]')].map((g) => g.getAttribute('data-testid'))).catch(() => null);
        const closeUp = async (name) => {
          const b = await foundPin.first().boundingBox();
          const vw = page.viewportSize();
          if (b && process.env.E2E_SHOTS) {
            const x = Math.max(0, b.x - 70);
            const y = Math.max(0, b.y - 50);
            await page.screenshot({ path: path.join(process.env.E2E_SHOTS, `${name}.png`), clip: { x, y, width: Math.min(180, vw.width - x), height: Math.min(140, vw.height - y) } });
          }
          await shot(page, `${name}-screen`);
        };
        const kinds390 = await glyphs();
        await closeUp('03h-found-pin-390');
        await page.setViewportSize({ width: 320, height: 700 });
        await page.waitForTimeout(800);
        const kinds320 = await glyphs();
        await closeUp('03h-found-pin-320');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(800);
        check(JSON.stringify(kinds390) === '["found-kind-videocam"]' && JSON.stringify(kinds320) === '["found-kind-videocam"]',
          `tend walk-screen 9: the found place's pin shows the video's glyph, the moment that found it, in place of a tick (${JSON.stringify({ kinds390, kinds320 })})`);
        const seenEnters = await page.evaluate(() => window.__enters.map((e) => ({ kind: e.kind, animated: e.animated, label: e.label })));
        check(seenEnters.some((e) => e.kind === 'pulse' && e.animated && /^Found( with a \w+)?: Hessian/.test(e.label)), 'a find pulses once from its pin (M12)');
        check(seenEnters.some((e) => e.kind === 'flip' && e.animated), 'a revealed "?" turns into its place, on its way to being found (M11)');
        check((await page.locator('[data-testid=armed-line]').count()) === 0, 'TC4: arming clears after the capture');
        // tend walk-screen 13: with the arming spent, the offer is back for the moment the video began.
        check(await page.locator('[data-testid=add-to-moment]').filter({ visible: true }).first().waitFor({ timeout: 4000 }).then(() => true, () => false),
          'tend walk-screen 13: the Add to this moment offer returns once the arming clears');
      }
      if (k === 25) {
        await page.click('[data-testid=cap-note]');
        await page.fill('[data-testid=note-input]', 'The bakery smelled of cardamom.');
        await page.click('[data-testid=note-done]');
        await page.waitForTimeout(2500);
        check((await page.locator('[aria-label^="Note, "][aria-label$=". Open"], .maplibregl-map button[data-ids*=","]:not([data-testid=memory-pin])').count()) >= 1, 'the note is pinned on the map');
        await shot(page, '03-walking');
        // What happened here: a long press near where the note was taken (the
        // map follows the walker, so near the map's center) shows it. A plain
        // tap there does nothing.
        // The home map stays mounted under the walk screen; the walk's map is the last.
        const box = await page.locator('canvas.maplibregl-canvas').last().boundingBox();
        // Beside the pin (whose tap area covers the spot itself): ~27 m away at this zoom. The memorial's
        // found pin sits here too; it lets taps through to the map and the capture (audit, UI).
        const spot = { x: box.x + box.width / 2 + 30, y: box.y + box.height / 2 + 10 };
        await page.mouse.click(spot.x, spot.y);
        await page.waitForTimeout(800);
        check((await page.getByText('What happened here').count()) === 0 && (await page.getByText('Nothing captured here yet').count()) === 0, 'a plain tap on the walk map does nothing');
        await page.mouse.move(spot.x, spot.y);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
        // The press sheet offers Route here (it was Go here), and what happened here when captures are near.
        check(((await page.locator('[data-testid=go-here]').first().innerText().catch(() => '')).trim()) === 'Route here', 'OM13: the walk screen\'s press sheet says "Route here", not "Go here"');
        // tend walk-screen 15 (the sweep's steward 1): the button says what it opens, never how many (counts are words, 0052).
        const hereSaid = (await page.locator('[data-testid=here-open]').first().innerText().catch(() => '')).trim();
        check(hereSaid === 'What happened here' && !/\d/.test(hereSaid), `tend walk-screen 15: the spot card's button reads "What happened here", with no count (${hereSaid})`);
        await page.click('[data-testid=here-open]');
        // tend walk-screen audit 14 (the diff review's auditor 4): the viewer's own control, not the words the button shares.
        const viewerOpen = await page.locator('[data-testid=viewer-close]').filter({ visible: true }).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
        check(viewerOpen && (await page.locator('[data-testid=here-open]').filter({ visible: true }).count()) === 0,
          'tend walk-screen audit 14: What happened here opens the viewer, and the spot card is gone');
        // The note may share the spot with the video nearby: step to it.
        for (let i = 0; i < 4 && !(await page.getByText('The bakery smelled of cardamom.').count()); i++) {
          if (!(await page.locator('[aria-label="Next moment"]').count())) break;
          await page.click('[aria-label="Next moment"]');
          await page.waitForTimeout(300);
        }
        check((await page.getByText('The bakery smelled of cardamom.').count()) > 0, 'a long press on the map shows what happened there');
        check(!(await page.locator('[data-testid=viewer-remind]').isVisible().catch(() => false)) && !(await page.locator('[data-testid=viewer-go]').isVisible().catch(() => false)),
          'UC9: the viewer\'s top bar holds Close and More only; Remind me here and Go here wait in More');
        // Remind me here, from the viewer: once by default, with an optional end (R1).
        await page.click('[data-testid=viewer-more]');
        await page.waitForTimeout(300);
        await shot(page, '03b-viewer-more');
        await page.click('[data-testid=viewer-remind]');
        await page.waitForSelector('[data-testid=remind-editor]');
        // tend explore 18 (decision 0172, O9; ui-patterns matrix 15): How often and Until are two labelled menus, each
        // button one line at 390 and 320 px, each opening the chips' choices in their order with the chosen one checked.
        const remindMenus = [];
        const remindLong = [];
        for (const w of [390, 320]) {
          await page.setViewportSize({ width: w, height: 844 });
          await page.waitForTimeout(400);
          const sfx = w === 390 ? '' : `-${w}`;
          // Whole, on one line: never cut short by its ellipsis, never wrapped.
          const button = async (id) => page.locator(`[data-testid=remind-${id}-text]`).evaluate((t) => {
            const lh = parseFloat(getComputedStyle(t).lineHeight) || parseFloat(getComputedStyle(t).fontSize) * 1.3;
            return { text: t.textContent, oneLine: t.getBoundingClientRect().height < lh * 1.6 && t.scrollWidth <= t.clientWidth + 1, h: t.parentElement.getBoundingClientRect().height };
          });
          const often = await button('often');
          const until = await button('until');
          await shot(page, `03a-remind${sfx}`);
          const menu = async (id, shotName) => {
            await page.click(`[data-testid=remind-${id}]`);
            await page.waitForSelector(`[data-testid=remind-${id}-menu]`);
            await page.waitForTimeout(200);
            await shot(page, shotName);
            const items = await page.locator(`[data-testid=remind-${id}-menu] [role=radio]`).evaluateAll((els) => els.map((e) => [e.firstElementChild.textContent, e.getAttribute('aria-checked')]));
            // (Its label alone: the checkmark is an icon font's glyph.)
            const inView = await page.locator(`[data-testid=remind-${id}-menu]`).evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; });
            // A tap outside closes the menu and keeps the choice.
            await page.mouse.click(4, 4);
            const closed = await page.waitForSelector(`[data-testid=remind-${id}-menu]`, { state: 'detached', timeout: 3000 }).then(() => true, () => false);
            return { items, inView, closed };
          };
          const oftenMenu = await menu('often', `03d-remind-often${sfx}`);
          const untilMenu = await menu('until', `03e-remind-until${sfx}`);
          remindMenus.push({ w, often, until, oftenMenu, untilMenu, editorOpen: await page.locator('[data-testid=remind-editor]').count() === 1 });
          if (w === 320) {
            // tend explore audit 20 (the review's U1): the longest choices show whole on the button at 320 px, then back to Once.
            for (const id of ['weekly', 'monthly', 'once']) {
              await page.click('[data-testid=remind-often]');
              await page.click(`[data-testid=remind-${id}]`);
              await page.waitForSelector('[data-testid=remind-often-menu]', { state: 'detached', timeout: 3000 }).catch(() => null);
              if (id !== 'once') remindLong.push(await button('often'));
              if (id === 'monthly') await shot(page, '03a-remind-monthly-320');
            }
          }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400);
        check(remindLong.length === 2 && remindLong[0].text === 'How often: Weekly at most' && remindLong[1].text === 'How often: Monthly at most' && remindLong.every((b) => b.oneLine),
          `tend explore audit 20: "How often: Weekly at most" and "How often: Monthly at most" show whole, on one line, at 320 px (${JSON.stringify(remindLong)})`);
        const sameItems = (got, want) => JSON.stringify(got.map(([t]) => t)) === JSON.stringify(want) && got.filter(([, c]) => c === 'true').map(([t]) => t).join() === want[0];
        const menusOk = remindMenus.every((m) => m.often.text === 'How often: Once' && m.until.text === 'Until: No end' && m.often.oneLine && m.until.oneLine && m.often.h >= 44 && m.until.h >= 44
          && sameItems(m.oftenMenu.items, ['Once', 'Every visit', 'Weekly at most', 'Monthly at most']) && sameItems(m.untilMenu.items, ['No end', '1 month', '3 months', '1 year'])
          && m.oftenMenu.inView && m.untilMenu.inView && m.oftenMenu.closed && m.untilMenu.closed && m.editorOpen);
        check(menusOk, `tend explore 18: remind me here is two labelled menus, "How often: Once" and "Until: No end", one line each at 390 and 320 px, opening the chips' choices in order, the default checked (${JSON.stringify(remindMenus)})`);
        // Every pin element as it stands, to see that the bell redraws it in place (reminder-bell audit 3, 4).
        await page.evaluate(() => document.querySelectorAll('[data-ids]').forEach((e) => { e.__beforeBell = true; }));
        await page.click('[data-testid=remind-save]');
        await page.waitForSelector('[data-testid=capture-meta] >> text=/Reminder set/');
        // The walk screen keeps two viewers mounted; the one open is the one whose line says it.
        const reminderSaid = (await page.locator('[data-testid=capture-meta]:has-text("Reminder set")').count()) > 0 && (await page.locator('[data-testid=viewer-pill]').count()) === 0;
        check(reminderSaid, 'UC10, UC12: a set reminder says so in the info line, with no pill');
        await shot(page, '03c-reminder-set');
        await page.setViewportSize({ width: 320, height: 844 });
        await page.waitForTimeout(400);
        await shot(page, '03c-reminder-set-320');
        // tend explore audit 21 (the review's U2): Add to this moment's row has its own space above the note's page,
        // never over its title (ui-patterns T7: a control may not float over content).
        const addOverTitle = await page.evaluate(() => {
          const shown = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility !== 'hidden';
          const row = [...document.querySelectorAll('[data-testid=viewer-add]')].find(shown);
          const reader = [...document.querySelectorAll('[data-testid=note-reader]')].find(shown);
          if (!row || !reader) return { row: !!row, reader: !!reader };
          const a = row.getBoundingClientRect();
          const b = reader.getBoundingClientRect();
          return { row: true, reader: true, rowBottom: Math.round(a.bottom), pageTop: Math.round(b.top), clear: a.bottom <= b.top + 0.5 };
        });
        check(addOverTitle.clear === true, `tend explore audit 21: at 320 px the Add to this moment row sits above the note's page, not over its title (${JSON.stringify(addOverTitle)})`);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400);
        // The map behind the open viewer already wears the bell, on the same element (RB5, audit 3, 4).
        await page.waitForSelector('[data-ids] [data-testid=pin-reminder]', { timeout: 5000 }).catch(() => null);
        const keptOnSave = await page.locator('[data-ids]:has([data-testid=pin-reminder])').evaluateAll((els) => els.length === 1 && els[0].__beforeBell === true);
        check(keptOnSave, 'reminder-bell audit 3: the bell redraws the same pin element in place, so focus can return to it and a photo keeps its picture (audit 4)');
        // Stop from the viewer takes the bell off at once (RB5), then set again for the walk ahead.
        await page.click('[data-testid=viewer-more]');
        await page.click('[data-testid=viewer-remind]');
        await page.click('[data-testid=remind-stop]');
        await page.waitForFunction(() => ![...document.querySelectorAll('[data-testid=capture-meta]')].some((e) => /Reminder set/.test(e.textContent ?? '')), null, { timeout: 5000 });
        const metaCopies = await page.locator('[data-testid=capture-meta]').count();
        check(metaCopies === 1, `ui-conformance audit 1: closing the reminder editor leaves no stale copy of the moment behind (${metaCopies} info lines)`);
        await page.waitForFunction(() => !document.querySelector('[data-testid=pin-reminder]'), null, { timeout: 5000 }).catch(() => null);
        const bellsAfterStop = await page.locator('[data-testid=pin-reminder]').count();
        check(bellsAfterStop === 0, `Stop reminding me takes the pin's bell off at once (RB5: ${bellsAfterStop} bells)`);
        await page.click('[data-testid=viewer-more]');
        await page.click('[data-testid=viewer-remind]');
        await page.click('[data-testid=remind-save]');
        await page.waitForSelector('[data-testid=capture-meta] >> text=/Reminder set/');
        await page.click('[aria-label="Close"]');
        // Its pin wears the bell at once, top right, and says so (RB1, RB5, RB7).
        const belled = await page.waitForSelector('[data-ids] [data-testid=pin-reminder]', { timeout: 5000 }).then(() => true, () => false);
        const bellPin = page.locator('[data-ids]:has([data-testid=pin-reminder])');
        const bellLabel = belled ? await bellPin.first().getAttribute('aria-label') : '';
        const bellSide = belled ? await bellPin.first().evaluate((el) => {
          const b = el.querySelector('[data-testid=pin-reminder]').getBoundingClientRect();
          const r = el.getBoundingClientRect();
          return b.left + b.width / 2 > r.left + r.width / 2 ? 'right' : 'left';
        }) : '';
        check(belled && (await bellPin.count()) === 1 && /reminder set/.test(bellLabel) && bellSide === 'right',
          `the reminded note's pin wears a bell, top right, and says so (RB1, RB5, RB7: ${await bellPin.count()} belled, "${bellLabel}", ${bellSide})`);
        await shot(page, '03b-bell');
      }
      if (k === 28) {
        // Go here on a "?" routes to it, unnamed until it is revealed (E12).
        await page.locator('[aria-label="A place to find. Open"]').first().click();
        await page.waitForSelector('[data-testid=mark-card]');
        check(/A place to find/.test(await page.locator('[data-testid=mark-card]').innerText()), 'an unrevealed place’s card does not say what it is');
        await page.click('[data-testid=mark-go]');
        await routed(page, 30000);
        check(/· A place to find$/.test(await page.locator('[data-testid=nav-left]').innerText()), 'going to a place says "A place to find" until it is revealed');
        n12.fromM = await walkedM();
        // On the way (E22): nothing else is in range of this short route, so no faint marks beyond the target.
        check((await page.locator('[aria-label="A place on the way. Open"]').count()) === 0, 'no faint marks where nothing lies along the route');
      }
      if (k === 30) {
        n12.photo = await navOn();
        // A photo, then the opt-in caption.
        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-testid=cap-photo]')]);
        await chooser.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
        // Its pin drops in (M10): the photo's own pin, moving as it appears, and gone back to a plain pin after.
        const before = await page.evaluate(() => window.__enters.length);
        await page.waitForFunction((n) => window.__enters.slice(n).some((e) => e.kind === 'drop'), before, { timeout: 5000 }).catch(() => {});
        const photoId = (await page.evaluate(() => new Promise((resolve) => {
          const req = indexedDB.open('chronicles');
          req.onsuccess = () => {
            const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
            g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).filter((c) => c.kind === 'photo').sort((a, b) => b.t - a.t)[0]?.id ?? null);
          };
        })));
        const drops = await page.evaluate((n) => window.__enters.slice(n).filter((e) => e.kind === 'drop').map((e) => ({ animated: e.animated, ids: e.ids })), before);
        // A small copy is kept with it (TH1): stored on the capture, decodable, at most 240 px. Polled: it
        // is made after the capture is kept, in its own time (TH2).
        const readThumb = (id) => page.evaluate((id) => new Promise((resolve) => {
          const req = indexedDB.open('chronicles');
          req.onsuccess = () => {
            const db = req.result;
            const g = db.transaction('moment', 'readonly').objectStore('moment').get(id);
            g.onsuccess = () => {
              const path = g.result?.pieces?.[0]?.thumb_path;
              if (!path) return resolve({ path: null });
              const stores = [...db.objectStoreNames].filter((n) => /media/.test(n));
              const m = db.transaction(stores[0], 'readonly').objectStore(stores[0]).get(path);
              m.onsuccess = async () => {
                const blob = m.result instanceof Blob ? m.result : m.result?.blob;
                if (!blob) return resolve({ path, size: null });
                const bmp = await createImageBitmap(blob);
                resolve({ path, w: bmp.width, h: bmp.height });
              };
              m.onerror = () => resolve({ path, size: null });
            };
          };
        }), id);
        let thumb = await readThumb(photoId);
        for (let i = 0; i < 20 && !thumb.w; i++) {
          await page.waitForTimeout(250);
          thumb = await readThumb(photoId);
        }
        n12.photoKept = !!photoId;
        check(!!thumb.path && Math.max(thumb.w, thumb.h) <= 240 && Math.max(thumb.w, thumb.h) >= 100,
          `a new photo keeps a small copy beside it (TH1: ${JSON.stringify(thumb)})`);
        await page.waitForTimeout(600);
        const lingering = await walkMap().locator('[data-testid=enter-drop]').count();
        check(drops.some((d) => d.animated && d.ids.split(',').includes(photoId)) && lingering === 0,
          `the new photo's own pin drops in, then is a plain pin again (M10, audit 3, 4: ${JSON.stringify(drops)}, ${lingering} left)`);
        // The Edit offer (ME23), then its Text tool: the caption.
        await page.click('[data-testid=capture-edit]');
        await page.click('[data-testid=edit-tool-text]');
        await page.fill('[data-testid=caption-input]', 'Mural on Wickenden');
        await page.waitForTimeout(400);
        await shot(page, '03b-caption');
        await page.click('[data-testid=edit-done]');
        await page.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 10000 });
        check(true, 'a photo can take a caption');
      }
      if (k === 33) {
        // Pause: positions sent while paused are not recorded, and the clock stops.
        n12.pause = await navOn();
        n12.grewM = (await walkedM()) - n12.fromM;
        // Decision 0220 (AllTrails' pattern; amends O27 and tend walk-screen 7, audit 9; the owner's AllTrails look, fix
        // walk-strip-buttons): walking, … and a wide Pause fill what the numbers leave; paused, Resume and a held Stop, half
        // each, words only, no …. Pills with no outline, 48 high. At 390 and 320 every word whole, on screen, strip 69 high;
        // with an hour-long walk's numbers too (fix walk-strip-buttons audit 1: the numbers set in the page, then measured
        // in the same task, before the clock's next tick writes them back).
        const strip = (longStats = null, keep = false) => page.evaluate(([longStats, keep]) => {
          const q = (id) => document.querySelector(`[data-testid=${id}]`);
          const main = q('pause-walk') ?? q('resume-walk');
          const more = q('strip-more');
          const hold = q('stop');
          const stats = q('walk-stats');
          const bar = q('walk-bar');
          if (!main || !stats) return null;
          const statsText = stats.querySelector('div') ?? stats;
          // React keeps its own copy of the numbers: they are put back below, or a paused clock never redraws them.
          const was = statsText.textContent;
          if (longStats) statsText.textContent = longStats;
          const oneLine = (el) => {
            const r = document.createRange();
            r.selectNodeContents(el);
            const lines = new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
            return lines.size === 1 && el.scrollWidth <= el.clientWidth + 1;
          };
          const leaf = (root) => [...root.querySelectorAll('div')].filter((d) => !d.querySelector('div') && d.innerText.trim());
          const wordOf = (root) => leaf(root).find((d) => /[A-Za-z]/.test(d.innerText));
          // Whole: the word's full text (a range over it, not clipped by an ellipsis) fits the box it is drawn in, and that box
          // sits inside its pill. scrollWidth missed a cut "Resu…" here (fix walk-strip-buttons audit 7's picture).
          const inside = (root) => {
            const el = wordOf(root);
            if (!el) return false;
            const r = document.createRange();
            r.selectNodeContents(el);
            const text = r.getBoundingClientRect().width;
            const w = el.getBoundingClientRect();
            const b = root.getBoundingClientRect();
            return text <= w.width + 0.5 && w.left >= b.left - 0.5 && w.right <= b.right + 0.5;
          };
          const pill = (el) => {
            const cs = getComputedStyle(el);
            const h = el.getBoundingClientRect().height;
            return ['Top', 'Right', 'Bottom', 'Left'].every((e) => parseFloat(cs[`border${e}Width`]) === 0)
              && parseFloat(cs.borderTopLeftRadius) >= h / 2 - 1 && !/rgba\(.*,\s*0\)$|transparent/.test(cs.backgroundColor);
          };
          const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
          const sb = statsText.getBoundingClientRect();
          const seen = {
            id: main.getAttribute('data-testid'), said: main.getAttribute('aria-label'), word: wordOf(main)?.innerText.trim() ?? '',
            wordColor: wordOf(main) ? getComputedStyle(wordOf(main)).color : null, fill: getComputedStyle(main).backgroundColor,
            icon: [...main.querySelectorAll('div')].some((d) => d.innerText.trim() && !/[A-Za-z]/.test(d.innerText)),
            pill: pill(main) && (!more || pill(more)) && (!hold || pill(hold)),
            whole: leaf(main).every(oneLine) && inside(main) && (!hold || (leaf(hold).every(oneLine) && inside(hold))) && oneLine(statsText),
            more: more ? { said: more.getAttribute('aria-label'), expanded: more.getAttribute('aria-expanded'), n: document.querySelectorAll('[data-testid=strip-more]').length, ...box(more) } : null,
            hold: hold ? { said: hold.getAttribute('aria-label'), word: wordOf(hold)?.innerText.trim() ?? '', fill: getComputedStyle(hold).backgroundColor, ...box(hold) } : null,
            btn: box(main), statsR: sb.right, statsText: statsText.textContent, barH: bar ? Math.round(bar.getBoundingClientRect().height) : null, vw: window.innerWidth,
          };
          // Put back now, unless kept for a picture (restoreStats then puts them back).
          if (!keep) statsText.textContent = was;
          else window.__statsWas = was;
          return seen;
        }, [longStats, keep]);
        const restoreStats = () => page.evaluate(() => {
          const q = document.querySelector('[data-testid=walk-stats]');
          const t = q?.querySelector('div') ?? q;
          if (t && window.__statsWas != null) t.textContent = window.__statsWas;
          window.__statsWas = null;
        });
        const soft = 'rgb(227, 224, 218)';
        const LONG = '1:05:12 · 12.4 km';
        const fills = (m) => !!m && m.whole && m.pill && m.btn.h === 48 && m.barH === 69 && m.btn.l > m.statsR;
        const walkingOk = (m) => fills(m) && m.id === 'pause-walk' && m.word === 'Pause' && m.said === 'Pause the walk' && m.hold == null
          && m.fill === soft && m.wordColor === 'rgb(29, 36, 48)'
          && !!m.more && m.more.n === 1 && m.more.said === 'Walk settings' && m.more.expanded === 'false' && m.more.w === 48 && m.more.h === 48
          && m.more.r <= m.btn.l && m.more.l > m.statsR && Math.abs(m.btn.r - (m.vw - 16)) < 1;
        // Paused: Resume left, Stop right, the same width (the owner's half and half), words only.
        const pausedOk = (m) => fills(m) && m.id === 'resume-walk' && m.word === 'Resume' && !m.icon && m.said === 'Resume the walk' && m.more == null
          && m.fill === 'rgb(194, 65, 12)' && m.wordColor === 'rgb(255, 255, 255)'
          && !!m.hold && m.hold.said === 'Hold to stop' && m.hold.word === 'Stop' && m.hold.h === 48 && m.hold.fill === soft
          && m.btn.r <= m.hold.l && Math.abs(m.hold.w - m.btn.w) < 1 && Math.abs(m.hold.r - (m.vw - 16)) < 1 && Math.abs(m.hold.t - m.btn.t) < 0.5;
        const seenStrip = {};
        seenStrip.walking390 = await strip();
        await shot(page, '03f-strip-walking-390');
        await page.setViewportSize({ width: 320, height: 700 });
        await page.waitForTimeout(600);
        seenStrip.walking320 = await strip();
        await shot(page, '03f-strip-walking-320');
        // A picture of it too (fix walk-strip-buttons audit 7): walking, the clock's next tick may redraw them first.
        seenStrip.walking320long = await strip(LONG, true);
        await shot(page, '03f-strip-walking-320-long');
        await restoreStats();
        await page.setViewportSize({ width: 390, height: 844 });
        // tend walk-screen 12 (the sweep's ux 3, auditor 4): the strip's numbers, one button for a screen reader, say the
        // walk's distance and time as the ready bar's twin says its numbers (navigate-ready audit 6; WCAG 2.5.3).
        // tend walk-screen audit 12: word for word what the strip draws (its first line), read in one task; a second's tick
        // between the two reads is tried again.
        const summarySaid = async () => {
          let seen = null;
          for (let i = 0; i < 4; i++) {
            seen = await page.evaluate(() => ({
              said: document.querySelector('[data-testid=walk-summary]')?.getAttribute('aria-label') ?? '',
              drawn: (document.querySelector('[data-testid=walk-stats]')?.textContent ?? '').split('\n')[0],
            }));
            if (seen.drawn && seen.said.startsWith(seen.drawn)) break;
            await page.waitForTimeout(300);
          }
          return seen;
        };
        const saidWalking = await summarySaid();
        check(!!saidWalking.drawn && saidWalking.said.startsWith(saidWalking.drawn) && /\. Walk settings$/.test(saidWalking.said),
          `tend walk-screen 12, audit 12: walking, the strip's name holds what it draws (${JSON.stringify(saidWalking)})`);
        await page.waitForTimeout(600);
        // … raises the walk's settings, as the drag and a tap on the numbers do, and says so (fix walk-strip-buttons audit 4).
        await page.click('[data-testid=strip-more]');
        const optionsUp = await page.waitForSelector('[data-testid=options-card]', { state: 'visible', timeout: 5000 }).then(() => true, () => false);
        // The settings mount a render before the button's own words change: wait for those.
        await page.waitForFunction(() => document.querySelector('[data-testid=strip-more]')?.getAttribute('aria-label') === 'Lower the walk settings', null, { timeout: 5000 }).catch(() => {});
        const moreUp = await page.locator('[data-testid=strip-more]').evaluate((e) => [e.getAttribute('aria-expanded'), e.getAttribute('aria-label')]).catch(() => null);
        await shot(page, '03f-strip-more-options');
        await page.keyboard.press('Escape');
        await page.waitForSelector('[data-testid=options-card]', { state: 'detached', timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(600);
        check(optionsUp && moreUp?.[0] === 'true' && moreUp?.[1] === 'Lower the walk settings',
          `fix walk-strip-buttons audit 4: … opens the walk's settings and says it is expanded, named as the numbers name it (${JSON.stringify(moreUp)})`);
        await page.click('[data-testid=pause-walk]');
        await page.waitForSelector('text=Paused');
        await page.waitForTimeout(400);
        seenStrip.paused390 = await strip();
        await shot(page, '03g-strip-paused-390');
        await page.setViewportSize({ width: 320, height: 700 });
        await page.waitForTimeout(600);
        seenStrip.paused320 = await strip();
        await shot(page, '03g-strip-paused-320');
        seenStrip.paused320long = await strip(LONG, true);
        await shot(page, '03g-strip-paused-320-long');
        await restoreStats();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(600);
        const saidPaused = await summarySaid();
        check(!!saidPaused.drawn && saidPaused.said.startsWith(saidPaused.drawn) && /\. Walk settings$/.test(saidPaused.said),
          `tend walk-screen 12, audit 12: paused, the strip's name still holds what it draws (${JSON.stringify(saidPaused)})`);
        check(walkingOk(seenStrip.walking390) && walkingOk(seenStrip.walking320),
          `0220, fix walk-strip-buttons audit 3: walking, one … (a unique id, Walk settings) and a wide soft Pause fill the row after the numbers, no Stop, words whole at 390 and 320 (${JSON.stringify([seenStrip.walking390, seenStrip.walking320])})`);
        check(pausedOk(seenStrip.paused390) && pausedOk(seenStrip.paused320),
          `0220, fix walk-strip-buttons: paused, Resume (solid accent) and a held Stop, half each, words only, no …, whole at 390 and 320 (${JSON.stringify([seenStrip.paused390, seenStrip.paused320])})`);
        check(walkingOk(seenStrip.walking320long) && pausedOk(seenStrip.paused320long) && seenStrip.paused320long.statsText === LONG,
          `fix walk-strip-buttons audit 1: at 320 an hour-long walk's numbers ("${LONG}") still leave Pause, Resume and Stop whole (${JSON.stringify([seenStrip.walking320long, seenStrip.paused320long])})`);
        // One publish cycle, so a fix taken just before the pause is already counted.
        await page.waitForTimeout(2500);
        const before = await page.locator('text=/ · \\d+[ \\u00a0]m$/').first().innerText();
        // Walking on at a believable pace (4 m a second), which the speed gate would keep.
        for (let j = 1; j <= 3; j++) {
          await ctx.setGeolocation({ longitude: pts[k][0], latitude: pts[k][1] + j * 0.000036, accuracy: 6 });
          await page.waitForTimeout(1000);
        }
        await page.waitForTimeout(2200);
        const during = await page.locator('text=/ · \\d+[ \\u00a0]m$/').first().innerText();
        check(before.split(' · ')[1] === during.split(' · ')[1], `nothing is recorded while paused (${before} → ${during})`);
        n12.held = before.split(' · ')[1] === during.split(' · ')[1];
        await page.click('[data-testid=resume-walk]');
        await page.waitForSelector('[data-testid=pause-walk]');
        await ctx.setGeolocation({ longitude: pts[k][0], latitude: pts[k][1], accuracy: 6 });
      }
      if (k === 36) {
        // Looking around: a drag stops the map following; Recenter brings it back.
        const box = await page.locator('canvas.maplibregl-canvas').last().boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 3 + 60, { steps: 8 });
        await page.mouse.up();
        await page.waitForSelector('[data-testid=recenter]');
        await page.click('[data-testid=recenter]');
        await page.waitForSelector('[data-testid=recenter]', { state: 'detached' });
        check(true, 'after looking around, Recenter brings the map back');
        // The fog of unwalked streets still draws, quietly (the unwalked-streets button went with decision 0222).
        n12.fog = await navOn();
        check(n12.photo && n12.photoKept && n12.pause && n12.grewM > 0 && n12.held && n12.fog,
          `N12: while navigating, the walk records, a photo is kept, Pause holds the bar's distance, and the fog draws (${JSON.stringify(n12)})`);
      }
      if (k === 39) {
        // 40 s of walking with captures, an explore read and a route: the page stays the same size (leak regression).
        const leak1 = await leakSample();
        // Reactivity budget (Nov 1): one fix a second must not re-render the screen several times,
        // nor re-send the map's sources more often than it changes.
        const perf1 = await page.evaluate(() => ({ ...window.__perf }));
        const secs = (Date.now() - perfT0) / 1000;
        const rate = (k) => ((perf1[k] ?? 0) - (perf0[k] ?? 0)) / secs;
        // This window is busy with taps (memos, a video, a note, a long press); steady walking is about
        // 1.4 renders a second (scripts/perf-walk.js). Before the fixes it was 3.7 here.
        check(rate('render:walk') <= 2.5 && rate('setData:cone') <= 1.05 && rate('setData:trace') <= 0.6,
          `walking stays within its render budget, FC10 (walk ${rate('render:walk').toFixed(2)}/s, cone ${rate('setData:cone').toFixed(2)}/s, trace ${rate('setData:trace').toFixed(2)}/s)`);
        check(rate('render:walk') <= 2.0, `CM3: with the React Compiler, the busy window renders the walk screen no more than before (${rate('render:walk').toFixed(2)}/s; 1.78 to 1.91 before)`);
        check(leak1.bodyDivs - leak0.bodyDivs <= 3 && leak1.listeners - leak0.listeners < 2000,
          `walking leaks no portals or listeners (body ${leak0.bodyDivs} → ${leak1.bodyDivs}, listeners ${leak0.listeners} → ${leak1.listeners}, nodes ${leak0.nodes} → ${leak1.nodes})`);
      }
      if (k === 40) {
        // A reload mid-walk is how the web resumes: it must land back on the walk.
        await page.reload();
        await page.waitForSelector('[data-testid=walk-actions]');
        check(page.url().endsWith(`${BASE}/walk`), 'a reload mid-walk resumes the walk');
        await page.waitForTimeout(2500);
        const replayed = await page.evaluate(() => window.__enters.length);
        check(replayed === 0, `nothing animates when a screen reloads: pins and finds are just there (M10, M12: ${replayed})`);
      }
      if (k === 44) {
        const bar = await page.waitForSelector('[data-testid=nav-left]', { timeout: 30000 }).then((e) => e.innerText(), () => '');
        check(/Public art/.test(bar), `revealed, the place is named in the bar (${bar})`);
      }
      if (k === 54) {
        // What I'm into (E17): public art switched off hides its "?" at once; back on, it shows again.
        check((await page.locator('[aria-label="Public art, Art. Open"]').count()) === 1, 'the artwork shows, named, beside you');
        // Through What I'm into's page (decision 0192, WI8): the drawer's row, the switch, Back, the drawer lowered.
        await openInto(page, 'walk');
        await page.click('[data-testid=kind-public_art]');
        await closeInto(page);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        check((await page.locator('[aria-label="Public art, Art. Open"]').count()) === 0, 'a kind switched off loses its "?" marks');
        await openInto(page, 'walk');
        await page.click('[data-testid=kind-public_art]');
        await closeInto(page);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        check((await page.locator('[aria-label="Public art, Art. Open"]').count()) === 1, 'switched back on, it shows at once');
      }
    }
    await page.waitForTimeout(2200);

    // Navigate (slice 4). Walk me back routes to the start along the trace and counts down (N1, N7).
    const meters = (t) => {
      const m = /([\d.]+)\s*(km|m)\b/.exec(t);
      return m ? parseFloat(m[1]) * (m[2] === 'km' ? 1000 : 1) : NaN;
    };
    const navLeft = async () => meters(await page.locator('[data-testid=nav-left]').innerText());
    await page.click('[data-testid=walk-back]');
    await page.waitForSelector('[data-testid=nav-bar]');
    const left0 = await navLeft();
    check(left0 > 250 && left0 < 350 && /Start/.test(await page.locator('[data-testid=nav-bar]').innerText()), `walk me back routes to the start (${left0} m)`);
    // The trace steps aside while navigating, so the route reads (the owner's call, Nov 2).
    const traceOpacity = () => page.locator('[data-trace-opacity]').last().getAttribute('data-trace-opacity');
    await page.waitForTimeout(500);
    check((await traceOpacity()) === '0', 'the trace hides while navigating');
    await shot(page, '03d-walk-back');
    const back = [...pts].reverse();
    for (let k = 0; k < 24; k++) {
      await ctx.setGeolocation({ longitude: back[k][0], latitude: back[k][1], accuracy: 6 });
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2200);
    const left1 = await navLeft();
    check(left1 < left0 - 80, `the distance left counts down (${left0} → ${left1} m)`);
    // Arrival shows for 4 s, about 30 m out: watch for it on the way.
    let sawArrival = false;
    for (let k = 24; k < back.length; k++) {
      await ctx.setGeolocation({ longitude: back[k][0], latitude: back[k][1], accuracy: 6 });
      await page.waitForTimeout(1000);
      sawArrival ||= (await page.locator('text=/You.re here: Start/').count()) > 0;
    }
    await ctx.setGeolocation({ longitude: route[0][0], latitude: route[0][1], accuracy: 6 });
    for (let k = 0; k < 6 && !sawArrival; k++) {
      await page.waitForTimeout(1000);
      sawArrival = (await page.locator('text=/You.re here: Start/').count()) > 0;
    }
    check(sawArrival && (await page.locator('[data-testid=nav-bar]').count()) === 0, 'arriving at the start says so, and navigation ends (N9)');
    check((await traceOpacity()) === '1', 'the trace comes back once navigation ends');
    // A long press on the map, then Go here, routes over the streets (N3, N11); End clears it (N10).
    {
      const box = await page.locator('canvas.maplibregl-canvas').last().boundingBox();
      const spot = { x: box.x + box.width / 2 + 90, y: box.y + box.height / 2 - 120 };
      await page.mouse.move(spot.x, spot.y);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.waitForSelector('[data-testid=go-here]');
      // The card sits above the capture row: the camera is still the camera (audit).
      const cam = await page.locator('[data-testid=cap-photo]').boundingBox();
      const atCam = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'), { x: cam.x + cam.width / 2, y: cam.y + cam.height / 2 });
      check(atCam === 'cap-photo', `the spot card leaves the capture row free (${atCam})`);
      // A tap on the map closes it (a click within 1 s of a long press is its end, not a tap).
      await page.waitForTimeout(1100);
      await page.mouse.click(box.x + 40, box.y + 200);
      await page.waitForTimeout(700);
      check((await page.locator('[data-testid=go-here]').count()) === 0, 'a tap on the map closes the spot card');
      await page.mouse.move(spot.x, spot.y);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.click('[data-testid=go-here]');
      await routed(page, 30000);
      const left = await navLeft();
      check(left > 50 && left < 1500, `a long press, then Go here, routes over the streets (${left} m)`);
      await shot(page, '03e-go-here');
      await page.click('[data-testid=nav-end]');
      await page.waitForSelector('[data-testid=nav-bar]', { state: 'detached', timeout: 5000 });
      check(true, 'End clears the route');
    }

    // Open in Maps (Bridges and Open in Maps, NH1-NH7): the destination goes to the phone's maps app.
    {
      const opened = () => page.evaluate(() => window.__opened.slice());
      /** The destination of a Google walking-directions link (this browser is a desktop: NH2). */
      const destOf = (u) => {
        const m = /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=(-?\d+\.\d{6}),(-?\d+\.\d{6})&travelmode=walking$/.exec(u ?? '');
        return m ? [Number(m[2]), Number(m[1])] : null;
      };
      const metersApart = (a, b) => Math.hypot((a[0] - b[0]) / dLon, (a[1] - b[1]) / dLat) * 100;
      const box = await page.locator('canvas.maplibregl-canvas').last().boundingBox();
      const press = async (x, y) => {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
      };
      const spot = { x: box.x + box.width / 2 + 90, y: box.y + box.height / 2 - 120 };
      await press(spot.x, spot.y);
      await page.waitForSelector('[data-testid=spot-handoff]');
      // At a 320 px phone's width, every button on the card stays on screen (NH6).
      await page.setViewportSize({ width: 320, height: 700 });
      await page.waitForTimeout(500);
      const inside = await page.evaluate(() =>
        ['go-here', 'spot-handoff', 'spot-close', 'here-open'].every((id) => {
          const el = document.querySelector(`[data-testid=${id}]`);
          if (!el) return true;
          const b = el.getBoundingClientRect();
          return b.left >= 0 && b.right <= 320 && b.width >= 44 && b.height >= 44;
        }),
      );
      check(inside, 'the long-press card’s buttons, Open in Maps among them, fit 320 px at 44 pt (NH6)');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      await page.click('[data-testid=spot-handoff]');
      const fromCard = destOf((await opened()).at(-1));
      check(!!fromCard && (await page.locator('[data-testid=spot-handoff]').count()) === 0, `the long-press card opens walking directions to its spot (NH1, NH6: ${(await opened()).at(-1)})`);
      await page.waitForTimeout(1100);
      await press(spot.x, spot.y);
      await page.click('[data-testid=go-here]');
      await routed(page, 30000);
      const left = await navLeft();
      await page.click('[data-testid=nav-handoff]');
      const fromBar = destOf((await opened()).at(-1));
      check(!!fromBar && !!fromCard && metersApart(fromBar, fromCard) < 5, `the bar's Open in Maps sends the destination (NH3${fromBar && fromCard ? `: ${metersApart(fromBar, fromCard).toFixed(1)} m from the card's` : ''})`);
      await page.waitForTimeout(1500);
      check((await page.locator('[data-testid=nav-bar]').count()) === 1 && Math.abs((await navLeft()) - left) < 30, 'navigation goes on after the hand-off (NH7)');
      await page.click('[data-testid=nav-end]');
      await page.waitForSelector('[data-testid=nav-bar]', { state: 'detached', timeout: 5000 });
      // A route that can't be found offers the maps app (NH5): zoomed far out, a spot many km away.
      const zoomNow = () => page.evaluate(() => Number([...document.querySelectorAll('[data-zoom]')].at(-1)?.getAttribute('data-zoom') ?? NaN));
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let k = 0; k < 20 && !((await zoomNow()) <= 9.5); k++) {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(800);
      await press(box.x + 50, box.y + box.height * 0.3);
      await page.waitForSelector('[data-testid=go-here]');
      await page.click('[data-testid=go-here]');
      const failed = await page.waitForSelector('text=/Too far to walk from here|No walking route found nearby/', { timeout: 90000 }).then(() => true, () => false);
      const action = page.locator('[role=button]:has-text("Open in Maps")');
      check(failed && (await action.count()) === 1, `a route that can't be found offers Open in Maps (NH5, at z${(await zoomNow()).toFixed(1)})`);
      if (failed && (await action.count())) {
        // It stays until dismissed: the destination is already forgotten (audit 6).
        await page.waitForTimeout(7000);
        check((await action.count()) === 1, 'the failed route’s Open in Maps is still there after 7 s (audit 6)');
        const actionBox = await action.boundingBox();
        check(actionBox && actionBox.height >= 44, `its button is 44 pt tall (audit 6: ${actionBox && Math.round(actionBox.height)})`);
        await action.click();
        const far = destOf((await opened()).at(-1));
        // The walker stands where walk me back ended: the route's start.
        const walker = route[0];
        check(!!far && !!walker && metersApart(far, walker) > 2000, `its Open in Maps goes to the spot asked for (NH5${far && walker ? `: ${(metersApart(far, walker) / 1000).toFixed(1)} km away` : ''})`);
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let k = 0; k < 20 && !((await zoomNow()) >= 15.8); k++) {
        await page.mouse.wheel(0, -400);
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(800);
    }

    // The walk back passed the flagged capture again: never in the walk that recorded it (R2).
    check((await page.locator('[data-testid=reminder]').count()) === 0, 'a flagged capture does not come back in its own walk');
    await toStop(page);
    await page.click('[data-testid=stop]');
    await page.waitForSelector('text=Hold to stop the walk', { timeout: 5000 }).catch(() => {});
    check((await page.locator('text=Hold to stop the walk').count()) > 0, 'a tap on Stop explains it needs a hold');
    check(page.url().endsWith('/walk'), 'a tap on Stop does not end the walk');

    const dismissed = await hintDismissed;
    check(dismissed === true, `a dismissed banner leaves no copy behind (audit 5${dismissed == null ? ': the hint never showed' : ''})`);
    await toStop(page);
    const box = await page.locator('[data-testid=stop]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    let releaseTilejson;
    tiles.stall = new Promise((res) => { releaseTilejson = res; });
    await page.mouse.down();
    await page.waitForTimeout(1100);
    // Caught while the stop is under way, if it lasts long enough to be seen: the spinner alone, the words its spoken name
    // (fix walk-strip-buttons audit 5).
    const busyStop = await page.evaluate(() => {
      const b = document.querySelector('[data-testid=stop]');
      return b ? { label: b.getAttribute('aria-label'), words: b.innerText.trim() } : null;
    });
    await page.mouse.up();
    await page.waitForURL(/replay/, { timeout: 30000 });
    check(true, 'holding Stop opens the replay');
    check(!busyStop || busyStop.label !== 'Stopping…' || busyStop.words === '',
      `fix walk-strip-buttons audit 5: a busy Stop draws the spinner alone, "Stopping…" its spoken name (${JSON.stringify(busyStop)})`);
    // The walk opens from the device, whatever the network does (bug, Nov 1: blank until a reload).
    let opened = false;
    for (let k = 0; k < 40 && !opened; k++) {
      opened = (await page.getByText('Opening your walk').count()) === 0 && (await page.locator('canvas.maplibregl-canvas').count()) === 1;
      if (!opened) await page.waitForTimeout(50);
    }
    check(opened, 'the replay opens within 2 s while the tile host stalls');
    tiles.stall = null;
    releaseTilejson();

    let reading = false;
    for (let k = 0; k < 200 && !reading; k++) {
      reading = (await page.getByText('Reading the streets').count()) > 0;
      if (!reading) await page.waitForTimeout(50);
    }
    check(reading, 'the first beat reads the streets');

    // The replay flows (RR6): nothing asks for Continue. The memo plays in its bubble, the video in its
    // card, the note joins the corner, the captioned photo grows from its pin and tucks into the pile.
    let continueSeen = false;
    let videoChecked = false;
    let noteSeen = false;
    let captionShown = false;
    for (let k = 0; k < 240 && !(await page.locator('[data-testid=to-name]').count()); k++) {
      if (await page.locator('[data-testid=moment]').count()) continueSeen = true;
      if (!videoChecked && (await page.locator('[data-testid=replay-card] video').count())) {
        await page.waitForTimeout(1200);
        await shot(page, '04a-replay-video');
        const playing = await page.evaluate(() => {
          const v = document.querySelector('[data-testid=replay-card] video');
          return !!v && v.currentTime > 0 && !v.paused;
        });
        check(playing, 'the video plays in its card in the replay (RR12)');
        if (await page.locator('[data-testid=video-sound]').count()) {
          // Sound was refused without a tap: it plays muted, and one tap brings the sound.
          await page.click('[data-testid=video-sound]');
          await page.waitForTimeout(300);
          const sound = await page.evaluate(() => {
            const v = document.querySelector('[data-testid=replay-card] video');
            return !!v && !v.muted;
          });
          check(sound, 'a video that could not start with sound plays muted, and a tap turns the sound on');
        }
        const vbox = await page.locator('[data-testid=replay-card]').boundingBox();
        check(vbox && vbox.width < 300, `the video plays in a card, not full screen (${vbox && Math.round(vbox.width)} wide, RR12)`);
        videoChecked = true;
      }
      if (!noteSeen && (await page.getByText('cardamom').count()) > 0) {
        noteSeen = true;
        // The replay is another map: its pin for the reminded note wears the bell too (RB6).
        const replayBell = await page.waitForSelector('[data-ids] [data-testid=pin-reminder]', { timeout: 5000 }).then(() => true, () => false);
        check(replayBell, 'the replay’s pin for the reminded note wears the bell too (RB6)');
        await shot(page, '04-replay-moment');
      }
      if (!captionShown && (await page.locator('[data-testid=replay-card][aria-label^="Mural on Wickenden"]').count())) {
        captionShown = true;
        await page.waitForTimeout(400);
        await shot(page, '04b-replay-caption');
      }
      await page.waitForTimeout(250);
    }
    check(!continueSeen, 'the replay never waits for Continue (RR6)');
    check(videoChecked, 'the replay plays the video in a card (RR12)');
    check(noteSeen, 'the note gets its moment in the replay, in a bubble (RR9)');
    check(captionShown, 'the photo shows its caption in the replay (RR11)');
    await page.waitForSelector('[data-testid=to-name]', { timeout: 45000 });
    const card = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    // A block each of Transit and Arnold; the unnamed block between them clears fog but is not a street.
    // Said as a clause in the card's line, not a big number (tabs audit U13).
    const cardLine = await page.locator('[data-testid=card-line]').innerText();
    check(/your first time down (Transit Street and Arnold Street|Arnold Street and Transit Street)$/.test(cardLine) && !/\bnew streets?\b/.test(card),
      `the card names the 2 named streets new to you, in its line (${cardLine})`);
}

async function run(h) {
  const { page, url, routed } = h;
  await page.goto(h.exploreUrl);
  await page.waitForSelector('[data-testid=tab-explore][aria-selected=true]', { timeout: 30000 });
  await checks(h);
}

module.exports = {
  name: 'walk',
  covers: [
    // It shares a walk's GPS log from the walk's options (lib/shareLog).
    'src/lib/shareLog/**',
    // The drawer's destination before a walk (NV23) is saved through the navigation store.
    'src/lib/nav/store/**',
    'src/components/{CaptureView,Caption,CapturePinView,ConfirmCard,Ticking,WalkActions,NotificationSettings}.tsx',
    'src/components/walk/**',
    'src/app/replay/**',
    'src/lib/{replay,summary,finish,quietLines,useCaptures,useMediaUri,captureBus}.ts',
    'src/lib/here/**',
    'src/lib/media/**',
    'src/components/Baker*.tsx',
  ],
  run,
  checks,
};
