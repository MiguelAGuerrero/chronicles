// Start in the car (specs/drive-in-the-outing, DO5-DO8; decision 0218): a place past what can be walked still asks, "Start now" or
// "When I get there"; Start now begins the outing where you are with the place ahead, as a planned journey's town is, and routes
// nothing on foot. E2E_ONLY=startfar runs it.

async function run(h) {
  const { exploreUrl, at, check, shot, freshPage, snapWorld, openWalk } = h;
  const tileOf = (pg, name) => pg.locator(`[data-testid=atlas-tile][data-name="${name}"]`);
  // A town's card: waited for in the row, selected by a tap, opened by the next (decision 0124), as the drive journey does.
  const openCard = async (pg, name) => {
    await pg.waitForSelector(`[data-testid=atlas-tile][data-name="${name}"]`, { timeout: 60000 }).catch(() => {});
    const cardUp = () => pg.waitForSelector('[data-testid=atlas-card]', { timeout: 3000 }).catch(() => null);
    await tileOf(pg, name).first().click();
    if (!(await cardUp()) && (await tileOf(pg, name).count())) await tileOf(pg, name).first().click();
    if (!(await cardUp())) {
      await pg.click('[data-testid=atlas-town-head]', { timeout: 30000 });
      await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 });
    }
    await pg.waitForTimeout(700);
  };
  const text = async (pg, id) => ((await pg.locator(`[data-testid=${id}]`).first().innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
  snapWorld.serve = true;
  try {
    const { c, pg } = await freshPage('startfar');
    // Cranston is a town 4 km west of the grid's start; from 11.5 km east of it, it is past what can be walked.
    const east = at(75, 0);
    await c.setGeolocation({ longitude: east[0], latitude: east[1], accuracy: 6 });
    await pg.goto(exploreUrl);
    await openCard(pg, 'Cranston');
    const ids = await pg.evaluate(() => ['atlas-walk', 'atlas-walk-now', 'atlas-start-far', 'atlas-walk-later'].filter((id) => document.querySelector(`[data-testid=${id}]`)));
    const card = await text(pg, 'atlas-card');
    check(JSON.stringify(ids) === JSON.stringify(['atlas-start-far', 'atlas-walk-later']) && (await text(pg, 'atlas-start-far')) === 'Start now' && (await text(pg, 'atlas-walk-later')) === 'When I get there' && !/Too far to walk|Walk now/.test(card) && !(await openWalk(pg)),
      `DO5, DO6: past 10 km the card asks "Start now" or "When I get there", and starts nothing by itself (${ids.join(', ')})`);
    {
      const a = await pg.locator('[data-testid=atlas-start-far]').boundingBox().catch(() => null);
      const b = await pg.locator('[data-testid=atlas-walk-later]').boundingBox().catch(() => null);
      const vw = pg.viewportSize()?.width ?? 0;
      check(!!a && !!b && a.height >= 44 && b.height >= 44 && a.x >= 0 && b.x + b.width <= vw && (a.x + a.width <= b.x || a.y + a.height <= b.y), 'DO6: the two answers are full-size controls, side by side or stacked, inside the screen');
    }
    check((await text(pg, 'atlas-start-far-line')) === 'Start now records from here, toward Cranston.', `drive-in-the-outing audit 2: the card says on its face what Start now does (${await text(pg, 'atlas-start-far-line')})`);
    // road-engine audit 5: Open in Maps for a place a drive away asks for driving directions, here as on the bar.
    await pg.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
    await pg.click('[data-testid=atlas-card-maps]');
    await pg.waitForTimeout(500);
    {
      const opened = await pg.evaluate(() => window.__opened ?? []);
      check(opened.length === 1 && /(travelmode=driving|dirflg=d)/.test(opened[0]), `road-engine audit 5: the far card's Open in Maps asks for driving directions (${opened[0]})`);
    }
    await shot(pg, 'startfar-1-asks');
    await pg.click('[data-testid=atlas-start-far]');
    await pg.waitForSelector('[data-testid=journey-bar]', { timeout: 90000 }).catch(() => {});
    await c.setGeolocation({ longitude: east[0], latitude: east[1], accuracy: 6 });
    await pg.waitForFunction(() => /away\.$/.test(document.querySelector('[data-testid=journey-next]')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
    const bar = await text(pg, 'journey-next');
    check(!!(await openWalk(pg)) && /^Toward Cranston\. \d+(\.\d)?[  ](km|mi) away\.$/.test(bar), `DO7: Start now begins the outing where you are, with the place ahead (${bar})`);
    check((await pg.locator('[data-testid=nav-bar]').count()) === 0 && (await pg.locator('[data-testid=journey-maps]').count()) === 1 && (await pg.locator('[data-testid=journey-drive]').count()) === 1 && (await pg.locator('[data-testid=journey-pass]').count()) === 1,
      'DO7: no way on foot is routed; the bar offers Open in Maps, Drive there and Pass by, as for a journey\'s town');
    const caps = await pg.locator('[aria-label="Take a photo or video"], [aria-label="Record a voice memo"], [aria-label="Write a note"]').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).length);
    check(caps >= 3, `DO8: the capture stack is on the screen as ever (${caps} controls)`);
    await shot(pg, 'startfar-2-started');
    // drive-in-the-outing audit 1: with the session open, another far place's card offers nothing that would replace its journey.
    await pg.click('[data-testid=walk-minimize]');
    await pg.waitForSelector('[data-testid=tab-explore]', { timeout: 15000 }).catch(() => {});
    await pg.click('[data-testid=tab-explore]');
    // While a session records the row lists what is around the trace: Quiet Hollow, 13 km off, is a far place too.
    await openCard(pg, 'Quiet Hollow');
    check((await pg.locator('[data-testid=atlas-card]').count()) === 1 && (await pg.locator('[data-testid=atlas-walk-later]').count()) === 1 && (await pg.locator('[data-testid=atlas-start-far]').count()) === 0 && (await pg.locator('[data-testid=atlas-start-far-line]').count()) === 0, 'drive-in-the-outing audit 1: with a session open the far card does not offer Start now');
    await shot(pg, 'startfar-3-session-open');
    await pg.close();
    await c.close();
  } finally {
    snapWorld.serve = false;
  }
}

module.exports = {
  name: 'startfar',
  covers: ['src/lib/startPlan.ts', 'src/lib/outing/journeyPlan.ts', 'src/components/atlas/AtlasCard.tsx', 'src/app/(tabs)/explore.tsx'],
  run,
};
