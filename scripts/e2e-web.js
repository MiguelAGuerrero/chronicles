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
//
// A journey that already passed on exactly these inputs (its file, the files it covers, the harness, the
// exported build, the flags) is not run again: it says so and exits 0. E2E_FORCE=1 runs it anyway. A failed
// run is never recorded, so a failure and its reruns always run (scripts/e2e/economy.js, docs/TESTING.md).
// A failure that also failed on `main` (scripts/e2e/flaky.json, `npm run e2e:baseline`) is labelled; it still fails.
const fs = require('fs');
const path = require('path');
const { createHarness } = require('./e2e/harness');
const economy = require('./e2e/economy');

const ROOT = path.join(__dirname, '..');

const JOURNEYS = path.join(__dirname, 'e2e', 'journeys');
const names = fs.readdirSync(JOURNEYS).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).filter((n) => n !== 'full').sort();
const only = process.env.E2E_ONLY;
if (only && !names.includes(only)) {
  console.error(`E2E_ONLY=${only}: no such journey. One of: ${names.join(', ')}`);
  process.exit(64);
}

// One journey alone: has it already passed on exactly these inputs?
const journey = only ? require(path.join(JOURNEYS, `${only}.js`)) : null;
const inputs = journey ? economy.keys(ROOT, journey) : null;
if (inputs && !process.env.E2E_FORCE && economy.isGreen(economy.readGreen(ROOT), only, inputs)) {
  console.log(`e2e ${only}: already green on these inputs (its file, the files it covers, the harness, this build, these flags). E2E_FORCE=1 runs it again.`);
  process.exit(0);
}

(async () => {
  const h = await createHarness();
  try {
    if (only) {
      await journey.run(h);
      // Every journey ends as the full flow does: nothing left the device, no console errors.
      h.nothingLeaves();
      h.noConsoleErrors();
      // A pass is recorded only by a run that failed nothing (E2E_SOFT reports failures and goes on: never a pass).
      if (!process.env.E2E_SOFT) economy.writeGreen(ROOT, economy.markGreen(economy.readGreen(ROOT), only, inputs, Date.now()));
    } else {
      await require(path.join(JOURNEYS, 'full.js')).run(h);
    }
  } catch (e) {
    console.error(e.message);
    // A label, never an excuse: the same check failed on main (`npm run e2e:baseline`); this run still fails.
    const flake = only ? economy.flakeFor(economy.readFlaky(ROOT), only, e.message) : null;
    if (flake) console.error(`known flake: this check also failed on main (${flake.fails} runs, ${flake.base}, ${flake.seen}). It still fails the run; rerun once, and say so in the report.`);
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
