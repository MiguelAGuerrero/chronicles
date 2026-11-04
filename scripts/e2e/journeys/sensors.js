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
        setInterval(() => {
          const e = new Event('devicemotion');
          Object.assign(e, { accelerationIncludingGravity: { x: 0.02 * (Math.random() - 0.5), y: 0.02 * (Math.random() - 0.5), z: 9.81 }, acceleration: null, rotationRate: null, interval: 50 });
          window.dispatchEvent(e);
        }, 50);
      });
      const p3 = await ctx3.newPage();
      p3.on('pageerror', (e) => errors.push(`motion: ${e}`));
      p3.on('console', (m) => m.type() === 'error' && errors.push(`motion: ${m.text()}`));
      await p3.goto(navUrl);
      await p3.waitForSelector('[data-testid=start]');
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
      await ctx3.close();
    }
}

async function run(h) {
  await checks(h);
}

module.exports = {
  name: 'sensors',
  covers: [
    'src/lib/{steps,walkMotion}.ts',
    'src/lib/motionSource/**',
  ],
  run,
  checks,
};
