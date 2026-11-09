// Kind walk (KW1-KW14): a kind opened in place on an area's card offers one suggested walk, a distance and never a time,
// with whether it can be walked said; Start this walk opens an ordinary walk that also says distance only.
// E2E_ONLY=kindwalk runs it alone.

async function run(h) {
  const { url, exploreUrl, at, check, freshPage, shot } = h;
  const { c, pg } = await freshPage('kindwalk');
  const here = at(-120, 0);
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.goto(exploreUrl);
  const tile = pg.locator('[data-testid=atlas-tile][data-name="Green Row"]');
  await pg.waitForSelector('[data-testid=atlas-tile][data-name="Green Row"][data-read="1"]', { timeout: 60000 }).catch(() => {});
  await tile.click().catch(() => {});
  await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 }).catch(() => {});
  const before = pg.url();
  const kind = pg.locator('[data-testid=atlas-kind-parks]');
  check((await kind.count()) === 1, 'KW1: Green Row\'s card has a Green row');

  check((await pg.locator('[data-testid=atlas-kind-walk-history]').count()) === 0 && (await pg.locator('[data-testid=atlas-kind-walk-parks]').count()) === 1, 'KW2: a kind with none has no "Suggest a walk" button, one with some does');
  const btn = pg.locator('[data-testid=atlas-kind-walk-parks]');
  // The card slides up as it opens: measured once it has settled.
  await btn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const box = await btn.boundingBox().catch(() => null);
  check((await btn.count()) === 1 && /Suggest a walk/.test(await btn.innerText().catch(() => '')) && !!box && box.width >= 43.5 && box.height >= 43.5, 'KW15: each kind row has a "Suggest a walk" button, at least 44 px to touch');
  const row = await pg.locator('[data-testid=atlas-kind-parks]').boundingBox().catch(() => null);
  const cardBox = await pg.locator('[data-testid=atlas-card-pull]').boundingBox().catch(() => null);
  check(!!box && !!cardBox && Math.abs((box.x + box.width) - (cardBox.x + cardBox.width - 18)) <= 6, `KW15: the button is aligned right in its row (right edge ${box ? Math.round(box.x + box.width) : '?'}, card ${cardBox ? Math.round(cardBox.x + cardBox.width) : '?'})`);
  check((await btn.getAttribute('aria-label').catch(() => '')) === 'Suggest a walk through green', 'KW15: the button reads as one to a screen reader');
  await btn.click().catch(() => {});
  await pg.waitForSelector('[data-testid=kindwalk-length]', { timeout: 60000 }).catch(() => {});
  check((await pg.locator('[data-testid=kindwalk-parks]').count()) === 1 && pg.url() === before, 'KW15: the button opens the kind in place');
  await btn.click().catch(() => {});
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=kindwalk-parks]').count()) === 0, 'KW15: and closes it');

  await kind.click().catch(() => {});
  await pg.waitForSelector('[data-testid=kindwalk-length]', { timeout: 60000 }).catch(() => {});
  const panel = pg.locator('[data-testid=kindwalk-parks]');
  const text = async () => (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ');
  check((await panel.count()) === 1 && pg.url() === before && (await pg.locator('[data-testid=atlas-card]').count()) === 1,
    'KW1: tapping the kind opens it in place: no new screen, route or modal');
  const first = await text();
  if (process.env.E2E_DEBUG) console.log('IDB', JSON.stringify(await pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const db = req.result; const out = { stores: [...db.objectStoreNames] };
      const t = db.transaction(['place', 'atlas_area'], 'readonly');
      t.objectStore('place').getAll().onsuccess = (e) => { out.places = e.target.result.filter((p) => p.category === 'parks').map((p) => [p.name, p.at, p.build]); };
      t.objectStore('atlas_area').getAll().onsuccess = (e) => { out.areas = e.target.result.map((a) => [a.name, a.at, a.reachM]); };
      t.oncomplete = () => resolve(out);
    };
  }))));
  if (process.env.E2E_DEBUG) console.log('CARD', (await pg.locator('[data-testid=atlas-card]').innerText()).replace(/\s+/g, ' ').slice(0, 600));
  check(/About \d+(\.\d)? (km|mi|m|ft)\b/.test(await pg.locator('[data-testid=kindwalk-length]').innerText().catch(() => '')),
    `KW7: the suggestion says its length as a distance in the displayed unit (${first})`);
  check(!/\b(min|mins|minutes?|hours?|ETA|pace|fastest?)\b/i.test(first) && !/\bbest\b/i.test(first), 'KW7, KW1b: no time, no pace, no superlative on the panel');
  check(/(Easy on foot|built around cars|not known yet)/.test(await pg.locator('[data-testid=kindwalk-reach]').innerText().catch(() => '')),
    'KW10: whether it can be walked the whole way is said before the button');
  check(!/\b(Elm|Oak|Ash|Fir|Yew|Bay) Green\b/.test(await pg.locator('[data-testid=atlas-card]').innerText()), 'KW6: the walk names no place of the kind');
  check((await pg.locator('[data-testid=kindwalk-start-walk]').count()) === 1 && (await pg.locator('[data-testid=kindwalk-length]').count()) === 1,
    'KW4: one suggested way, one button to start it');
  check(!/\d+\s*of\s*\d+|\d+\s*%/.test(first), 'KW14: no tally on the panel');

  const was = await pg.locator('[data-testid=kindwalk-length]').innerText();
  await pg.click('[data-testid=kindwalk-shorter]');
  await pg.waitForTimeout(800);
  const after = await pg.locator('[data-testid=kindwalk-length]').innerText().catch(() => was);
  check(!/\bwas\b|→|->|\bsaves?\b/i.test(await text()), `KW8b: a step shows only the current length, no difference or "was" (${was} -> ${after})`);

  await kind.click();
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=kindwalk-parks]').count()) === 0, 'KW1: tapping the kind again closes it');
  await kind.click();
  await pg.waitForSelector('[data-testid=kindwalk-start-walk]', { timeout: 30000 });
  await shot(pg, 'kindwalk-panel');
  await pg.click('[data-testid=kindwalk-start-walk]');
  await pg.waitForSelector('[data-testid=nav-bar]', { timeout: 60000 }).catch(() => {});
  const bar = await pg.locator('[data-testid=nav-left]').innerText().catch(() => '');
  check(/^\d/.test(bar) && /(\d (km|mi|ft)|\d+ m)\b/.test(bar) && !/\b(min|mins|minutes?|hours?|h)\b/i.test(bar),
    `KW7b, KW12: the walk it starts says distance only, with no time left (${bar})`);
  await shot(pg, 'kindwalk-walk');
  await c.close();
}

module.exports = {
  name: 'kindwalk',
  covers: [
    'src/lib/kindWalk/**',
    'src/components/atlas/{KindWalkPanel,KindStrip}.tsx',
    'src/lib/nav/useNavigation.ts',
  ],
  run,
};
