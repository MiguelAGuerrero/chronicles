// Note pages (NP1-NP14, decision 0149): a note is a journal entry. The pencil opens its page, written in TipTap
// (Expo DOM), kept as it is written; the viewer reads it; an older note stays literal. Seeded straight into
// IndexedDB. E2E_ONLY=notepage runs it alone.

const SEED = () => {
  const now = Date.now();
  const DAY = 86400000;
  const piece = (id, t, body, body_format) => ({ id, moment_id: id, t, kind: 'text', file_path: null, body, body_format });
  const moments = [
    { id: 'page', t: now - 2 * DAY, body: '# Bakery\n\nSmelled it **two** blocks *off*.\n\n- rye\n- warm\n\n1. one\n2. two\n\n- [ ] come back\n- [x] ask her name\n\n> the queue went round the corner\n\n' + 'A long line to scroll past. '.repeat(120) + '\n\nThe last line.', body_format: 'md' },
    { id: 'old', t: now - 3 * DAY, body: '> 5 km\n*sigh*\nsnake_case\n# 3 buses', body_format: null },
  ];
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['moment'], 'readwrite');
      for (const m of moments) tx.objectStore('moment').put({ id: m.id, walk_id: null, t: m.t, lat: null, lon: null, segment_id: null, piece_ids: [m.id], pieces: [piece(m.id, m.t, m.body, m.body_format)] });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
};

async function run(h) {
  const { url, check, freshPage, tabTo } = h;
  const { c, pg } = await freshPage('notepage', { permissions: ['geolocation'] });
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await pg.evaluate(SEED);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  const there = (sel, timeout = 4000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);

  await pg.locator('[data-testid=band-note]').first().click().catch(() => {});
  const page = await there('[data-testid=note-page]');
  check.todo(page, 'NP1: each pencil, Respond and Add to this moment open the page in one tap, focused; what is written is one moment, placed, in its walk or thread, stamped at the tap');
  check.todo(page, 'NP2: the page is headed by the day and the moment\'s context; the short head stays in the top bar once scrolled');
  check.todo(page, 'NP3: the typing shortcuts make headings, lists, checklists, quotes, bold and italic; Return and Backspace as said');
  check.todo(page, 'NP4: Aa and @ above the keyboard; the panel\'s buttons named, pressed, 44 px and unwrapped at 320 px');
  check.todo(page, 'NP5: a formatted note reads in the viewer, drawn, to its last line; Edit opens it for writing; a tap on a box there changes nothing');
  check.todo(page, 'NP6: a tick on the page is kept; nothing counts the boxes; no reminder is made from one');
  check.todo(page, 'NP7: an older note shows character for character on the page and everywhere; a body opened and left keeps its bytes');
  check.todo(page, 'NP9: written words are kept a second later with no tap; Back keeps them; an empty new page keeps nothing; an emptied note shows Undo');
  check.todo(page, 'NP10: Lately and the owner\'s thread read a page as its words, a heading at the row\'s size');
  check.todo(page, 'NP11: no colour but ink and muted, no image, prompt or count; the placeholder is "Start writing"');
  check.todo(page, 'NP12: the head first, each line\'s role and name, a checkbox with its state, text 16 px or more');
  check.todo(page, 'NP13: nothing leaves the app\'s origin while a page with a URL is opened, written in and read; a pasted img, iframe or link leaves none');
  check.todo(page, 'NP14: the page\'s camera keeps its own moment and mentions it at the cursor; a failed save adds no mention');
  await c.close();
}

module.exports = {
  name: 'notepage',
  covers: [
    'src/components/notePage/**',
    'src/lib/notePage/**',
    'src/lib/noteEdit.ts',
    'src/components/MomentBar.tsx',
  ],
  run,
};
