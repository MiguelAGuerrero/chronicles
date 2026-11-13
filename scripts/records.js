#!/usr/bin/env node
// The record documents, changed only by declared operations (decision 0156):
//
//   docs/STATUS.md, docs/DEFERRED.md and docs/NATIVE_UNVERIFIED.md stay markdown the owner reads and
//   edits by hand. Agents change them only through the operations below. Each one changes one entry,
//   parses the result and refuses to write unless every other block is byte-identical and in the same
//   section. Each run of an operation is recorded in a pending sidecar, `.claude/records/<id>.json`
//   (staged as it is written): the operation's arguments and its body. The commit carries the sidecar
//   and one `Records-Op:` trailer per operation, in order (`npm run records -- trailers` prints them).
//   The gate replays the trailers on the parent's documents and requires the commit's byte for byte.
//
//   npm run records -- inbox add [--id T19]                 a T or G entry (its id written T? or G?),
//                                                           numbered on from the ledger and the document
//   npm run records -- inbox note <id>                      indented lines appended to an entry
//   npm run records -- inbox set <id> --reason r            an entry rewritten as the owner reshaped it, every
//                                                           line an earlier inbox note added kept as it stands
//   npm run records -- inbox remove <id> --reason r
//   npm run records -- last-tend set                        the "Last tend" body, its heading kept
//   npm run records -- open add [--end | --after <match>]   a bullet of "Open before the loop", newest first
//   npm run records -- open note <match> | open set|remove <match> --reason r
//   npm run records -- inflight add [--end | --after <m>] | inflight set|remove <match>   "In flight" rows
//   npm run records -- slice row add [--top | --after <m>] | slice row set <match>      "Slices" rows
//   npm run records -- slice row remove <match>             only a row this range added (a fix-forward)
//   npm run records -- section add "From <skill>" [--intro <file>]   a "From …" section of "Needs the owner",
//                                                           right after "From /tend", newest first
//   npm run records -- section item add "<section>" [--top | --after <m>]   a bullet of a "From …" section
//   npm run records -- section item note "<section>" <match> | section item set|remove "<section>" <match> --reason r
//   npm run records -- section remove "<section>" [--reason r]  a "From …" section with nothing under it
//   npm run records -- deferred|native item add <section> [--new] [--top | --after <match>]
//                                                           a bullet (--new: a new section at the end,
//                                                           --intro <file> its one paragraph)
//   npm run records -- deferred|native item note <match> | item split <match> | item tag <match> <tag>
//   npm run records -- deferred|native item remove|set <match> --reason r | item retag <match> <tag> --reason r
//   npm run records -- trailers                             the pending operations' trailers, for the commit
//   npm run records -- redo                                 the pending operations run again on HEAD's documents
//                                                           (after taking main's side of a rebase conflict);
//                                                           during a merge, main's side of the documents, and
//                                                           the branch's record commits to file again after it;
//                                                           with nothing pending, the commits that hand-edit
//   npm run records -- verify [<base>..<head> | <rev>]      (npm run check:records) each commit of the range
//                                                           replayed; with one rev, the commits since its merge
//                                                           base with HEAD and the working tree against HEAD
//
// Bodies come from --file <path> or stdin, so nothing needs shell quoting. <match> is text that occurs in
// exactly one entry of the operation's scope; <section>, a "From …" title or text in exactly one of them. An
// inbox entry the pending operations added is recorded by its
// handle (@1 for the first operation's), which redo renumbers with it. Each operation records the entry it
// acted on, and replay refuses another. A remove, set or retag of an entry the run did not file
// (filed: added by inbox add, open add or item add earlier in the range) needs --reason, and a commit
// makes at most two of them per section. A tag moves only toward [owner], [arch] or [kept].
// Plain Node, no dependencies. CI (scripts/tend.js commits --loop-only) runs the gate on every loop commit and
// every agent commit (a Claude-Session or Co-Authored-By: Claude trailer, the owner's rule of Nov 13);
// the owner's own hand edits carry neither and are not gated. A refusal ends with its one-line fix.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LEDGER_REL = '.claude/skills/tend/ledger.json';
const RECORDS_DIR = '.claude/records';
const DOCS = { 'docs/STATUS.md': 'status', 'docs/DEFERRED.md': 'deferred', 'docs/NATIVE_UNVERIFIED.md': 'native' };
const FILE_OF = Object.fromEntries(Object.entries(DOCS).map(([f, k]) => [k, f]));
const TAGS = ['loop', 'owner', 'arch', 'phone', 'kept'];
// A tag already given changes only toward these (decision 0156): never from [owner] or [arch] to [loop].
const RAISED = ['owner', 'arch', 'kept'];
// Removals and rewrites of entries the run did not file, per section per commit.
const CAP = 2;
// The commits the loop makes.
const LOOP = /^(tend |Revert "tend )/;
// An agent's commit (the owner's rule, Nov 13): a message line `Claude-Session: <url>` or
// `Co-Authored-By: Claude …`, the trailers every session writes. CI replays every agent commit and every
// loop commit; a commit with neither is the owner's own hand edit, and not gated.
const AGENT = /^(claude-session:[ \t]*\S|co-authored-by:[ \t]*claude\b)/im;
const isAgent = (message) => AGENT.test(String(message));
// The cut-over, by the commit graph, never by a date (a rebase keeps an author date and anyone can set
// one): a commit is replayed only when its parent already holds this gate (`Records-Op` in its
// scripts/records.js), so whatever lands on main before the gate does is history however late it
// lands; and never when it is an ancestor of CUTOVER, main as this was written. A clone that lacks
// CUTOVER (a shallow CI checkout, later) reads the parent rule alone.
const CUTOVER = '49ceb3e3522a4fd2ec1c92cb35128787497293a2';
const GATE_MARK = 'Records-Op';
// When the gate reached main: the refusals say it is new, for the owner's sessions that meet it first.
const LANDED = 'Nov 13, 2026';

// STATUS.md's parts that operations change. Everything else in it is the owner's, by hand.
const OWNER = 'Needs the owner';
const INBOX = 'From /tend';
const NEXT = 'Next evolutions';
const LAST = 'Last tend';
const OPEN = 'Open before the loop';
const SLICES = 'Slices';
const INFLIGHT = 'In flight';
const PLACEHOLDER = /^Nothing (open|filed yet)\b[^\n]*$/;

class RecordError extends Error {}
const fail = (msg) => {
  throw new RecordError(msg);
};

// ---------------------------------------------------------------------------------------------------
// Parsing: a document is a list of blocks whose texts, joined by newlines, are the document. Block
// starts follow CommonMark where the documents can meet them: ATX headings up to three spaces in,
// setext underlines, thematic breaks, HTML blocks, fences, list items, table rows.

const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const SETEXT = /^ {0,3}(=+|-+)[ \t]*$/;
const THEMATIC = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const HTML_OPEN = /^ {0,3}<(?:!--|\?|![A-Za-z]|!\[CDATA\[|\/?[A-Za-z][A-Za-z0-9-]*(?:\s|\/?>|$))/;
const ITEM = /^([-*+]|\d{1,9}[.)])\s+/;
const FENCE = /^\s*(`{3,}|~{3,})/;
const ROW = /^\|/;
const SEPARATOR = /^\|[\s:|-]+\|?\s*$/;
const ID = /^[-*+]\s+\*\*([TG])(\d+)(?=\s|\*\*)/;

function atx(line) {
  const m = ATX.exec(line);
  if (!m) return null;
  return { level: m[1].length, title: (m[2] ?? '').replace(/[ \t]+#+$/, '').replace(/^#+$/, '').trim() };
}

/** Whether `line` starts a block; `inPara`: after a paragraph line, where only "1." starts a list. */
function starts(line, inPara = false) {
  if (atx(line) || THEMATIC.test(line) || HTML_OPEN.test(line) || ROW.test(line) || /^ {0,3}(`{3,}|~{3,})/.test(line)) return true;
  const m = ITEM.exec(line);
  if (!m) return false;
  return !inPara || !/^\d/.test(m[1]) || /^1[.)]$/.test(m[1]);
}

/**
 * Blocks: heading, blank (a run of empty lines), item (a bullet or numbered item with every indented or
 * lazy line under it, fences inside included), row (one table row), tablehead (a header row and its
 * separator), fence, html, rule, para. Each carries its line range and the H2 and H3 it sits under;
 * an inbox entry (an item under "From /tend" or "Next evolutions") its id.
 */
function parse(text) {
  if (/\r(?!\n)/.test(text)) fail('the document holds a lone carriage return: markdown reads it as a line ending and this parser does not, so no operation can keep every other byte; the owner\'s file needs it removed');
  const eol = text.endsWith('\n');
  const body = eol ? text.slice(0, -1) : text;
  const lines = text === '' ? [] : body.split('\n');
  const blocks = [];
  let h2 = null;
  let h3 = null;
  let i = 0;
  const heading = (level, title) => {
    if (level <= 2) h3 = null;
    if (level === 1) h2 = null;
    if (level === 2) h2 = title;
    if (level === 3) h3 = title;
  };
  const push = (kind, start, end, extra = {}) => {
    const b = { kind, start, end, text: lines.slice(start, end).join('\n'), h2, h3, ...extra };
    if (kind === 'item' && h2 === OWNER && (h3 === INBOX || h3 === NEXT)) {
      const m = ID.exec(b.text);
      if (m) b.id = m[1] + m[2];
    }
    blocks.push(b);
  };
  const fenceEnd = (from) => {
    // `from` opens a fence; returns the index after its closing line (or the end of the document).
    const mark = FENCE.exec(lines[from])[1];
    let j = from + 1;
    while (j < lines.length) {
      const t = lines[j].trim();
      if (t.startsWith(mark[0].repeat(mark.length)) && /^(`+|~+)$/.test(t)) break;
      j++;
    }
    return Math.min(j + 1, lines.length);
  };
  while (i < lines.length) {
    const line = lines[i];
    const start = i;
    if (line.trim() === '') {
      while (i < lines.length && lines[i].trim() === '') i++;
      push('blank', start, i);
      continue;
    }
    const h = atx(line);
    if (h) {
      heading(h.level, h.title);
      i++;
      push('heading', start, i, { level: h.level, title: h.title });
      continue;
    }
    if (/^ {0,3}(`{3,}|~{3,})/.test(line)) {
      i = fenceEnd(i);
      push('fence', start, i);
      continue;
    }
    if (HTML_OPEN.test(line)) {
      if (/^ {0,3}<!--/.test(line)) {
        while (i < lines.length && !lines[i].slice(i === start ? line.indexOf('<!--') + 4 : 0).includes('-->')) i++;
        i = Math.min(i + 1, lines.length);
      } else {
        while (i < lines.length && lines[i].trim() !== '') i++;
      }
      push('html', start, i);
      continue;
    }
    if (THEMATIC.test(line)) {
      i++;
      push('rule', start, i);
      continue;
    }
    if (ROW.test(line)) {
      if (i + 1 < lines.length && SEPARATOR.test(lines[i + 1]) && !SEPARATOR.test(line)) {
        i += 2;
        push('tablehead', start, i);
      } else {
        i++;
        push('row', start, i, { key: rowKey(line) });
      }
      continue;
    }
    if (ITEM.test(line)) {
      i++;
      for (;;) {
        if (i >= lines.length) break;
        const next = lines[i];
        if (next.trim() === '') {
          // A blank line continues the item only when an indented line follows it (a loose item).
          let j = i;
          while (j < lines.length && lines[j].trim() === '') j++;
          if (j < lines.length && /^\s+\S/.test(lines[j])) {
            i = j;
            continue;
          }
          break;
        }
        if (/^\s/.test(next)) {
          i = FENCE.test(next) ? fenceEnd(i) : i + 1;
          continue;
        }
        if (starts(next)) break;
        i++; // a lazy continuation line, as markdown reads it
      }
      push('item', start, i);
      continue;
    }
    i++;
    let setext = null;
    while (i < lines.length && lines[i].trim() !== '') {
      if (SETEXT.test(lines[i])) {
        setext = lines[i].trim()[0] === '=' ? 1 : 2;
        i++;
        break;
      }
      if (starts(lines[i], true)) break;
      i++;
    }
    if (setext) {
      const title = lines.slice(start, i - 1).map((l) => l.trim()).join(' ');
      heading(setext, title);
      push('heading', start, i, { level: setext, title });
    } else push('para', start, i);
  }
  return { blocks, lines, eol };
}

/** A table row's key: its first cell, up to a parenthesis (a slice's name). */
function rowKey(line) {
  const cell = line.split('|')[1] ?? '';
  return cell.replace(/\(.*$/, '').replace(/`/g, '').trim();
}

const first = (b) => {
  const l = b.text.split('\n')[0];
  return l.length > 110 ? `${l.slice(0, 107)}...` : l;
};

/** The marker, an optional checkbox, an optional tag, and the rest of an item's text. */
function itemParts(text) {
  const m = new RegExp(`^([-*+]|\\d+[.)])(\\s+)(\\[[ xX]\\]\\s+)?(\\[(${TAGS.join('|')})\\]\\s+)?`).exec(text);
  if (!m) return null;
  return { marker: m[1] + m[2] + (m[3] ?? ''), tag: m[5] ?? null, rest: text.slice(m[0].length) };
}

/** An inbox entry's class tag: `- **T12 [owner] …`. */
const entryTag = (text) => {
  const m = /^[-*+]\s+\*\*[TG](?:\d+|\?)\s+\[(\w+)\]/.exec(text);
  return m && TAGS.includes(m[1]) ? m[1] : null;
};
const norm = (s) => s.replace(/\s+/g, ' ').trim();
/** An item's words without its marker, checkbox or tag: what makes it the same item whatever its tag. */
const untagged = (text) => norm(itemParts(text)?.rest ?? text);

/** The words of a text in order, its marker, checkbox and tag left out. */
function wordList(text) {
  const p = itemParts(text);
  return (p ? p.rest : text).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** The words of a text, its marker, checkbox and tag left out (for a split's every-word rule). */
function tokens(text) {
  const p = itemParts(text);
  return new Set((p ? p.rest : text).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

// ---------------------------------------------------------------------------------------------------
// Bodies: what an operation is given to write.

/** The lines of a body: CRLF read as LF, trailing blank lines dropped; refuses an empty one. */
function bodyLines(body, what) {
  const text = String(body ?? '').replace(/\r\n/g, '\n').replace(/\s+$/, '');
  if (!text.trim()) fail(`the ${what} is empty: give it with --file <path> or on stdin`);
  if (text.includes('\r')) fail(`the ${what} holds a lone carriage return: markdown reads it as a line ending, so it could start a block the gate never sees; use a newline`);
  return text.split('\n');
}

/**
 * Refuses a body line that would start a block of its own and so change the document's structure
 * around the entry: a heading, a setext underline, a thematic rule, an HTML block, an unclosed fence
 * (or, with `noFence`, any fence). Lines inside a closed fence are code and left alone.
 */
function checkBody(lines, what, { noFence = false } = {}) {
  let open = null;
  for (const [k, l] of lines.entries()) {
    const t = l.replace(/^\s+/, '');
    const fm = /^(`{3,}|~{3,})/.exec(t);
    if (open) {
      if (fm && fm[1][0] === open[0] && fm[1].length >= open.length && t.slice(fm[1].length).trim() === '') open = null;
      continue;
    }
    if (fm) {
      if (noFence) fail(`the ${what} holds no code fence (line ${k + 1}): an unclosed one would swallow the sections after it`);
      open = fm[1];
      continue;
    }
    const at = `its line ${k + 1} ("${l}")`;
    if (/^#{1,6}(\s|$)/.test(t)) fail(`the ${what} would start a heading at ${at}: an entry holds no heading`);
    if (/^\[[^\]]+\]:/.test(t)) fail(`the ${what} would be a link reference definition at ${at}: it renders as nothing and turns every "[label]" in the document into a link`);
    if (/^<(?:!--|\?|![A-Za-z]|!\[CDATA\[|\/?[A-Za-z][A-Za-z0-9-]*(?:\s|\/?>|$))/.test(t)) fail(`the ${what} would open an HTML block at ${at}: write it as text`);
    if (k > 0 && /^(=+|-+)\s*$/.test(t)) fail(`the ${what} would make a setext heading or a rule at ${at}`);
    if (/^([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(t)) fail(`the ${what} would make a thematic rule at ${at}`);
  }
  if (open) fail(`the ${what} opens a code fence ("${open}") it never closes: it would swallow everything after the entry`);
}

/** An item's lines: a marker on the first line, every other line indented, no blank line. */
function asItem(body, { marker = '- ', what = 'entry' } = {}) {
  let lines = bodyLines(body, what);
  if (lines.some((l) => l.trim() === '')) fail(`an ${what} has no blank line inside it (it would end the bullet there); remove the blank lines`);
  checkBody(lines, what);
  if (!ITEM.test(lines[0])) lines[0] = marker + lines[0];
  const indent = ' '.repeat(ITEM.exec(lines[0])[0].length);
  lines = lines.map((l, k) => (k === 0 || /^\s/.test(l) ? l : indent + l));
  return lines;
}

/** Lines appended under an item: each indented to the item's text. */
function noteLines(item, body) {
  const lines = bodyLines(body, 'note');
  if (lines.some((l) => l.trim() === '')) fail('a note has no blank line inside it');
  checkBody(lines, 'note');
  const indent = ' '.repeat(ITEM.exec(item.text)[0].length);
  return lines.map((l) => indent + l.trimStart());
}

/** A table row, with as many cells as its table. */
function asRow(body, head) {
  const lines = bodyLines(body, 'row');
  if (lines.length > 1) fail('a row is one line');
  const text = lines[0];
  if (!/^\|.*\|$/.test(text)) fail('a row starts and ends with "|"');
  const cells = (l) => l.split('|').length;
  if (head && cells(text) !== cells(head.text.split('\n')[0])) fail(`the row has ${cells(text) - 2} cells; the table has ${cells(head.text.split('\n')[0]) - 2}`);
  return text;
}

// ---------------------------------------------------------------------------------------------------
// Operations: each reads the parsed document and returns an edit, the lines from `at` (`remove` of
// them) replaced by `lines`, with what the replaced region must parse to (`mid`) and what it changed
// (`step`, for the caps, reasons and tags). `transact` makes it and checks it.

/** One block whose text holds `match`, among `blocks`; refuses none or several. */
function only(blocks, match, what) {
  if (!match || !String(match).trim()) fail(`say which ${what}: give text that occurs in exactly one`);
  const hits = blocks.filter((b) => b.text.includes(match));
  if (!hits.length) fail(`no ${what} holds "${match}"`);
  if (hits.length > 1) fail(`"${match}" is in ${hits.length} ${what}s; give more of the text:\n${hits.map((b) => `  - ${first(b)}`).join('\n')}`);
  return hits[0];
}

function section(doc, h2, h3) {
  const { blocks } = doc;
  const k = blocks.findIndex((b) => b.kind === 'heading' && (h3 ? b.level === 3 && b.title === h3 && b.h2 === h2 : b.level === 2 && b.title === h2));
  if (k < 0) fail(`no section "${h3 ?? h2}" in the document; a section of docs/STATUS.md is never made by an operation`);
  const level = blocks[k].level;
  let e = k + 1;
  while (e < blocks.length && !(blocks[e].kind === 'heading' && blocks[e].level <= level)) e++;
  return { heading: blocks[k], inner: blocks.slice(k + 1, e), next: blocks[e] ?? null };
}

/** The line after the last non-blank block of a section (where an entry is appended). */
function endOf(sec) {
  const content = sec.inner.filter((b) => b.kind !== 'blank');
  return content.length ? content[content.length - 1].end : sec.heading.end;
}

/** Where an added entry goes: the section's end, its top (before its first entry), or after `after`. */
function place(sec, kind, { top, after } = {}) {
  const entries = sec.inner.filter((b) => b.kind === kind);
  if (after) return only(entries, after, kind === 'row' ? 'row' : 'entry').end;
  if (top && entries.length) return entries[0].start;
  if (kind === 'row') {
    const head = sec.inner.find((b) => b.kind === 'tablehead');
    return entries.length ? entries[entries.length - 1].end : head.end;
  }
  return endOf(sec);
}

/** An insertion at `at`, kept apart from a paragraph it would otherwise continue. */
function insert(doc, at, lines) {
  const before = doc.blocks.find((b) => b.kind !== 'blank' && b.end === at);
  const after = doc.blocks.find((b) => b.kind !== 'blank' && b.start === at);
  const lead = before && ['para', 'html'].includes(before.kind) ? [''] : [];
  const tail = after && ['para', 'html'].includes(after.kind) ? [''] : [];
  return { at, remove: 0, lines: [...lead, ...lines, ...tail] };
}

const replaceBlock = (b, lines) => ({ at: b.start, remove: b.end - b.start, lines });

/** A block taken out, with one of the blank lines around it when it stood between two (no double blank). */
function removeBlock(doc, b) {
  const blank = (k) => k >= 0 && k < doc.lines.length && doc.lines[k].trim() === '';
  if (blank(b.start - 1) && (blank(b.end) || b.end === doc.lines.length)) {
    return blank(b.end) ? { at: b.start, remove: b.end + 1 - b.start, lines: [] } : { at: b.start - 1, remove: b.end - b.start + 1, lines: [] };
  }
  return { at: b.start, remove: b.end - b.start, lines: [] };
}

const isItem = (kind, where) => (b) => b.kind === kind && Object.entries(where).every(([k, v]) => b[k] === v);
/** `mid` checks: the region an operation wrote parses to exactly these blocks. */
const oneItem = (where, text) => (mid) => mid.length === 1 && isItem('item', where)(mid[0]) && (text === undefined || mid[0].text === text);
const oneRow = (h2) => (mid) => mid.length === 1 && mid[0].kind === 'row' && mid[0].h2 === h2;
const nothing = (mid) => mid.length === 0;

function entry(doc, match) {
  const id = String(match ?? '').trim();
  if (!/^[TG]\d+$/.test(id)) fail(`an inbox entry is named by its number, T<n> or G<n>, not "${id}"`);
  const b = doc.blocks.find((x) => x.id === id);
  if (!b) fail(`${id} is not in the inbox`);
  return b;
}

/** F9: `lines` (an entry's new text) hold every line of `keep`, unchanged and in order. */
function keepsNoted(id, keep, lines, what) {
  let k = 0;
  for (const l of lines.slice(1)) if (k < keep.length && l === keep[k]) k++;
  if (k < keep.length) fail(`${what} keeps every line an earlier \`inbox note\` added to ${id}, unchanged and in order (decision 0156, F9): "${keep[k].trim()}" is missing or changed; put it back as it stands, add to it with \`inbox note\`, or leave the change to the owner`);
}

function highest(doc, letter, ledger) {
  let n = Number(ledger?.[`last${letter}`]) || 0;
  for (const b of doc.blocks) if (b.id && b.id[0] === letter) n = Math.max(n, Number(b.id.slice(1)));
  return n;
}

const openItems = (doc) => section(doc, OWNER, OPEN).inner.filter((x) => x.kind === 'item');

// A "From <skill>" section of "Needs the owner": what a slice, a fix or an audit leaves for the owner's
// call (an H3 of its own, as recent slices kept them). "From /tend" is the inbox's, by `inbox` operations.
const FROM = /^From \S/;
const fromHeadings = (doc) => doc.blocks.filter((b) => b.kind === 'heading' && b.level === 3 && b.h2 === OWNER && FROM.test(b.title) && b.title !== INBOX);
/** The "From …" section named by its whole title or by text in exactly one title. */
function fromSection(doc, name) {
  if (!name || !String(name).trim()) fail('say which section: its title, "From …"');
  if (name === INBOX) fail(`"${INBOX}" is the inbox: its entries change by \`inbox add|note|set|remove\``);
  const hs = fromHeadings(doc);
  let h = hs.find((b) => b.title === name);
  if (!h) {
    const near = hs.filter((b) => b.title.includes(name));
    if (near.length > 1) fail(`"${name}" is in ${near.length} section titles; give more of the title:\n${near.map((b) => `  - ${b.title}`).join('\n')}`);
    if (!near.length) fail(`no section "${name}" under "${OWNER}" (its "From …" sections: ${hs.map((b) => `"${b.title}"`).join(', ') || 'none'}); \`section add\` makes one`);
    h = near[0];
  }
  return section(doc, OWNER, h.title);
}
const fromKey = (title, text) => `${title}\u0000${norm(text)}`;

/** A section's intro: one paragraph, no block of its own. */
function introLines(intro) {
  const il = bodyLines(intro, "section's intro");
  if (il.some((l) => l.trim() === '')) fail('the intro is one paragraph, with no blank line');
  if (il.some((l) => starts(l) || SETEXT.test(l))) fail('the intro is a paragraph: no bullet, heading, rule, table, fence or HTML');
  return il;
}
/** A new section's title: one line of text, no carriage return, no #. */
function checkTitle(name) {
  if (typeof name !== 'string' || !name.trim()) fail('say which section: its title');
  if (/\r/.test(name)) fail('a section title holds no carriage return');
  if (/[\n#]/.test(name) || name !== name.trim()) fail('a section title is one line of text');
}
const openKey = (text) => `${OPEN}\u0000${norm(text)}`;
const itemKey = (b) => `${b.h2}\u0000${norm(b.text)}`;
/** An item of docs/DEFERRED.md or docs/NATIVE_UNVERIFIED.md: one under an H2. */
const anItem = (doc, match) => only(doc.blocks.filter((x) => x.kind === 'item' && x.h2), match, 'item');

/** Where a set keeps the item's own marker (a numbered item stays numbered). */
const markerOf = (b) => itemParts(b.text)?.marker.replace(/\[[ xX]\]\s+$/, '') ?? '- ';

const OPS = {
  'inbox add'(doc, { body, id, ledger, reopen, keep = [] }) {
    const lines = asItem(body);
    const m = /^[-*+]\s+\*\*([TG])(\?|\d+)(?=\s|\*\*)/.exec(lines[0]);
    if (!m) fail('an inbox entry starts "- **T? [class] Title** (date)" or "- **G? [S|M|L] Title** (date)"; write T? or G? for its number');
    let letter = m[1];
    let num = m[2] === '?' ? null : Number(m[2]);
    if (id) {
      const g = /^([TG])(\d+)$/.exec(id);
      if (!g) fail(`--id is T<n> or G<n>, not "${id}"`);
      if (g[1] !== letter) fail(`--id ${id} is not a ${letter} entry`);
      if (num !== null && num !== Number(g[2])) fail(`--id ${id} and the entry's ${letter}${num} disagree`);
      num = Number(g[2]);
      letter = g[1];
    }
    const top = highest(doc, letter, ledger);
    if (doc.blocks.some((b) => b.id === `${letter}${num}`)) fail(`${letter}${num} is already in the inbox`);
    if (num === null) num = top + 1;
    else if (num <= top && !reopen?.has(`${letter}${num}`)) fail(`${letter}${num} was already given out (last ${letter}${top}); leave the number out and it is numbered ${letter}${top + 1}`);
    const newId = `${letter}${num}`;
    lines[0] = lines[0].replace(/^([-*+]\s+\*\*)[TG](\?|\d+)/, `$1${newId}`);
    // F34: an entry put back under a number the range removed keeps the answers its notes added.
    keepsNoted(newId, keep, lines, 'an inbox entry put back under its number');
    const h3 = letter === 'T' ? INBOX : NEXT;
    const sec = section(doc, OWNER, h3);
    const empty = sec.inner.find((b) => b.kind === 'para' && PLACEHOLDER.test(b.text));
    return {
      edit: empty ? replaceBlock(empty, lines) : insert(doc, endOf(sec), lines),
      mid: oneItem({ h3, id: newId }, lines.join('\n')),
      result: { id: newId, letter, num },
      step: { kind: 'file', section: h3, newKey: `id:${newId}` },
    };
  },
  'inbox note'(doc, { match, body }) {
    const b = entry(doc, match);
    const noted = noteLines(b, body);
    const lines = [...b.text.split('\n'), ...noted];
    return { target: b, result: { noted }, edit: replaceBlock(b, lines), mid: oneItem({ h3: b.h3, id: b.id }, lines.join('\n')), step: { kind: 'note', section: b.h3, key: `id:${b.id}`, newKey: `id:${b.id}` } };
  },
  'inbox set'(doc, { match, body, noted = [] }) {
    const b = entry(doc, match);
    const lines = asItem(body);
    const m = /^[-*+]\s+\*\*([TG])(\?|\d+)(?=\s|\*\*)/.exec(lines[0]);
    if (!m || m[1] !== b.id[0] || (m[2] !== '?' && m[1] + m[2] !== b.id)) fail(`the new text must start "- **${b.id} …**" (or "- **${b.id[0]}? …**"): an entry keeps its number`);
    lines[0] = lines[0].replace(/^([-*+]\s+\*\*)[TG](\?|\d+)/, `$1${b.id}`);
    // F9, the owner's call (Nov 13): the answers an \`inbox note\` added stay, word for word and in order.
    keepsNoted(b.id, b.text.split('\n').slice(1).filter((l) => noted.includes(l)), lines, 'an inbox set');
    return { target: b,
      edit: replaceBlock(b, lines),
      mid: oneItem({ h3: b.h3, id: b.id }, lines.join('\n')),
      step: { kind: 'set', section: b.h3, key: `id:${b.id}`, newKey: `id:${b.id}`, what: first(b), oldTag: entryTag(b.text), newTag: entryTag(lines[0]) },
    };
  },
  'inbox remove'(doc, { match }) {
    const b = entry(doc, match);
    const sec = section(doc, OWNER, b.h3);
    const alone = sec.inner.filter((x) => x.kind === 'item').length === 1;
    const placeholder = alone && b.h3 === INBOX;
    return { target: b, result: { gone: b.text },
      edit: placeholder ? replaceBlock(b, ['Nothing open.']) : removeBlock(doc, b),
      mid: placeholder ? (mid) => mid.length === 1 && mid[0].kind === 'para' && PLACEHOLDER.test(mid[0].text) : nothing,
      step: { kind: 'remove', section: b.h3, key: `id:${b.id}`, what: first(b) },
    };
  },
  'last-tend set'(doc, { body }) {
    const sec = section(doc, OWNER, LAST);
    const lines = bodyLines(body, '"Last tend" body');
    checkBody(lines, '"Last tend" body', { noFence: true });
    const from = sec.heading.end;
    const to = sec.next ? sec.next.start : doc.lines.length;
    return {
      edit: { at: from, remove: to - from, lines: ['', ...lines, ...(sec.next ? [''] : [])] },
      mid: (mid) => mid.every((b) => b.kind !== 'heading' && b.h2 === OWNER && b.h3 === LAST),
      step: { kind: 'other' },
    };
  },
  // Newest first, as the section has always been kept; --end or --after <match> put it elsewhere.
  'open add'(doc, { body, after, end }) {
    const sec = section(doc, OWNER, OPEN);
    const lines = asItem(body);
    return { edit: insert(doc, place(sec, 'item', { top: !end, after }), lines), mid: oneItem({ h3: OPEN, id: undefined }, lines.join('\n')), step: { kind: 'file', section: OPEN, newKey: openKey(lines.join('\n')) } };
  },
  'open note'(doc, { match, body }) {
    const b = only(openItems(doc), match, 'open item');
    const lines = [...b.text.split('\n'), ...noteLines(b, body)];
    return { target: b, edit: replaceBlock(b, lines), mid: oneItem({ h3: OPEN, id: undefined }, lines.join('\n')), step: { kind: 'note', section: OPEN, key: openKey(b.text), newKey: openKey(lines.join('\n')) } };
  },
  'open set'(doc, { match, body }) {
    const b = only(openItems(doc), match, 'open item');
    const lines = asItem(body, { marker: markerOf(b) });
    return { target: b, edit: replaceBlock(b, lines), mid: oneItem({ h3: OPEN, id: undefined }, lines.join('\n')), step: { kind: 'set', section: OPEN, key: openKey(b.text), newKey: openKey(lines.join('\n')), what: first(b) } };
  },
  'open remove'(doc, { match }) {
    const b = only(openItems(doc), match, 'open item');
    return { target: b, edit: removeBlock(doc, b), mid: nothing, step: { kind: 'remove', section: OPEN, key: openKey(b.text), what: first(b) } };
  },
  'inflight add': (doc, { body, after, end }) => rowAdd(doc, INFLIGHT, body, { top: !end, after }),
  'inflight set': (doc, { match, body }) => rowSet(doc, INFLIGHT, match, body),
  'inflight remove'(doc, { match }) {
    const b = only(section(doc, INFLIGHT).inner.filter((x) => x.kind === 'row'), match, 'In flight row');
    return { target: b, edit: removeBlock(doc, b), mid: nothing, step: { kind: 'other' } };
  },
  'slice row add': (doc, { body, after, top }) => rowAdd(doc, SLICES, body, { top, after }),
  'slice row set': (doc, { match, body }) => rowSet(doc, SLICES, match, body),
  // Only a row this range added (a fix-forward of a red slice); every other row is the owner's record.
  'slice row remove'(doc, { match }) {
    const b = only(section(doc, SLICES).inner.filter((x) => x.kind === 'row'), match, 'Slices row');
    return { target: b, edit: removeBlock(doc, b), mid: nothing, step: { kind: 'remove', section: SLICES, key: `row:${b.key}`, onlyOwn: true, what: first(b) } };
  },
  'item add'(doc, { section: name, body, create, intro, after, top }) {
    if (!name || !name.trim()) fail('say which section: its H2 title');
    const h2s = doc.blocks.filter((b) => b.kind === 'heading' && b.level === 2);
    let h = h2s.find((b) => b.title === name);
    if (!h && !create) {
      const near = h2s.filter((b) => b.title.includes(name));
      if (near.length === 1) h = near[0];
      else if (near.length > 1) fail(`"${name}" is in ${near.length} section titles; give the whole title:\n${near.map((b) => `  - ${b.title}`).join('\n')}`);
    }
    const lines = asItem(body);
    const text = lines.join('\n');
    const tag = itemParts(text)?.tag ?? null;
    if (!h) {
      if (!create) fail(`no section "${name}"; --new makes it, at the end of the file`);
      if (/\r/.test(name)) fail('a section title holds no carriage return');
      if (/[\n#]/.test(name) || name !== name.trim()) fail('a section title is one line of text');
      const lead = intro !== undefined ? [...introLines(intro), ''] : [];
      // A new section goes after the document's last block, never between the owner's.
      let end = doc.lines.length;
      while (end > 0 && doc.lines[end - 1].trim() === '') end--;
      return {
        edit: { at: end, remove: doc.lines.length - end, lines: ['', `## ${name}`, '', ...lead, ...lines] },
        mid: (mid) =>
          mid.length === (intro === undefined ? 2 : 3) &&
          mid[0].kind === 'heading' && mid[0].level === 2 && mid[0].title === name &&
          (intro === undefined || (mid[1].kind === 'para' && mid[1].h2 === name)) &&
          isItem('item', { h2: name, text })(mid[mid.length - 1]),
        step: { kind: 'file', section: name, newKey: `${name}\u0000${norm(text)}`, newTag: tag, untagged: untagged(text) },
      };
    }
    if (create) fail(`a section "${h.title}" exists already; leave out --new`);
    if (intro !== undefined) fail('--intro goes with --new: an existing section keeps its words');
    const sec = section(doc, h.title);
    return {
      edit: insert(doc, place(sec, 'item', { top, after }), lines),
      mid: oneItem({ h2: h.title }, text),
      step: { kind: 'file', section: h.title, newKey: `${h.title}\u0000${norm(text)}`, newTag: tag, untagged: untagged(text) },
    };
  },
  /** `/tend triage`'s split: one bullet holding several items becomes several, every word kept. */
  'item split'(doc, { match, body }) {
    const b = anItem(doc, match);
    const text = bodyLines(body, 'split').join('\n');
    checkBody(text.split('\n'), 'split');
    const parts = parse(text).blocks.filter((x) => x.kind !== 'blank');
    if (parts.some((x) => x.kind !== 'item')) fail('the split is bullets only, one per line with its indented lines, no blank line');
    if (parts.length < 2) fail('a split makes two bullets or more');
    const all = new Set(parts.flatMap((x) => [...tokens(x.text)]));
    const missing = [...tokens(b.text)].filter((w) => !all.has(w));
    if (missing.length) fail(`a split keeps every word of the bullet; missing: ${missing.join(', ')}`);
    const had = tokens(b.text);
    const extra = [...all].filter((w) => !had.has(w));
    if (extra.length) fail(`a split is the bullet's own words, a tag on each part at most; it adds words: ${extra.join(', ')} (a rewrite is \`item set\` with its reason)`);
    const marker = itemParts(b.text).marker;
    const off = parts.find((x) => itemParts(x.text).marker !== marker);
    if (off) fail(`each part keeps the bullet's marker and checkbox ("${marker}"), not "${itemParts(off.text).marker}": a split ticks nothing`);
    if (parts.flatMap((x) => wordList(x.text)).join(' ') !== wordList(b.text).join(' ')) fail("a split keeps the bullet's words in their order, each once: the parts read in turn are the bullet");
    const lines = parts.flatMap((x) => x.text.split('\n'));
    return { target: b,
      edit: replaceBlock(b, lines),
      mid: (mid) => mid.length === parts.length && mid.every((x, k) => x.kind === 'item' && x.h2 === b.h2 && x.text === parts[k].text),
      step: { kind: 'split', section: b.h2, key: itemKey(b), newKeys: parts.map((x) => `${b.h2}\u0000${norm(x.text)}`), oldTag: itemParts(b.text).tag, partTags: parts.map((x) => itemParts(x.text)?.tag ?? null), what: first(b) },
    };
  },
  'item remove'(doc, { match }) {
    const b = anItem(doc, match);
    return { target: b, edit: removeBlock(doc, b), mid: nothing, step: { kind: 'remove', section: b.h2, key: itemKey(b), oldTag: itemParts(b.text).tag, untagged: untagged(b.text), what: first(b) } };
  },
  'item note'(doc, { match, body }) {
    const b = anItem(doc, match);
    const lines = [...b.text.split('\n'), ...noteLines(b, body)];
    return { target: b, edit: replaceBlock(b, lines), mid: oneItem({ h2: b.h2 }, lines.join('\n')), step: { kind: 'note', section: b.h2, key: itemKey(b), newKey: `${b.h2}\u0000${norm(lines.join('\n'))}` } };
  },
  'item set'(doc, { match, body }) {
    const b = anItem(doc, match);
    const lines = asItem(body, { marker: markerOf(b) });
    const text = lines.join('\n');
    return { target: b,
      edit: replaceBlock(b, lines),
      mid: oneItem({ h2: b.h2 }, text),
      step: { kind: 'set', section: b.h2, key: itemKey(b), newKey: `${b.h2}\u0000${norm(text)}`, oldTag: itemParts(b.text).tag, newTag: itemParts(text)?.tag ?? null, what: first(b) },
    };
  },
  // "From <skill>" sections (the owner's decision 3, Nov 13). A new one goes right after "From /tend",
  // above the "From …" sections already there (newest first) and before "Next evolutions". Renaming one
  // stays the owner's edit.
  'section add'(doc, { section: name, intro }) {
    checkTitle(name);
    if (!FROM.test(name)) fail(`a section of "${OWNER}" an operation adds is "From <skill>" ("From /fix", "From the journal's audit (…)"), not "${name}"`);
    if (name === INBOX) fail(`"${INBOX}" is the inbox's own section`);
    const owner = doc.blocks.filter((b) => b.kind === 'heading' && b.level === 3 && b.h2 === OWNER);
    if (owner.some((b) => b.title === name)) fail(`a section "${name}" exists already under "${OWNER}"`);
    const tend = section(doc, OWNER, INBOX);
    if (!tend.next || tend.next.level !== 3 || tend.next.h2 !== OWNER) fail(`"${INBOX}" is not followed by a section of "${OWNER}" ("${NEXT}"): the owner's layout moved, so where a new section goes is theirs to say`);
    const at = tend.next.start;
    const lead = doc.lines[at - 1]?.trim() === '' ? [] : [''];
    const il = intro !== undefined ? [...introLines(intro), ''] : [];
    return {
      edit: { at, remove: 0, lines: [...lead, `### ${name}`, '', ...il] },
      mid: (mid) =>
        mid.length === (intro === undefined ? 1 : 2) &&
        mid[0].kind === 'heading' && mid[0].level === 3 && mid[0].title === name && mid[0].h2 === OWNER &&
        (intro === undefined || (mid[1].kind === 'para' && mid[1].h3 === name)),
      step: { kind: 'file', section: name, newKey: `section:${name}` },
    };
  },
  'section remove'(doc, { section: name }) {
    const sec = fromSection(doc, name);
    const title = sec.heading.title;
    if (sec.inner.some((b) => b.kind !== 'blank')) fail(`"${title}" is not empty: a section leaves only when nothing is under its heading; its bullets go first (\`section item remove\`, each with its reason), and words under it (an intro, the owner's) are the owner's to remove`);
    const to = sec.next ? sec.next.start : doc.lines.length;
    // The target is the whole section as it stands, so a replay refuses one the owner has written into since.
    const whole = { text: doc.lines.slice(sec.heading.start, to).join('\n') };
    return { target: whole, edit: { at: sec.heading.start, remove: to - sec.heading.start, lines: [] }, mid: nothing, step: { kind: 'remove', section: title, key: `section:${title}`, what: `### ${title}` } };
  },
  'section item add'(doc, { section: name, body, after, top }) {
    const sec = fromSection(doc, name);
    const title = sec.heading.title;
    const lines = asItem(body);
    const at = place(sec, 'item', { top, after });
    const edit = insert(doc, at, lines);
    // Into an empty section: a blank line after its heading, as the document keeps them.
    if (doc.blocks.some((b) => b.kind === 'heading' && b.end === at)) edit.lines.unshift('');
    return { edit, mid: oneItem({ h3: title, id: undefined }, lines.join('\n')), step: { kind: 'file', section: title, newKey: fromKey(title, lines.join('\n')) } };
  },
  'section item note'(doc, { section: name, match, body }) {
    const sec = fromSection(doc, name);
    const title = sec.heading.title;
    const b = only(sec.inner.filter((x) => x.kind === 'item'), match, `entry of "${title}"`);
    const lines = [...b.text.split('\n'), ...noteLines(b, body)];
    return { target: b, edit: replaceBlock(b, lines), mid: oneItem({ h3: title, id: undefined }, lines.join('\n')), step: { kind: 'note', section: title, key: fromKey(title, b.text), newKey: fromKey(title, lines.join('\n')) } };
  },
  'section item set'(doc, { section: name, match, body }) {
    const sec = fromSection(doc, name);
    const title = sec.heading.title;
    const b = only(sec.inner.filter((x) => x.kind === 'item'), match, `entry of "${title}"`);
    const lines = asItem(body, { marker: markerOf(b) });
    return { target: b, edit: replaceBlock(b, lines), mid: oneItem({ h3: title, id: undefined }, lines.join('\n')), step: { kind: 'set', section: title, key: fromKey(title, b.text), newKey: fromKey(title, lines.join('\n')), what: first(b) } };
  },
  'section item remove'(doc, { section: name, match }) {
    const sec = fromSection(doc, name);
    const title = sec.heading.title;
    const b = only(sec.inner.filter((x) => x.kind === 'item'), match, `entry of "${title}"`);
    return { target: b, edit: removeBlock(doc, b), mid: nothing, step: { kind: 'remove', section: title, key: fromKey(title, b.text), what: first(b) } };
  },
  'item tag'(doc, { match, tag }) {
    if (!TAGS.includes(tag)) fail(`a tag is one of ${TAGS.join(', ')}`);
    const b = anItem(doc, match);
    const p = itemParts(b.text);
    if (p.tag) fail(`the item is tagged [${p.tag}] already; \`item retag <match> <tag> --reason "…"\` changes a tag`);
    return tagged(b, p, tag, 'tag');
  },
  'item retag'(doc, { match, tag }) {
    if (!TAGS.includes(tag)) fail(`a tag is one of ${TAGS.join(', ')}`);
    const b = anItem(doc, match);
    const p = itemParts(b.text);
    if (!p.tag) fail('the item is untagged: `item tag <match> <tag>` gives a first tag');
    if (p.tag === tag) fail(`the item is tagged [${tag}] already`);
    return tagged(b, p, tag, 'retag');
  },
};

function tagged(b, p, tag, kind) {
  const lines = b.text.split('\n');
  const bare = p.marker.length + (p.tag ? lines[0].slice(p.marker.length).indexOf(']') + 1 : 0);
  lines[0] = p.marker + `[${tag}] ` + lines[0].slice(bare).replace(/^\s+/, '');
  const text = lines.join('\n');
  return {
    target: b,
    edit: replaceBlock(b, lines),
    mid: oneItem({ h2: b.h2 }, text),
    step: { kind, section: b.h2, key: itemKey(b), newKey: `${b.h2}\u0000${norm(text)}`, oldTag: p.tag, newTag: tag, what: first(b) },
  };
}

function rowAdd(doc, h2, body, where) {
  const sec = section(doc, h2);
  const head = sec.inner.find((b) => b.kind === 'tablehead');
  if (!head) fail(`"${h2}" has no table`);
  const row = asRow(body, head);
  // A "Slices" row is filed by its name, so \`slice row remove\` can undo it within the range.
  return { edit: insert(doc, place(sec, 'row', where), [row]), mid: oneRow(h2), step: h2 === SLICES ? { kind: 'file', section: SLICES, newKey: `row:${rowKey(row)}` } : { kind: 'other' } };
}

function rowSet(doc, h2, match, body) {
  const sec = section(doc, h2);
  const b = only(sec.inner.filter((x) => x.kind === 'row'), match, `${h2} row`);
  const row = asRow(body, sec.inner.find((x) => x.kind === 'tablehead'));
  if (rowKey(row) !== b.key) fail(`a row keeps its name: "${b.key}", not "${rowKey(row)}" (a new slice is \`slice row add\`)`);
  return { target: b, edit: replaceBlock(b, [row]), mid: oneRow(h2), step: { kind: 'other' } };
}

const same = (a, b) => a.kind === b.kind && a.text === b.text && a.h2 === b.h2 && a.h3 === b.h3;

/**
 * Makes an operation's edit and checks it as a transaction: every block before and after the edited
 * lines parses again identically, in the same section, and the edited lines parse to what the operation
 * said they would. Returns the new text.
 */
function transact(doc, { edit, mid }) {
  const out = doc.lines.slice();
  out.splice(edit.at, edit.remove, ...edit.lines);
  const text = out.join('\n') + (doc.eol || !doc.lines.length ? '\n' : '');
  const solid = (bs) => bs.filter((b) => b.kind !== 'blank');
  const before = solid(doc.blocks);
  const prefix = before.filter((b) => b.end <= edit.at);
  const suffix = before.filter((b) => b.start >= edit.at + edit.remove);
  const after = solid(parse(text).blocks);
  const pairs = [...prefix.map((b, k) => [b, after[k]]), ...suffix.map((b, k) => [b, after[after.length - suffix.length + k]])];
  const moved = pairs.find(([b, a]) => !a || !same(b, a));
  if (moved || after.length < prefix.length + suffix.length) {
    const b = moved?.[0];
    fail(`refused: the change would also alter ${b ? `"${first(b)}" (${[b.h2, b.h3].filter(Boolean).join(' › ') || 'the top of the file'})` : 'the blocks around it'}; the text may continue a paragraph or open a block (nothing was written)`);
  }
  if (!mid(after.slice(prefix.length, after.length - suffix.length))) fail('refused: the text does not read back as the one entry it should be (a heading, a lazy line or a blank line inside it?); nothing was written');
  return text;
}

/**
 * Runs one operation on a document's text: { text, id?, step }. A CRLF document keeps its CRLF; one
 * that mixes line endings is refused.
 */
function apply(kind, name, text, args = {}) {
  const op = OPS[name];
  if (!op) fail(`no operation "${name}"`);
  const statusOnly = !name.startsWith('item ');
  if (statusOnly && kind !== 'status') fail(`"${name}" changes docs/STATUS.md only`);
  if (!statusOnly && kind === 'status') fail(`"${name}" changes docs/DEFERRED.md or docs/NATIVE_UNVERIFIED.md, not docs/STATUS.md`);
  const crlf = text.includes('\r\n');
  if (crlf && /(^|[^\r])\n/.test(text)) fail(`${FILE_OF[kind]} mixes line endings (CRLF and LF): the owner's file needs one kind before an operation can keep every other byte`);
  const doc = parse(crlf ? text.replace(/\r\n/g, '\n') : text);
  const made = op(doc, args);
  let out = transact(doc, made);
  if (crlf) out = out.replace(/\n/g, '\r\n');
  const target = made.edit && made.target ? targetOf(made.target) : undefined;
  return { text: out, ...(made.result ?? {}), step: { op: name, file: FILE_OF[kind], ...made.step, ...(target ? { target } : {}) } };
}

// ---------------------------------------------------------------------------------------------------
// Declared operations: a command line as data, its trailer, its sidecar, its replay.

const VALUE_FLAGS = ['--after', '--id', '--reason'];
const BOOL_FLAGS = ['--new', '--top', '--end'];

/** An operation's arguments `{ kind, name, args }` from its words (`argv`, bodies apart). */
function command(argv) {
  const words = [];
  const args = {};
  for (let k = 0; k < argv.length; k++) {
    const a = argv[k];
    if (VALUE_FLAGS.includes(a)) {
      if (k + 1 >= argv.length) fail(`${a} takes a value`);
      args[a.slice(2)] = argv[++k];
    } else if (BOOL_FLAGS.includes(a)) args[{ '--new': 'create', '--top': 'top', '--end': 'end' }[a]] = true;
    else if (a.startsWith('--')) fail(`no flag ${a}`);
    else words.push(a);
  }
  let [group, ...rest] = words;
  let kind = 'status';
  let name;
  if (group === 'deferred' || group === 'native') {
    kind = group;
    if (rest[0] === 'item') rest = rest.slice(1);
    name = `item ${rest.shift() ?? ''}`;
  } else if (group === 'slice') {
    if (rest[0] === 'row') rest = rest.slice(1);
    name = `slice row ${rest.shift() ?? ''}`;
  } else if (group === 'section') {
    name = rest[0] === 'item' ? `section item ${rest[1] ?? ''}` : `section ${rest[0] ?? ''}`;
    rest = rest.slice(rest[0] === 'item' ? 2 : 1);
  } else if (['inbox', 'last-tend', 'open', 'inflight'].includes(group)) {
    name = `${group} ${rest.shift() ?? ''}`;
  } else fail(`no operation "${words.join(' ')}"`);
  if (!OPS[name]) fail(`no operation "${name}"`);
  if (name === 'item add' || name.startsWith('section ')) args.section = rest.shift();
  if (name !== 'item add' && name !== 'section add' && name !== 'section remove' && !/ add$|^last-tend set$/.test(name)) args.match = rest.shift();
  if (name === 'item tag' || name === 'item retag') args.tag = rest.shift();
  if (rest.length) fail(`unexpected words: ${rest.join(' ')} (quote a <match> or <section> with spaces as one argument)`);
  return { kind, name, args };
}

/** Whether an operation writes a body (and so carries one in its sidecar). */
const takesBody = (name) => name !== 'section add' && /\b(add|set|note|split)$/.test(name);
/** Whether an operation takes --intro <file>: a new section's one paragraph. */
const takesIntro = (name, args) => name === 'section add' || (name === 'item add' && args.create);

const sha = (text) => `sha256:${crypto.createHash('sha256').update(text, 'utf8').digest('hex')}`;
/** What an operation acted on, as a hash: an inbox entry's text with its number left out (redo renumbers it). */
const targetOf = (b) => sha(b.id ? b.text.replace(/^([-*+]\s+\*\*)[TG]\d+/, '$1#') : b.text);
const bare = (w) => /^[\w./?+=,@%:-]+$/.test(w) && !w.startsWith('sha256:') && (!w.startsWith('-') || VALUE_FLAGS.includes(w) || BOOL_FLAGS.includes(w));

/** The `Records-Op:` trailer of each operation, in order. */
function trailersOf(ops) {
  return ops.map((op) => {
    const words = op.argv.map((w) => (bare(w) ? w : JSON.stringify(w)));
    if (op.intro !== undefined) words.push('--intro', sha(op.intro));
    if (op.body !== undefined) words.push(sha(op.body));
    return `Records-Op: ${words.join(' ')}`;
  });
}

/** One trailer back as { argv, body?, intro? }, body and intro being their hashes. */
function parseTrailer(line) {
  let s = line.replace(/^Records-Op:\s*/, '');
  const out = { argv: [] };
  let introNext = false;
  while ((s = s.replace(/^\s+/, ''))) {
    let word;
    let quoted = false;
    if (s[0] === '"') {
      const m = /^"(?:[^"\\]|\\.)*"/.exec(s);
      if (!m) fail(`an unclosed quote in the trailer "${line}"`);
      word = JSON.parse(m[0]);
      s = s.slice(m[0].length);
      quoted = true;
    } else {
      word = /^\S+/.exec(s)[0];
      s = s.slice(word.length);
    }
    const hash = !quoted && /^sha256:[0-9a-f]{64}$/.test(word);
    if (introNext) {
      if (!hash) fail(`--intro in a trailer is followed by its sha256: "${line}"`);
      out.intro = word;
      introNext = false;
    } else if (!quoted && word === '--intro') introNext = true;
    else if (hash) out.body = word;
    else out.argv.push(word);
  }
  return out;
}

/** A sidecar: the operations, bodies in plain text. */
const sidecarOf = (ops) =>
  JSON.stringify({ ops: ops.map((o) => ({ argv: o.argv, ...Object.fromEntries(['body', 'intro', 'target', 'number'].filter((k) => o[k] !== undefined).map((k) => [k, o[k]])) })) }, null, 2) + '\n';

function readSidecar(text, where) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    fail(`${where} is not JSON: ${e.message}`);
  }
  const ok = data && Array.isArray(data.ops) && data.ops.every((o) => o && Array.isArray(o.argv) && o.argv.every((w) => typeof w === 'string') && ['body', 'intro', 'target', 'number'].every((k) => o[k] === undefined || typeof o[k] === 'string'));
  if (!ok) fail(`${where} is not { ops: [{ argv, body?, intro?, target?, number? }] }`);
  return data.ops;
}

const render = (op) => trailersOf([op])[0].replace(/^Records-Op: /, '').replace(/ ?(--intro )?sha256:[0-9a-f]{64}/g, '');

/**
 * Replays operations on the documents ({ file: text }): { docs, steps, ledger, removedIds }. An inbox
 * entry is numbered from the ledger and the document as they stand at that point of the replay, so the
 * CLI and the gate number it alike, and a rebase onto a moved main numbers it on from main. `@k` in an
 * operation's arguments is the entry operation k added (a handle, renumbered with it). An operation that
 * recorded its `target` refuses to act on any other entry. `removedIds`: inbox numbers the range removed,
 * which `inbox add --id` may give out again.
 */
function replay(docs, ops, { ledger, unlabelled = false, removedIds = [], notes: given, anyNumber = false, removedText: gone } = {}) {
  const out = { ...docs };
  const led = { lastT: Number(ledger?.lastT) || 0, lastG: Number(ledger?.lastG) || 0 };
  // anyNumber: read back what a commit already did (the notes in history, a merge's side), numbers not judged.
  const removed = anyNumber ? Object.assign(new Set(removedIds), { has: () => true }) : new Set(removedIds);
  // The lines each inbox entry's notes added, from earlier commits (`given`) and these operations.
  const notes = new Map([...(given ?? new Map())].map(([id, ls]) => [id, [...ls]]));
  // The text of each inbox entry the range removed, by number: what a put-back keeps (F34).
  const removedText = new Map(gone ?? []);
  const added = [];
  const steps = [];
  for (const [k, op] of ops.entries()) {
    const label = `operation ${k + 1} (${render(op)})`;
    try {
      const argv = op.argv.map((w) => {
        const h = /^@(\d+)$/.exec(w);
        if (!h) return w;
        const id = added[Number(h[1]) - 1];
        if (!id) fail(`${w} names no entry an earlier inbox add of these operations made`);
        return id;
      });
      const { kind, name, args } = command(argv);
      if (takesBody(name) && op.body === undefined) fail('it writes a body and none was recorded');
      if (!takesBody(name) && op.body !== undefined) fail('it takes no body');
      if (op.intro !== undefined && !takesIntro(name, args)) fail('--intro goes with section add, or item add --new');
      const file = FILE_OF[kind];
      const noted = notes.get(args.match ?? args.id) ?? [];
      const keep = name === 'inbox add' && args.id && removedText.has(args.id) ? removedText.get(args.id).split('\n').slice(1).filter((l) => (notes.get(args.id) ?? []).includes(l)) : [];
      const r = apply(kind, name, out[file] ?? '', { ...args, body: op.body, intro: op.intro, ledger: led, reopen: removed, noted, keep });
      if (op.target !== undefined && r.step.target !== op.target) fail(`its target changed: the entry "${args.match}" names now is not the one it was recorded against (${op.target.slice(0, 19)}…); the document moved under it, so look again and run it anew`);
      out[file] = r.text;
      if (r.letter) led[`last${r.letter}`] = Math.max(led[`last${r.letter}`], r.num);
      added[k] = r.id;
      if (name === 'inbox remove') removed.add(args.match);
      if (r.noted) notes.set(args.match, [...(notes.get(args.match) ?? []), ...r.noted]);
      if (r.gone !== undefined) removedText.set(args.match, r.gone);
      steps.push({ ...r.step, reason: args.reason, label, ...(r.id ? { id: r.id } : {}) });
    } catch (e) {
      if (e instanceof RecordError && !unlabelled) fail(`${label}: ${e.message}`);
      throw e;
    }
  }
  return { docs: out, steps, ledger: led, removedIds: [...removed], notes, removedText };
}

// ---------------------------------------------------------------------------------------------------
// The rules over a range: what the run filed, the caps, the reasons and the tags.

/** What a range's earlier commits filed and removed, carried from commit to commit. */
const newRangeState = () => ({ filed: new Set(), removed: new Map(), added: new Map(), removedIds: new Set(), ownerRemoved: [], loopAdds: [], removedText: new Map(), notes: null });
/** The first words of an item, as a reason must quote them to name it. */
const nameOf = (untaggedText) => untaggedText.slice(0, 40);

const tagMove = (from, to) => (from && from !== to && !RAISED.includes(to) ? `moves the tag [${from}] to ${to ? `[${to}]` : 'no tag'}` : null);
const TAG_RULE = 'a tag moves only toward [owner], [arch] or [kept], never from [owner] or [arch] to [loop] (decision 0156)';

/** The problems of one commit's steps; `state` carries the range's earlier commits and is updated. */
function judge(steps, state) {
  const problems = [];
  const counts = new Map();
  for (const s of steps) {
    const k = (key) => `${s.file}\u0000${key}`;
    const own = s.key !== undefined && state.filed.has(k(s.key));
    const moveKey = s.untagged !== undefined ? k(s.untagged) : null;
    if (s.kind === 'file') {
      state.filed.add(k(s.newKey));
      if (s.newTag === 'loop' && s.untagged !== undefined) {
        for (const o of state.ownerRemoved) {
          if (!(s.reason ?? '').toLowerCase().includes(o.name.toLowerCase())) problems.push(`${s.label} files a [loop] item in a range that removed the [${o.tag}] item "${o.what}": its --reason names that item (quote "${o.name}"), so the owner sees the move (decision 0156)`);
        }
        state.loopAdds.push({ reason: s.reason ?? '', label: s.label });
      }
      if (moveKey) {
        const was = state.removed.get(moveKey);
        const move = was && tagMove(was.tag, s.newTag);
        if (move) problems.push(`${s.label} puts back "${was.what}" and ${move}: ${TAG_RULE}`);
        state.added.set(moveKey, s.newTag);
      }
      continue;
    }
    if (s.onlyOwn && !own) problems.push(`${s.label} removes "${s.what}", which this range did not add: \`slice row remove\` only undoes a row the range added (a fix-forward); every other row is the owner's record (decision 0156)`);
    if (['remove', 'set', 'retag'].includes(s.kind) && !own) {
      const where = s.file === 'docs/STATUS.md' ? s.section : `${s.file} › ${s.section}`;
      counts.set(where, (counts.get(where) ?? 0) + 1);
      if (!s.reason || !s.reason.trim()) problems.push(`${s.label} changes an entry this run did not file ("${s.what}") with no --reason: give one, and it is recorded in the trailer (decision 0156)`);
    }
    if (s.kind === 'set' || s.kind === 'retag') {
      const move = tagMove(s.oldTag, s.newTag);
      if (move) problems.push(`${s.label} ${move} ("${s.what}"): ${TAG_RULE}`);
    }
    if (s.kind === 'split' && s.oldTag) {
      for (const t of s.partTags) {
        const move = tagMove(s.oldTag, t);
        if (move) problems.push(`${s.label} ${move} in a part of "${s.what}": ${TAG_RULE}`);
      }
    }
    if (s.kind === 'remove' && !own && s.key?.startsWith('id:')) state.removedIds.add(s.key.slice(3));
    if (s.kind === 'remove' && !own && moveKey && (s.oldTag === 'owner' || s.oldTag === 'arch')) {
      const o = { tag: s.oldTag, what: s.what, name: nameOf(s.untagged) };
      for (const a of state.loopAdds) {
        if (!a.reason.toLowerCase().includes(o.name.toLowerCase())) problems.push(`${s.label} removes the [${o.tag}] item "${o.what}" in a range that files a [loop] item (${a.label}): that item's --reason names this one (quote "${o.name}"), so the owner sees the move (decision 0156)`);
      }
      state.ownerRemoved.push(o);
    }
    if (s.kind === 'remove' && !own && moveKey && s.oldTag) {
      state.removed.set(moveKey, { tag: s.oldTag, what: s.what });
      if (state.added.has(moveKey)) {
        const move = tagMove(s.oldTag, state.added.get(moveKey));
        if (move) problems.push(`${s.label} removes "${s.what}", which this run added again: it ${move}; ${TAG_RULE}`);
      }
    }
    if (own) {
      state.filed.delete(k(s.key));
      for (const n of s.newKeys ?? (s.newKey !== undefined ? [s.newKey] : [])) state.filed.add(k(n));
    }
  }
  for (const [where, n] of counts) {
    if (n > CAP) problems.push(`at most ${['no', 'one', 'two', 'three'][CAP] ?? CAP} entries this run did not file are removed or rewritten per section per commit (decision 0156); this commit does ${n} in "${where}". Entries leave one at a time, each when it ships or the owner answers it: the rest wait for a later commit or for the owner`);
  }
  return problems;
}

function firstDifference(want, got) {
  const a = want.split('\n');
  const b = got.split('\n');
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  const show = (s) => (s === undefined ? '(the end)' : JSON.stringify(s.length > 100 ? `${s.slice(0, 97)}...` : s));
  return `line ${k + 1} is ${show(b[k])}, the replay gives ${show(a[k])}`;
}

/** A commit's Records-Op trailer lines, as written. */
const trailerLines = (message) => String(message).split('\n').filter((l) => /^Records-Op:/.test(l)).map((l) => l.replace(/\s+$/, ''));

/** Handles (`@k`) of operations moved `off` places on, as when sidecars are read one after another. */
const shifted = (ops, off) => ops.map((o) => ({ ...o, argv: o.argv.map((w) => (/^@\d+$/.test(w) ? `@${Number(w.slice(1)) + off}` : w)) }));

/**
 * The operations a commit declares: { ops } from its sidecar (checked against its trailers) or its
 * bodiless trailers, or { problem }. `lines` are its trailer lines (none: { ops: [] }). Several sidecars
 * (a squash of record commits) are read in the order their trailers come, each one's whole run of
 * trailers in turn (F38).
 */
function declaredOps(lines, sidecar) {
  if (Array.isArray(sidecar)) {
    if (sidecar.length <= 1) return declaredOps(lines, sidecar[0] ?? null);
    let sets;
    try {
      sets = sidecar.map((t, k) => readSidecar(t, `sidecar ${k + 1}`));
    } catch (e) {
      if (e instanceof RecordError) return { problem: e.message };
      throw e;
    }
    const ops = [];
    const used = new Set();
    let pos = 0;
    while (used.size < sets.length) {
      const k = sets.findIndex((set, j) => !used.has(j) && trailersOf(set).every((t, i) => lines[pos + i] === t));
      if (k < 0) return { problem: `its ${sets.length} sidecars do not match its Records-Op trailers read in order (each sidecar's trailers as \`npm run records -- trailers\` printed them, one run after another): from trailer ${pos + 1} on, no sidecar fits` };
      used.add(k);
      ops.push(...shifted(sets[k], ops.length));
      pos += sets[k].length;
    }
    if (pos !== lines.length) return { problem: `its Records-Op trailers name ${lines.length} operations and its sidecars hold ${pos}` };
    return { ops };
  }
  try {
    const declared = lines.map(parseTrailer);
    if (sidecar === null) {
      if (declared.some((d) => d.body || d.intro)) return { problem: 'its Records-Op trailers name bodies (sha256:…) but the commit adds no sidecar under .claude/records/ to hold them: commit the pending sidecar `npm run records` staged' };
      const ops = declared.map((d) => ({ argv: d.argv }));
      const off = ops.findIndex((o, k) => trailersOf([o])[0] !== lines[k]);
      if (off >= 0) return { problem: `trailer ${off + 1} ("${lines[off]}") is not as \`npm run records -- trailers\` prints it ("${trailersOf([ops[off]])[0]}"): a trailer is the script's, never written by hand` };
      return { ops };
    }
    const ops = readSidecar(sidecar, 'the sidecar');
    const want = trailersOf(ops);
    if (want.length !== lines.length) return { problem: `its ${lines.length} Records-Op trailers and the sidecar's ${want.length} operations differ: the trailers are what \`npm run records -- trailers\` prints for the sidecar` };
    for (const [k, w] of want.entries()) {
      if (w === lines[k]) continue;
      const d = declared[k];
      if (JSON.stringify(d.argv) === JSON.stringify(ops[k].argv)) return { problem: `operation ${k + 1}'s body in the sidecar does not hash to its trailer's (${d.body ?? d.intro ?? 'no sha256'}; the sidecar's is ${(/sha256:[0-9a-f]{64}$/.exec(w) ?? ['none'])[0]}): the body changed after the operation ran` };
      return { problem: `trailer ${k + 1} ("${lines[k]}") is not the sidecar's operation ${k + 1} ("${w}"): the trailers are what \`npm run records -- trailers\` prints for the sidecar` };
    }
    return { ops };
  } catch (e) {
    if (e instanceof RecordError) return { problem: e.message };
    throw e;
  }
}

/**
 * The operations that make a change from `base` to `head`, by the sections it touched: what a refusal
 * names so the fix is one line. A part no operation changes is said to be the owner's.
 */
function opsFor(base, head) {
  const out = new Set();
  for (const f of Object.keys(DOCS)) {
    const a = base[f] ?? '';
    const b = head[f] ?? '';
    if (a === b) continue;
    if (f !== 'docs/STATUS.md') {
      out.add(`\`npm run records -- ${DOCS[f]} item add\` (or note, set, remove, tag, retag, split; \`--new\` for a section at the end)`);
      continue;
    }
    let broken = null;
    const rows = new Map();
    const parts = (text, side) => {
      const m = new Map();
      try {
        for (const x of parse(text.replace(/\r\n/g, '\n')).blocks) {
          if (x.kind === 'blank') continue;
          const k = `${x.h2 ?? ''}\u0000${x.h3 ?? ''}`;
          m.set(k, `${m.get(k) ?? ''}\n${x.text}`);
          if (x.kind === 'row' && x.h2 === SLICES) rows.set(`${side}\u0000${x.key}`, x.text);
        }
      } catch (e) {
        if (!(e instanceof RecordError)) throw e;
        broken = e.message;
      }
      return m;
    };
    const pa = parts(a, 'a');
    const pb = parts(b, 'b');
    if (broken) {
      out.add(`no operation, for ${f} does not parse (${broken.split(':')[0]})`);
      continue;
    }
    for (const k of new Set([...pa.keys(), ...pb.keys()])) {
      if (pa.get(k) === pb.get(k)) continue;
      const [h2, h3] = k.split('\u0000');
      if (h2 === SLICES) {
        const keys = (side) => [...rows.keys()].filter((r) => r.startsWith(`${side}\u0000`)).map((r) => r.slice(2));
        const gone = keys('a').filter((key) => !keys('b').includes(key));
        if (gone.length) out.add(`no operation for a "Slices" row removed (${gone.join(', ')}) but \`npm run records -- slice row remove\` of a row this branch added; any other row is the owner's`);
        if (keys('b').some((key) => !keys('a').includes(key) || rows.get(`a\u0000${key}`) !== rows.get(`b\u0000${key}`))) out.add('`npm run records -- slice row add` (or set)');
      }
      else if (h2 === INFLIGHT) out.add('`npm run records -- inflight add` (or set, remove)');
      else if (h2 === OWNER && (h3 === INBOX || h3 === NEXT)) out.add('`npm run records -- inbox add` (or note, set, remove)');
      else if (h2 === OWNER && h3 === LAST) out.add('`npm run records -- last-tend set`');
      else if (h2 === OWNER && h3 === OPEN) out.add('`npm run records -- open add` (or note, set, remove)');
      else if (h2 === OWNER && FROM.test(h3)) out.add('`npm run records -- section add "From <skill>"`, then `section item add` (or note, set, remove)');
      else out.add(`no operation for "${h3 || h2 || 'the top of the file'}" (the owner's part, by hand: leave it, or ask)`);
    }
  }
  return [...out];
}

/** The one-line fix a refusal ends with. */
const fixLine = (ops) =>
  `Fix: make the change with ${ops.length ? ops.join('; ') : '`npm run records -- <op>`'} and commit with the lines \`npm run records -- trailers\` prints (after a rebase conflict, or in a merge: take main's side with \`npm run records -- redo\`); .claude/skills/ship.md, "The record documents"`;

/**
 * One commit's problems. `base` and `head` are its parent's and its own documents ({ file: text }),
 * `message` its message, `sidecar` the text of the sidecar it adds (null, or several), `ledger` the
 * parent's, `notes` the lines earlier commits' `inbox note`s added, by entry (F9; else the range's,
 * `state.notes`), `sha` the commit, for the refusal.
 */
function checkCommit({ base, head, message, sidecar, ledger, state, notes, sha }) {
  const changed = Object.keys(DOCS).filter((f) => (base[f] ?? '') !== (head[f] ?? ''));
  const lines = trailerLines(message);
  if (!lines.length) {
    if (!changed.length) return sidecar === null || (Array.isArray(sidecar) && !sidecar.length) ? [] : ['adds a sidecar under .claude/records/ but names no Records-Op trailer: add the trailers `npm run records -- trailers` prints'];
    const c = sha ? sha.slice(0, 7) : 'the commit';
    return [
      `hand-edits ${changed.join(', ')} with no Records-Op trailer. The record gate is new (decision 0156, since ${LANDED}): agents change these documents only through \`npm run records\`, and a commit made before the gate and rebased onto it is gated too. Fix: drop the hand edit from ${c} (\`git checkout ${c}^ -- ${changed.join(' ')}\` and amend it if it is the last commit, or split it out), then make the change again with ${opsFor(base, head).join('; ')} in a commit of its own, with the lines \`npm run records -- trailers\` prints (\`npm run records -- redo\` lists such commits); .claude/skills/ship.md, "The record documents"`,
    ];
  }
  const d = declaredOps(lines, sidecar);
  if (d.problem) return [d.problem];
  let r;
  try {
    r = replay(base, d.ops, { ledger, removedIds: [...state.removedIds], notes: notes ?? state.notes ?? undefined, removedText: state.removedText });
  } catch (e) {
    if (e instanceof RecordError) return [`its declared operations do not run on the parent's documents: ${e.message}`];
    throw e;
  }
  if (state.notes) state.notes = r.notes;
  for (const [id, text] of r.removedText) state.removedText.set(id, text);
  const problems = [];
  // F33: an operation that acts on an entry carries what it acted on, which only a sidecar records.
  for (const [k, st] of r.steps.entries()) {
    if (st.target !== undefined && d.ops[k].target === undefined) problems.push(`${st.label} acts on an entry but records no target (what it acted on): run it with \`npm run records\`, which records the target in the sidecar, and commit the sidecar; a trailer without a sidecar carries none`);
  }
  for (const file of Object.keys(DOCS)) {
    const want = r.docs[file] ?? '';
    const got = head[file] ?? '';
    if (want === got) continue;
    problems.push(`${file} does not match its declared operations replayed on the parent: ${firstDifference(want, got)}. Any change but the operations' fails. ${fixLine(opsFor(r.docs, head))}`);
  }
  problems.push(...judge(r.steps, state));
  return problems;
}

// ---------------------------------------------------------------------------------------------------
// The shell: git, files, the command line.

function gitIn(cwd) {
  return (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}
function tryGit(git, ...args) {
  try {
    return git(...args);
  } catch {
    return null;
  }
}
const showIn = (git) => (rev, file) => tryGit(git, 'show', `${rev}:${file}`) ?? '';
function ledgerAt(git, rev) {
  try {
    const l = JSON.parse(showIn(git)(rev, LEDGER_REL));
    return { lastT: l.lastT, lastG: l.lastG };
  } catch {
    return null;
  }
}
const docsAt = (git, rev) => Object.fromEntries(Object.keys(DOCS).map((f) => [f, showIn(git)(rev, f)]));
const firstParent = (git, sha) => git('rev-list', '--parents', '-n', '1', sha).trim().split(' ')[1] ?? null;
/** The sidecars a commit adds (their texts, in path order). */
function sidecarsAdded(git, sha) {
  return git('show', '--name-status', '--format=', '--no-renames', sha).split('\n').filter((l) => /^A\t/.test(l) && l.slice(2).startsWith(`${RECORDS_DIR}/`)).map((l) => l.slice(2)).sort().map((f) => showIn(git)(sha, f));
}

/**
 * The lines each inbox entry's `inbox note`s added, by entry, in every commit `rev` holds after the
 * cut-over (F9: an \`inbox set\` keeps them). Each such commit's operations are read back on its parent.
 */
function notesAt(git, rev, cutover = CUTOVER) {
  const hasCutover = tryGit(git, 'cat-file', '-e', `${cutover}^{commit}`) !== null;
  const shas = (tryGit(git, 'rev-list', '--reverse', '--topo-order', '--no-merges', '-E', '--grep', '^Records-Op: inbox note ', rev, ...(hasCutover ? ['--not', cutover] : [])) ?? '').split('\n').filter(Boolean);
  let notes = new Map();
  for (const sha of shas) {
    const parent = firstParent(git, sha);
    if (!parent) continue;
    const d = declaredOps(trailerLines(git('show', '-s', '--format=%B', sha)), sidecarsAdded(git, sha));
    if (d.problem) continue;
    try {
      notes = replay(docsAt(git, parent), d.ops, { ledger: ledgerAt(git, parent), unlabelled: true, anyNumber: true, notes }).notes;
    } catch (e) {
      if (!(e instanceof RecordError)) throw e;
    }
  }
  return notes;
}

/** What `git merge-tree --write-tree` makes of two commits: { tree, conflicted } (tree null when it fails). */
function mergeTree(cwd, a, b) {
  let out = '';
  try {
    out = execFileSync('git', ['merge-tree', '--write-tree', a, b], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    out = e.status === 1 ? String(e.stdout ?? '') : ''; // 1: conflicts; the tree is still written
  }
  const lines = out.split('\n');
  const tree = /^[0-9a-f]{40}$/.test(lines[0].trim()) ? lines[0].trim() : null;
  const conflicted = new Set(lines.map((l) => /^\d{6} [0-9a-f]{40} [123]\t(.+)$/.exec(l)?.[1]).filter(Boolean));
  return { tree, conflicted };
}

/** A three-way merge of one text (`git merge-file`), or null on a conflict. */
function merge3(current, base, other) {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'records-'));
  try {
    const [c, b, o] = ['current', 'base', 'other'].map((n, k) => {
      const f = path.join(dir, n);
      fs.writeFileSync(f, [current, base, other][k]);
      return f;
    });
    return execFileSync('git', ['merge-file', '-p', c, b, o], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * F29: whether `sha` is the exact revert of the commits its message names ("This reverts commit <X>."),
 * each an ancestor: no trailer of its own, its documents the parent's with each X's change undone (as
 * `git revert` makes them), and its sidecars exactly the ones the X added, deleted.
 */
function exactRevert(git, sha, parent, message, files, ancestor) {
  const xs = [...String(message).matchAll(/^This reverts commit ([0-9a-f]{40})\b/gm)].map((m) => m[1]);
  if (!xs.length || trailerLines(message).length || !xs.every((x) => ancestor(x, parent))) return false;
  const sidecars = files.filter((f) => f.file.startsWith(`${RECORDS_DIR}/`));
  const want = new Set(xs.flatMap((x) => git('show', '--name-status', '--format=', '--no-renames', x).split('\n').filter((l) => /^A\t/.test(l) && l.slice(2).startsWith(`${RECORDS_DIR}/`)).map((l) => l.slice(2))));
  if (sidecars.some((f) => f.status !== 'D' || !want.has(f.file)) || sidecars.length !== want.size) return false;
  const head = docsAt(git, sha);
  for (const order of [xs, [...xs].reverse()]) {
    const docs = docsAt(git, parent);
    let ok = true;
    for (const x of order) {
      const after = docsAt(git, x);
      const before = docsAt(git, `${x}^`);
      for (const f of Object.keys(DOCS)) {
        if (after[f] === before[f]) continue;
        const m = merge3(docs[f], after[f], before[f]);
        if (m === null) ok = false;
        else docs[f] = m;
      }
    }
    if (ok && Object.keys(DOCS).every((f) => docs[f] === head[f])) return true;
  }
  return false;
}

/**
 * The gate over a range (any `git rev-list` spec), oldest first: { results, ok, state, stats }. Each
 * commit after the cut-over that touches the documents or a sidecar, or names a Records-Op trailer, is
 * replayed; with `loopOnly` (CI), only the loop's commits (`tend …`, `Revert "tend …"`) and every agent
 * commit (a Claude-Session or Co-Authored-By: Claude trailer): the owner's own commits are not gated.
 * The exact revert of earlier commits passes. A merge that descends from the gate and whose documents
 * differ from any parent's passes only when each document is git's clean merge or the second parent's
 * (main's side, which `redo` writes during a merge); otherwise it fails when it is an agent's commit
 * or the range holds a loop or agent commit, and is noted when not. A shallow clone's boundary commit
 * is noted and skipped. The notes history (F9) is read once per range and carried forward.
 */
function gateRange(range, { cwd = ROOT, loopOnly = false, cutover = CUTOVER, state = newRangeState() } = {}) {
  const git = gitIn(cwd);
  const shas = git('rev-list', '--reverse', '--topo-order', range).split('\n').filter(Boolean);
  const messages = new Map();
  for (const rec of (shas.length ? git('log', '--no-walk=unsorted', '--format=%H%x1f%B%x1e', ...shas) : '').split('\x1e')) {
    const [h, body] = rec.replace(/^\n/, '').split('\x1f');
    if (h && /^[0-9a-f]{40}$/.test(h)) messages.set(h, body ?? '');
  }
  const messageOf = (sha) => messages.get(sha) ?? git('show', '-s', '--format=%B', sha);
  const subjectOf = (sha) => messageOf(sha).split('\n')[0].trim();
  const anyLoop = shas.some((s) => LOOP.test(subjectOf(s)));
  const anyAgent = shas.some((s) => isAgent(messageOf(s)));
  const stats = { notesReads: 0 };
  const hasCutover = tryGit(git, 'cat-file', '-e', `${cutover}^{commit}`) !== null;
  const ancestor = (a, b) => a === b || tryGit(git, 'merge-base', '--is-ancestor', a, b) !== null;
  // The commits whose scripts/records.js changed how often it says the marker: the gate's landing among them.
  const markers = shas.length ? (tryGit(git, 'log', '--format=%H', '-S', GATE_MARK, shas[shas.length - 1], '--', 'scripts/records.js') ?? '').split('\n').filter(Boolean) : [];
  const holds = new Map();
  const holdsGate = (rev) => {
    if (!holds.has(rev)) holds.set(rev, showIn(git)(rev, 'scripts/records.js').includes(GATE_MARK));
    return holds.get(rev);
  };
  /** 'history', 'gated', or 'dropped' (a descendant of the gate whose parent no longer holds it). */
  const era = (sha, parent) => {
    if (hasCutover && ancestor(sha, cutover)) return 'history';
    if (holdsGate(parent)) return 'gated';
    return markers.some((m) => holdsGate(m) && ancestor(m, parent)) ? 'dropped' : 'history';
  };
  let shallow = new Set();
  const shallowFile = tryGit(git, 'rev-parse', '--git-path', 'shallow');
  if (shallowFile) {
    const p = path.resolve(cwd, shallowFile.trim());
    if (fs.existsSync(p)) shallow = new Set(fs.readFileSync(p, 'utf8').split('\n').filter(Boolean));
  }
  const results = [];
  for (const sha of shas) {
    const subj = subjectOf(sha);
    const message = messageOf(sha);
    const parents = git('rev-list', '--parents', '-n', '1', sha).trim().split(' ').slice(1);
    const res = { sha, subject: subj, problems: [], notices: [] };
    if (parents.length > 1) {
      // Touched: a document that differs from any parent's (F27); history only when no parent descends from the gate (F28).
      const mine = docsAt(git, sha);
      const sides = parents.map((p) => docsAt(git, p));
      const touched = Object.keys(DOCS).filter((f) => sides.some((d) => d[f] !== mine[f]));
      if (!touched.length || parents.every((p) => era(sha, p) === 'history')) continue;
      let ok = false;
      if (parents.length === 2) {
        const mt = mergeTree(cwd, parents[0], parents[1]);
        ok = touched.every((f) => (mt.tree && !mt.conflicted.has(f) && showIn(git)(mt.tree, f) === mine[f]) || sides[1][f] === mine[f]);
      }
      if (ok) continue;
      const why = `a merge whose ${touched.join(', ')} ${parents.length > 2 ? 'joins more than two parents' : "is neither git's clean merge nor main's side (the second parent's): a hand resolution, which cannot be replayed"}`;
      const fix = "Fix: during the merge run `npm run records -- redo` (it writes main's side of the documents), commit the merge, then file the branch's entries again with `npm run records` in a commit of its own; .claude/skills/ship.md, \"The record documents\"";
      if (isAgent(message)) res.problems.push(`${why}, and it is an agent's commit. ${fix}`);
      else if (anyLoop || anyAgent) res.problems.push(`${why}, in a push that holds ${anyLoop ? 'loop' : 'agent'} commits. ${fix}`);
      else res.notices.push(`${why}; not gated: no Claude trailer on it and no agent or loop commit in the push (the owner's merge)`);
      results.push(res);
      continue;
    }
    const files = git('show', '--name-status', '--format=', '--no-renames', sha).split('\n').filter(Boolean).map((l) => {
      const [status, file] = l.split('\t');
      return { status: status[0], file };
    });
    const sidecars = files.filter((f) => f.file.startsWith(`${RECORDS_DIR}/`));
    if (!files.some((f) => DOCS[f.file]) && !sidecars.length && !/^Records-Op:/m.test(message)) continue;
    if (!parents.length) {
      if (shallow.has(sha)) {
        res.notices.push("a shallow clone's boundary commit: its parent is not fetched, so it is not replayed");
        results.push(res);
      }
      continue;
    }
    const parent = parents[0];
    const when = era(sha, parent);
    if (when === 'history') continue;
    const added = sidecars.filter((x) => x.status === 'A');
    const run = () => {
      // F9 and F34: the notes history, read once in the range when an operation first needs it.
      if (!state.notes && /^Records-Op: inbox (set |add .*--id )/m.test(message)) {
        state.notes = notesAt(git, parent, cutover);
        stats.notesReads++;
      }
      return checkCommit({ base: docsAt(git, parent), head: docsAt(git, sha), message, sidecar: added.map((x) => showIn(git)(sha, x.file)), ledger: ledgerAt(git, parent), state, sha });
    };
    if (loopOnly && !LOOP.test(subj) && !isAgent(message)) {
      // The owner's own commit: not gated; but what it filed is the run's, as the CLI reads it.
      if (/^Records-Op:/m.test(message)) run();
      continue;
    }
    if (exactRevert(git, sha, parent, message, files, ancestor)) continue;
    if (when === 'dropped') res.problems.push(`its parent's scripts/records.js no longer holds the gate ("${GATE_MARK}"): a commit made after the gate is replayed whatever its parent says; the gate is never loosened by a commit`);
    for (const f of sidecars.filter((x) => x.status !== 'A')) res.problems.push(`changes another commit's sidecar ${f.file}: a sidecar is added once, with its commit, and never changed or removed (but by the exact revert of its commit, "This reverts commit <sha>." in the message)`);
    res.problems.push(...run());
    results.push(res);
  }
  return { results, ok: results.every((r) => !r.problems.length), state, stats };
}

/** The pending sidecar: the one file under .claude/records/ that HEAD does not hold. */
function pendingSidecar() {
  const dir = path.join(ROOT, RECORDS_DIR);
  if (!fs.existsSync(dir)) return null;
  const git = gitIn(ROOT);
  const listed = (rev) => (tryGit(git, 'ls-tree', '-r', '--name-only', rev, '--', `${RECORDS_DIR}/`) ?? '').split('\n').filter(Boolean);
  // During a merge, the other side's committed sidecars are in the tree too: none of them is pending.
  const inHead = new Set([...listed('HEAD'), ...(tryGit(git, 'rev-parse', '-q', '--verify', 'MERGE_HEAD') ? listed('MERGE_HEAD') : [])]);
  const pending = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => `${RECORDS_DIR}/${f}`).filter((f) => !inHead.has(f));
  if (pending.length > 1) fail(`several pending sidecars (${pending.join(', ')}): one commit holds one; remove the stray one`);
  if (!pending.length) return null;
  return { rel: pending[0], ops: readSidecar(fs.readFileSync(path.join(ROOT, pending[0]), 'utf8'), pending[0]) };
}

function newSidecarPath() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  return `${RECORDS_DIR}/${stamp}-${crypto.randomBytes(4).toString('hex')}.json`;
}

const workingDocs = () => Object.fromEntries(Object.keys(DOCS).map((f) => [f, fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '']));

/** HEAD's ledger, as the gate reads the parent's; the working one where HEAD has none. */
function headLedger() {
  const l = ledgerAt(gitIn(ROOT), 'HEAD');
  if (l) return l;
  try {
    const w = JSON.parse(fs.readFileSync(path.join(ROOT, LEDGER_REL), 'utf8'));
    return { lastT: w.lastT, lastG: w.lastG };
  } catch {
    return null;
  }
}

/** What this branch's earlier commits filed: the range since its merge base with origin/main. */
function branchState() {
  const base = tryGit(gitIn(ROOT), 'merge-base', 'origin/main', 'HEAD');
  if (!base) return newRangeState();
  return gateRange(`${base.trim()}..HEAD`, { cwd: ROOT }).state;
}

/** Writes the ledger's lastT and lastG up to the replay's, touching only those numbers. */
function bumpLedger(led) {
  const p = path.join(ROOT, LEDGER_REL);
  if (!fs.existsSync(p)) return;
  let raw = fs.readFileSync(p, 'utf8');
  const cur = JSON.parse(raw);
  for (const key of ['lastT', 'lastG']) {
    if (!(led[key] > (Number(cur[key]) || 0))) continue;
    const re = new RegExp(`("${key}"\\s*:\\s*)\\d+`);
    raw = re.test(raw) ? raw.replace(re, `$1${led[key]}`) : JSON.stringify({ ...JSON.parse(raw), [key]: led[key] }, null, 2) + '\n';
  }
  fs.writeFileSync(p, raw);
}

function runOperation(argv) {
  const opArgv = [];
  let body;
  let intro;
  for (let k = 0; k < argv.length; k++) {
    if (argv[k] === '--file' || argv[k] === '--intro') {
      const f = argv[k + 1];
      if (!f) fail(`${argv[k]} names a file`);
      const text = fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');
      if (argv[k] === '--file') body = text;
      else intro = text;
      k++;
    } else opArgv.push(argv[k]);
  }
  const { kind, name } = command(opArgv);
  if (takesBody(name) && body === undefined) {
    if (process.stdin.isTTY) fail('give the text with --file <path> or on stdin');
    body = fs.readFileSync(0, 'utf8');
  }
  // The documents must be HEAD's with the pending operations run on them, so the gate's replay of
  // this commit comes out as the working tree does.
  const state = branchState();
  const pend = pendingSidecar();
  const headDocs = docsAt(gitIn(ROOT), 'HEAD');
  const notes = name === 'inbox set' || (name === 'inbox add' && opArgv.includes('--id')) ? notesAt(gitIn(ROOT), 'HEAD') : undefined;
  const r = replay(headDocs, pend?.ops ?? [], { ledger: headLedger(), removedIds: [...state.removedIds], notes, removedText: state.removedText });
  const working = workingDocs();
  const off = Object.keys(DOCS).filter((f) => r.docs[f] !== working[f]);
  if (off.length) fail(`${off.join(', ')} differ${off.length === 1 ? 's' : ''} from HEAD plus the pending operations (an edit by hand?): restore with \`git checkout HEAD -- ${off.join(' ')}\` and \`npm run records -- redo\`, then run this operation again`);
  // An entry these pending operations added is named by its handle, which a redo renumbers with it.
  if (name.startsWith('inbox ') && name !== 'inbox add') {
    const k = r.steps.findIndex((st) => st.op === 'inbox add' && st.id === opArgv[2]);
    if (k >= 0) opArgv[2] = `@${k + 1}`;
  }
  const op = { argv: opArgv, ...(body !== undefined ? { body } : {}), ...(intro !== undefined ? { intro } : {}) };
  const next = replay(headDocs, [...(pend?.ops ?? []), op], { ledger: headLedger(), unlabelled: true, removedIds: [...state.removedIds], notes, removedText: state.removedText });
  const step = next.steps[next.steps.length - 1];
  if (step.target) op.target = step.target;
  if (step.id) op.number = step.id;
  const problems = judge(next.steps, state);
  if (problems.length) fail(`refused, nothing was written:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  const file = FILE_OF[kind];
  fs.writeFileSync(path.join(ROOT, file), next.docs[file]);
  bumpLedger(next.ledger);
  const rel = pend?.rel ?? newSidecarPath();
  fs.mkdirSync(path.join(ROOT, RECORDS_DIR), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), sidecarOf([...(pend?.ops ?? []), op]));
  tryGit(gitIn(ROOT), 'add', '--', rel);
  console.log(`records: ${name}${step.id ? ` ${step.id}` : ''} in ${file} (recorded in ${rel}; \`npm run records -- trailers\` for the commit)`);
  return 0;
}

/**
 * The pending operations run again on HEAD's documents (after taking main's side of a conflict, in
 * the commit being rebased). Only the documents they touch are written; another that differs from
 * HEAD is an edit by hand, and refused. A target that changed refuses; an inbox entry renumbers.
 */
function redo() {
  const git0 = gitIn(ROOT);
  const mergeHead = tryGit(git0, 'rev-parse', '-q', '--verify', 'MERGE_HEAD');
  if (mergeHead) return redoMerge(git0, mergeHead.trim());
  const pend = pendingSidecar();
  if (!pend) {
    // F30: what a session reaching for redo usually has is a committed hand edit (a commit from before the gate, rebased onto it).
    const base = tryGit(git0, 'merge-base', 'origin/main', 'HEAD');
    const hand = base ? gateRange(`${base.trim()}..HEAD`, { cwd: ROOT, loopOnly: true }).results.filter((x) => x.problems.some((p) => /no Records-Op trailer/.test(p))) : [];
    if (hand.length) fail(`nothing pending to run again; but ${hand.length === 1 ? 'this commit hand-edits' : 'these commits hand-edit'} the record documents, which redo cannot mend:\n${hand.map((x) => `${x.sha.slice(0, 7)} ${x.subject}\n  ${x.problems.find((p) => /no Records-Op trailer/.test(p))}`).join('\n')}`);
    fail('nothing pending: no sidecar under .claude/records/ that HEAD lacks (a committed record is not redone: see ship.md)');
  }
  const git = gitIn(ROOT);
  const head = docsAt(git, 'HEAD');
  const r = replay(head, pend.ops, { ledger: headLedger(), removedIds: [...branchState().removedIds] });
  const touched = new Set(r.steps.map((st) => st.file));
  const working = workingDocs();
  const hand = Object.keys(DOCS).filter((f) => !touched.has(f) && working[f] !== head[f]);
  if (hand.length) fail(`${hand.join(', ')} differ${hand.length === 1 ? 's' : ''} from HEAD and no pending operation touches ${hand.length === 1 ? 'it' : 'them'}: an edit by hand, left as it is; restore it with \`git checkout HEAD -- ${hand.join(' ')}\` and redo`);
  for (const f of touched) fs.writeFileSync(path.join(ROOT, f), r.docs[f]);
  bumpLedger(r.ledger);
  for (const [k, st] of r.steps.entries()) if (pend.ops[k].number && st.id && st.id !== pend.ops[k].number) console.log(`records: ${pend.ops[k].number} is ${st.id} now (main gave out ${pend.ops[k].number} meanwhile)`);
  console.log(`records: ${pend.ops.length} pending operation${pend.ops.length === 1 ? '' : 's'} run again on HEAD's documents (${pend.rel})`);
  return 0;
}

/**
 * During a merge (MERGE_HEAD): main's side. The merged-in side's three documents, exactly, are written and
 * staged, whatever the conflict left: the gate accepts a merge's documents as git's clean merge or as the
 * second parent's. This branch's record commits since the merge base are listed, to be filed again with
 * `npm run records` in a commit after the merge.
 */
function redoMerge(git, mergeHead) {
  if (pendingSidecar()) fail('a merge carries no operations of its own: commit the pending sidecar\'s operations before merging, or drop them');
  const theirs = docsAt(git, mergeHead);
  for (const f of Object.keys(DOCS)) fs.writeFileSync(path.join(ROOT, f), theirs[f]);
  tryGit(git, 'add', '--', ...Object.keys(DOCS));
  let ledgerNote = '';
  try {
    JSON.parse(fs.readFileSync(path.join(ROOT, LEDGER_REL), 'utf8'));
  } catch {
    const l = showIn(git)(mergeHead, LEDGER_REL);
    if (l) {
      fs.writeFileSync(path.join(ROOT, LEDGER_REL), l);
      tryGit(git, 'add', '--', LEDGER_REL);
      ledgerNote = ` The ledger did not parse (a conflict): it is ${mergeHead.slice(0, 7)}'s too.`;
    }
  }
  const base = tryGit(git, 'merge-base', 'HEAD', mergeHead)?.trim();
  const mine = base ? git('rev-list', '--reverse', '--topo-order', '--no-merges', `${base}..HEAD`).split('\n').filter(Boolean) : [];
  const again = mine.map((sha) => ({ sha, message: git('show', '-s', '--format=%B', sha) })).filter((c) => trailerLines(c.message).length);
  console.log(`records: the merge's documents are ${mergeHead.slice(0, 7)}'s (main's side), staged.${ledgerNote} Commit the merge, then file this branch's entries again with \`npm run records\` in a commit of its own${again.length ? ', as these commits did:' : ' (this branch recorded none since the merge base).'}`);
  for (const c of again) {
    console.log(`  ${c.sha.slice(0, 7)} ${c.message.split('\n')[0]}`);
    for (const t of trailerLines(c.message)) console.log(`    npm run records -- ${t.replace(/^Records-Op: /, '').replace(/ ?(--intro )?sha256:[0-9a-f]{64}/g, '')}`);
  }
  return 0;
}

function trailers() {
  const pend = pendingSidecar();
  if (!pend || !pend.ops.length) {
    console.error('records: nothing pending');
    return 0;
  }
  console.log(trailersOf(pend.ops).join('\n'));
  return 0;
}

/** Prints a gate's results; returns the problems' count. */
function report(results) {
  let bad = 0;
  for (const r of results) {
    for (const n of r.notices) console.log(`check:records: ${r.sha.slice(0, 7)} ${r.subject}: ${n}`);
    for (const p of r.problems) {
      bad++;
      console.error(`${r.sha.slice(0, 7)} ${r.subject}\n  ${p}`);
    }
  }
  return bad;
}

const RULE = 'Agents change docs/STATUS.md, docs/DEFERRED.md and docs/NATIVE_UNVERIFIED.md only through `npm run records` (decision 0156).';

function verify(argv) {
  const spec = argv.find((a) => !a.startsWith('--'));
  const git = gitIn(ROOT);
  if (spec && spec.includes('..')) {
    const g = gateRange(spec, { cwd: ROOT });
    if (report(g.results)) {
      console.error(RULE);
      return 1;
    }
    console.log(`check:records: ${spec}: every commit is its declared operations.`);
    return 0;
  }
  const base = spec ? git('merge-base', spec, 'HEAD').trim() : git('rev-parse', 'HEAD').trim();
  const head = git('rev-parse', 'HEAD').trim();
  const g = base === head ? { results: [], state: newRangeState() } : gateRange(`${base}..HEAD`, { cwd: ROOT });
  let bad = report(g.results);
  const pend = pendingSidecar();
  const ops = pend?.ops ?? [];
  const problems = checkCommit({ base: docsAt(git, 'HEAD'), head: workingDocs(), message: trailersOf(ops).join('\n'), sidecar: pend ? sidecarOf(ops) : null, ledger: headLedger(), state: g.state });
  for (const p of problems) {
    bad++;
    console.error(`the working tree${pend ? ` (pending: ${pend.rel})` : ''}\n  ${p}`);
  }
  if (bad) {
    console.error(RULE);
    return 1;
  }
  console.log(`check:records: the commits since ${base.slice(0, 7)} and the working tree are their declared operations${ops.length ? ` (${ops.length} pending: \`npm run records -- trailers\`)` : ''}.`);
  return 0;
}

const USAGE = "usage: npm run records -- <operation> | trailers | redo (scripts/records.js's header lists them), or npm run check:records -- <range>";

function main(argv) {
  const [group] = argv;
  if (!group) {
    console.error(USAGE);
    return 2;
  }
  if (group === 'verify') return verify(argv.slice(1));
  if (group === 'trailers') return trailers();
  if (group === 'redo') return redo();
  return runOperation(argv);
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    if (!(e instanceof RecordError)) throw e;
    console.error(`records: ${e.message}`);
    process.exitCode = 1;
  }
}

module.exports = { DOCS, TAGS, CAP, CUTOVER, LOOP, LEDGER_REL, RECORDS_DIR, RecordError, isAgent, parse, transact, apply, command, replay, trailersOf, parseTrailer, sidecarOf, newRangeState, judge, checkCommit, opsFor, gateRange };
