// The hidden-page notice (Nov 3, after it popped up with the page on screen): a gap over a
// minute between fixes says "paused while this page was hidden" only if the page really was.
// Fixes and the page's clock jump ahead (`__shift`) to make a 70 s gap in a few seconds, and the
// page's visibility is faked (`__vis`). E2E_ONLY=hidden runs it alone.

async function run(h) {
  const { navUrl, page, start, at, check, freshPage } = h;
    const { c, pg } = await freshPage('hidden');
    await c.addInitScript(() => {
      window.__shift = 0;
      window.__vis = 'visible';
      Object.defineProperty(document, 'visibilityState', { get: () => window.__vis });
      Object.defineProperty(document, 'hidden', { get: () => window.__vis === 'hidden' });
      // The page's clock jumps with the fixes, as if the time had passed.
      const now = Date.now.bind(Date);
      Date.now = () => now() + window.__shift;
      const g = navigator.geolocation;
      const watch = g.watchPosition.bind(g);
      g.watchPosition = (ok, err, o) => watch((p) => ok({ coords: p.coords, timestamp: p.timestamp + window.__shift }), err, o);
    });
    let n = 0;
    const step = async () => {
      n++;
      const p = at(-0.5, -0.5 + n * 0.012);
      await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
      await pg.waitForTimeout(1000);
    };
    const paused = () => pg.locator('text=/Tracing paused/').count();
    const setVis = (v) => pg.evaluate((s) => { window.__vis = s; document.dispatchEvent(new Event('visibilitychange')); }, v);
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.waitForTimeout(1500);
    await pg.click('[data-testid=start]');
    await pg.waitForURL(/\/walk/, { timeout: 30000 });
    for (let i = 0; i < 5; i++) await step();
    // On screen the whole time, with no fixes for 70 s: weak GPS, not a hidden page.
    await pg.evaluate(() => { window.__shift = 70_000; });
    for (let i = 0; i < 4; i++) await step();
    await pg.waitForTimeout(2500);
    const shownVisible = await paused();
    check(shownVisible === 0, `hidden: a gap with the page on screen raises no "Tracing paused … hidden" notice (${shownVisible})`);
    // Hidden, then back, then 70 s more without fixes: the notice says so.
    await setVis('hidden');
    await pg.waitForTimeout(300);
    await pg.evaluate(() => { window.__shift = 140_000; });
    await setVis('visible');
    for (let i = 0; i < 4; i++) await step();
    const shownHidden = await pg.waitForSelector('text=/Tracing paused for 1 min while this page was hidden/', { timeout: 6000 }).then(() => true, () => false);
    check(shownHidden, 'hidden: a gap the page spent hidden still says "Tracing paused for 1 min while this page was hidden"');
    await c.close();
}

module.exports = {
  name: 'hidden',
  covers: [
    'src/lib/{hiddenLog,useLiveTrace}.ts',
    'src/components/OpenWalk.tsx',
    // The walk screen's parts this journey checks (the walk screen in parts, WS3; specs/walk-screen-split/plan.md).
    'src/components/walking/{NoticeBanner,useWalkNotice}.ts*',
  ],
  run,
};
