// @layer core
import type { ComplexKind } from '../complexes/types';
import { categoryOf } from '../discovery/categories';
import { isKindHidden, kindParent, kindRows, kindSwitch } from '../discovery/refinements';
import type { CategoryId, Kind } from '../discovery/types';
import { KINDS, kindHint, type KindInfo } from './explore';

/*
 * What I'm into, its own page (specs/what-im-into-page, decision 0192): the sections and rows it draws, and which of its
 * children are pinned. One page, opened from the ready bar's settings and from the walk's drawer (WI3).
 */

/** The page's title and the entry row's words (WI1, WI14): never a count (WI12). */
export const INTO_TITLE = 'What I’m into';
/** What a screen reader hears the row do (WI14). */
export const INTO_HINT = 'Opens its page';
/** Complexes' section after the five categories (WI15; the owner, Nov 18). */
export const COMPLEXES_HEADING = 'Complexes';

export interface IntoRow {
  id: Kind;
  label: string;
  icon: string;
  /** Steps in under its kind (XS5, PC23). */
  depth: number;
  on: boolean;
  /** Under a kind that is off: it cannot be switched on (PC23). */
  locked: boolean;
  /** A kind of its own, drawn heavier than its subtypes (WI7). */
  heavy: boolean;
  /** A subtype says its kind (XS23, small-places ui 2); a kind says which of its subtypes are off (WI18). */
  hint?: string;
  /** The quiet line under a kind's label naming its subtypes that are off (WI18). */
  note?: string;
}

export interface IntoSection {
  category: CategoryId;
  label: string;
  rows: IntoRow[];
}

/** WI5, WI6, WI7: the categories in KINDS' order, each with its rows; a subtype's row only while its kind is on. */
export function intoSections(kinds: readonly KindInfo[], hidden: ReadonlySet<Kind>): IntoSection[] {
  const sections: IntoSection[] = [];
  for (const { kind, depth } of kindRows(kinds, hidden)) {
    const sw = kindSwitch(hidden, kind.id);
    const note = offLine(kind.id, hidden) ?? undefined;
    const hint = [kindHint(kind.id), note].filter(Boolean).join('. ') || undefined;
    const row: IntoRow = { id: kind.id, label: kind.label, icon: kind.icon, depth, on: sw.on, locked: sw.locked, heavy: depth === 0, hint, note };
    const last = sections[sections.length - 1];
    if (last && last.category === kind.category) last.rows.push(row);
    else sections.push({ category: kind.category, label: categoryOf(kind.category).label, rows: [row] });
  }
  return sections;
}

export type IntoChild =
  | { type: 'heading'; id: string; label: string }
  | { type: 'row'; row: IntoRow }
  | { type: 'note' }
  | { type: 'complex'; kind: ComplexKind };

/**
 * WI5, WI15: the page's children in order (each section's heading, then its rows; then Complexes' heading, its note and
 * its switches) and the indices of the headings, which stay pinned while their rows scroll.
 */
export function intoChildren(sections: readonly IntoSection[], complexes: readonly ComplexKind[]): { children: IntoChild[]; sticky: number[] } {
  const children: IntoChild[] = [];
  const sticky: number[] = [];
  for (const s of sections) {
    sticky.push(children.length);
    children.push({ type: 'heading', id: s.category, label: s.label });
    for (const row of s.rows) children.push({ type: 'row', row });
  }
  if (complexes.length) {
    sticky.push(children.length);
    children.push({ type: 'heading', id: 'complexes', label: COMPLEXES_HEADING }, { type: 'note' });
    for (const kind of complexes) children.push({ type: 'complex', kind });
  }
  return { children, sticky };
}

/**
 * WI18: the longest off line, in characters, that stays one line at 320 px at the default text size under a kind's
 * label: the column is 208 px there and the e2e's 13 px font runs about 6.6 px a character ("Plaques and Small memorials
 * off", 31, is 200 px; "Ghost towns and Survey marks off", 32, wrapped). Past it the line says "Some of these off". The
 * `into` journey checks every line drawn at 320 px.
 */
export const OFF_LINE_MAX = 31;
const SOME_OFF = 'Some of these off';

/**
 * WI18 (the owner's call, Nov 18): the quiet line under a kind's row naming its subtypes that are off, "Ghost towns
 * off", "Plaques and Small memorials off"; names only, never a count (VISION's Never; counts are words, `quietLines`);
 * "Some of these off" where the names would not fit one line. Null while all are on, for a kind with no subtypes, and
 * while the kind itself is off (its subtypes are hidden then).
 */
export function offLine(kind: Kind, hidden: ReadonlySet<Kind>, kinds: readonly KindInfo[] = KINDS): string | null {
  if (isKindHidden(hidden, kind)) return null;
  const off = kinds.filter((k) => kindParent(k.id) === kind && hidden.has(k.id)).map((k) => k.label);
  if (!off.length) return null;
  const names = off.length === 1 ? off[0] : `${off.slice(0, -1).join(', ')} and ${off[off.length - 1]}`;
  const line = `${names} off`;
  return line.length <= OFF_LINE_MAX ? line : SOME_OFF;
}

/** WI17: how much of a row must show under the pinned heading before it counts as the first row there. */
export const PIN_SLACK = 12;

/** Where the page's pinned heading stands at a scroll position (WI17, WI22, WI24). */
export interface IntoPin {
  /** The pinned heading, by its place among the headings. */
  at: number;
  /** How far the incoming heading pushes it up (0 or less): on the web, where sticky headings stack, not push. */
  push: number;
  /** Rows are passing under it: its hairline shows. */
  stuck: boolean;
  /** The kind whose subtypes pass under it, said as its second line; null when a kind's own row shows its name. */
  kind: string | null;
}

/**
 * WI17, WI22, WI24: the pinned heading at `scrollY`, from the page's children and their heights (a heading `headingH`).
 * One level is all the platforms' sticky headers carry (each pushes the last out), so the second level, the kind, is the
 * heading's words: the kind of the row first under the heading, or a kind's own row once half of it is under the heading
 * (its label hidden), while it has subtypes shown.
 */
export function intoPin(children: readonly IntoChild[], heights: readonly number[], scrollY: number, headingH: number): IntoPin {
  const tops: number[] = [];
  let y = 0;
  for (const h of heights) {
    tops.push(y);
    y += h;
  }
  const heads = children.flatMap((c, i) => (c.type === 'heading' ? [i] : []));
  let at = 0;
  heads.forEach((i, n) => {
    if (tops[i] <= scrollY + 0.5) at = n;
  });
  const next = heads[at + 1];
  const push = next == null ? 0 : Math.min(0, tops[next] - scrollY - headingH);
  const stuck = scrollY > 0 && heads.length > 0 && scrollY >= tops[heads[at]] - 0.5;
  const line = scrollY + headingH;
  // The first row showing at least PIN_SLACK under the heading: a sliver of the row before it doesn't count.
  const probe = line + PIN_SLACK;
  const i = tops.findIndex((t, k) => t <= probe && probe < t + heights[k]);
  const c = i < 0 ? null : children[i];
  let kind: string | null = null;
  if (c && c.type === 'row') {
    if (c.row.depth > 0) {
      for (let j = i - 1; j >= 0; j--) {
        const p = children[j];
        if (p.type !== 'row') break;
        if (p.row.depth < c.row.depth) {
          kind = p.row.label;
          break;
        }
      }
    } else {
      const after = children[i + 1];
      if (after && after.type === 'row' && after.row.depth > 0 && line >= tops[i] + heights[i] / 2) kind = c.row.label;
    }
  }
  return { at, push, stuck, kind };
}

/** WI20 (the owner's call, Nov 18): opened from the walk's drawer, Back names the walk; from the ready bar, as it was. */
export function intoBack(from: string | undefined): { title: string; spoken: string } | null {
  return from === 'walk' ? { title: 'Walk', spoken: 'Walk, back' } : null;
}

/** The page's measures (WI21): a subtype's indent, the gaps beside the icon and switch, the margins, the heading's height. */
export interface IntoMeasures {
  indent: number;
  gap: number;
  pad: number;
  icon: number;
  headingH: number;
}

/**
 * WI21: at large text (the page's width over the text scale under 300 pt, as 200% on a phone, or 200% zoom in a
 * browser) the indent, the gutters and the margins shrink so a label gets the width. WI17: the heading holds two lines
 * at any scale, so the kind's line coming and going never changes its height.
 */
export function intoMeasures(width: number, fontScale: number): IntoMeasures {
  const scale = fontScale > 0 ? fontScale : 1;
  const headingH = Math.ceil(42 * scale) + 10;
  return width / scale < 300 ? { indent: 12, gap: 6, pad: 12, icon: 20, headingH } : { indent: 28, gap: 10, pad: 16, icon: 20, headingH };
}

/** WI23: Complexes' rows wear an icon each, as the kind rows do, from glyphs no kind's row uses. */
export const COMPLEX_ICON: Record<ComplexKind, string> = {
  shopping: 'cart-outline',
  markets: 'basket-outline',
  campuses: 'school-outline',
  stations: 'bus-outline',
  civic: 'podium-outline',
};
