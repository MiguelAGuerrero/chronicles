// Note pages (NP1-NP14, decision 0149): a note is a journal entry. The pencil opens its page, written in TipTap
// (Expo DOM: plain DOM on the web), kept as it is written; the viewer reads it; an older note stays literal.
// Seeded straight into IndexedDB. E2E_ONLY=notepage runs it alone.

const path = require('path');

const INK = 'rgb(29, 36, 48)';
const MUTED = 'rgb(89, 98, 115)';

const SEED = () => {
  const now = Date.now();
  const DAY = 86400000;
  const piece = (id, t, body, body_format) => ({ id, moment_id: id, t, kind: 'text', file_path: null, body, body_format });
  const long = 'A long line to scroll past, the queue and the bread and the street. '.repeat(90);
  const moments = [
    { id: 'page', t: now - 2 * DAY, body: `# Bakery\n\nSmelled it **two** blocks *off*.\n\n- rye\n- warm\n\n1. one\n2. two\n\n- [ ] come back\n- [x] ask her name\n\n> the queue went round the corner\n\n${long}\n\nThe last line.`, body_format: 'md' },
    { id: 'old', t: now - 3 * DAY, body: '> 5 km\n*sigh*\nsnake_case\n# 3 buses', body_format: null },
    { id: 'fig', t: now - 4 * DAY, body: 'The fig tree on Hope Street.', body_format: null },
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

const stored = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const g = req.result.transaction(['moment'], 'readonly').objectStore('moment').getAll();
    g.onsuccess = () => resolve(g.result);
  };
}));

async function run(h) {
  const { url, navUrl, check, shot, freshPage, tabTo, scriptsDir } = h;
  const { c, pg } = await freshPage('notepage', { permissions: ['geolocation'] });
  const origin = new URL(url).origin;
  const outside = [];
  pg.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:') && !/openfreemap|tiles|overture|chronicles-data|githubusercontent/.test(u)) outside.push(u);
  });
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await pg.evaluate(SEED);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=moment-card]', { timeout: 20000 });
  const there = (sel, timeout = 6000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const gone = (sel, timeout = 6000) => pg.waitForSelector(sel, { state: 'detached', timeout }).then(() => true, () => false);
  const input = () => pg.locator('[data-testid=note-page] [data-testid=note-input]');
  const inPage = (sel) => pg.locator(`[data-testid=note-page] [data-testid=note-input] ${sel}`).count();
  const before = (await stored(pg)).length;

  // NP1: the band's pencil opens the page in one tap, focused; its time is the tap's, however long the words take.
  const tapAt = Date.now();
  await pg.click('[data-testid=band-note]');
  const opened = await there('[data-testid=note-page] [data-testid=note-input]');
  await pg.waitForTimeout(600);
  const focused = await pg.evaluate(() => !!document.activeElement?.closest('[data-testid=note-input]'));
  await shot(pg, 'np-01-new-page');
  // NP2: the day in large type, and the line of a page being written.
  const day = (await pg.locator('[data-testid=note-page] [data-testid=note-day]').innerText().catch(() => '')).trim();
  const line = (await pg.locator('[data-testid=note-page] [data-testid=note-line]').innerText().catch(() => '')).trim();
  check(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}$/.test(day) && /^\d{1,2}:\d\d\s?[AP]M · Not on a walk$/i.test(line), `NP2: a page is headed by its day and its line ("${day}" / "${line}")`);
  // NP11: the placeholder, and nothing of a journal app's chrome.
  const placeholder = await pg.locator('[data-testid=note-page] [data-testid=note-input] p').first().getAttribute('data-placeholder').catch(() => null);
  await pg.waitForTimeout(2500);

  // NP3: the typing shortcuts.
  await input().click();
  await pg.keyboard.type('# Morning');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('- rye');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('warm');
  await pg.keyboard.press('Enter');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('[ ] come back');
  await pg.keyboard.press('Enter');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('1. first');
  await pg.keyboard.press('Enter');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('> said quietly');
  await pg.keyboard.press('Enter');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('a **bold** and *slant* word ');
  const shapes = {
    h1: await inPage('h1'), ul: await inPage('ul:not([data-type=taskList]) li'), task: await inPage('ul[data-type=taskList] li'),
    ol: await inPage('ol li'), quote: await inPage('blockquote'), strong: await inPage('strong'), em: await inPage('em'),
  };
  const marksGone = !/(^|\n)(#|- |\[ \]|> |1\. )/.test(await input().innerText());
  check(shapes.h1 === 1 && shapes.ul === 2 && shapes.task === 1 && shapes.ol === 1 && shapes.quote === 1 && shapes.strong === 1 && shapes.em === 1 && marksGone,
    `NP3: the shortcuts make a heading, a list ended by Return on an empty item, a checklist, a numbered list, a quote, bold and italic, the marks gone (${JSON.stringify(shapes)})`);
  // Backspace at the start of a formatted line makes it plain.
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('> undone');
  await pg.keyboard.press('Home');
  await pg.keyboard.press('Backspace');
  const quotes = await inPage('blockquote');
  check(quotes === 1, `NP3: Backspace at the start of a quote makes it a plain line (${quotes} quotes left)`);

  // NP4: Aa and @ above the keyboard, the panel's buttons named and pressed.
  const bar = await pg.locator('[data-testid=note-bar] [role=button]').evaluateAll((els) => els.map((e) => ({ name: e.getAttribute('aria-label'), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })));
  await pg.click('[data-testid=note-format]');
  await there('[data-testid=note-format-panel]');
  await shot(pg, 'np-02-format-panel');
  const panel = await pg.locator('[data-testid=note-format-panel] [role=button]').evaluateAll((els) => els.map((e) => ({ name: e.getAttribute('aria-label'), pressed: e.getAttribute('aria-pressed'), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })));
  await input().click();
  await pg.keyboard.press('End');
  await pg.click('[data-testid=note-format-bold]');
  await pg.keyboard.type('loud');
  const boldOn = await pg.getAttribute('[data-testid=note-format-bold]', 'aria-pressed');
  await pg.click('[data-testid=note-format-bold]');
  const names = ['Heading', 'Subheading', 'Body', 'Bold', 'Italic', 'Bulleted list', 'Numbered list', 'Checklist', 'Quote'];
  check(bar.map((b) => b.name).join('|') === 'Format|Mention a moment|Take a photo or video' && bar.every((b) => b.w >= 44 && b.h >= 44)
    && names.every((n) => panel.some((p) => p.name === n)) && panel.every((p) => p.w >= 44 && p.h >= 44 && (p.pressed === 'true' || p.pressed === 'false')) && boldOn === 'true',
    `NP4: Aa, @ and the camera above the keyboard; the panel's nine named, 44 px, pressed or not (bold ${boldOn}; ${JSON.stringify(panel.map((p) => p.name))})`);
  await pg.setViewportSize({ width: 320, height: 640 });
  await pg.waitForTimeout(400);
  const rows = await pg.locator('[data-testid=note-bar] [role=button]').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size);
  const panelRows = await pg.locator('[data-testid=note-format-panel] [role=button]').evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size);
  await shot(pg, 'np-03-panel-320');
  check(rows === 1 && panelRows === 2, `NP4: at 320 px the bar keeps one row and the panel its two (${rows}, ${panelRows})`);
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.click('[data-testid=note-format]');

  // NP12: the head first, each line's role, text of 16 px or more.
  const a11y = await pg.evaluate(() => {
    const page = document.querySelector('[data-testid=note-page]');
    const head = page.querySelector('[data-testid=note-head]');
    const ed = page.querySelector('[data-testid=note-input]');
    return {
      headFirst: !!(head && ed && head.compareDocumentPosition(ed) & Node.DOCUMENT_POSITION_FOLLOWING),
      font: parseFloat(getComputedStyle(ed).fontSize),
      box: ed.querySelector('input[type=checkbox]')?.getAttribute('aria-label') ?? '',
      role: ed.getAttribute('role'),
    };
  });
  check(a11y.headFirst && a11y.font >= 16 && /^Checkbox, not ticked: come back$/.test(a11y.box) && a11y.role === 'textbox', `NP12: the head comes first, a checkbox says its state and words, the text is 16 px or more (${JSON.stringify(a11y)})`);

  // NP11: only ink and muted on the page's text; no image, emoji, count or prompt; the placeholder is the one line.
  const look = await pg.evaluate(() => {
    const page = document.querySelector('[data-testid=note-page]');
    const colours = new Set();
    for (const el of page.querySelectorAll('[data-testid=note-scroll] *')) if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) colours.add(getComputedStyle(el).color);
    return { colours: [...colours], imgs: page.querySelectorAll('img').length, text: page.innerText };
  });
  const chrome = /streak|words written|prompt|insight|\b\d+ of \d+\b/i.test(look.text) || /\p{Extended_Pictographic}/u.test(look.text);
  check(placeholder === 'Start writing' && look.colours.every((x) => x === INK || x === MUTED) && look.imgs === 0 && !chrome,
    `NP11: the page is ink and muted, with no image, count or prompt, and "Start writing" its only placeholder (${JSON.stringify(look.colours)}, ${placeholder})`);

  // NP9: kept a second after a pause, with no tap.
  await pg.waitForTimeout(1800);
  const afterPause = await stored(pg);
  const made = afterPause.find((m) => (m.pieces?.[0]?.body ?? '').startsWith('# Morning'));
  // NP1: one moment, stamped at the tap though the words came seconds later.
  check(opened && focused && !!made && afterPause.length === before + 1 && made.pieces[0].body_format === 'md' && Math.abs(made.t - tapAt) < 1500,
    `NP1: the pencil opens the page in one tap, focused; it is one moment, stamped at the tap (${made ? made.t - tapAt : 'none'} ms)`);
  check(!!made, 'NP9: what is written is kept a second after a pause, with no tap');
  // NP14: the page's camera keeps its own moment and mentions it where the cursor was.
  await input().click();
  await pg.keyboard.press('Control+End');
  await pg.keyboard.type('Then ');
  const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click('[data-testid=note-camera]')]);
  await chooser.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
  const chip = await there('[data-testid=note-page] [data-testid=note-input] .mention', 15000);
  await pg.waitForTimeout(400);
  await pg.keyboard.type('by the door.');
  await shot(pg, 'np-04-camera-mention');
  await pg.click('[data-testid=note-done]');
  await gone('[data-testid=note-page]');
  await pg.waitForTimeout(800);
  const s1 = await stored(pg);
  const note1 = s1.find((m) => m.id === made?.id);
  const photo = s1.find((m) => m.pieces?.[0]?.kind === 'photo');
  check(chip && !!photo && photo.id !== note1?.id && new RegExp(`Then @\\[${photo.id}\\|A photo\\] by the door\\.`).test(note1?.pieces[0].body ?? ''),
    `NP14: the page's camera keeps a moment of its own and mentions it at the cursor (${JSON.stringify(note1?.pieces[0].body.slice(-60))})`);

  // NP9: an empty new page keeps nothing; Back leaves it.
  const n0 = (await stored(pg)).length;
  await pg.click('[data-testid=band-note]');
  await there('[data-testid=note-page] [data-testid=note-input]');
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=note-back]');
  await gone('[data-testid=note-page]');
  await pg.waitForTimeout(800);
  const emptyKeptNothing = (await stored(pg)).length === n0;

  // NP10: Lately reads a page as its words.
  const card = pg.locator('[data-testid=moment-card]:has-text("Bakery")').first();
  const cardText = (await card.innerText().catch(() => '')).trim();
  check(cardText.includes('Bakery') && !cardText.includes('# Bakery') && !cardText.includes('**'), `NP10: Lately reads a page as its words ("${cardText.slice(0, 60)}")`);

  // NP5: a formatted note reads in the viewer, drawn, to its last line.
  await card.scrollIntoViewIfNeeded();
  await card.locator('[data-testid=moment-open]').click();
  await there('[data-testid=note-reader] [data-testid=note-input]', 10000);
  await pg.waitForTimeout(800);
  await shot(pg, 'np-05-reader');
  const read = {
    h1: await pg.locator('[data-testid=note-reader] h1').count(), task: await pg.locator('[data-testid=note-reader] ul[data-type=taskList] li').count(),
    quote: await pg.locator('[data-testid=note-reader] blockquote').count(), strong: await pg.locator('[data-testid=note-reader] strong').count(),
    editable: await pg.locator('[data-testid=note-reader] [contenteditable=true]').count(),
  };
  const bodyBefore = (await stored(pg)).find((m) => m.id === 'page').pieces[0].body;
  await pg.locator('[data-testid=note-reader] input[type=checkbox]').first().click({ force: true }).catch(() => {});
  await pg.waitForTimeout(800);
  const bodyAfterTick = (await stored(pg)).find((m) => m.id === 'page').pieces[0].body;
  // NP2: scrolled past the head, the short head is the reader's; on the page it is the top bar's (checked below).
  await pg.locator('[data-testid=note-reader] [data-testid=note-scroll]').evaluate((e) => { e.scrollTop = e.scrollHeight; });
  await pg.waitForTimeout(400);
  const lastSeen = await pg.locator('[data-testid=note-reader] >> text=The last line.').isVisible().catch(() => false);
  check(read.h1 >= 2 && read.task === 2 && read.quote === 1 && read.strong === 1 && read.editable === 0 && lastSeen && bodyAfterTick === bodyBefore,
    `NP5: the note reads drawn and read-only to its last line, and a tap on a box there changes nothing (${JSON.stringify(read)}, last ${lastSeen})`);
  // NP6: on the page, a tick is kept; nothing counts the boxes.
  await pg.click('[data-testid=viewer-edit-note]');
  await there('[data-testid=note-page] [data-testid=note-input]');
  await pg.locator('[data-testid=note-scroll]').last().evaluate((e) => { e.scrollTop = e.scrollHeight; e.dispatchEvent(new Event('scroll')); });
  await pg.waitForTimeout(400);
  const short = (await pg.locator('[data-testid=note-short]').innerText().catch(() => '')).trim();
  check(/^[A-Z][a-z]{2} \d{1,2}/.test(short), `NP2: once the head has scrolled away, the top bar keeps its short form ("${short}")`);
  await pg.locator('[data-testid=note-page] input[type=checkbox]').first().click({ force: true });
  const pageText = await pg.locator('[data-testid=note-page]').innerText();
  const progress = await pg.locator('[data-testid=note-page] [role=progressbar]').count();
  await pg.click('[data-testid=note-done]');
  await gone('[data-testid=note-page]');
  await pg.waitForTimeout(800);
  const ticked = (await stored(pg)).find((m) => m.id === 'page').pieces[0].body;
  check(/- \[x\] come back/.test(ticked) && progress === 0 && !/\b\d+ of \d+\b|\b\d+ (ticked|left|done)\b/i.test(pageText), `NP6: a tick on the page is kept, and nothing counts the boxes (${progress} progress bars)`);
  await pg.click('[data-testid=viewer-close]');
  await gone('[data-testid=viewer-close]');

  // NP7: an older note shows character for character, in the viewer and on its page; opened and left, its bytes stay.
  const oldCard = pg.locator('[data-testid=moment-card]:has-text("snake_case")').first();
  const oldText = (await oldCard.innerText().catch(() => '')).trim();
  await oldCard.scrollIntoViewIfNeeded();
  await oldCard.locator('[data-testid=moment-open]').click();
  await there('[data-testid=note-reader] [data-testid=note-input]', 10000);
  const oldRead = (await pg.locator('[data-testid=note-reader] [data-testid=note-input]').innerText()).trim();
  await pg.click('[data-testid=viewer-edit-note]');
  await there('[data-testid=note-page] [data-testid=note-input]');
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=note-back]');
  await gone('[data-testid=note-page]');
  await pg.waitForTimeout(600);
  const oldRow = (await stored(pg)).find((m) => m.id === 'old').pieces[0];
  const literal = ['> 5 km', '*sigh*', 'snake_case', '# 3 buses'];
  check(literal.every((l) => oldRead.includes(l) && oldText.includes(l.split('\n')[0])) && oldRow.body === '> 5 km\n*sigh*\nsnake_case\n# 3 buses' && (oldRow.body_format ?? null) === null,
    `NP7: an older note reads character for character, and opened and left keeps its bytes (${JSON.stringify(oldRead)})`);

  // NP9: an existing note emptied and left goes, with the usual Undo.
  await pg.click('[data-testid=viewer-edit-note]');
  await there('[data-testid=note-page] [data-testid=note-input]');
  await input().fill('');
  await pg.waitForTimeout(1500);
  const notEmptied = (await stored(pg)).find((m) => m.id === 'old')?.pieces[0].body === '> 5 km\n*sigh*\nsnake_case\n# 3 buses';
  await pg.click('[data-testid=note-done]');
  const undo = await there('[data-testid=undo-toast]', 6000);
  check(emptyKeptNothing && notEmptied && undo, `NP9: an empty new page keeps nothing; an emptied note keeps its words until left, then goes with Undo (${emptyKeptNothing}, ${notEmptied}, ${undo})`);
  if (undo) await pg.click('[data-testid=undo]');
  await pg.waitForTimeout(600);
  if (await pg.locator('[data-testid=viewer-close]').count()) await pg.click('[data-testid=viewer-close]');

  // NP13: a page with a URL, written in and read, sends nothing out; pasted HTML leaves no image, frame or link.
  await pg.click('[data-testid=band-note]');
  await there('[data-testid=note-page] [data-testid=note-input]');
  await input().click();
  await pg.keyboard.type('see https://example.com/x.png ');
  await pg.locator('[data-testid=note-page] [data-testid=note-input]').evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData('text/html', '<p>pasted <img src="https://example.com/a.png"><iframe src="https://example.com/f"></iframe><a href="https://example.com/l">a link</a></p>');
    dt.setData('text/plain', 'pasted a link');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await pg.waitForTimeout(1800);
  const leaks = { img: await inPage('img'), iframe: await inPage('iframe'), a: await inPage('a') };
  await pg.click('[data-testid=note-done]');
  await gone('[data-testid=note-page]');
  await pg.waitForTimeout(1000);
  const pasted = (await stored(pg)).find((m) => (m.pieces?.[0]?.body ?? '').startsWith('see https'));
  check(leaks.img + leaks.iframe + leaks.a === 0 && outside.filter((u) => u.includes('example.com')).length === 0 && !!pasted && !/<img|<iframe|\]\(http/.test(pasted.pieces[0].body),
    `NP13: nothing leaves the app while a page with a URL is written and read, and pasted HTML leaves no image, frame or link (${JSON.stringify(leaks)}, ${outside.length} outside)`);

  // NP1 on Navigate, ready: its pencil opens the page too.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=moment-note]', { timeout: 30000 });
  await pg.click('[data-testid=moment-note]');
  const readyPage = await there('[data-testid=note-page] [data-testid=note-input]');
  await pg.click('[data-testid=note-back]');
  check(readyPage, 'NP1: Navigate\'s pencil opens the page in one tap');
  await c.close();
}

module.exports = {
  name: 'notepage',
  covers: [
    'src/components/notePage/**',
    'src/lib/notePage/**',
    'src/lib/noteEdit.ts',
    'src/components/MomentBar.tsx',
    'src/components/CaptureView.tsx',
  ],
  run,
};
