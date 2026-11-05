#!/usr/bin/env node
// The device acceptance suite (specs/device-acceptance, DV1-DV7): docs/NATIVE_UNVERIFIED.md, the tests only a phone
// can run, kept for the first mobile run. Read by scripts/check-docs.js (the format, and every `device:` criterion in
// UNTESTED tied to an item), so the Stop hook and CI hold it. `npm run check:device [--area <words>]` lists what is
// open, by area, for the run.
//
// An item is one line: `- [ ] **Do:** … **Expect:** … (ID, ID)`. Ticked, it ends `— passed <Mon D>, <device> (<OS>)`;
// a failure stays open and ends `— failed <Mon D>, <device> (<OS>): <what happened>`.

const fs = require('fs');
const path = require('path');

const SUITE_FILE = 'docs/NATIVE_UNVERIFIED.md';
const ITEM = /^- \[( |x)\] (.*)$/;
const IDS = /\(([A-Z]{1,3}\d+[a-z]?(?:, [A-Z]{1,3}\d+[a-z]?)*)\)\s*(?:— (?:passed|failed) .*)?$/;
const RESULT = /— (passed|failed) ([A-Z][a-z]{2} \d{1,2}), ([^:]+?\(.+?\))(?:: (.+))?$/;

/** The suite's areas (each `##` heading) and their items (pure). Lines are 1-based. */
function parseSuite(text) {
  const areas = [];
  const loose = [];
  text.split('\n').forEach((raw, i) => {
    const line = i + 1;
    const h = /^## (.+)$/.exec(raw);
    if (h) {
      areas.push({ heading: h[1].trim(), line, items: [] });
      return;
    }
    const m = ITEM.exec(raw);
    if (!m) return;
    const body = m[2];
    const ids = IDS.exec(body);
    const r = RESULT.exec(body);
    const item = {
      line,
      done: m[1] === 'x',
      text: body,
      hasDo: body.includes('**Do:**'),
      hasExpect: body.includes('**Expect:**'),
      ids: ids ? ids[1].split(', ') : [],
      result: r ? { kind: r[1], date: r[2], device: r[3].trim(), ...(r[4] ? { what: r[4].trim() } : {}) } : null,
    };
    if (areas.length) areas[areas.length - 1].items.push(item);
    else loose.push(item);
  });
  return { areas, loose };
}

/** What is wrong with a suite, given the criteria only a device can check (pure; DV2, DV3, DV5). */
function suiteProblems(text, device) {
  const { areas, loose } = parseSuite(text);
  const out = [];
  for (const it of loose) out.push({ line: it.line, message: `${SUITE_FILE}:${it.line}: an item before any \`## \` area heading; put it under its area (DV1).` });
  const items = areas.flatMap((a) => a.items);
  for (const it of items) {
    if (!it.hasDo || !it.hasExpect) {
      out.push({ line: it.line, message: `${SUITE_FILE}:${it.line}: an item reads \`- [ ] **Do:** … **Expect:** …\`: what to do on the phone, and what passing looks like (DV2).` });
    }
    if (it.done && (!it.result || it.result.kind !== 'passed')) {
      out.push({
        line: it.line,
        message: it.result?.kind === 'failed'
          ? `${SUITE_FILE}:${it.line}: a failed item stays open (\`- [ ]\`) until it passes (DV5).`
          : `${SUITE_FILE}:${it.line}: a ticked item ends \`— passed <Mon D>, <device> (<OS>)\` (DV5).`,
      });
    }
  }
  const accepted = new Set(items.flatMap((it) => it.ids));
  for (const { slug, id } of device) {
    if (!accepted.has(id)) out.push({ line: null, message: `${slug}:${id} is device-only in UNTESTED (scripts/features.js) but ${SUITE_FILE} has no item for it: add one ending \`(${id})\` (DV3).` });
  }
  return out;
}

/** The criteria UNTESTED marks `device:`. */
function deviceCriteria(untested) {
  return Object.entries(untested).flatMap(([slug, ids]) => Object.entries(ids).filter(([, why]) => /^device: /.test(why)).map(([id]) => ({ slug, id })));
}

/** The repo's problems. */
function check(root = path.join(__dirname, '..')) {
  const file = path.join(root, SUITE_FILE);
  if (!fs.existsSync(file)) return [{ line: null, message: `${SUITE_FILE} is missing: it is the device acceptance suite (DV1).` }];
  const { UNTESTED } = require(path.join(root, 'scripts', 'features.js'));
  return suiteProblems(fs.readFileSync(file, 'utf8'), deviceCriteria(UNTESTED));
}

/** The open items by area, with their criteria, and the counts (DV7). */
function listing(text, area) {
  const { areas } = parseSuite(text);
  const want = area ? area.toLowerCase() : null;
  const shown = areas.filter((a) => a.items.length && (!want || a.heading.toLowerCase().includes(want)));
  const lines = [];
  let open = 0;
  let passed = 0;
  for (const a of shown) {
    const todo = a.items.filter((it) => !it.done);
    open += todo.length;
    passed += a.items.length - todo.length;
    if (!todo.length) continue;
    lines.push('', `## ${a.heading} (${todo.length} open)`);
    for (const it of todo) {
      const plain = it.text.replace(/\s*— (passed|failed) .*$/, '').replace(IDS, '').replace(/\*\*/g, '').trim();
      const ids = it.ids.length ? `  [${it.ids.join(', ')}]` : '';
      const failed = it.result?.kind === 'failed' ? `\n      last: failed ${it.result.date}, ${it.result.device}${it.result.what ? `: ${it.result.what}` : ''}` : '';
      lines.push(`  ${SUITE_FILE}:${it.line}  ${plain}${ids}${failed}`);
    }
  }
  lines.push('', `${open} open, ${passed} passed${want ? ` (areas matching "${area}")` : ''}. Native has never run on a device until an item says it passed.`);
  return lines.join('\n').trimStart();
}

module.exports = { SUITE_FILE, parseSuite, suiteProblems, deviceCriteria, check, listing };

if (require.main === module) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--area');
  const area = at >= 0 ? args.slice(at + 1).join(' ') : null;
  const file = process.env.DEVICE_SUITE || path.join(__dirname, '..', SUITE_FILE);
  console.log(listing(fs.readFileSync(file, 'utf8'), area));
}
