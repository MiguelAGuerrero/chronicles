// @layer core

/**
 * Moment references (specs/moment-references, decision 0125): a note mentions another moment by a token in its own
 * body, `@[<moment id>]`. The token is the only thing stored: no table, no link, no membership, and the referenced
 * moment's row is never touched. Every reader draws or says it through here, so a raw token is never shown.
 */

// `@[<id>|<words>]`: the moment's id, and the words it read as when written, so plain text needs no lookup (RF6).
const TOKEN = /@\[([A-Za-z0-9_-]+)(?:\|([^\]|\n]*))?\]/g;

// `@{<kind>|<word>|<value>|<payload>}`: a reference keyword (specs/reference-keywords, RK3): the word the owner picked,
// the value it resolved to at the moment, and its coordinates or time. Like a markdown link: a shown word, an actual value.
const KEY_SOURCE = String.raw`@\{(here|near|there|time)\|([^}|\n]*)\|([^}|\n]*)(?:\|([^}\n]*))?\}`;
const KEY = new RegExp(KEY_SOURCE, 'g');
const ANY = new RegExp(`${TOKEN.source}|${KEY_SOURCE}`, 'g');

/** The reserved keywords: where (here, next to me, over there) and when (a time word). Never the weather (RK12). */
export type KeywordKind = 'here' | 'near' | 'there' | 'time';

/** A keyword reference as stored: its word, its resolved value, and the coordinates (`lng,lat`) or time behind it. */
export interface KeywordRef {
  key: KeywordKind;
  word: string;
  value: string;
  payload: string;
}

/** What a note's body holds: runs of its own words, and references in between (with the words they were written with). */
export type RefPart = { text: string } | { ref: string; label: string | null } | KeywordRef;

/** The words a token carries: never a bracket, a bar or a line break, which would end it. */
const cleanLabel = (s: string) => s.replace(/[\]}|\n]/g, ' ').trim();

export const refToken = (id: string, label?: string | null): string => (label ? `@[${id}|${cleanLabel(label)}]` : `@[${id}]`);

/** A keyword reference's token (RK3): never a brace, bar or line break inside a field. */
export const keywordToken = (r: KeywordRef): string =>
  `@{${r.key}|${cleanLabel(r.word)}|${cleanLabel(r.value)}${r.payload ? `|${cleanLabel(r.payload)}` : ''}}`;

/**
 * A keyword reference as plain words (RK9): its word and, by default, its value in parentheses ("here (the science
 * center)"); the word alone when the values are off. Nothing is added to what is stored (steward S6).
 */
export const keywordPlain = (r: Pick<KeywordRef, 'word' | 'value'>, showValues = true): string =>
  showValues && r.value && r.value !== r.word ? `${r.word} (${r.value})` : r.word;

/** What a reference to a moment that is gone, or waiting in Undo, reads (RF5, RF6). */
export const GONE = 'a moment no longer kept';

/** A note's body in order: its words and its references (RF4). An empty run is never returned. */
export function parseRefs(body: string): RefPart[] {
  const out: RefPart[] = [];
  let at = 0;
  for (const m of body.matchAll(ANY)) {
    if (m.index > at) out.push({ text: body.slice(at, m.index) });
    if (m[1] != null) out.push({ ref: m[1], label: m[2]?.trim() || null });
    else out.push({ key: m[3] as KeywordKind, word: m[4].trim(), value: m[5].trim(), payload: m[6]?.trim() ?? '' });
    at = m.index + m[0].length;
  }
  if (at < body.length) out.push({ text: body.slice(at) });
  return out;
}

/** The moments a note references, each once, in the order it first names them. */
export function refIds(body: string | null | undefined): string[] {
  if (!body) return [];
  return [...new Set([...body.matchAll(TOKEN)].map((m) => m[1]))];
}

/**
 * A note's text as plain words (RF6): each reference as its moment's words ("Pier, Sep 11"), from `words` when the
 * reader knows them, else the words it was written with, else `GONE`. One form, the same the editor shows after its
 * "@" (steward S3).
 */
export function plainRefs(body: string, words: (id: string) => string | null = () => null, showValues = true): string {
  return parseRefs(body)
    .map((p) => ('text' in p ? p.text : 'key' in p ? keywordPlain(p, showValues) : (words(p.ref) ?? p.label ?? GONE)))
    .join('');
}

/** A note's words for a plain-text reader with no lookup (rows, Lately, a reminder, the replay): never a raw token. */
export const plainNote = (body: string | null | undefined, showValues = true): string | null => (body == null ? null : plainRefs(body, () => null, showValues));

/** A keyword reference changed to another value, its word kept (RK10): the `index`-th keyword in the body. */
export function replaceKeywordValue(body: string, index: number, value: string, payload: string): string {
  let n = -1;
  return body.replace(KEY, (whole) => {
    n++;
    if (n !== index) return whole;
    const k = parseRefs(whole)[0] as KeywordRef;
    return keywordToken({ ...k, value, payload });
  });
}

/**
 * The notes that mention a moment (RF7), read from their bodies when shown: oldest first, by date, never by how often
 * they mention it (steward S4). A note never mentions itself.
 */
export function mentioning<N extends { id: string; t: number; body: string | null }>(notes: N[], id: string): N[] {
  return notes.filter((n) => n.id !== id && refIds(n.body).includes(id)).sort((a, b) => a.t - b.t);
}

/** A reference as the editor shows it: `@` and its words, at `start` (inclusive) to `end` (exclusive) of the text. */
export interface EditorRef {
  id: string;
  /** The words saved with it. */
  label: string | null;
  /** A keyword reference's whole stored token (RK3); a moment's is made from `id` and `label`. */
  token?: string;
  start: number;
  end: number;
}

/** A body opened in the editor (RF3): the words it shows, and where each reference sits in them. */
export function toEditor(body: string, words: (id: string) => string | null): { text: string; refs: EditorRef[] } {
  let text = '';
  const refs: EditorRef[] = [];
  for (const p of parseRefs(body)) {
    if ('text' in p) {
      text += p.text;
      continue;
    }
    if ('key' in p) {
      const shown = `@${keywordPlain(p)}`;
      refs.push({ id: `key:${p.key}`, label: p.word, token: keywordToken(p), start: text.length, end: text.length + shown.length });
      text += shown;
      continue;
    }
    const now = words(p.ref);
    const shown = `@${now ?? p.label ?? GONE}`;
    refs.push({ id: p.ref, label: now ?? p.label, start: text.length, end: text.length + shown.length });
    text += shown;
  }
  return { text, refs };
}

/** The body the editor saves (RF3): its words, with each reference it still holds put back as a token. */
export function fromEditor(text: string, refs: EditorRef[]): string {
  let out = '';
  let at = 0;
  for (const r of [...refs].sort((a, b) => a.start - b.start)) {
    out += text.slice(at, r.start) + (r.token ?? refToken(r.id, r.label));
    at = r.end;
  }
  return out + text.slice(at);
}

/**
 * The editor's text changed from `prev` to `next` (RF3). References before the change stay; those after it move with
 * it; one the change reached into is removed whole, its remaining words with it, so one delete takes it all and a
 * reference never survives half-typed-over.
 */
export function editRefs(prev: string, next: string, refs: EditorRef[]): { text: string; refs: EditorRef[] } {
  let a = 0;
  while (a < prev.length && a < next.length && prev[a] === next[a]) a++;
  let b = 0;
  while (b < prev.length - a && b < next.length - a && prev[prev.length - 1 - b] === next[next.length - 1 - b]) b++;
  // prev[a, prevEnd) became next[a, nextEnd).
  const prevEnd = prev.length - b;
  const nextEnd = next.length - b;
  const delta = nextEnd - prevEnd;
  const kept: EditorRef[] = [];
  const cut: [number, number][] = [];
  for (const r of refs) {
    // Typing right at a reference's edge leaves it whole.
    if (r.end <= a) kept.push(r);
    else if (r.start >= prevEnd) kept.push({ ...r, start: r.start + delta, end: r.end + delta });
    else {
      // What is left of it in `next`: before the change, and after it.
      if (r.start < a) cut.push([r.start, a]);
      if (r.end > prevEnd) cut.push([nextEnd, r.end + delta]);
    }
  }
  if (!cut.length) return { text: next, refs: kept };
  let text = next;
  let shifted = kept;
  for (const [s, e] of cut.sort((x, y) => y[0] - x[0])) {
    text = text.slice(0, s) + text.slice(e);
    shifted = shifted.map((r) => (r.start >= e ? { ...r, start: r.start - (e - s), end: r.end - (e - s) } : r));
  }
  return { text, refs: shifted };
}

/**
 * A pick from the picker (RF1): the "@" typed at `at` becomes the reference, shown as `@` and its words, followed by a
 * space, and the cursor goes after it.
 */
export function insertRef(text: string, at: number, refs: EditorRef[], id: string, words: string | null, query = ''): { text: string; refs: EditorRef[]; cursor: number } {
  return insertAt(text, at, refs, `@${words ?? GONE}`, { id, label: words }, query);
}

/** A keyword picked from the palette (RK2): put in at the "@" typed at `at`, shown as its word and value, every other character as it was. */
export function insertKeyword(text: string, at: number, refs: EditorRef[], k: KeywordRef, query = ''): { text: string; refs: EditorRef[]; cursor: number } {
  return insertAt(text, at, refs, `@${keywordPlain(k)}`, { id: `key:${k.key}`, label: k.word, token: keywordToken(k) }, query);
}

/**
 * What was typed after an "@" at `at`, up to the cursor (RK21): the menu's query, "" right after the "@", or null when
 * the menu is not open: no "@" there, the cursor before it, or a space between (the owner is typing on).
 */
export function menuQuery(text: string, at: number, cursor: number): string | null {
  if (text[at] !== '@' || cursor < at + 1) return null;
  const typed = text.slice(at + 1, cursor);
  return /\s/.test(typed) ? null : typed;
}

function insertAt(text: string, at: number, refs: EditorRef[], shown: string, ref: Omit<EditorRef, 'start' | 'end'>, query = ''): { text: string; refs: EditorRef[]; cursor: number } {
  // The "@" and the letters typed after it (RK21) are what the pick replaces, and nothing else.
  const typedAt = (text[at] === '@' ? 1 : 0) + (text[at] === '@' ? query.length : 0);
  const rest = text.slice(at + typedAt);
  const space = rest.startsWith(' ') ? '' : ' ';
  const added = shown.length + space.length - typedAt;
  const moved = refs.map((r) => (r.start >= at + typedAt ? { ...r, start: r.start + added, end: r.end + added } : r));
  return {
    text: text.slice(0, at) + shown + space + rest,
    refs: [...moved, { ...ref, start: at, end: at + shown.length }].sort((x, y) => x.start - y.start),
    cursor: at + shown.length + 1,
  };
}

/** Where an "@" was just typed (RF1): the index of the "@" when `next` is `prev` with one "@" inserted, else null. */
export function typedAt(prev: string, next: string): number | null {
  if (next.length !== prev.length + 1) return null;
  let a = 0;
  while (a < prev.length && prev[a] === next[a]) a++;
  return next[a] === '@' && next.slice(a + 1) === prev.slice(a) ? a : null;
}
