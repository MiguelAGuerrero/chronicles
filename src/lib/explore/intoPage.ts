// @layer core
import type { ComplexKind } from '../complexes/types';
import { categoryOf } from '../discovery/categories';
import { kindRows, kindSwitch } from '../discovery/refinements';
import type { CategoryId, Kind } from '../discovery/types';
import { kindHint, type KindInfo } from './explore';

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
  /** A subtype says its kind (XS23, small-places ui 2). */
  hint?: string;
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
    const row: IntoRow = { id: kind.id, label: kind.label, icon: kind.icon, depth, on: sw.on, locked: sw.locked, heavy: depth === 0, hint: kindHint(kind.id) };
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
