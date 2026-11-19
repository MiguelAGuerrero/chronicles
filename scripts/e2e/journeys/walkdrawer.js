// The walk's drawer (specs/walk-drawer-sections WD1, WD3-WD5, WD7-WD13, WD15-WD17): pulled up, "This walk" in words;
// the strip's … a menu of four sections, each shown alone inside the drawer with "‹ Walk settings"; the capture stack
// riding on the drawer's edge. A walk of a few fixes and a note. E2E_ONLY=walkdrawer runs it alone.

async function run(h) {
  const { navUrl, BASE, at, check, shot, freshPage, nothingLeaves, toStop } = h;
  const { c, pg } = await freshPage('walkdrawer');
  const visible = (id) => pg.locator(`[data-testid=${id}]:visible`).count();
  const text = (sel) => pg.locator(sel).first().innerText().catch(() => '');
  const settle = () => pg.waitForTimeout(800);
  const fontSizes = (sel) => pg.evaluate((q) => {
    const root = document.querySelector(q);
    if (!root) return [];
    return [...new Set([...root.querySelectorAll('div[dir], span')].filter((e) => e.childElementCount === 0 && e.textContent.trim())
      .map((e) => parseFloat(getComputedStyle(e).fontSize)))];
  }, sel);
  // Is the element's middle the element itself (or inside it), not something drawn over it?
  const onTop = (id) => pg.evaluate((tid) => {
    const e = document.querySelector(`[data-testid=${tid}]`);
    if (!e) return false;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.top < 0 || r.bottom > innerHeight) return false;
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!hit && (hit === e || e.contains(hit));
  }, id);

  // A walk with a few fixes and a note.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=pause-walk]', { timeout: 15000 });
  for (let k = 0; k <= 12; k++) {
    const p = at(-0.5 + k * 0.02, -0.5);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(700);
  }
  await pg.click('[data-testid=cap-note]');
  await pg.fill('[data-testid=note-input]', 'A blue door on the corner.');
  await pg.click('[data-testid=note-done]');
  await pg.waitForTimeout(2500);
  await shot(pg, 'walkdrawer-00-rest');

  // WD5, WD8: a tap on the numbers raises This walk; its words; its time ticks with the strip's.
  await pg.click('[data-testid=walk-summary]');
  const details = await pg.waitForSelector('[data-testid=walk-details]', { state: 'visible', timeout: 5000 }).then(() => true, () => false);
  await settle();
  const detailsText = details ? await text('[data-testid=walk-details]') : '';
  check.todo(details && /Started at \d{1,2}:\d{2} [ap]m/.test(detailsText) && /walked in/.test(detailsText) && /a note/i.test(detailsText)
    && (await visible('explore-walk')) === 0, `WD5: a tap on the numbers shows This walk in words, not the settings (${detailsText.replace(/\n/g, ' | ')})`);
  const strip = await text('[data-testid=walk-stats]');
  const walkedLine = await text('[data-testid=detail-walked]');
  const [stripTime, stripDist] = strip.split('\n')[0].split(' · ');
  check.todo(!!stripTime && walkedLine.includes(stripTime) && walkedLine.includes(stripDist), `WD8: This walk's distance and time are the strip's (${strip} / ${walkedLine})`);
  await pg.waitForTimeout(2100);
  const later = await text('[data-testid=detail-walked]');
  const stripLater = (await text('[data-testid=walk-stats]')).split('\n')[0].split(' · ')[0];
  check.todo(later !== walkedLine && later.includes(stripLater), `WD8: its time moves with the strip's (${walkedLine} → ${later})`);
  // WD7: no fitness, no figures, one text size.
  const banned = /pace|speed|\/km|\/mi|elevation|calorie|heart|split|%|goal|target|to go|remaining/i;
  const sizes = await fontSizes('[data-testid=walk-details]');
  check.todo(details && !banned.test(detailsText) && sizes.length > 0 && Math.max(...sizes) <= 17, `WD7: This walk has no fitness words and nothing larger than its text (${sizes})`);
  // WD17: the captures ride on the drawer, whole and on top; the edge buttons are hidden.
  const ride = async () => (await Promise.all(['cap-photo', 'cap-voice', 'cap-note'].map(onTop))).every(Boolean);
  const bar = await pg.locator('[data-testid=walk-bar]').boundingBox();
  const note = await pg.locator('[data-testid=cap-photo]').boundingBox();
  check.todo((await ride()) && !!bar && !!note && note.y + note.height <= bar.y + 1 && (await visible('recenter')) + (await visible('compass')) === 0,
    'WD17: on This walk the camera, mic and note ride above the drawer\'s edge, each on top; the edge buttons are hidden');
  await shot(pg, 'walkdrawer-01-details');

  // WD9: This walk's last row opens the menu.
  await pg.locator('[data-testid=details-settings]').click({ timeout: 3000 }).catch(() => {});
  const menuFromDetails = await pg.waitForSelector('[data-testid=walk-menu]', { state: 'visible', timeout: 3000 }).then(() => true, () => false);
  check.todo(menuFromDetails && /Walk settings/.test(await text('[data-testid=details-settings]').catch(() => '') || 'Walk settings'), 'WD9: "Walk settings" at This walk\'s foot shows the menu');
  // WD4: Escape on the menu lowers the drawer.
  await pg.keyboard.press('Escape');
  await settle();
  check.todo((await visible('walk-menu')) === 0 && (await visible('walk-details')) === 0, 'WD4: Escape on the menu lowers the drawer');

  // WD1, WD12: the … raises the menu: four rows in order, each a name, its state in words and a chevron.
  await pg.click('[data-testid=strip-more]');
  const menu = await pg.waitForSelector('[data-testid=walk-menu]', { state: 'visible', timeout: 5000 }).then(() => true, () => false);
  await settle();
  const rows = await pg.locator('[data-testid^=section-row-]').evaluateAll((es) => es.map((e) => ({ id: e.getAttribute('data-testid'), said: e.getAttribute('aria-label'), text: e.innerText })));
  check.todo(menu && JSON.stringify(rows.map((r) => r.id)) === JSON.stringify(['section-row-explore', 'section-row-map', 'section-row-reminders', 'section-row-motion'])
    && /Explore\s*\n\s*Off/.test(rows[0]?.text ?? '') && /Location & motion/.test(rows[3]?.text ?? ''),
    `WD1: the … shows "Walk settings", four rows in order, each with its state (${JSON.stringify(rows)})`);
  const more = await pg.locator('[data-testid=strip-more]').evaluate((e) => [e.getAttribute('aria-expanded'), e.getAttribute('aria-label')]).catch(() => []);
  const numbers = await pg.locator('[data-testid=walk-summary]').getAttribute('aria-label').catch(() => '');
  check.todo(more[0] === 'true' && more[1] === 'Lower the walk settings' && /Lower the walk details$/.test(numbers ?? '')
    && (await pg.locator('[data-testid=walk-menu] [role=heading]').count()) >= 1, `WD12: the … is expanded on the menu, the numbers name the details (${more} / ${numbers})`);
  const menuWords = await text('[data-testid=walk-menu]');
  check.todo(!banned.test(menuWords) && !/\b\d+\s+(of|kinds|on)\b/i.test(menuWords), `WD7: the menu's lines carry no figure or count (${menuWords.replace(/\n/g, ' | ')})`);
  check.todo(await ride(), 'WD17: on the menu the captures ride above the drawer');
  await shot(pg, 'walkdrawer-02-menu');

  // WD3, WD11: Explore alone: "‹ Walk settings", its heading, its controls only; switched on, the ring shows here only.
  await pg.locator('[data-testid=section-row-explore]').click({ timeout: 3000 }).catch(() => {});
  const explore = await pg.waitForSelector('[data-testid=walk-section-explore]', { state: 'visible', timeout: 3000 }).then(() => true, () => false);
  await settle();
  const back = await pg.locator('[data-testid=section-back]').evaluate((e) => [e.innerText, e.getAttribute('aria-label'), e.getAttribute('role')]).catch(() => []);
  check.todo(explore && /Walk settings/.test(back[0] ?? '') && back[1] === 'Back to walk settings' && back[2] === 'button'
    && (await visible('explore-walk')) === 1 && (await visible('notify-settings')) === 0 && (await visible('route-leanings')) === 0 && (await visible('share-gps-log')) === 0,
    `WD3, WD12: Explore alone, under "‹ Walk settings" (${back})`);
  await pg.click('[data-testid=explore-walk]').catch(() => {});
  await pg.waitForTimeout(800);
  const ring = () => pg.locator('[data-ring]').last().getAttribute('data-ring').catch(() => '');
  const ringOnExplore = await ring();
  check.todo((await visible('range-slider')) === 1 && !!ringOnExplore, `WD3, WD11: Explore on shows the range, and the ring on the map (${ringOnExplore})`);
  await shot(pg, 'walkdrawer-03-explore');
  // WD13: What I'm into's page returns to this section.
  await pg.locator('[data-testid=into-row]:visible').click({ timeout: 3000 }).catch(() => {});
  const into = await pg.waitForSelector('[data-testid=into-page]', { state: 'visible', timeout: 8000 }).then(() => true, () => false);
  await pg.keyboard.press('Escape');
  await pg.waitForSelector('[data-testid=into-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await settle();
  check.todo(into && (await visible('walk-section-explore')) === 1, 'WD13: What I\'m into\'s Back returns to the Explore section, raised');
  // WD4: the back control shows the menu; the ring goes (WD11).
  await pg.locator('[data-testid=section-back]').click({ timeout: 3000 }).catch(() => {});
  await settle();
  check.todo((await visible('walk-menu')) === 1 && (await visible('walk-section-explore')) === 0 && !(await ring()), 'WD4, WD11: "‹ Walk settings" shows the menu, and the ring goes');
  check.todo(/On, “\?” within/.test(await text('[data-testid=section-row-explore]')), 'WD1: Explore\'s row says it is on, and how far');

  // The other three sections: each alone, Escape back to the menu.
  const alone = { map: ['route-leanings'], reminders: ['notify-settings'], motion: ['share-gps-log'] };
  const others = ['explore-walk', 'route-leanings', 'notify-settings', 'share-gps-log'];
  for (const [id, own] of Object.entries(alone)) {
    await pg.locator(`[data-testid=section-row-${id}]`).click({ timeout: 3000 }).catch(() => {});
    await pg.waitForSelector(`[data-testid=walk-section-${id}]`, { state: 'visible', timeout: 3000 }).catch(() => {});
    await settle();
    const counts = Object.fromEntries(await Promise.all(others.map(async (o) => [o, await visible(o)])));
    const sectionWords = await text(`[data-testid=walk-section-${id}]`);
    check.todo(own.every((o) => counts[o] === 1) && others.filter((o) => !own.includes(o)).every((o) => counts[o] === 0) && !banned.test(sectionWords),
      `WD3, WD7: ${id} shows its own controls alone (${JSON.stringify(counts)})`);
    if (id === 'motion') check.todo(await ride(), 'WD17: in a section the captures ride above the drawer');
    await shot(pg, `walkdrawer-04-${id}`);
    await pg.keyboard.press('Escape');
    await settle();
    check.todo((await visible('walk-menu')) === 1, `WD4: Escape in ${id} shows the menu, the drawer still raised`);
  }

  // WD4, WD10: the … lowers from the menu; a pull opens This walk, never the section left open.
  await pg.locator('[data-testid=section-row-reminders]').click({ timeout: 3000 }).catch(() => {});
  await settle();
  await pg.click('[data-testid=strip-more]');
  await settle();
  check.todo((await visible('options-card')) === 0, 'WD4: the … lowers the drawer from a section');
  await pg.click('[data-testid=walk-summary]');
  await settle();
  check.todo((await visible('walk-details')) === 1 && (await visible('walk-section-reminders')) === 0, 'WD10: raised again by the numbers, the drawer opens on This walk');
  await pg.keyboard.press('Escape');
  await settle();
  await pg.click('[data-testid=strip-more]');
  await settle();
  check.todo((await visible('walk-menu')) === 1, 'WD10: raised again by the …, on the menu');
  await pg.keyboard.press('Escape');
  await settle();

  // WD13: the drawer is no taller than 60% of the screen.
  await pg.click('[data-testid=walk-summary]');
  await settle();
  const up = await pg.locator('[data-testid=walk-bar]').boundingBox();
  check.todo(!!up && up.height <= Math.round(844 * 0.6) + 1, `WD13: the raised drawer is no taller than it was (${up?.height})`);
  // WD16: nothing left the device.
  nothingLeaves();
  await pg.keyboard.press('Escape');
  await settle();

  // WD9: paused, there is no …, and This walk's row still reaches the menu.
  await toStop(pg);
  await pg.click('[data-testid=walk-summary]');
  await settle();
  await pg.locator('[data-testid=details-settings]').click({ timeout: 3000 }).catch(() => {});
  await settle();
  check.todo((await visible('strip-more')) === 0 && (await visible('walk-menu')) === 1, 'WD9: paused, with no …, the settings are reached from This walk');
  await pg.keyboard.press('Escape');
  await settle();
  await c.close();

  // WD15, WD17: at 320 px no row name, back control or heading wraps; on a 667 pt phone the captures clear the top row.
  for (const vp of [{ width: 320, height: 568 }, { width: 375, height: 667 }]) {
    const { c: c2, pg: p2 } = await freshPage(`walkdrawer-${vp.width}`);
    await p2.setViewportSize(vp);
    await p2.goto(navUrl);
    await p2.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await p2.click('[data-testid=start]');
    await p2.waitForSelector('[data-testid=pause-walk]', { timeout: 15000 });
    await p2.click('[data-testid=strip-more]');
    await p2.waitForTimeout(900);
    const oneLine = await p2.evaluate(() => [...document.querySelectorAll('[data-testid^=section-name-], [data-testid=walk-menu] [role=heading]')]
      .map((e) => ({ t: e.textContent, lines: Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || '20')) })));
    if (vp.width === 320) {
      check.todo(oneLine.length >= 5 && oneLine.every((l) => l.lines <= 1), `WD15: at 320 px the menu's names and heading are one line each (${JSON.stringify(oneLine)})`);
      await shot(p2, 'walkdrawer-05-menu-320');
    } else {
      const clear = await p2.evaluate(() => {
        const top = document.querySelector('[data-testid=walk-minimize]')?.getBoundingClientRect();
        const note = document.querySelector('[data-testid=cap-note]')?.getBoundingClientRect();
        return top && note ? note.top >= top.bottom : false;
      });
      check.todo(clear, 'WD17: on a 667 pt phone the riding captures stay clear of the top row');
      await shot(p2, 'walkdrawer-06-menu-667');
    }
    await c2.close();
  }
}

module.exports = {
  name: 'walkdrawer',
  covers: [
    'src/lib/walkDrawer.ts',
    'src/components/walk/{WalkDrawer,ReadyBar,CaptureStack,layout}.tsx',
    'src/components/walk/layout.ts',
    'src/app/walk.tsx',
  ],
  run,
};
