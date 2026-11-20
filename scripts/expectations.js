#!/usr/bin/env node
// The expectation store (decision 0236): what a person would reasonably expect of each feature, one file per
// feature in docs/expectations/<feature>.md (the names of scripts/features.js). `/tend`'s lens 0 drafts the
// lines, the owner ratifies them once, and each line names the check that shows it is met.
//
//   npm run expectations -- list [<feature>]                      every line, its status and whether its check exists
//   npm run expectations -- draft <feature> --file <lines> [--serves <Verb[,Verb]>]
//                                                                 proposed lines, numbered on; a first draft has three
//                                                                 to five, and five at most are in force
//   npm run expectations -- amend <id> --file <line> [--serves <Verb[,Verb]>]
//                                                                 a proposed amendment of a ratified line, which stands
//                                                                 as it is until the owner ratifies the amendment
//   npm run expectations -- amend <id> --serves <Verb[,Verb][; clause] | none; reason>
//                                                                 with no --file, a verb-only amendment: the line's own
//                                                                 words, check and grounds, and the verb it lacks
//   npm run expectations -- ratify <id>... --by owner --date YYYY-MM-DD --answer "<verbatim>"
//   npm run expectations -- decline <id>... --by owner --date YYYY-MM-DD --answer "<verbatim>"
//                                                                 the owner's answer, recorded; never the proxy's
//                                                                 (decision 0157: identity is the owner's)
//   npm run expectations -- set-check <id> --check <check>        the evidence a line names, filled in or moved
//   npm run expectations -- check [<feature>]                     every line's check exists (run by check:docs)
//   npm run expectations -- due [<feature>...]                    of the features named (all, with none), those with no
//                                                                 line (to draft), then "awaiting the owner: …" for
//                                                                 those with proposed lines only (not drafted again)
//
// A store file, after its heading and a paragraph:
//
//   - E-<feature>-<n> [proposed | ratified YYYY-MM-DD | declined YYYY-MM-DD | superseded YYYY-MM-DD by E-…] A person
//     … using <feature> would reasonably expect …
//     Amends: E-<feature>-<n>                                     (an amendment only)
//     Check: <journey>:"<check text>" | test:"<test name>" | picture:<shot name> | pending "<what it will show>"
//     Grounds: VISION "Who it is for"; <docs/research/adjacent-apps.md's job and apps, or "not yet recorded">
//     Serves: Earn | Honour | Return, comma-separated; a proposed line names at least one (decision 0244), then
//             optionally `; <clause>` saying how it serves them (a line upholding an Always line says which:
//             `upholds "<the Always line>": <how>`); or `none; <the steward's reason>`, a line flagged to the
//             owner as serving no verb, kept or dropped by the owner's answer (decision 0245)
//     Answer: "<the owner's words>" (the owner, YYYY-MM-DD)       (ratified or declined only)
//
// A --file of lines holds the same entries without the id and status: `- A person …` and its Check, Grounds and
// Serves; --serves gives its verb to each line of the file that names none. The verb is VISION's "The three verbs"
// (decision 0244): a line drafted or amended names it. A line the owner answered before 0244 keeps its words and
// gets a verb only by a verb-only amendment the owner answers (decision 0245); no operation gives it one in place.
// An operation refuses a flag it does not take, and a flag with no word after it.
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
const KEYS = ['Amends', 'Check', 'Grounds', 'Serves', 'Answer'];
// VISION's "The three verbs", in its order (decision 0244).
const VERBS = ['Earn', 'Honour', 'Return'];
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

const NONE = 'none';

/** A Serves value's parts: its verbs (or `none`) before the first `;`, and the clause after it (null when there is no `;`). */
function servesOf(s) {
  const text = String(s ?? '');
  const at = text.indexOf(';');
  const verbs = (at < 0 ? text : text.slice(0, at)).split(',').map((v) => v.trim());
  return { verbs, clause: at < 0 ? null : text.slice(at + 1).trim() };
}

/** Whether a Serves value flags the line to the owner as serving no verb (decision 0245). */
const flagged = (serves) => serves !== undefined && servesOf(serves).verbs[0] === NONE;

/**
 * What is wrong with a Serves value: one or more of VISION's three verbs, comma-separated, none twice, then optionally
 * `; <clause>`; or `none; <the steward's reason>`, which needs its reason.
 */
function servesProblems(serves) {
  const { verbs, clause } = servesOf(serves);
  const p = [];
  if (clause === '') p.push('a ; is followed by its clause, saying how the line serves its verb');
  const lower = [...VERBS, NONE].map((v) => v.toLowerCase());
  if (clause && !/\p{L}/u.test(clause)) p.push(`"${clause}" after the ; holds no word: the clause says how, in words`);
  else if (clause && clause.split(/[\s,]+/).filter(Boolean).every((w) => lower.includes(w.toLowerCase()))) p.push(`"${clause}" after the ; is a verb, not a clause: verbs go before the ;, comma-separated`);
  if (verbs.includes(NONE)) {
    if (verbs.length > 1) p.push('none stands alone: a line serves verbs, or none');
    else if (!clause) p.push("none names the steward's reason after a ;: none; <why the line serves no verb> (decision 0245)");
    return p;
  }
  for (const v of verbs) if (!VERBS.includes(v)) p.push(`${v ? `"${v}"` : 'an empty word'} is no verb: Serves names Earn, Honour or Return (docs/VISION.md "The three verbs", decision 0244), or none; <reason>`);
  for (const v of VERBS) if (verbs.filter((x) => x === v).length > 1) p.push(`${v} is named twice`);
  return p;
}

/** A Serves value written in one form: the verbs in VISION's order, comma and space between, then `; <clause>`. */
function servesText(serves) {
  const { verbs, clause } = servesOf(serves);
  const head = verbs.includes(NONE) ? NONE : VERBS.filter((v) => verbs.includes(v)).join(', ');
  return clause ? `${head}; ${clause}` : head;
}

const blank = (serves) => serves === undefined || !String(serves).trim();

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
    const key = /^ {2}(\w+):(?: (.*))?$/.exec(l);
    const e = entries[entries.length - 1];
    if (!key || !e) problems.push(`line ${at} is outside an entry: "${l.slice(0, 60)}"`);
    else if (!KEYS.includes(key[1])) problems.push(`line ${at}: ${key[1]} is no key (${KEYS.join(', ')})`);
    else if (e.keys[key[1]] !== undefined) problems.push(`line ${at}: a second ${key[1]}`);
    else e.keys[key[1]] = key[2] ?? '';
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
  if (e.keys.Serves !== undefined) out.serves = e.keys.Serves;
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
    // A Serves present is read on every line; one absent is the check's to name, on a proposed line only (decision 0244).
    if (entry.serves !== undefined) for (const p of servesProblems(entry.serves)) problems.push(`${e.id}: ${p}`);
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
    `What a person would reasonably expect of ${feature} (decision 0236): drafted by \`/tend\`'s lens 0, ratified by the`,
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
      ...(e.serves !== undefined ? [`  Serves: ${e.serves}`] : []),
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

/** A --file of lines: `- A person …` and its Check, Grounds and Serves (an Amends is the amend operation's). */
function parseDraft(text) {
  const read = readEntries(linesOf(text), (h) => ({ text: h }));
  const lines = read.entries.map((e) => ({
    text: e.text,
    check: e.keys.Check,
    grounds: e.keys.Grounds,
    ...(!blank(e.keys.Serves) ? { serves: e.keys.Serves } : {}),
    ...(e.keys.Amends !== undefined ? { amends: e.keys.Amends } : {}),
  }));
  const problems = [...read.problems];
  if (!lines.length) problems.push('no line: each is "- A person …" with its Check and Grounds indented under it');
  for (const l of lines) if (l.amends !== undefined) problems.push('an Amends is written by `amend <id>`, not in the file');
  return { lines, problems };
}

/** --serves given to each line of a file that names no verb; refused when it is no verb, or another than a line's own. */
function withServes(lines, flag) {
  if (flag === undefined) return { lines, problems: [] };
  const problems = servesProblems(flag).map((p) => `--serves: ${p}`);
  for (const l of lines) {
    if (!blank(l.serves) && servesText(l.serves) !== servesText(flag)) problems.push(`"${String(l.text).slice(0, 60)}" serves ${l.serves} and --serves says ${flag}: name one`);
  }
  if (problems.length) return { lines, problems };
  return { lines: lines.map((l) => (blank(l.serves) ? { ...l, serves: flag } : l)), problems: [] };
}

const declinedOf = (e, target) => Boolean(target) && e.amends === target && e.status === 'declined';

const nextN = (store) => Math.max(0, ...store.entries.map((e) => e.n)) + 1;
const inForce = (store) => store.entries.filter((e) => e.status === 'ratified' || (e.status === 'proposed' && e.amends === undefined)).length;

function newLines(store, lines, amends, index, exempt) {
  const problems = [];
  // A declined verb-only amendment of the exempt line is no duplicate: the owner said no to its verb, not to its words.
  const seen = new Map(store.entries.filter((e) => !declinedOf(e, exempt)).map((e) => [norm(e.text), e.id]));
  for (const l of lines) {
    problems.push(...lineProblems(l));
    const what = `"${String(l.text ?? '').slice(0, 60)}"`;
    if (blank(l.serves)) problems.push(`${what} serves no verb: name it, Serves: Earn, Honour or Return, or --serves (decision 0244)`);
    else problems.push(...servesProblems(l.serves).map((p) => `${what}: ${p}`));
    // A check the script cannot find is refused at the write, so no write of the loop's reddens check:docs (audit 21).
    if (index && parseCheck(l.check) && resolveCheck(l.check, index, store.feature) === 'missing') problems.push(missingWhy(`"${String(l.text).slice(0, 60)}"`, l.check, index));
    const was = seen.get(norm(l.text ?? ''));
    if (was && !(exempt && was === exempt)) problems.push(`"${String(l.text).slice(0, 60)}" is already ${was}`);
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
    serves: servesText(l.serves),
  }));
  return { store: { ...store, entries: [...store.entries, ...added] }, ids: added.map((e) => e.id), problems: [] };
}

/** Proposed lines, numbered on from the file's highest; a first draft has three to five, and five at most stand. */
function draft(store, lines, index) {
  return settle(store, draftOf(store, lines, index));
}

function draftOf(store, lines, index) {
  const now = inForce(store);
  if (now === 0 && lines.length < FIRST) return { store, ids: [], problems: [`a first draft of ${store.feature} has three lines at least, five at most`] };
  if (now + lines.length > MOST) return { store, ids: [], problems: [`${store.feature} has ${now} lines in force and five at most stand: amend one (npm run expectations -- amend <id>) instead`] };
  return newLines(store, lines, undefined, index);
}

/** A proposed amendment of a ratified line; the line stands as it is until the owner ratifies the amendment. */
function amend(store, id, line, index) {
  return settle(store, amendOf(store, id, line, index));
}

/** Why `id` takes no amendment (beside `self`, the amendment itself when it is already in the entries), or null. */
function targetProblem(entries, id, self) {
  const target = entries.find((e) => e.id === id);
  if (!target) return `${id} is no line of the file`;
  if (target.status !== 'ratified') return `${id} is ${target.status}: only a ratified line is amended (a proposed one waits for the owner's answer)`;
  const open = entries.find((e) => e.amends === id && e.status === 'proposed' && e.id !== self);
  return open ? `${id} already has an open amendment, ${open.id}: it waits for the owner's answer` : null;
}

function amendOf(store, id, line, index) {
  const target = store.entries.find((e) => e.id === id);
  if (!target) return { store, ids: [], problems: [`${id} is no line of ${fileOf(store.feature)}`] };
  const why = targetProblem(store.entries, id);
  if (why) return { store, ids: [], problems: [why] };
  if (line.text !== target.text) return newLines(store, [line], id, index);
  // A verb-only amendment (decision 0245): the line's own words, check and grounds, and the verb it lacks.
  const verbOnly = verbOnlyProblem(target, line);
  return verbOnly ? { store, ids: [], problems: [`${id}: ${verbOnly}`] } : newLines(store, [line], id, index, id);
}

/** Why a line with a target's own words is no verb-only amendment of it, or null when it is one. */
function verbOnlyProblem(target, line) {
  if (target.serves !== undefined) return `already serves ${target.serves}: a line with a verb changes it only with its words (an amendment in other words)`;
  if (line.check !== target.check || line.grounds !== target.grounds) return "a verb-only amendment keeps the line's check and grounds as they stand";
  // `none; <reason>` flags a ratified line to the owner as serving no verb (decision 0245, run 17's second review).
  if (blank(line.serves)) return 'a verb-only amendment names a verb, Earn, Honour or Return, or none; <the steward\'s reason>';
  return null;
}

/** The owner's answer to proposed lines: ratified (a ratified amendment supersedes the line it amends) or declined. */
function answer(store, ids, how) {
  return settle(store, answerOf(store, ids, how));
}

function answerOf(store, ids, { as, by, date, answer: words }) {
  const problems = [];
  if (by !== 'owner') problems.push(`--by ${by || '(none)'}: only the owner ratifies or declines a line, never the proxy (decisions 0157, 0236)`);
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
  return entryOf({ ...e, keys: { Amends: e.amends, Check: e.check, Grounds: e.grounds, Serves: e.serves, Answer: e.answer } });
}

/** The evidence a line names, filled in or moved: never its words, status or answer. */
function setCheck(store, id, check, index) {
  return settle(store, setCheckOf(store, id, check, index));
}

function setCheckOf(store, id, check, index) {
  const e = store.entries.find((x) => x.id === id);
  if (!e) return { store, ids: [], problems: [`${id} is no line of ${fileOf(store.feature)}`] };
  if (!parseCheck(check)) return { store, ids: [], problems: [`${check} is in no form: <journey>:"<check text>", test:"<test name>", picture:<shot name> or pending "<what it will show>"`] };
  if (index && parseCheck(check).kind !== 'pending' && resolveCheck(check, index, store.feature) === 'missing') return { store, ids: [], problems: [missingWhy(id, check, index)] };
  const vanished = index && resolveCheck(e.check, index, store.feature) === 'missing';
  if (parseCheck(e.check)?.kind !== 'pending' && parseCheck(check).kind === 'pending' && !vanished) {
    return { store, ids: [], problems: [`${id} is checkable (${e.check}): its check moves to another check, never back to pending while it is there`] };
  }
  return { store: { ...store, entries: store.entries.map((x) => (x.id === id ? { ...x, check } : x)) }, ids: [id], problems: [] };
}

const unescape = (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(['"`\\])/g, '$1');

// A small scanner over a journey's source, enough to find a call's arguments: strings, templates (with their ${}),
// regular expressions and comments are stepped over, so a comma or a bracket inside them is not read as code.
const REGEX_AFTER = /[(,=:[!&|?{};+\-*%<>~^]/;

function skipQuoted(text, i) {
  const q = text[i];
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === '\\') j++;
    else if (text[j] === q) return j;
    else if (text[j] === '\n') return -1;
  }
  return -1;
}

function skipTemplate(text, i) {
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === '\\') j++;
    else if (text[j] === '`') return j;
    else if (text[j] === '$' && text[j + 1] === '{') {
      const end = scan(text, j + 2, '}');
      if (!end) return -1;
      j = end.at;
    }
  }
  return -1;
}

function skipRegex(text, i) {
  let inClass = false;
  for (let j = i + 1; j < text.length; j++) {
    const c = text[j];
    if (c === '\\') j++;
    else if (c === '\n') return -1;
    else if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '/' && !inClass) return j;
  }
  return -1;
}

/** From `i`, the index of the `close` that ends the open bracket, and the top-level commas before it; null if none. */
function scan(text, i, close) {
  let depth = 0;
  let prev = '(';
  const commas = [];
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    let to = j;
    if (c === '/' && text[j + 1] === '/') to = text.indexOf('\n', j);
    else if (c === '/' && text[j + 1] === '*') to = text.indexOf('*/', j + 2) + 1;
    else if (c === '"' || c === "'") to = skipQuoted(text, j);
    else if (c === '`') to = skipTemplate(text, j);
    else if (c === '/' && REGEX_AFTER.test(prev)) to = skipRegex(text, j);
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) {
      if (depth === 0) return c === close ? { at: j, commas } : null;
      depth--;
    } else if (c === ',' && depth === 0) commas.push(j);
    if (to < 0 || (to === 0 && c === '/')) return null;
    if (to !== j) {
      prev = c === '/' && text[j + 1] !== '/' && text[j + 1] !== '*' ? '/' : prev;
      if (c === '"' || c === "'" || c === '`') prev = c;
      j = to;
      continue;
    }
    if (!/\s/.test(c)) prev = c;
  }
  return null;
}

/** A string literal's value, or null when `src` is anything else (a template with ${}, a concatenation, a name). */
function literal(src) {
  const m = /^(?:'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\$]|\$(?!\{))*)`)$/s.exec(src.trim());
  return m ? unescape(m[1] ?? m[2] ?? m[3]) : null;
}

/** A journey's checks by message: the last argument of each check( or check.todo( call, when it is a plain string. */
function checkMessages(text) {
  const out = {};
  const templates = [];
  for (const m of text.matchAll(/(?<![.\w$])check(\.todo)?\(/g)) {
    const from = m.index + m[0].length;
    const call = scan(text, from, ')');
    if (!call) continue;
    const bounds = [from - 1, ...call.commas, call.at];
    const args = bounds.slice(1).map((b, k) => text.slice(bounds[k] + 1, b));
    if (args.length > 1 && !args[args.length - 1].trim()) args.pop();
    const last = (args[args.length - 1] ?? '').trim();
    const message = literal(last);
    const status = m[1] ? 'todo' : 'ok';
    if (message !== null) {
      if (out[message] !== 'ok') out[message] = status;
    } else if (/^`/.test(last) && last.includes('${')) {
      templates.push({ fixed: unescape(last.slice(1, last.indexOf('${'))), status });
    }
  }
  return { messages: out, templates };
}

// A template message (audit 18) is named by its fixed text before the first ${, when that text holds this many letters
// of words after a leading criterion id or audit name (audit 25: "tend tabs audit 3: " names nothing), and no other
// check of the journey (a message, or another template's fixed text) starts with it or is started by it.
const TEMPLATE_MIN = 12;
const ID_TOKEN = String.raw`(?:audit \d+(?:-\d+)?|[TG]\d+|\d+(?:-\d+)?|[A-Z]{1,4}\d+[a-z]?(?:-[A-Z]{0,4}\d+)?)`;
const LEADING_ID = new RegExp(String.raw`^(?:(?:tend|fix)\s+[\w-]+\s+|[a-z][\w-]*\s+(?=audit\b))?${ID_TOKEN}(?:\s*[,&]\s*(?:audit\s+)?${ID_TOKEN})*\s*:\s*`);
const wordsAfterId = (text) => (text.replace(LEADING_ID, '').match(/\p{L}/gu) ?? []).length;
const TEMPLATE_WHY = 'a template message: name it by its fixed text, which must be unique';

/** A journey check's state: ok or todo, missing, or 'template' when it names a template message no way it can be named. */
function journeyCheck(entry, text) {
  if (!entry) return 'missing';
  if (entry.messages[text]) return entry.messages[text];
  const near = entry.templates.filter((t) => t.fixed.startsWith(text) || text.startsWith(t.fixed));
  if (!near.length) return 'missing';
  const exact = entry.templates.filter((t) => t.fixed === text);
  const others = [...Object.keys(entry.messages), ...entry.templates.map((t) => t.fixed)].filter((m) => (m.startsWith(text) || text.startsWith(m)));
  if (exact.length === 1 && wordsAfterId(text) >= TEMPLATE_MIN && others.length === 1) return exact[0].status;
  return 'template';
}

/**
 * What the checks can name: each journey's check messages and shots, every test title (ok, or todo when it is
 * test.todo, test.skip, or given { todo } or { skip }), and each feature's journeys (scripts/features.js).
 */
function indexOf({ journeys, tests, features = {} }) {
  const index = { journeys: {}, shots: {}, tests: {}, features };
  for (const [name, text] of Object.entries(journeys)) {
    index.journeys[name] = checkMessages(text);
    index.shots[name] = [...text.matchAll(/(?<![.\w$])shot\(\s*[^,()]+,\s*(['"`])([^'"`$\n]+)\1\s*\)/g)].map((m) => m[2]);
  }
  for (const text of Object.values(tests)) {
    const titles = /(?<![.\w$])(?:test|it)(\.todo|\.skip|\.only)?\(\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2(\s*,\s*\{[^{}]*\b(?:todo|skip)\b)?/g;
    for (const m of text.matchAll(titles)) {
      const title = unescape(m[3]);
      const status = m[1] === '.todo' || m[1] === '.skip' || m[4] ? 'todo' : 'ok';
      if (index.tests[title] !== 'ok') index.tests[title] = status;
    }
  }
  return index;
}

const featureOfId = (id) => ID.exec(id ?? '')?.[1];

/**
 * Whether a check exists: ok, todo (only a check.todo or a test marked todo or skip holds it), pending (none yet, said
 * so) or missing. A journey check is a check's whole message in that journey; a picture, a shot of the feature's own.
 */
function resolveCheck(check, index, feature) {
  const c = parseCheck(check);
  if (!c) return 'missing';
  if (c.kind === 'pending') return 'pending';
  if (c.kind === 'test') return index.tests[c.name] ?? 'missing';
  if (c.kind === 'picture') return (index.features?.[feature] ?? []).some((j) => (index.shots?.[j] ?? []).includes(c.name)) ? 'ok' : 'missing';
  const state = journeyCheck(index.journeys[c.journey], c.text);
  return state === 'template' ? 'missing' : state;
}

/** Why a line's check is missing, said so the fix is plain. */
function missingWhy(id, check, index) {
  const c = parseCheck(check);
  if (c?.kind === 'journey' && journeyCheck(index.journeys[c.journey], c.text) === 'template') return `${id} names ${check}: ${TEMPLATE_WHY}`;
  return `${id} names ${check}, which no ${c ? NOUN[c.kind] : 'check'} holds: fix the check (npm run expectations -- set-check) or add it`;
}

const NOUN = { journey: 'journey check', test: 'test', picture: 'journey shot()' };

function checkProblems(stores, index, features) {
  const out = [];
  for (const s of stores) {
    if (!features.includes(s.feature)) out.push({ message: `${fileOf(s.feature)} is no feature of scripts/features.js (${s.feature}): rename it to a feature's name` });
    for (const p of s.problems) out.push({ message: `${fileOf(s.feature)}: ${p}` });
    for (const e of s.entries.filter((x) => ACTIVE.includes(x.status))) {
      // A proposed line names its verb; a ratified one answered before decision 0244 stands without one.
      if (e.status === 'proposed' && e.serves === undefined) out.push({ message: `${e.id} is proposed and serves no verb: the owner's answer clears it (ratify or decline ${e.id}, then a verb-only amendment); a run cannot give it one (decisions 0244, 0245)` });
      if (resolveCheck(e.check, index, s.feature) !== 'missing') continue;
      out.push({ message: missingWhy(e.id, e.check, index) });
    }
  }
  return out;
}

/** Of the features named, those with no line in force (a run drafts for them) and those with proposed lines only (awaiting the owner). */
function due(stores, features) {
  const lines = (f) => stores.find((s) => s.feature === f)?.entries.filter((e) => ACTIVE.includes(e.status)) ?? [];
  return {
    draft: features.filter((f) => !lines(f).length),
    awaiting: features.filter((f) => lines(f).length && lines(f).every((e) => e.status === 'proposed')),
  };
}

/** What list says of a line's verb: the verb, a line flagged as serving none, or a line in force awaiting the owner's verb. */
function servesLine(store, e) {
  if (flagged(e.serves)) return `none, flagged for the owner: ${servesOf(e.serves).clause}`;
  if (e.serves !== undefined) return e.serves;
  if (!ACTIVE.includes(e.status)) return 'not named';
  const open = store.entries.find((x) => x.amends === e.id && x.status === 'proposed' && x.serves !== undefined);
  return `not named: awaiting the owner's verb${open ? ` (${open.id} proposes ${open.serves})` : ''}`;
}

function listText(stores, index) {
  return stores
    .map((s) =>
      [
        `${s.feature}`,
        ...s.entries.flatMap((e) => [`  ${e.id} ${statusText(e)}  ${e.text}`, `    check ${resolveCheck(e.check, index, s.feature)}: ${e.check}`, `    serves ${servesLine(s, e)}`]),
        '',
      ].join('\n'),
    )
    .join('');
}

// The one commit that records the owner's answer to proposed lines (decision 0236): its subject names the feature and
// the date the answer was given, which every Answer it adds carries.
const ANSWER_COMMIT = /^expectations ([a-z][a-z0-9-]*): the owner's answer, (\d{4}-\d{2}-\d{2})$/;

/**
 * What an agent's commit (a loop commit or any other) did to a store file that it may not (decision 0236). In any
 * commit, a line the file held keeps its words, status, grounds and answer, and its Check moves only to another
 * check (set-check), never from a check back to pending unless `missing(check)` says the check had vanished at the
 * commit's parent; a line it adds is proposed. In the owner's answer commit
 * (`expectations <feature>: the owner's answer, <date>`) a proposed line may become ratified or declined, dated so and
 * with its Answer, and the line a ratified amendment replaces superseded on that date; nothing else changes.
 * A file that does not read is the owner's to mend by hand: an agent commit changes it in no way.
 */
function editProblems(before, after, feature, subject = '', { missing = () => false } = {}) {
  const b = parseStore(before, feature);
  const a = parseStore(after, feature);
  const where = fileOf(feature);
  const why = "an agent adds proposed lines and amendments and fills a check, through npm run expectations; a line's words, status and answer are the owner's, recorded in the answer commit (decision 0236)";
  if (b.problems.length) return before === after ? [] : [`changes ${where}, which does not read (${b.problems[0]}): the owner mends it by hand (decision 0236)`];
  const out = a.problems.map((p) => `${where} does not read: ${p}`);
  const ans = ANSWER_COMMIT.exec(String(subject).trim());
  const answering = ans && ans[1] === feature ? ans[2] : null;
  const answeredNow = new Set();
  for (const e of b.entries) {
    const now = a.entries.find((x) => x.id === e.id);
    if (now && e.status === 'proposed' && (now.status === 'ratified' || now.status === 'declined')) answeredNow.add(now);
  }
  for (const e of b.entries) {
    const now = a.entries.find((x) => x.id === e.id);
    if (!now) {
      out.push(`removes ${e.id} from ${where}: ${why}`);
      continue;
    }
    const { check: cb, ...was } = e;
    const { check: ca, ...is } = now;
    if (answering && answeredNow.has(now)) {
      const expect = ordered({ ...e, status: now.status, date: answering, answer: now.answer });
      const dated = now.date === answering && new RegExp(`^".*" \\(the owner, ${answering}\\)$`).test(now.answer ?? '');
      if (!dated) out.push(`answers ${e.id} in ${where} with a date or an Answer other than the commit's, ${answering}: "<words>" (the owner, ${answering})`);
      else if (JSON.stringify(ordered(now)) !== JSON.stringify(expect)) out.push(`answers ${e.id} in ${where} and changes more than its status and Answer: ${why}`);
      continue;
    }
    const replacedBy = [...answeredNow].find((x) => x.status === 'ratified' && x.amends === e.id);
    if (answering && replacedBy && e.status === 'ratified') {
      const expect = ordered({ ...e, status: 'superseded', date: answering, by: replacedBy.id });
      if (JSON.stringify(ordered(now)) !== JSON.stringify(expect)) out.push(`supersedes ${e.id} in ${where} otherwise than by ${replacedBy.id} on ${answering}: ${why}`);
      continue;
    }
    if (JSON.stringify(was) !== JSON.stringify(is)) {
      const verb = now.status !== e.status ? `marks ${e.id} ${now.status}` : `changes ${e.id}`;
      out.push(`${verb} in ${where}${now.status !== e.status && !answering ? ', outside the owner\'s answer commit' : ''}: ${why}`);
      continue;
    }
    if (cb !== ca && parseCheck(cb)?.kind !== 'pending' && parseCheck(ca)?.kind === 'pending' && !missing(cb, feature)) out.push(`moves ${e.id}'s check in ${where} back to pending: a check moves to another check (set-check)`);
  }
  for (const e of a.entries) {
    if (b.entries.some((x) => x.id === e.id)) continue;
    if (answering) out.push(`adds ${e.id} to ${where} in the owner's answer commit: it records answers only`);
    else if (e.status !== 'proposed') out.push(`adds ${e.id} to ${where} as ${e.status}: ${why}`);
    else {
      // What draft and amend refuse, a commit by hand may not do either (decision 0244 audit 2).
      if (e.serves === undefined) out.push(`adds ${e.id} to ${where} with no Serves: a drafted line names its verb (npm run expectations -- draft, decisions 0244, 0245)`);
      const target = e.amends !== undefined ? targetProblem(a.entries, e.amends, e.id) : null;
      if (target) out.push(`adds ${e.id} to ${where}, amending ${e.amends}: ${target}`);
      // As newLines: a declined amendment is left out only beside a verb-only amendment of the same line (0245 audit 1).
      const exempt = a.entries.find((x) => x.id === e.amends)?.text === e.text ? e.amends : undefined;
      const same = a.entries.filter((x) => x.id !== e.id && norm(x.text) === norm(e.text) && !declinedOf(x, exempt));
      const own = same.length === 1 && same[0].id === e.amends && same[0].text === e.text ? same[0] : null;
      if (same.length && !(own && !verbOnlyProblem(own, e))) out.push(`adds ${e.id} to ${where} with the words of ${same.map((x) => x.id).join(', ')}: only a verb-only amendment (npm run expectations -- amend <id> --serves) repeats a line's words`);
    }
  }
  return out;
}

const VERDICTS = ['met', 'failed', 'lacking'];

/**
 * What is wrong with a run log's references to the store: each names a line in force, once, of the run's area; a
 * proposed line is provisional and a ratified one is not; met names the line's own check, found and not todo, or
 * while it is pending a picture: a shot of the feature's journeys, or a .png under the run's `shots` folder.
 */
function logRefProblems(lines, stores, index, { exists = fs.existsSync, shots, area } = {}) {
  const out = [];
  const all = stores.flatMap((s) => s.entries);
  const seen = new Set();
  for (const l of lines ?? []) {
    if (seen.has(l?.id)) out.push(`${l?.id} is logged twice: once a line`);
    seen.add(l?.id);
    if (area && featureOfId(l?.id) !== area) out.push(`${l?.id} is a line of ${featureOfId(l?.id) ?? 'no feature'}, not of the run's area, ${area}`);
    const e = all.find((x) => x.id === l?.id);
    if (!e) {
      out.push(`${l?.id} is no line of ${DIR}/`);
      continue;
    }
    if (!ACTIVE.includes(e.status)) out.push(`${e.id} is ${e.status}: log the line in force`);
    if (!VERDICTS.includes(l.is)) out.push(`${e.id}: is is ${VERDICTS.join(', ')}`);
    const provisional = e.status === 'proposed';
    if (Boolean(l.provisional) !== provisional) out.push(provisional ? `${e.id} is proposed: log it "provisional": true` : `${e.id} is ${e.status}: it is not provisional`);
    if (flagged(e.serves) !== (l.serves === NONE)) out.push(flagged(e.serves) ? `${e.id} is flagged as serving no verb: log it "serves": "none"` : `${e.id} serves ${e.serves ?? 'a verb not yet named'}: "serves": "none" is for a line flagged as serving none`);
    if (l.is !== 'met') continue;
    if (!l.evidence) {
      out.push(`${e.id} is met: name its evidence, its check or a picture`);
      continue;
    }
    const feature = featureOfId(e.id);
    if (parseCheck(e.check)?.kind !== 'pending') {
      const own = resolveCheck(e.check, index, feature);
      if (own !== 'ok') out.push(`${e.id}'s check is ${own} (${e.check}): a line whose check is ${own} is failed or lacking, never met`);
      else if (l.evidence !== e.check) out.push(`${e.id} is met by its own check, ${e.check}, not ${l.evidence}`);
      continue;
    }
    const pic = /^picture:(\S+)$/.exec(l.evidence)?.[1];
    if (!pic) {
      out.push(`${e.id}'s check is pending: met names a picture (picture:<shot of ${feature}'s journeys> or picture:<a .png under the run's shots>)`);
      continue;
    }
    if (!pic.includes('/')) {
      if (resolveCheck(`picture:${pic}`, index, feature) !== 'ok') out.push(`${e.id}: ${pic} is no shot of ${feature}'s own journeys (scripts/features.js)`);
      continue;
    }
    const under = shots && path.resolve(pic).startsWith(path.resolve(shots) + path.sep);
    if (!pic.endsWith('.png') || !under || !exists(pic)) out.push(`${e.id}: ${pic} is no .png under the run's shots${shots ? ` (${shots})` : ' (the log names none: "shots")'}`);
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
  const features = Object.fromEntries(require(path.resolve(root, 'scripts', 'features.js')).FEATURES.map((f) => [f.name, f.journeys ?? []]));
  const journeys = Object.fromEntries(walk(path.join(root, 'scripts/e2e/journeys'), (n) => n.endsWith('.js')).map((f) => [path.basename(f, '.js'), fs.readFileSync(f, 'utf8')]));
  const tests = Object.fromEntries(walk(path.join(root, 'src/lib/__tests__'), (n) => /\.test\.tsx?$/.test(n)).map((f) => [f, fs.readFileSync(f, 'utf8')]));
  return indexOf({ journeys, tests, features });
}

function featureNames(root) {
  return require(path.resolve(root, 'scripts', 'features.js')).FEATURES.map((f) => f.name);
}

/** For check:docs: every store reads, names a feature, and every line's check exists. */
function check(root = ROOT) {
  return checkProblems(readStores(root), readIndex(root), featureNames(root));
}

// The flags each operation takes (decision 0244 audit 3): any other is refused, so none is dropped without a word.
const TAKES = { list: [], draft: ['file', 'serves'], amend: ['file', 'serves'], ratify: ['by', 'date', 'answer'], decline: ['by', 'date', 'answer'], 'set-check': ['check'], check: [], due: [] };

/** An operation's flags and words; a flag it does not take, or one with no word after it, is refused. */
function readFlags(op, rest) {
  const flags = {};
  const args = [];
  const problems = [];
  for (let i = 0; i < rest.length; i++) {
    if (!rest[i].startsWith('--')) {
      args.push(rest[i]);
      continue;
    }
    const name = rest[i].slice(2);
    const value = rest[i + 1];
    if (TAKES[op] && !TAKES[op].includes(name)) problems.push(`${op} takes no --${name}${TAKES[op].length ? ` (it takes ${TAKES[op].map((f) => `--${f}`).join(', ')})` : ''}`);
    if (Object.prototype.hasOwnProperty.call(flags, name)) problems.push(`--${name} is given twice: give it once`);
    if (value === undefined || value.startsWith('--')) problems.push(`--${name} takes a word after it`);
    else i++;
    flags[name] = value;
  }
  return { flags, args, problems };
}

function main(argv) {
  const [op, ...rest] = argv;
  const fail = (problems) => {
    for (const p of problems) console.error(`expectations ${op}: ${p}`);
    return 1;
  };
  const given = readFlags(op, rest);
  if (given.problems.length) return fail(given.problems);
  const { flags, args } = given;
  const features = featureNames(ROOT);
  const stores = readStores(ROOT);
  const storeOf = (feature) => stores.find((s) => s.feature === feature) ?? { feature, head: '', entries: [], problems: [] };
  const write = (store) => {
    fs.mkdirSync(path.join(ROOT, DIR), { recursive: true });
    fs.writeFileSync(path.join(ROOT, fileOf(store.feature)), formatStore(store));
  };
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
    const served = withServes(read.lines, flags.serves);
    if (served.problems.length) return fail(served.problems);
    const r = draft(storeOf(feature), served.lines, readIndex(ROOT));
    if (r.problems.length) return fail(r.problems);
    write(r.store);
    console.log(`draft ${feature}: ${r.ids.join(', ')} proposed in ${fileOf(feature)}`);
    return 0;
  }
  if (op === 'amend') {
    const feature = featureOfId(args[0]);
    if (!feature) return fail([`${args[0] || '(none)'} is no id: E-<feature>-<n>`]);
    const target = storeOf(feature).entries.find((e) => e.id === args[0]);
    if (!target) return fail([`${args[0]} is no line of ${fileOf(feature)}`]);
    // With no --file, a verb-only amendment (decision 0245): the line's own words, check and grounds, and --serves.
    const own = target && flags.file === undefined && flags.serves !== undefined;
    const read = own ? { lines: [{ text: target.text, check: target.check, grounds: target.grounds }], problems: [] } : parseDraft(body());
    if (read.lines.length !== 1) read.problems.push('an amendment is one line');
    if (read.problems.length) return fail(read.problems);
    const served = withServes(read.lines, flags.serves);
    if (served.problems.length) return fail(served.problems);
    const r = amend(storeOf(feature), args[0], served.lines[0], readIndex(ROOT));
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
    const r = setCheck(storeOf(feature), args[0], flags.check, readIndex(ROOT));
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
    const states = shown.flatMap((s) => s.entries.filter((e) => ACTIVE.includes(e.status)).map((e) => resolveCheck(e.check, index, s.feature)));
    const n = (...k) => states.filter((x) => k.includes(x)).length;
    console.log(`expectations check: ${states.length} lines, ${n('ok')} checks found, ${n('pending', 'todo')} pending, ${n('missing')} missing`);
    return 0;
  }
  if (op === 'due') {
    const d = due(stores, args.length ? args : features);
    for (const f of d.draft) console.log(f);
    if (d.awaiting.length) console.log(`awaiting the owner: ${d.awaiting.join(', ')}`);
    return 0;
  }
  console.error(fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).slice(0, 23).map((l) => l.slice(3)).join('\n'));
  return op === 'help' ? 0 : 2;
}

module.exports = { VERBS, servesProblems, servesText, withServes, ANSWER_COMMIT, writeProblems, ID, DIR, LENS_LINE, parseStore, formatStore, parseDraft, draft, amend, answer, setCheck, parseCheck, indexOf, resolveCheck, checkProblems, due, listText, editProblems, logRefProblems, readStores, readIndex, check };

if (require.main === module) process.exitCode = main(process.argv.slice(2));
