// Stack with previous and the quick-action row (SW1-SW18, decision 0197): on Chronicle's page, a row of four icons under
// every entry, Stack with previous joining the entry just kept into the one before with Undo, and a stack as a
// collapsible grid. In a fresh browser with nothing kept. E2E_ONLY=stackjoin runs it alone.

async function run(h) {
  const { url, check, shot, freshPage } = h;
  const { c, pg } = await freshPage('stackjoin', { permissions: ['geolocation', 'microphone'] });
  await c.setGeolocation({ latitude: 41.8236, longitude: -71.4222 });
  const there = (sel, timeout = 10000) => pg.waitForSelector(sel, { timeout, state: 'visible' }).then(() => true, () => false);
  const count = (sel) => pg.locator(sel).filter({ visible: true }).count();
  const entries = '[data-testid=journal-page] [data-testid=moment-card]';
  const input = '[data-testid=line-input]';
  const toLine = async () => {
    if ((await pg.locator('[data-testid=composer]').count()) === 0 && (await count('[data-testid=bar-compose]')) > 0) {
      await pg.click('[data-testid=bar-compose]', { timeout: 8000 }).catch(() => {});
      await pg.waitForTimeout(500);
    }
    await pg.click(input, { timeout: 8000 }).catch(() => {});
  };
  const write = async (text) => {
    await toLine();
    await pg.keyboard.type(text, { delay: 12 });
    await pg.waitForTimeout(700);
    await pg.click('[data-testid=line-done]').catch(() => {});
    await pg.waitForTimeout(900);
  };
  const stored = () => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
      g.onsuccess = () => resolve(g.result.sort((a, b) => a.t - b.t));
    };
  }));

  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await there('[data-testid=memories]', 20000);
  await pg.waitForTimeout(2000);
  await write('Turn left onto Maple Street.');
  // A minute apart, so the second is a piece made later than the first once they are stacked (audit 10).
  await pg.waitForTimeout(61000);
  await write('Then at the stop sign, turn right onto East Union Boulevard.');
  await there('[data-testid=quick-actions]', 10000);

  // SW1: every entry has the row, four slots, named, with no caption; SW5: Stack only on the entry just kept.
  const rows = await pg.locator(`${entries} [data-testid=quick-actions]`).count();
  const nEntries = await pg.locator(entries).count();
  const names = await pg.locator(`${entries} [data-testid=quick-actions] [role=button]`).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const rowText = (await pg.locator('[data-testid=quick-actions]').first().innerText().catch(() => 'x')).replace(/[\s\uE000-\uF8FF]/g, '');
  check(nEntries === 2 && rows === 2 && rowText === 'ReactionRespondThreadEdit', `SW1: each entry has a quick-action row with a one-word caption under each icon (${nEntries} entries, ${rows} rows, ${JSON.stringify(rowText)})`);
  check(['Reaction', 'Respond', 'Add to a thread', 'Edit'].every((n) => names.includes(n)), `SW1: the icons carry spoken names (${names.join(' | ')})`);
  const underline = await pg.locator(`${entries} [data-testid=entry-map] [data-testid=entry-dateline]`).first().evaluate((e) => getComputedStyle(e).textDecorationLine).catch(() => 'none');
  check(underline.includes('underline'), `SW22: a placed entry's dateline is underlined, the way to the map (${underline})`);
  const stackSlots = await count('[data-testid=quick-stack]');
  check(stackSlots === 1, `SW5: Stack with previous shows only on the entry just kept (${stackSlots})`);
  await shot(pg, 'stackjoin-01-row');

  // SW18: at 320 px the row's four slots fit and a tile is at least 88 px (the page is 390 wide here; slots are 44 pt).
  const slots = await pg.locator('[data-testid=quick-actions] > *').first().boundingBox().catch(() => null);
  check(!!slots && slots.width >= 44 && slots.height >= 44, `SW18: a row slot is a 44 pt target (${JSON.stringify(slots)})`);

  // SW2: Respond opens the viewer on its kinds menu, then back.
  await pg.locator('[data-testid=quick-respond]').first().click();
  const menu = await there('[data-testid=respond-sheet]', 8000);
  check(menu, 'SW2: the reply icon opens the kinds menu (Photo or video, Voice memo, Note) without opening the moment first');
  await pg.click('[data-testid=respond-dismiss]').catch(() => {});
  await pg.click('[data-testid=viewer-close]').catch(() => {});
  await pg.waitForTimeout(700);

  // SW3: the link icon opens Add to a thread.
  await pg.locator('[data-testid=quick-thread]').first().click();
  const threadOpen = await there('[data-testid=add-to-thread]', 8000);
  check(threadOpen, 'SW3: the link icon opens Add to a thread');
  await pg.click('[data-testid=add-to-thread-close]').catch(() => {});
  await pg.waitForTimeout(500);

  // SW4: Edit opens the note's page on a one-piece entry.
  await pg.locator('[data-testid=quick-edit]').first().click();
  const page = await there('[data-testid=note-page]', 10000);
  check(page, "SW4: the pencil opens the note's page on a one-piece entry");
  await pg.click('[data-testid=note-done]', { timeout: 8000 }).catch(() => {});
  const closed = await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).then(() => true, () => false);
  check(closed, 'SW4: Done closes the note page');
  await pg.click('[data-testid=viewer-close]', { timeout: 5000 }).catch(() => {});
  await pg.waitForTimeout(800);
  await there('[data-testid=quick-actions]', 15000);

  // SW9: Stack with previous joins them at once, with Undo; Undo brings the entry back.
  if ((await count('[data-testid=quick-stack]')) === 0) await pg.waitForTimeout(1500);
  await pg.locator('[data-testid=quick-stack]').first().click({ timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const after = await pg.locator(entries).count();
  const toast = (await pg.locator('[data-testid=undo-toast]').innerText().catch(() => '')).trim();
  check(after === 1 && /Joined with the earlier moment/.test(toast), `SW9: the entry joined the one before at once, with a pill that says so (${after} entries, ${JSON.stringify(toast)})`);
  const laterOnPage = (await pg.locator('[data-testid=piece-later]').first().innerText().catch(() => '')).trim();
  check(/^Added later, \d{1,2}:\d{2} [ap]m$/.test(laterOnPage), `stack-with-previous audit 10: the later piece says when on the page, not only on its tile (${JSON.stringify(laterOnPage)})`);
  await shot(pg, 'stackjoin-02-stacked');

  // SW11: a stack shows its face, the mark, the kinds in words and Show all.
  const kinds = (await pg.locator('[data-testid=stack-kinds]').first().innerText().catch(() => '')).trim();
  const toggle = (await pg.locator('[data-testid=stack-toggle]').first().innerText().catch(() => '')).replace(/[\uE000-\uF8FF]/g, '').trim();
  check(kinds === 'Holds notes' && toggle === 'Show all' && (await count('[data-testid=stack-mark]')) > 0, `SW11: a stack shows its mark, its kinds in words and Show all (${JSON.stringify({ kinds, toggle })})`);
  // SW12, SW13: Show all opens a grid with each tile's own time; no count; a tile opens the viewer; Show less collapses.
  await pg.locator('[data-testid=stack-toggle]').first().click();
  await pg.waitForTimeout(500);
  const tiles = await pg.locator('[data-testid=grid-tile]').count();
  const labels = await pg.locator('[data-testid=grid-tile]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  check(tiles === 2 && labels.every((l) => /\d{1,2}:\d{2} [ap]m/.test(l)), `SW12: the grid shows each piece with its own time (${labels.join(' | ')})`);
  const text = (await pg.locator(entries).first().innerText()).replace(/\d{1,2}:\d{2}( [ap]m)?/g, '');
  check(!/\d|\bof\b|\+/.test(text) && labels.every((l) => !/\bof\b|\+\d/.test(l)), `SW13: no count, position or total in the stack (${JSON.stringify(text.slice(0, 120))})`);
  await shot(pg, 'stackjoin-03-grid');
  await pg.locator('[data-testid=grid-tile]').first().click();
  const viewer = await there('[data-testid=capture-viewer]', 8000);
  check(viewer, 'SW12: a tile opens the viewer on its piece');
  await pg.click('[data-testid=viewer-close]').catch(() => {});
  await pg.waitForTimeout(600);
  await pg.locator('[data-testid=stack-toggle]').first().click().catch(() => {});
  check((await count('[data-testid=stack-grid]')) === 0, 'SW12: Show less collapses the grid');
  // SW21: a stack is a moment; its row has no Edit, and a piece can be taken out from its viewer (Split out, Delete this piece).
  const editSlots = await pg.locator(`${entries} [data-testid=quick-edit]`).count();
  await pg.locator('[data-testid=stack-toggle]').first().click().catch(() => {});
  await pg.waitForTimeout(400);
  await pg.locator('[data-testid=grid-tile]').nth(1).click().catch(() => {});
  await there('[data-testid=capture-viewer]', 8000);
  await pg.click('[data-testid=capture-viewer] [aria-label="More"]').catch(() => {});
  const split = await there('[data-testid=menu-split]', 4000);
  const viewerLater = await pg.locator('[data-testid=capture-viewer]').innerText().catch(() => '');
  check(/Added later, \d{1,2}:\d{2} [ap]m/.test(viewerLater), 'stack-with-previous audit 10: the viewer says the piece was added later');
  const shownPiece = await pg.locator('[data-testid=piece-shown]').getAttribute('data-piece').catch(() => null);
  const firstId = (await stored()).find((m) => m.pieces.length === 2)?.pieces[0]?.id;
  check(editSlots === 0 && split && !!shownPiece && shownPiece !== firstId, `SW21: a stack's row has no Edit, and from a tile's viewer a piece can be split out, and the tile's own piece is the one shown (${JSON.stringify({ editSlots, split, shownPiece })})`);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(400);
  await pg.click('[data-testid=viewer-close]', { timeout: 3000, force: true }).catch(() => {});
  await pg.waitForTimeout(400);
  if (await count('[data-testid=capture-viewer]')) await pg.keyboard.press('Escape');
  await pg.waitForSelector('[data-testid=capture-viewer]', { state: 'detached', timeout: 6000 }).catch(() => {});
  await pg.waitForTimeout(500);
  if ((await count('[data-testid=stack-grid]')) > 0) await pg.locator('[data-testid=stack-toggle]').first().click().catch(() => {});

  // SW14: with the row showing, a new capture is still one write.
  await write('Then left again.');
  const afterWrite = await pg.locator(entries).count();
  check(afterWrite >= 2, `SW14: a capture made with the row showing is kept as an entry of its own (${afterWrite} entries, viewer ${await count('[data-testid=capture-viewer]')})`);

  // SW17: once the window is closed the join is stored, and a reload shows one stack.
  await pg.locator('[data-testid=undo-dismiss]').click().catch(() => {});
  await pg.waitForTimeout(1200);
  const before = await stored();
  await pg.reload();
  await there('[data-testid=memories]', 20000);
  await pg.waitForTimeout(2000);
  const moments = await stored();
  check(moments.some((m) => m.pieces.length === 2) && moments.length === before.length, `SW17: the stack survives a reload (${moments.map((m) => m.pieces.length).join(',')})`);
  // Nov 17, after the cold find (decision 0197): captions under all of the row, Reaction in the row, nothing else on the top line.
  const top = await pg.locator(entries).first().evaluate((e) => ({ more: e.querySelectorAll('[data-testid=moment-more]').length, sign: e.querySelectorAll('[data-testid=reaction-sign]').length }));
  check(top.more === 0 && top.sign === 0, `SW19: an entry's top line has no reaction sign and no More button (${JSON.stringify(top)})`);
  await pg.locator('[data-testid=quick-react]').first().click().catch(() => {});
  const panel = await there('[data-testid=reaction-panel]', 8000);
  await pg.click('[data-testid=reaction-pick-idea]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(600);
  await pg.click('[data-testid=reaction-done]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const marksUnder = await pg.locator(`${entries} [data-testid=reaction-marks] [data-testid=reaction-name]`).allInnerTexts().catch(() => []);
  check(panel && marksUnder.join().includes('Idea'), `SW20: the Reaction slot opens the reactions and the chosen one shows under the dateline (${marksUnder.join()})`);
  // stack-with-previous audit 1, 17: an entry that gains a reaction loses its Join slot; the Reaction slot is never filled, toggled or counted.
  await write('A third thing at the corner.');
  await there('[data-testid=quick-stack]', 8000);
  const offered = await count('[data-testid=quick-stack]');
  const labelBefore = await pg.locator('[data-testid=quick-react]').last().getAttribute('aria-label').catch(() => null);
  await pg.locator('[data-testid=quick-react]').last().click().catch(() => {});
  await there('[data-testid=reaction-panel]', 8000);
  await pg.click('[data-testid=reaction-pick-happy]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(500);
  await pg.click('[data-testid=reaction-done]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  const afterReaction = await count('[data-testid=quick-stack]');
  const labelAfter = await pg.locator('[data-testid=quick-react]').last().getAttribute('aria-label').catch(() => null);
  const slotText = (await pg.locator('[data-testid=quick-react]').last().innerText().catch(() => '')).replace(/[\s\uE000-\uF8FF]/g, '');
  check(offered === 1 && afterReaction === 0, `stack-with-previous audit 1: Join leaves once the entry has a reaction (${offered} before, ${afterReaction} after)`);
  check(labelBefore === 'Reaction' && labelAfter === 'Reaction' && slotText === 'Reaction', `stack-with-previous audit 17: the Reaction slot shows no state, toggle or count (${JSON.stringify({ labelBefore, labelAfter, slotText })})`);
  await c.close();
}

module.exports = {
  name: 'stackjoin',
  covers: [
    'src/components/journal/{QuickActions,StackGrid,Entry}.tsx',
    'src/components/chronicle/MemoriesScreen.tsx',
    'src/lib/join/**',
    'src/lib/journal/actions.ts',
    'src/lib/moment.ts',
  ],
  run,
};
