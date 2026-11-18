// Open in Maps beside Walk on Chronicle (specs/open-in-maps-here, OM1-OM14): a star's sheet and the long-press card. E2E_ONLY=openmaps-chronicle
// runs it. It starts from the walk journey's walk and its star.

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

async function checks(h) {
  const { page, check, shot, openWalk, metaOf } = h;
  await arrive(h);
  const stub = () => {
    window.__opened = window.__opened || [];
    window.open = (u) => { window.__opened.push(String(u)); return null; };
  };
  await h.ctx.addInitScript(stub);
  await page.evaluate(stub);
  // The walk journey before this one opened maps links of its own: count from here.
  await page.evaluate(() => { window.__opened = []; });
  const box = (sel) => page.locator(sel).first().boundingBox().catch(() => null);

  // OM4, OM1, OM3, OM8: a selected star's sheet has Walk here (the accent) and Open in Maps beside it (outlined), both 44 px, named for the place.
  await page.click('[aria-label^="Fox Point,"]');
  await page.waitForSelector('[data-testid=place-go]', { timeout: 15000 });
  const w = await box('[data-testid=place-go]');
  const m = await box('[data-testid=place-maps]');
  const look = await page.locator('[data-testid=place-maps]').first().evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, label: e.getAttribute('aria-label'), text: e.innerText })).catch(() => null);
  check(!!w && !!m && w.height >= 44 && m.height >= 44 && !!look && /^Open in Maps, /.test(look.label ?? '') && /Open in Maps/.test(look.text) && !/rgb\(194, 65, 12\)/.test(look.bg),
    `OM1, OM3, OM4, OM8: a star's sheet has Open in Maps beside Walk here, outlined, 44 px (${JSON.stringify(look)})`);
  check(!(await page.locator('text=/^Go here$/').count()), 'OM1: no "Go here" on Chronicle');
  await shot(page, 'openmaps-c1-star');

  // OM2, OM10: Open in Maps hands over the star's point alone, straight from the tap; no sheet; the star stays selected; nothing saved.
  await page.click('[data-testid=place-maps]').catch(() => {});
  await page.waitForTimeout(600);
  const opened = await page.evaluate(() => window.__opened);
  const after = {
    sheets: await page.locator('[role=dialog], [data-testid=go-here-sheet]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid') || e.getAttribute('role'))),
    maps: await page.locator('[data-testid=place-maps]').count(),
    nav: await metaOf(page, 'nav'),
    walk: !!(await openWalk(page)),
  };
  check(opened.length === 1 && /(daddr|destination)=-?[\d.]+,-?[\d.]+/.test(opened[0]) && !/Fox/i.test(decodeURIComponent(opened[0])) && after.sheets.length === 0 && after.maps === 1 && !after.nav && !after.walk,
    `OM2, OM10: the star's Open in Maps hands the point alone to the maps app, no sheet, nothing saved, the star still selected (${opened[0]} ${JSON.stringify(after)})`);

  // OM4, OM5, OM9: Chronicle's long-press card has Open in Maps exactly where it has Walk here, an outlined button under it.
  const map = await page.locator('canvas.maplibregl-canvas').filter({ visible: true }).last().boundingBox();
  await page.mouse.move(map.x + map.width / 2 + 40, map.y + map.height / 2 - 60);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(800);
  const walkHere = await page.locator('[data-testid=walk-here]').count();
  const spotMaps = await page.locator('[data-testid=spot-maps]').count();
  check(spotMaps === walkHere && walkHere === 1, `OM4, OM5: Chronicle's long-press card has Open in Maps exactly when it has Walk here (${spotMaps} / ${walkHere})`);
  if (spotMaps) {
    const sb = await box('[data-testid=spot-maps]');
    check(!!sb && sb.height >= 44, 'OM3: the long-press card\'s Open in Maps is 44 px');
    await shot(page, 'openmaps-c2-spot');
    await page.click('[data-testid=spot-maps]').catch(() => {});
    await page.waitForTimeout(500);
    const o2 = await page.evaluate(() => window.__opened);
    check(o2.length === 2 && !/Your|spot/i.test(decodeURIComponent(o2[1])), `OM10: the pressed spot goes as coordinates alone (${o2[1]})`);
  }

  // OM9: at 320 px the star sheet's two buttons wrap onto a second line rather than clip.
  await page.setViewportSize({ width: 320, height: 700 });
  await page.waitForTimeout(800);
  if (!(await page.locator('[data-testid=place-maps]').count())) await page.click('[aria-label^="Fox Point,"]').catch(() => {});
  await page.waitForSelector('[data-testid=place-maps]', { timeout: 8000 }).catch(() => {});
  const fit = await page.evaluate(() => { const e = document.querySelector('[data-testid=place-maps]'); const r = e?.getBoundingClientRect(); return { right: r?.right, w: window.innerWidth, clip: !!e && e.scrollWidth > e.clientWidth + 1 }; });
  check(!fit.clip && fit.right <= fit.w, `OM9: at 320 px the star sheet's Open in Maps shows whole (${JSON.stringify(fit)})`);
  // open-in-maps-here ui 1: nothing wraps at 320 px: Walk here and Open in Maps stay on one line.
  const pair = await page.evaluate(() => { const a = document.querySelector('[data-testid=place-go]')?.getBoundingClientRect(); const b = document.querySelector('[data-testid=place-maps]')?.getBoundingClientRect(); return a && b ? { dy: Math.abs(a.top - b.top), right: b.right, w: window.innerWidth, gap: b.left - a.right } : null; });
  check(!!pair && pair.dy < 3 && pair.right <= pair.w && pair.gap >= 0, `open-in-maps-here ui 1: at 320 px the star sheet's two buttons stay on one line (${JSON.stringify(pair)})`);
  await shot(page, 'openmaps-c3-320');
}

async function run(h) {
  await require('./walk').run(h);
  await checks(h);
}

module.exports = {
  name: 'openmaps-chronicle',
  covers: [
    'src/app/(tabs)/index.tsx',
    'src/components/HomeSheet.tsx',
    'src/components/OpenInMapsButton.tsx',
    'src/lib/atlas/mapsButton.ts',
    'src/lib/nav/handoff.ts',
  ],
  run,
  checks,
};
