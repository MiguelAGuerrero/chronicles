// Explore after a walk: the place view's checklist (E10), the atlas grid and its tiles (AT1-AT14), the area
// card as a drawer, a town page and the way back, and landing's busy streets. Starts on Chronicle with
// the first walk starred; ends there after a reload.

// Standing alone after the walk journey, the page is on the first walk's card: name it and return to
// Chronicle with its star, as the chronicle journey does. In the full flow the page is already there, so
// this does nothing.
async function arrive(h) {
  const { page } = h;
  if (await page.locator('[data-testid=to-name]').count()) {
    await page.click('[data-testid=to-name]');
    await page.click('[data-testid=save]');
    await h.mapUp(page);
    await page.waitForSelector('[data-testid=home-sheet]');
    await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 15000 });
  }
}

/** The element with focus: its test id (or tag) and name (tend explore 27). */
const focused = (page) => page.evaluate(() => {
  const a = document.activeElement;
  return a ? { id: a.getAttribute('data-testid') || a.tagName.toLowerCase(), name: a.getAttribute('data-name') } : null;
});
/** Whether focus is inside the element with this test id. */
const focusIn = (page, id) => page.evaluate((id) => !!document.activeElement?.closest(`[data-testid=${id}]`), id);

/** A picture at 390 and at 320 px, the focus where it is (tend explore 27). */
async function shot27(page, shot, name) {
  const vp = page.viewportSize();
  await shot(page, `${name}-${vp.width}`);
  await page.setViewportSize({ width: 320, height: vp.height });
  await page.waitForTimeout(300);
  await shot(page, `${name}-320`);
  await page.setViewportSize(vp);
  await page.waitForTimeout(300);
}

async function checks(h) {
  const { BASE, ctx, page, start, at, distanceM, names, OVERTURE_RELEASE, overtureAsked, check, shot, tabTo, tabBarShown, tiles, areaTile } = h;
  await arrive(h);
    // The place view names Fox Point's finds, never counts them, and the overview shows neither (E10, decision 0099).
    check((await page.locator('[data-testid=place-count]').count()) === 0 && (await page.locator('[data-testid=mark-pin]').count()) === 0, 'the home shows no count and no "?" on the overview');
    await page.click('[aria-label^="Fox Point,"]');
    await page.waitForSelector('[data-testid=place-found]');
    check(/Hessian Memorial/.test(await page.locator('[data-testid=place-found]').innerText()), "Fox Point's place view names what was found there");
    check((await page.locator('[data-testid=place-count]').count()) === 0 && !/\d+\s*of\s*\d+/.test(await page.locator('[data-testid=home-sheet]').innerText().catch(() => '')), 'E10 (decision 0099): and never counts it: no "N of M"');
    await page.click('[data-testid=sheet-map]');
    // Explore is an atlas (AT1-AT14): the areas near Navigate's last fix as a grid of same-scale tiles,
    // read by themselves, nearest first; never asking for a position of its own.
    const tileOf = (name) => page.locator(`[data-testid=atlas-tile][data-name="${name}"]`);
    const toExplore = async () => {
      await tabTo(page, 'navigate');
      await page.waitForSelector('[data-testid=start]');
      await page.waitForTimeout(1500);
      await tabTo(page, 'explore');
      await page.waitForSelector('[data-testid=atlas-carousel]');
    };
    await toExplore();
    // Near you the row is the towns; Fox Point is on your town's page (fix explore-town-scope).
    await areaTile(page, 'Fox Point');
    await page.waitForSelector('[data-testid=atlas-tile][data-name="Fox Point"][data-read="1"]', { timeout: 60000 }).catch(() => {});
    {
      const names = await page.locator('[data-testid=atlas-tile]').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')));
      const fox = tileOf('Fox Point');
      const label = (await fox.getAttribute('aria-label')) ?? '';
      check((await page.locator('canvas.maplibregl-canvas').count()) === 1 && (await page.locator('[data-testid=atlas-back-pill]').count()) === 1 && names[0] === 'Fox Point' && /^Fox Point\. You’re here\./.test(label),
        `AT1: your town's page lists its neighborhoods, the one you're in first (${names.join(', ')}: ${label})`);
      check((await fox.getAttribute('data-read')) === '1' && (await fox.locator('[data-kind]').count()) >= 1 && (await fox.locator('svg').count()) === 0,
        'AT3, AT5: its ring was read by itself; the card has the kinds it has (round 3: only those present) and no picture (the area\'s card has it, decision 0124)');
      check(/Walked (once|\d+ times)/.test(label) && /History: (some|plenty|lots)/.test(label),
        `AT3, AT13: the tile says how often you walked there and each kind present in words (${label})`);
      const atlasRows = await page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('atlas_area', 'readonly').objectStore('atlas_area').getAll();
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const foxRow = atlasRows.find((r) => r.name === 'Fox Point');
      check(foxRow && foxRow.profile && foxRow.build && foxRow.code, 'AT12: the ring read is kept as a cache tagged with the build and the atlas rules');
      check(!/\d+\s*of\s*\d+/.test(await page.locator('body').innerText()), 'AT11: no "N of M" anywhere on Explore');
      await shot(page, '11b-explore');
    }
    {
      // AT15: the title floats over the map: the map runs to the top of the screen (no inset on the web),
      // and the title and subtitle sit on a card lifted by a shadow, with no empty band above it.
      const canvas = await page.locator('canvas.maplibregl-canvas').boundingBox();
      const card = await page.evaluate(() => {
        let el = document.querySelector('[data-testid=atlas-title]');
        for (; el; el = el.parentElement) if (getComputedStyle(el).boxShadow !== 'none') break;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const inside = ['explore-area', 'explore-subtitle'].every((id) => {
          const b = document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect();
          return !!b && b.height > 0 && b.top >= r.top && b.bottom <= r.bottom + 0.5;
        });
        return { y: Math.round(r.y), h: Math.round(r.height), shadow: getComputedStyle(el).boxShadow, inside };
      });
      check(canvas && canvas.y <= 0.5 && card && card.inside && card.y > canvas.y && card.y <= canvas.y + 24 && card.y + card.h < canvas.y + canvas.height,
        `AT15: the title and subtitle float on a shadowed card over a map that runs to the top (map from ${canvas && Math.round(canvas.y)}, ${JSON.stringify(card)})`);
    }
    {
      // AT9: the small map shows the areas' points; selecting a tile frames its area with its 800 m ring.
      const ring = () => page.locator('[data-ring]').last().getAttribute('data-ring');
      // Neighborhood boundaries (HB9): its own ground, as a line, stands in place of the ring once the tiles are kept.
      const drawnAround = async () => ((await ring()) || (await page.locator('[data-ground]').last().getAttribute('data-ground')) || '');
      // The points are drawn once the map has loaded its style and the areas are read: wait for them before counting.
      await page.waitForSelector('[data-testid=area-point]', { timeout: 15000 }).catch(() => {});
      const points = await page.locator('[data-testid=area-point]').count();
      const ringBefore = await ring();
      const hoods = await page.locator('[data-testid=atlas-tile]:not([data-level="town"])').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')));
      const pickName = hoods.find((n) => n !== 'Fox Point') ?? 'Fox Point';
      // On a town's page its own card is selected on arrival: a first tap selects the area, a second opens it (EC11).
      await tileOf(pickName).click();
      if (!(await page.waitForSelector('[data-testid=atlas-card]', { timeout: 3000 }).then(() => true, () => false))) await tileOf(pickName).click();
      await page.waitForSelector('[data-testid=atlas-card]');
      {
        // specs/storefronts SF2, SF4, SF9: the card says storefronts, one list, and Walk to starts you on a street with no superlative.
        const text = await page.locator('[data-testid=atlas-card]').innerText();
        const list = page.locator('[data-testid=atlas-storefronts]');
        const via = await page.locator('[data-testid=atlas-walk-via]').innerText().catch(() => null);
        check(!/\bbus(y|iest)\b/i.test(text) && (await list.count()) <= 1 && (!(await list.count()) || (/(^|\n)Storefronts\n/i.test(text) && /you walk into/.test(text))) && (via == null || /^Starts you on \S/.test(via)),
          `SF2, SF4, SF9: ${pickName}'s card says Storefronts, one list (${await list.locator('[data-testid=atlas-storefront]').count()} streets), never busy; Walk to's line ${JSON.stringify(via)}`);
        if (await list.count()) {
          await list.scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(400);
          await shot(page, 'sf-card-storefronts');
        }
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);
      const canvas = await page.locator('canvas.maplibregl-canvas').boundingBox();
      const sel = page.locator('[data-testid=area-point][data-selected="1"]');
      // The selected dot itself (14 px), not the marker's box, which holds its name below it.
      const dot = (await sel.count()) ? await sel.first().evaluate((el) => {
        const d = [...el.querySelectorAll('div')].map((x) => x.getBoundingClientRect()).find((r) => Math.abs(r.width - 14) < 1 && Math.abs(r.height - 14) < 1);
        return d ? { x: d.x, y: d.y, width: d.width, height: d.height } : null;
      }) : null;
      const dx = dot ? dot.x + dot.width / 2 - (canvas.x + canvas.width / 2) : NaN;
      const dy = dot ? dot.y + dot.height / 2 - (canvas.y + canvas.height / 2) : NaN;
      const selName = (await sel.count()) ? await sel.first().getAttribute('data-name') : null;
      // Explore's fit pads 84 px under its title and 24 px at the bottom: the area sits 30 px below the middle.
      for (let i = 0; i < 20 && !(await drawnAround()); i++) await page.waitForTimeout(500);
      check(points >= hoods.length && !ringBefore && (await drawnAround()) !== '' && selName === pickName && Math.abs(dx) <= 8 && Math.abs(dy - 30) <= 8,
        `AT9: the small map shows the areas' points; on your town's page its own card is selected on arrival (no ring), and opening an area's card frames it with its 800 m ring, or its own ground (${points} points for ${hoods.length} tiles, ring ${JSON.stringify(ringBefore)} → ${await ring()}, ${selName} at (${dx.toFixed(1)}, ${dy.toFixed(1)}) px from the middle)`);
      // tend explore 20 (decision 0172, the accent at rest): the selected area's name and its dot's ring on the map are
      // ink (#1d2430), never the accent; a selection is not an action.
      const selInk = (await sel.count()) ? await sel.first().evaluate((el) => {
        const named = [...el.querySelectorAll('div')].find((e) => e.childElementCount === 0 && e.textContent && e.textContent === el.dataset.name);
        const ringed = [...el.querySelectorAll('div')].find((x) => { const r = x.getBoundingClientRect(); return Math.abs(r.width - 14) < 1 && Math.abs(r.height - 14) < 1; });
        return { name: named ? getComputedStyle(named).color : null, dot: ringed ? getComputedStyle(ringed).borderTopColor : null };
      }) : null;
      check(selInk && selInk.name === 'rgb(29, 36, 48)' && selInk.dot === 'rgb(29, 36, 48)', `tend explore 20: the selected area's name and dot on the map are ink at rest (${JSON.stringify(selInk)})`);
      await shot(page, 'tend-explore-20-map-name-390');
      {
        // tend explore audit 22 (decision 0172, the accent at rest; the review's U7): the search's close word is ink, a
        // dismissal, never a card's primary action.
        await page.click('[data-testid=atlas-search]').catch(() => {});
        const open22 = await page.waitForSelector('[data-testid=atlas-search-close]', { timeout: 8000 }).then(() => true, () => false);
        const close22 = open22 ? await page.locator('[data-testid=atlas-search-close]').evaluate((el) =>
          [...el.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && e.textContent).map((e) => ({ text: e.textContent, color: getComputedStyle(e).color }))) : null;
        const vp = page.viewportSize();
        await page.setViewportSize({ width: 320, height: vp.height });
        await page.waitForTimeout(400);
        await shot(page, 'tend-explore-audit-22-search-320');
        await page.setViewportSize(vp);
        await page.waitForTimeout(300);
        await page.click('[data-testid=atlas-search-close]').catch(() => {});
        await page.waitForTimeout(400);
        check(!!close22 && close22.length === 1 && close22[0].color === 'rgb(29, 36, 48)' && (await page.locator('[data-testid=atlas-search-sheet]').count()) === 0,
          `tend explore audit 22: the search's close word is ink at rest, and it closes the search (${JSON.stringify(close22)})`);
      }
    }
    {
      // AT8: a tile opens its card; unfound places are never named (AT7), finds are.
      await tileOf('Fox Point').click();
      await page.waitForSelector('[data-testid=atlas-card]');
      const card = await page.locator('[data-testid=atlas-card]').innerText();
      check(/Hessian Memorial/.test(await page.locator('[data-testid=atlas-found]').innerText().catch(() => '')),
        `AT8: the card names what you found here (${card.replace(/\s+/g, ' ').slice(0, 160)})`);
      check((await page.locator('[data-testid=atlas-walk]').count()) === 0 && /You’re in Fox Point/.test(card), 'AT8: the area you are in has no Walk to');
      check((await page.locator('[data-testid=atlas-kind-history]').count()) === 1 && !/\d+\s*of\s*\d+/.test(card), 'AT8: the eight kinds in words, no counts');
      {
        // The card is a full-screen drawer over the tabs, which fold away while it is open (the owner, Nov 4).
        await page.waitForTimeout(700);
        const vp = page.viewportSize();
        const box = await page.locator('[data-testid=atlas-card]').boundingBox();
        check(box && box.y <= 1 && box.height >= vp.height - 2,
          `drawer: the card covers the whole screen (${box && Math.round(box.y)}+${box && Math.round(box.height)} of ${vp.height})`);
        // The layout folds the wrap to zero height with overflow hidden, so the tabs inside keep their own
        // boxes: read the wrap, and what is drawn where the tab was.
        const wrap = await page.locator('[data-testid=tab-bar-wrap]').boundingBox();
        check((!wrap || wrap.height === 0) && !(await tabBarShown(page)),
          `drawer: the tab bar is folded away while the card is open (wrap ${wrap ? Math.round(wrap.height) : 'gone'} px)`);
        const kind = await page.locator('[data-testid=atlas-kind-history]').boundingBox();
        check(kind && box && kind.y + kind.height <= box.y + box.height + 1, 'AT8: its body is inside it');
        // A pull on the handle follows the finger: half-way is not enough to close, so it springs back on let-go.
        const grip = await page.locator('[data-testid=atlas-card-grip]').boundingBox();
        const gx = grip.x + grip.width / 2;
        const gy = grip.y + grip.height / 2;
        await page.mouse.move(gx, gy);
        await page.mouse.down();
        await page.mouse.move(gx, gy + vp.height * 0.15, { steps: 6 });
        await page.waitForTimeout(150);
        const mid = await page.locator('[data-testid=atlas-card]').boundingBox();
        check(mid && mid.y > vp.height * 0.1 && mid.y < vp.height * 0.2, `drawer: it follows the pull (${mid && Math.round(mid.y)})`);
        await page.mouse.move(gx, gy + vp.height * 0.02, { steps: 4 });
        await page.mouse.up();
        await page.waitForTimeout(700);
        const back = await page.locator('[data-testid=atlas-card]').boundingBox();
        check(back && back.y <= 1, 'drawer: let go short of a third of the screen, it springs back');
        // A pull the length of the screen, let go, finishes the close. A finger's pull, through CDP touch
        // events, as the repo drags moving sheets (a mouse pull of this length stopped the page answering).
        {
          const cdp = await ctx.newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: gx, y: gy }] });
          for (let i = 1; i <= 12; i++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: gx, y: gy + (vp.height * 0.6 * i) / 12 }] });
            await page.waitForTimeout(16);
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cdp.detach();
        }
        await page.waitForTimeout(700);
        check((await page.locator('[data-testid=atlas-card]').count()) === 0, 'drawer: a long pull down closes it');
        check(await page.locator('[data-testid=tab-explore]').isVisible(), 'drawer: the tabs come back as it closes');
        await tileOf('Fox Point').click();
        await page.waitForSelector('[data-testid=atlas-card]');
        await page.waitForTimeout(700);
      }
      {
        // tend explore 27 (WCAG 2.2, 2.4.3 Focus Order and 2.4.11 Focus Not Obscured): while the full-screen card is up, Tab and
        // Shift+Tab stay inside it, wrapping at either end, never reaching the map or the row under it.
        const start = await focused(page);
        const seen = [];
        let out = null;
        await page.keyboard.press('Shift+Tab');
        if (!(await focusIn(page, 'atlas-card'))) out = `Shift+Tab: ${JSON.stringify(await focused(page))}`;
        await shot27(page, shot, 'tend-explore-27-card-shift-tab');
        for (let i = 0; i < 60 && !out; i++) {
          await page.keyboard.press('Tab');
          if (!(await focusIn(page, 'atlas-card'))) out = `Tab ${i + 1}: ${JSON.stringify(await focused(page))}`;
          else seen.push((await focused(page)).id);
        }
        const cycle = seen.indexOf(seen[0], 1);
        {
          // tend explore audit 39 (WCAG 2.2, 2.4.3): after a click on the card's text (focus on the page, the browser's starting
          // point there), Tab goes on from where the click was, the Storefronts list, never back to the card's first stop.
          const at = await page.evaluate(() => {
            const t = [...document.querySelectorAll('[data-testid=atlas-card] *')].find((d) => d.childElementCount === 0 && d.textContent === 'Storefronts');
            if (!t) return null;
            t.scrollIntoView({ block: 'center' });
            const r = t.getBoundingClientRect();
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          });
          await page.waitForTimeout(300);
          const hit = at ? await page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}:${e.textContent?.slice(0, 20)}` : null; }, at) : null;
          if (at) await page.mouse.click(at.x, at.y);
          const clicked = await focused(page);
          await page.keyboard.press('Tab');
          const after = await focused(page);
          check(!!at && after && after.id === 'atlas-storefront-walk',
            `tend explore audit 39: Tab after a click on the card's Storefronts heading goes on to its first street (${JSON.stringify({ hit, clicked, after })})`);
        }
        check(start && start.id === 'atlas-card-name' && !out && cycle > 0,
          `tend explore 27: the card opens at its name, and Tab and Shift+Tab stay inside the full-screen card, wrapping (${out ?? `from ${start && start.id}, Shift+Tab then Tab: ${seen.slice(0, cycle + 1).join(' > ')}`})`);
      }
      await page.click('[data-testid=atlas-how]');
      {
        const how = await page.locator('[data-testid=atlas-how-panel]').innerText();
        // A neighborhood counted across its own ground says so instead of the ring's line (neighborhood boundaries audit 11).
        check(/same marks mean the same anywhere|counted across the ground drawn around it/.test(how) && !/\d/.test(how), `atlas round 3: How the marks work says it in words, with no counts (${how.replace(/\s+/g, ' ').slice(0, 80)})`);
      }
      await shot(page, '11c-atlas-card');
      {
        // tend explore 19 (decision 0172, the accent at rest): "How the marks work" and its icon are ink (#1d2430), never
        // the accent; it is a toggle, not the card's primary action.
        const howInk = await page.locator('[data-testid=atlas-how]').evaluate((el) =>
          [...el.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && e.textContent).map((e) => getComputedStyle(e).color));
        check(howInk.length === 2 && howInk.every((c) => c === 'rgb(29, 36, 48)'), `tend explore 19: "How the marks work" and its icon are ink at rest (${JSON.stringify(howInk)})`);
        const vp = page.viewportSize();
        await page.setViewportSize({ width: 320, height: vp.height });
        await page.waitForTimeout(400);
        await shot(page, 'tend-explore-19-how-320');
        await page.setViewportSize(vp);
        await page.waitForTimeout(400);
      }
      {
        // tend explore 4: with the planner open over the card, one Escape closes the planner only; the card is as it was.
        const plan = page.locator('[data-testid^=atlas-kind-walk-]').first();
        const has = (await plan.count()) === 1;
        let into = null;
        let kept = null;
        const planStops = [];
        let back = null;
        const opener = has ? await plan.getAttribute('data-testid') : null;
        if (has) {
          await plan.click();
          await page.waitForSelector('[data-testid=planner]', { timeout: 10000 });
          // tend explore 27: the planner moves focus into itself as it opens, as the card does.
          await page.waitForTimeout(400);
          into = await focused(page);
          await shot27(page, shot, 'tend-explore-27-planner-open');
          // tend explore 27: and Tab and Shift+Tab stay inside it.
          kept = true;
          await page.keyboard.press('Shift+Tab');
          kept = kept && (await focusIn(page, 'planner'));
          for (let i = 0; i < 30 && kept; i++) {
            await page.keyboard.press('Tab');
            kept = await focusIn(page, 'planner');
            planStops.push((await focused(page)).id);
          }
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
          back = await focused(page);
        }
        const planner = await page.locator('[data-testid=planner]').count();
        const card = await page.locator('[data-testid=atlas-card]').count();
        check(has && planner === 0 && card === 1, `tend explore 4: one Escape closes the planner and leaves the card open (button ${has}, planner ${planner}, card ${card})`);
        check(into && into.id === 'plan-title' && back && back.id === opener,
          `tend explore 27: the planner takes focus as it opens, at its title, and gives it back to ${opener} as it closes (${JSON.stringify({ into, back })})`);
        check(kept === true, `tend explore 27: Tab and Shift+Tab stay inside the planner (${kept})`);
        // tend explore audit 38 (WCAG 2.2, 2.1.1 Keyboard): the trap keeps every stop the browser has, the map's credits (a <summary>) too.
        check(planStops.includes('summary'), `tend explore audit 38: Tab inside the planner reaches the map's credits (${[...new Set(planStops)].join(' > ')})`);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      check((await page.locator('[data-testid=atlas-card]').count()) === 0, 'AT8: Escape closes the card');
      {
        // tend explore 27 (WCAG 2.2, 2.4.3 Focus Order; Material: on close "focus returns to the interactive element that
        // initiated the action"): closing the card gives focus back to the tile that opened it.
        const back = await focused(page);
        await shot27(page, shot, 'tend-explore-27-card-closed');
        check(back && back.id === 'atlas-tile' && back.name === 'Fox Point', `tend explore 27: closing the card gives focus back to the tile that opened it (${JSON.stringify(back)})`);
      }
      // explore-atlas audit 8: a card left open closes when another tab comes to the front, so it never keeps
      // Back and Escape from that tab.
      await tileOf('Fox Point').click();
      await page.waitForSelector('[data-testid=atlas-card]');
      await page.waitForTimeout(700);
      // The tab bar is folded away under the drawer, so leave the way a notification would: by the router.
      await page.evaluate((base) => { window.history.pushState({}, '', `${base}/`); window.dispatchEvent(new PopStateEvent('popstate')); }, BASE);
      await page.waitForTimeout(800);
      await tabTo(page, 'explore');
      await page.waitForSelector('[data-testid=atlas-carousel]');
      check((await page.locator('[data-testid=atlas-card]').count()) === 0, 'explore-atlas audit 8: leaving the tab closes its card');
      // AT2 (fix explore-town-scope): near you the row is the towns, yours leading and selected, listed once; a tap on it
      // opens its page, whose pill goes back to the towns with it still selected.
      if (await page.locator('[data-testid=atlas-back-pill]').count()) await page.click('[data-testid=atlas-back-pill]');
      await page.waitForSelector('[data-testid=atlas-tile][data-level="town"][data-selected="1"]', { timeout: 10000 }).catch(() => {});
      const front = await page.locator('[data-testid=atlas-tile]').evaluateAll((els) => els.map((e) => ({ name: e.getAttribute('data-name'), level: e.getAttribute('data-level'), sel: e.getAttribute('data-selected') })));
      const homeName = front[0]?.name;
      check(front.length > 0 && front.every((t) => t.level === 'town') && front[0].sel === '1' && front.filter((t) => t.name === homeName).length === 1
        && (await page.locator('[data-testid=explore-area]').innerText()) === 'Near you',
        `AT2: near you the row is the towns, your town (${homeName}) leading, selected and listed once (${front.map((t) => t.name).join(', ')})`);
      await page.click('[data-testid=atlas-tile][data-level="town"][data-selected="1"]');
      const head = await page.waitForSelector('[data-testid=atlas-town-head]', { timeout: 10000 }).then(() => true, () => false);
      check(head && (await page.locator('[data-testid=explore-area]').innerText()) === homeName && /\bTowns$/.test((await page.locator('[data-testid=atlas-back-pill]').innerText()).trim()),
        `AT2: the town's card opens its own page, its own card first, with a way back to the towns low on the screen (${homeName})`);
      check((await page.locator('[data-testid=atlas-back]').count()) === 0, 'town page: one way back, the low pill; the title has no arrow (decision 0077)');
      await shot(page, '11d-atlas-town');
      await page.click('[data-testid=atlas-back-pill]');
      await page.waitForSelector(`[data-testid=atlas-tile][data-name="${homeName}"][data-selected="1"]`, { timeout: 10000 }).catch(() => {});
      check((await page.locator('[data-testid=atlas-town-head]').count()) === 0 && (await page.locator(`[data-testid=atlas-tile][data-name="${homeName}"][data-selected="1"]`).count()) === 1,
        'AT2: back returns to the towns, the one you left still selected');
    }
    // What's here (v1.5): a long press on the small map, then a read of the area around the city
    // nearby, finds Thayer Street's strip, as information (L1, L2, L5, L7, L9, NV15).
    {
      const press = async () => {
        await page.waitForTimeout(1100);
        const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
        // The small map shows more ground per pixel than the old full-screen one: pressed near its middle.
        await page.mouse.move(box.x + box.width / 2 - 15, box.y + box.height / 2 - 10);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
        await page.waitForSelector('[data-testid=look-here]', { timeout: 5000 });
      };
      // Cancel goes at once and keeps nothing (audit).
      const rows = () => page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('landing', 'readonly').objectStore('landing').getAll();
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const rowsBefore = (await rows()).length;
      tiles.delayMs = 4000;
      await press();
      check((await page.locator('[data-testid=walk-here]').count()) === 1, 'at street zoom, Explore’s long press offers Walk here too (NV15)');
      {
        // atlas round 3: the choices sit over the map, never inside the scrolled list; the hint goes once used.
        const map = await page.locator('canvas.maplibregl-canvas').boundingBox();
        const sp = await page.locator('[data-testid=atlas-spot]').boundingBox();
        check(sp && map && sp.y >= map.y - 1 && sp.y + sp.height <= map.y + map.height + 1, 'atlas round 3: the long press’s choices sit over the map');
        check((await page.locator('[data-testid=atlas-press-hint]').count()) === 0, 'atlas round 3: the press hint goes once the long press is used');
      }
      const lookWords = await page.locator('[data-testid=look-here]').innerText().catch(() => '');
      check(/^What’s here\?$/.test(lookWords.trim()), `SF15: the long press offers "What’s here?" (${JSON.stringify(lookWords)})`);
      await page.click('[data-testid=look-here]');
      {
        // tend explore audit 22 (decision 0172, the accent at rest; the review's U7): "Cancel" while Explore looks is ink,
        // a dismissal, never a card's primary action.
        const cancel22 = await page.locator('[data-testid=look-cancel]').evaluate((el) =>
          [...el.querySelectorAll('*')].filter((e) => e.childElementCount === 0 && e.textContent === 'Cancel').map((e) => getComputedStyle(e).color)).catch(() => null);
        const vp = page.viewportSize();
        await page.setViewportSize({ width: 320, height: vp.height });
        await page.waitForTimeout(300);
        await shot(page, 'tend-explore-audit-22-look-cancel-320');
        await page.setViewportSize(vp);
        await page.waitForTimeout(200);
        check(!!cancel22 && cancel22.length === 1 && cancel22[0] === 'rgb(29, 36, 48)', `tend explore audit 22: "Cancel" while Explore looks is ink at rest (${JSON.stringify(cancel22)})`);
      }
      await page.click('[data-testid=look-cancel]');
      const gone = (await page.locator('[data-testid=look-cancel]').count()) === 0;
      await page.waitForTimeout(6000);
      tiles.delayMs = 0;
      check(gone && (await rows()).length === rowsBefore, 'cancelling a look stops it at once, with nothing kept');
      await press();
      // EC19: the notice from the first look is still over the map; it sits above the long press's choices, never over them.
      check(await page.evaluate(() => {
        const e = document.querySelector('[data-testid=look-here]');
        const r = e.getBoundingClientRect();
        const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!t && e.contains(t);
      }), 'EC19: a notice over the map never covers the long press\'s choices');
      await page.click('[data-testid=look-here]');
      const said = await page.waitForSelector('text=/A best guess from the map|Couldn’t read the map here/', { timeout: 30000 }).then((e) => e.innerText(), () => 'nothing');
      await shot(page, '11c-landing');
      check(/Where storefronts gather: Thayer Street/.test(said), `what’s good here finds the strip, named (${said})`);
      const first = await rows();
      check(first.some((r) => r.analysis.strips.some((x) => x.name === 'Thayer Street')), 'the area is remembered, Thayer Street among its strips');
      {
        // AD3, AD4: Brook Street's places are only in Overture's tiles, read by the app's own reader; the unsure and the
        // closed ones don't count. The row says which release it was measured with (AD6).
        const area = first.find((r) => r.analysis.strips.some((x) => x.name === 'Thayer Street'));
        const brook = area?.analysis.strips.find((x) => x.name === 'Brook Street');
        check(!!brook && area.overture === OVERTURE_RELEASE, `AD3: Overture's places make Brook Street a busy street (${area?.overture}, ${JSON.stringify(area?.analysis.strips.map((x) => x.name))})`);
        check(brook && distanceM(brook.peak, at(13, 0.08)) < 150, `AD4: Brook Street's busiest point sits among the places Overture is sure of, not the unsure or closed ones (${brook && JSON.stringify(brook.peak)})`);
        // AD3: Overture is asked only for its release listing and its release's places, by byte range, with no key;
        // since town outlines, its divisions too, the same way (TO12); and since walkability, an opened area card's
        // transportation tiles, the same way (WK1, WK11).
        const odd = overtureAsked.filter((q) => {
          const u = new URL(q.url);
          if (u.searchParams.get('list-type') === '2') return [...u.searchParams.keys()].some((k) => !['list-type', 'prefix', 'delimiter'].includes(k));
          return ![`/tiles/${OVERTURE_RELEASE}/places.pmtiles`, `/tiles/${OVERTURE_RELEASE}/divisions.pmtiles`, `/tiles/${OVERTURE_RELEASE}/transportation.pmtiles`, `/tiles/${OVERTURE_RELEASE}/buildings.pmtiles`].includes(u.pathname) || u.search !== '' || !/^bytes=\d+-\d+$/.test(q.range ?? '');
        });
        check(overtureAsked.length > 0 && odd.length === 0, `AD3, TO12: Overture is asked for its listing, its places, its divisions and its transportation by byte range only (${overtureAsked.length} requests; odd: ${JSON.stringify(odd.slice(0, 2))})`);
        // AD12: the area's grades are kept for drawing; AD15: no numbers in what is said.
        check(area && area.analysis.graded.some((g) => g.grade >= 2), 'AD12: the remembered area keeps its graded stretches');
        check(!/\d/.test(said.replace(/A best guess from the map\.?/, '')), `AD15: what's good here says no number (${said})`);
      }
      // Again: the same area is replaced, not added (L12).
      await press();
      await page.click('[data-testid=look-here]');
      await page.waitForSelector('text=/Where storefronts gather/', { timeout: 30000 });
      check((await rows()).length === first.length, 'looking again replaces the area');
      // Reloaded on the tab, the atlas comes back from storage at once (AT12), offline of the map's reads (NV5).
      await page.reload();
      await areaTile(page, 'Fox Point', 30000);
      const back = await page.waitForSelector('[data-testid=atlas-tile][data-name="Fox Point"][data-read="1"]', { timeout: 30000 }).then(() => true, () => false);
      const label = back ? (await tileOf('Fox Point').getAttribute('aria-label')) ?? '' : '';
      check(back && new URL(page.url()).pathname === `${BASE}/explore`,
        `AT1, AT12: after a reload, the atlas is back on the same tab from where it last listed (${label}; the launch's one fix may already say "You're here", NV16)`);
      if (back) {
        // AD14: the area's small map (on its card, decision 0124) draws its graded streets in magenta, a path per grade, wider as the grade rises.
        // On your town's page its own card is selected on arrival: a first tap selects Fox Point, a second opens it (EC11).
        await tileOf('Fox Point').click();
        if (!(await page.waitForSelector('[data-testid=atlas-card]', { timeout: 3000 }).then(() => true, () => false))) await tileOf('Fox Point').click();
        await page.waitForSelector('[data-testid=atlas-card]');
        const strokes = await page.locator('[data-testid=atlas-card]').evaluate((el) => [...el.querySelectorAll('path')]
          .filter((p) => (p.getAttribute('stroke') ?? '').toLowerCase() === '#d6268c')
          .map((p) => Number(p.getAttribute('stroke-width'))));
        check(strokes.length >= 2 && new Set(strokes).size === strokes.length, `AD14: Fox Point's card draws its graded streets, one path per grade (${JSON.stringify(strokes)})`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
        // AD16: the map credits Overture.
        const credits = await page.locator('.maplibregl-ctrl-attrib').first().textContent().catch(() => '');
        check(/Overture Maps Foundation/.test(credits ?? ''), `AD16: the map's credits name Overture Maps Foundation (${credits})`);
      }
      await tabTo(page, 'chronicle');
      await page.reload();
      await h.mapUp(page);
      await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 30000 });
      await page.waitForTimeout(1000);
    }
    {
      // tend explore audit 32 (and tend explore 25, audit 33 at runtime): with the atlas's writes refused after a first
      // listing (its rows and near reads cleared, then every write of them aborted, as a full disk aborts it), Explore lists
      // again: the row shows the towns it read, their rings read too, unkept, and does not settle on "No towns are named".
      // CDP's Storage.overrideQuotaForOrigin is ignored for a Playwright context in this headless Chromium (Nov 18: a page
      // session, a persistent context; a browser session answers "Internal error"), so the writes are refused in the page.
      const { c, pg } = await h.freshPage('atlas-full');
      await c.addInitScript(() => {
        if (localStorage.getItem('e2e_refuse_atlas') !== '1') return;
        const refuse = (store, key) => store === 'atlas_area' || (store === 'meta' && typeof key === 'string' && key.startsWith('atlas_near:'));
        const put = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function (value, key) {
          const req = put.call(this, value, key);
          if (refuse(this.name, value && value.key)) this.transaction.abort();
          return req;
        };
      });
      const errorsBefore = h.errors.length;
      try {
        await pg.goto(h.exploreUrl);
        await pg.waitForSelector('[data-testid=atlas-tile][data-level="town"]', { timeout: 60000 }).catch(() => {});
        await pg.waitForTimeout(3000);
        const idb = (src) => pg.evaluate((body) => new Promise((resolve) => {
          const req = indexedDB.open('chronicles');
          req.onsuccess = () => new Function('db', 'resolve', body)(req.result, resolve);
          req.onerror = () => resolve('open failed');
        }), src);
        const listed = await idb(`const g = db.transaction('atlas_area', 'readonly').objectStore('atlas_area').getAll(); g.onsuccess = () => resolve(g.result.length);`);
        const cleared = await idb(`const tx = db.transaction(['atlas_area', 'meta'], 'readwrite');
          tx.objectStore('atlas_area').clear(); tx.objectStore('meta').delete('atlas_near:neighborhood'); tx.objectStore('meta').delete('atlas_near:town');
          tx.oncomplete = () => resolve(true); tx.onabort = () => resolve(String(tx.error && tx.error.name));`);
        await pg.evaluate(() => localStorage.setItem('e2e_refuse_atlas', '1'));
        await pg.reload();
        const refused = await idb(`const tx = db.transaction('atlas_area', 'readwrite'); tx.objectStore('atlas_area').put({ key: 'e2e_probe' });
          tx.oncomplete = () => resolve('written'); tx.onabort = () => resolve('aborted');`);
        const said = [];
        let seen = { towns: [], read: 0 };
        const until = Date.now() + 45000;
        while (Date.now() < until) {
          said.push(await pg.locator('[data-testid=atlas-empty]').innerText().catch(() => ''));
          seen = await pg.locator('[data-testid=atlas-tile][data-level="town"]').evaluateAll((els) => ({
            towns: els.map((e) => e.getAttribute('data-name')),
            read: els.filter((e) => e.getAttribute('data-read') === '1').length,
          }));
          if (seen.towns.length && seen.read) break;
          await pg.waitForTimeout(500);
        }
        // A few seconds more: the row holds.
        await pg.waitForTimeout(4000);
        const settled = await pg.locator('[data-testid=atlas-empty]').innerText().catch(() => '');
        const stillTowns = await pg.locator('[data-testid=atlas-tile][data-level="town"]').count();
        const kept = await idb(`const g = db.transaction('atlas_area', 'readonly').objectStore('atlas_area').getAll(); g.onsuccess = () => resolve(g.result.length);`);
        await shot(pg, 'tend-explore-audit-32-writes-refused');
        const none = said.filter((t) => /No towns are named/.test(t)).length;
        check(listed > 0 && cleared === true && refused === 'aborted' && seen.towns.length > 0 && seen.read > 0 && stillTowns > 0 && !/No towns are named/.test(settled) && kept === 0,
          `tend explore audit 32: with the atlas's writes refused, the row lists the towns read (their rings too, unkept) and does not settle on "No towns are named" (${JSON.stringify({ listed, cleared, refused, ...seen, stillTowns, settled, kept, samplesSayingNone: `${none} of ${said.length}` })})`);
      } finally {
        await c.close();
        // The writes this step refused are its own: console errors for them are expected here, and nowhere else.
        const own = h.errors.splice(errorsBefore).filter((e) => !/^atlas-full: .*(AbortError|Transaction aborted|aborted)/i.test(e));
        h.errors.push(...own);
      }
    }
}

// Alone: the walk journey first (the first walk, with its captures), then this.
async function run(h) {
  await require('./walk').run(h);
  await checks(h);
}

module.exports = {
  name: 'atlas',
  covers: [
    'src/lib/landing/**',
    'src/lib/activity/**',
    'src/components/atlas/**',
    'src/lib/atlas/**',
  ],
  run,
  checks,
};
