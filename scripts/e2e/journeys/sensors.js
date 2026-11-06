// Motion from the phone's sensors (MO1, MO5, MO8): standing still while the GPS wanders indoors, in a
// browser of its own. Self-contained: the context is created here.

async function checks(h) {
  const { navUrl, browser, errors, start, at, dLat, dLon, OVERTURE_HOST, check, metricRegion, tileRoute, overtureRoute, tiles } = h;
    // Motion (MO1, MO5, MO8): the phone's sensors say standing still while the GPS wanders indoors.
    {
      const ctx3 = await browser.newContext({
        viewport: { width: 390, height: 844 },
        permissions: ['geolocation'],
        geolocation: { longitude: start[0], latitude: start[1], accuracy: 10 },
      });
      await metricRegion(ctx3);
      await ctx3.route('https://tiles.openfreemap.org/**', tileRoute);
      await ctx3.route(`https://${OVERTURE_HOST}/**`, overtureRoute);
      await ctx3.addInitScript(() => {
        window.__perf = {};
        // As on an iPhone: motion is asked for from a tap, then samples arrive; here, a phone held still.
        window.__motionAsked = 0;
        DeviceMotionEvent.requestPermission = () => { window.__motionAsked++; return Promise.resolve('granted'); };
        // Steps, once `__walk(hz)` is called (MO6): a walker's bounce, 2 m/s² either side of gravity, each step a
        // dip then a peak, as a foot pushes off and lands. `__firstStep` is the first peak's time.
        window.__stepHz = 0;
        window.__walk = (hz) => {
          window.__stepsFrom = performance.now();
          window.__stepHz = hz;
          window.__firstStep = window.__stepsFrom + 750 / hz;
        };
        setInterval(() => {
          const e = new Event('devicemotion');
          const bounce = window.__stepHz ? -2 * Math.sin(2 * Math.PI * window.__stepHz * ((performance.now() - window.__stepsFrom) / 1000)) : 0;
          Object.assign(e, { accelerationIncludingGravity: { x: 0.02 * (Math.random() - 0.5), y: 0.02 * (Math.random() - 0.5), z: 9.81 + bounce }, acceleration: null, rotationRate: null, interval: 50 });
          window.dispatchEvent(e);
        }, 50);
        // Who listens for motion (MO10), and the page's visibility, faked as the hidden journey does.
        window.__motionListeners = new Set();
        const add = window.addEventListener.bind(window);
        const remove = window.removeEventListener.bind(window);
        window.addEventListener = (type, fn, o) => {
          if (type === 'devicemotion') window.__motionListeners.add(fn);
          return add(type, fn, o);
        };
        window.removeEventListener = (type, fn, o) => {
          if (type === 'devicemotion') window.__motionListeners.delete(fn);
          return remove(type, fn, o);
        };
        window.__vis = 'visible';
        Object.defineProperty(document, 'visibilityState', { get: () => window.__vis });
        Object.defineProperty(document, 'hidden', { get: () => window.__vis === 'hidden' });
      });
      const listening = () => p3.evaluate(() => window.__motionListeners.size);
      const setVis = (v) => p3.evaluate((s) => { window.__vis = s; document.dispatchEvent(new Event('visibilitychange')); }, v);
      const p3 = await ctx3.newPage();
      p3.on('pageerror', (e) => errors.push(`motion: ${e}`));
      p3.on('console', (m) => m.type() === 'error' && errors.push(`motion: ${m.text()}`));
      await p3.goto(navUrl);
      await p3.waitForSelector('[data-testid=start]');
      await p3.waitForTimeout(800);
      const ready = await listening();
      await p3.click('[data-testid=start]');
      await p3.waitForSelector('[data-testid=stop]');
      check((await p3.evaluate(() => window.__motionAsked)) === 1, 'Start asks for motion, from its own tap (MO1)');
      // A few calm fixes, then the sensors have had time to say still.
      for (let k = 0; k < 6; k++) {
        await ctx3.setGeolocation({ longitude: start[0], latitude: start[1] + k * 1e-6, accuracy: 10 });
        await p3.waitForTimeout(1000);
      }
      const puckAt = async () => (await p3.locator('[data-testid=walker-puck]').getAttribute('data-at'))?.split(',').map(Number) ?? null;
      const before = await puckAt();
      // Indoor drift: 15-25 m off, moving slowly enough to pass the speed gate.
      for (let k = 0; k < 20; k++) {
        const a = k * 0.35;
        await ctx3.setGeolocation({ longitude: start[0] + Math.sin(a) * 20 * dLon / 100, latitude: start[1] + (1 - Math.cos(a)) * 20 * dLat / 100, accuracy: 10 });
        await p3.waitForTimeout(1000);
      }
      const after = await puckAt();
      const movedM = before && after ? Math.hypot((after[0] - before[0]) / dLon * 100, (after[1] - before[1]) / dLat * 100) : Infinity;
      check(movedM < 3, `told still, the dot holds while the GPS drifts (MO5: moved ${movedM.toFixed(1)} m)`);
      const stills = await p3.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('still', 'readonly').objectStore('still').getAll();
          g.onsuccess = () => resolve(g.result);
          g.onerror = () => resolve([]);
        };
      }));
      check(stills.length >= 1 && stills[0].ended_at == null, `standing is kept with the walk as a still spell (MO8: ${stills.length})`);

      // MO6: steps start, and the dot moves within 2 s. Back where the dot is held first, still; then a walk
      // east at 1.4 m/s with a fix every quarter second (the detector needs three steps, about 1.1 s, and
      // looks every 0.5 s; a 1 Hz GPS adds up to a second more), timed from the first step.
      const held = await puckAt();
      for (let k = 0; k < 3; k++) {
        await ctx3.setGeolocation({ longitude: held[0], latitude: held[1], accuracy: 10 });
        await p3.waitForTimeout(1000);
      }
      const from = await puckAt();
      // Timed in the page, frame by frame: from the first step's peak to the dot a metre on.
      await p3.evaluate(({ from, mLon, mLat }) => {
        window.__moved = null;
        window.__walk(1.8);
        const look = () => {
          const at = document.querySelector('[data-testid=walker-puck]')?.getAttribute('data-at')?.split(',').map(Number);
          if (at && Math.hypot((at[0] - from[0]) / mLon, (at[1] - from[1]) / mLat) > 1) window.__moved = performance.now() - window.__firstStep;
          else requestAnimationFrame(look);
        };
        requestAnimationFrame(look);
      }, { from, mLon: dLon / 100, mLat: dLat / 100 });
      for (let k = 1; k <= 24 && (await p3.evaluate(() => window.__moved)) == null; k++) {
        await ctx3.setGeolocation({ longitude: from[0] + k * 0.35 * dLon / 100, latitude: from[1], accuracy: 10 });
        await p3.waitForTimeout(250);
      }
      const movedAt = await p3.evaluate(() => window.__moved && Math.round(window.__moved));
      check(movedAt != null && movedAt <= 2000, `when steps start, the dot moves within 2 s (MO6: ${movedAt == null ? 'never in 6 s' : `${movedAt} ms after the first step`})`);

      // MO10: motion is read only while a walk is open and on screen: not on the ready screen, nor paused,
      // nor with the page hidden, nor once stopped.
      const walking = await listening();
      await p3.click('[data-testid=pause-walk]');
      await p3.waitForSelector('[data-testid=resume-walk]');
      await p3.waitForTimeout(800);
      const paused = await listening();
      await p3.click('[data-testid=resume-walk]');
      await p3.waitForSelector('[data-testid=pause-walk]');
      await p3.waitForTimeout(800);
      const resumed = await listening();
      await setVis('hidden');
      await p3.waitForTimeout(800);
      const hidden = await listening();
      await setVis('visible');
      await p3.waitForTimeout(800);
      const back = await listening();
      const hold = await p3.locator('[data-testid=stop]').boundingBox();
      await p3.mouse.move(hold.x + hold.width / 2, hold.y + hold.height / 2);
      await p3.mouse.down();
      await p3.waitForTimeout(1100);
      await p3.mouse.up();
      await p3.waitForURL(/replay/, { timeout: 30000 });
      await p3.waitForTimeout(800);
      const stopped = await listening();
      check(ready === 0 && walking === 1 && paused === 0 && resumed === 1 && hidden === 0 && back === 1 && stopped === 0,
        `MO10: motion is read only while the walk is open and on screen (listeners: ready ${ready}, walking ${walking}, paused ${paused}, resumed ${resumed}, hidden ${hidden}, back ${back}, stopped ${stopped})`);
      await ctx3.close();
    }
}

async function run(h) {
  await checks(h);
}

module.exports = {
  name: 'sensors',
  covers: [
    'src/lib/{steps,walkMotion,liveDot}.ts',
    'src/lib/motionSource/**',
  ],
  run,
  checks,
};
