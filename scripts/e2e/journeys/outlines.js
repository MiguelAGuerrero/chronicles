// Town outlines (TO10): at the start, inside Pawtucket's outline, the Explore tab names Pawtucket, though
// Providence's point is the only town point near; without the outlines it says Providence, as before.
// E2E_ONLY=outlines runs it alone.

async function run(h) {
  const { url, overtureAsked, check, freshPage, divisions } = h;
    const titleOf = async (label) => {
      const { c, pg } = await freshPage(label);
      await pg.goto(url);
      await pg.waitForFunction(() => {
        const t = document.querySelector('[data-testid=explore-area]')?.textContent ?? '';
        return t && t !== 'Near you';
      }, null, { timeout: 45000 }).catch(() => {});
      const title = await pg.locator('[data-testid=explore-area]').innerText().catch(() => '');
      const subtitle = await pg.locator('[data-testid=explore-subtitle]').innerText().catch(() => '');
      await c.close();
      return { title, subtitle };
    };
    divisions.serve = false;
    const before = await titleOf('outlines-off');
    check(before.title === 'Providence', `TO3: with no outline holding you, the town is the nearest point's, as before (${before.title})`);
    divisions.serve = true;
    const after = await titleOf('outlines-on');
    divisions.serve = false;
    check(after.title === 'Pawtucket' && after.subtitle === 'Your town',
      `TO10: inside Pawtucket's outline the Explore tab names it, a town known only by its outline (TO4) (${after.title}, ${after.subtitle})`);
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
