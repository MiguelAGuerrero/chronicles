#!/usr/bin/env node
// The expectation store (decision 0234): what a person would reasonably expect of each feature, one file per
// feature in docs/expectations/<feature>.md (the names of scripts/features.js). `/tend`'s lens 0 drafts the
// lines, the owner ratifies them once, and each line names the check that shows it is met.
//
//   npm run expectations -- list [<feature>]                      every line, its status and whether its check exists
//   npm run expectations -- draft <feature> --file <lines>        proposed lines, numbered on; a first draft has three
//                                                                 to five, and five at most are in force
//   npm run expectations -- amend <id> --file <line>              a proposed amendment of a ratified line, which stands
//                                                                 as it is until the owner ratifies the amendment
//   npm run expectations -- ratify <id>... --by owner --date YYYY-MM-DD --answer "<verbatim>"
//   npm run expectations -- decline <id>... --by owner --date YYYY-MM-DD --answer "<verbatim>"
//                                                                 the owner's answer, recorded; never the proxy's
//                                                                 (decision 0157: identity is the owner's)
//   npm run expectations -- set-check <id> --check <check>        the evidence a line names, filled in or moved
//   npm run expectations -- check [<feature>]                     every line's check exists (run by check:docs)
//   npm run expectations -- due [<feature>...]                    the features named (all, with none) that have no
//                                                                 ratified line
//
// A store file, after its heading and a paragraph:
//
//   - E-<feature>-<n> [proposed | ratified YYYY-MM-DD | declined YYYY-MM-DD | superseded YYYY-MM-DD by E-…] A person
//     … using <feature> would reasonably expect …
//     Amends: E-<feature>-<n>                                     (an amendment only)
//     Check: <journey>:"<check text>" | test:"<test name>" | picture:<shot name> | pending "<what it will show>"
//     Grounds: VISION "Who it is for"; <docs/research/adjacent-apps.md's job and apps, or "not yet recorded">
//     Answer: "<the owner's words>" (the owner, YYYY-MM-DD)       (ratified or declined only)
//
// A --file of lines holds the same entries without the id and status: `- A person …` and its Check and Grounds.
// Every operation prints the same thing for the same store. The decisions are pure and exported for
// arch/expectations.test.ts; the files are read and written in main(). EXPECTATIONS_ROOT reads another checkout.

const fs = require('fs');
const path = require('path');

const ROOT = process.env.EXPECTATIONS_ROOT ? path.resolve(process.env.EXPECTATIONS_ROOT) : path.join(__dirname, '..');
const DIR = 'docs/expectations';
const ID = /^E-([a-z][a-z0-9-]*)-(\d+)$/;
const LENS_LINE = /^A person\b.*\bwould reasonably expect\b/;
const GROUNDS = /^VISION "Who it is for"; \S/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const FIRST = 3;
const MOST = 5;
const KEYS = ['Amends', 'Check', 'Grounds', 'Answer'];
const ACTIVE = ['proposed', 'ratified'];

const fileOf = (feature) => `${DIR}/${feature}.md`;
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function parseStatus(s) {
  let m;
  if (s === 'proposed') return { status: 'proposed' };
  if ((m = /^(ratified|declined) (\d{4}-\d{2}-\d{2})$/.exec(s))) return { status: m[1], date: m[2] };
  if ((m = /^superseded (\d{4}-\d{2}-\d{2}) by (E-[a-z][a-z0-9-]*-\d+)$/.exec(s))) return { status: 'superseded', date: m[1], by: m[2] };
  return null;
}

function statusText(e) {
  if (e.status === 'proposed') return 'proposed';
  if (e.status === 'superseded') return `superseded ${e.date} by ${e.by}`;
  return `${e.status} ${e.date}`;
}

/** A check's parts, or null when it is in none of the forms. */
function parseCheck(check) {
  const s = String(check ?? '');
  let m;
  if ((m = /^pending "(.+)"$/.exec(s))) return { kind: 'pending', text: m[1] };
  if ((m = /^test:"(.+)"$/.exec(s))) return { kind: 'test', name: m[1] };
  if ((m = /^picture:(\S+)$/.exec(s))) return { kind: 'picture', name: m[1] };
  if ((m = /^([a-z][a-z0-9-]*):"(.+)"$/.exec(s))) return { kind: 'journey', journey: m[1], text: m[2] };
  return null;
}

/** What is wrong with a line's words, check and grounds. */
function lineProblems(l) {
  const p = [];
  const what = `"${String(l.text ?? '').slice(0, 60)}"`;
  if (!LENS_LINE.test(l.text ?? '')) p.push(`${what} does not read "A person … using <feature> would reasonably expect …"`);
  if (!parseCheck(l.check)) p.push(`${what} has no Check in a form: <journey>:"<check text>", test:"<test name>", picture:<shot name> or pending "<what it will show>"`);
  if (!GROUNDS.test(l.grounds ?? '')) p.push(`${what} has no Grounds starting 'VISION "Who it is for"; ' and then its adjacent apps, or "not yet recorded"`);
  return p;
}

const linesOf = (text) => String(text ?? '').replace(/\r\n?/g, '\n').split('\n');

/** Entries from text: `- <head>` lines, each with its indented `Key: value` lines; `offset` lines come before. */
function readEntries(lines, headOf, offset = 0) {
  const entries = [];
  const problems = [];
  for (const [i, l] of lines.entries()) {
    const at = offset + i + 1;
    if (!l.trim()) continue;
    const head = /^- (.+)$/.exec(l);
    if (head) {
      entries.push({ ...headOf(head[1], at), keys: {} });
      continue;
    }
    const key = /^ {2}(\w+): (.*)$/.exec(l);
    const e = entries[entries.length - 1];
    if (!key || !e) problems.push(`line ${at} is outside an entry: "${l.slice(0, 60)}"`);
    else if (!KEYS.includes(key[1])) problems.push(`line ${at}: ${key[1]} is no key (${KEYS.join(', ')})`);
    else if (e.keys[key[1]] !== undefined) problems.push(`line ${at}: a second ${key[1]}`);
    else e.keys[key[1]] = key[2];
  }
  return { entries, problems };
}

function entryOf(e) {
  const out = { id: e.id, n: e.n, status: e.status };
  if (e.date) out.date = e.date;
  if (e.by) out.by = e.by;
  out.text = e.text;
  if (e.keys.Amends !== undefined) out.amends = e.keys.Amends;
  out.check = e.keys.Check;
  out.grounds = e.keys.Grounds;
  if (e.keys.Answer !== undefined) out.answer = e.keys.Answer;
  return out;
}

/** A store file read: its heading and paragraph as they stand, its entries, and what does not read. */
function parseStore(text, feature) {
  const lines = linesOf(text);
  const first = lines.findIndex((l) => /^- /.test(l));
  const head = first < 0 ? '' : first === 0 ? '' : `${lines.slice(0, first).join('\n')}\n`;
  if (first < 0 && lines.some((l) => l.trim())) return { feature, head: `${lines.join('\n').replace(/\n*$/, '')}\n\n`, entries: [], problems: [] };
  const read = readEntries(
    first < 0 ? [] : lines.slice(first),
    (h, at) => {
      const m = /^(\S+) \[([^\]]+)\] (.+)$/.exec(h);
      if (!m) return { line: at, bad: `line ${at} is no entry: "- E-<feature>-<n> [<status>] A person …"` };
      return { line: at, id: m[1], statusRaw: m[2], text: m[3] };
    },
    Math.max(first, 0),
  );
  const problems = [...read.problems];
  const entries = [];
  const ids = new Set();
  for (const e of read.entries) {
    if (e.bad) {
      problems.push(e.bad);
      continue;
    }
    const id = ID.exec(e.id);
    const st = parseStatus(e.statusRaw);
    if (!id || id[1] !== feature) problems.push(`${e.id} is not an id of ${feature}: E-${feature}-<n>`);
    if (ids.has(e.id)) problems.push(`${e.id} is there twice`);
    ids.add(e.id);
    if (!st) problems.push(`${e.id}: [${e.statusRaw}] is no status (proposed, ratified <date>, declined <date>, superseded <date> by <id>)`);
    const entry = entryOf({ ...e, n: id ? Number(id[2]) : 0, ...(st ?? { status: 'proposed' }) });
    for (const p of lineProblems(entry)) problems.push(`${e.id}: ${p}`);
    const answered = entry.status === 'ratified' || entry.status === 'declined';
    if (answered && entry.answer === undefined) problems.push(`${e.id} is ${entry.status} with no Answer`);
    if (entry.status === 'proposed' && entry.answer !== undefined) problems.push(`${e.id} is proposed and has an Answer`);
    entries.push(entry);
  }
  for (const e of entries) {
    if (e.amends !== undefined && !entries.some((x) => x.id === e.amends)) problems.push(`${e.id} amends ${e.amends}, which is not in the file`);
    if (e.status === 'superseded' && !entries.some((x) => x.id === e.by)) problems.push(`${e.id} is superseded by ${e.by}, which is not in the file`);
  }
  return { feature, head, entries, problems };
}

function defaultHead(feature) {
  return [
    `# Expectations: ${feature}`,
    '',
    `What a person would reasonably expect of ${feature} (decision 0234): drafted by \`/tend\`'s lens 0, ratified by the`,
    "owner. Changed only through `npm run expectations`; a line's words, status and answer are the owner's.",
    '',
    '',
  ].join('\n');
}

function formatStore(store) {
  const entry = (e) =>
    [
      `- ${e.id} [${statusText(e)}] ${e.text}`,
      ...(e.amends !== undefined ? [`  Amends: ${e.amends}`] : []),
      `  Check: ${e.check}`,
      `  Grounds: ${e.grounds}`,
      ...(e.answer !== undefined ? [`  Answer: ${e.answer}`] : []),
      '',
    ].join('\n');
  return (store.head || defaultHead(store.feature)) + store.entries.map(entry).join('');
}

/** What would be wrong with writing `store`: it must read back with no problem, and as the same lines. */
function writeProblems(store) {
  const text = formatStore(store);
  const back = parseStore(text, store.feature);
  if (back.problems.length) return back.problems;
  const same = formatStore(back) === text && JSON.stringify(back.entries) === JSON.stringify(store.entries.map(ordered));
  return same ? [] : [`${fileOf(store.feature)} would read back otherwise than it was written`];
}

/** An operation's result, refused whole when the store it leaves would not read back as written. */
function settle(before, r) {
  if (before.problems?.length) return { store: before, ids: [], problems: [`${fileOf(before.feature)} does not read (${before.problems[0]}): the owner mends it by hand before any operation writes it`] };
  if (r.problems.length) return r;
  const w = writeProblems(r.store);
  return w.length ? { store: before, ids: [], problems: w.map((p) => `the write is refused: ${p}`) } : r;
}

/** A --file of lines: `- A person …` and its Check and Grounds (an Amends is the amend operation's). */
function parseDraft(text) {
  const read = readEntries(linesOf(text), (h) => ({ text: h }));
  const lines = read.entries.map((e) => ({ text: e.text, check: e.keys.Check, grounds: e.keys.Grounds, ...(e.keys.Amends !== undefined ? { amends: e.keys.Amends } : {}) }));
  const problems = [...read.problems];
  if (!lines.length) problems.push('no line: each is "- A person …" with its Check and Grounds indented under it');
  for (const l of lines) if (l.amends !== undefined) problems.push('an Amends is written by `amend <id>`, not in the file');
  return { lines, problems };
}

const nextN = (store) => Math.max(0, ...store.entries.map((e) => e.n)) + 1;
const inForce = (store) => store.entries.filter((e) => e.status === 'ratified' || (e.status === 'proposed' && e.amends === undefined)).length;

function newLines(store, lines, amends) {
  const problems = [];
  const seen = new Map(store.entries.map((e) => [norm(e.text), e.id]));
  for (const l of lines) {
    problems.push(...lineProblems(l));
    const was = seen.get(norm(l.text ?? ''));
    if (was) problems.push(`"${String(l.text).slice(0, 60)}" is already ${was}`);
    seen.set(norm(l.text ?? ''), 'in this file');
  }
  if (problems.length) return { store, ids: [], problems };
  let n = nextN(store);
  const added = lines.map((l) => ({
    id: `E-${store.feature}-${n}`,
    n: n++,
    status: 'proposed',
    text: l.text,
    ...(amends ? { amends } : {}),
    check: l.check,
    grounds: l.grounds,
  }));
  return { store: { ...store, entries: [...store.entries, ...added] }, ids: added.map((e) => e.id), problems: [] };
}

/** Proposed lines, numbered on from the file's highest; a first draft has three to five, and five at most stand. */
function draft(store, lines) {
  return settle(store, draftOf(store, lines));
}

function draftOf(store, lines) {
  const now = inForce(store);
  if (now === 0 && lines.length < FIRST) return { store, ids: [], problems: [`a first draft of ${store.feature} has three lines at least, five at most`] };
  if (now + lines.length > MOST) return { store, ids: [], problems: [`${store.feature} has ${now} lines in force and five at most stand: amend one (npm run expectations -- amend <id>) instead`] };
  return newLines(store, lines);
}

/** A proposed amendment of a ratified line; the line stands as it is until the owner ratifies the amendment. */
function amend(store, id, line) {
  return settle(store, amendOf(store, id, line));
}

function amendOf(store, id, line) {
  const target = store.entries.find((e) => e.id === id);
  if (!target) return { store, ids: [], problems: [`${id} is no line of ${fileOf(store.feature)}`] };
  if (target.status !== 'ratified') return { store, ids: [], problems: [`${id} is ${target.status}: only a ratified line is amended (a proposed one waits for the owner's answer)`] };
  const open = store.entries.find((e) => e.amends === id && e.status === 'proposed');
  if (open) return { store, ids: [], problems: [`${id} already has an open amendment, ${open.id}: it waits for the owner's answer`] };
  return newLines(store, [line], id);
}

/** The owner's answer to proposed lines: ratified (a ratified amendment supersedes the line it amends) or declined. */
function answer(store, ids, how) {
  return settle(store, answerOf(store, ids, how));
}

function answerOf(store, ids, { as, by, date, answer: words }) {
  const problems = [];
  if (by !== 'owner') problems.push(`--by ${by || '(none)'}: only the owner ratifies or declines a line, never the proxy (decisions 0157, 0234)`);
  if (!DATE.test(date ?? '')) problems.push(`--date ${date || '(none)'} is not YYYY-MM-DD`);
  if (!String(words ?? '').trim()) problems.push('--answer is the owner\'s words, verbatim');
  if (/[\r\n]/.test(String(words ?? ''))) problems.push('--answer is one line: put the owner\'s words on one line, verbatim');
  if (!['ratified', 'declined'].includes(as)) problems.push(`${as} is no answer`);
  for (const id of ids) {
    const e = store.entries.find((x) => x.id === id);
    if (!e) problems.push(`${id} is no line of ${fileOf(store.feature)}`);
    else if (e.status !== 'proposed') problems.push(`${id} is ${e.status}: only a proposed line is answered`);
    else if (as === 'ratified' && e.amends !== undefined) {
      const target = store.entries.find((x) => x.id === e.amends);
      if (target?.status !== 'ratified') problems.push(`${id} amends ${e.amends}, and ${e.amends} is ${target?.status ?? 'missing'}: an amendment is ratified only over a ratified line`);
    }
  }
  if (!ids.length) problems.push('no line named');
  if (problems.length) return { store, ids: [], problems };
  let entries = store.entries.map((e) => (ids.includes(e.id) ? { ...e, status: as, date, answer: `"${words}" (the owner, ${date})` } : e));
  if (as === 'ratified') {
    for (const e of entries.filter((x) => ids.includes(x.id) && x.amends)) {
      entries = entries.map((x) => (x.id === e.amends ? { ...x, status: 'superseded', date, by: e.id } : x));
    }
  }
  return { store: { ...store, entries: entries.map(ordered) }, ids, problems: [] };
}

// Key order kept as entryOf writes it, so an answered line compares and prints the same as one read back.
function ordered(e) {
  return entryOf({ ...e, keys: { Amends: e.amends, Check: e.check, Grounds: e.grounds, Answer: e.answer } });
}

/** The evidence a line names, filled in or moved: never its words, status or answer. */
function setCheck(store, id, check) {
  return settle(store, setCheckOf(store, id, check));
}

function setCheckOf(store, id, check) {
  const e = store.entries.find((x) => x.id === id);
  if (!e) return { store, ids: [], problems: [`${id} is no line of ${fileOf(store.feature)}`] };
  if (!parseCheck(check)) return { store, ids: [], problems: [`${check} is in no form: <journey>:"<check text>", test:"<test name>", picture:<shot name> or pending "<what it will show>"`] };
  return { store: { ...store, entries: store.entries.map((x) => (x.id === id ? { ...x, check } : x)) }, ids: [id], problems: [] };
}

const unescape = (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(['"`\\])/g, '$1');

/** What the checks can name: each journey's text, every test title (ok, or todo when only skipped or todo), the shots. */
function indexOf({ journeys, tests }) {
  const index = { journeys: {}, tests: {}, shots: new Set() };
  for (const [name, text] of Object.entries(journeys)) {
    index.journeys[name] = unescape(text);
    for (const m of text.matchAll(/\bshot\(\s*[^,()]+,\s*(['"`])([^'"`$]+)\1/g)) index.shots.add(m[2]);
  }
  for (const text of Object.values(tests)) {
    for (const m of text.matchAll(/\b(?:test|it)(\.todo|\.skip|\.only)?\(\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/g)) {
      const title = unescape(m[3]);
      const status = m[1] === '.todo' || m[1] === '.skip' ? 'todo' : 'ok';
      if (index.tests[title] !== 'ok') index.tests[title] = status;
    }
  }
  return index;
}

/** Whether a check exists: ok, todo (only a check.todo or test.todo holds it), pending (none yet, said so) or missing. */
function resolveCheck(check, index) {
  const c = parseCheck(check);
  if (!c) return 'missing';
  if (c.kind === 'pending') return 'pending';
  if (c.kind === 'test') return index.tests[c.name] ?? 'missing';
  if (c.kind === 'picture') return index.shots.has(c.name) ? 'ok' : 'missing';
  const text = index.journeys[c.journey];
  if (text === undefined) return 'missing';
  let found = 'missing';
  for (let at = text.indexOf(c.text); at >= 0; at = text.indexOf(c.text, at + 1)) {
    const calls = [...text.slice(0, at).matchAll(/\bcheck(\.todo)?\(/g)];
    if (calls.length && calls[calls.length - 1][1]) found = 'todo';
    else return 'ok';
  }
  return found;
}

const NOUN = { journey: 'journey check', test: 'test', picture: 'journey shot()' };

function checkProblems(stores, index, features) {
  const out = [];
  for (const s of stores) {
    if (!features.includes(s.feature)) out.push({ message: `${fileOf(s.feature)} is no feature of scripts/features.js (${s.feature}): rename it to a feature's name` });
    for (const p of s.problems) out.push({ message: `${fileOf(s.feature)}: ${p}` });
    for (const e of s.entries.filter((x) => ACTIVE.includes(x.status))) {
      if (resolveCheck(e.check, index) !== 'missing') continue;
      const c = parseCheck(e.check);
      out.push({ message: `${e.id} names ${e.check}, which no ${c ? NOUN[c.kind] : 'check'} holds: fix the check (npm run expectations -- set-check) or add it` });
    }
  }
  return out;
}

/** The features named that hold no ratified line. */
function due(stores, features) {
  return features.filter((f) => !stores.some((s) => s.feature === f && s.entries.some((e) => e.status === 'ratified')));
}

function listText(stores, index) {
  return stores
    .map((s) => [`${s.feature}`, ...s.entries.flatMap((e) => [`  ${e.id} ${statusText(e)}  ${e.text}`, `    check ${resolveCheck(e.check, index)}: ${e.check}`]), ''].join('\n'))
    .join('');
}

/**
 * What a loop commit did to a store file that the loop may not (decision 0234): every line the file held stays as it
 * was but for its Check (evidence, filled in or moved); every line it adds is proposed.
 */
function editProblems(before, after, feature) {
  const b = parseStore(before, feature);
  const a = parseStore(after, feature);
  const where = fileOf(feature);
  const why = 'the loop adds proposed lines and amendments and fills a check, through npm run expectations; a line\'s words, status and answer are the owner\'s (decision 0234)';
  if (b.problems.length) return before === after ? [] : [`changes ${where}, which does not read (${b.problems[0]}): the owner mends it by hand (decision 0234)`];
  const out = a.problems.map((p) => `${where} does not read: ${p}`);
  for (const e of b.entries) {
    const now = a.entries.find((x) => x.id === e.id);
    if (!now) {
      out.push(`removes ${e.id} from ${where}: ${why}`);
      continue;
    }
    const { check: _b, ...was } = e;
    const { check: _a, ...is } = now;
    if (JSON.stringify(was) === JSON.stringify(is)) continue;
    const verb = now.status !== e.status ? `marks ${e.id} ${now.status}` : `changes ${e.id}`;
    out.push(`${verb} in ${where}: ${why}`);
  }
  for (const e of a.entries) if (!b.entries.some((x) => x.id === e.id) && e.status !== 'proposed') out.push(`adds ${e.id} to ${where} as ${e.status}: ${why}`);
  return out;
}

const VERDICTS = ['met', 'failed', 'lacking'];

/**
 * What is wrong with a run log's references to the store: each names a line in force; a proposed line is
 * provisional and a ratified one is not; met names the line's own check when it exists, else a picture.
 */
function logRefProblems(lines, stores, index, exists = fs.existsSync) {
  const out = [];
  const all = stores.flatMap((s) => s.entries);
  for (const l of lines ?? []) {
    const e = all.find((x) => x.id === l?.id);
    if (!e) {
      out.push(`${l?.id} is no line of ${DIR}/`);
      continue;
    }
    if (!ACTIVE.includes(e.status)) out.push(`${e.id} is ${e.status}: log the line in force`);
    if (!VERDICTS.includes(l.is)) out.push(`${e.id}: is is ${VERDICTS.join(', ')}`);
    const provisional = e.status === 'proposed';
    if (Boolean(l.provisional) !== provisional) out.push(provisional ? `${e.id} is proposed: log it "provisional": true` : `${e.id} is ${e.status}: it is not provisional`);
    if (l.is !== 'met') continue;
    if (!l.evidence) {
      out.push(`${e.id} is met: name its evidence, its check or a picture`);
      continue;
    }
    const own = resolveCheck(e.check, index);
    if (own === 'ok') {
      if (l.evidence !== e.check) out.push(`${e.id} is met by its own check, ${e.check}, not ${l.evidence}`);
      continue;
    }
    const pic = /^picture:(\S+)$/.exec(l.evidence);
    const shown = pic && (pic[1].includes('/') ? exists(pic[1]) : index.shots.has(pic[1]));
    if (!shown) out.push(`${e.id}'s check is ${own}: met names a picture that exists (picture:<path or shot name>)`);
  }
  return out;
}

function readStores(root) {
  const dir = path.join(root, DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort()
    .map((f) => parseStore(fs.readFileSync(path.join(dir, f), 'utf8'), f.replace(/\.md$/, '')));
}

function walk(dir, keep) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((x, y) => (x.name < y.name ? -1 : 1))
    .flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name), keep) : keep(d.name) ? [path.join(dir, d.name)] : []));
}

function readIndex(root) {
  const journeys = Object.fromEntries(walk(path.join(root, 'scripts/e2e/journeys'), (n) => n.endsWith('.js')).map((f) => [path.basename(f, '.js'), fs.readFileSync(f, 'utf8')]));
  const tests = Object.fromEntries(walk(path.join(root, 'src/lib/__tests__'), (n) => /\.test\.tsx?$/.test(n)).map((f) => [f, fs.readFileSync(f, 'utf8')]));
  return indexOf({ journeys, tests });
}

function featureNames(root) {
  return require(path.join(root, 'scripts', 'features.js')).FEATURES.map((f) => f.name);
}

/** For check:docs: every store reads, names a feature, and every line's check exists. */
function check(root = ROOT) {
  return checkProblems(readStores(root), readIndex(root), featureNames(root));
}

function main(argv) {
  const [op, ...rest] = argv;
  const flags = {};
  const args = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith('--')) flags[rest[i].slice(2)] = rest[++i];
    else args.push(rest[i]);
  }
  const fail = (problems) => {
    for (const p of problems) console.error(`expectations ${op}: ${p}`);
    return 1;
  };
  const features = featureNames(ROOT);
  const stores = readStores(ROOT);
  const storeOf = (feature) => stores.find((s) => s.feature === feature) ?? { feature, head: '', entries: [], problems: [] };
  const write = (store) => {
    fs.mkdirSync(path.join(ROOT, DIR), { recursive: true });
    fs.writeFileSync(path.join(ROOT, fileOf(store.feature)), formatStore(store));
  };
  const featureOfId = (id) => ID.exec(id ?? '')?.[1];
  const body = () => (flags.file ? fs.readFileSync(flags.file, 'utf8') : fs.readFileSync(0, 'utf8'));

  if (op === 'list') {
    const shown = args[0] ? stores.filter((s) => s.feature === args[0]) : stores;
    if (args[0] && !features.includes(args[0])) return fail([`${args[0]} is no feature of scripts/features.js`]);
    process.stdout.write(listText(shown, readIndex(ROOT)));
    return 0;
  }
  if (op === 'draft') {
    const feature = args[0];
    if (!features.includes(feature)) return fail([`${feature || '(none)'} is no feature of scripts/features.js`]);
    const read = parseDraft(body());
    if (read.problems.length) return fail(read.problems);
    const r = draft(storeOf(feature), read.lines);
    if (r.problems.length) return fail(r.problems);
    write(r.store);
    console.log(`draft ${feature}: ${r.ids.join(', ')} proposed in ${fileOf(feature)}`);
    return 0;
  }
  if (op === 'amend') {
    const feature = featureOfId(args[0]);
    if (!feature) return fail([`${args[0] || '(none)'} is no id: E-<feature>-<n>`]);
    const read = parseDraft(body());
    if (read.lines.length !== 1) read.problems.push('an amendment is one line');
    if (read.problems.length) return fail(read.problems);
    const r = amend(storeOf(feature), args[0], read.lines[0]);
    if (r.problems.length) return fail(r.problems);
    write(r.store);
    console.log(`amend: ${r.ids[0]} proposed, amending ${args[0]}, in ${fileOf(feature)}`);
    return 0;
  }
  if (op === 'ratify' || op === 'decline') {
    const as = op === 'ratify' ? 'ratified' : 'declined';
    const byFeature = new Map();
    for (const id of args) {
      const f = featureOfId(id);
      if (!f) return fail([`${id} is no id: E-<feature>-<n>`]);
      byFeature.set(f, [...(byFeature.get(f) ?? []), id]);
    }
    if (!args.length) return fail(['no line named']);
    const done = [];
    for (const [f, ids] of byFeature) {
      const r = answer(storeOf(f), ids, { as, by: flags.by, date: flags.date, answer: flags.answer });
      if (r.problems.length) return fail(r.problems);
      done.push(r.store);
    }
    for (const s of done) write(s);
    console.log(`${op}: ${args.join(', ')} ${as} ${flags.date} ("${flags.answer}")`);
    return 0;
  }
  if (op === 'set-check') {
    const feature = featureOfId(args[0]);
    if (!feature) return fail([`${args[0] || '(none)'} is no id: E-<feature>-<n>`]);
    const r = setCheck(storeOf(feature), args[0], flags.check);
    if (r.problems.length) return fail(r.problems);
    write(r.store);
    console.log(`set-check: ${args[0]} checks ${flags.check}`);
    return 0;
  }
  if (op === 'check') {
    const shown = args[0] ? stores.filter((s) => s.feature === args[0]) : stores;
    const index = readIndex(ROOT);
    const problems = checkProblems(shown, index, features);
    if (problems.length) return fail(problems.map((p) => p.message));
    const states = shown.flatMap((s) => s.entries.filter((e) => ACTIVE.includes(e.status)).map((e) => resolveCheck(e.check, index)));
    const n = (...k) => states.filter((x) => k.includes(x)).length;
    console.log(`expectations check: ${states.length} lines, ${n('ok')} checks found, ${n('pending', 'todo')} pending, ${n('missing')} missing`);
    return 0;
  }
  if (op === 'due') {
    for (const f of due(stores, args.length ? args : features)) console.log(f);
    return 0;
  }
  console.error(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 18).map((l) => l.slice(3)).join('\n'));
  return op === 'help' ? 0 : 2;
}

module.exports = { writeProblems, ID, DIR, LENS_LINE, parseStore, formatStore, parseDraft, draft, amend, answer, setCheck, parseCheck, indexOf, resolveCheck, checkProblems, due, listText, editProblems, logRefProblems, readStores, readIndex, check };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
