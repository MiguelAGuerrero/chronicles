// A reload with a walk minimized (the owner, Nov 2): after it, nothing responded, and a reload
// didn't clear it. E2E_ONLY=reload runs it alone.

async function run(h) {
  const { url, navUrl, BASE, browser, page, start, at, check, freshPage, openWalk } = h;
    const { c, pg } = await freshPage('reload');
    const state = async (label) => {
      const s = await pg.evaluate(() => {
        const at = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); if (!b.width) return 'hidden'; const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return top?.closest(q) ? 'top' : `under:${top?.closest('[data-testid]')?.getAttribute('data-testid') ?? top?.tagName}`; };
        return { path: location.pathname, bar: at('[data-testid=recording-return]'), stop: at('[data-testid=stop]'), minimize: at('[data-testid=walk-minimize]'), tabNav: at('[data-testid=tab-navigate]'), drawer: document.querySelector('[data-testid=ready-bar]')?.getBoundingClientRect().height ?? null };
      });
      console.log(`# ${label}: ${JSON.stringify(s)}`);
      return s;
    };
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    for (let k = 0; k < 12; k++) {
      const p = at(-0.5 + k * 0.05, -0.5);
      await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    await state('walking');
    await pg.click('[data-testid=walk-minimize]');
    await pg.waitForSelector('[data-testid=recording-return]', { timeout: 10000 });
    await pg.waitForTimeout(800);
    await state('minimized');
    {
      // iOS cancels a tap's click when an element appears just after it (its content-change check):
      // a view that keeps inserting elements loses every tap. Count what the minimized view adds.
      await pg.evaluate(() => {
        window.__added = [];
        new MutationObserver((ms) => {
          for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) window.__added.push(`${n.tagName}.${(n.getAttribute('data-testid') || n.className || '').toString().slice(0, 40)}`);
        }).observe(document.body, { childList: true, subtree: true });
      });
      for (let k = 12; k < 22; k++) {
        const p = at(-0.5 + k * 0.05, -0.5);
        await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
        await pg.waitForTimeout(1000);
      }
      const added = await pg.evaluate(() => window.__added);
      const by = {};
      for (const a of added) by[a] = (by[a] || 0) + 1;
      console.log(`# added in 10 s minimized: ${added.length} ${JSON.stringify(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8))}`);
    }
    {
      // The browser's own Back while the walk screen is up (a swipe, or history), then the bar.
      await pg.click('[data-testid=recording-return]');
      await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 10000 });
      await pg.waitForTimeout(1500);
      await pg.goBack().catch(() => {});
      await pg.waitForTimeout(1500);
      const s1 = await state('after the browser back');
      if (s1.bar === 'top') {
        await pg.click('[data-testid=recording-return]');
        await pg.waitForTimeout(2500);
      }
      const s2 = await state('after the browser back, tapped the bar');
      check(s2.path === `${BASE}/walk` && s2.stop === 'top', `reload: after the browser's Back, the walk is in front or one tap away (${JSON.stringify(s1)} → ${JSON.stringify(s2)})`);
      if (s2.minimize === 'top') {
        await pg.click('[data-testid=walk-minimize]');
        await pg.waitForTimeout(1500);
      }
    }
    for (let r = 1; r <= 2; r++) {
      await pg.reload();
      await pg.waitForTimeout(5000);
      const s = await state(`reload ${r}`);
      const ok = (s.path === `${BASE}/walk` && s.stop === 'top') || s.bar === 'top';
      check(ok, `reload: with a walk minimized, reload ${r} leaves the walk or its bar in front and tappable (${JSON.stringify(s)})`);
      if (s.path === `${BASE}/walk` && s.minimize === 'top') {
        await pg.click('[data-testid=walk-minimize]');
        await pg.waitForTimeout(1500);
        const m = await state(`reload ${r}, minimized`);
        check(m.bar === 'top', `reload: minimizing after reload ${r} shows the bar in front (${JSON.stringify(m)})`);
        if (m.bar === 'top') {
          await pg.click('[data-testid=recording-return]');
          await pg.waitForTimeout(1500);
          const b = await state(`reload ${r}, back`);
          check(b.path === `${BASE}/walk` && b.stop === 'top', `reload: the bar brings the walk back after reload ${r} (${JSON.stringify(b)})`);
          await pg.click('[data-testid=walk-minimize]').catch(() => {});
          await pg.waitForTimeout(1500);
        }
      }
    }
    {
      // The Home Screen app reopened with a walk open (the owner, Nov 3): it opens at `/`, and showed
      // Explore until the browser's first fix came, then jumped to the walk. Every painted frame
      // is either covered or the walk (NV2 launch 1).
      await pg.addInitScript(() => {
        window.__launchFrames = [];
        const tick = () => {
          window.__launchFrames.push({ path: location.pathname, covered: !!document.querySelector('[data-testid=launch-cover]'), walk: !!document.querySelector('[data-testid=stop]'), tabs: !!document.querySelector('[data-testid=tab-explore]'), memories: !!document.querySelector('[data-testid=memories]') });
          if (window.__launchFrames.length < 600) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await pg.goto(url);
      await pg.waitForSelector('[data-testid=stop]', { timeout: 5000 }).catch(() => {});
      const s = await state('opened at / with a walk open');
      const frames = await pg.evaluate(() => window.__launchFrames);
      // Frames before the app's first paint are the empty page, not a screen.
      const seen = frames.filter((f) => !f.covered && f.tabs && !f.path.endsWith('/walk'));
      const noChronicle = s.path === `${BASE}/walk` && s.stop === 'top' && seen.length === 0 && frames.length > 0 && !frames.some((f) => !f.covered && f.memories);
      check(noChronicle, `HC2: a launch with a walk open shows the walk screen, never a frame of Chronicle (${frames.length} frames)`);
      check(s.path === `${BASE}/walk` && s.stop === 'top' && seen.length === 0 && frames.length > 0,
        `NV2 launch 1: opened at / with a walk open, the walk comes straight up, with no other screen first (${frames.length} frames, ${seen.length} showing ${JSON.stringify(seen[0] ?? null)})`);
      if (s.minimize === 'top') {
        await pg.click('[data-testid=walk-minimize]');
        await pg.waitForSelector('[data-testid=recording-return]', { timeout: 10000 }).catch(() => {});
        await pg.waitForTimeout(800);
      }
    }
    {
      // A way out from the bar itself (the owner, Nov 2: stuck minimized, with no way to stop).
      // A tap explains; a hold stops the walk and opens its replay.
      await pg.waitForSelector('[data-testid=bar-stop]', { timeout: 10000 });
      await pg.click('[data-testid=bar-stop]');
      await pg.waitForTimeout(400);
      const said = await pg.locator('[data-testid=recording-said]').innerText().catch(() => '');
      check(said === 'Hold to stop the walk' && !/\/walk$/.test(new URL(pg.url()).pathname), `bar stop: a tap only says to hold ("${said}")`);
      const b = await pg.locator('[data-testid=bar-stop]').boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      const toReplay = await pg.waitForURL(/replay/, { timeout: 30000 }).then(() => true, () => false);
      const w = await openWalk(pg);
      check(toReplay && w == null, `bar stop: a hold on the bar's Stop ends the walk and opens its replay (${pg.url()}, open: ${w && w.id})`);
    }
    await c.close();
}

module.exports = {
  name: 'reload',
  covers: [
    'src/app/_layout.tsx',
    'src/app/walk.tsx',
    'src/components/{OpenWalk,RecordingBar}.tsx',
    'src/lib/{session,openWalkLoad,walkEvents}.ts',
    // The walk screen's parts this journey checks (the walk screen in parts, WS3; specs/walk-screen-split/plan.md).
    'src/components/walking/{WalkLoading,WalkStrip,WalkTop,useShownWalk,useWalkLifecycle}.ts*',
  ],
  run,
};
