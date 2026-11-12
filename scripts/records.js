#!/usr/bin/env node
// The record documents, changed only by transactions (decision 0156):
//
//   docs/STATUS.md, docs/DEFERRED.md and docs/NATIVE_UNVERIFIED.md stay markdown the owner reads and
//   edits by hand. Agents change them only through the operations below. Each one parses the document
//   into blocks (a heading, a paragraph, a bullet with its indented lines, a table row), makes its one
//   change, parses the result again and refuses to write unless every other block is byte-identical.
//   `verify` reads a diff the same way and fails any change that is not a sequence of whole operations.
//
//   npm run records -- inbox add [--id T19] [--file f]      a T or G entry (its id written T? or G?, or
//                                                           given), numbered on from the ledger's lastT/lastG
//   npm run records -- inbox note <id> [--file f]           indented lines appended to an entry
//   npm run records -- inbox set <id> [--file f]            an entry rewritten as the owner reshaped it
//   npm run records -- inbox remove <id>
//   npm run records -- last-tend set [--file f]             the "Last tend" body, its heading kept
//   npm run records -- open add [--end | --after <match>] [--file f]   a bullet of "Open before the
//                                                           loop", newest first unless --end or --after
//   npm run records -- open note|remove <match>
//   npm run records -- inflight add [--end | --after <m>] | inflight set|remove <match>   a row of
//                                                           "In flight", newest first
//   npm run records -- slice row add [--top | --after <m>] | slice row set <match>      a row of "Slices"
//   npm run records -- deferred|native item add <section> [--new [--intro f]] [--file f]
//                                                           a bullet (--new: in a new section, --intro its paragraph)
//                                                           (--top or --after <match> to place it)
//   npm run records -- deferred|native item remove|note <match> [--file f]
//   npm run records -- deferred|native item split <match> [--file f]   one bullet into several, every
//                                                           word kept (/tend triage)
//   npm run records -- deferred|native item tag <match> <loop|owner|arch|phone|kept>
//   npm run records -- verify [<base>..<head> | <rev>]      (npm run check:records) the diff from the merge
//                                                           base is whole operations only; with one rev, the
//                                                           working tree against its merge base with HEAD
//
// Text comes from --file or stdin, so nothing needs shell quoting. <match> is text that must occur in
// exactly one block of the operation's scope. Plain Node, no dependencies; the decisions are exported
// for src/lib/__tests__/arch/records.test.ts. scripts/tend.js runs `verify` on every loop commit.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LEDGER_REL = '.claude/skills/tend/ledger.json';
const DOCS = { 'docs/STATUS.md': 'status', 'docs/DEFERRED.md': 'deferred', 'docs/NATIVE_UNVERIFIED.md': 'native' };
const FILE_OF = Object.fromEntries(Object.entries(DOCS).map(([f, k]) => [k, f]));
const TAGS = ['loop', 'owner', 'arch', 'phone', 'kept'];

// STATUS.md's parts that operations change. Everything else in it is the owner's, by hand.
const INBOX = 'From /tend';
const NEXT = 'Next evolutions';
const LAST = 'Last tend';
const OPEN = 'Open before the loop';
const SLICES = 'Slices';
const INFLIGHT = 'In flight';
const BRANCHES = 'Branches';
// A section emptied by one change, when it held this many entries, is the failure the gate exists for.
const EMPTIED_AT = 3;
const PLACEHOLDER = /^Nothing (open|filed yet)\b[^\n]*$/;

const STOP = new Set(['the', 'and', 'for', 'with', 'its', 'but', 'not', 'are', 'was', 'from', 'that', 'this', 'has', 'have', 'into', 'when', 'than', 'then', 'one', 'all', 'any', 'out', 'off']);
/** An item's words, its marker, checkbox and tag left out. */
function tokens(text) {
  const p = itemParts(text);
  const body = p ? p.rest : text;
  return new Set(body.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}
const content = (text) => new Set([...tokens(text)].filter((w) => w.length >= 3 && !STOP.has(w)));

/**
 * Whether one bullet reads as the other rewritten: most of the shorter one's words (and three, when
 * it has three) in the longer, so a bullet cut short counts as rewritten too. Short words and the
 * commonest ones are not counted.
 */
function similar(a, b) {
  const A = content(a);
  const B = content(b);
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  const shorter = Math.min(A.size, B.size);
  return both >= 1 && both >= Math.min(3, shorter) && both / Math.max(shorter, 1) >= 0.7;
}

/** Whether `parts` are `whole` split into bullets, every word of it kept (`/tend triage`). */
function splitOf(whole, parts) {
  if (parts.length < 2) return false;
  const all = new Set(parts.flatMap((x) => [...tokens(x.text)]));
  return [...tokens(whole.text)].every((w) => all.has(w));
}

// ---------------------------------------------------------------------------------------------------
// Parsing: a document is a list of blocks whose texts, joined by newlines, are the document.

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const ITEM = /^([-*+]|\d+[.)])\s+/;
const FENCE = /^\s*(```|~~~)/;
const ROW = /^\|/;
const SEPARATOR = /^\|[\s:|-]+\|?\s*$/;
const ID = /^[-*+]\s+\*\*([TG])(\d+)\b/;

const starts = (line) => HEADING.test(line) || ITEM.test(line) || ROW.test(line) || FENCE.test(line);

/**
 * Blocks: heading, blank (a run of empty lines), item (a bullet or numbered item with every indented or
 * lazy line under it, fences inside included), row (one table row), tablehead (a header row and its
 * separator), fence, para. Each carries its line range and the H2 and H3 it sits under.
 */
function parse(text) {
  const eol = text.endsWith('\n');
  const body = eol ? text.slice(0, -1) : text;
  const lines = text === '' ? [] : body.split('\n');
  const blocks = [];
  let h2 = null;
  let h3 = null;
  let i = 0;
  const push = (kind, start, end, extra = {}) => {
    const b = { kind, start, end, text: lines.slice(start, end).join('\n'), h2, h3, ...extra };
    if (kind === 'item') {
      const m = ID.exec(b.text);
      if (m) b.id = m[1] + m[2];
    }
    blocks.push(b);
  };
  const fenceEnd = (from) => {
    // `from` opens a fence; returns the index after its closing line (or the end of the document).
    const mark = FENCE.exec(lines[from])[1];
    let j = from + 1;
    while (j < lines.length && !(FENCE.test(lines[j]) && lines[j].trim().startsWith(mark))) j++;
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
    const h = HEADING.exec(line);
    if (h) {
      const level = h[1].length;
      if (level <= 2) h3 = null;
      if (level === 2) h2 = h[2];
      if (level === 1) h2 = null;
      if (level === 3) h3 = h[2];
      i++;
      push('heading', start, i, { level, title: h[2] });
      continue;
    }
    if (FENCE.test(line) && !/^\s/.test(line)) {
      i = fenceEnd(i);
      push('fence', start, i);
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
          if (j < lines.length && /^\s+\S/.test(lines[j])) { i = j; continue; }
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
    while (i < lines.length && lines[i].trim() !== '' && !starts(lines[i])) i++;
    push('para', start, i);
  }
  return { blocks, lines, eol };
}

/** A table row's key: its first cell, up to a parenthesis (a slice's name). */
function rowKey(line) {
  const cell = line.split('|')[1] ?? '';
  return cell.replace(/\(.*$/, '').replace(/`/g, '').trim();
}

const where = (b) => [b.h2, b.h3].filter(Boolean).join(' › ') || '(top of the file)';
const first = (b) => {
  const l = b.text.split('\n')[0];
  return l.length > 110 ? `${l.slice(0, 107)}...` : l;
};

/** The marker, an optional checkbox, an optional tag, and the rest of an item's first line. */
function itemParts(text) {
  const m = /^([-*+]|\d+[.)])(\s+)(\[[ xX]\]\s+)?(\[(\w+)\]\s+)?/.exec(text);
  if (!m) return null;
  return { marker: m[1] + m[2] + (m[3] ?? ''), tag: m[5] ?? null, rest: text.slice(m[0].length) };
}

// ---------------------------------------------------------------------------------------------------
// Comparing two versions of a document: which whole operations lead from one to the other.

/** The longest common subsequence of two lists of strings, as pairs of indices. */
function lcs(a, b) {
  const n = a.length;
  const m = b.length;
  // Trim the common head and tail first: a record change touches a few blocks of hundreds.
  let lo = 0;
  while (lo < n && lo < m && a[lo] === b[lo]) lo++;
  let hi = 0;
  while (hi < n - lo && hi < m - lo && a[n - 1 - hi] === b[m - 1 - hi]) hi++;
  const A = a.slice(lo, n - hi);
  const B = b.slice(lo, m - hi);
  const w = B.length + 1;
  const t = new Uint32Array((A.length + 1) * w);
  for (let i = A.length - 1; i >= 0; i--) {
    for (let j = B.length - 1; j >= 0; j--) {
      t[i * w + j] = A[i] === B[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    }
  }
  const pairs = [];
  for (let k = 0; k < lo; k++) pairs.push([k, k]);
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { pairs.push([lo + i, lo + j]); i++; j++; }
    else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) i++;
    else j++;
  }
  for (let k = 0; k < hi; k++) pairs.push([n - hi + k, m - hi + k]);
  return pairs;
}

const OPS_HELP = {
  inbox: 'npm run records -- inbox add|note|set|remove …',
  last: 'npm run records -- last-tend set --file <f>',
  open: 'npm run records -- open add|note|remove …',
  inflight: 'npm run records -- inflight add|set|remove …',
  slice: 'npm run records -- slice row add|set …',
  item: (kind) => `npm run records -- ${kind} item add|remove|tag|note …`,
};

/** Where in STATUS.md a block sits, as the operations name the parts. */
function statusPart(b) {
  if (b.h2 === 'Needs the owner' && [INBOX, NEXT, LAST, OPEN].includes(b.h3)) return b.h3;
  if ([SLICES, INFLIGHT, BRANCHES].includes(b.h2) && b.kind === 'row') return b.h2;
  return null;
}

/**
 * The changes from `base` to `head` of one record document (`kind`: status, deferred or native), as
 * the operations they are (`ops`) and what no operation does (`violations`, each with the block, the
 * kind of change and how to make it properly). `fresh` holds block texts an earlier commit of the same
 * run added: those may be rewritten or removed (a run amends what it filed). `last` is the ledger's
 * { T, G } at the base, so a retired entry number is not given out again.
 */
function compare(base, head, { kind, fresh = new Set(), last = {} } = {}) {
  const B = parse(base).blocks.filter((b) => b.kind !== 'blank');
  const H = parse(head).blocks.filter((b) => b.kind !== 'blank');
  const ops = [];
  const violations = [];
  const bad = (b, change, fix) => violations.push({ where: where(b), block: first(b), change, fix });
  const pairs = lcs(B.map((b) => b.text), H.map((b) => b.text));
  const keptB = new Set(pairs.map(([i]) => i));
  const keptH = new Set(pairs.map(([, j]) => j));

  // Regions of change between kept blocks: what went and what came in each.
  const regions = [];
  let pi = 0;
  let pj = 0;
  for (const [i, j] of [...pairs, [B.length, H.length]]) {
    const dels = [];
    const ins = [];
    for (let x = pi; x < i; x++) if (!keptB.has(x)) dels.push(B[x]);
    for (let y = pj; y < j; y++) if (!keptH.has(y)) ins.push(H[y]);
    if (dels.length || ins.length) regions.push({ dels, ins });
    pi = i + 1;
    pj = j + 1;
  }

  // An inbox entry keeps its id wherever it moves: pair those first, across regions.
  const paired = new Set();
  const changed = [];
  const splits = [];
  const allDels = regions.flatMap((r) => r.dels);
  const allIns = regions.flatMap((r) => r.ins);
  if (kind === 'status') {
    for (const d of allDels) {
      if (!d.id) continue;
      const i = allIns.find((x) => x.id === d.id && !paired.has(x));
      if (i) { paired.add(d); paired.add(i); changed.push([d, i]); }
    }
  }
  for (const r of regions) {
    for (const d of r.dels) {
      if (paired.has(d)) continue;
      const i = r.ins.find((x) => !paired.has(x) && relation(d, x));
      if (i) { paired.add(d); paired.add(i); changed.push([d, i]); }
    }
    // What stands where another block stood and reads like it was rewritten: a heading, a paragraph,
    // or a bullet that keeps most of its words. A removal and an addition elsewhere stay apart.
    for (const d of r.dels) {
      if (paired.has(d) || d.kind !== 'item' || d.id) continue;
      const parts = r.ins.filter((x) => !paired.has(x) && x.kind === 'item' && !x.id && where(x) === where(d) && [...content(x.text)].filter((w) => content(d.text).has(w)).length >= Math.min(2, content(x.text).size));
      if (splitOf(d, parts)) {
        paired.add(d);
        for (const x of parts) paired.add(x);
        splits.push([d, parts]);
      }
    }
    for (const d of r.dels) {
      if (paired.has(d)) continue;
      const i = r.ins.find((x) => !paired.has(x) && x.kind === d.kind && (d.kind === 'heading' ? x.level === d.level : where(x) === where(d)) && (d.kind !== 'item' || similar(d.text, x.text)));
      if (i) { paired.add(d); paired.add(i); changed.push([d, i]); }
    }
  }

  const removed = allDels.filter((d) => !paired.has(d));
  const added = allIns.filter((x) => !paired.has(x));
  const newSections = new Set(added.filter((x) => x.kind === 'heading' && x.level === 2).map((x) => x.title));
  for (const [d, i] of changed) judgeChange(d, i);
  for (const [d] of splits) {
    if (fresh.has(d.text)) ops.push({ op: 'amend', block: first(d), where: where(d) });
    else if (kind === 'status' && statusPart(d) === LAST) ops.push({ op: 'last-tend set' });
    else if (kind !== 'status' && d.h2) ops.push({ op: `${kind} item split`, block: first(d), where: where(d) });
    else bad(d, 'a bullet split in place', 'only `/tend triage` splits a bullet, in docs/DEFERRED.md: `npm run records -- deferred item split <match>`');
  }
  for (const d of removed) judgeRemoval(d);
  for (const x of added) judgeAddition(x);

  // A section emptied at once.
  const sections = new Map();
  for (const b of B) {
    if (b.kind !== 'item') continue;
    const k = where(b);
    const scoped = kind === 'status' ? statusPart(b) === OPEN : Boolean(b.h2);
    if (!scoped) continue;
    sections.set(k, (sections.get(k) ?? 0) + 1);
  }
  for (const [k, n] of sections) {
    const gone = removed.filter((d) => d.kind === 'item' && where(d) === k && !fresh.has(d.text)).length;
    if (n >= EMPTIED_AT && gone === n) {
      violations.push({ where: k, block: `all ${n} entries`, change: 'section emptied in one change', fix: 'entries leave one at a time, each when it ships or the owner answers it; a whole section cleared at once is the owner\'s edit, never an agent\'s' });
    }
  }

  // Numbering: an added entry's id is new and unique.
  if (kind === 'status') {
    const max = { T: Number(last.T) || 0, G: Number(last.G) || 0 };
    for (const b of B) if (b.id) max[b.id[0]] = Math.max(max[b.id[0]], Number(b.id.slice(1)));
    const count = new Map();
    for (const b of H) if (b.id) count.set(b.id, (count.get(b.id) ?? 0) + 1);
    for (const x of added) {
      if (!x.id) continue;
      if (count.get(x.id) > 1) bad(x, `entry number ${x.id} used twice`, 'leave the id out (`T?`) and `inbox add` numbers it from the ledger');
      else if (Number(x.id.slice(1)) <= max[x.id[0]]) bad(x, `entry number ${x.id} was already given out (last ${x.id[0]}${max[x.id[0]]})`, 'a number is never reused: write `T?` or `G?` and `inbox add` numbers it on from the ledger');
    }
  }

  // "Last tend" is replaced whole: one operation however many of its blocks changed.
  const once = ops.filter((o, k) => o.op !== 'last-tend set' || ops.findIndex((p) => p.op === 'last-tend set') === k);
  return { ops: once, violations };

  function relation(d, x) {
    if (d.kind !== x.kind) return null;
    if (d.kind === 'item') {
      // x is d with a tag put in after its marker, text appended at its end, or both.
      const pd = itemParts(d.text);
      const px = itemParts(x.text);
      let untagged = x.text;
      let tagged = false;
      if (pd && px && !pd.tag && px.tag && pd.marker === px.marker) {
        untagged = px.marker + x.text.slice(x.text.length - px.rest.length);
        tagged = true;
      }
      if (untagged === d.text && tagged) return 'tag';
      if (untagged.startsWith(d.text) && untagged.length > d.text.length) return tagged ? 'tag+append' : 'append';
      return null;
    }
    if (d.kind === 'row' && d.key && d.key === x.key && d.h2 === x.h2) return 'row';
    return null;
  }

  function judgeChange(d, x) {
    const rel = relation(d, x) ?? (d.id && d.id === x.id ? 'set' : null);
    if (fresh.has(d.text)) { ops.push({ op: 'amend', block: first(x), where: where(x) }); return; }
    if (kind === 'status') {
      const part = statusPart(d);
      if (part === LAST && statusPart(x) === LAST) { ops.push({ op: 'last-tend set' }); return; }
      if (d.id && d.id === x.id && [INBOX, NEXT].includes(part) && statusPart(x) === part) {
        ops.push({ op: rel === 'append' ? `inbox note ${d.id}` : `inbox set ${d.id}` });
        return;
      }
      if (part === OPEN && rel === 'append') { ops.push({ op: 'open note', block: first(d), where: where(d) }); return; }
      if (d.kind === 'row' && [SLICES, INFLIGHT, BRANCHES].includes(part) && statusPart(x) === part) {
        if (part === BRANCHES) { bad(d, 'a row of "Branches" rewritten', 'the branch table is the owner\'s, updated by hand from "Updating this file"'); return; }
        ops.push({ op: part === SLICES ? 'slice row set' : 'inflight set', block: first(d), where: where(d) });
        return;
      }
      bad(d, describe(d, x, rel), fixFor(d));
      return;
    }
    if (d.kind === 'item' && d.h2 && rel === 'append') { ops.push({ op: `${kind} item note`, block: first(d), where: where(d) }); return; }
    if (d.kind === 'item' && d.h2 && rel === 'tag') { ops.push({ op: `${kind} item tag`, block: first(d), where: where(d) }); return; }
    if (d.kind === 'item' && d.h2 && rel === 'tag+append') { ops.push({ op: `${kind} item tag`, block: first(d), where: where(d) }, { op: `${kind} item note`, block: first(d), where: where(d) }); return; }
    bad(d, describe(d, x, rel), fixFor(d));
  }

  function judgeRemoval(d) {
    if (fresh.has(d.text)) { ops.push({ op: 'amend (removed)', block: first(d), where: where(d) }); return; }
    if (d.kind === 'heading') { bad(d, `heading removed: "${d.text}"`, 'a heading never goes; change only the entries under it, one operation each'); return; }
    if (kind === 'status') {
      const part = statusPart(d);
      if (part === LAST) { ops.push({ op: 'last-tend set' }); return; }
      if (d.kind === 'item' && d.id && [INBOX, NEXT].includes(part)) { ops.push({ op: `inbox remove ${d.id}` }); return; }
      if (d.kind === 'item' && part === OPEN) { ops.push({ op: 'open remove', block: first(d), where: where(d) }); return; }
      if (d.kind === 'row' && part === INFLIGHT) { ops.push({ op: 'inflight remove', block: first(d), where: where(d) }); return; }
      if (d.kind === 'row' && part === SLICES) { bad(d, 'a row of "Slices" removed', 'a slice keeps its row: `npm run records -- slice row set <match>` changes its status'); return; }
      if (d.kind === 'row' && part === BRANCHES) { bad(d, 'a row of "Branches" removed', 'the branch table is the owner\'s, updated by hand'); return; }
      if (placeholder(d)) { ops.push({ op: 'inbox placeholder', block: first(d), where: where(d) }); return; }
    } else if (d.kind === 'item' && d.h2) {
      ops.push({ op: `${kind} item remove`, block: first(d), where: where(d) });
      return;
    }
    bad(d, `${noun(d)} removed`, fixFor(d));
  }

  function judgeAddition(x) {
    if (kind === 'status') {
      const part = statusPart(x);
      if (part === LAST) { ops.push({ op: 'last-tend set' }); return; }
      if (x.kind === 'item' && x.id && ((x.id[0] === 'T' && part === INBOX) || (x.id[0] === 'G' && part === NEXT))) { ops.push({ op: `inbox add ${x.id}` }); return; }
      if (x.kind === 'item' && x.id) { bad(x, `entry ${x.id} added outside "${x.id[0] === 'T' ? INBOX : NEXT}"`, OPS_HELP.inbox); return; }
      if (x.kind === 'item' && [INBOX, NEXT].includes(part)) { bad(x, 'an unnumbered bullet added to the inbox', 'an inbox entry starts `- **T? …**` or `- **G? …**`: `npm run records -- inbox add`'); return; }
      if (x.kind === 'item' && part === OPEN) { ops.push({ op: 'open add', block: first(x), where: where(x) }); return; }
      if (x.kind === 'row' && part === INFLIGHT) { ops.push({ op: 'inflight add', block: first(x), where: where(x) }); return; }
      if (x.kind === 'row' && part === SLICES) { ops.push({ op: 'slice row add', block: first(x), where: where(x) }); return; }
      if (placeholder(x)) { ops.push({ op: 'inbox placeholder', block: first(x), where: where(x) }); return; }
    } else {
      if (x.kind === 'item' && x.h2) { ops.push({ op: `${kind} item add`, block: first(x), where: where(x) }); return; }
      if (x.kind === 'heading' && x.level === 2) { ops.push({ op: `${kind} item add --new`, block: first(x), where: where(x) }); return; }
      if (x.kind === 'para' && newSections.has(x.h2) && !x.h3) { ops.push({ op: `${kind} item add --new --intro`, block: first(x), where: where(x) }); return; }
    }
    bad(x, `${noun(x)} added`, fixFor(x));
  }

  // "Nothing open." stands in an empty inbox section: it goes with the first entry and comes back
  // with the last one's leaving.
  function placeholder(b) {
    return b.kind === 'para' && [INBOX, NEXT].includes(b.h3) && b.h2 === 'Needs the owner' && PLACEHOLDER.test(b.text);
  }

  function noun(b) {
    return { heading: 'a heading', para: 'a paragraph', item: 'a bullet', row: 'a table row', tablehead: "a table's header", fence: 'a code block' }[b.kind] ?? b.kind;
  }

  function describe(d, x, rel) {
    if (d.kind === 'heading') return `heading changed: "${d.text}" to "${x.text}"`;
    if (rel === 'append') return `${noun(d)} appended to where no operation appends`;
    if (rel === 'tag') return `${noun(d)} tagged where no operation tags`;
    return `${noun(d)} rewritten in place: only appended lines, a tag, an inbox entry's reshaping or a table row's update are operations`;
  }

  function fixFor(b) {
    if (kind !== 'status') return b.h2 ? `${OPS_HELP.item(kind)}: remove the bullet, add its new form, or append a line with \`item note\`` : 'the head of the file is the owner\'s; change it by hand or ask';
    const part = statusPart(b);
    if (part === INBOX || part === NEXT) return OPS_HELP.inbox;
    if (part === OPEN) return `${OPS_HELP.open}: an open item is added, noted (an appended line) or removed whole`;
    if (part === INFLIGHT) return OPS_HELP.inflight;
    if (part === SLICES) return OPS_HELP.slice;
    if (b.h3 === LAST || b.h2 === 'Needs the owner') return `${OPS_HELP.last} replaces "Last tend"'s body and nothing else`;
    return 'this part of docs/STATUS.md is the owner\'s: no operation changes it; ask, or leave it';
  }
}

// ---------------------------------------------------------------------------------------------------
// Operations: each takes a document's text and returns the new text, or throws saying why not.

class RecordError extends Error {}
const fail = (msg) => { throw new RecordError(msg); };

/** The text of `lines`, as the document had it (its final newline kept). */
const join = (lines, eol) => lines.join('\n') + (eol && lines.length ? '\n' : '');

/** One block whose text holds `match`, among `blocks`; refuses none or several. */
function only(blocks, match, what) {
  if (!match || !match.trim()) fail(`say which ${what}: give text that occurs in exactly one`);
  const hits = blocks.filter((b) => b.text.includes(match));
  if (!hits.length) fail(`no ${what} holds "${match}"`);
  if (hits.length > 1) fail(`"${match}" is in ${hits.length} ${what}s; give more of the text:\n${hits.map((b) => `  - ${first(b)}`).join('\n')}`);
  return hits[0];
}

/** The body an operation reads: no trailing blank lines, no blank line inside (it would split the block). */
function cleanBody(body, what) {
  const text = String(body ?? '').replace(/\r\n/g, '\n').replace(/\s+$/, '');
  if (!text.trim()) fail(`the ${what} is empty: give it with --file <path> or on stdin`);
  return text;
}

/** An item's text: a marker on the first line, every other line indented, no blank line, no heading. */
function asItem(body, { marker = '- ' } = {}) {
  const text = cleanBody(body, 'entry');
  let lines = text.split('\n');
  if (lines.some((l) => l.trim() === '')) fail('an entry has no blank line inside it (it would end the bullet there); remove the blank lines');
  if (!ITEM.test(lines[0])) lines[0] = marker + lines[0];
  const indent = ' '.repeat(ITEM.exec(lines[0])[0].length);
  lines = lines.map((l, k) => (k === 0 || /^\s/.test(l) ? l : indent + l));
  return lines;
}

/** Lines appended under an item: each indented to the item's text. */
function noteLines(item, body) {
  const text = cleanBody(body, 'note');
  if (text.split('\n').some((l) => l.trim() === '')) fail('a note has no blank line inside it');
  const indent = ' '.repeat(ITEM.exec(item.text)[0].length);
  return text.split('\n').map((l) => indent + l.trimStart());
}

/** A table row, with as many cells as its table. */
function asRow(body, head) {
  const text = cleanBody(body, 'row');
  if (text.includes('\n')) fail('a row is one line');
  if (!/^\|.*\|$/.test(text)) fail('a row starts and ends with "|"');
  const cells = (l) => l.split('|').length;
  if (head && cells(text) !== cells(head.text.split('\n')[0])) fail(`the row has ${cells(text) - 2} cells; the table has ${cells(head.text.split('\n')[0]) - 2}`);
  return text;
}

function section(doc, h2, h3) {
  const { blocks } = doc;
  const k = blocks.findIndex((b) => b.kind === 'heading' && (h3 ? b.level === 3 && b.title === h3 && b.h2 === h2 : b.level === 2 && b.title === h2));
  if (k < 0) fail(`no section "${h3 ?? h2}" in the document; a section is never made by an operation in docs/STATUS.md`);
  const level = blocks[k].level;
  let e = k + 1;
  while (e < blocks.length && !(blocks[e].kind === 'heading' && blocks[e].level <= level)) e++;
  return { heading: blocks[k], inner: blocks.slice(k + 1, e), next: blocks[e] ?? null };
}

/** Splices `lines` in at line `at`, removing `remove` lines there. */
function splice(doc, at, remove, lines) {
  const out = doc.lines.slice();
  out.splice(at, remove, ...lines);
  return join(out, doc.eol || !doc.lines.length);
}

/** The line after the last non-blank block of a section (where an entry is appended). */
function endOf(sec) {
  const content = sec.inner.filter((b) => b.kind !== 'blank');
  return content.length ? content[content.length - 1].end : sec.heading.end;
}

/**
 * Where an added entry goes in a section: at its end by default, at its top (before its first entry,
 * after any intro) with `top`, or after the entry holding `after`.
 */
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

function highest(doc, letter, ledger) {
  let n = Number(ledger?.[`last${letter}`]) || 0;
  for (const b of doc.blocks) if (b.id && b.id[0] === letter) n = Math.max(n, Number(b.id.slice(1)));
  return n;
}

const OPS = {
  /** `ledger` is the parsed ledger; returns { text, id } and the caller writes last<T|G> back. */
  'inbox add'(text, { body, id, ledger }) {
    const doc = parse(text);
    const lines = asItem(body);
    const m = /^[-*+]\s+\*\*([TG])(\?|\d+\b)/.exec(lines[0]);
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
    else if (num <= top) fail(`${letter}${num} was already given out (last ${letter}${top}); leave the number out and it is numbered ${letter}${top + 1}`);
    lines[0] = lines[0].replace(/^([-*+]\s+\*\*)[TG](\?|\d+)/, `$1${letter}${num}`);
    const sec = section(doc, 'Needs the owner', letter === 'T' ? INBOX : NEXT);
    const empty = sec.inner.find((b) => b.kind === 'para' && PLACEHOLDER.test(b.text));
    const text2 = empty ? splice(doc, empty.start, empty.end - empty.start, lines) : splice(doc, endOf(sec), 0, lines);
    return { text: text2, id: `${letter}${num}`, letter, num };
  },
  'inbox note'(text, { match, body }) {
    const doc = parse(text);
    const b = entry(doc, match);
    return { text: splice(doc, b.end, 0, noteLines(b, body)) };
  },
  'inbox set'(text, { match, body }) {
    const doc = parse(text);
    const b = entry(doc, match);
    const lines = asItem(body);
    const m = /^[-*+]\s+\*\*([TG])(\?|\d+\b)/.exec(lines[0]);
    if (!m || m[1] !== b.id[0] || (m[2] !== '?' && m[1] + m[2] !== b.id)) fail(`the new text must start "- **${b.id} …**" (or "- **${b.id[0]}? …**"): an entry keeps its number`);
    lines[0] = lines[0].replace(/^([-*+]\s+\*\*)[TG](\?|\d+)/, `$1${b.id}`);
    return { text: splice(doc, b.start, b.end - b.start, lines) };
  },
  'inbox remove'(text, { match }) {
    const doc = parse(text);
    const b = entry(doc, match);
    const sec = section(doc, 'Needs the owner', b.h3);
    const alone = sec.inner.filter((x) => x.kind === 'item').length === 1;
    return { text: splice(doc, b.start, b.end - b.start, alone && b.h3 === INBOX ? ['Nothing open.'] : []) };
  },
  'last-tend set'(text, { body }) {
    const doc = parse(text);
    const sec = section(doc, 'Needs the owner', LAST);
    const lines = cleanBody(body, '"Last tend" body').split('\n');
    const head = lines.find((l) => HEADING.test(l));
    if (head) fail(`the "Last tend" body holds no heading ("${head}"): its heading stays, and the sections after it are not this operation's`);
    if (lines.some((l) => FENCE.test(l))) fail('the "Last tend" body holds no code fence (an unclosed one would swallow the sections after it)');
    const from = sec.heading.end;
    const to = sec.next ? sec.next.start : doc.lines.length;
    return { text: splice(doc, from, to - from, ['', ...lines, ...(sec.next ? [''] : [])]) };
  },
  // Newest first, as the section has always been kept; --end or --after <match> put it elsewhere.
  'open add'(text, { body, after, end }) {
    const doc = parse(text);
    const sec = section(doc, 'Needs the owner', OPEN);
    return { text: splice(doc, place(sec, 'item', { top: !end, after }), 0, asItem(body)) };
  },
  'open note'(text, { match, body }) {
    const doc = parse(text);
    const b = only(section(doc, 'Needs the owner', OPEN).inner.filter((x) => x.kind === 'item'), match, 'open item');
    return { text: splice(doc, b.end, 0, noteLines(b, body)) };
  },
  'open remove'(text, { match }) {
    const doc = parse(text);
    const b = only(section(doc, 'Needs the owner', OPEN).inner.filter((x) => x.kind === 'item'), match, 'open item');
    return { text: splice(doc, b.start, b.end - b.start, []) };
  },
  'inflight add': (text, { body, after, end }) => rowAdd(text, INFLIGHT, body, { top: !end, after }),
  'inflight set': (text, { match, body }) => rowSet(text, INFLIGHT, match, body),
  'inflight remove'(text, { match }) {
    const doc = parse(text);
    const b = only(section(doc, INFLIGHT).inner.filter((x) => x.kind === 'row'), match, 'In flight row');
    return { text: splice(doc, b.start, 1, []) };
  },
  'slice row add': (text, { body, after, top }) => rowAdd(text, SLICES, body, { top, after }),
  'slice row set': (text, { match, body }) => rowSet(text, SLICES, match, body),
  'item add'(text, { section: name, body, create, intro, after, top }) {
    const doc = parse(text);
    if (!name || !name.trim()) fail('say which section: its H2 title');
    const h2s = doc.blocks.filter((b) => b.kind === 'heading' && b.level === 2);
    let h = h2s.find((b) => b.title === name);
    if (!h) {
      const near = h2s.filter((b) => b.title.includes(name));
      if (near.length === 1 && !create) h = near[0];
      else if (near.length > 1 && !create) fail(`"${name}" is in ${near.length} section titles; give the whole title:\n${near.map((b) => `  - ${b.title}`).join('\n')}`);
    }
    const lines = asItem(body);
    if (!h) {
      if (!create) fail(`no section "${name}"; --new makes it, at the end of the file`);
      const out = doc.lines.slice();
      while (out.length && out[out.length - 1].trim() === '') out.pop();
      const lead = intro === undefined ? [] : [...cleanBody(intro, 'section\'s intro').split('\n'), ''];
      if (lead.some((l) => starts(l) && !ITEM.test(l))) fail('the intro is a paragraph: no heading, table or code fence');
      if (lead.length && ITEM.test(lead[0])) fail('the intro is a paragraph, not a bullet');
      if (lead.slice(0, -1).some((l) => l.trim() === '')) fail('the intro is one paragraph, with no blank line');
      return { text: join([...out, '', `## ${name}`, '', ...lead, ...lines], true) };
    }
    if (create) fail(`a section "${h.title}" exists already; leave out --new`);
    if (intro !== undefined) fail('--intro goes with --new: an existing section keeps its words');
    const sec = section(doc, h.title);
    return { text: splice(doc, place(sec, 'item', { top, after }), 0, lines) };
  },
  /** `/tend triage`'s split: one bullet holding several items becomes several, every word kept. */
  'item split'(text, { match, body }) {
    const doc = parse(text);
    const b = only(doc.blocks.filter((x) => x.kind === 'item' && x.h2), match, 'item');
    const parts = parse(cleanBody(body, 'split')).blocks.filter((x) => x.kind !== 'blank');
    if (parts.some((x) => x.kind !== 'item')) fail('the split is bullets only, one per line with its indented lines, no blank line');
    if (parts.length < 2) fail('a split makes two bullets or more');
    if (!splitOf(b, parts)) {
      const all = new Set(parts.flatMap((x) => [...tokens(x.text)]));
      fail(`a split keeps every word of the bullet; missing: ${[...tokens(b.text)].filter((w) => !all.has(w)).join(', ')}`);
    }
    return { text: splice(doc, b.start, b.end - b.start, parts.flatMap((x) => x.text.split('\n'))) };
  },
  'item remove'(text, { match }) {
    const doc = parse(text);
    const b = only(doc.blocks.filter((x) => x.kind === 'item' && x.h2), match, 'item');
    return { text: splice(doc, b.start, b.end - b.start, []) };
  },
  'item note'(text, { match, body }) {
    const doc = parse(text);
    const b = only(doc.blocks.filter((x) => x.kind === 'item' && x.h2), match, 'item');
    return { text: splice(doc, b.end, 0, noteLines(b, body)) };
  },
  'item tag'(text, { match, tag }) {
    if (!TAGS.includes(tag)) fail(`a tag is one of ${TAGS.join(', ')}`);
    const doc = parse(text);
    const b = only(doc.blocks.filter((x) => x.kind === 'item' && x.h2), match, 'item');
    const p = itemParts(b.text);
    if (p.tag) fail(`the item is tagged [${p.tag}] already; a tag is given once`);
    const lines = doc.lines.slice(b.start, b.end);
    lines[0] = p.marker + `[${tag}] ` + lines[0].slice(p.marker.length);
    return { text: splice(doc, b.start, b.end - b.start, lines) };
  },
};

function entry(doc, match) {
  const id = String(match ?? '').trim();
  if (!/^[TG]\d+$/.test(id)) fail(`an inbox entry is named by its number, T<n> or G<n>, not "${id}"`);
  const b = doc.blocks.find((x) => x.id === id && [INBOX, NEXT].includes(statusPart(x)));
  if (!b) fail(`${id} is not in the inbox`);
  return b;
}

function rowAdd(text, h2, body, where) {
  const doc = parse(text);
  const sec = section(doc, h2);
  const head = sec.inner.find((b) => b.kind === 'tablehead');
  if (!head) fail(`"${h2}" has no table`);
  return { text: splice(doc, place(sec, 'row', where), 0, [asRow(body, head)]) };
}

function rowSet(text, h2, match, body) {
  const doc = parse(text);
  const sec = section(doc, h2);
  const b = only(sec.inner.filter((x) => x.kind === 'row'), match, `${h2} row`);
  const row = asRow(body, sec.inner.find((x) => x.kind === 'tablehead'));
  return { text: splice(doc, b.start, 1, [row]) };
}

// What each operation must amount to, read back by `compare`: the transaction's own check.
const EXPECT = {
  'inbox add': (r) => [`inbox add ${r.id}`],
  'inbox note': (_, a) => [`inbox note ${a.match}`],
  'inbox set': (_, a) => [`inbox set ${a.match}`],
  'inbox remove': (_, a) => [`inbox remove ${a.match}`],
  'last-tend set': null, // any number of "last-tend set" changes, nothing else
  'open add': () => ['open add'],
  'open note': () => ['open note'],
  'open remove': () => ['open remove'],
  'inflight add': () => ['inflight add'],
  'inflight set': () => ['inflight set'],
  'inflight remove': () => ['inflight remove'],
  'slice row add': () => ['slice row add'],
  'slice row set': () => ['slice row set'],
  'item add': (_, a, kind) => (a.create ? [`${kind} item add --new`, ...(a.intro === undefined ? [] : [`${kind} item add --new --intro`]), `${kind} item add`] : [`${kind} item add`]),
  'item remove': (_, a, kind) => [`${kind} item remove`],
  'item note': (_, a, kind) => [`${kind} item note`],
  'item tag': (_, a, kind) => [`${kind} item tag`],
  'item split': (_, a, kind) => [`${kind} item split`],
};

/**
 * Runs one operation on a document's text as a transaction: the result is parsed again and compared
 * with the original, and it is refused unless the change is exactly that operation, every other block
 * byte-identical. Returns { text, id? }.
 */
function apply(kind, name, text, args = {}) {
  const op = OPS[name];
  if (!op) fail(`no operation "${name}"`);
  const statusOnly = !name.startsWith('item ');
  if (statusOnly && kind !== 'status') fail(`"${name}" changes docs/STATUS.md only`);
  if (!statusOnly && kind === 'status') fail(`"${name}" changes docs/DEFERRED.md or docs/NATIVE_UNVERIFIED.md, not docs/STATUS.md`);
  const result = op(text, args);
  const { ops, violations } = compare(text, result.text, { kind });
  if (violations.length) fail(`refused: the change would ${violations.map((v) => v.change).join('; ')} (a bug in records.js; nothing was written)`);
  const got = ops.map((o) => o.op).filter((o) => o !== 'inbox placeholder');
  const want = EXPECT[name] ? EXPECT[name](result, args, kind) : null;
  const ok = want ? got.length === want.length && want.every((w) => got.includes(w)) : got.length > 0 && got.every((g) => g === 'last-tend set');
  if (!ok) fail(`refused: the change reads as ${got.join(', ') || 'nothing'}, not ${name} (nothing was written)`);
  return result;
}

// ---------------------------------------------------------------------------------------------------
// The shell: git, files, the command line.

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

/** A file's text at a revision, or '' where it does not exist. */
function show(rev, file) {
  try {
    return git('show', `${rev}:${file}`);
  } catch {
    return '';
  }
}

function lastAt(rev) {
  try {
    const ledger = JSON.parse(rev ? show(rev, LEDGER_REL) : fs.readFileSync(path.join(ROOT, LEDGER_REL), 'utf8'));
    return { T: ledger.lastT, G: ledger.lastG };
  } catch {
    return {};
  }
}

/** Every violation of the three documents between two texts each; `read(rev, file)` gives a text. */
function verifyTexts(pairs) {
  const out = [];
  for (const { file, base, head, fresh, last } of pairs) {
    const kind = DOCS[file];
    if (base === head) continue;
    const r = compare(base, head, { kind, fresh, last });
    for (const v of r.violations) out.push({ file, ...v });
    for (const o of r.ops) out.push({ file, op: o.op, where: o.where, block: o.block, ok: true });
  }
  return out;
}

/** The texts of the blocks `head` has that `base` lacks (what a commit filed, for `fresh`). */
function addedTexts(base, head) {
  const B = parse(base).blocks.filter((b) => b.kind !== 'blank');
  const H = parse(head).blocks.filter((b) => b.kind !== 'blank');
  const kept = new Set(lcs(B.map((b) => b.text), H.map((b) => b.text)).map(([, j]) => j));
  return H.filter((_, j) => !kept.has(j)).map((b) => b.text);
}

/**
 * One commit's changes to the record documents as problems, one line each, for scripts/tend.js.
 * `pairs` are { file, base, head, fresh?, last? }, base being the commit's parent.
 */
function commitProblems(pairs) {
  return verifyTexts(pairs.filter((p) => DOCS[p.file]))
    .filter((v) => !v.ok)
    .map((v) => `changes ${v.file} by hand (${v.where}: "${v.block}"): ${v.change}; instead, ${v.fix}`);
}

function report(results, label) {
  const bad = results.filter((r) => !r.ok);
  for (const r of results.filter((x) => x.ok)) console.log(`  ${r.file}: ${r.op}${r.where ? ` (${r.where})` : ''}${r.block ? `  ${r.block}` : ''}`);
  if (!bad.length) {
    console.log(`check:records: ${label} changes the record documents by whole operations only.`);
    return 0;
  }
  console.error(`check:records: ${bad.length} change${bad.length > 1 ? 's' : ''} in ${label} that no operation makes:`);
  for (const v of bad) console.error(`- ${v.file} › ${v.where}\n    ${v.block}\n    ${v.change}\n    instead: ${v.fix}`);
  console.error('Agents change docs/STATUS.md, docs/DEFERRED.md and docs/NATIVE_UNVERIFIED.md only through `npm run records` (decision 0156).');
  return 1;
}

function verify(argv) {
  const spec = argv.find((a) => !a.startsWith('--'));
  let base;
  let readHead;
  let label;
  if (spec && spec.includes('..')) {
    const [a, b] = spec.split(/\.{2,3}/);
    const headRev = b || 'HEAD';
    base = git('merge-base', a || 'HEAD', headRev).trim();
    readHead = (f) => show(headRev, f);
    label = spec;
  } else {
    base = spec ? git('merge-base', spec, 'HEAD').trim() : 'HEAD';
    readHead = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '');
    label = `the working tree against ${spec ? `its merge base with ${spec}` : 'HEAD'}`;
  }
  const last = lastAt(base);
  const results = verifyTexts(Object.keys(DOCS).map((file) => ({ file, base: show(base, file), head: readHead(file), last })));
  return report(results, label);
}

function readBody(argv) {
  const at = argv.indexOf('--file');
  if (at >= 0) {
    const f = argv[at + 1];
    if (!f) fail('--file names a file');
    return fs.readFileSync(path.resolve(process.cwd(), f), 'utf8');
  }
  if (process.stdin.isTTY) fail('give the text with --file <path> or on stdin');
  return fs.readFileSync(0, 'utf8');
}

function flag(argv, name) {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
}

/** The words of a command line, flags and their values left out. */
function words(argv) {
  const out = [];
  for (let k = 0; k < argv.length; k++) {
    if (['--file', '--id', '--intro', '--after'].includes(argv[k])) { k++; continue; }
    if (argv[k].startsWith('--')) continue;
    out.push(argv[k]);
  }
  return out;
}

const USAGE = `usage: npm run records -- <operation> (scripts/records.js's header lists them), or npm run check:records -- <range>`;

function main(argv) {
  const w = words(argv);
  const [group] = w;
  if (group === 'verify') return verify(argv.slice(1));
  let kind = 'status';
  let rest = w.slice(1);
  let name;
  if (group === 'deferred' || group === 'native') {
    kind = group;
    if (rest[0] === 'item') rest = rest.slice(1);
    name = `item ${rest.shift() ?? ''}`;
  } else if (group === 'slice') {
    if (rest[0] === 'row') rest = rest.slice(1);
    name = `slice row ${rest.shift() ?? ''}`;
  } else if (['inbox', 'last-tend', 'open', 'inflight'].includes(group)) {
    name = `${group} ${rest.shift() ?? ''}`;
  } else {
    console.error(USAGE);
    return 2;
  }
  if (!OPS[name]) {
    console.error(`no operation "${name}"\n${USAGE}`);
    return 2;
  }
  const file = FILE_OF[kind];
  const full = path.join(ROOT, file);
  const text = fs.readFileSync(full, 'utf8');
  const args = {};
  const needsBody = /\b(add|set|note|split)$/.test(name);
  if (name === 'item add') args.section = rest.shift();
  else if (name === 'inbox add' || name === 'open add' || name === 'last-tend set' || name.endsWith(' row add') || name === 'inflight add') { /* no match */ }
  else args.match = rest.shift();
  if (name === 'item tag') args.tag = rest.shift();
  if (rest.length) fail(`unexpected words: ${rest.join(' ')} (quote a <match> or <section> with spaces as one argument)`);
  if (needsBody) args.body = readBody(argv);
  args.id = flag(argv, '--id');
  args.create = argv.includes('--new');
  args.after = flag(argv, '--after');
  args.top = argv.includes('--top');
  args.end = argv.includes('--end');
  if (flag(argv, '--intro')) args.intro = fs.readFileSync(path.resolve(process.cwd(), flag(argv, '--intro')), 'utf8');
  let ledger = null;
  const ledgerPath = path.join(ROOT, LEDGER_REL);
  if (name === 'inbox add' && fs.existsSync(ledgerPath)) ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  args.ledger = ledger;
  const result = apply(kind, name, text, args);
  fs.writeFileSync(full, result.text);
  if (name === 'inbox add' && ledger) {
    const key = `last${result.letter}`;
    if ((Number(ledger[key]) || 0) < result.num) {
      const raw = fs.readFileSync(ledgerPath, 'utf8');
      const re = new RegExp(`("${key}"\\s*:\\s*)\\d+`);
      fs.writeFileSync(ledgerPath, re.test(raw) ? raw.replace(re, `$1${result.num}`) : JSON.stringify({ ...ledger, [key]: result.num }, null, 2) + '\n');
    }
  }
  console.log(`records: ${name}${result.id ? ` ${result.id}` : ''}${args.match ? ` (${args.match})` : ''} in ${file}`);
  return 0;
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

module.exports = { DOCS, TAGS, LEDGER_REL, parse, compare, apply, verifyTexts, addedTexts, commitProblems, rowKey, RecordError };
