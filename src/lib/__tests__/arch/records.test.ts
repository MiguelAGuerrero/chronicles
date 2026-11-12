// @tree-wide: the record documents (docs/STATUS.md, DEFERRED.md, NATIVE_UNVERIFIED.md), scripts/records.js and scripts/tend.js
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

// Agents change the record documents only through transactions (decision 0156): each operation changes
// one block and leaves every other byte as it was, and `verify` fails a diff that is not whole operations.

const ROOT = join(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
type Block = { kind: string; text: string; h2: string | null; h3: string | null; id?: string; level?: number };
type Kind = 'status' | 'deferred' | 'native';
type Found = { op: string; block?: string; where?: string };
type Violation = { where: string; block: string; change: string; fix: string };
type Args = { body?: string; match?: string; id?: string; ledger?: Record<string, unknown> | null; section?: string; create?: boolean; intro?: string; tag?: string; after?: string; top?: boolean; end?: boolean };
const records = createRequire(__filename)(join(ROOT, 'scripts', 'records.js')) as {
  parse(text: string): { blocks: Block[] };
  compare(base: string, head: string, o: { kind: Kind; fresh?: Set<string>; last?: { T?: number; G?: number } }): { ops: Found[]; violations: Violation[] };
  apply(kind: Kind, name: string, text: string, args?: Args): { text: string; id?: string };
  addedTexts(base: string, head: string): string[];
};
const tend = createRequire(__filename)(join(ROOT, 'scripts', 'tend.js')) as {
  tendCommitProblems(c: { subject: string; body: string; files: { status: string; path: string }[] }): string[];
};

const STATUS = `# Chronicles: where the work stands

- **As of:** 2026-11-12

## Slices

| Slice (spec tab) | Status | Evidence | Spec | Audited |
|---|---|---|---|---|
| Rides | shipped | \`8e49c9c\` | \`specs/rides/spec.md\` | yes |
| Motion (steps, MO1-MO10) | shipped | \`09f504a\` | \`specs/motion/spec.md\` | yes |

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

## Quality of life (in the owner's order)

1. Keep awake on a phone
2. GPX export
   (round 4)
3. Dark mode
`;

const NATIVE = `# Native, unverified on a device

Native has never run on a device.

## How to run

**The build.** Run every item on a development build.

## Compass (CP1-CP8)

- [ ] **Do:** turn the map. **Expect:** the compass shows.
- [ ] **Do:** tap the compass. **Expect:** north.
`;

const tmp = mkdtempSync(join(tmpdir(), 'records-'));
after(() => rmSync(tmp, { recursive: true, force: true }));

const ops = (base: string, head: string, kind: Kind = 'status') => records.compare(base, head, { kind });
const clean = (base: string, head: string, kind: Kind = 'status') => {
  const r = ops(base, head, kind);
  assert.deepEqual(r.violations, [], 'every change is an operation');
  return r.ops.map((o) => o.op);
};
const changes = (base: string, head: string, kind: Kind = 'status') => ops(base, head, kind).violations.map((v) => v.change);
/** The text with the section from `heading` up to the next heading of its level or above cut out. */
const cut = (text: string, heading: string, keepHeading = false) => {
  const start = text.indexOf(`${heading}\n`);
  const level = heading.indexOf(' ');
  const rest = text.slice(start + heading.length + 1);
  const m = new RegExp(`^#{1,${level}} `, 'm').exec(rest);
  const end = m ? start + heading.length + 1 + m.index : text.length;
  return text.slice(0, start) + (keepHeading ? `${heading}\n\n` : '') + text.slice(end);
};
const between = (text: string, from: string, to: string) => text.slice(text.indexOf(from), text.indexOf(to));

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
  assert.ok(r.text.includes('  Expect: nothing cut.\n- **T19 [owner] Map: a pin is a bare numeral** (2026-11-12)\n  Area: map.\n  Recommended: kinds in its head.\n\n### Next evolutions'), 'appended to "From /tend", its lines indented');
  assert.deepEqual(clean(STATUS, r.text), ['inbox add T19']);
  assert.equal(records.apply('status', 'inbox add', STATUS, { body, ledger: { lastT: 5 } }).id, 'T14', 'the document is ahead of the ledger');
  assert.equal(records.apply('status', 'inbox add', STATUS, { body: body.slice(2), ledger: null }).id, 'T14', 'no ledger, no marker');
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
  assert.deepEqual(clean(STATUS, noted), ['inbox note T11']);
  const set = records.apply('status', 'inbox set', STATUS, { match: 'T11', body: '- **T? [owner] Voice and note on the bar, reshaped** (2026-11-12)\n  Recommended: the mic only.' }).text;
  assert.ok(set.includes('- **T11 [owner] Voice and note on the bar, reshaped**'));
  assert.deepEqual(clean(STATUS, set), ['inbox set T11']);
  assert.throws(() => records.apply('status', 'inbox set', STATUS, { match: 'T11', body: '- **T13 [owner] another**' }), /T11/);
  const gone = records.apply('status', 'inbox remove', STATUS, { match: 'T11' }).text;
  assert.ok(!gone.includes('T11') && gone.includes('- **T13'));
  assert.deepEqual(clean(STATUS, gone), ['inbox remove T11']);
  const none = records.apply('status', 'inbox remove', gone, { match: 'T13' }).text;
  assert.ok(none.includes('### From /tend\n\nNothing open.\n\n### Next evolutions'), 'the last entry leaves the placeholder');
  assert.throws(() => records.apply('status', 'inbox remove', STATUS, { match: 'T1' }), /not in the inbox/, 'T1 is not a prefix of T11');
  assert.throws(() => records.apply('status', 'inbox remove', STATUS, { match: 'Voice' }), /by its number/);
});

test('records: last-tend set replaces the body under its heading and nothing after it', () => {
  const body = '**Nov 13, `/tend replay`**, a sweep.\n- `tend replay 1`: the card says its counts in words.\nFiled: T19-T24.';
  const r = records.apply('status', 'last-tend set', STATUS, { body }).text;
  assert.ok(r.includes(`### Last tend\n\n${body}\n\n### Open before the loop\n\n- **The map's rule lines`));
  assert.ok(!r.includes('/tend map`**, a sweep'));
  assert.deepEqual(clean(STATUS, r), ['last-tend set']);
  assert.equal(r.replace(between(r, '### Last tend', '### Open before the loop'), ''), STATUS.replace(between(STATUS, '### Last tend', '### Open before the loop'), ''), 'every other byte as it was');
  assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: `${body}\n\n### Open before the loop\n\n- one left` }), /no heading/);
  assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: `${body}\n## In flight` }), /no heading/);
  assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: `${body}\n\`\`\`` }), /fence/);
  assert.throws(() => records.apply('status', 'last-tend set', STATUS, { body: '  ' }), /empty/);
});

test('records: open add, note and remove act on "Open before the loop" alone, a whole bullet at a time', () => {
  const body = "**ME23's wording after T12** (Nov 12): amend ME23.\nin the doc and the mirror.";
  const added = records.apply('status', 'open add', STATUS, { body }).text;
  assert.ok(added.includes("### Open before the loop\n\n- **ME23's wording after T12** (Nov 12): amend ME23.\n  in the doc and the mirror.\n- **The map's rule lines"), 'newest first, as the section is kept');
  assert.deepEqual(clean(STATUS, added), ['open add']);
  assert.ok(records.apply('status', 'open add', STATUS, { body, end: true }).text.includes("- **Branch clean-up:** nine branches are merged.\n- **ME23's wording"));
  assert.ok(records.apply('status', 'open add', STATUS, { body, after: 'QL8' }).text.includes("amend both in the doc.\n- **ME23's wording"));
  assert.deepEqual(clean(STATUS, records.apply('status', 'open add', STATUS, { body, after: 'QL8' }).text), ['open add'], 'an entry placed beside its kin is still an operation');
  const noted = records.apply('status', 'open note', STATUS, { match: 'QL8', body: 'Since `tend map 5` QL11 too.' }).text;
  assert.ok(noted.includes('amend both in the doc.\n  Since `tend map 5` QL11 too.\n- **The vision'));
  assert.deepEqual(clean(STATUS, noted), ['open note']);
  const gone = records.apply('status', 'open remove', STATUS, { match: 'The vision review' }).text;
  assert.ok(!gone.includes('Public data read by tile') && gone.includes('- **QL8') && gone.includes('- **The device milestone'), 'the bullet goes with its numbered lines');
  assert.deepEqual(clean(STATUS, gone), ['open remove']);
  assert.throws(() => records.apply('status', 'open remove', STATUS, { match: '(Nov 12)' }), /in 2 open items/, 'one match only');
  assert.throws(() => records.apply('status', 'open remove', STATUS, { match: 'Voice and note' }), /no open item/, 'an inbox entry is not an open item');
});

test('records: rows of "In flight" come and go; a row of "Slices" is added or set, a row at a time', () => {
  const row = '| Free look (FL1-FL21) | `slice/free-look` | built |';
  const added = records.apply('status', 'inflight add', STATUS, { body: row }).text;
  assert.ok(added.includes('|---|---|---|\n' + row + '\n| Note pages'), 'newest first');
  assert.ok(records.apply('status', 'inflight add', STATUS, { body: row, end: true }).text.includes('`claude/complexes` | built |\n' + row + '\n\n## Updating'));
  assert.deepEqual(clean(STATUS, added), ['inflight add']);
  const set = records.apply('status', 'inflight set', STATUS, { match: 'Note pages', body: '| Note pages (NP1-NP14) | `claude/note-pages` | merged 2026-11-12 |' }).text;
  assert.deepEqual(clean(STATUS, set), ['inflight set']);
  assert.deepEqual(clean(STATUS, records.apply('status', 'inflight remove', STATUS, { match: 'Complexes' }).text), ['inflight remove']);
  const slice = records.apply('status', 'slice row add', STATUS, { body: '| Free look (FL1-FL21) | built | `slice/free-look` | `specs/free-look/spec.md` | no |' }).text;
  assert.ok(slice.includes('`specs/motion/spec.md` | yes |\n| Free look'));
  assert.deepEqual(clean(STATUS, slice), ['slice row add']);
  assert.ok(records.apply('status', 'slice row add', STATUS, { body: '| Free look | built | x | y | no |', after: 'Rides' }).text.includes('| yes |\n| Free look | built | x | y | no |\n| Motion'));
  assert.deepEqual(clean(STATUS, records.apply('status', 'slice row set', STATUS, { match: 'Rides', body: '| Rides | shipped, audited | `8e49c9c` | `specs/rides/spec.md` | yes |' }).text), ['slice row set']);
  assert.throws(() => records.apply('status', 'inflight add', STATUS, { body: '| two | cells |' }), /cells/);
  assert.throws(() => records.apply('status', 'inflight add', STATUS, { body: 'no pipes' }), /"\|"/);
  assert.throws(() => records.apply('status', 'inflight add', STATUS, { body: '| a | b | c |\n| d | e | f |' }), /one line/);
});

test('records: deferred and native items are added to a section, removed, tagged and noted, whole', () => {
  const added = records.apply('deferred', 'item add', DEFERRED, { section: 'Navigation and routes', body: '[loop] Go here keeps its last tap.' }).text;
  assert.ok(added.includes('border alone.\n- [loop] Go here keeps its last tap.\n\n## Quality'));
  assert.deepEqual(clean(DEFERRED, added, 'deferred'), ['deferred item add']);
  assert.ok(records.apply('deferred', 'item add', DEFERRED, { section: 'Quality of life', body: 'x' }).text.includes('3. Dark mode\n- x\n'), 'a unique part of the title names it');
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Rides', body: 'x' }), /--new/);
  const fresh = records.apply('deferred', 'item add', DEFERRED, { section: 'Rides (R1-R14)', create: true, intro: 'What the rides left.', body: '[loop] A ride after a relaunch misses 20 s.' }).text;
  assert.ok(fresh.endsWith('3. Dark mode\n\n## Rides (R1-R14)\n\nWhat the rides left.\n\n- [loop] A ride after a relaunch misses 20 s.\n'));
  assert.deepEqual(clean(DEFERRED, fresh, 'deferred').sort(), ['deferred item add', 'deferred item add --new', 'deferred item add --new --intro']);
  assert.throws(() => records.apply('deferred', 'item add', DEFERRED, { section: 'Navigation and routes', create: true, body: 'x' }), /exists already/);
  const tagged = records.apply('deferred', 'item tag', DEFERRED, { match: 'A Go here tapped', tag: 'loop' }).text;
  assert.ok(tagged.includes('- [loop] A Go here tapped while a re-route runs is dropped.\n  - Since then'));
  assert.deepEqual(clean(DEFERRED, tagged, 'deferred'), ['deferred item tag']);
  assert.throws(() => records.apply('deferred', 'item tag', DEFERRED, { match: 'Cancel pressed', tag: 'owner' }), /tagged \[loop\] already/);
  assert.throws(() => records.apply('deferred', 'item tag', DEFERRED, { match: 'A Go here', tag: 'later' }), /one of/);
  const noted = records.apply('deferred', 'item note', DEFERRED, { match: 'GPX', body: 'Since Nov 12: asked for.' }).text;
  assert.ok(noted.includes('2. GPX export\n   (round 4)\n   Since Nov 12: asked for.\n3. Dark mode'), 'a numbered item\'s note lines up under its text');
  assert.deepEqual(clean(DEFERRED, noted, 'deferred'), ['deferred item note']);
  assert.ok(records.apply('deferred', 'item add', DEFERRED, { section: 'Navigation and routes', body: 'x', top: true }).text.includes('## Navigation and routes\n\n- x\n- [loop] Go here'));
  const split = records.apply('deferred', 'item split', DEFERRED, { match: 'A Go here tapped', body: '- [loop] A Go here tapped while a re-route runs is dropped.\n- [owner] Since then: still dropped.' }).text;
  assert.ok(split.includes('- [loop] Go here: Cancel pressed while the read returns.\n- [loop] A Go here tapped while a re-route runs is dropped.\n- [owner] Since then: still dropped.\n- [owner] The route'));
  assert.deepEqual(clean(DEFERRED, split, 'deferred'), ['deferred item split']);
  assert.throws(() => records.apply('deferred', 'item split', DEFERRED, { match: 'A Go here tapped', body: '- [loop] A Go here tapped is dropped.\n- [owner] Since then.' }), /missing: while, re, route, runs, still/);
  assert.throws(() => records.apply('deferred', 'item split', DEFERRED, { match: 'A Go here tapped', body: '- one bullet only with every word: A Go here tapped while a re-route runs is dropped. Since then: still dropped.' }), /two bullets/);
  const gone = records.apply('deferred', 'item remove', DEFERRED, { match: 'A Go here tapped' }).text;
  assert.ok(!gone.includes('Since then'), 'a bullet goes with its sub-bullets');
  assert.deepEqual(clean(DEFERRED, gone, 'deferred'), ['deferred item remove']);
  assert.throws(() => records.apply('deferred', 'item remove', DEFERRED, { match: 'Go here' }), /in 2 items/);
  const nat = records.apply('native', 'item add', NATIVE, { section: 'Compass (CP1-CP8)', body: '- [ ] **Do:** reduce motion. **Expect:** a snap.' }).text;
  assert.deepEqual(clean(NATIVE, nat, 'native'), ['native item add']);
  assert.throws(() => records.apply('status', 'item add', STATUS, { section: 'Slices', body: 'x' }), /not docs\/STATUS\.md/);
  assert.throws(() => records.apply('deferred', 'open add', DEFERRED, { body: 'x' }), /docs\/STATUS\.md only/);
});

test('records: the record that replaced "Last tend" and deleted "Open before the loop" fails verify', () => {
  // The failure that made this gate (tend/replay-20261112-1652, 6af0c01f): "Last tend" replaced, and
  // the whole "Open before the loop", the owner's open items, gone with it. check:docs and check:tend passed it.
  const real = read('docs/STATUS.md');
  const replaced = records.apply('status', 'last-tend set', real, { body: '**Nov 12, `/tend replay`**, a sweep.\n- `tend replay 1`: a thing.' }).text;
  const broken = cut(replaced, '### Open before the loop');
  const found = changes(real, broken);
  assert.ok(found.some((c) => /heading removed: "### Open before the loop"/.test(c)), found.join('\n'));
  assert.ok(found.some((c) => /section emptied/.test(c)));
  const kept = changes(real, cut(replaced, '### Open before the loop', true));
  assert.ok(kept.some((c) => /section emptied/.test(c)), 'with the heading left standing, every bullet gone at once still fails');
  const small = changes(STATUS, cut(records.apply('status', 'last-tend set', STATUS, { body: 'A digest.' }).text, '### Open before the loop'));
  assert.ok(small.some((c) => /heading removed/.test(c)) && small.some((c) => /section emptied/.test(c)));
});

test('records: verify refuses the hand edits no operation makes', () => {
  // A line inside an open item rewritten; an item's lines cut short; a paragraph edited.
  assert.match(changes(STATUS, STATUS.replace('reword l.68.', 'done.')).join(), /rewritten in place/);
  assert.match(changes(STATUS, STATUS.replace("\n  Its scale-bar line says the strip's top.", '')).join(), /rewritten in place/);
  assert.match(changes(DEFERRED, DEFERRED.replace('\n  - Since then: still dropped.', ''), 'deferred').join(), /rewritten in place/);
  assert.match(changes(DEFERRED, DEFERRED.replace('[loop] Go here', '~~[loop] Go here').replace('read returns.', 'read returns.~~: shipped'), 'deferred').join(), /rewritten in place/, 'a shipped item is removed, not struck through');
  assert.match(changes(STATUS, STATUS.replace('amend both in the doc.', 'amended.')).join(), /rewritten in place/, 'a bullet cut short is rewritten');
  assert.match(changes(DEFERRED, DEFERRED.replace('- A Go here tapped while a re-route runs is dropped.\n  - Since then: still dropped.', '- A Go here tapped is dropped.\n- Since then: fine.'), 'deferred').join(), /rewritten in place/, 'two bullets that drop words are no split');
  // Unrelated: the last item goes and a new one comes at the end, in one commit.
  assert.deepEqual(changes(DEFERRED, DEFERRED.replace('3. Dark mode', '- [loop] The planner times out on a phone with fifty kinds.'), 'deferred'), []);
  assert.match(changes(STATUS, STATUS.replace("owner's inbox (decision 0128)", "owner's inbox")).join(), /paragraph rewritten/);
  assert.match(changes(DEFERRED, DEFERRED.replace('## Navigation and routes', '## Routes'), 'deferred').join(), /heading changed/);
  // The owner's parts of STATUS.md: its head, the branch table, a slice's row.
  assert.match(changes(STATUS, STATUS.replace('2026-11-12\n', '2026-11-13\n')).join(), /bullet (rewritten|removed)/);
  assert.match(changes(STATUS, STATUS.replace('| Rides | merged |', '| Rides | deleted |')).join(), /Branches/);
  assert.match(changes(STATUS, STATUS.replace(/\| Motion .*\n/, '')).join(), /"Slices" removed/);
  // An entry where it does not belong; a number used twice or given out again.
  assert.match(changes(STATUS, STATUS.replace('- **The device milestone', '- **T19 [owner] x** (2026-11-12)\n- **The device milestone')).join(), /outside "From \/tend"/);
  assert.match(changes(STATUS, STATUS.replace('  Expect: nothing cut.\n', '  Expect: nothing cut.\n- **T11 [owner] again**\n')).join(), /used twice/);
  assert.match(records.compare(STATUS, STATUS.replace('  Expect: nothing cut.\n', '  Expect: nothing cut.\n- **T12 [owner] x**\n'), { kind: 'status', last: { T: 18 } }).violations.map((v) => v.change).join(), /already given out/);
  assert.match(changes(STATUS, STATUS.replace('  Expect: nothing cut.\n', '  Expect: nothing cut.\n- an unnumbered thing\n')).join(), /unnumbered/);
  assert.match(changes(NATIVE, NATIVE.replace('Run every item', 'Run any item'), 'native').join(), /paragraph rewritten/);
  assert.match(changes(NATIVE, cut(NATIVE, '## Compass (CP1-CP8)'), 'native').join(), /heading removed/);
});

test('records: verify passes what operations make, in any number and together', () => {
  // A tag and a note on one item; a note written on the item's last line; blank lines alone.
  assert.deepEqual(clean(DEFERRED, DEFERRED.replace('- A Go here tapped', '- [owner] A Go here tapped').replace('still dropped.', 'still dropped.\n  More.'), 'deferred').sort(), ['deferred item note', 'deferred item tag']);
  assert.deepEqual(clean(DEFERRED, DEFERRED.replace('border alone.', 'border alone. Amended by free look (FL18).'), 'deferred'), ['deferred item note']);
  assert.deepEqual(clean(STATUS, STATUS.replace('\n\n- **The device milestone', '\n- **The device milestone')), []);
  // Several operations at once, as a run's record makes them.
  let text = STATUS;
  text = records.apply('status', 'inbox add', text, { body: '- **T? [owner] a** (2026-11-12)', ledger: { lastT: 18 } }).text;
  text = records.apply('status', 'inbox remove', text, { match: 'T11' }).text;
  text = records.apply('status', 'last-tend set', text, { body: 'A digest.' }).text;
  text = records.apply('status', 'open remove', text, { match: 'QL8' }).text;
  text = records.apply('status', 'open add', text, { body: 'A new open item.' }).text;
  assert.deepEqual(clean(STATUS, text).sort(), ['inbox add T19', 'inbox remove T11', 'last-tend set', 'open add', 'open remove']);
  // A run amends what it filed in an earlier commit of the same run: `fresh` holds those blocks.
  const filed = records.apply('status', 'open add', STATUS, { body: 'Filed by this run.' }).text;
  const amended = filed.replace('Filed by this run.', 'Filed by the run, reworded.');
  assert.ok(changes(filed, amended).length > 0, 'without the run\'s own blocks it is a rewrite');
  assert.deepEqual(records.compare(filed, amended, { kind: 'status', fresh: new Set(records.addedTexts(STATUS, filed)) }).violations, []);
});

test('records: the loop never edits its own gate', () => {
  for (const path of ['scripts/records.js', 'src/lib/__tests__/arch/records.test.ts', 'src/lib/__tests__/arch/tend.test.ts']) {
    assert.ok(tend.tendCommitProblems({ subject: "tend map: the run's record", body: '', files: [{ status: 'M', path }] }).some((p) => p.includes(path)), path);
  }
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts.records, 'node scripts/records.js');
  assert.equal(pkg.scripts['check:records'], 'node scripts/records.js verify');
});

test('records: the skills that write the record documents do it through npm run records and check:records', () => {
  for (const rel of ['.claude/skills/tend/SKILL.md', '.claude/skills/ship.md', '.claude/skills/slice/SKILL.md', '.claude/skills/fix/SKILL.md', '.claude/skills/tend-orchestrator/briefs.md', '.claude/skills/README.md']) {
    const text = read(rel);
    assert.match(text, /npm run records --/, `${rel} names the operations`);
    assert.match(text, /check:records/, `${rel} runs the check before a record commit`);
  }
  assert.match(read('docs/decisions/README.md'), /\[0156\]\(0156-/);
});

// The shell: the command line and the CI gate, in a repository of their own.
const env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
function repo(name: string) {
  const dir = join(tmp, name);
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'docs'), { recursive: true });
  mkdirSync(join(dir, '.claude', 'skills', 'tend'), { recursive: true });
  for (const f of ['records.js', 'tend.js']) copyFileSync(join(ROOT, 'scripts', f), join(dir, 'scripts', f));
  writeFileSync(join(dir, 'docs', 'STATUS.md'), STATUS);
  writeFileSync(join(dir, 'docs', 'DEFERRED.md'), DEFERRED);
  writeFileSync(join(dir, 'docs', 'NATIVE_UNVERIFIED.md'), NATIVE);
  writeFileSync(join(dir, '.claude', 'skills', 'tend', 'ledger.json'), JSON.stringify({ lastT: 18, lastG: 4, areas: {} }, null, 2) + '\n');
  const run = (cmd: string, args: string[], input?: string) => spawnSync(cmd, args, { cwd: dir, env, input, encoding: 'utf8' });
  const commit = (subject: string) => {
    run('git', ['add', '-A']);
    return run('git', ['commit', '-q', '-m', subject]);
  };
  run('git', ['init', '-q', '-b', 'main']);
  commit('base');
  const node = (...args: string[]) => run(process.execPath, args);
  const stdin = (input: string, ...args: string[]) => run(process.execPath, args, input);
  return { dir, commit, node, stdin, write: (rel: string, text: string) => writeFileSync(join(dir, rel), text), read: (rel: string) => readFileSync(join(dir, rel), 'utf8') };
}

test('records: the command line reads its text from stdin or a file, numbers from the ledger and writes it back', () => {
  const r = repo('cli');
  const added = r.stdin('- **T? [owner] Map: a bare numeral** (2026-11-12)\n  Area: map.\n', 'scripts/records.js', 'inbox', 'add');
  assert.equal(added.status, 0, added.stderr);
  assert.match(r.read('docs/STATUS.md'), /- \*\*T19 \[owner\] Map: a bare numeral\*\*/);
  assert.match(r.read('.claude/skills/tend/ledger.json'), /"lastT": 19,/);
  r.write('note.md', 'Since Nov 12: two places.\n');
  assert.equal(r.node('scripts/records.js', 'deferred', 'item', 'note', 'GPX export', '--file', 'note.md').status, 0);
  assert.match(r.read('docs/DEFERRED.md'), /\(round 4\)\n {3}Since Nov 12: two places\.\n/);
  const refused = r.node('scripts/records.js', 'open', 'remove', '(Nov 12)');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /records: "\(Nov 12\)" is in 2 open items/);
  const working = r.node('scripts/records.js', 'verify', 'HEAD');
  assert.equal(working.status, 0, working.stderr);
  r.write('docs/STATUS.md', r.read('docs/STATUS.md').replace('reword l.68.', 'reworded.'));
  const hand = r.node('scripts/records.js', 'verify', 'HEAD');
  assert.equal(hand.status, 1);
  assert.match(hand.stderr, /Open before the loop[\s\S]*rewritten in place[\s\S]*instead: npm run records -- open/);
});

test('records: tend.js fails a loop commit that edits the records by hand, passes one made of operations, and leaves the owner\'s commits alone', () => {
  const r = repo('gate');
  const body = '**Nov 12, `/tend replay`**, a sweep.\n';
  assert.equal(r.stdin(body, 'scripts/records.js', 'last-tend', 'set').status, 0);
  assert.equal(r.stdin('Filed by this run.\n', 'scripts/records.js', 'open', 'add').status, 0);
  r.commit("tend replay: the run's record");
  // The review's record amends the open item the run filed: allowed, it is the run's own.
  r.write('docs/STATUS.md', r.read('docs/STATUS.md').replace('Filed by this run.', 'Filed by the run, reworded.'));
  r.commit("tend replay: the run's record, after the review");
  const good = r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~2..HEAD');
  assert.equal(good.status, 0, good.stderr);
  assert.equal(r.node('scripts/records.js', 'verify', 'HEAD~2..HEAD').status, 0);
  // The failure: "Last tend" replaced and "Open before the loop" gone.
  r.write('docs/STATUS.md', cut(r.read('docs/STATUS.md'), '### Open before the loop'));
  r.commit("tend replay: the run's record, again");
  const bad = r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /changes docs\/STATUS\.md by hand[\s\S]*heading removed: "### Open before the loop"/);
  const range = r.node('scripts/records.js', 'verify', 'HEAD~1..HEAD');
  assert.equal(range.status, 1);
  // The same hand edit by the owner (not a loop commit) is not the loop check's business.
  r.write('docs/DEFERRED.md', cut(r.read('docs/DEFERRED.md'), '## Navigation and routes'));
  r.commit('STATUS: the owner clears a section');
  assert.equal(r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD').status, 0);
  // An open item the run did not file is not the run's to rewrite.
  r.write('docs/STATUS.md', STATUS);
  r.commit('STATUS: the owner puts it back');
  r.write('docs/STATUS.md', STATUS.replace('amend both in the doc.', 'amended.'));
  r.commit('tend map: the run\'s record');
  assert.match(r.node('scripts/tend.js', 'commits', '--loop-only', 'HEAD~1..HEAD').stderr, /rewritten in place/, 'a bullet cut short is rewritten too');
});
