// Errors handled by kind (specs/errors-handled, EH1-EH4, EH7, EH13, EH14; decision 0179): Share diagnostics in the
// walk settings hands the log to the share sheet as text, or copies it where there is none; a failed save of a
// setting is one line in words with Retry, beside the capture buttons, never over them. The share sheet and the
// clipboard are replaced in this page only (`__shared`, `__copied`); IndexedDB refuses the next `meta` write on cue
// (`__failMeta`). E2E_ONLY=diagnostics runs it alone.

async function run(h) {
  const { navUrl, check, freshPage, drawerTo, hosts, shot } = h;

  // A browser with a share sheet: Share diagnostics hands it the text (EH1, EH3, EH3a).
  {
    const { c, pg } = await freshPage('diagnostics');
    await c.addInitScript(() => {
      window.__shared = null;
      navigator.share = async (d) => {
        window.__shared = d.text ?? d.message ?? '';
      };
      window.__failMeta = 0;
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'meta' && window.__failMeta > 0) {
          window.__failMeta--;
          throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        }
        return put.apply(this, args);
      };
    });
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
    const hostsBefore = new Set(hosts);
    await drawerTo(pg, 'full');
    const row = pg.locator('[data-testid=share-diagnostics]');
    const found = (await row.count()) === 1;
    const order = found
      ? await pg.evaluate(() => {
          const all = [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid'));
          return all.indexOf('units-km') < all.indexOf('share-diagnostics');
        })
      : false;
    const label = found ? await row.innerText() : '';
    check(found && order && /Share diagnostics/.test(label), `EH1, EH2: the walk settings have a row "Share diagnostics", after Distances ("${label.replace(/\n/g, ' ')}")`);
    const note = found ? await pg.locator('[data-testid=share-diagnostics-note]').innerText().catch(() => '') : '';
    check(/no places/i.test(note) && !/[0-9]/.test(note), `EH3a, EH13: before the tap the note says what the text holds, with no count ("${note}")`);
    await shot(pg, 'diagnostics-01-row');
    if (found) await row.click();
    await pg.waitForTimeout(800);
    const shared = await pg.evaluate(() => window.__shared);
    const after = found ? await pg.locator('[data-testid=share-diagnostics-note]').innerText().catch(() => '') : '';
    check(typeof shared === 'string' && /^Chronicles /.test(shared) && /Shared/.test(after), `EH1, EH3: the share sheet gets the text, headed "Chronicles …", and the note says Shared ("${after}")`);
    check(typeof shared === 'string' && !/-?\d{1,3}\.\d{4,}/.test(shared) && !/\/\d+\/\d+\/\d+/.test(shared), 'EH3a: the text holds no position and no tile');
    check([...hosts].every((x) => hostsBefore.has(x)), `EH4: sharing contacted no host (${[...hosts].filter((x) => !hostsBefore.has(x)).join(', ') || 'none'})`);

    // A failed save of a setting: one line in words with Retry, beside the captures, never over them (EH7, EH13, EH14).
    await pg.evaluate(() => {
      window.__failMeta = 1;
    });
    const other = (await pg.locator('[data-testid=units-km]').getAttribute('aria-checked')) === 'true' ? 'units-mi' : 'units-km';
    await pg.click(`[data-testid=${other}]`).catch(() => {});
    await drawerTo(pg, 'peek');
    const line = await pg.waitForSelector('[data-testid=save-failed-line]', { timeout: 6000 }).then((e) => e.innerText(), () => '');
    check(/A setting wasn’t saved/.test(line) && /Retry/.test(line) && !/[0-9]/.test(line.replace(/\d+\s*(m|km|ft|mi)\b/g, '')), `EH7, EH13: one line in words with Retry, no number ("${line.replace(/\n/g, ' ')}")`);
    const boxes = await pg.evaluate(() => {
      const r = (id) => document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect();
      const line = r('save-failed-line');
      const caps = ['moment-photo', 'moment-voice', 'moment-note'].map(r).filter(Boolean);
      const hit = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      return { line: !!line, caps: caps.length, over: caps.some((c) => hit(line, c)) };
    });
    check(boxes.line && boxes.caps === 3 && !boxes.over, `EH14: the line covers no capture button (${JSON.stringify(boxes)})`);
    const role = await pg.locator('[data-testid=save-failed-line]').getAttribute('role').catch(() => null);
    check(role !== 'alert' && role !== 'dialog', `EH13, EH14: the line is no dialog and no alert (role ${role})`);
    await shot(pg, 'diagnostics-02-failed-save');
    await pg.click('[data-testid=save-failed-retry]').catch(() => {});
    const gone = await pg.waitForSelector('[data-testid=save-failed-line]', { state: 'detached', timeout: 6000 }).then(() => true, () => false);
    check(gone, 'EH7: Retry saves the setting and the line goes');
    await c.close();
  }

  // A browser without a share sheet (a desktop): the text is copied, and the note says so (EH1).
  {
    const { c, pg } = await freshPage('diagnostics-copy');
    await c.addInitScript(() => {
      window.__copied = null;
      delete Navigator.prototype.share;
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copied = t; } }, configurable: true });
    });
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await drawerTo(pg, 'full');
    await pg.click('[data-testid=share-diagnostics]', { timeout: 5000 }).catch(() => {});
    await pg.waitForTimeout(800);
    const copied = await pg.evaluate(() => window.__copied);
    const note = await pg.locator('[data-testid=share-diagnostics-note]').innerText().catch(() => '');
    check(typeof copied === 'string' && /^Chronicles /.test(copied) && /Copied/.test(note), `EH1: with no share sheet the text is copied, and the note says Copied ("${note}")`);
    await c.close();
  }
}

module.exports = {
  name: 'diagnostics',
  covers: [
    'src/lib/diagnostics/**',
    'src/lib/shareLog/share.ts',
    'src/components/StartSettings.tsx',
    'src/components/ShareDiagnostics.tsx',
    'src/components/SpaceLine.tsx',
    'src/components/MomentBar.tsx',
  ],
  run,
};
