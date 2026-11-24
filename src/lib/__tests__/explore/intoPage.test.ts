/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { switchLabel } from '../../complexes/kinds';
import { COMPLEX_KINDS, type ComplexKind } from '../../complexes/types';
import { categoryOf } from '../../discovery/categories';
import { kindParent } from '../../discovery/refinements';
import type { CategoryId, Kind } from '../../discovery/types';
import { KINDS, kindOf, type KindInfo } from '../../explore/explore';
import { DEFAULT_OFF } from '../../discovery/subtypes';

// What I'm into, its own page (specs/what-im-into-page, WI1-WI16; decision 0192), written from the spec before the code.

type Row = { id: Kind; label: string; icon: string; depth: number; on: boolean; locked: boolean; heavy: boolean; hint?: string };
type Section = { category: CategoryId; label: string; rows: Row[] };
type Child = { type: 'heading'; id: string; label: string } | { type: 'row'; row: Row } | { type: 'note' } | { type: 'complex'; kind: ComplexKind };
type IntoPage = {
  INTO_TITLE: string;
  INTO_HINT: string;
  COMPLEXES_HEADING: string;
  intoSections: (kinds: readonly KindInfo[], hidden: ReadonlySet<Kind>) => Section[];
  intoChildren: (sections: Section[], complexes: readonly ComplexKind[]) => { children: Child[]; sticky: number[] };
};
const page = async () => (await import('../../explore/intoPage')) as IntoPage;

const SRC = join(__dirname, '../../..');
const source = (file: string) => readFileSync(join(SRC, file), 'utf8');

/** The categories "What I'm into" draws, in KINDS' order (never a count written down). */
const CATEGORY_ORDER = KINDS.map((k) => k.category).filter((c, i, all) => all.indexOf(c) === i);
const PARENTS = KINDS.filter((k) => KINDS.some((s) => kindParent(s.id) === k.id));
const SUBTYPES = KINDS.filter((k) => kindParent(k.id));

test('WI1: neither the ready bar\'s settings nor the walk\'s drawer draws a kind\'s switch; both draw the one row', () => {
  for (const file of ['components/StartSettings.tsx', 'app/walk.tsx']) {
    const text = source(file);
    assert.ok(!/<KindSwitches\b/.test(text) && !/<ComplexKindSwitches\b/.test(text), `${file} draws no kind switches`);
    assert.ok(/<IntoRow\b/.test(text), `${file} draws the What I'm into row`);
  }
});

test('WI5: the sections follow the categories in order, each heading pinned before its rows', async () => {
  const { intoSections, intoChildren } = await page();
  const sections = intoSections(KINDS, new Set());
  assert.deepEqual(sections.map((s) => s.category), CATEGORY_ORDER);
  assert.deepEqual(sections.map((s) => s.label), CATEGORY_ORDER.map((c) => categoryOf(c).label));
  // Every kind is a row of its own category's section, in KINDS' order.
  assert.deepEqual(sections.flatMap((s) => s.rows.map((r) => r.id)), KINDS.map((k) => k.id));
  for (const s of sections) assert.ok(s.rows.every((r) => kindOf(r.id).category === s.category), `${s.category} holds only its own kinds`);
  const { children, sticky } = intoChildren(sections, COMPLEX_KINDS);
  // A pinned index is a heading, and every heading is pinned.
  assert.deepEqual(sticky, children.flatMap((c, i) => (c.type === 'heading' ? [i] : [])));
  // Each section's rows come after its heading and before the next heading.
  sections.forEach((s, n) => {
    const from = sticky[n];
    const to = sticky[n + 1];
    const rows = children.slice(from + 1, to).flatMap((c) => (c.type === 'row' ? [c.row.id] : []));
    assert.deepEqual(rows, s.rows.map((r) => r.id), `${s.category}'s rows sit under its heading`);
  });
});

test('WI6: a kind off takes its subtypes\' rows away; switched back on they return as they were', async () => {
  const { intoSections } = await page();
  const rowsOf = (hidden: ReadonlySet<Kind>) => intoSections(KINDS, hidden).flatMap((s) => s.rows);
  for (const parent of PARENTS) {
    const kids = KINDS.filter((k) => kindParent(k.id) === parent.id).map((k) => k.id);
    const before = new Set<Kind>(DEFAULT_OFF);
    const on = rowsOf(before).filter((r) => kids.includes(r.id));
    assert.equal(on.length, kids.length, `${parent.id}'s subtypes show while it is on`);
    assert.ok(on.every((r) => r.depth > 0), `${parent.id}'s subtypes are indented`);
    const off = new Set(before);
    off.add(parent.id);
    assert.equal(rowsOf(off).filter((r) => kids.includes(r.id)).length, 0, `${parent.id} off: no subtype rows`);
    off.delete(parent.id);
    assert.deepEqual(rowsOf(off).filter((r) => kids.includes(r.id)), on, `${parent.id} back on: its subtypes as they were`);
  }
});

test('WI7: a kind\'s row is heavier than its subtypes\', and a subtype says its kind', async () => {
  const { intoSections } = await page();
  const rows = intoSections(KINDS, new Set()).flatMap((s) => s.rows);
  for (const r of rows) {
    const parent = kindParent(r.id);
    if (parent) {
      assert.equal(r.heavy, false, `${r.id} is a subtype, drawn plain`);
      assert.equal(r.hint, `Part of ${kindOf(parent).label}`, `${r.id} is spoken as part of its kind`);
    } else assert.equal(r.heavy, true, `${r.id} is a kind, drawn heavier`);
  }
  assert.ok(SUBTYPES.length > 0 && rows.some((r) => r.heavy) && rows.some((r) => !r.heavy));
});

test('WI12: no heading, row, the page\'s title or the row\'s words carry a number, whatever is on or off', async () => {
  const { intoSections, intoChildren, INTO_TITLE, INTO_HINT, COMPLEXES_HEADING } = await page();
  const states: ReadonlySet<Kind>[] = [new Set(), new Set(KINDS.map((k) => k.id)), new Set(DEFAULT_OFF), new Set(PARENTS.map((k) => k.id))];
  for (const hidden of states) {
    const sections = intoSections(KINDS, hidden);
    const { children } = intoChildren(sections, COMPLEX_KINDS);
    const words = [
      INTO_TITLE, INTO_HINT, COMPLEXES_HEADING,
      ...sections.map((s) => s.label),
      ...children.flatMap((c) => (c.type === 'heading' ? [c.label] : c.type === 'row' ? [c.row.label, c.row.hint ?? ''] : c.type === 'complex' ? [switchLabel(c.kind)] : [])),
    ];
    for (const w of words) assert.ok(!/\d/.test(w), `"${w}" has no number`);
  }
});

test('WI15: Complexes\' switches follow the five sections, under their own pinned heading and note', async () => {
  const { intoSections, intoChildren, COMPLEXES_HEADING } = await page();
  const sections = intoSections(KINDS, new Set());
  const { children, sticky } = intoChildren(sections, COMPLEX_KINDS);
  assert.equal(sticky.length, sections.length + 1, 'one more pinned heading than the categories');
  const at = sticky[sticky.length - 1];
  const head = children[at];
  assert.ok(head.type === 'heading' && head.label === COMPLEXES_HEADING && head.id === 'complexes');
  assert.equal(children[at + 1].type, 'note');
  assert.deepEqual(children.slice(at + 2).map((c) => (c.type === 'complex' ? c.kind : null)), [...COMPLEX_KINDS]);
  // Every kind's row comes before it.
  assert.ok(children.slice(0, at).every((c) => c.type !== 'complex'));
});

test('tend explore T49: What I\'m into heads its sections in the card\'s words, each with a muted line under its heading', async () => {
  const { intoSections, intoChildren } = await page();
  const sections = intoSections(KINDS, new Set());
  const label = (c: CategoryId) => sections.find((s) => s.category === c)?.label;
  assert.equal(label('parks'), 'Green');
  assert.equal(label('viewpoints'), 'Views & oddities');
  const children = intoChildren(sections, COMPLEX_KINDS).children as ({ type: string; id?: string; text?: string; label?: string })[];
  for (const s of sections) {
    const at = children.findIndex((c) => c.type === 'heading' && c.id === s.category);
    const line = children[at + 1];
    assert.equal(line.type, 'line', `${s.category}'s heading has a line under it`);
    assert.equal(line.text, (categoryOf(s.category) as { line?: string }).line, `${s.category}'s line is the table's`);
    assert.ok(line.text && line.text.length > 0 && !/\d/.test(line.text), `"${line.text}" is words, with no number`);
  }
  assert.equal((categoryOf('parks') as { line?: string }).line, 'Parks, gardens and nature');
  // The page draws it, muted, and never as a kind row (whose testIDs start "kind-").
  const page_ = source('components/IntoPage.tsx');
  assert.match(page_, /case 'line':/);
  assert.match(page_, /testID=\{`into-line-\$\{c\.id\}`\}/);
});
