// @tree-wide: the record documents (docs/STATUS.md, DEFERRED.md, NATIVE_UNVERIFIED.md), scripts/records.js and scripts/tend.js
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

// Agents change the record documents only through declared operations (decision 0156): each operation
// changes one entry and leaves every other byte as it was; each commit names the operations it applied
// as Records-Op trailers, their bodies in a sidecar under .claude/records/, and the gate replays them on
// the parent's documents and requires the commit's documents byte for byte. Removals and rewrites of
// entries the run did not file are capped and need a reason; an owner's tag is never demoted.

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
type Block = { kind: string; text: string; h2: string | null; h3: string | null; id?: string; level?: number };
type Kind = 'status' | 'deferred' | 'native';
type Args = { body?: string; match?: string; id?: string; ledger?: Record<string, unknown> | null; section?: string; create?: boolean; intro?: string; tag?: string; after?: string; top?: boolean; end?: boolean; reason?: string };
type Op = { argv: string[]; body?: string; intro?: string };
type Docs = Record<string, string>;
type Ledger = { lastT?: number; lastG?: number } | null;
type State = object;
type Gate = { results: { sha: string; subject: string; problems: string[]; notices: string[] }[]; ok: boolean };
const records = createRequire(__filename)(join(ROOT, 'scripts', 'records.js')) as {
  CUTOVER: string;
  parse(text: string): { blocks: Block[]; lines: string[]; eol: boolean };
  apply(kind: Kind, name: string, text: string, args?: Args): { text: string; id?: string };
  replay(docs: Docs, ops: Op[], o?: { ledger?: Ledger; removedIds?: string[]; notes?: Map<string, string[]> }): { docs: Docs };
  trailersOf(ops: Op[]): string[];
  sidecarOf(ops: Op[]): string;
  parseTrailer(line: string): { argv: string[]; body?: string; intro?: string };
  newRangeState(): State;
  checkCommit(c: { base: Docs; head: Docs; message: string; sidecar: string | null; ledger?: Ledger; state: State; notes?: Map<string, string[]> }): string[];
  isAgent(message: string): boolean;
  gateRange(range: string, o: { cwd: string; loopOnly?: boolean; cutover?: string }): Gate;
  transact(doc: { blocks: Block[]; lines: string[]; eol: boolean }, made: { edit: { at: number; remove: number; lines: string[] }; mid: (mid: Block[]) => boolean }): string;
};
const tend = createRequire(__filename)(join(ROOT, 'scripts', 'tend.js')) as {
  FORBIDDEN: RegExp[];
  tendCommitProblems(c: { subject: string; body: string; files: { status: string; path: string }[] }): string[];
};

const STATUS = `# Chronicles: where the work stands

- **As of:** 2026-11-12

## Slices

| Slice (spec tab) | Status | Evidence | Spec | Audited |
|---|---|---|---|---|
| Rides | shipped | \`8e49c9c\` | \`specs/rides/spec.md\` | yes |
| Motion (steps, MO1-MO10) | shipped | \`09f504a\` | \`specs/motion/spec.md\` | yes |
| v1.5: landing (What's good here) | shipped | \`2372244\` | \`specs/landing/spec.md\` | yes |

## Branches

| Branch | Last commit | Ahead | Merged | Holds | Disposition |
|---|---|---|---|---|---|
| \`claude/rides\` | 2026-11-01 | 0 | yes | Rides | merged |

## Needs the owner

This section is the owner's inbox (decision 0128).

### From /tend

- **T11 [owner] Voice and note are two taps away** (2026-11-11)
  Area: tabs. Seen: a picture.
  Recommended: a mic beside the camera.
- **T13 [phone] The tabs at the largest text size** (2026-11-11)
  Do: on an iPhone, the largest size.
  Expect: nothing cut.
- **T14 [owner] A pin of several moments shows a numeral** (2026-11-12)
  Recommended: its kinds.

### Next evolutions

The loop's proposals (\`G<n>\`, three at most).

- **G2 [M] Explore: "busy" becomes "storefronts"** (2026-11-11) · Earn · aligned
  The slice: 1. The layer is "Storefronts".

### Last tend

**Nov 12, \`/tend map\`**, a sweep.
- \`tend map 1\`: only a map with a compass turns.
Filed: T14-T17.

### Open before the loop

- **The map's rule lines after \`/tend map\`** (Nov 12): reword l.68.
  Its scale-bar line says the strip's top.
- **QL8's and QL11's wording** (Nov 12): amend both in the doc.
- **The vision review of Nov 10**:
  1. **The page trails its decisions (drift)**
  2. **Public data read by tile**

- **The device milestone:** native has never run on a phone.
- **Branch clean-up:** nine branches are merged.

## In flight

| Session | Branch | Doing |
|---|---|---|
| Note pages (NP1-NP14) | \`claude/note-pages\` | built |
| Complexes (CX1-CX16) | \`claude/complexes\` | built |

## Updating this file

- Head and dates: \`git fetch origin --prune\`.
- The branch table:
  \`\`\`
  for b in $(git branch -r); do

  echo "$b"; done
  \`\`\`
  \`git cherry\` tells a superseded branch.
`;

const DEFERRED = `# Deferred and open

Everything deferred, by area.

## Navigation and routes

- [loop] Go here: Cancel pressed while the read returns.
- A Go here tapped while a re-route runs is dropped.
  - Since then: still dropped.
- [owner] The route preview's selected row shows by a border alone.
- [arch] The planner runs on the main thread.

## Quality of life (in the owner's order)

1. Keep awake on a phone
2. GPX export
   (round 4)
3. Dark mode

## Rides (R1-R14)

What the rides left.
`;

const NATIVE = `# Native, unverified on a device

Native has never run on a device.

## How to run

**The build.** Run every item on a development build.

## Compass (CP1-CP8)

- [ ] **Do:** turn the map. **Expect:** the compass shows.
- [ ] **Do:** tap the compass. **Expect:** north.
`;

const DOCS0: Docs = { 'docs/STATUS.md': STATUS, 'docs/DEFERRED.md': DEFERRED, 'docs/NATIVE_UNVERIFIED.md': NATIVE };
const LEDGER = { lastT: 18, lastG: 4 };

const tmp = mkdtempSync(join(tmpdir(), 'records-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const between = (text: string, from: string, to: string) => text.slice(text.indexOf(from), text.indexOf(to));
/** The text with the section from `heading` up to the next heading of its level or above cut out. */
const cut = (text: string, heading: string, keepHeading = false) => {
  const start = text.indexOf(`${heading}\n`);
  const level = heading.indexOf(' ');
  const rest = text.slice(start + heading.length + 1);
  const m = new RegExp(`^#{1,${level}} `, 'm').exec(rest);
  const end = m ? start + heading.length + 1 + m.index : text.length;
  return text.slice(0, start) + (keepHeading ? `${heading}\n\n` : '') + text.slice(end);
};
/** A commit made the right way: the operations replayed, their trailers in the message, their sidecar. */
const made = (base: Docs, ops: Op[], ledger: Ledger = LEDGER) => ({
  base,
  head: records.replay(base, ops, { ledger }).docs,
  message: `tend map: the run's record\n\n${records.trailersOf(ops).join('\n')}\n`,
  sidecar: records.sidecarOf(ops),
  ledger,
});
const problems = (base: Docs, ops: Op[], state: State = records.newRangeState(), ledger: Ledger = LEDGER) => records.checkCommit({ ...made(base, ops, ledger), state });
/** A commit whose documents were edited by hand: `head` as given, the trailers of `ops` declared. */
const forged = (base: Docs, head: Docs, ops: Op[] = [], state: State = records.newRangeState()) =>
  records.checkCommit({ base, head, message: `tend map: the run's record\n\n${records.trailersOf(ops).join('\n')}\n`, sidecar: ops.length ? records.sidecarOf(ops) : null, ledger: LEDGER, state });
const withStatus = (docs: Docs, text: string): Docs => ({ ...docs, 'docs/STATUS.md': text });
const withDeferred = (docs: Docs, text: string): Docs => ({ ...docs, 'docs/DEFERRED.md': text });
const realDocs = (): Docs => ({ 'docs/STATUS.md': read('docs/STATUS.md'), 'docs/DEFERRED.md': read('docs/DEFERRED.md'), 'docs/NATIVE_UNVERIFIED.md': read('docs/NATIVE_UNVERIFIED.md') });
/** The bullets of "Open before the loop". */
const openItems = (text: string) => records.parse(text).blocks.filter((b) => b.kind === 'item' && b.h3 === 'Open before the loop');

// ---------------------------------------------------------------------------------------------------
// The documents and the operations.

test('records: a document is its blocks, byte for byte; a bullet holds its indented lines and the fences in them', () => {
  for (const text of [STATUS, DEFERRED, NATIVE, read('docs/STATUS.md'), read('docs/DEFERRED.md'), read('docs/NATIVE_UNVERIFIED.md'), 'no newline at the end', '']) {
    const { blocks } = records.parse(text);
    assert.equal(blocks.map((b) => b.text).join('\n') + (text.endsWith('\n') ? '\n' : ''), text);
  }
  const { blocks } = records.parse(STATUS);
  const t11 = blocks.find((b) => b.id === 'T11');
  assert.ok(t11 && t11.text.endsWith('Recommended: a mic beside the camera.') && t11.h3 === 'From /tend');
  const vision = blocks.find((b) => b.text.startsWith('- **The vision review'));
  assert.ok(vision?.text.endsWith('2. **Public data read by tile**'), 'a numbered list under a bullet is the bullet');
  const fenced = blocks.find((b) => b.text.startsWith('- The branch table'));
  assert.ok(fenced?.text.endsWith('`git cherry` tells a superseded branch.'), 'a blank line inside a fence does not end the bullet');
  assert.equal(blocks.filter((b) => b.kind === 'row' && b.h2 === 'In flight').length, 2);
  assert.equal(blocks.filter((b) => b.kind === 'tablehead').length, 3);
  const d = records.parse(DEFERRED).blocks;
  assert.ok(d.find((b) => b.text.startsWith('- A Go here'))?.text.endsWith('  - Since then: still dropped.'));
  assert.ok(d.find((b) => b.text.startsWith('2. GPX'))?.text.endsWith('   (round 4)'));
});

test('records: inbox add numbers an entry on from the ledger, or from the document when it is ahead', () => {
  const body = '- **T? [owner] Map: a pin is a bare numeral** (2026-11-12)\n  Area: map.\nRecommended: kinds in its head.';
  const r = records.apply('status', 'inbox add', STATUS, { body, ledger: { lastT: 18 } });
  assert.equal(r.id, 'T19');
  assert.ok(r.text.includes('  Recommended: its kinds.\n- **T19 [owner] Map: a pin is a bare numeral** (2026-11-12)\n  Area: map.\n  Recommended: kinds in its head.\n\n### Next evolutions'), 'appended to "From /tend", its lines indented');
  assert.equal(records.apply('status', 'inbox add', STATUS, { body, ledger: { lastT: 5 } }).id, 'T15', 'the document is ahead of the ledger');
  assert.equal(records.apply('status', 'inbox add', STATUS, { body: body.slice(2), ledger: null }).id, 'T15', 'no ledger, no marker');
  assert.equal(records.apply('status', 'inbox add', STATUS, { body, id: 'T25', ledger: { lastT: 18 } }).id, 'T25');
  assert.throws(() => records.apply('status', 'inbox add', STATUS, { body, id: 'T12', ledger: { lastT: 18 } }), /already given out/);
  assert.throws(() => records.apply('status', 'inbox add', STATUS, { body, id: 'T13', ledger: { lastT: 18 } }), /already in the inbox/);
  assert.throws(() => records.apply('status', 'inbox add', STATUS, { body: '- **T? x**\n\n  y' }), /blank line/);
  assert.throws(() => records.apply('status', 'inbox add', STATUS, { body: '- a bullet with no number' }), /T\?/);
  const g = records.apply('status', 'inbox add', STATUS, { body: '- **G? [S] Threads: a way back** (2026-11-12)\n  The slice: 1. Back.', ledger: { lastT: 18, lastG: 4 } });
  assert.equal(g.id, 'G5');
  assert.ok(g.text.includes('"Storefronts".\n- **G5 [S] Threads: a way back**'), 'a G entry goes under "Next evolutions"');
  const empty = STATUS.replace(between(STATUS, '- **T11', '\n### Next evolutions'), 'Nothing open.\n');
  const first = records.apply('status', 'inbox add', empty, { body, ledger: { lastT: 18 } });
  assert.ok(first.text.includes('### From /tend\n\n- **T19') && !first.text.includes('Nothing open.'), 'the first entry takes the placeholder\'s place');
});

test('records: inbox note, set and remove name an entry by its number alone', () => {
  const noted = records.apply('status', 'inbox note', STATUS, { match: 'T11', body: '**Answered yes** (Nov 12): waits for the next run.' }).text;
  assert.ok(noted.includes('  Recommended: a mic beside the camera.\n  **Answered yes** (Nov 12): waits for the next run.\n- **T13'));
  const set = records.apply('status', 'inbox set', STATUS, { match: 'T11', body: '- **T? [owner] Voice and note on the bar, reshaped** (2026-11-12)\n  Recommended: the mic only.' }).text;
  assert.ok(set.includes('- **T11 [owner] Voice and note on the bar, reshaped** (2026-11-12)\n  Recommended: the mic only.\n- **T13'));
  assert.throws(() => records.apply('status', 'inbox set', STATUS, { match: 'T11', body: '- **T13 [owner] another**' }), /T11/);
  const gone = records.apply('status', 'inbox remove', STATUS, { match: 'T11' }).text;
  assert.ok(!gone.includes('T11') && gone.includes('- **T13'));
  const none = records.apply('status', 'inbox remove', records.apply('status', 'inbox remove', gone, { match: 'T13' }).text, { match: 'T14' }).text;
  assert.ok(none.includes('### From /tend\n\nNothing open.\n\n### Next evolutions'), 'the last entry leaves the placeholder');
  assert.ok(records.apply('status', 'inbox remove', STATUS, { match: 'G2' }).text.includes('three at most).\n\n### Last tend'), 'the last entry of a section leaves no double blank line');
  assert.ok(records.apply('native', 'item remove', NATIVE.replace('north.\n', 'north.\n\n- [ ] x\n'), { match: '- [ ] x' }).text.endsWith('north.\n'), 'nor a blank line at the end of the file');
  assert.throws(() => records.apply('status', 'inbox remove', STATUS, { match: 'T1' }), /not in the inbox/, 'T1 is not a prefix of T11');
  assert.throws(() => records.apply('status', 'inbox remove', STATUS, { match: 'Voice' }), /by its number/);
});

test('records: last-tend set replaces the body under its heading and nothing after it', () => {
  const body = '**Nov 13, `/tend replay`**, a sweep.\n- `tend replay 1`: the card says its counts in words.\nFiled: T19-T24.';
  const r = records.apply('status', 'last-tend set', STATUS, { body }).text;
  assert.ok(r.includes(`### Last tend\n\n${body}\n\n### Open before the loop\n\n- **The map's rule lines`));
  assert.equal(r.replace(between(r, '### Last tend', '### Open before the loop'), ''), STATUS.replace(between(STATUS, '### Last tend', '### Open before the loop'), ''), 'every other byte as it was');
  assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: `${body}\n\n### Open before the loop\n\n- one left` }), /heading/);
  assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: `${body}\n## In flight` }), /heading/);
  assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: `${body}\n\`\`\`` }), /fence/);
  assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: '  ' }), /empty/);
});

test('records: open add, note, set and remove act on "Open before the loop" alone, a whole bullet at a time', () => {
  const body = "**ME23's wording after T12** (Nov 12): amend ME23.\nin the doc and the mirror.";
  const added = records.apply('status', 'open add', STATUS, { body }).text;
  assert.ok(added.includes("### Open before the loop\n\n- **ME23's wording after T12** (Nov 12): amend ME23.\n  in the doc and the mirror.\n- **The map's rule lines"), 'newest first, as the section is kept');
  assert.ok(records.apply('status', 'open add', STATUS, { body, end: true }).text.includes("- **Branch clean-up:** nine branches are merged.\n- **ME23's wording"));
  assert.ok(records.apply('status', 'open add', STATUS, { body, after: 'QL8' }).text.includes("amend both in the doc.\n- **ME23's wording"));
  const noted = records.apply('status', 'open note', STATUS, { match: 'QL8', body: 'Since `tend map 5` QL11 too.' }).text;
  assert.ok(noted.includes('amend both in the doc.\n  Since `tend map 5` QL11 too.\n- **The vision'));
  const set = records.apply('status', 'open set', STATUS, { match: 'QL8', body: "**QL8's wording** (Nov 12): amend QL8 alone; QL11 was amended by hand.", reason: 'the owner amended QL11' }).text;
  assert.ok(set.includes("- **The map's rule lines after `/tend map`** (Nov 12): reword l.68.\n  Its scale-bar line says the strip's top.\n- **QL8's wording** (Nov 12): amend QL8 alone; QL11 was amended by hand.\n- **The vision"), 'set in place');
  const gone = records.apply('status', 'open remove', STATUS, { match: 'The vision review', reason: 'the review is done' }).text;
  assert.ok(!gone.includes('Public data read by tile') && gone.includes('- **QL8') && gone.includes('- **The device milestone'), 'the bullet goes with its numbered lines');
  assert.throws(() => records.apply('status', 'open remove', STATUS, { match: '(Nov 12)' }), /in 2 open items/, 'one match only');
  assert.throws(() => records.apply('status', 'open remove', STATUS, { match: 'Voice and note' }), /no open item/, 'an inbox entry is not an open item');
});

test('records: rows of "In flight" come and go; a row of "Slices" is added or set under its own name', () => {
  const row = '| Free look (FL1-FL21) | `slice/free-look` | built |';
  const added = records.apply('status', 'inflight add', STATUS, { body: row }).text;
  assert.ok(added.includes('|---|---|---|\n' + row + '\n| Note pages'), 'newest first');
  assert.ok(records.apply('status', 'inflight add', STATUS, { body: row, end: true }).text.includes('`claude/complexes` | built |\n' + row + '\n\n## Updating'));
  assert.ok(records.apply('status', 'inflight set', STATUS, { match: 'Note pages', body: '| Note pages (NP1-NP14) | `claude/note-pages` | merged 2026-11-12 |' }).text.includes('| merged 2026-11-12 |\n| Complexes'));
  assert.ok(!records.apply('status', 'inflight remove', STATUS, { match: 'Complexes' }).text.includes('Complexes'));
  const slice = records.apply('status', 'slice row add', STATUS, { body: '| Free look (FL1-FL21) | built | `slice/free-look` | `specs/free-look/spec.md` | no |' }).text;
  assert.ok(slice.includes('`specs/landing/spec.md` | yes |\n| Free look'));
  assert.ok(records.apply('status', 'slice row add', STATUS, { body: '| Free look | built | x | y | no |', after: 'Rides' }).text.includes('| yes |\n| Free look | built | x | y | no |\n| Motion'));
  assert.ok(records.apply('status', 'slice row set', STATUS, { match: 'Rides', body: '| Rides | shipped, audited | `8e49c9c` | `specs/rides/spec.md` | yes |' }).text.includes('| Rides | shipped, audited |'));
  assert.throws(() => records.apply('status', 'inflight add', STATUS, { body: '| two | cells |' }), /cells/);
  assert.throws(() => records.apply('status', 'inflight add', STATUS, { body: 'no pipes' }), /"\|"/);
  assert.throws(() => records.apply('status', 'inflight add', STATUS, { body: '| a | b | c |\n| d | e | f |' }), /one line/);
});

test('records: deferred and native items are added, removed, tagged, noted, set, retagged and split, whole', () => {
  const added = records.apply('deferred', 'item add', DEFERRED, { section: 'Navigation and routes', body: '[loop] Go here keeps its last tap.' }).text;
  assert.ok(added.includes('main thread.\n- [loop] Go here keeps its last tap.\n\n## Quality'));
  assert.ok(records.apply('deferred', 'item add', DEFERRED, { section: 'Quality of life', body: 'x' }).text.includes('3. Dark mode\n- x\n'), 'a unique part of the title names it');
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Trace', body: 'x' }), /--new/);
  const fresh = records.apply('deferred', 'item add', DEFERRED, { section: 'Streets (S1-S4)', create: true, intro: 'What the streets left.', body: '[loop] A street after a relaunch.' }).text;
  assert.ok(fresh.endsWith('What the rides left.\n\n## Streets (S1-S4)\n\nWhat the streets left.\n\n- [loop] A street after a relaunch.\n'));
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Navigation and routes', create: true, body: 'x' }), /exists already/);
  const tagged = records.apply('deferred', 'item tag', DEFERRED, { match: 'A Go here tapped', tag: 'loop' }).text;
  assert.ok(tagged.includes('- [loop] A Go here tapped while a re-route runs is dropped.\n  - Since then'));
  assert.throws(() => records.apply('deferred', 'item tag', DEFERRED, { match: 'Cancel pressed', tag: 'owner' }), /tagged \[loop\] already.*retag/);
  assert.throws(() => records.apply('deferred', 'item tag', DEFERRED, { match: 'A Go here', tag: 'later' }), /one of/);
  const retagged = records.apply('deferred', 'item retag', DEFERRED, { match: 'Cancel pressed', tag: 'owner', reason: 'it asks for a choice' }).text;
  assert.ok(retagged.includes('- [owner] Go here: Cancel pressed while the read returns.\n'));
  assert.throws(() => records.apply('deferred', 'item retag', DEFERRED, { match: 'A Go here tapped', tag: 'owner' }), /untagged.*item tag/);
  const noted = records.apply('deferred', 'item note', DEFERRED, { match: 'GPX', body: 'Since Nov 12: asked for.' }).text;
  assert.ok(noted.includes('2. GPX export\n   (round 4)\n   Since Nov 12: asked for.\n3. Dark mode'), 'a numbered item\'s note lines up under its text');
  const set = records.apply('deferred', 'item set', DEFERRED, { match: 'GPX', body: 'GPX and GeoJSON export\n(round 5)', reason: 'the owner widened it' }).text;
  assert.ok(set.includes('1. Keep awake on a phone\n2. GPX and GeoJSON export\n   (round 5)\n3. Dark mode'), 'a set keeps the item\'s marker');
  assert.ok(records.apply('deferred', 'item add', DEFERRED, { section: 'Navigation and routes', body: 'x', top: true }).text.includes('## Navigation and routes\n\n- x\n- [loop] Go here'));
  const split = records.apply('deferred', 'item split', DEFERRED, { match: 'A Go here tapped', body: '- [loop] A Go here tapped while a re-route runs is dropped.\n- [owner] Since then: still dropped.' }).text;
  assert.ok(split.includes('- [loop] Go here: Cancel pressed while the read returns.\n- [loop] A Go here tapped while a re-route runs is dropped.\n- [owner] Since then: still dropped.\n- [owner] The route'));
  assert.throws(() => records.apply('deferred', 'item split', DEFERRED, { match: 'A Go here tapped', body: '- [loop] A Go here tapped is dropped.\n- [owner] Since then.' }), /missing: while, re, route, runs, still/);
  assert.throws(() => records.apply('deferred', 'item split', DEFERRED, { match: 'A Go here tapped', body: '- one bullet only with every word: A Go here tapped while a re-route runs is dropped. Since then: still dropped.' }), /two bullets/);
  assert.throws(() => records.apply('deferred', 'item split', DEFERRED, { match: 'A Go here tapped', body: '- [loop] A Go here tapped while a re-route runs is dropped.\n- [owner] Since then: still dropped, and now fixed.' }), /adds words: and, now, fixed/, 'a split is not a rewrite: it adds no word');
  const gone = records.apply('deferred', 'item remove', DEFERRED, { match: 'A Go here tapped' }).text;
  assert.ok(!gone.includes('Since then'), 'a bullet goes with its sub-bullets');
  assert.throws(() => records.apply('deferred', 'item remove', DEFERRED, { match: 'Go here' }), /in 2 items/);
  const nat = records.apply('native', 'item add', NATIVE, { section: 'Compass (CP1-CP8)', body: '- [ ] **Do:** reduce motion. **Expect:** a snap.' }).text;
  assert.ok(nat.endsWith('**Expect:** north.\n- [ ] **Do:** reduce motion. **Expect:** a snap.\n'));
  assert.throws(() => records.apply('status', 'item add', STATUS, { section: 'Slices', body: 'x' }), /not docs\/STATUS\.md/);
  assert.throws(() => records.apply('deferred', 'open add', DEFERRED, { body: 'x' }), /docs\/STATUS\.md only/);
});

// ---------------------------------------------------------------------------------------------------
// Declared operations, replayed.

test('records replay: trailers name each operation, its arguments and its body\'s hash; the sidecar holds the bodies', () => {
  const ops: Op[] = [
    { argv: ['inbox', 'add'], body: '- **T? [owner] Map: a bare numeral** (2026-11-12)\n  Area: map.' },
    { argv: ['open', 'add', '--after', "QL8's and QL11's"], body: 'A new open item, "quoted".' },
    { argv: ['open', 'remove', 'The vision review', '--reason', 'done (Nov 12)'] },
    { argv: ['deferred', 'item', 'add', 'Streets', '--new'], body: '[loop] One.', intro: 'What the streets left.' },
  ];
  const lines = records.trailersOf(ops);
  assert.equal(lines.length, 4);
  assert.match(lines[0], /^Records-Op: inbox add sha256:[0-9a-f]{64}$/);
  assert.match(lines[1], /^Records-Op: open add --after "QL8's and QL11's" sha256:[0-9a-f]{64}$/);
  assert.equal(lines[2], 'Records-Op: open remove "The vision review" --reason "done (Nov 12)"');
  assert.match(lines[3], /^Records-Op: deferred item add Streets --new --intro sha256:[0-9a-f]{64} sha256:[0-9a-f]{64}$/);
  const sidecar = JSON.parse(records.sidecarOf(ops)) as { ops: Op[] };
  assert.deepEqual(sidecar.ops, ops, 'the sidecar is the operations, bodies in plain text');
  for (const [k, line] of lines.entries()) assert.deepEqual(records.parseTrailer(line).argv, ops[k].argv, 'a trailer reads back as its arguments');
  const r = records.replay(DOCS0, ops, { ledger: LEDGER });
  assert.match(r.docs['docs/STATUS.md'], /- \*\*T19 \[owner\] Map: a bare numeral\*\*/);
  assert.ok(r.docs['docs/DEFERRED.md'].endsWith('## Streets\n\nWhat the streets left.\n\n- [loop] One.\n'));
  assert.equal(r.docs['docs/NATIVE_UNVERIFIED.md'], NATIVE);
  assert.deepEqual(problems(DOCS0, ops), [], 'a commit made of its declared operations passes');
});

test('records replay: a commit\'s documents must be its declared operations replayed on its parent\'s, byte for byte', () => {
  const ops: Op[] = [{ argv: ['open', 'add'], body: 'A new open item.' }];
  const good = made(DOCS0, ops);
  // One byte more than the operations made.
  const extra = withStatus(good.head, good.head['docs/STATUS.md'].replace('A new open item.', 'A new open item!'));
  assert.match(forged(DOCS0, extra, ops).join('\n'), /docs\/STATUS\.md[\s\S]*does not match its declared operations/);
  // A hand edit with no trailers at all.
  assert.match(forged(DOCS0, withStatus(DOCS0, STATUS.replace('reword l.68.', 'done.'))).join('\n'), /no Records-Op trailer[\s\S]*npm run records/);
  // A change in a document no operation named.
  assert.match(forged(DOCS0, withDeferred(good.head, DEFERRED.replace('Dark mode', 'Dark theme')), ops).join('\n'), /docs\/DEFERRED\.md[\s\S]*does not match/);
  // The body changed after its hash was taken.
  const sidecar = good.sidecar.replace('A new open item.', 'Another item.');
  assert.match(records.checkCommit({ ...good, sidecar, state: records.newRangeState() }).join('\n'), /sha256/);
  // Trailers and sidecar that disagree; a trailer with no sidecar for its body.
  const two: Op[] = [...ops, { argv: ['open', 'add', '--end'], body: 'Second.' }];
  assert.match(records.checkCommit({ ...made(DOCS0, two), sidecar: records.sidecarOf(ops), state: records.newRangeState() }).join('\n'), /sidecar/);
  assert.match(records.checkCommit({ ...good, sidecar: null, state: records.newRangeState() }).join('\n'), /sidecar/);
  // Order is part of the declaration: two adds at the top come out in the order they ran.
  const a: Op[] = [{ argv: ['open', 'add'], body: 'First.' }, { argv: ['open', 'add'], body: 'Second.' }];
  const swapped = [a[1], a[0]];
  assert.match(records.checkCommit({ ...made(DOCS0, a), message: `tend map: x\n\n${records.trailersOf(swapped).join('\n')}\n`, sidecar: records.sidecarOf(swapped), state: records.newRangeState() }).join('\n'), /does not match/);
  // An operation that cannot run on the parent's documents fails as such.
  assert.match(forged(DOCS0, DOCS0, [{ argv: ['open', 'remove', 'nothing like this', '--reason', 'x'] }]).join('\n'), /no open item holds "nothing like this"/);
});

test('records replay: an inbox entry\'s number comes from the parent\'s ledger and document, the same on both sides', () => {
  const ops: Op[] = [{ argv: ['inbox', 'add'], body: '- **T? [owner] a** (2026-11-12)' }, { argv: ['inbox', 'add'], body: '- **T? [owner] b** (2026-11-12)' }];
  const r = records.replay(DOCS0, ops, { ledger: LEDGER }).docs['docs/STATUS.md'];
  assert.ok(r.includes('- **T19 [owner] a**') && r.includes('- **T20 [owner] b**'));
  assert.ok(records.replay(DOCS0, ops, { ledger: { lastT: 30 } }).docs['docs/STATUS.md'].includes('- **T31 [owner] a**'), 'a ledger ahead (main moved) numbers on from it, so the same trailers hold after a rebase');
  assert.match(forged(DOCS0, DOCS0, [{ argv: ['inbox', 'add', '--id', 'T12'], body: '- **T? x**' }]).join('\n'), /already given out/);
});

test('records caps: at most two entries the run did not file are removed or set per section per commit, each with a reason', () => {
  const rm = (match: string): Op => ({ argv: ['open', 'remove', match, '--reason', 'shipped'] });
  assert.deepEqual(problems(DOCS0, [rm('QL8'), rm('The vision review')]), []);
  assert.match(problems(DOCS0, [rm('QL8'), rm('The vision review'), rm('device milestone')]).join('\n'), /at most two[\s\S]*Open before the loop/);
  // Other sections count apart; notes, first tags and splits are not counted.
  assert.deepEqual(problems(DOCS0, [rm('QL8'), rm('The vision review'), { argv: ['inbox', 'remove', 'T11', '--reason', 'built'] }, { argv: ['open', 'note', 'device milestone'], body: 'Still.' }]), []);
  const del = (m: string): Op => ({ argv: ['deferred', 'item', 'remove', m, '--reason', 'shipped'] });
  assert.deepEqual(problems(DOCS0, [del('Cancel pressed'), del('planner'), { argv: ['deferred', 'item', 'tag', 'A Go here tapped', 'loop'] }, { argv: ['deferred', 'item', 'split', 'A Go here tapped'], body: '- [loop] A Go here tapped while a re-route runs is dropped.\n- [loop] Since then: still dropped.' }]), [], 'a first tag and a split beside two removals are not counted');
  const items: Op[] = ['Cancel pressed', 'route preview', 'planner'].map((m) => ({ argv: ['deferred', 'item', 'remove', m, '--reason', 'shipped'] }));
  assert.match(problems(DOCS0, items).join('\n'), /at most two[\s\S]*Navigation and routes/);
  assert.match(problems(DOCS0, ['T11', 'T13', 'T14'].map((t) => ({ argv: ['inbox', 'remove', t, '--reason', 'answered'] }))).join('\n'), /at most two[\s\S]*From \/tend/);
  const sets: Op[] = ['QL8', 'The vision review', 'device milestone'].map((m) => ({ argv: ['open', 'set', m, '--reason', 'reworded'], body: `Reworded ${m}.` }));
  assert.match(problems(DOCS0, sets).join('\n'), /at most two/, 'a set counts as a removal');
  // A reason is required for what the run did not file, and recorded.
  assert.match(problems(DOCS0, [{ argv: ['open', 'remove', 'QL8'] }]).join('\n'), /--reason/);
  assert.match(problems(DOCS0, [{ argv: ['deferred', 'item', 'set', 'GPX'], body: 'GPX export, done.' }]).join('\n'), /--reason/);
  assert.match(problems(DOCS0, [{ argv: ['inbox', 'set', 'T11'], body: '- **T11 [owner] cut** (2026-11-12)' }]).join('\n'), /--reason/);
  assert.match(problems(DOCS0, [{ argv: ['open', 'remove', 'QL8', '--reason', ' '] }]).join('\n'), /--reason/, 'a blank reason is none');
});

test('records caps: what the run filed, in an earlier commit of the range or earlier in the same one, it may set and remove freely', () => {
  const state = records.newRangeState();
  const c1: Op[] = [{ argv: ['open', 'add'], body: 'Filed by this run, one.' }, { argv: ['open', 'add'], body: 'Filed by this run, two.' }, { argv: ['open', 'add'], body: 'Filed by this run, three.' }, { argv: ['inbox', 'add'], body: '- **T? [owner] Filed** (2026-11-12)' }];
  const m1 = made(DOCS0, c1);
  assert.deepEqual(records.checkCommit({ ...m1, state }), []);
  const c2: Op[] = [
    { argv: ['open', 'set', 'Filed by this run, one.'], body: 'Filed by the run, reworded.' },
    { argv: ['open', 'remove', 'Filed by this run, two.'] },
    { argv: ['open', 'remove', 'Filed by this run, three.'] },
    { argv: ['inbox', 'set', 'T19'], body: '- **T19 [owner] Filed, reshaped** (2026-11-12)' },
    { argv: ['open', 'remove', 'Filed by the run, reworded.'] },
  ];
  assert.deepEqual(records.checkCommit({ ...made(m1.head, c2), state }), [], 'the run amends what it filed: no cap, no reason');
  assert.deepEqual(problems(DOCS0, [{ argv: ['open', 'add'], body: 'Mine.' }, { argv: ['open', 'set', 'Mine.'], body: 'Mine, reworded.' }]), [], 'earlier in the same commit counts');
});

test('records tags: a tag moves toward [owner], [arch] or [kept], never from [owner] or [arch] to [loop]', () => {
  const retag = (match: string, tag: string): Op => ({ argv: ['deferred', 'item', 'retag', match, tag, '--reason', 'triage'] });
  assert.deepEqual(problems(DOCS0, [retag('Cancel pressed', 'owner')]), []);
  assert.deepEqual(problems(DOCS0, [retag('route preview', 'kept')]), []);
  assert.match(problems(DOCS0, [retag('route preview', 'loop')]).join('\n'), /\[owner\] to \[loop\]/);
  assert.match(problems(DOCS0, [retag('planner', 'loop')]).join('\n'), /\[arch\] to \[loop\]/);
  assert.match(problems(DOCS0, [{ argv: ['deferred', 'item', 'set', 'route preview', '--reason', 'r'], body: "[loop] The route preview's selected row shows by a border alone." }]).join('\n'), /\[owner\] to \[loop\]/);
  assert.match(problems(DOCS0, [{ argv: ['deferred', 'item', 'set', 'route preview', '--reason', 'r'], body: "The route preview's selected row shows by a border alone." }]).join('\n'), /\[owner\] to no tag/);
  assert.match(problems(DOCS0, [{ argv: ['inbox', 'set', 'T11', '--reason', 'r'], body: '- **T11 [loop] Voice and note are two taps away** (2026-11-11)' }]).join('\n'), /\[owner\] to \[loop\]/);
  assert.deepEqual(problems(DOCS0, [{ argv: ['deferred', 'item', 'tag', 'A Go here tapped', 'loop'] }]), [], 'an untagged item takes any tag');
});

// ---------------------------------------------------------------------------------------------------
// The audit's findings (records-script-auditor, Nov 12), each a regression test.

test('records audit 1: 6af0c01f with its heading and one item kept fails, declared or not', () => {
  const real = realDocs();
  const items = openItems(real['docs/STATUS.md']);
  assert.ok(items.length >= 3, 'the real "Open before the loop" holds items');
  const ops: Op[] = [{ argv: ['last-tend', 'set'], body: '**Nov 12, `/tend replay`**, a sweep.' }, ...items.slice(1).map((b) => ({ argv: ['open', 'remove', b.text.split('\n')[0], '--reason', 'done'] }))];
  assert.match(problems(real, ops).join('\n'), /at most two[\s\S]*Open before the loop/, 'declared, the removals are capped');
  const head = made(real, ops).head;
  assert.match(forged(real, head, [ops[0]]).join('\n'), /does not match its declared operations/, 'undeclared, the replay of "last-tend set" alone does not make it');
});

test('records audit 2: every T entry removed at once fails', () => {
  const ops: Op[] = ['T11', 'T13', 'T14'].map((t) => ({ argv: ['inbox', 'remove', t, '--reason', 'answered'] }));
  assert.match(problems(DOCS0, ops).join('\n'), /at most two[\s\S]*From \/tend/);
  assert.match(forged(DOCS0, made(DOCS0, ops).head, ops.slice(0, 2)).join('\n'), /docs\/STATUS\.md does not match its declared operations/, 'two declared, three gone: the third is a hand edit');
});

test('records audit 3: an open item reworded where it stands is "open set", with its reason; a remove and add put back in place pass too', () => {
  const body = "**The map's rule lines after `tend map 7`** (Nov 13): fitBounds pads the strip.";
  assert.deepEqual(problems(DOCS0, [{ argv: ['open', 'set', "The map's rule lines", '--reason', 'tend map 7 changed the rule'], body }]), []);
  assert.deepEqual(problems(DOCS0, [{ argv: ['open', 'remove', "The map's rule lines", '--reason', 'reworded'] }, { argv: ['open', 'add'], body }]), [], 'position is no longer the rule: the declaration is');
  const d = (match: string): Op => ({ argv: ['deferred', 'item', 'remove', match, '--reason', 'reworded'] });
  assert.deepEqual(problems(DOCS0, [d('Cancel pressed'), { argv: ['deferred', 'item', 'add', 'Navigation and routes', '--top'], body: '[loop] Go here: Cancel pressed while the read has returned.' }]), []);
});

test('records audit 4: replacing an item the run did not file needs a stated reason, in one commit or across two', () => {
  const unreasoned = records.newRangeState();
  const m1 = made(DOCS0, [{ argv: ['open', 'remove', 'QL8'] }]);
  assert.match(records.checkCommit({ ...m1, state: unreasoned }).join('\n'), /--reason/, 'commit one removes it without a reason');
  assert.deepEqual(records.checkCommit({ ...made(m1.head, [{ argv: ['open', 'add', '--after', "The map's rule lines"], body: '**Settled** (Nov 13): no change needed.' }]), state: unreasoned }), [], 'commit two puts the gutted text where it stood: the add is the run\'s, the removal was the fault');
  const state = records.newRangeState();
  const r1 = made(DOCS0, [{ argv: ['open', 'remove', 'QL8', '--reason', 'the owner amended both (Nov 12)'] }]);
  assert.deepEqual(records.checkCommit({ ...r1, state }), []);
  assert.match(r1.message, /--reason "the owner amended both \(Nov 12\)"/, 'the reason is in the trailer');
  assert.deepEqual(records.checkCommit({ ...made(r1.head, [{ argv: ['open', 'add', '--after', "The map's rule lines"], body: '**Settled** (Nov 13): no change needed.' }]), state }), []);
});

test('records audit 5: an [owner] item re-tagged [loop] by moving it fails, in one commit or across the range', () => {
  const remove: Op = { argv: ['deferred', 'item', 'remove', '[owner] The route preview', '--reason', 'moved'] };
  const addLoop: Op = { argv: ['deferred', 'item', 'add', 'Navigation and routes', '--top'], body: "[loop] The route preview's selected row shows by a border alone." };
  assert.match(problems(DOCS0, [remove, addLoop]).join('\n'), /\[owner\] to \[loop\]/);
  assert.match(problems(DOCS0, [addLoop, remove]).join('\n'), /\[owner\] to \[loop\]/, 'added first, removed after');
  const state = records.newRangeState();
  const m1 = made(DOCS0, [remove]);
  assert.deepEqual(records.checkCommit({ ...m1, state }), []);
  assert.match(records.checkCommit({ ...made(m1.head, [addLoop]), state }).join('\n'), /\[owner\] to \[loop\]/, 'removed in one commit, put back as [loop] in the next');
  assert.deepEqual(problems(DOCS0, [remove, { ...addLoop, body: "[arch] The route preview's selected row shows by a border alone." }]), [], 'toward [arch] is allowed');
});

test('records audit 6: a "Slices" row is set only under its own name, with its table\'s cells', () => {
  assert.throws(() => records.apply('status', 'slice row set', STATUS, { match: 'v1.5: landing', body: '| Foo | built | x | y | no |' }), /keeps its name/);
  assert.throws(() => records.apply('status', 'slice row set', STATUS, { match: 'Rides', body: '| Rides | shipped |' }), /cells/);
  assert.throws(() => records.apply('status', 'inflight set', STATUS, { match: 'Note pages', body: '| Other | `x` | built |' }), /keeps its name/);
  const swapped = withStatus(DOCS0, STATUS.replace("| v1.5: landing (What's good here) | shipped | `2372244` | `specs/landing/spec.md` | yes |", '| Foo | built | x | y | no |'));
  assert.match(forged(DOCS0, swapped, [{ argv: ['slice', 'row', 'set', 'v1.5: landing'], body: '| Foo | built | x | y | no |' }]).join('\n'), /keeps its name/, 'declared as a row set, the swap is refused by the operation');
});

test('records audit 7: a new section goes after the last block, with one intro paragraph at most; no kept block changes section', () => {
  const ops: Op[] = [{ argv: ['deferred', 'item', 'add', 'Done: nothing left', '--new'], body: '[kept] x', intro: 'One paragraph.' }];
  assert.ok(made(DOCS0, ops).head['docs/DEFERRED.md'].endsWith('What the rides left.\n\n## Done: nothing left\n\nOne paragraph.\n\n- [kept] x\n'));
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Done', create: true, intro: 'One.\n\nTwo.', body: 'x' }), /one paragraph/);
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Done', create: true, intro: 'One.\n- a bullet', body: 'x' }), /paragraph/);
  // The hand-made version: an H2 inserted before the second item of a section.
  const mid = DEFERRED.replace('- A Go here tapped', '## Done: nothing left\n\nOne.\n\nTwo.\n\n- A Go here tapped');
  assert.match(forged(DOCS0, withDeferred(DOCS0, mid), [{ argv: ['deferred', 'item', 'add', 'Done: nothing left', '--new'], body: 'Two.', intro: 'One.' }]).join('\n'), /docs\/DEFERRED\.md does not match its declared operations/, 'declared as a new section, it lands at the end, not mid-section');
  // An operation's body that would start a section is refused before it is written.
  assert.throws(() => records.apply('deferred', 'item note', DEFERRED, { match: 'GPX', body: 'x\n## Done' }), /heading/);
  assert.throws(() => records.apply('status', 'open add', STATUS, { body: 'x\nDone\n===' }), /heading|rule/);
});

test('records audit 8: text copied into "Last tend" is not filed by the run: what the run filed is what its filing operations added', () => {
  const real = realDocs();
  const items = openItems(real['docs/STATUS.md']);
  const state = records.newRangeState();
  const copy = items.map((b) => b.text.replace(/^- /, '').replace(/\n\s+/g, ' ')).join('\n');
  const m1 = made(real, [{ argv: ['last-tend', 'set'], body: copy }]);
  assert.deepEqual(records.checkCommit({ ...m1, state }), []);
  const c2: Op[] = [{ argv: ['last-tend', 'set'], body: 'The digest.' }, ...items.slice(0, 3).map((b) => ({ argv: ['open', 'remove', b.text.split('\n')[0], '--reason', 'filed by this run'] }))];
  assert.match(records.checkCommit({ ...made(m1.head, c2), state }).join('\n'), /at most two/);
});

test('records audit 9: the parser reads markdown\'s block starts, and a body that would start a block is refused', () => {
  const doc = '# T\n\n## A\n\n- one\n<!-- a comment\n- two\n-->\n\n   ## B\n\nSetext\n---\n\n***\n\npara\n2. not an item\n';
  const blocks = records.parse(doc).blocks.filter((b) => b.kind !== 'blank');
  assert.ok(blocks.some((b) => b.kind === 'html' && b.text.startsWith('<!-- a comment') && b.text.endsWith('-->')), 'an HTML comment is a block to its end');
  assert.ok(blocks.some((b) => b.kind === 'heading' && b.text === '   ## B'), 'a heading may stand three spaces in');
  assert.ok(blocks.some((b) => b.kind === 'heading' && b.text === 'Setext\n---' && b.level === 2), 'a setext heading');
  assert.ok(blocks.some((b) => b.kind === 'rule'), 'a thematic break');
  assert.ok(blocks.some((b) => b.kind === 'para' && b.text === 'para\n2. not an item'), 'only "1." starts a list inside a paragraph');
  assert.equal(blocks.find((b) => b.text === '- one')?.h2, 'A');
  for (const bad of ['A digest.\n<!--', 'A digest.\n   ## In flight', 'A digest.\n---', 'A digest.\n<details>']) {
    assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: bad }), /heading|HTML|rule/, bad);
  }
  assert.throws(() => records.apply('status', 'open note', STATUS, { match: 'QL8', body: '<!--' }), /HTML/);
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Navigation and routes', body: 'x\n<!-- y' }), /HTML/);
  // An item added under a section that ends in a paragraph stands apart from it.
  const r = records.apply('deferred', 'item add', DEFERRED, { section: 'Rides (R1-R14)', body: '2. second' }).text;
  assert.ok(r.endsWith('What the rides left.\n\n2. second\n'), r.slice(-60));
});

test('records audit 11: a merge in a loop push that touches the documents fails; a shallow boundary is skipped with a notice; a revert of a loop commit is gated', () => {
  const r = repo('merges');
  r.git('checkout', '-q', '-b', 'side');
  r.write('docs/DEFERRED.md', DEFERRED.replace('3. Dark mode', '3. Dark mode, by hand'));
  r.commit('Owner: a hand edit on a side branch');
  r.git('checkout', '-q', 'main');
  r.write('other.txt', 'x\n');
  r.commit('tend map 1: a loop commit');
  r.git('merge', '-q', '--no-ff', '--no-commit', 'side');
  r.write('docs/STATUS.md', STATUS.replace('reword l.68.', 'reworded while merging.'));
  r.commit('Merge side');
  const g = records.gateRange('HEAD~2..HEAD', { cwd: r.dir, loopOnly: true });
  assert.ok(!g.ok);
  assert.match(g.results.flatMap((x) => x.problems).join('\n'), /merge[\s\S]*cannot be replayed/);
  // Without a loop commit in the range, a merge is left with a notice.
  assert.ok(records.gateRange('HEAD^1..HEAD', { cwd: r.dir, loopOnly: true }).ok);
  // A revert of a loop commit that edits the records by hand is gated.
  r.write('docs/STATUS.md', STATUS.replace('reword l.68.', 'reworded.'));
  r.commit('Revert "tend map 1: a loop commit"');
  assert.match(records.gateRange('HEAD~1..HEAD', { cwd: r.dir, loopOnly: true }).results.flatMap((x) => x.problems).join('\n'), /no Records-Op trailer/);
  // A shallow clone's boundary commit has no parent to replay on: a notice, not a failure.
  const shallow = join(tmp, 'shallow');
  spawnSync('git', ['clone', '-q', '--depth', '1', `file://${r.dir}`, shallow], { env });
  const s = records.gateRange('HEAD', { cwd: shallow, loopOnly: true });
  assert.ok(s.ok, JSON.stringify(s.results));
  assert.match(s.results.flatMap((x) => x.notices).join('\n'), /shallow/);
});

test('records audit 12: an open item titled after an inbox entry is an open item; ids live in the inbox alone', () => {
  assert.deepEqual(problems(DOCS0, [{ argv: ['open', 'add'], body: "**T12's wording after the review** (Nov 13): amend it." }]), []);
  const text = records.apply('status', 'open add', STATUS, { body: '**T12 [owner] wording** (Nov 13): amend it.' }).text;
  assert.equal(records.parse(text).blocks.find((b) => b.text.includes('T12 [owner] wording'))?.id, undefined);
  assert.equal(records.parse('## Needs the owner\n\n### From /tend\n\n- **T125x** odd\n').blocks.find((b) => b.kind === 'item')?.id, undefined, 'the number ends at a space or the bold');
});

test('records audit 13: an unbalanced fence is refused up front, and a CRLF document keeps its line endings', () => {
  assert.throws(() => records.apply('status', 'open add', STATUS, { body: 'x\n```\ny' }), /fence/);
  assert.throws(() => records.apply('deferred', 'item note', DEFERRED, { match: 'GPX', body: '~~~' }), /fence/);
  assert.ok(records.apply('status', 'open add', STATUS, { body: 'x\n```\ny\n```' }).text.includes('- x\n  ```\n  y\n  ```\n'), 'a balanced fence is fine');
  const crlf = DEFERRED.replace(/\n/g, '\r\n');
  const out = records.apply('deferred', 'item add', crlf, { section: 'Navigation and routes', body: 'x\ny' }).text;
  assert.ok(out.includes('main thread.\r\n- x\r\n  y\r\n\r\n## Quality'));
  assert.ok(!/[^\r]\n/.test(out), 'every line ends CRLF');
  assert.throws(() => records.apply('deferred', 'item add', crlf.replace('\r\n## Quality', '\n## Quality'), { section: 'Navigation and routes', body: 'x' }), /line endings/);
});

test('records audit 14: every skill that writes the record documents names the operations and the check', () => {
  const writers = ['tend/SKILL.md', 'ship.md', 'slice/SKILL.md', 'fix/SKILL.md', 'tend-orchestrator/briefs.md', 'README.md', 'audit/SKILL.md', 'docs-gc/SKILL.md', 'deploy/SKILL.md'];
  // Skills that name the documents but only read them (or leave writing to a skill they run).
  const readers: Record<string, string> = { 'vision/SKILL.md': 'reads DEFERRED for precedent', 'tend-orchestrator/SKILL.md': 'its runs write, through briefs.md' };
  const all: string[] = [];
  const walk = (dir: string, rel = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${rel}${e.name}/`);
      else if (e.name.endsWith('.md')) all.push(`${rel}${e.name}`);
    }
  };
  walk(join(ROOT, '.claude', 'skills'));
  const naming = all.filter((rel) => /\b(STATUS|DEFERRED|NATIVE_UNVERIFIED)\.md/.test(read(`.claude/skills/${rel}`)));
  for (const rel of naming) assert.ok(writers.includes(rel) || rel in readers, `${rel} names a record document: list it as a writer or a reader here`);
  for (const rel of writers) {
    const text = read(`.claude/skills/${rel}`);
    assert.match(text, /npm run records --/, `${rel} names the operations`);
    assert.match(text, /check:records/, `${rel} runs the check before a record commit`);
  }
  for (const rel of ['tend/SKILL.md', 'ship.md']) assert.match(read(`.claude/skills/${rel}`), /--reason/, `${rel} says a removal needs its reason`);
  assert.match(read('.claude/skills/ship.md'), /records -- trailers/);
  assert.match(read('docs/decisions/README.md'), /\[0156\]\(0156-/);
});

test('records audit 15: the loop\'s gate is named in FORBIDDEN, not only covered by the wider scripts/ line', () => {
  for (const path of ['scripts/records.js', 'src/lib/__tests__/arch/records.test.ts', 'src/lib/__tests__/arch/tend.test.ts']) {
    const own = tend.FORBIDDEN.filter((re) => re.test(path) && /records|tend/.test(re.source));
    assert.ok(own.length > 0, `${path} has its own FORBIDDEN line`);
    assert.ok(tend.tendCommitProblems({ subject: "tend map: the run's record", body: '', files: [{ status: 'M', path }] }).some((p) => p.includes(path)), path);
  }
  assert.deepEqual(tend.tendCommitProblems({ subject: "tend map: the run's record", body: '', files: [{ status: 'A', path: '.claude/records/20261112-120000-abcdef12.json' }, { status: 'M', path: 'docs/STATUS.md' }] }), [], 'a record commit adds its sidecar with no test asked');
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts.records, 'node scripts/records.js');
  assert.equal(pkg.scripts['check:records'], 'node scripts/records.js verify');
});

test('records audit 16: the owner\'s hand edit is caught by check:records and left alone by the loop-only gate', () => {
  const r = repo('owner');
  r.write('docs/DEFERRED.md', cut(r.read('docs/DEFERRED.md'), '## Navigation and routes'));
  r.commit('STATUS: the owner clears a section');
  assert.equal(r.node('scripts/records.js', 'verify', 'HEAD~1..HEAD').status, 1, 'every commit after the cut-over is gated by check:records');
  assert.equal(r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD').status, 0, 'the loop-only gate reads loop commits alone');
  r.commit('tend map: an empty loop commit', true);
  r.write('docs/DEFERRED.md', DEFERRED);
  r.commit("tend map: the run's record");
  assert.equal(r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~3..HEAD').status, 1, 'the same kind of edit in a loop commit fails');
});

test('records audit 17: a range is read commit by commit, so a hand edit undone later still fails', () => {
  const r = repo('net');
  r.write('docs/STATUS.md', STATUS.replace('reword l.68.', 'reworded.'));
  r.commit("tend map: the run's record");
  r.write('docs/STATUS.md', STATUS);
  r.commit("tend map: the run's record, after the review");
  const v = r.node('scripts/records.js', 'verify', 'HEAD~2..HEAD');
  assert.equal(v.status, 1);
  assert.match(v.stderr, /no Records-Op trailer/);
});

test('records cut-over: commits that are ancestors of the cut-over carry no trailers and are not gated', () => {
  assert.match(records.CUTOVER, /^[0-9a-f]{40}$/);
  const r = repo('cutover');
  r.write('docs/STATUS.md', STATUS.replace('reword l.68.', 'reworded.'));
  r.commit("tend map: the run's record");
  const sha = r.git('rev-parse', 'HEAD').stdout.trim();
  assert.ok(!records.gateRange('HEAD~1..HEAD', { cwd: r.dir, loopOnly: true }).ok, 'after the cut-over: gated');
  assert.ok(records.gateRange('HEAD~1..HEAD', { cwd: r.dir, loopOnly: true, cutover: sha }).ok, 'at or before the cut-over: not gated');
  assert.ok(!records.gateRange('HEAD~1..HEAD', { cwd: r.dir, loopOnly: true, cutover: 'f'.repeat(40) }).ok, 'a cut-over the clone lacks gates every commit');
});

test('records cut-over: commits made before the gate are history; every descendant of the gate is replayed', () => {
  const r = repo('before-gate', { gate: false });
  r.write('docs/STATUS.md', STATUS.replace('reword l.68.', 'reworded.'));
  r.commit("tend map: the run's record");
  assert.ok(records.gateRange('HEAD~1..HEAD', { cwd: r.dir, loopOnly: true }).ok, 'made before the gate: history');
  copyFileSync(join(ROOT, 'scripts', 'records.js'), join(r.dir, 'scripts', 'records.js'));
  r.commit('Records: the replay gate lands');
  r.write('docs/STATUS.md', STATUS);
  r.commit("tend map: the run's record");
  assert.ok(!records.gateRange('HEAD~1..HEAD', { cwd: r.dir, loopOnly: true }).ok, 'made on top of the gate: replayed');
  assert.ok(!records.gateRange('HEAD~1..HEAD', { cwd: r.dir, loopOnly: true, cutover: r.git('rev-parse', 'HEAD~1').stdout.trim() }).ok, 'the recorded cut-over does not exempt what came after it');
});

// ---------------------------------------------------------------------------------------------------
// Round 2 of the audit (records-script-r2-auditor, Nov 12): F14-F26 and the tests that could not fail.

test('records audit 18: a body, row or section name with a lone carriage return is refused, and so is a document holding one', () => {
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Navigation and routes', top: true, body: '[loop] x\r## Done: nothing left here' }), /carriage return/);
  assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: 'A digest.\r<!--' }), /carriage return/);
  assert.throws(() => records.apply('status', 'inbox note', STATUS, { match: 'T11', body: 'ok\r<!--' }), /carriage return/);
  assert.throws(() => records.apply('status', 'inflight add', STATUS, { body: '| a\r| b | c |' }), /carriage return/);
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Done\r## x', create: true, body: 'x' }), /carriage return/);
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Done', create: true, intro: 'One.\r## x', body: 'x' }), /carriage return/);
  assert.throws(() => records.parse('# T\r## U\n'), /carriage return/);
  assert.ok(records.apply('deferred', 'item add', DEFERRED.replace(/\n/g, '\r\n'), { section: 'Navigation and routes', body: 'x' }).text.includes('\r\n- x\r\n'), 'CRLF is still a line ending');
});

test('records audit 19: a loop commit after a non-loop commit that drops the marker is still replayed, and the dropped marker is a problem', () => {
  const r = repo('marker');
  r.write('scripts/records.js', r.read('scripts/records.js').replace(/Records-Op/g, 'Records\\u002dOp'));
  r.commit('Records: a refactor');
  r.write('docs/DEFERRED.md', cut(DEFERRED, '## Navigation and routes', true));
  r.commit("tend map: the run's record");
  const g = records.gateRange('HEAD~2..HEAD', { cwd: r.dir, loopOnly: true });
  assert.ok(!g.ok);
  const said = g.results.flatMap((x) => x.problems).join('\n');
  assert.match(said, /no Records-Op trailer/);
  assert.match(said, /no longer holds the gate/);
});

test('records audit 20: an [owner] item re-added as [loop] with a word changed, or in the other document, needs a reason naming it', () => {
  const remove: Op = { argv: ['deferred', 'item', 'remove', '[owner] The route preview', '--reason', 'moved'] };
  const reworded: Op = { argv: ['deferred', 'item', 'add', 'Navigation and routes', '--top'], body: '[loop] The route preview shows by a border alone' };
  const native: Op = { argv: ['native', 'item', 'add', 'Compass (CP1-CP8)'], body: "- [ ] [loop] The route preview's selected row shows by a border alone." };
  for (const add of [reworded, native]) {
    assert.match(problems(DOCS0, [remove, add]).join('\n'), /names? .*The route preview's selected row shows b/, add.argv[0]);
    assert.match(problems(DOCS0, [add, remove]).join('\n'), /names? .*The route preview's selected row shows b/, `${add.argv[0]}, added first`);
  }
  const state = records.newRangeState();
  const m1 = made(DOCS0, [remove]);
  assert.deepEqual(records.checkCommit({ ...m1, state }), []);
  assert.match(records.checkCommit({ ...made(m1.head, [reworded]), state }).join('\n'), /The route preview's selected row shows b/, 'across commits of the range');
  const named: Op = { ...reworded, argv: [...reworded.argv, '--reason', "the owner's call on The route preview's selected row shows b... is now the loop's: decided in T30"] };
  assert.deepEqual(problems(DOCS0, [remove, named]), [], 'a reason naming the item lets it through');
  assert.deepEqual(problems(DOCS0, [{ argv: ['deferred', 'item', 'remove', 'Cancel pressed', '--reason', 'shipped'] }, reworded]), [], 'a [loop] item removed is not the owner\'s');
});

test('records audit 21: redo after main took the number keeps the run\'s note on the run\'s entry, and refuses a target that changed', () => {
  const r = repo('target');
  assert.equal(r.stdin('- **T? [owner] a** (2026-11-12)\n', 'scripts/records.js', 'inbox', 'add').status, 0);
  assert.equal(r.stdin('**Answered** (Nov 13): the owner said no; drop it.\n', 'scripts/records.js', 'inbox', 'note', 'T19').status, 0);
  assert.match(r.node('scripts/records.js', 'trailers').stdout, /^Records-Op: inbox note @1 sha256:/m, 'the note names the run\'s own entry by its handle');
  const side = readdirSync(join(r.dir, '.claude', 'records'))[0];
  const kept = r.read(`.claude/records/${side}`);
  r.git('reset', '-q', '--hard');
  r.git('clean', '-qfd');
  // main files its own T19 meanwhile.
  r.write('docs/STATUS.md', STATUS.replace('  Recommended: its kinds.\n', '  Recommended: its kinds.\n- **T19 [owner] main\'s own** (2026-11-13)\n'));
  r.write('.claude/skills/tend/ledger.json', JSON.stringify({ lastT: 19, lastG: 4, areas: {} }, null, 2) + '\n');
  r.commit('Owner: main files T19');
  mkdirSync(join(r.dir, '.claude', 'records'), { recursive: true });
  r.write(`.claude/records/${side}`, kept);
  const redo = r.node('scripts/records.js', 'redo');
  assert.equal(redo.status, 0, redo.stderr);
  const doc = r.read('docs/STATUS.md');
  assert.ok(doc.includes("- **T19 [owner] main's own** (2026-11-13)\n- **T20 [owner] a** (2026-11-12)\n  **Answered** (Nov 13): the owner said no; drop it.\n"), doc);
  // A sidecar that names the number itself refuses: T19 is not the entry it noted.
  const raw = (JSON.parse(kept) as { ops: (Op & { target?: string })[] }).ops;
  raw[1] = { ...raw[1], argv: ['inbox', 'note', 'T19'] };
  assert.throws(() => records.replay({ ...DOCS0, 'docs/STATUS.md': doc.replace(/- \*\*T20[\s\S]*?drop it\.\n/, '') }, raw, { ledger: { lastT: 19 } }), /target/);
  // A matched entry changed under the operation: refused.
  const t = records.replay(DOCS0, [{ argv: ['open', 'remove', 'QL8', '--reason', 'x'] }], { ledger: LEDGER }) as unknown as { steps: { target?: string }[] };
  const op = { argv: ['open', 'remove', 'QL8', '--reason', 'x'], target: t.steps[0].target };
  assert.throws(() => records.replay(withStatus(DOCS0, STATUS.replace('amend both in the doc.', 'amend QL8 in the doc.')), [op], { ledger: LEDGER }), /target/);
});

test('records audit 22: an item filed by a non-loop commit of the push is the run\'s for CI as for the CLI', () => {
  const r = repo('nonloop');
  r.git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.equal(r.stdin('[loop] Threads: a reply waits.\n', 'scripts/records.js', 'deferred', 'item', 'add', 'Navigation and routes').status, 0);
  r.commit(`Threads TH1: a reply\n\n${r.node('scripts/records.js', 'trailers').stdout}`);
  const cli = r.node('scripts/records.js', 'deferred', 'item', 'remove', 'Threads: a reply waits');
  assert.equal(cli.status, 0, cli.stderr);
  r.commit(`tend map: the run's record\n\n${r.node('scripts/records.js', 'trailers').stdout}`);
  assert.equal(r.node('scripts/records.js', 'verify', 'origin/main..HEAD').status, 0);
  const ci = r.node('scripts/tend.js', 'commits', '--loop-only', 'origin/main..HEAD');
  assert.equal(ci.status, 0, ci.stderr);
});

test('records audit 23: a clean merge of main into a loop branch passes; a merge that edits a document fails', () => {
  const r = repo('clean-merge');
  const base = r.git('rev-parse', 'HEAD').stdout.trim();
  r.git('checkout', '-q', '-b', 'run');
  assert.equal(r.stdin('[loop] A finding.\n', 'scripts/records.js', 'deferred', 'item', 'add', 'Navigation and routes').status, 0);
  r.commit(`tend map: the run's record\n\n${r.node('scripts/records.js', 'trailers').stdout}`);
  r.git('checkout', '-q', 'main');
  r.write('docs/NATIVE_UNVERIFIED.md', NATIVE + '- [ ] **Do:** a check. **Expect:** it holds.\n');
  r.commit('Owner: a native check');
  r.git('checkout', '-q', 'run');
  r.git('merge', '-q', '--no-edit', 'main');
  const clean = records.gateRange(`${base}..run`, { cwd: r.dir, loopOnly: true });
  assert.ok(clean.ok, JSON.stringify(clean.results));
  r.git('checkout', '-q', '-b', 'hand', 'run~1');
  r.git('merge', '-q', '--no-commit', 'main');
  r.write('docs/DEFERRED.md', r.read('docs/DEFERRED.md').replace('Dark mode', 'Dark theme'));
  r.commit('Merge main, by hand');
  const hand = records.gateRange(`${base}..hand`, { cwd: r.dir, loopOnly: true });
  assert.ok(!hand.ok);
  assert.match(hand.results.flatMap((x) => x.problems).join('\n'), /merge[\s\S]*docs\/DEFERRED\.md/);
});

test('records audit 24: a split neither ticks a checkbox nor reorders, drops or repeats words', () => {
  assert.throws(() => records.apply('native', 'item split', NATIVE, { match: 'turn the map', body: '- [x] **Do:** turn the map.\n- [x] **Expect:** the compass shows.' }), /marker/);
  assert.ok(records.apply('native', 'item split', NATIVE, { match: 'turn the map', body: '- [ ] **Do:** turn the map.\n- [ ] **Expect:** the compass shows.' }).text.includes('- [ ] **Do:** turn the map.\n- [ ] **Expect:** the compass shows.\n'));
  assert.throws(() => records.apply('deferred', 'item split', DEFERRED, { match: 'planner', body: '- [arch] The main thread runs\n- [arch] the planner on.' }), /order/);
  assert.throws(() => records.apply('deferred', 'item split', DEFERRED, { match: 'planner', body: '- [arch] The planner runs on\n- [arch] main thread.' }), /order|missing/, 'a repeated word dropped');
  // The split's tag rule runs: an [owner] bullet's part demoted to [loop].
  assert.match(problems(DOCS0, [{ argv: ['deferred', 'item', 'split', 'route preview'], body: "- [loop] The route preview's selected row\n- [owner] shows by a border alone." }]).join('\n'), /\[owner\] to \[loop\]/);
});

test('records audit 25: the deploy workflow fetches the whole pushed range and runs the gate as main had it', () => {
  const wf = read('.github/workflows/pages.yml');
  assert.match(wf, /fetch-depth: 0/);
  assert.match(wf, /git show "\$\{BEFORE\}:scripts\/records\.js"/, 'the gate is read from the push\'s base');
  assert.match(wf, /forced/);
  assert.match(wf, /::error::[^\n]*BEFORE/i, 'an unreachable base fails a push that is not forced');
});

test('records audit 26: a committed record whose numbers would move stops the run; a record commit is never amended', () => {
  assert.match(read('.claude/skills/tend/SKILL.md'), /record commit whose inbox numbers would move[\s\S]{0,200}stop/i);
  assert.match(read('.claude/skills/ship.md'), /never amend a record commit/i);
  assert.match(read('.claude/skills/tend/SKILL.md'), /docs\/STATUS\.md`,\s+`docs\/DEFERRED\.md`,\s+`docs\/NATIVE_UNVERIFIED\.md`\s+and the ledger/, 'all three documents and the ledger');
  assert.doesNotMatch(read('.claude/skills/deploy/SKILL.md'), /or the owner's merge/);
  assert.match(read('.claude/skills/tend/SKILL.md'), /item split[^\n]*\n?[^\n]*(order|marker)/, 'the split\'s guard is said whole');
});

test('records audit 27: redo writes only the documents its operations touch, and refuses another changed by hand', () => {
  const r = repo('redo-only');
  assert.equal(r.stdin('Filed.\n', 'scripts/records.js', 'open', 'add').status, 0);
  r.write('docs/DEFERRED.md', DEFERRED.replace('Dark mode', 'Dark theme'));
  const refused = r.node('scripts/records.js', 'redo');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /docs\/DEFERRED\.md/);
  assert.ok(r.read('docs/DEFERRED.md').includes('Dark theme'), 'the hand edit is left as it was');
  r.write('docs/DEFERRED.md', DEFERRED);
  assert.equal(r.node('scripts/records.js', 'redo').status, 0);
});

test('records audit 28: an inbox entry removed in the range can be put back under its number', () => {
  const back: Op = { argv: ['inbox', 'add', '--id', 'T11'], body: '- **T11 [owner] Voice and note are two taps away** (2026-11-11)' };
  const gone: Op = { argv: ['inbox', 'remove', 'T11', '--reason', 'answered by mistake'] };
  assert.deepEqual(problems(DOCS0, [gone, back]), []);
  const state = records.newRangeState();
  const m1 = made(DOCS0, [gone]);
  assert.deepEqual(records.checkCommit({ ...m1, state }), []);
  const head2 = records.replay(m1.head, [back], { ledger: LEDGER, removedIds: ['T11'] }).docs;
  assert.deepEqual(records.checkCommit({ base: m1.head, head: head2, message: `tend map: x\n\n${records.trailersOf([back]).join('\n')}\n`, sidecar: records.sidecarOf([back]), ledger: LEDGER, state }), [], 'in a later commit of the range');
  assert.match(forged(m1.head, m1.head, [back]).join('\n'), /already given out/, 'outside the range that removed it, the number stays retired');
});

test('records audit 29: a link reference definition is refused as a body', () => {
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Navigation and routes', body: '[owner]: https://example.com "a"' }), /link reference/);
  assert.throws(() => records.apply('status', 'open note', STATUS, { match: 'QL8', body: '  [x]: /y' }), /link reference/);
});

test('records audit 30: trailers without a sidecar must be canonical', () => {
  const head = made(DOCS0, [{ argv: ['open', 'remove', 'QL8', '--reason', 'x'] }]).head;
  const say = (line: string) => records.checkCommit({ base: DOCS0, head, message: `tend map: x\n\n${line}\n`, sidecar: null, ledger: LEDGER, state: records.newRangeState() });
  assert.deepEqual(say('Records-Op: open remove QL8 --reason x'), []);
  assert.match(say('Records-Op: open remove QL8 --reason "x" --intro').join('\n'), /not as .*trailers.* prints|canonical/);
  assert.match(say('Records-Op: open  remove QL8 --reason x').join('\n'), /not as .*trailers.* prints|canonical/);
});

test('records: transact refuses an edit that moves another block or does not read back as its entry', () => {
  const doc = records.parse('# T\n\n## A\n\npara\n\n- a\n');
  assert.throws(() => records.transact(doc, { edit: { at: 5, remove: 0, lines: ['x'] }, mid: () => true }), /would also alter "para"/);
  assert.throws(() => records.transact(doc, { edit: { at: 6, remove: 0, lines: ['## B', ''] }, mid: () => true }), /would also alter "- a"/, 'an item that keeps its text but changes section');
  assert.throws(() => records.transact(doc, { edit: { at: 6, remove: 0, lines: ['- b'] }, mid: (m) => m.length === 2 }), /does not read back/);
  assert.equal(records.transact(doc, { edit: { at: 6, remove: 0, lines: ['- b'] }, mid: (m) => m.length === 1 && m[0].text === '- b' }), '# T\n\n## A\n\npara\n\n- b\n- a\n');
});

// ---------------------------------------------------------------------------------------------------
// The shell: the command line and the CI gate, in a repository of their own.

const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
function repo(name: string, { gate = true }: { gate?: boolean } = {}) {
  const dir = join(tmp, name);
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'docs'), { recursive: true });
  mkdirSync(join(dir, '.claude', 'skills', 'tend'), { recursive: true });
  for (const f of ['records.js', 'tend.js']) copyFileSync(join(ROOT, 'scripts', f), join(dir, 'scripts', f));
  if (!gate) writeFileSync(join(dir, 'scripts', 'records.js'), '// the record documents, before the replay gate\n');
  writeFileSync(join(dir, 'docs', 'STATUS.md'), STATUS);
  writeFileSync(join(dir, 'docs', 'DEFERRED.md'), DEFERRED);
  writeFileSync(join(dir, 'docs', 'NATIVE_UNVERIFIED.md'), NATIVE);
  writeFileSync(join(dir, '.claude', 'skills', 'tend', 'ledger.json'), JSON.stringify({ lastT: 18, lastG: 4, areas: {} }, null, 2) + '\n');
  const run = (cmd: string, args: string[], input?: string) => spawnSync(cmd, args, { cwd: dir, env, input, encoding: 'utf8' });
  const git = (...args: string[]) => run('git', args);
  const commit = (message: string, empty = false) => {
    git('add', '-A');
    return run('git', ['commit', '-q', ...(empty ? ['--allow-empty'] : []), '-F', '-'], message);
  };
  git('init', '-q', '-b', 'main');
  commit('base');
  const node = (...args: string[]) => run(process.execPath, args);
  const stdin = (input: string, ...args: string[]) => run(process.execPath, args, input);
  return { dir, git, commit, node, stdin, write: (rel: string, text: string) => writeFileSync(join(dir, rel), text), read: (rel: string) => readFileSync(join(dir, rel), 'utf8') };
}

test('records: the command line stages each operation in a pending sidecar, prints its trailers, and the commit passes the gate', () => {
  const r = repo('cli');
  const added = r.stdin('- **T? [owner] Map: a bare numeral** (2026-11-12)\n  Area: map.\n', 'scripts/records.js', 'inbox', 'add');
  assert.equal(added.status, 0, added.stderr);
  assert.match(r.read('docs/STATUS.md'), /- \*\*T19 \[owner\] Map: a bare numeral\*\*/);
  assert.match(r.read('.claude/skills/tend/ledger.json'), /"lastT": 19,/);
  const note = join(tmp, 'cli-note.md');
  writeFileSync(note, 'Since Nov 12: two places.\n');
  assert.equal(r.node('scripts/records.js', 'deferred', 'item', 'note', 'GPX export', '--file', note).status, 0);
  const pending = readdirSync(join(r.dir, '.claude', 'records'));
  assert.equal(pending.length, 1, 'one pending sidecar');
  assert.match(pending[0], /^\d{8}-\d{6}-[0-9a-f]{8}\.json$/);
  assert.match(r.git('diff', '--cached', '--name-only').stdout, /\.claude\/records\//, 'staged as it is written');
  // Refusals: no match; a removal of what the run did not file, without a reason.
  const refused = r.node('scripts/records.js', 'open', 'remove', '(Nov 12)', '--reason', 'x');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /records: "\(Nov 12\)" is in 2 open items/);
  const noReason = r.node('scripts/records.js', 'open', 'remove', 'QL8');
  assert.equal(noReason.status, 1);
  assert.match(noReason.stderr, /--reason/);
  assert.equal((JSON.parse(r.read(`.claude/records/${pending[0]}`)) as { ops: Op[] }).ops.length, 2, 'a refused operation is not recorded');
  assert.equal(r.node('scripts/records.js', 'open', 'remove', 'QL8', '--reason', 'the owner amended both').status, 0);
  // The working tree checks against HEAD before the commit.
  const working = r.node('scripts/records.js', 'verify', 'HEAD');
  assert.equal(working.status, 0, working.stderr);
  const trailers = r.node('scripts/records.js', 'trailers');
  assert.equal(trailers.status, 0, trailers.stderr);
  assert.equal(trailers.stdout.trim().split('\n').length, 3);
  assert.match(trailers.stdout, /^Records-Op: inbox add sha256:/m);
  assert.match(trailers.stdout, /^Records-Op: open remove QL8 --reason "the owner amended both"$/m);
  assert.equal(r.commit(`tend map: the run's record\n\n${trailers.stdout}`).status, 0);
  const gate = r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD');
  assert.equal(gate.status, 0, gate.stderr);
  assert.equal(r.node('scripts/records.js', 'verify', 'HEAD~1..HEAD').status, 0);
  // The next operation starts a new sidecar.
  assert.equal(r.stdin('Another.\n', 'scripts/records.js', 'open', 'add').status, 0);
  assert.equal(readdirSync(join(r.dir, '.claude', 'records')).length, 2);
  // A hand edit on top of the operations fails the working-tree check, naming the document.
  r.write('docs/STATUS.md', r.read('docs/STATUS.md').replace('reword l.68.', 'reworded.'));
  const hand = r.node('scripts/records.js', 'verify', 'HEAD');
  assert.equal(hand.status, 1);
  assert.match(hand.stderr, /docs\/STATUS\.md[\s\S]*does not match/);
});

test('records: redo runs the pending operations again on HEAD\'s documents, as after taking main\'s side of a conflict', () => {
  const r = repo('redo');
  assert.equal(r.stdin('- **T? [owner] a** (2026-11-12)\n', 'scripts/records.js', 'inbox', 'add').status, 0);
  assert.equal(r.stdin('Filed.\n', 'scripts/records.js', 'open', 'add').status, 0);
  const before = r.read('docs/STATUS.md');
  r.write('docs/STATUS.md', STATUS);
  const redo = r.node('scripts/records.js', 'redo');
  assert.equal(redo.status, 0, redo.stderr);
  assert.equal(r.read('docs/STATUS.md'), before);
  assert.equal(readdirSync(join(r.dir, '.claude', 'records')).length, 1, 'no new sidecar');
  assert.equal(r.node('scripts/records.js', 'verify', 'HEAD').status, 0);
});

test('records: tend.js fails a loop commit that edits the records by hand, or touches another commit\'s sidecar', () => {
  const r = repo('gate');
  assert.equal(r.stdin('**Nov 12, `/tend replay`**, a sweep.\n', 'scripts/records.js', 'last-tend', 'set').status, 0);
  r.commit(`tend replay: the run's record\n\n${r.node('scripts/records.js', 'trailers').stdout}`);
  assert.equal(r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD').status, 0);
  r.write('docs/STATUS.md', cut(r.read('docs/STATUS.md'), '### Open before the loop'));
  r.commit("tend replay: the run's record, again");
  const bad = r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /docs\/STATUS\.md[\s\S]*no Records-Op trailer/);
  r.git('reset', '-q', '--hard', 'HEAD~1');
  const side = readdirSync(join(r.dir, '.claude', 'records'))[0];
  r.write(`.claude/records/${side}`, r.read(`.claude/records/${side}`).replace('a sweep', 'a sweep, edited'));
  r.commit('tend replay: a later commit');
  assert.match(r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD').stderr, /sidecar/);
  assert.ok(existsSync(join(r.dir, '.claude', 'records', side)));
});

// ---------------------------------------------------------------------------------------------------
// Round 3: the owner's decisions of Nov 13 (in person). F9: an inbox set keeps the entry's answer notes.
// Every agent commit is gated, not only the loop's. A "From <skill>" section of "Needs the owner" is
// added, and its bullets changed, by operations.

/** The trailers that make a commit an agent's (the owner's rule, Nov 13). */
const AGENT = 'Co-Authored-By: Claude <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_test';
/** The note, then the entry as the owner reshaped it. */
const ANSWER = '**Answered yes** (Nov 13): a mic beside the camera, as T11 recommends.';
const noteT11: Op = { argv: ['inbox', 'note', 'T11'], body: ANSWER };
const setT11 = (body: string): Op => ({ argv: ['inbox', 'set', 'T11', '--reason', 'the owner reshaped it'], body });

test('records audit 31 (F9): an inbox set keeps every line an earlier inbox note added, unchanged and in order', () => {
  const reshaped = '- **T11 [owner] Voice and note, one tap from the bar** (2026-11-11)\n  Area: tabs.';
  assert.throws(() => records.replay(DOCS0, [noteT11, setT11(reshaped)], { ledger: LEDGER }), /inbox note/, 'a set that drops the answer is refused');
  assert.throws(() => records.replay(DOCS0, [noteT11, setT11(`${reshaped}\n  **Answered yes** (Nov 13): a mic.`)], { ledger: LEDGER }), /inbox note/, 'a set that alters it is refused');
  const kept = records.replay(DOCS0, [noteT11, setT11(`${reshaped}\n  ${ANSWER}`)], { ledger: LEDGER }).docs['docs/STATUS.md'];
  assert.ok(kept.includes(`Area: tabs.\n  ${ANSWER}\n- **T13`), kept.slice(kept.indexOf('T11'), kept.indexOf('T13') + 4));
  // A note recorded in an earlier commit, given as the history's notes, binds the same.
  const noted = records.replay(DOCS0, [noteT11], { ledger: LEDGER }).docs;
  const notes = new Map([['T11', [`  ${ANSWER}`]]]);
  assert.throws(() => records.replay(noted, [setT11(reshaped)], { ledger: LEDGER, notes }), /inbox note/);
  assert.ok(records.replay(noted, [setT11(`${reshaped}\n  ${ANSWER}`)], { ledger: LEDGER, notes }));
  // A noted line the owner already took out by hand binds nothing.
  assert.ok(records.replay(DOCS0, [setT11(reshaped)], { ledger: LEDGER, notes }));
  // The gate refuses it too.
  const bad = { base: noted, head: records.replay(noted, [setT11(reshaped)], { ledger: LEDGER }).docs, message: `Slice: x\n\n${records.trailersOf([setT11(reshaped)]).join('\n')}\n`, sidecar: records.sidecarOf([setT11(reshaped)]), ledger: LEDGER };
  assert.match(records.checkCommit({ ...bad, state: records.newRangeState(), notes }).join('\n'), /inbox note/);
});

test('records audit 32 (F9): the CLI and the gate read the notes earlier commits made', () => {
  const r = repo('f9');
  assert.equal(r.stdin(`${ANSWER}\n`, 'scripts/records.js', 'inbox', 'note', 'T11').status, 0);
  r.commit(`tend inbox: the answers\n\n${r.node('scripts/records.js', 'trailers').stdout}${AGENT}\n`);
  const reshaped = '- **T11 [owner] Voice and note, one tap from the bar** (2026-11-11)\n';
  const dropped = r.stdin(reshaped, 'scripts/records.js', 'inbox', 'set', 'T11', '--reason', 'reshaped');
  assert.equal(dropped.status, 1, 'the CLI refuses a set that drops the noted answer');
  assert.match(dropped.stderr, /inbox note/);
  assert.equal(r.stdin(`${reshaped}  ${ANSWER}\n`, 'scripts/records.js', 'inbox', 'set', 'T11', '--reason', 'reshaped').status, 0);
  r.git('reset', '-q', '--hard');
  r.git('clean', '-qfd');
  // A commit that declares the dropping set, made around the CLI, fails the gate.
  const before = { 'docs/STATUS.md': r.read('docs/STATUS.md'), 'docs/DEFERRED.md': r.read('docs/DEFERRED.md'), 'docs/NATIVE_UNVERIFIED.md': r.read('docs/NATIVE_UNVERIFIED.md') };
  const op = setT11(reshaped);
  r.write('docs/STATUS.md', records.replay(before, [op], { ledger: LEDGER }).docs['docs/STATUS.md']);
  r.write('.claude/records/20261113-120000-0000f9f9.json', records.sidecarOf([op]));
  r.commit(`Voice: one tap (VO1)\n\n${records.trailersOf([op]).join('\n')}\n${AGENT}\n`);
  const g = records.gateRange('HEAD~1..HEAD', { cwd: r.dir, loopOnly: true });
  assert.ok(!g.ok);
  assert.match(g.results.flatMap((x) => x.problems).join('\n'), /inbox note/);
});

test('records audit 33: an agent commit is one with a Claude-Session or a Co-Authored-By: Claude trailer', () => {
  assert.ok(records.isAgent(`Explore: x (EX1)\n\n${AGENT}\n`));
  assert.ok(records.isAgent('fix x\n\nClaude-Session: https://claude.ai/code/session_abc\n'));
  assert.ok(records.isAgent('fix x\n\nCo-authored-by: Claude <noreply@anthropic.com>\n'), 'GitHub writes the key in lower case');
  assert.ok(!records.isAgent('STATUS: the owner clears a section\n'));
  assert.ok(!records.isAgent('Owner: x\n\nCo-Authored-By: Claudette <c@example.com>\n'), 'a name that only starts with Claude');
  assert.ok(!records.isAgent('Owner: x\n\nsee the line Claude-Session: in the skill\n'), 'only at a line start');
  assert.ok(!records.isAgent('Owner: x\n\nClaude-Session:\n'), 'a key with no value');
});

test('records audit 34: CI replays every agent commit that touches the documents, slices and fixes too; the owner\'s hand edit stays ungated', () => {
  const r = repo('agents');
  const base = r.git('rev-parse', 'HEAD').stdout.trim();
  r.write('docs/STATUS.md', STATUS.replace('| Rides | shipped |', '| Rides | shipped, audited |'));
  r.commit(`Rides: the slice is done (RI1-RI14)\n\n${AGENT}\n`);
  const slice = r.node('scripts/tend.js', 'commits', '--loop-only', `${base}..HEAD`);
  assert.equal(slice.status, 1, 'a slice commit with a hand edit fails');
  // The refusal says how to fix it in one line: the operation, redo, and where the skill says so.
  const line = slice.stderr.split('\n').find((l) => /no Records-Op trailer/.test(l)) ?? '';
  assert.match(line, /slice row (add|set)/);
  assert.match(line, /npm run records -- redo/);
  assert.match(line, /ship\.md/);
  r.git('reset', '-q', '--hard', base);
  r.write('docs/STATUS.md', STATUS.replace('| Rides | shipped |', '| Rides | shipped, audited |'));
  r.commit('STATUS: the owner marks Rides audited');
  assert.equal(r.node('scripts/tend.js', 'commits', '--loop-only', `${base}..HEAD`).status, 0, 'the owner\'s own hand edit');
  // A fix whose second issue went into DEFERRED by hand; then the same through the operation.
  r.write('docs/DEFERRED.md', DEFERRED.replace('3. Dark mode', '3. Dark mode\n4. A second issue'));
  r.commit(`fix dark: the first issue\n\n${AGENT}\n`);
  const fix = r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD');
  assert.equal(fix.status, 1);
  assert.match(fix.stderr, /deferred item add/);
  r.git('reset', '-q', '--hard', 'HEAD~1');
  assert.equal(r.stdin('A second issue\n', 'scripts/records.js', 'deferred', 'item', 'add', 'Quality of life').status, 0);
  r.commit(`fix dark: the first issue\n\n${r.node('scripts/records.js', 'trailers').stdout}${AGENT}\n`);
  const ok = r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD');
  assert.equal(ok.status, 0, ok.stderr);
});

test('records audit 35: an in-flight slice branch made before the gate: its old commits and the merge that brings the gate in are history; what it commits after is gated', () => {
  const r = repo('in-flight', { gate: false });
  r.git('checkout', '-q', '-b', 'slice');
  r.write('docs/STATUS.md', STATUS.replace('| Rides | shipped |', '| Rides | shipped, by hand |'));
  r.commit(`Rides: by hand before the gate (RI1)\n\n${AGENT}\n`);
  r.git('checkout', '-q', 'main');
  copyFileSync(join(ROOT, 'scripts', 'records.js'), join(r.dir, 'scripts', 'records.js'));
  r.commit(`Records: the gate lands\n\n${AGENT}\n`);
  const landed = r.git('rev-parse', 'HEAD').stdout.trim();
  r.write('docs/DEFERRED.md', DEFERRED.replace('3. Dark mode', '3. Dark mode, the owner\'s'));
  r.commit('Owner: a hand edit on main');
  r.git('checkout', '-q', 'slice');
  r.git('merge', '-q', '--no-edit', 'main');
  r.git('commit', '-q', '--amend', '-m', `Merge main into slice\n\n${AGENT}`);
  const transition = r.node('scripts/tend.js', 'commits', '--loop-only', `${landed}..slice`);
  assert.equal(transition.status, 0, transition.stderr);
  r.write('docs/STATUS.md', r.read('docs/STATUS.md').replace('| Motion (steps, MO1-MO10) | shipped |', '| Motion (steps, MO1-MO10) | shipped, by hand |'));
  r.commit(`Rides: after the gate (RI2)\n\n${AGENT}\n`);
  const after = r.node('scripts/tend.js', 'commits', '--loop-only', `${landed}..slice`);
  assert.equal(after.status, 1);
  assert.match(after.stderr, /RI2[\s\S]*no Records-Op trailer/);
  assert.doesNotMatch(after.stderr, /RI1/);
});

test('records audit 36: an agent merge resolved by hand in the documents fails; redo in the merge writes main\'s side plus the branch\'s operations, and passes', () => {
  const r = repo('merge-redo');
  const base = r.git('rev-parse', 'HEAD').stdout.trim();
  r.git('checkout', '-q', '-b', 'run');
  assert.equal(r.stdin('[loop] The branch\'s finding.\n', 'scripts/records.js', 'deferred', 'item', 'add', 'Navigation and routes').status, 0);
  r.commit(`Threads: a reply (TH1)\n\n${r.node('scripts/records.js', 'trailers').stdout}${AGENT}\n`);
  r.git('checkout', '-q', 'main');
  r.write('docs/DEFERRED.md', DEFERRED.replace('main thread.\n', 'main thread.\n- [owner] Main\'s own item.\n'));
  r.commit('Owner: an item on main');
  r.git('checkout', '-q', 'run');
  assert.notEqual(r.git('merge', '-q', '--no-edit', 'main').status, 0, 'the two adds conflict');
  r.write('docs/DEFERRED.md', DEFERRED.replace('main thread.\n', 'main thread.\n- [loop] The branch\'s finding.\n- [owner] Main\'s own item, reworded.\n'));
  r.commit(`Merge main into run\n\n${AGENT}\n`);
  const hand = r.node('scripts/tend.js', 'commits', '--loop-only', `${base}..run`);
  assert.equal(hand.status, 1, 'an agent merge resolved by hand');
  assert.match(hand.stderr, /merge[\s\S]*redo/);
  // Done again with redo.
  r.git('reset', '-q', '--hard', 'HEAD~1');
  r.git('merge', '-q', '--no-edit', 'main');
  const redo = r.node('scripts/records.js', 'redo');
  assert.equal(redo.status, 0, redo.stderr);
  assert.ok(r.read('docs/DEFERRED.md').includes("main thread.\n- [owner] Main's own item.\n- [loop] The branch's finding.\n"), r.read('docs/DEFERRED.md'));
  r.commit(`Merge main into run\n\n${AGENT}\n`);
  const ok = r.node('scripts/tend.js', 'commits', '--loop-only', `${base}..run`);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(r.node('scripts/records.js', 'verify', 'main..run').status, 0);
  // The owner's own merge, resolved by hand with no trailers, in a push with no loop commit: a notice.
  r.git('checkout', '-q', '-b', 'owner', 'run~1');
  r.git('merge', '-q', '--no-edit', 'main');
  r.write('docs/DEFERRED.md', DEFERRED.replace('main thread.\n', 'main thread.\n- [owner] Main\'s own item.\n- The owner\'s words.\n'));
  r.commit('Merge main, by the owner');
  assert.ok(records.gateRange('owner~1..owner', { cwd: r.dir, loopOnly: true }).ok);
});

test('records audit 37: section add puts a "From <skill>" section after "From /tend", newest first; section item ops change its bullets; section remove takes an empty one', () => {
  const one = records.apply('status', 'section add', STATUS, { section: 'From /fix' }).text;
  assert.ok(one.includes('  Recommended: its kinds.\n\n### From /fix\n\n### Next evolutions\n'), one.slice(one.indexOf('T14'), one.indexOf('Next evolutions') + 20));
  const two = records.apply('status', 'section add', one, { section: 'From the journal\'s audit (2026-11-13)', intro: 'What the audit left for a call.' }).text;
  assert.ok(two.includes("  Recommended: its kinds.\n\n### From the journal's audit (2026-11-13)\n\nWhat the audit left for a call.\n\n### From /fix\n\n### Next evolutions\n"), 'the newer above the older');
  for (const bad of ['Fixes', 'From /tend', 'From /fix', 'From x\n## y', 'From x ###', ' From x']) assert.throws(() => records.apply('status', 'section add', one, { section: bad }), Error, bad);
  const item = records.apply('status', 'section item add', one, { section: 'From /fix', body: '**[owner] Process: a review on every screen** (2026-11-13)\n  From: fix gallery-header.' }).text;
  assert.ok(item.includes('### From /fix\n\n- **[owner] Process: a review on every screen** (2026-11-13)\n  From: fix gallery-header.\n\n### Next evolutions\n'), item.slice(item.indexOf('From /fix'), item.indexOf('Next evolutions') + 16));
  const noted = records.apply('status', 'section item note', item, { section: '/fix', match: 'Process', body: 'Answered (Nov 13): yes.' }).text;
  assert.ok(noted.includes('  From: fix gallery-header.\n  Answered (Nov 13): yes.\n'));
  const gone = records.apply('status', 'section item remove', noted, { section: 'From /fix', match: 'Process' }).text;
  assert.equal(gone, one);
  assert.throws(() => records.apply('status', 'section remove', item, { section: 'From /fix' }), /entries|empty/);
  assert.equal(records.apply('status', 'section remove', gone, { section: 'From /fix' }).text, STATUS, 'add and remove leave every byte');
  // The real document, as the owner keeps it, takes one.
  const real = read('docs/STATUS.md');
  const r = records.apply('status', 'section add', real, { section: 'From /fix' }).text;
  assert.ok(/### From \/tend\n[\s\S]*\n\n### From \/fix\n\n### Next evolutions\n/.test(r));
  assert.ok(records.apply('status', 'section item add', r, { section: 'From the journal and note pages', body: '**One more** (Nov 13).' }).text.includes('**One more** (Nov 13).'), 'the owner\'s own "From" sections take bullets too');
  assert.throws(() => records.apply('status', 'section item add', r, { section: 'From /tend', body: 'x' }), /inbox/, 'From /tend is the inbox\'s');
});

test('records audit 38: a "From <skill>" section\'s bullets keep the caps, the reasons and the trailers', () => {
  const sec: Op = { argv: ['section', 'add', 'From /fix', '--intro'], intro: 'What /fix left.' };
  const fixed: Op = { argv: ['section', 'add', 'From /fix'], intro: 'What /fix left.' };
  const adds: Op[] = ['a', 'b', 'c'].map((w) => ({ argv: ['section', 'item', 'add', 'From /fix'], body: `**Item ${w}** (Nov 13).` }));
  assert.deepEqual(problems(DOCS0, [fixed, ...adds]), []);
  const filed = records.replay(DOCS0, [fixed, ...adds], { ledger: LEDGER }).docs;
  const removes = ['a', 'b', 'c'].map((w) => ({ argv: ['section', 'item', 'remove', 'From /fix', `Item ${w}`, '--reason', 'answered'] }));
  assert.deepEqual(problems(DOCS0, [fixed, ...adds, ...removes]), [], 'what the run filed it removes freely');
  assert.match(problems(filed, removes).join('\n'), /at most two[\s\S]*From \/fix/, 'what it did not file: two a commit');
  assert.match(problems(filed, [{ argv: ['section', 'item', 'remove', 'From /fix', 'Item a'] }]).join('\n'), /--reason/);
  assert.match(problems(filed, [{ argv: ['section', 'item', 'set', 'From /fix', 'Item a'], body: '**Item A** (Nov 13).' }]).join('\n'), /--reason/);
  // The trailer names the section, quoted, and the intro by its hash.
  const t = records.trailersOf([fixed])[0];
  assert.match(t, /^Records-Op: section add "From \/fix" --intro sha256:[0-9a-f]{64}$/);
  assert.deepEqual(records.parseTrailer(t).argv, ['section', 'add', 'From /fix']);
  assert.throws(() => records.replay(DOCS0, [sec], { ledger: LEDGER }), /intro/, 'the intro is not a word of the command');
  const empty = records.replay(DOCS0, [fixed], { ledger: LEDGER }).docs;
  assert.match(problems(empty, [{ argv: ['section', 'remove', 'From /fix'] }]).join('\n'), /--reason/, 'a section the run did not add leaves with a reason');
  assert.deepEqual(problems(DOCS0, [fixed, { argv: ['section', 'remove', 'From /fix'] }]), []);
});

test('records audit 39: the skills that write the documents say every agent commit is gated, slices and fixes too', () => {
  for (const rel of ['ship.md', 'README.md', 'slice/SKILL.md', 'fix/SKILL.md', 'docs-gc/SKILL.md', 'audit/SKILL.md', 'deploy/SKILL.md']) {
    assert.match(read(`.claude/skills/${rel}`), /every agent commit/i, rel);
  }
  const ship = read('.claude/skills/ship.md');
  assert.match(ship, /section add/);
  assert.match(ship, /Claude-Session/);
  assert.match(ship, /redo[^\n]*merge|merge[^\n]*redo/i, 'ship.md says how a merge is resolved');
  const decision = read('docs/decisions/0156-the-record-documents-change-by-operations.md');
  assert.match(decision, /inbox note/);
  assert.match(decision, /section add/);
  assert.match(decision, /Claude-Session/);
  assert.doesNotMatch(decision, /Left open for the owner[\s\S]*F9/, 'F9 is decided');
});

test('records audit 40: redo in the merge that first brings the gate into a branch made before it says that merge is history', () => {
  const r = repo('first-merge', { gate: false });
  r.git('checkout', '-q', '-b', 'slice');
  r.write('docs/DEFERRED.md', DEFERRED.replace('3. Dark mode', '3. Dark mode, the slice\'s'));
  r.commit(`Slice: by hand before the gate (SL1)\n\n${AGENT}\n`);
  r.git('checkout', '-q', 'main');
  copyFileSync(join(ROOT, 'scripts', 'records.js'), join(r.dir, 'scripts', 'records.js'));
  r.write('docs/DEFERRED.md', DEFERRED.replace('3. Dark mode', '3. Dark mode, main\'s'));
  r.commit(`Records: the gate lands\n\n${AGENT}\n`);
  r.git('checkout', '-q', 'slice');
  assert.notEqual(r.git('merge', '-q', '--no-edit', 'main').status, 0, 'a conflict');
  const redo = r.node('scripts/records.js', 'redo');
  assert.equal(redo.status, 1);
  assert.match(redo.stderr, /before the gate[\s\S]*history[\s\S]*by hand/);
  assert.doesNotMatch(redo.stderr, /ask the owner/);
});
