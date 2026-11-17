// Plan an outing (QC1-QC3, QC6-QC9, QC11, QC17-QC18, QC20-QC22, QC24-QC25, QC27-QC28, QC41): one control on Explore opens a page; pick what you
// want to see; one proposal as slots said by kind, named only on a tap; Swap; Include chains; Start. Curio Row (harness) is one street with
// four antiques shops, so a loop cannot be made there (it is said) and One way is the answer. E2E_ONLY=outing runs it alone.

const BANNED = /\b(minutes?|mins?|hours?|ETA|pace|brisk|quick(er|est)?|fast(er|est)?|shorter|longer|more|most|best|top|popular|rated|densest|less|than)\b|\d/i;
const NAMES = ['Brass Key Antiques', 'Dusty Attic', 'Grandma Trunk Antiques', 'Lamp and Ladder'];

async function run(h) {
  const { exploreUrl, at, check, freshPage, shot } = h;
  const { c, pg } = await freshPage('outing');
  const here = at(-248, 0);
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.goto(exploreUrl);
  // The first fix places Explore at Curio Row, as the planner's journey waits for its area.
  await pg.waitForSelector('[data-testid=atlas-tile][data-name="Curio Row"]', { timeout: 60000 }).catch(() => {});
  await shot(pg, '01-explore');
  const entry = pg.locator('[data-testid=outing-entry]');
  await entry.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
  // QC1, QC27: one control, worded, on Explore, with no badge or count.
  const entryText = (((await entry.textContent().catch(() => '')) ?? '').replace(/[^\x20-\x7e]/g, '')).trim();
  check((await entry.count()) === 1 && entryText === 'Plan an outing' && !/\d/.test(entryText), `QC1, QC27: Explore has one control worded "Plan an outing", no badge or count (${entryText})`);
  const eb = await entry.boundingBox().catch(() => null);
  check(!!eb && eb.height >= 43.5, 'QC1: the control is at least 44 px tall');
  await entry.click();
  await pg.waitForSelector('[data-testid=outing]', { timeout: 15000 }).catch(() => {});
  check((await pg.locator('[data-testid=outing]').count()) === 1, 'QC1: one tap opens the page');
  await shot(pg, '02-page-empty');
  // QC2, QC29: with nothing picked, one plain line and no slot; the vocabulary is alphabetical.
  const chips = await pg.locator('[data-testid^=outing-want-]').evaluateAll((els) => els.map((e) => e.textContent));
  check(JSON.stringify(chips) === JSON.stringify(['Antiques', 'Books', 'Thrifting']), `QC2: the entries are alphabetical (${chips.join(',')})`);
  check((await pg.locator('[data-testid=outing-pick]').count()) === 1 && (await pg.locator('[data-testid^=outing-slot-]').count()) === 0, 'QC2: with nothing picked the page proposes nothing and says one plain line');
  // QC2b: a query that matches nothing shows no chips and no "not found".
  await pg.fill('[data-testid=outing-search]', 'teapots');
  check((await pg.locator('[data-testid^=outing-want-]').count()) === 0, 'QC2: a query matching no entry shows no chips');
  await pg.fill('[data-testid=outing-search]', 'antiq');
  check((await pg.locator('[data-testid=outing-want-antiques]').count()) === 1 && (await pg.locator('[data-testid^=outing-want-]').count()) === 1, 'QC2: typing narrows the entries');
  await pg.fill('[data-testid=outing-search]', '');
  // QC3: Loop first; QC41: Include chains off.
  check((await pg.locator('[data-testid=outing-mode-loop]').getAttribute('aria-checked')) === 'true', 'QC3: the page opens on Loop');
  check((await pg.locator('[data-testid=outing-chains]').getAttribute('aria-checked')) === 'false', 'QC41: Include chains is off by default');
  await pg.click('[data-testid=outing-want-antiques]');
  await pg.waitForSelector('[data-testid=outing-reason-noLoop], [data-testid=outing-slot-0]', { timeout: 90000 }).catch(() => {});
  if (process.env.E2E_DEBUG) console.log('OUTING', (await pg.locator('[data-testid=outing]').innerText().catch(() => 'none')).replace(/\s+/g, ' ').slice(0, 600));
  check((await pg.locator('[data-testid=outing-reason-noLoop]').count()) === 1 && (await pg.locator('[data-testid^=outing-slot-]').count()) === 0, 'QC10: where a loop cannot be made without retracing, the page says so');
  await pg.click('[data-testid=outing-mode-oneway]');
  await pg.waitForSelector('[data-testid=outing-slot-0]', { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  await shot(pg, '03-proposal');
  const slots = await pg.locator('[data-testid^=outing-slot-open-]').evaluateAll((els) => els.map((e) => e.textContent));
  check(slots.length >= 2 && slots.length <= 3, `QC8: two or three stops (${slots.length})`);
  check(slots.every((s) => /^An antiques shop, (a short walk on|a little way on|some way on)$/.test(s ?? '')), `QC17: a slot says its kind and how far, in words (${slots.join(' | ')})`);
  const page = await pg.locator('[data-testid=outing]').innerText();
  check(!NAMES.some((n) => page.includes(n)), 'QC8, QC17, QC24: no shop is named on the page before a tap');
  const labels = await pg.locator('[data-testid=outing] [aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  check(!NAMES.some((n) => labels.some((l) => l && l.includes(n))), 'QC24: no accessible name holds a shop name');
  // The map's own scale bar ("100 m") is the map's, not the outing's words.
  check(!BANNED.test(page.replace(/Opening hours aren't known here\./, '').replace(/\b\d+(\.\d+)? ?(m|km|ft|mi)\b/g, '')), 'QC25, QC28: no digit, time, rank, count or superlative anywhere on the page');
  check((await pg.locator('[data-testid=outing-hours]').innerText().catch(() => '')) === "Opening hours aren't known here.", 'QC20: the hours line is one plain statement');
  // QC18: a tap names the shop on a card; nothing about hours on the card.
  await pg.click('[data-testid=outing-slot-open-0]');
  const card = await pg.locator('[data-testid=outing-card]').innerText().catch(() => '');
  check(NAMES.some((n) => card.includes(n)) && !/hour|open|closed|unknown/i.test(card), `QC18: a tap names the shop on a card and says nothing of hours (${card.replace(/\s+/g, ' ')})`);
  // QC21: Swap closes the card and the new slot is unnamed.
  await shot(pg, '04-card');
  const swapLabel = await pg.locator('[data-testid=outing-swap-0]').innerText();
  await pg.click('[data-testid=outing-swap-0]');
  await pg.waitForTimeout(300);
  const after = await pg.locator('[data-testid=outing]').innerText();
  check(swapLabel === 'Swap this stop' && (await pg.locator('[data-testid=outing-card]').count()) === 0 && !NAMES.some((n) => after.includes(n)), 'QC21: Swap is worded "Swap this stop", closes the card and leaves the new slot unnamed');
  await shot(pg, '05-after-swap');
  // QC41: the switch is kept.
  await pg.click('[data-testid=outing-chains]');
  check((await pg.locator('[data-testid=outing-chains]').getAttribute('aria-checked')) === 'true', 'QC41: Include chains turns on');
  await pg.click('[data-testid=outing-chains]');
  // QC22: Start begins an ordinary walk with a destination, distance only.
  await pg.click('[data-testid=outing-start]');
  await pg.waitForSelector('[data-testid=nav-bar]', { timeout: 90000 }).catch(() => {});
  check((await pg.locator('[data-testid=nav-bar]').count()) === 1 && (await pg.locator('[data-testid=outing]').count()) === 0, 'QC22: Start begins a walk that follows the proposal');
  const nav = await pg.locator('[data-testid=nav-bar]').innerText().catch(() => '');
  check(!NAMES.some((n) => nav.includes(n)) && !/\b(min|minutes|hour|ETA)\b/i.test(nav), 'QC22, QC24: the walk names no shop and says no time');
  // QC19, QC26: at a stop the walk says its name once, as a line, looked up then; nothing else.
  let said = '';
  // Walked along the street at 25 m a second, as the walk journey does, so no fix is thrown away as a jump.
  for (let x = -248; x <= -234 && !said; x += 0.25) {
    const p = at(x, 0.15);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
    if ((await pg.locator('[data-testid=outing-arrival]').count()) > 0) said = await pg.locator('[data-testid=outing-arrival]').innerText();
  }
  check(NAMES.includes(said.trim()), `QC19: within reach of a stop the walk says its name (${said})`);
  await c.close();
}

module.exports = {
  name: 'outing',
  covers: [
    'src/lib/outing/**',
    'src/components/outing/**',
    'src/lib/presence/presence.ts',
    'src/app/(tabs)/explore.tsx',
  ],
  run,
};
