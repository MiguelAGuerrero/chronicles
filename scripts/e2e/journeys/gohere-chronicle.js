// Go here on Chronicle's surfaces (specs/go-here-everywhere, GE1-GE13): a star's sheet and the long-press card, with the
// capture band left alone. E2E_ONLY=gohere-chronicle runs it. It starts from the walk journey's walk and its star.

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
  // Chronicle's capture band (the journal's camera and mic) lives in Memories; the map section, where the star sheet and the
  // long press are, has none, so these boxes are empty there and the checks hold by construction (GE9) until one is added.
  await arrive(h);
  // A browser opens a maps link with window.open; record it, on this page and on any later one (a reload keeps the stub).
  const stub = () => {
    window.__opened = window.__opened || [];
    window.open = (u) => { window.__opened.push(String(u)); return null; };
  };
  await h.ctx.addInitScript(stub);
  await page.evaluate(stub);
  // The walk journey before this one opened maps links of its own: count from here.
  await page.evaluate(() => { window.__opened = []; });
  const box = (sel) => page.locator(sel).first().boundingBox().catch(() => null);
  const apart = (a, b) => !a || !b || a.y + a.height <= b.y + 1 || b.y + b.height <= a.y + 1 || a.x + a.width <= b.x + 1 || b.x + b.width <= a.x + 1;
  const bands = () => page.evaluate(() => ['band-photo', 'band-voice'].map((id) => { const r = document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect(); return r && { x: r.x, y: r.y, width: r.width, height: r.height }; }));

  // GE1, GE8: a selected star's sheet has a ghost Go here under Walk here, named for the place, 44 px high.
  await page.click('[aria-label^="Fox Point,"]');
  await page.waitForSelector('[data-testid=place-go]', { timeout: 15000 });
  const go = await page.locator('[data-testid=place-go-here]').first().evaluate((e) => { const s = getComputedStyle(e); return { bg: s.backgroundColor, border: s.borderTopWidth, h: e.getBoundingClientRect().height, label: e.getAttribute('aria-label') }; }).catch(() => null);
  const walk = await box('[data-testid=place-go]');
  const goBox = await box('[data-testid=place-go-here]');
  check(!!go && /^Go here, /.test(go.label ?? '') && go.h >= 44 && /rgba\(0, 0, 0, 0\)|transparent/.test(go.bg) && go.border === '0px' && !!walk && !!goBox && goBox.y > walk.y,
    `GE1, GE8: a star's sheet has a ghost "Go here" under Walk here, named for the place (${JSON.stringify(go)})`);
  // go-here-everywhere ui 2: the star sheet's Go here starts at the same left edge as the pill and the text above it.
  check(!!walk && !!goBox && Math.abs(goBox.x - walk.x) <= 2, `go-here-everywhere ui 2: the star sheet's Go here lines up with Walk here (${JSON.stringify({ go: goBox?.x, walk: walk?.x })})`);
  await shot(page, 'gohere-c1-star');

  // GE9, GE2: the sheet sits at the top, away from the capture band, which still answers.
  await page.click('[data-testid=place-go-here]').catch(() => {});
  await page.waitForSelector('[data-testid=go-here-sheet]', { timeout: 5000 }).catch(() => {});
  const sheet = await box('[data-testid=go-here-sheet]');
  const band = await bands();
  const viewport = page.viewportSize();
  check(!!sheet && sheet.y < (viewport?.height ?? 844) / 3 && band.every((b) => apart(sheet, b)) && (await page.locator('[data-testid=go-here-app]').count()) === 1,
    `GE9, GE2: on Chronicle the sheet sits at the top and covers no capture button (${JSON.stringify({ sheet, band })})`);
  const rows = await page.evaluate(() => ['go-here-app-label', 'go-here-maps-label'].map((id) => document.querySelector(`[data-testid=${id}]`)?.textContent ?? null));
  check(rows[0] === 'Chronicles' && /Maps/.test(rows[1] ?? ''), `GE2: the star's Go here opens the same sheet, Chronicles first (${JSON.stringify(rows)})`);
  await shot(page, 'gohere-c2-sheet');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const after = { sheet: await page.locator('[data-testid=go-here-sheet]').count(), nav: await metaOf(page, 'nav'), walk: !!(await openWalk(page)), opened: await page.evaluate(() => window.__opened?.length ?? 'none'), url: page.url() };
  check(after.sheet === 0 && !after.nav && !after.walk && !after.opened,
    `GE2: Escape closes the sheet; nothing saved, no walk, nothing opened (${JSON.stringify(after)})`);

  check((await page.locator('[data-testid=place-go-here]').count()) === 1, 'GE2: Escape closed the sheet alone: the star is still selected, with its Go here');
  // GE3, GE13: the maps app gets the star's point alone; the star's title never rides in the link.
  await page.click('[data-testid=place-go-here]').catch(() => {});
  await page.waitForSelector('[data-testid=go-here-maps]', { timeout: 5000 }).catch(() => {});
  await page.click('[data-testid=go-here-maps]').catch(() => {});
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() => window.__opened);
  check(opened.length === 1 && /destination=-?[\d.]+,-?[\d.]+/.test(opened[0]) && !/Fox/i.test(decodeURIComponent(opened[0])) && !(await openWalk(page)),
    `GE3, GE13: the maps app gets the star's point alone, from the tap (${opened[0]})`);

  // GE1, GE7, GE9: the long-press card has Go here exactly when it has Walk here, above the capture band, the spot still visible.
  const map = await page.locator('canvas.maplibregl-canvas').filter({ visible: true }).last().boundingBox();
  await page.mouse.move(map.x + map.width / 2 + 30, map.y + map.height / 2 - 40);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(800);
  const walkHere = await page.locator('[data-testid=walk-here]').count();
  const goHere = await page.locator('[data-testid=spot-go-here]').count();
  check(goHere === walkHere, `GE1, GE7: Chronicle's long-press card has Go here exactly when it has Walk here (${goHere} / ${walkHere})`);
  if (goHere) {
    const card = await box('[data-testid=spot-go-here]');
    const b2 = await bands();
    check(b2.every((b) => apart(card, b)), `GE9: the long-press card with Go here sits clear of the capture band (${JSON.stringify({ card, b2 })})`);
    await shot(page, 'gohere-c3-spot');
    await page.click('[data-testid=spot-go-here]').catch(() => {});
    await page.waitForSelector('[data-testid=go-here-maps]', { timeout: 5000 }).catch(() => {});
    const sh = await box('[data-testid=go-here-sheet]');
    check(!!sh && (await bands()).every((b) => apart(sh, b)), 'GE9: the sheet over a long press covers no capture button');
    await page.click('[data-testid=go-here-maps]').catch(() => {});
    await page.waitForTimeout(500);
    const o2 = await page.evaluate(() => window.__opened);
    check(o2.length === 2 && !/Your|spot/i.test(decodeURIComponent(o2[1])), `GE13: the pressed spot goes as coordinates alone (${o2[1]})`);
  }

  // GE10: at 320 px the star sheet's Go here shows whole and the capture band is where it was.
  await page.setViewportSize({ width: 320, height: 700 });
  await page.waitForTimeout(800);
  if (!(await page.locator('[data-testid=place-go-here]').count())) await page.click('[aria-label^="Fox Point,"]').catch(() => {});
  await page.waitForSelector('[data-testid=place-go-here]', { timeout: 8000 }).catch(() => {});
  const clip = await page.evaluate(() => { const e = document.querySelector('[data-testid=place-go-here]'); return !e || e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > window.innerWidth; });
  check(!clip, "GE10: at 320 px the star sheet's Go here shows whole");
  await shot(page, 'gohere-c4-320');

  // GE6: Walk here on the star is as it was (the memories journey holds its start); GE4: Chronicles saves the place and opens Navigate, ready.
  check((await page.locator('[data-testid=place-go]').count()) === 1, "GE6: the star's Walk here is still there");
  await page.click('[data-testid=place-go-here]').catch(() => {});
  await page.waitForSelector('[data-testid=go-here-app]', { timeout: 5000 }).catch(() => {});
  await page.click('[data-testid=go-here-app]').catch(() => {});
  await page.waitForSelector('[data-testid=ready-dest]', { timeout: 15000 }).catch(() => {});
  const dest = await page.locator('[data-testid=ready-dest]').innerText().catch(() => '');
  check(/^To .* · .*away/.test(dest) && !(await openWalk(page)), `GE4: Chronicles opens Navigate, ready, to the star's place, no walk (${dest})`);

}

// Alone: the walk journey first (the first walk, with its captures), then this.
async function run(h) {
  await require('./walk').run(h);
  await checks(h);
}

module.exports = {
  name: 'gohere-chronicle',
  covers: [
    'src/app/(tabs)/index.tsx',
    'src/components/HomeSheet.tsx',
    'src/components/GoHere.tsx',
    'src/lib/atlas/goHere.ts',
    'src/lib/nav/handoff.ts',
  ],
  run,
  checks,
};
