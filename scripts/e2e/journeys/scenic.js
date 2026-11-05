// Scenic routes (specs/scenic-routes, SR1-SR14): India Point Park lies a block's width north of Transit
// Street with a footway through it (scenicWorld, served only here). Go here east along Transit Street offers
// Direct and Through green; Cancel, Escape and Go; the leaning kept across a reload; nothing scenic on the way;
// all three leanings off. E2E_ONLY=scenic runs it alone.

async function run(h) {
  const { url, at, check, shot, freshPage, scenicWorld, drawerTo, metaOf } = h;
  scenicWorld.serve = true;
  try {
    const open = async (label) => {
      const { c, pg } = await freshPage(label);
      await c.addInitScript(() => { window.__perf = {}; });
      await pg.goto(url);
      await pg.waitForSelector('[data-testid=tab-explore][aria-selected=true]');
      await pg.click('[data-testid=tab-navigate]');
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(1500);
      return { c, pg };
    };
    const switches = (pg) => pg.locator('[data-testid^=leaning-]').evaluateAll((els) => els.map((e) => [e.dataset.testid, e.getAttribute('aria-checked')]));
    const startWalk = async (pg) => {
      await pg.click('[data-testid=start]');
      await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 });
      await pg.waitForTimeout(2500);
    };
    const press = async (pg, p) => {
      const [x, y] = await pg.evaluate((q) => window.__project(q), p);
      await pg.mouse.move(x, y);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
    };
    // After a preview the map keeps its closer zoom and follows you again: zoom out until the spot is on screen.
    const onScreen = async (pg, p) => {
      for (let k = 0; k < 6; k++) {
        const [x, y] = await pg.evaluate((q) => window.__project(q), p);
        const vp = pg.viewportSize();
        if (x > 40 && x < vp.width - 80 && y > 80 && y < vp.height - 200) return;
        await pg.mouse.move(vp.width / 2, vp.height / 2);
        await pg.mouse.wheel(0, 240);
        await pg.waitForTimeout(800);
      }
    };
    const goHere = async (pg, p) => {
      await onScreen(pg, p);
      await press(pg, p);
      await pg.waitForSelector('[data-testid=go-here]');
      await pg.click('[data-testid=go-here]');
    };
    const rows = (pg) => pg.locator('[data-testid^=route-row-]').evaluateAll((els) => els.map((e) => ({ label: e.getAttribute('aria-label'), text: e.innerText, selected: e.dataset.selected, route: e.dataset.route })));
    const alternates = (pg) => pg.evaluate(() => [...document.querySelectorAll('.maplibregl-map')].pop()?.dataset.alternates ?? null);
    const preview = (pg, timeout = 60000) => pg.waitForSelector('[data-testid=route-preview]', { timeout }).then(() => true, () => false);
    const gone = (pg, sel) => pg.waitForFunction((s) => !document.querySelector(s), `[data-testid=${sel}]`, { timeout: 5000 }).then(() => true, () => false);
    const navDest = async (pg) => JSON.parse((await metaOf(pg, 'nav')) || 'null')?.dest ?? null;
    // 300 m east, on screen at the walk's zoom (a 390 px map is about 700 m across): Transit Street direct, 360 m by the park.
    const east = at(2.5, -0.5);

    const { c, pg } = await open('scenic');
    // SR1: the three leanings are switches in the walk settings, all on by default.
    await drawerTo(pg, 'half');
    check(JSON.stringify(await switches(pg)) === JSON.stringify([['leaning-green', 'true'], ['leaning-sights', 'true'], ['leaning-busy', 'true']]),
      `scenic SR1: Green, Sights and Streets with life are on by default (${JSON.stringify(await switches(pg))})`);
    await drawerTo(pg, 'peek');
    await startWalk(pg);

    // SR9: south to Wickenden Street, away from the park: nothing scenic, so the direct way at once, said once.
    await goHere(pg, at(-0.5, -1.5));
    const direct = await pg.waitForSelector('[data-testid=nav-bar]', { timeout: 60000 }).then(() => true, () => false);
    const said = (await pg.locator('text=No scenic way nearby').count()) > 0;
    check(direct && said && (await pg.locator('[data-testid=route-preview]').count()) === 0, `scenic SR9: nothing scenic goes the direct way at once, with "No scenic way nearby" (bar ${direct}, notice ${said})`);
    if (direct) {
      await pg.click('[data-testid=nav-end]');
      await gone(pg, 'nav-bar');
    }

    // SR2-SR4, SR14: east along Transit Street, the park beside it: Direct and Through green, in words.
    await pg.waitForTimeout(1100);
    await goHere(pg, east);
    check(await preview(pg), 'scenic SR2: Go here shows the routes before going');
    const r = await rows(pg);
    check(r.length === 2 && /^Direct/.test(r[0].label) && /^Through green/.test(r[1].label) && r[0].selected === '1',
      `scenic SR2: Direct first and highlighted, then Through green (${JSON.stringify(r)})`);
    check((await alternates(pg)) === '1', `scenic SR2: the other route is drawn faint on the map (${await alternates(pg)})`);
    check(r.length === 2 && /(min|minute) longer/.test(r[1].text) && /\d+ m|km/.test(r[1].text) && !/%|score/i.test(r.map((x) => x.text).join(' ')),
      `scenic SR3: a row says its time, its distance and how much longer, never a score (${JSON.stringify(r.map((x) => x.text))})`);
    check(r.length === 2 && /through India Point Park/.test(r[1].text), `scenic SR4: the park is named (${r[1]?.text})`);
    check(r.length === 2 && /minutes?, .*(m|km), .*longer, through India Point Park/.test(r[1].label), `scenic SR14: the row's label says the whole row (${r[1]?.label})`);
    await shot(pg, 'scenic-preview');

    // SR8: a tap on a row highlights it; Cancel closes the preview and sets no destination.
    await pg.click('[data-testid=route-row-1]');
    await pg.waitForTimeout(400);
    const r2 = await rows(pg);
    check(r2[1]?.selected === '1' && r2[0]?.selected === '0', `scenic SR8: a tap on a row highlights it (${JSON.stringify(r2.map((x) => x.selected))})`);
    await pg.click('[data-testid=route-cancel]');
    check((await gone(pg, 'route-preview')) && (await pg.locator('[data-testid=nav-bar]').count()) === 0 && (await navDest(pg)) === null,
      'scenic SR8: Cancel closes the preview and sets no destination');
    // Escape does the same.
    await pg.waitForTimeout(1100);
    await goHere(pg, east);
    if (await preview(pg)) {
      await pg.keyboard.press('Escape');
      check((await gone(pg, 'route-preview')) && (await pg.locator('[data-testid=nav-bar]').count()) === 0, 'scenic SR8: Escape closes the preview, with no destination');
    } else check(false, 'scenic SR8: the preview came back for Escape');

    // SR8, SR11: Go on Through green navigates that way, and the leaning is kept with the destination.
    await pg.waitForTimeout(1100);
    await goHere(pg, east);
    if (await preview(pg)) {
      await pg.click('[data-testid=route-go-1]');
      const bar = await pg.waitForSelector('[data-testid=nav-bar]', { timeout: 10000 }).then(() => true, () => false);
      const kept = await navDest(pg);
      check(bar && (await pg.locator('[data-testid=route-preview]').count()) === 0 && JSON.stringify(kept?.leanings) === '["green"]',
        `scenic SR8, SR11: Go starts Through green, and its leaning is kept (${JSON.stringify(kept)})`);
      // SR11: a reload resumes on that leaning, with no preview.
      let previewed = false;
      await pg.reload();
      for (let k = 0; k < 60 && !(await pg.locator('[data-testid=nav-bar]').count()); k++) {
        previewed ||= (await pg.locator('[data-testid=route-preview]').count()) > 0;
        await pg.waitForTimeout(1000);
      }
      const resumed = (await pg.locator('[data-testid=nav-bar]').count()) > 0;
      check(resumed && !previewed && JSON.stringify((await navDest(pg))?.leanings) === '["green"]', `scenic SR11: a reload resumes on the same leaning, without the preview (resumed ${resumed}, previewed ${previewed})`);
    } else check(false, 'scenic SR8: the preview came back for Go');
    await c.close();

    // SR1: all three off, kept across a reload; Go here then goes the direct way with no preview.
    const b = await open('scenic-off');
    await drawerTo(b.pg, 'half');
    for (const id of ['green', 'sights', 'busy']) await b.pg.click(`[data-testid=leaning-${id}]`);
    await b.pg.waitForTimeout(500);
    const off = await switches(b.pg);
    // A reload of Navigate comes back on the ready screen.
    await b.pg.reload();
    await b.pg.waitForSelector('[data-testid=start]');
    await b.pg.waitForTimeout(1500);
    await drawerTo(b.pg, 'half');
    const after = await switches(b.pg);
    check(off.every(([, v]) => v === 'false') && after.every(([, v]) => v === 'false') && (await metaOf(b.pg, 'route_leanings')) === '[]',
      `scenic SR1: switched off, the leanings stay off after a reload (${JSON.stringify(after)})`);
    await drawerTo(b.pg, 'peek');
    await startWalk(b.pg);
    await goHere(b.pg, east);
    let previewed = false;
    for (let k = 0; k < 40 && !(await b.pg.locator('[data-testid=nav-bar]').count()); k++) {
      previewed ||= (await b.pg.locator('[data-testid=route-preview]').count()) > 0;
      await b.pg.waitForTimeout(500);
    }
    check((await b.pg.locator('[data-testid=nav-bar]').count()) > 0 && !previewed && (await b.pg.locator('text=No scenic way nearby').count()) === 0,
      'scenic SR1: with all three off, Go here goes the direct way as before: no preview, no notice');
    await b.c.close();
  } finally {
    scenicWorld.serve = false;
  }
}

module.exports = {
  name: 'scenic',
  covers: ['src/components/{RoutePreview,RouteLeaningSettings}.tsx', 'src/lib/nav/{scenic,scenicSignals,useNavigation}.ts', 'src/lib/nav/scenicRead/**', 'src/lib/routeLeanings/**'],
  run,
};
