// End-to-end check of the web build: walk, note, hold-to-stop, replay, name, log.
//
//   npm run export:web && E2E_ONLY=<journey> node scripts/e2e-web.js   one journey, in a fresh browser
//   npm run export:web && node scripts/e2e-web.js                      the full flow (about 15 minutes; decision 0074)
//   CHRONICLES_BASE_URL=/chronicles npm run export:web && E2E_BASE=/chronicles node scripts/e2e-web.js
//
// Test harness only (scripts/e2e/harness.js): the browser's GPS is mocked with Playwright, and
// the tile host is replaced by a small fake street grid, so it runs without network access to
// OpenFreeMap. The app itself has no simulation. Exits non-zero on failure.
//
// A journey is one file in scripts/e2e/journeys/<name>.js exporting { name, covers, run }; the
// file is its registration (scripts/e2e-scenarios.js reads the folder). `full.js` is the full
// flow and has no `covers`.
const fs = require('fs');
const path = require('path');
const { createHarness } = require('./e2e/harness');

const JOURNEYS = path.join(__dirname, 'e2e', 'journeys');
const names = fs.readdirSync(JOURNEYS).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).filter((n) => n !== 'full').sort();
const only = process.env.E2E_ONLY;
if (only && !names.includes(only)) {
  console.error(`E2E_ONLY=${only}: no such journey. One of: ${names.join(', ')}`);
  process.exit(64);
}

(async () => {
  const h = await createHarness();
  try {
    if (only) {
      await require(path.join(JOURNEYS, `${only}.js`)).run(h);
      // Every journey ends as the full flow does: nothing left the device, no console errors.
      h.nothingLeaves();
      h.noConsoleErrors();
    } else {
      await require(path.join(JOURNEYS, 'full.js')).run(h);
    }
  } catch (e) {
    console.error(e.message);
    // E2E_FAIL_SHOT=<file> saves what the page showed when it failed.
    if (process.env.E2E_FAIL_SHOT) await h.page.screenshot({ path: process.env.E2E_FAIL_SHOT }).catch(() => {});
    // Every other open page too (a fresh context's), beside it.
    if (process.env.E2E_FAIL_SHOT) {
      let n = 0;
      for (const c of h.browser.contexts()) for (const pg of c.pages()) if (pg !== h.page) await pg.screenshot({ path: process.env.E2E_FAIL_SHOT.replace(/(\.png)?$/, `-${++n}.png`) }).catch(() => {});
    }
    process.exitCode = 1;
  } finally {
    await h.close();
  }
})();
