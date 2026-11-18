/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { COMPLEX_KINDS, type ComplexKind } from '../../complexes/types';
import { kindParent } from '../../discovery/refinements';
import { DEFAULT_OFF } from '../../discovery/subtypes';
import type { Kind } from '../../discovery/types';
import { KINDS, kindOf, type KindInfo } from '../../explore/explore';

// What I'm into, its own page: the review of Nov 18 (specs/what-im-into-page WI17-WI25; the owner's four calls and the
// local fixes), written before the code.

type Row = { id: Kind; label: string; icon: string; depth: number; on: boolean; locked: boolean; heavy: boolean; hint?: string; note?: string };
type Section = { label: string; rows: Row[] };
type Child = { type: 'heading'; id: string; label: string } | { type: 'row'; row: Row } | { type: 'note' } | { type: 'complex'; kind: ComplexKind };
type Pin = { at: number; push: number; stuck: boolean; kind: string | null };
type Measures = { indent: number; gap: number; pad: number; icon: number; headingH: number };
type IntoPage = {
  intoSections: (kinds: readonly KindInfo[], hidden: ReadonlySet<Kind>) => Section[];
  intoChildren: (sections: Section[], complexes: readonly ComplexKind[]) => { children: Child[]; sticky: number[] };
  intoPin: (children: readonly Child[], heights: readonly number[], scrollY: number, headingH: number) => Pin;
  offLine: (kind: Kind, hidden: ReadonlySet<Kind>) => string | null;
  CHANGED_LINE: string;
  intoBack: (from: string | undefined, walkOpen: boolean) => { title: string; spoken: string } | null;
  intoMeasures: (width: number, fontScale: number) => Measures;
  COMPLEX_ICON: Record<ComplexKind, string>;
};
const page = async () => (await import('../../explore/intoPage')) as unknown as IntoPage;

const SRC = join(__dirname, '../../..');
const PARENTS = KINDS.filter((k) => KINDS.some((s) => kindParent(s.id) === k.id));
const kidsOf = (id: Kind) => KINDS.filter((k) => kindParent(k.id) === id);

/** The page laid out: a heading `H` tall, a row 48, the note 36. */
const H = 52;
const layout = (children: readonly Child[]) => children.map((c) => (c.type === 'heading' ? H : c.type === 'note' ? 36 : 48));
const topsOf = (heights: readonly number[]) => heights.map((_, i) => heights.slice(0, i).reduce((a, b) => a + b, 0));

test('WI17: while a kind\'s subtypes scroll under the pinned heading, the heading carries the kind\'s name', async () => {
  const { intoSections, intoChildren, intoPin } = await page();
  const { children, sticky } = intoChildren(intoSections(KINDS, new Set(DEFAULT_OFF)), COMPLEX_KINDS);
  const heights = layout(children);
  const tops = topsOf(heights);
  let named = 0;
  children.forEach((c, i) => {
    if (c.type !== 'row') return;
    // The line under the pinned heading runs through this row's middle.
    const y = tops[i] + heights[i] / 2 - H;
    const pin = intoPin(children, heights, y, H);
    const section = sticky.filter((s) => tops[s] <= y).length - 1;
    assert.equal(pin.at, section, `${c.row.id}: the heading pinned is its section's`);
    const parent = kindParent(c.row.id);
    if (parent) {
      assert.equal(pin.kind, kindOf(parent).label, `${c.row.id} at the top: the heading names ${parent}`);
      named++;
    } else if (kidsOf(c.row.id).length && c.row.on) {
      // A kind's own row half under the heading: its label is hidden, so its name is pinned.
      assert.equal(pin.kind, c.row.label, `${c.row.id} half under the heading: its own name pinned`);
    } else assert.equal(pin.kind, null, `${c.row.id}, a kind with nothing under it: no second line`);
    // A kind row's top just under the heading: its own label shows, so nothing is added.
    if (!parent) assert.equal(intoPin(children, heights, tops[i] - H + 2, H).kind, null, `${c.row.id} in full: no second line`);
  });
  assert.ok(named > 10, 'every subtype was read at the top');
  // On a heading, or at rest at the top, nothing is added; nothing is stuck at rest.
  assert.deepEqual(intoPin(children, heights, 0, H), { at: 0, push: 0, stuck: false, kind: null });
});

test('WI22: the incoming heading pushes the pinned one out', async () => {
  const { intoSections, intoChildren, intoPin } = await page();
  const { children, sticky } = intoChildren(intoSections(KINDS, new Set()), COMPLEX_KINDS);
  const heights = layout(children);
  const tops = topsOf(heights);
  for (let n = 1; n < sticky.length; n++) {
    const next = tops[sticky[n]];
    // The next heading half way into the pinned one's place: it is pushed up by half.
    const half = intoPin(children, heights, next - H / 2, H);
    assert.equal(half.at, n - 1);
    assert.equal(half.push, -H / 2);
    // Well before: no push; at its place: the next one is pinned, unpushed.
    assert.equal(intoPin(children, heights, next - H - 10, H).push, 0);
    const there = intoPin(children, heights, next, H);
    assert.equal(there.at, n);
    assert.equal(there.push, 0);
    assert.equal(there.kind, null, 'a heading at the top adds no kind');
  }
});

test('WI18: a kind with some subtypes changed from their default names them, in words, on one short line', async () => {
  const { offLine, CHANGED_LINE, intoSections } = await page();
  const defaults = new Set<Kind>(DEFAULT_OFF);
  // Only the reader's changes, either way (the owner, Nov 18, "Only your changes"; audit 7).
  assert.equal(offLine('curiosities', new Set<Kind>([...defaults].filter((k) => k !== 'ghost_towns'))), 'Ghost towns on');
  assert.equal(offLine('nature', new Set<Kind>([...defaults, 'waterfalls'])), 'Waterfalls off');
  for (const p of PARENTS) {
    const kids = kidsOf(p.id).map((k) => k.id);
    assert.equal(offLine(p.id, defaults), null, `${p.id}: as installed, no line`);
    assert.equal(offLine(p.id, new Set<Kind>([p.id, ...kids])), null, `${p.id} off: no line`);
    // Any set of its subtypes switched: a line of names, or the fallback, never a number.
    for (let n = 1; n <= kids.length; n++) {
      const flipped = new Set<Kind>(defaults);
      for (const k of kids.slice(0, n)) if (flipped.has(k)) flipped.delete(k);
      else flipped.add(k);
      const line = offLine(p.id, flipped);
      assert.ok(line && !/\d/.test(line), `${p.id}, ${n} changed: "${line}"`);
      if (line !== CHANGED_LINE) for (const k of kids.slice(0, n)) assert.ok(line.toLowerCase().includes(kindOf(k).label.toLowerCase()), `${line} names ${k}`);
    }
  }
  // A row with no subtypes of its own (a subtype) says nothing.
  for (const k of KINDS.filter((k) => !kidsOf(k.id).length)) assert.equal(offLine(k.id, new Set(DEFAULT_OFF)), null, `${k.id} has no subtypes`);
  // The row carries it, as its note and in what a screen reader hears.
  const curio = intoSections(KINDS, new Set<Kind>([...defaults].filter((k) => k !== 'ghost_towns'))).flatMap((s) => s.rows).find((r) => r.id === 'curiosities')!;
  assert.equal(curio.note, 'Ghost towns on');
  assert.ok(curio.hint?.includes('Ghost towns on'));
});

test('WI19: the walk\'s drawer draws the row after the walk\'s settings, under a heading of its own', () => {
  const text = readFileSync(join(SRC, 'app/walk.tsx'), 'utf8');
  const row = text.indexOf('<IntoRow');
  assert.ok(row > text.indexOf('testID="share-gps-log"'), 'after the walk\'s settings');
  const heads = [...text.slice(0, row).matchAll(/accessibilityRole="header">([^<]+)</g)].map((m) => m[1]);
  // "Explore" (the owner, Nov 18; audit 13).
  assert.equal(heads[heads.length - 1], 'Explore');
});

test('WI20: Back reads "Walk" when the page came from the walk\'s drawer, and only then', async () => {
  const { intoBack } = await page();
  assert.deepEqual(intoBack('walk', true), { title: 'Walk', spoken: 'Walk, back' });
  assert.equal(intoBack('ready', true), null);
  assert.equal(intoBack(undefined, true), null);
});

test('WI21: at large text the indent, the gutter and the margins shrink so a label gets the width', async () => {
  const { intoMeasures } = await page();
  const SWITCH = 40;
  const labelW = (width: number, scale: number, depth: number) => {
    const m = intoMeasures(width, scale);
    return (width - 2 * m.pad - depth * m.indent - m.icon - 2 * m.gap - SWITCH) / scale;
  };
  const normal = intoMeasures(390, 1);
  assert.deepEqual([normal.indent, normal.gap, normal.pad], [28, 10, 16], 'the default text size keeps the page as it was');
  for (const [w, s] of [[390, 2], [195, 1], [320, 1.5]] as const) {
    const m = intoMeasures(w, s);
    assert.ok(m.indent < normal.indent && m.gap < normal.gap && m.pad < normal.pad, `${w} at ${s}: smaller`);
    assert.ok(labelW(w, s, 1) > 80, `${w} at ${s}: a subtype's label keeps room for a long word (${labelW(w, s, 1)})`);
  }
  // The heading holds its two lines at any scale, so it never changes height as the kind comes and goes (WI17).
  assert.ok(intoMeasures(390, 2).headingH >= 2 * normal.headingH - 10 && normal.headingH >= 48);
});

test('WI23: Complexes\' rows each have an icon of their own, used by no other row', async () => {
  const { COMPLEX_ICON } = await page();
  const icons = COMPLEX_KINDS.map((k) => COMPLEX_ICON[k]);
  assert.ok(icons.every(Boolean));
  assert.equal(new Set(icons).size, icons.length);
  const used = new Set(KINDS.map((k) => k.icon));
  for (const i of icons) assert.ok(!used.has(i), `${i} is no kind's icon`);
  const glyphs = JSON.parse(readFileSync(join(SRC, '../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'), 'utf8'));
  for (const i of icons) assert.ok(i in glyphs, `${i} is an installed Ionicons glyph`);
});
