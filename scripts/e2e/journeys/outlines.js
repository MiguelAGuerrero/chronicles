// Town outlines (TO10): at the start, inside Pawtucket's outline, the Explore tab names Pawtucket, though
// Providence's point is the only town point near; without the outlines it says Providence, as before.
// E2E_ONLY=outlines runs it alone.

async function run(h) {
  const { url, overtureAsked, check, shot, freshPage, divisions } = h;
    const titleOf = async (label) => {
      const { c, pg } = await freshPage(label);
      await pg.goto(url);
      await pg.waitForFunction(() => {
        const t = document.querySelector('[data-testid=explore-area]')?.textContent ?? '';
        return t && t !== 'Near you';
      }, null, { timeout: 45000 }).catch(() => {});
      const title = await pg.locator('[data-testid=explore-area]').innerText().catch(() => '');
      const subtitle = await pg.locator('[data-testid=explore-subtitle]').innerText().catch(() => '');
      // TB1: what the map draws, once the z10 tile is in (the map writes it on its container).
      const drawn = async () => pg.locator('[data-borders]').first().getAttribute('data-borders').catch(() => null);
      await pg.waitForFunction(() => (document.querySelector('[data-borders]')?.getAttribute('data-borders') ?? '') !== '', null, { timeout: 15000 }).catch(() => {});
      const borders = await drawn();
      // TB11: the map frames the town once its border is known (data-zoom is written on camera moves).
      await pg.waitForTimeout(1500);
      const zoom = Number(await pg.locator('[data-zoom]').first().getAttribute('data-zoom').catch(() => 'NaN'));
      await shot(pg, `${label}-explore`);
      // TB2: the town's own page (the title opens it) draws its border tinted.
      let page = null;
      if (title && title !== 'Near you') {
        await pg.click('[data-testid=atlas-title]').catch(() => {});
        await pg.waitForSelector('[data-testid=atlas-town-head]', { timeout: 10000 }).catch(() => {});
        await pg.waitForTimeout(800);
        page = await drawn();
        await shot(pg, `${label}-town`);
      }
      await c.close();
      return { title, subtitle, borders, page, zoom };
    };
    divisions.serve = false;
    const before = await titleOf('outlines-off');
    check(before.title === 'Providence', `TO3: with no outline holding you, the town is the nearest point's, as before (${before.title})`);
    check(!before.borders, `TB1, TB7: no outline known, no border drawn, never a guess (${before.borders})`);
    divisions.serve = true;
    const after = await titleOf('outlines-on');
    divisions.serve = false;
    check(after.title === 'Pawtucket' && after.subtitle === 'Your town',
      `TO10: inside Pawtucket's outline the Explore tab names it, a town known only by its outline (TO4) (${after.title}, ${after.subtitle})`);
    check(after.borders === 'lined:Central Falls|tinted:Pawtucket',
      `TB1: Explore's map draws the town you're in tinted and its neighbor lined (${after.borders})`);
    check(after.page === 'lined:Central Falls|tinted:Pawtucket', `TB2: the town's page draws its border tinted (${after.page})`);
    // Pawtucket is 2 km across: framed whole, the map is zoomed out from the 800 m ring it opens on.
    check(after.zoom < before.zoom - 0.5, `TB11: Explore zooms out to frame the whole town (z${after.zoom.toFixed(2)}, the ring alone z${before.zoom.toFixed(2)})`);
    const asked = overtureAsked.filter((q) => /divisions\.pmtiles/.test(q.url));
    check(asked.length > 0 && asked.every((q) => q.range), `TO12: outlines are read from Overture's divisions by byte range (${asked.length} requests)`);
}

module.exports = {
  name: 'outlines',
  covers: [
    'src/lib/areas/**',
    'src/lib/atlas/**',
    'src/lib/finish.ts',
    'scripts/mvt-encode.mjs',
  ],
  run,
};
