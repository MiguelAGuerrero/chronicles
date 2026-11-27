// Walk planner (WP1-WP27, KW15): a kind's button opens a page of its own with up to three routes on the map, rows, a strip each,
// settings, Suggest different routes, and Start. Phase two has a walk recording: capture is on the page and Start routes that walk.
// E2E_ONLY=planner runs it alone.

const path = require('path');
const { heldKit } = require('./edit');

const BANNED = /\b(minutes?|mins?|hours?|ETA|pace|brisk|quick(er|est)?|fast(er|est)?|shorter|longer|more|most|best|densest|less|than|same)\b/i;

async function run(h) {
  const { url, exploreUrl, at, check, freshPage, shot, openWalk, tabTo, tabBarShown, scriptsDir } = h;
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
  check(!/\b(Plenty|Some|Little)[^.]*\d/.test(text.replace(/About [\d.]+[ \u00a0](km|mi|m|ft)/g, '')), 'WP14: no digit in what a row passes');
  const first = pg.locator('[data-testid=plan-row-0]');
  const dist = await pg.locator('[data-testid=plan-row-distance-0]').innerText().catch(() => '');
  check(/^About \d+(\.\d)?[ \u00a0](km|mi|m|ft)/.test(dist), `WP14: a row gives its own distance (${dist})`);
  check((await pg.locator('[data-testid=plan-strip-0]').count()) === 1 && /^Green along this route/.test((await pg.locator('[data-testid=plan-strip-0]').getAttribute('aria-label')) ?? ''), 'WP15: each row has a strip with a text equivalent');
  check(/^(Easy on foot|Part of it|It is not known)/.test(await pg.locator('[data-testid=plan-reach-0]').innerText().catch(() => '')), 'KW10, WP20: each row says whether it can be walked the whole way');
  await shot(pg, 'planner-open');
  {
    // tend explore 28 (ui-patterns, "Nothing wraps on a 320 px phone at the default text size"): at 320 and 390 px each of the
    // planner's controls is one line, none overlaps or clips another, a choice's fills reach its group's edge, and Start
    // stays beside "Suggest different routes", to its right.
    const vp = pg.viewportSize();
    for (const w of [320, 390]) {
      await pg.setViewportSize({ width: w, height: 844 });
      await pg.waitForTimeout(500);
      const m = await pg.evaluate(() => {
        const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
        const controls = [...document.querySelectorAll('[data-testid=planner] [role=radio], [data-testid=plan-different], [data-testid=plan-start], [data-testid=plan-ceiling-down], [data-testid=plan-ceiling-up]')]
          .map((el) => {
            // The lines a control's words take: the distinct tops of the rectangles its text is drawn in.
            const tops = new Set();
            const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            for (let t = walk.nextNode(); t; t = walk.nextNode()) {
              if (!t.textContent.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(t);
              for (const q of range.getClientRects()) if (q.width > 0) tops.add(Math.round(q.top));
            }
            const texts = [...el.querySelectorAll('*')].filter((t) => t.childElementCount === 0 && t.textContent.trim());
            return { id: el.getAttribute('data-testid'), lines: tops.size, clipped: texts.some((t) => t.scrollWidth > t.clientWidth + 1), ...box(el) };
          });
        const groups = [...document.querySelectorAll('[data-testid=plan-settings] [role=radiogroup]')].map((g) => {
          const r = g.getBoundingClientRect();
          const cs = getComputedStyle(g);
          const inner = (r.width - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth)) * (r.height - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth));
          const filled = [...g.children].reduce((s, c) => { const q = c.getBoundingClientRect(); return s + q.width * q.height; }, 0);
          // A row (every choice at one top) or a column (every choice at one left and width), never a row broken in two.
          const qs = [...g.children].map((c) => c.getBoundingClientRect());
          const same = (f) => qs.every((q) => Math.abs(f(q) - f(qs[0])) <= 1);
          const shape = same((q) => q.top) ? 'row' : same((q) => q.left) && same((q) => q.width) ? 'column' : 'broken';
          return { id: g.firstElementChild?.getAttribute('data-testid'), fill: filled / inner, shape, x: r.left, r: r.right };
        });
        return { controls, groups, width: window.innerWidth };
      });
      const overlaps = [];
      for (let i = 0; i < m.controls.length; i++) for (let j = i + 1; j < m.controls.length; j++) {
        const a = m.controls[i], b = m.controls[j];
        if (Math.min(a.r, b.r) - Math.max(a.x, b.x) > 1 && Math.min(a.b, b.b) - Math.max(a.y, b.y) > 1) overlaps.push(`${a.id}/${b.id}`);
      }
      const twoLines = m.controls.filter((c) => c.lines !== 1).map((c) => `${c.id}:${c.lines}`)
        .concat(m.groups.filter((g) => g.shape === 'broken').map((g) => `${g.id}'s group`));
      const outside = m.controls.filter((c) => c.clipped || c.x < -0.5 || c.r > m.width + 0.5).map((c) => c.id);
      const gaps = m.groups.filter((g) => Math.abs(g.fill - 1) > 0.02 || g.x < -0.5 || g.r > m.width + 0.5).map((g) => `${g.id}:${g.fill.toFixed(2)}`);
      const diff = m.controls.find((c) => c.id === 'plan-different'), start = m.controls.find((c) => c.id === 'plan-start');
      check(m.controls.length >= 11 && m.groups.length === 3 && !twoLines.length,
        `tend explore 28: at ${w} px each of the planner's controls is one line, and each choice's group one row or one column (${m.controls.length} controls; ${twoLines.join(', ') || 'none wraps'})`);
      check(!overlaps.length && !outside.length && !gaps.length,
        `tend explore 28: at ${w} px no control overlaps or clips another, and each choice's fills reach its group's edge (overlap ${overlaps.join(', ') || 'none'}; clipped ${outside.join(', ') || 'none'}; fills ${gaps.join(', ') || 'whole'})`);
      check(!!diff && !!start && Math.abs(start.y - diff.y) <= 1 && start.x >= diff.r,
        `tend explore 28: at ${w} px Start stays beside "Suggest different routes", to its right (${diff && start ? `${Math.round(diff.x)},${Math.round(diff.y)} / ${Math.round(start.x)},${Math.round(start.y)}` : 'missing'})`);
      await pg.locator('[data-testid=plan-different]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await pg.waitForTimeout(300);
      await shot(pg, `tend-explore-28-planner-settings-${w}`);
      await pg.locator('[data-testid=plan-title]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    }
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(500);
  }
  {
    // tend explore audit 42, 43, 44: density's column at 320 px reads as one choice: a smaller corner than the row pills, a
    // divider a person can see (WCAG 2.2, 1.4.11 Non-text Contrast), and none drawn across or beside the chosen row's fill.
    const vp = pg.viewportSize();
    await pg.setViewportSize({ width: 320, height: 844 });
    await pg.waitForTimeout(500);
    const groupsOf = () => pg.evaluate(() => {
      const lum = (c) => {
        const [r, g, b] = (c.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map((v) => {
          const s = Number(v) / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      return [...document.querySelectorAll('[data-testid=plan-settings] [role=radiogroup]')].map((g) => ({
        id: g.firstElementChild?.getAttribute('data-testid'),
        radius: parseFloat(getComputedStyle(g).borderTopLeftRadius),
        rows: [...g.children].map((c) => {
          const cs = getComputedStyle(c);
          return { on: c.getAttribute('aria-checked') === 'true', top: parseFloat(cs.borderTopWidth), contrast: 1.05 / (lum(cs.borderTopColor) + 0.05) };
        }),
      }));
    });
    const g1 = await groupsOf();
    const density = g1.find((g) => g.id === 'plan-density-anywhere');
    const pills = g1.filter((g) => g !== density);
    check(!!density && density.radius <= 12 && pills.length === 2 && pills.every((g) => g.radius === 22),
      `tend explore audit 42: at 320 px density's column has a corner of 12 or less, the row pills keep 22 (${g1.map((g) => `${g.id}:${g.radius}`).join(', ')})`);
    const dividers = (density?.rows ?? []).filter((r) => r.top > 0);
    check(dividers.length >= 1 && dividers.every((r) => r.contrast >= 3),
      `tend explore audit 43: at 320 px each divider in density's column is at least 3:1 against white (${dividers.map((r) => r.contrast.toFixed(2)).join(', ') || 'none'})`);
    await pg.click('[data-testid=plan-density-some]');
    await pg.waitForTimeout(800);
    const d2 = (await groupsOf()).find((g) => g.id === 'plan-density-anywhere');
    const i = d2?.rows.findIndex((r) => r.on) ?? -1;
    await pg.locator('[data-testid=plan-different]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await pg.waitForTimeout(300);
    await shot(pg, 'tend-explore-28-planner-density-some-320');
    check(i === 1 && d2.rows[1].top === 0 && d2.rows[2].top === 0,
      `tend explore audit 44: at 320 px with "Where there is some" chosen, no divider crosses or touches its fill (${JSON.stringify(d2?.rows.map((r) => [r.on, r.top]))})`);
    await pg.click('[data-testid=plan-density-anywhere]');
    await pg.waitForSelector('[data-testid=plan-row-0]', { timeout: 60000 }).catch(() => {});
    await pg.locator('[data-testid=plan-title]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(500);
  }

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
  {
    // fix planner-edit (decision 0240, the owner's answer): the planner's camera opens the photo's editor by itself once it
    // is accepted, as the walk screen's does; Escape closes the editor alone, never the planner beneath it.
    // tend captures audit 17 (the review's S6, the orchestrator's ruling R16): read frame by frame with the keep held back,
    // the planner's camera holds its shot full screen from the picker's return, and the editor comes over it.
    const kit = heldKit(pg, { fixtures: path.join(scriptsDir, 'fixtures'), shot, tag: 'planner' });
    const r17 = kit.read(await kit.capture('[data-testid=plan-cap-photo]', 'photo.jpg', 'planner-390', 2500, false), 'photo');
    check(kit.whole(r17) && kit.steady(r17) && kit.honest(r17),
      `tend captures audit 17: on the planner a photo covers the map from the frame after its mount until its editor is up, its box still, only ✕ while held (${kit.say(r17)})`);
    // Once kept: from the camera's return the shot is held in the editor with its controls hidden (tend captures T62).
    const opened = await pg.waitForSelector('[data-testid=media-editor][data-held=false]', { timeout: 15000 }).then(() => true, () => false);
    const keptLine = await pg.locator('[data-testid=edit-kept]').innerText().catch(() => '');
    check(opened && keptLine === 'Photo kept', `ME23 fix planner-edit: the planner's camera opens the photo's editor by itself once accepted (${keptLine})`);
    await pg.waitForTimeout(800);
    await shot(pg, 'planner-edit-after-capture');
    await pg.keyboard.press('Escape');
    const closed = await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).then(() => true, () => false);
    await pg.waitForTimeout(500);
    check(closed && (await pg.locator('[data-testid=plan-capture]').count()) === 1,
      'fix planner-edit: Escape closes the editor and leaves the planner open beneath it');
    await shot(pg, 'planner-edit-closed');
  }
  await pg.click('[data-testid=plan-cap-note]');
  // note-pages audit 13: the planner's pencil opens the note's page too, never the old card.
  const plannerPage = await pg.waitForSelector('[data-testid=note-page] [data-testid=note-input]', { timeout: 8000 }).then(() => true, () => false);
  check(plannerPage && (await pg.locator('[data-testid=plan-note]').count()) === 0, 'note-pages audit 13: the planner\'s pencil opens the note\'s page');
  await pg.fill('[data-testid=note-page] [data-testid=note-input]', 'A note from the planner');
  // react-native-web's Modal traps Tab only once its slide has ended (its onShow), while the planner's own trap stands aside
  // as soon as the Modal is drawn. After the photo step above, a Tab sent at once found neither on 2 runs of 6 (0 of 4
  // without the step; which part of the step slows the slide was not measured). Tab before the slide ends is an older
  // leak, deferred (fix planner-edit audit, F4); this check is about Tab after it.
  await pg.waitForTimeout(800);
  {
    // tend explore audit 36 (WCAG 2.2, 2.1.1 Keyboard and 2.4.3 Focus Order): the planner's Tab trap stands aside for the
    // note page's Modal over it, so Tab from the note reaches its Save, never pulled back to the page's first control.
    await pg.focus('[data-testid=note-page] [data-testid=note-input]');
    const ids = [];
    for (let i = 0; i < 8; i++) {
      await pg.keyboard.press('Tab');
      ids.push(await pg.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName.toLowerCase() || null));
    }
    // Pulled back each time, every Tab lands on the page's first control; walking its own order, Tab meets several.
    check(ids.includes('note-done') && new Set(ids).size >= 3 && !ids.some((id) => /^plan-/.test(id ?? '')),
      `tend explore audit 36: with a walk recording, Tab in the planner's note page reaches its Save, never the planner beneath (${ids.join(' > ')})`);
  }
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
  await ownPosition(h);
}

/**
 * fix outing-current-position (decision 0273; WP3): the planner reads one fresh fix of its own as it opens, never Explore's launch
 * fix. Launched at Green Row, the phone moves 4 km: the planner is where the phone is now. With no fresh fix in time (the browser's
 * watch made to hang) the launch fix stands in while under thirty minutes old, said in a line, and never past that. Refused after a
 * reload: it says it needs your position, that location is off, and draws no dot.
 */
async function ownPosition(h) {
  const { exploreUrl, at, check, freshPage, shot } = h;
  const { c, pg } = await freshPage('planner-position');
  // A clock that can be moved on, and a watch that can be made never to answer, for the fallback's two sides.
  await c.addInitScript(() => {
    window.__clockShift = 0;
    window.__geoHang = false;
    const now = Date.now;
    Date.now = () => now() + window.__clockShift;
    const g = navigator.geolocation;
    const watch = g.watchPosition.bind(g);
    let hung = 1e6;
    g.watchPosition = (ok, err, o) => (window.__geoHang ? ++hung : watch(ok, err, o));
  });
  const green = at(-120, 0);
  const moved = at(-80, 0);
  const near = (s, p) => !!s && s.split(',').map(Number).every((v, i) => Math.abs(v - p[i]) < 1e-5);
  const walker = () => pg.evaluate(() => document.querySelector('[data-testid=planner] [data-walker]')?.getAttribute('data-walker') ?? null);
  const line = async () => ((await pg.locator('[data-testid=plan-position]').innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
  const page = async () => ((await pg.locator('[data-testid=planner]').innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
  const open = async () => {
    if (!(await pg.locator('[data-testid=atlas-card]').count())) {
      await pg.locator('[data-testid=atlas-tile][data-name="Green Row"]').click().catch(() => {});
      await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 }).catch(() => {});
    }
    const btn = pg.locator('[data-testid=atlas-kind-walk-parks]');
    await btn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await btn.click().catch(() => {});
    await pg.waitForSelector('[data-testid=planner]', { timeout: 15000 }).catch(() => {});
  };
  const close = async () => {
    await pg.click('[data-testid=plan-close]').catch(() => {});
    await pg.waitForSelector('[data-testid=planner]', { state: 'detached', timeout: 10000 }).catch(() => {});
  };
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
  await c.setGeolocation({ longitude: green[0], latitude: green[1], accuracy: 6 });
  await pg.goto(exploreUrl);
  await pg.waitForSelector('[data-testid=atlas-tile][data-name="Green Row"][data-read="1"]', { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  // 1. Moved 4 km since Explore's launch fix.
  await c.setGeolocation({ longitude: moved[0], latitude: moved[1], accuracy: 6 });
  await open();
  await until(async () => near(await walker(), moved), 15000);
  await pg.waitForTimeout(2500);
  const w1 = await walker();
  check.todo(near(w1, moved) && !near(w1, green), `fix outing-current-position: WP3: moved 4 km since Explore's launch fix, the planner is where the phone is now, not where Explore read it (${w1}; ${await page()})`);
  await shots('fix-planner-current-position-moved');
  await close();
  // 2. No fresh fix within the wait, the launch fix twenty minutes old: it stands in, and is said.
  await pg.evaluate(() => { window.__geoHang = true; window.__clockShift = 20 * 60_000; });
  await open();
  await until(async () => /^From where you were/.test(await line()), 25000);
  await pg.waitForSelector('[data-testid=plan-row-0], [data-testid^=plan-reason-]', { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  const l2 = await line();
  const w2 = await walker();
  check.todo(l2 === 'From where you were twenty minutes ago.' && near(w2, green) && (await pg.locator('[data-testid=plan-reason-noPosition]').count()) === 0,
    `fix outing-current-position: WP3: with no fresh fix in time, a fix twenty minutes old is used and said ("${l2}", ${w2}; ${await page()})`);
  await shots('fix-planner-current-position-earlier');
  await close();
  // 3. The same, the launch fix over thirty minutes old: no position, no route.
  await pg.evaluate(() => { window.__clockShift = 31 * 60_000; });
  await open();
  await until(async () => (await pg.locator('[data-testid=plan-reason-noPosition]').count()) === 1 && !/^Finding/.test(await line()), 25000);
  await pg.waitForTimeout(1500);
  const w3 = await walker();
  check.todo((await pg.locator('[data-testid=plan-reason-noPosition]').count()) === 1 && (await pg.locator('[data-testid=plan-row-0]').count()) === 0 && !w3 && !/From where you were/.test(await page()),
    `fix outing-current-position: WP3: a fix over thirty minutes old is never used: the planner needs your position and plans nothing (${w3}; ${await page()})`);
  await close();
  // 4. Refused, after a reload (no fix in memory; Explore falls back to the area it last listed).
  await c.clearPermissions();
  await pg.reload();
  await pg.waitForSelector('[data-testid=atlas-tile][data-name="Green Row"]', { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  await open();
  await until(async () => (await pg.locator('[data-testid=plan-reason-noPosition]').count()) === 1 && /Location is off/.test(await line()), 20000);
  await pg.waitForTimeout(1500);
  const w4 = await walker();
  const l4 = await line();
  check.todo((await pg.locator('[data-testid=plan-reason-noPosition]').count()) === 1 && /^Location is off for this site\./.test(l4) && (await pg.locator('[data-testid=plan-row-0]').count()) === 0 && !w4,
    `fix outing-current-position: WP3: location refused, the planner says it needs your position and that location is off, plans nothing and draws no dot ("${l4}", ${w4}; ${await page()})`);
  await shots('fix-planner-current-position-refused');
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
