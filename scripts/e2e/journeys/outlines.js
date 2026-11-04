// Town outlines (TO10): at the start, inside Pawtucket's outline, the Explore tab names Pawtucket, though
// Providence's point is the only town point near; without the outlines it says Providence, as before.
// E2E_ONLY=outlines runs it alone.

async function run(h) {
  const { url, overtureAsked, check, shot, freshPage, divisions, at, tabTo } = h;
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
      // What the map shows, west,south,east,north (fix explore-fit-area).
      const inView = async () => (await pg.locator('[data-bounds]').first().getAttribute('data-bounds').catch(() => '') ?? '').split(',').map(Number);
      const view = await inView();
      await shot(pg, `${label}-explore`);
      // TB2: the town's own page (the title opens it) draws its border tinted.
      let page = null;
      let card = '';
      let how = '';
      let pageView = [];
      let roundTrip = [];
      let reopened = [];
      if (title && title !== 'Near you') {
        await pg.click('[data-testid=atlas-title]').catch(() => {});
        await pg.waitForSelector('[data-testid=atlas-town-head]', { timeout: 10000 }).catch(() => {});
        await pg.waitForTimeout(800);
        page = await drawn();
        // The page's areas are listed after the border is known: the frame they once took is over by now.
        await pg.waitForTimeout(2500);
        pageView = await inView();
        await shot(pg, `${label}-town`);
        // fix explore-fit-area audit 1: another tab and back (the borders are unknown while it is blurred).
        await tabTo(pg, 'chronicle');
        await pg.waitForTimeout(1200);
        await tabTo(pg, 'explore');
        await pg.waitForTimeout(2500);
        roundTrip = await inView();
        // audit 3: back near you, then the same town's page again.
        await pg.click('[data-testid=atlas-back-pill]').catch(() => {});
        await pg.waitForTimeout(1500);
        await pg.click('[data-testid=atlas-title]').catch(() => {});
        await pg.waitForSelector('[data-testid=atlas-town-head]', { timeout: 10000 }).catch(() => {});
        await pg.waitForTimeout(2500);
        reopened = await inView();
        // TP1, TP8: the town's card, counted across its whole outline (Pawtucket is known only by one).
        await pg.click('[data-testid=atlas-town-head]').catch(() => {});
        await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 10000 }).catch(() => {});
        await pg.waitForSelector('[data-testid=atlas-kind-food]', { timeout: 30000 }).catch(() => {});
        card = await pg.locator('[data-testid=atlas-card]').innerText().catch(() => '');
        if (await pg.locator('[data-testid=atlas-how]').count()) {
          await pg.click('[data-testid=atlas-how]');
          how = await pg.locator('[data-testid=atlas-how-panel]').innerText().catch(() => '');
        }
        await shot(pg, `${label}-town-card`);
      }
      await c.close();
      return { title, subtitle, borders, page, zoom, view, pageView, roundTrip, reopened, card, how };
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
    // TP1, TP8: a town known by its outline is counted across it: its card no longer says "around its centre", and says so.
    check(/what’s here/i.test(after.card) && !/around its centre/i.test(after.card) && /whole outline/.test(after.how),
      `TP8: a town counted across its outline says "What's here" with no "around its centre", and how it counts (${after.card.replace(/\s+/g, ' ').slice(0, 120)} | ${after.how.replace(/\s+/g, ' ')})`);
    // fix explore-fit-area: the whole of Pawtucket's outline is in view, near you and on its own page, whose
    // areas, listed after the border, once framed only its point and a neighborhood.
    const holdsTown = ([w, s, e, n] = []) => {
      const [[tw, ts], [te, tn]] = [at(-10, -10), at(10, 10)];
      return w <= tw + 1e-4 && s <= ts + 1e-4 && e >= te - 1e-4 && n >= tn - 1e-4;
    };
    check(holdsTown(after.view), `fix explore-fit-area: Explore shows the whole of your town (${after.view.join(',')})`);
    check(holdsTown(after.pageView), `fix explore-fit-area: the town's page shows the whole town (${after.pageView.join(',')})`);
    check(holdsTown(after.roundTrip), `fix explore-fit-area audit 1: back from another tab, the town's page still shows the whole town (${after.roundTrip.join(',')})`);
    check(holdsTown(after.reopened), `fix explore-fit-area audit 3: the town's page opened again shows the whole town (${after.reopened.join(',')})`);
    // The whole town, not the world: a map left zoomed far out would hold it too.
    const span = (v) => (v[2] - v[0]) / ((at(10, 10)[0] - at(-10, -10)[0]) || 1);
    check(span(after.pageView) < 6, `fix explore-fit-area: the town's page is framed on the town, not far wider (${span(after.pageView).toFixed(1)}x its width)`);
    check(span(after.reopened) < span(after.pageView) * 1.2,
      `fix explore-fit-area audit 3: opened again, the page is framed on the town as the first time, not on its reach (${span(after.reopened).toFixed(1)}x, first ${span(after.pageView).toFixed(1)}x)`);
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
