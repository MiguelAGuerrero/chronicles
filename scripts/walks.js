#!/usr/bin/env node
// The owner's walk notes (decisions 0238, 0270; specs/walk-notes): what the owner reached for, what got in the way and
// what to keep, said after a walk with `/walked` and kept beside the run log with places stripped. The repository is
// public, so a note holds the app's area names and the day only: never a street, a town, a region or a country of the
// gazetteer, a postcode, coordinates, a link or a time of day.
//
//   node scripts/walks.js add --file <lines>          append notes, one JSON object a line, all or none; a refusal
//                                                     names each line and the words that tripped it
//   node scripts/walks.js list [--days N] [--area A] [--kind K] [--json]
//                                                     the window's notes (14 days, today included)
//   node scripts/walks.js lens <area>                 the area's "reached for" notes no expectation line cites yet,
//                                                     with the grounds to write and where each goes (lens 0)
//   node scripts/walks.js keeps <area>                the area's keeps, each with the later notes of that area
//   node scripts/walks.js check --file <text>         the place check on any text a run files that cites a note
//   node scripts/walks.js areas                       the names a note may take: the features, and `app`
//
// A line of .claude/skills/tend/walks.jsonl, keys in this order and no other:
//   {"day":"YYYY-MM-DD","area":"<a feature of scripts/features.js, or app>","kind":"reached for"|"got in the way"|"keep","words":"…"}
//
// The place check reads names as written (the spec's J1): a town, region or country trips when capitalised, since the
// gazetteer's towns include "of", "to", "time" and "page"; a lowercase name, a park, a station or a landmark is the
// skill's to strip and the owner's to see. The file is append-only: `node scripts/tend.js commits` holds every agent
// commit that touches it (`commitProblems`), the removal of one leaked line at the owner's word the one exception (0270).
// The decisions are pure and exported for arch/walks.test.ts; the files are read in main(). TEND_ROOT reads another
// checkout (its features, its pack and its notes).

const fs = require('fs');
const path = require('path');

const ROOT = process.env.TEND_ROOT ? path.resolve(process.env.TEND_ROOT) : path.join(__dirname, '..');
const WALKS_REL = '.claude/skills/tend/walks.jsonl';
const PACK_REL = 'assets/gazetteer/places.json';
const KINDS = ['reached for', 'got in the way', 'keep'];
const KEYS = ['day', 'area', 'kind', 'words'];
const MAX_WORDS = 280;
const WINDOW = 14;
// The day /walked landed on main: with no note at all, the silence is counted from it (WN8b).
const LANDED = '2026-11-26';
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// The fold of src/lib/gazetteer/normalize.ts (GZ3): case, diacritics and punctuation do not matter, and Saint is St.
const OWN = { 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ł': 'l', 'ı': 'i' };
const SAINT = { saint: 'st', sainte: 'ste' };
function fold(text) {
  const flat = String(text)
    .toLowerCase()
    .replace(/[ßæœøđðþłı]/g, (c) => OWN[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`´]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return flat
    .split(' ')
    .map((w) => SAINT[w] ?? w)
    .join(' ');
}

// English words that start a sentence and are also somewhere's name ("We", "Most", "Can"): never a name on their own.
const FUNCTION_WORDS = new Set(
  'the this that these those it its we my our your their his her he she they i a an and but or so then there here when where after before during while once every each some any all no not yes what why how which who on in at to of for from by with without into onto over under near far up down out off again also just only still even very too more most much many few first last next new old one two three four five six seven eight nine ten am is are was were be been do did done has have had can could will would should may might must let make made'.split(' '),
);
const DETERMINERS = new Set(['the', 'a', 'an', 'this', 'that', 'my', 'our', 'your', 'its', 'their', 'every', 'each', 'any', 'no']);
// Before a street word, a word the app's own controls lead with is no name ("Start Walk", "End Walk").
const NOT_A_NAME = new Set([...DETERMINERS, 'start', 'end', 'stop', 'pause', 'resume', 'new', 'last', 'next', 'first', 'open', 'close', 'whole', 'same', 'one']);
// The pack's other names (`alts`) that are words of the app's own pages: each appears in lowercase in docs/VISION.md or
// docs/PRODUCT.md (measured 2026-11-26), so a sentence would trip on it, and none is the pack's main name of a place
// (walk-notes audit 14). Every other alt is indexed.
const ALT_COMMON = new Set(
  'add ago all and are area art base big bottom bus but can carry cars cite cloud cone cut day dim ever far fog for from get greens has hop hot ios jot key let log loop lot market may memo mid more name never not off old one out per pin plain plan poi put raw reach rest row see set since sit six spoken src steps story switch tap taps tells the tie ties tone top tot town turn uses via waits walk was ways yet'.split(' '),
);

/** The gazetteer's towns, regions and countries, folded: one-word names apart from those of several words. */
function nameIndex(pack) {
  const one = new Set();
  const many = new Set();
  let longest = 1;
  const alts = (pack.alts ?? []).flat();
  for (const list of [pack.names, pack.ascii, pack.regions, pack.countries, alts]) {
    for (const n of list ?? []) {
      const f = fold(n);
      if (!f) continue;
      if (list === alts && ALT_COMMON.has(f)) continue;
      const k = f.split(' ').length;
      if (k === 1) {
        if (f.length >= 3 && !FUNCTION_WORDS.has(f)) one.add(f);
      } else {
        many.add(f);
        longest = Math.max(longest, k);
      }
    }
  }
  return { one, many, longest: Math.min(longest, 8) };
}

const SUFFIX = new Set('street st road rd avenue ave av lane ln boulevard blvd drive dr way square sq court ct terrace crescent close alley highway hwy parkway pkwy circle quay wharf mews place pl row embankment walk gardens hill market bridge grove strasse straße str gasse weg platz allee ufer steig laan plein gracht straat vej gata gatan utca chaussee steenweg damm'.split(' '));
// A street word before its name, in any case ("rue de Quillmarsh", "via Quillmarsh"), the name capitalised.
const PREFIX = new Set('rue calle via avenida avda av piazza plaza praça strada rua carrer avinguda corso paseo rambla boulevard avenue place quai ulica ul'.split(' '));
const LINKERS = new Set('de del di du des la le da do dos das della dei degli'.split(' '));
const COMPOUND = /^\p{Lu}\p{L}{2,}(strasse|straße|gasse|weg|platz|allee|ufer|gracht|straat|laan|plein|gatan|gata|katu|utca|vej|brücke|brucke|damm|steenweg|chaussee)$/u;
// -ring only after a consonant, so "Exploring" and "Offering" are words, "Quillmarshring" a street.
const RING = /^\p{Lu}\p{L}{2,}[^aeiouy]ring$/u;
const HOUSE = /^\d+[a-z]?$/i;
// "a 15 minute walk" is a length, not a house on a street.
const MEASURE = /^(?:seconds?|minutes?|mins?|hours?|hrs?|miles?|km|metres?|meters?|steps?|days?|blocks?)$/i;
const ORDINAL = /^\d+(st|nd|rd|th)$/i;
const capital = (t) => /^\p{Lu}/u.test(t);

// A number of the app's units is no time ("2.50 km", "after 5 minutes").
const UNIT = String.raw`(?:km|mi|m|miles?|metres?|meters?|minutes?|mins?|hours?|hrs?|steps?|kg|%|x|times?|percent)\b`;
const HOURS = 'two|three|four|five|six|seven|eight|nine|ten|eleven|twelve';

const PATTERNS = [
  ['a postcode', /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi],
  ['a postcode', /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/g],
  ['a postcode', /\b\d{4}\s?[A-Z]{2}\b/g],
  ['a postcode', /\b\d{5}-\d{4}\b/g],
  ['a postcode', /(?<![\d.,])\d{5}(?![\d.,])/g],
  ['a postcode', /(?<![\d-])\d{2}-\d{3}(?![\d-])/g],
  ['a postcode', /(?<![\d-])\d{4}-\d{3}(?![\d-])/g],
  ['a postcode', /(?<![\d-])\d{3}-\d{4}(?![\d-])/g],
  ['a postcode', /(?<![\d.,])\d{3}\s\d{2}(?![\d.,])/g],
  ['a postcode', /\b[AC-FHKNPRTV-Y]\d{2}\s?[0-9AC-FHKNPRTV-Y]{4}\b/g],
  ['coordinates', /-?\d{1,3}\.\d{3,}/g],
  ['coordinates', /-?\d{1,3}\.\d{2}\s*,\s*-?\d{1,3}\.\d{2}/g],
  ['coordinates', /-?\d{1,3},\d{4,}/g],
  ['coordinates', /-?\d{1,3}\.\d{2,}\s+-?\d{1,3}\.\d{2,}/g],
  ['coordinates', /\b\d{1,3}\s*(?:degrees?|deg)\b/gi],
  ['coordinates', /\d\s*[°º]/g],
  ['coordinates', /[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/gi],
  ['coordinates', /\/\/\/\p{L}+\.\p{L}+\.\p{L}+/gu],
  ['coordinates', /\b(?:lat|lng|lon|long|latitude|longitude)\b\s*[:=]?\s*-?\d/gi],
  ['coordinates', /\bgeo:/gi],
  ['a time of day', /\b\d{1,2}[:h]\d{2}\b/g],
  ['a time of day', /\b\d{1,2}\s?h\s?\d{2}\b/g],
  ['a time of day', /\b\d{1,2}h\b/g],
  ['a time of day', new RegExp(String.raw`\b\d{1,2}\.[0-5]\d(?![\d.,])(?!\s*${UNIT})`, 'gi')],
  ['a time of day', /\bT\d{2}:?\d{2}\b/g],
  ['a time of day', new RegExp(String.raw`\b(?:at|around|by|about|from|until|till|before|after|past)\s+\d{1,4}(?![\d.,:]|\s*${UNIT})`, 'gi')],
  ['a time of day', /\b\d{1,2}\s*ish\b/gi],
  ['a time of day', new RegExp(String.raw`\b(?:at|around|by|about|until|till|before|after)\s+(?:${HOURS}|noon|midnight)\b`, 'gi')],
  ['a time of day', /\bhalf\s+past\s+\p{L}+/giu],
  ['a time of day', /\bquarter\s+(?:to|past)\s+\p{L}+/giu],
  ['a time of day', new RegExp(String.raw`\b(?:one|${HOURS})\s+(?:thirty|fifteen|forty[- ]five|o['’]?clock)\b`, 'gi')],
  ['a time of day', /\b\d{1,2}(?:[:.]\d{2})?\s*(?:a|p)\.?\s?m\.?(?!\p{L})/giu],
  ['a time of day', /o['’]clock/gi],
  ['a time of day', /\b\d{4}\s*(?:hours|hrs)\b/gi],
  ['a time of day', /\b(?:mornings?|afternoons?|evenings?|nights?|tonight|midnight|noon|midday|dawn|dusk|sunrise|sunset|twilight|daybreak|nightfall|lunchtime|dinnertime)\b/gi],
  ['a time of day', /\b(?:after dark|rush hour|golden hour|at lunch|after work|on my commute|commut(?:e|ing))\b/gi],
  ['a time of day', /\b(?:before|after|over|at)\s+(?:breakfast|lunch|dinner|supper|school|work|tea)\b/gi],
  ['a time of day', /\btea\s?time\b|\bschool run\b|\b(?:way|walk|ride)\s+home\b|\bhome from work\b/gi],
  ['a link', /\bhttps?:\/\/\S*|\bwww\.\S*/gi],
];

/**
 * What in the words names a place or a time: each `{ class, words }`, `words` the span that tripped it. Pure: the
 * names are `nameIndex`'s.
 */
function placeProblems(words, names) {
  // NFKC first (full-width digits, ligatures), and no zero-width character can split a name (walk-notes audit 16).
  const text = String(words ?? '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '');
  const out = [];
  for (const [cls, re] of PATTERNS) for (const m of text.matchAll(re)) out.push({ class: cls, words: m[0].trim() });
  // A possessive is its name ("Quillmarsh's", walk-notes audit 15).
  const tokens = [...text.matchAll(/[\p{L}\p{M}\p{N}'’]+/gu)].map((m) => m[0].replace(/['’]s$/i, '').replace(/['’]$/, ''));
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];
    // A town, a region or a country, as written (J1).
    if (names) {
      if (capital(t) && names.one.has(fold(t))) out.push({ class: 'a town', words: t });
      for (let n = 2; n <= names.longest && i + n <= tokens.length; n++) {
        const span = tokens.slice(i, i + n);
        if (span.some(capital) && names.many.has(fold(span.join(' ')))) out.push({ class: 'a town', words: span.join(' ') });
      }
    }
    // A street: a name before its street word, a street word before its name, a street word inside a name.
    if (next && (ORDINAL.test(t) || (capital(t) && !NOT_A_NAME.has(t.toLowerCase()))) && SUFFIX.has(next.toLowerCase())) {
      out.push({ class: 'a street', words: `${t} ${next}` });
    }
    // A house number, then a street of any case ("12 quillmarsh street", walk-notes audit 21).
    if (HOUSE.test(t) && tokens[i + 2] && !MEASURE.test(next) && SUFFIX.has(tokens[i + 2].toLowerCase())) out.push({ class: 'a street', words: tokens.slice(i, i + 3).join(' ') });
    if (PREFIX.has(t.toLowerCase())) {
      let j = i + 1;
      while (j < tokens.length && LINKERS.has(tokens[j].toLowerCase())) j++;
      if (j < tokens.length && capital(tokens[j])) out.push({ class: 'a street', words: tokens.slice(i, j + 1).join(' ') });
    }
    if (COMPOUND.test(t) || RING.test(t)) out.push({ class: 'a street', words: t });
  }
  const seen = new Set();
  return out.filter((p) => {
    const k = `${p.class}\u0000${p.words}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
const isDay = (d) => typeof d === 'string' && ISO.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

/**
 * What is wrong with a note: its keys, area, kind, day and words. With `values` (the owner's `add`, run locally) each
 * problem names what tripped it; without (the gate, whose log CI publishes), only its class (walk-notes audits 3, 25).
 */
function noteProblems(note, { areas, today, names }, { values = true } = {}) {
  if (!note || typeof note !== 'object' || Array.isArray(note)) return ['a note is a JSON object: {"day","area","kind","words"}'];
  const v = (x) => (values ? ` (it has ${JSON.stringify(x)})` : '');
  const p = [];
  const keys = Object.keys(note);
  if (keys.join() !== KEYS.join()) p.push(`its keys are day, area, kind, words, in that order and no other${values ? ` (it has ${keys.join(', ') || 'none'})` : ''}`);
  if (!isDay(note.day)) p.push(`its day is a calendar day, YYYY-MM-DD${v(note.day)}`);
  else if (today && note.day > addDays(today, 1)) p.push(`its day is after tomorrow${v(note.day)}`);
  if (note.area !== 'app' && !(areas ?? []).includes(note.area)) p.push(`its area is no feature of scripts/features.js, nor app${v(note.area)}`);
  if (!KINDS.includes(note.kind)) p.push(`its kind is none of the three: reached for, got in the way, keep${v(note.kind)}`);
  const w = note.words;
  if (typeof w !== 'string' || !w.trim()) p.push('its words are empty');
  else if (/[\r\n]/.test(w)) p.push('its words are on more than one line');
  else if (w.length > MAX_WORDS) p.push(`its words are past ${MAX_WORDS} characters`);
  if (typeof w === 'string') {
    const trips = placeProblems(w, names);
    if (values) for (const t of trips) p.push(`its words hold ${t.class} ("${t.words}"): say it without it, in the app's terms ("[a busy street]"), or rephrase`);
    else for (const c of new Set(trips.map((t) => t.class))) p.push(`${c}: a walk note holds none (decision 0238)`);
  }
  return p;
}

/** The notes of walks.jsonl's text, a line that does not parse left out. */
function parseNotes(text) {
  return String(text ?? '')
    .split('\n')
    .filter((l) => l.trim())
    .flatMap((l) => {
      try {
        const n = JSON.parse(l);
        return n && typeof n === 'object' && !Array.isArray(n) ? [n] : [];
      } catch {
        return [];
      }
    });
}

const lines = (text) => String(text ?? '').split('\n').filter((l, k, all) => l !== '' || k < all.length - 1);

const NOTE_SUBJECT = /^walked: a note of (\d{4}-\d{2}-\d{2})$/;
const REMOVAL_SUBJECT = /^walked: line (\d+) removed at the owner's word$/;
const OWNER_WORDS = /^The owner: "[^"\n]+"\s*$/m;

/**
 * WN4c (decisions 0238, 0270): what is wrong with a commit that touches walks.jsonl or is subject `walked: …`. A note:
 * the file alone, its subject `walked: a note of <day>`, both dates `<day> 00:00:00 +0000`, only lines appended, each one
 * the check takes and of that day. A removal (0270, S2): the file alone, its subject `walked: line <n> removed at the
 * owner's word`, that one line removed and none added, a "reached for" (never a keep or a got-in-the-way, which steer the
 * loop), the owner's words quoted (`The owner: "…"`, which no script can tell from an agent's). The problems name a
 * line by its number and its class, never its words: CI's log is public (walk-notes audits 3, 25).
 */
function commitProblems({ subject, message, files, before, after, authorDate, committerDate, names, areas }) {
  const p = [];
  const all = files ?? [];
  const mine = all.filter((f) => f.path === WALKS_REL || f.from === WALKS_REL);
  if (!mine.length) return /^walked: /.test(String(subject).trim()) ? [`a walked: commit holds ${WALKS_REL} alone, and this one does not touch it`] : p;
  if (mine.some((f) => f.status === 'D' || f.status === 'R' || (f.from === WALKS_REL && f.path !== WALKS_REL))) p.push(`deletes or renames ${WALKS_REL}: it is append-only (decision 0238)`);
  if (all.some((f) => f.path !== WALKS_REL)) p.push(`touches ${WALKS_REL} and other files: a walk note's commit holds it alone (decision 0270)`);
  if (p.length) return p;
  const was = String(before ?? '');
  const now = String(after ?? '');
  if (was && !was.endsWith('\n')) p.push(`${WALKS_REL} did not end in a newline before this commit`);
  if (now.startsWith(was)) {
    const day = NOTE_SUBJECT.exec(String(subject).trim())?.[1];
    if (!day) p.push(`its subject is "walked: a note of <day>", naming no words (it is not)`);
    for (const [label, date] of [['author', authorDate], ['committer', committerDate]]) {
      if (day && String(date).trim() !== `${day} 00:00:00 +0000`) p.push(`its ${label} date is ${day} 00:00:00 +0000: a note's commit carries no time of day (decision 0270)`);
    }
    if (now && !now.endsWith('\n')) p.push(`${WALKS_REL} does not end in a newline`);
    if (now === was) p.push(`changes nothing in ${WALKS_REL}`);
    const start = lines(was).length;
    lines(now.slice(was.length)).forEach((l, k) => {
      const at = `line ${start + k + 1}`;
      let n;
      try {
        n = JSON.parse(l);
      } catch {
        p.push(`${at}: not a JSON note`);
        return;
      }
      if (day && n?.day !== day) p.push(`${at}: its day is not the subject's day`);
      for (const i of noteProblems(n, { areas, today: day ?? null, names }, { values: false })) p.push(`${at}: ${i}`);
    });
    return p;
  }
  // Not an append: only the removal of one line, at the owner's word (decision 0270, S2).
  const a = lines(was);
  const b = lines(now);
  const k = a.findIndex((l, i) => l !== b[i]);
  const oneRemoved = a.length === b.length + 1 && k >= 0 && [...a.slice(0, k), ...a.slice(k + 1)].join('\n') === b.join('\n');
  if (!oneRemoved) {
    p.push(`changes or removes lines ${WALKS_REL} held: it is append-only, but for one leaked line removed at the owner's word (decision 0270)`);
    if (a.length > b.length + 1) p.push('a removal takes one line, no more');
    return p;
  }
  const named = REMOVAL_SUBJECT.exec(String(subject).trim());
  if (!named || !OWNER_WORDS.test(String(message))) {
    p.push(`removes line ${k + 1} of ${WALKS_REL}: only at the owner's word, its subject "walked: line ${k + 1} removed at the owner's word" and its message quoting the owner's words (\`The owner: "…"\`; decision 0270)`);
  } else if (Number(named[1]) !== k + 1) p.push(`its subject names line ${named[1]}, but it removes line ${k + 1}`);
  let gone;
  try {
    gone = JSON.parse(a[k]);
  } catch {
    gone = null;
  }
  if (gone && (gone.kind === 'keep' || gone.kind === 'got in the way')) p.push(`removes line ${k + 1}, a ${gone.kind === 'keep' ? 'keep' : 'got-in-the-way'}: a note that steers the loop is never removed by an agent; the owner's own hand edit may (decision 0270)`);
  return p;
}

/**
 * WN6: the "got in the way" notes of areas the loop sweeps that no sweep of their area follows (a sweep follows when its
 * run-log date is after the note's day), oldest first, then by area. A resting area too (decision 0270).
 */
function openInTheWay(walks, runs, areas) {
  const sweeps = (runs ?? []).filter((r) => r?.mode === 'sweep' && typeof r.area === 'string');
  return (walks ?? [])
    .filter((n) => n?.kind === 'got in the way' && (areas ?? []).includes(n.area) && isDay(n.day))
    .filter((n) => !sweeps.some((r) => r.area === n.area && (String(r.date) > n.day || r.walk === n.day)))
    .map((n) => ({ area: n.area, day: n.day }))
    .sort((x, y) => x.day.localeCompare(y.day) || x.area.localeCompare(y.area));
}

/**
 * Audit 12, walk-notes audit 24: the indexes of the run log's sweeps a walk note picked: those whose line says `walk:
 * <the note's day>`, written by the run that `next` sent on its walk turn. A sweep the note did not pick keeps its turn.
 */
function walkSentSweeps(walks, runs) {
  const sent = new Set();
  (runs ?? []).forEach((r, k) => {
    if (r?.mode === 'sweep' && isDay(r.walk)) sent.add(k);
  });
  return sent;
}

/**
 * WN5 (decisions 0236, 0270): the area's "reached for" notes no line of its store cites yet (a line cites one by
 * `seen on a walk <day>` in its Grounds, one line a note), with the grounds to write and where each goes: `draft` while
 * lines in force are under five, `first draft` when there are none (first among 0236's three to five), `waits` at five.
 */
function lensNotes(walks, area, store) {
  const parsed = require('./expectations').parseStore(String(store ?? ''), area);
  const inForce = parsed.entries.filter((e) => e.status === 'ratified' || (e.status === 'proposed' && e.amends === undefined)).length;
  const cited = new Map();
  for (const e of parsed.entries) for (const m of String(e.grounds ?? '').matchAll(/seen on a walk (\d{4}-\d{2}-\d{2})/g)) cited.set(m[1], (cited.get(m[1]) ?? 0) + 1);
  const out = [];
  let room = 5 - inForce;
  for (const n of (walks ?? []).filter((x) => x?.kind === 'reached for' && x.area === area)) {
    const left = cited.get(n.day) ?? 0;
    if (left > 0) {
      cited.set(n.day, left - 1);
      continue;
    }
    const where = inForce === 0 ? 'first draft' : room > 0 ? 'draft' : 'waits';
    if (where === 'draft') room -= 1;
    out.push({ day: n.day, words: n.words, grounds: `VISION "Who it is for"; seen on a walk ${n.day}`, where });
  }
  return out;
}

/** WN7 (decision 0270, S3): the area's keeps, each with the later notes of that area, for the lens to read. */
function keepsOf(walks, area) {
  const all = walks ?? [];
  return all.flatMap((n, k) => (n?.kind === 'keep' && n.area === area ? [{ note: n, later: all.slice(k + 1).filter((x) => x?.area === area) }] : []));
}

/** The window's notes: their day after `today` less `days`, today included. */
const windowOf = (walks, today, days = WINDOW) => (walks ?? []).filter((n) => isDay(n?.day) && n.day > addDays(today, -days) && n.day <= addDays(today, 1));

/**
 * WN8 (decision 0238; walk-notes audits 6, 7): the balance's walk line. `notes`, each in the window as `<day> <area>
 * <kind>`, never its words and never a count; `last`, the latest note's day; `gap`, the day the silence runs from (the
 * latest note's, else LANDED); `silence`, said when 14 days have passed since `gap` and `said` (the ledger's
 * `walkSilence`) is not that day, so it is said once a gap.
 */
function walkReading(walks, today, { said = null, days = WINDOW } = {}) {
  const dated = (walks ?? []).filter((n) => isDay(n?.day));
  const last = dated.reduce((m, n) => (m && m > n.day ? m : n.day), null);
  const gap = last ?? LANDED;
  const silent = daysBetween(gap, today) >= days && said !== gap;
  return {
    notes: windowOf(dated, today, days).map((n) => `${n.day} ${n.area} ${n.kind}`),
    last,
    gap,
    silence: silent ? `no walk note has come in since ${gap}${last ? '' : ', the day /walked landed'}` : null,
  };
}

/** The features of a checkout (its scripts/features.js), the names a note may take besides `app`. */
function featuresAt(root = ROOT) {
  const file = path.join(root, 'scripts', 'features.js');
  return require(file).FEATURES ?? [];
}

let packNames;
/** The shipped pack's names, folded once (5.6 MB). */
function namesAt(root = ROOT) {
  return (packNames ??= nameIndex(JSON.parse(fs.readFileSync(path.join(root, PACK_REL), 'utf8'))));
}

function arg(argv, flag) {
  const k = argv.indexOf(flag);
  return k >= 0 ? argv[k + 1] : undefined;
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const today = new Date().toISOString().slice(0, 10);
  const file = path.join(ROOT, WALKS_REL);
  const notes = () => (fs.existsSync(file) ? parseNotes(fs.readFileSync(file, 'utf8')) : []);
  if (cmd === 'add') {
    const from = arg(rest, '--file');
    if (!from) return usage();
    const areas = featuresAt().map((f) => f.name);
    const names = namesAt();
    const input = fs.readFileSync(from, 'utf8').split('\n').map((l, k) => [l, k + 1]).filter(([l]) => l.trim());
    const problems = [];
    const parsed = [];
    for (const [l, at] of input) {
      let n;
      try {
        n = JSON.parse(l);
      } catch {
        problems.push(`line ${at}: not a JSON note`);
        continue;
      }
      for (const p of noteProblems(n, { areas, today, names })) problems.push(`line ${at}: ${p}`);
      parsed.push(n);
    }
    if (!input.length) problems.push('no note in the file');
    const held = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (held && !held.endsWith('\n')) problems.push(`${WALKS_REL} does not end in a newline: it is append-only, so nothing is added (look at it first)`);
    if (problems.length) {
      for (const p of problems) console.error(`walks add: ${p}`);
      console.error('walks add: nothing written');
      return 1;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, parsed.map((n) => JSON.stringify(n)).join('\n') + '\n');
    console.log(`walks add: ${parsed.length === 1 ? 'one note' : `${parsed.length} notes`} appended to ${WALKS_REL}`);
    return 0;
  }
  if (cmd === 'list') {
    const days = Number(arg(rest, '--days') ?? WINDOW);
    const area = arg(rest, '--area');
    const kind = arg(rest, '--kind');
    const out = windowOf(notes(), today, days).filter((n) => (!area || n.area === area) && (!kind || n.kind === kind));
    if (rest.includes('--json')) console.log(JSON.stringify(out, null, 2));
    else for (const n of out) console.log(`${n.day} ${n.area} ${n.kind}: ${n.words}`);
    return 0;
  }
  if (cmd === 'lens' || cmd === 'keeps') {
    const area = rest[0];
    if (!area) return usage();
    if (cmd === 'keeps') {
      for (const k of keepsOf(notes(), area)) {
        console.log(`${k.note.day} keep: ${k.note.words}`);
        for (const l of k.later) console.log(`  later, ${l.day} ${l.kind}: ${l.words}`);
      }
      return 0;
    }
    const store = path.join(ROOT, 'docs', 'expectations', `${area}.md`);
    for (const n of lensNotes(notes(), area, fs.existsSync(store) ? fs.readFileSync(store, 'utf8') : '')) {
      console.log(`${n.day} ${n.where}: Grounds: ${n.grounds}\n  ${n.words}`);
    }
    return 0;
  }
  if (cmd === 'check') {
    const from = arg(rest, '--file');
    if (!from) return usage();
    const names = namesAt();
    let bad = 0;
    fs.readFileSync(from, 'utf8').split('\n').forEach((l, k) => {
      for (const t of placeProblems(l, names)) {
        bad += 1;
        console.error(`walks check: line ${k + 1} holds ${t.class} ("${t.words}"): cite a note by its day, area and kind, never its words, and say it without it, or rephrase`);
      }
    });
    if (!bad) console.log('walks check: no place or time found');
    return bad ? 1 : 0;
  }
  if (cmd === 'areas') {
    for (const f of featuresAt()) console.log(`${f.name}  ${f.about ?? ''}`.trimEnd());
    console.log('app  none of the above fits');
    return 0;
  }
  return usage();
}

function usage() {
  console.error('usage: node scripts/walks.js add --file <lines> | list [--days N] [--area A] [--kind K] [--json] | lens <area> | keeps <area> | check --file <text> | areas');
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { ALT_COMMON, NOTE_SUBJECT, KINDS, KEYS, WALKS_REL, LANDED, WINDOW, fold, nameIndex, placeProblems, noteProblems, parseNotes, commitProblems, openInTheWay, walkSentSweeps, lensNotes, keepsOf, windowOf, walkReading, featuresAt, namesAt };
