// The pocket alert nudge (PA2, PA3, PA6): a double-tap as a "?" comes into range, through
// expo-haptics' web build, which calls navigator.vibrate; recorded here. E2E_ONLY=nudge runs it alone.

async function run(h) {
  const { navUrl, BASE, start, at, check, drawerTo, freshPage } = h;
    // A touch screen, so the switch is offered (PA6); taps still come as clicks.
    const { c, pg } = await freshPage('nudge', { touch: true });
    await c.addInitScript(() => {
      window.__buzz = [];
      navigator.vibrate = (p) => { window.__buzz.push({ t: performance.now(), p }); return true; };
    });
    const setMeta = (k, v) => pg.evaluate(([key, value]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({ key, value });
        tx.oncomplete = () => resolve(true);
      };
    }), [k, v]);
    const buzzes = () => pg.evaluate(() => window.__buzz.slice());
    const marksNow = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').count();
    const startWalk = async () => {
      await pg.waitForSelector('[data-testid=start]');
      await pg.click('[data-testid=start]');
      await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
      const s0 = at(-0.5, -0.5);
      await c.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002, accuracy: 6 });
      await pg.waitForTimeout(2500);
    };
    const walkPast = async () => {
      let firstMark = null;
      for (let k = 0; k <= 23; k++) {
        const p = at(-0.5 + k * 0.05, -0.5);
        await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
        await pg.waitForTimeout(1000);
        if (firstMark === null && (await marksNow()) > 0) firstMark = (await buzzes()).length;
      }
      return firstMark;
    };
    const holdStop = async () => {
      const b = await pg.locator('[data-testid=stop]').boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      await pg.waitForURL(/replay/, { timeout: 30000 });
    };
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    {
      // The switch, on a touch screen, with its note: the ready bar pulled up (PA5, PA6, NR7).
      await drawerTo(pg, 'half');
      await pg.waitForSelector('[data-testid=start-settings]');
      const note = await pg.locator('[data-testid=start-settings]').innerText();
      check((await pg.locator('[data-testid=pocket-alert]').count()) === 1 && /Two soft taps when a “\?” comes into range/.test(note),
        'PA6: a touch screen is offered the pocket alert, with its note (PA5)');
      await drawerTo(pg, 'peek');
      await pg.waitForTimeout(400);
    }
    await setMeta('explore_haptic', '1');
    // An exploring walk: one double-tap as the places come into range, never one per button press (PA2, PA6).
    // It goes first: a walk that starts where the last one ended near the memorial would find it already named.
    await setMeta('start_mode', 'explore');
    await pg.reload();
    await startWalk();
    const atStart = (await buzzes()).length;
    check(atStart === 0, `PA6: starting the walk, a button press, gives nothing on the web (${atStart} vibrations)`);
    const firstMark = await walkPast();
    const got = await buzzes();
    console.log(`# nudge: ${JSON.stringify(got.map((b) => [Math.round(b.t), b.p]))} (${firstMark} buzzes when the first "?" showed)`);
    check(firstMark === 2, `PA2: the double-tap comes with the first "?" in range (${firstMark})`);
    check(got.length >= 2 && got.length % 2 === 0, `PA2: the alert is a double-tap, whole pairs only (${got.length} vibrations)`);
    const gap = got.length >= 2 ? got[1].t - got[0].t : -1;
    check(gap >= 80 && gap <= 400, `PA6: the two taps are a short gap apart (${Math.round(gap)} ms)`);
    // Fox Point holds four attractions; at most one pair each, never more.
    check(got.length / 2 <= 4, `PA2: each place alerts at most once a walk (${got.length / 2} nudges)`);
    await holdStop();
    // A quiet walk with the switch on: the "?" places are never shown, so nothing buzzes (PA3).
    await pg.goto(navUrl);
    await setMeta('start_mode', 'quiet');
    await pg.reload();
    const before = (await buzzes()).length;
    await startWalk();
    await walkPast();
    const quiet = (await buzzes()).slice(before);
    check(quiet.length === 0, `PA3: a quiet walk with the pocket alert on never buzzes (${JSON.stringify(quiet)})`);
    await c.close();
}

module.exports = {
  name: 'nudge',
  covers: [
    'src/lib/{haptics,motion,motionTokens,canBuzz,canBuzz.web}.ts',
    'src/lib/explore/{explore,useExplore,settings}.ts',
    'src/components/{StartSettings,ExploreSettings}.tsx',
    // The walk screen's parts this journey checks (the walk screen in parts, WS3; specs/walk-screen-split/plan.md).
    'src/components/walking/{WalkOptions,useWalkExplore}.ts*',
  ],
  run,
};
