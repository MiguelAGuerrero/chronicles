// @layer core
import type { ComplexKind } from '../complexes/types';
import { categoryOf } from '../discovery/categories';
import { isKindHidden, kindParent, kindRows, kindSwitch } from '../discovery/refinements';
import { DEFAULT_OFF } from '../discovery/subtypes';
import type { CategoryId, Kind } from '../discovery/types';
import { WALK_NAME } from '../walkName';
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
  /** The quiet line under a kind's label naming its subtypes changed from their default (WI18, audit 7). */
  note?: string;
  /** A kind row right after a subtype's: a little space above it, so it never reads as one more child (audit 16). */
  spaced?: boolean;
}

/** The space above a kind row that follows a subtype's (what-im-into-page audit 16): restrained. */
export const INTO_KIND_GAP = 8;

export interface IntoSection {
  category: CategoryId;
  /** The category's name, as the area card names it (tend explore T49, decision 0239). */
  label: string;
  /** The muted line under its heading, in words: "Parks, gardens and nature" (decision 0239). */
  line?: string;
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
    const prev = last && last.category === kind.category ? last.rows[last.rows.length - 1] : undefined;
    if (depth === 0 && prev && prev.depth > 0) row.spaced = true;
    if (last && last.category === kind.category) last.rows.push(row);
    else {
      const { label, line } = categoryOf(kind.category);
      sections.push({ category: kind.category, label, ...(line ? { line } : {}), rows: [row] });
    }
  }
  return sections;
}

export type IntoChild =
  | { type: 'heading'; id: string; label: string }
  /** The muted line under a category's heading (tend explore T49, decision 0239); it scrolls with the rows, as Complexes' note does. */
  | { type: 'line'; id: CategoryId; text: string }
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
    if (s.line) children.push({ type: 'line', id: s.category, text: s.line });
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
 * WI18: the longest line, in characters, that stays one line at 320 px at the default text size under a kind's label:
 * the column is 208 px there and the e2e's 13 px font runs about 6.6 px a character ("Plaques and small memorials off",
 * 31, is 200 px; 32 wrapped). Measured in Chromium's font only: SF and Roboto at 320 px are a native check. Past it the
 * line says `CHANGED_LINE`. The `into` journey checks every line drawn at 320 px.
 */
export const OFF_LINE_MAX = 31;
/** Where the names would not fit (audit 7): no count, and true whichever way the switches went. */
export const CHANGED_LINE = 'Changed from the usual';

const DEFAULTS_OFF: ReadonlySet<Kind> = new Set(DEFAULT_OFF);
/** "Ghost towns", then "small memorials": no capital mid-sentence (audit 7). */
const said = (labels: string[], first: boolean): string => {
  const names = labels.map((l, i) => (first && i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1)));
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/**
 * WI18 (the owner's calls, Nov 18: "Only your changes"; what-im-into-page audit 7): the quiet line under a kind's row
 * naming its subtypes whose switch differs from its default, either way: "Ghost towns on", "Waterfalls off", "Ghost
 * towns on, time capsules off"; names only, never a count (VISION's Never; counts are words, `quietLines`);
 * `CHANGED_LINE` where the names would not fit one line. Null as installed, for a kind with no subtypes, and while the
 * kind itself is off (its subtypes are hidden then).
 */
export function offLine(kind: Kind, hidden: ReadonlySet<Kind>, kinds: readonly KindInfo[] = KINDS): string | null {
  if (isKindHidden(hidden, kind)) return null;
  const kids = kinds.filter((k) => kindParent(k.id) === kind);
  const on = kids.filter((k) => DEFAULTS_OFF.has(k.id) && !hidden.has(k.id)).map((k) => k.label);
  const off = kids.filter((k) => !DEFAULTS_OFF.has(k.id) && hidden.has(k.id)).map((k) => k.label);
  if (!on.length && !off.length) return null;
  const parts = [on.length ? `${said(on, true)} on` : null, off.length ? `${said(off, !on.length)} off` : null].filter(Boolean);
  const line = parts.join(', ');
  return line.length <= OFF_LINE_MAX ? line : CHANGED_LINE;
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
    if (tops[i] <= scrollY + 1.5) at = n;
  });
  // Each heading is as tall as its own lines (audit 12): the pinned one's height, where it is known.
  const pinnedH = heads.length ? (heights[heads[at]] ?? headingH) : headingH;
  const next = heads[at + 1];
  const push = next == null ? 0 : Math.min(0, tops[next] - scrollY - pinnedH);
  // No hairline while it is pushed out: it would sit on the incoming heading (audit 12).
  const stuck = scrollY > 0 && heads.length > 0 && scrollY >= tops[heads[at]] - 1.5 && push > -0.5;
  const line = scrollY + pinnedH;
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

/**
 * WI20 (the owner's call, Nov 18): opened from the walk's drawer, Back names the walk, by the walk screen's own name
 * (`WALK_NAME`, audit 14); from the ready bar, as it was. A link to `/into?from=walk` with no walk open has none
 * beneath it, so Back says "Go back" (audit 10).
 */
export function intoBack(from: string | undefined, walkOpen: boolean): { title: string; spoken: string } | null {
  return from === 'walk' && walkOpen ? { title: WALK_NAME, spoken: `${WALK_NAME}, back` } : null;
}

/** The route's header options for Back (WI20, audit 8); `backSpoken` names the route's own back button on Android. */
export interface IntoHeader {
  headerBackTitle?: string;
  headerBackButtonDisplayMode?: 'default' | 'minimal';
  backSpoken?: string;
}

/**
 * WI20, audit 8: how the route carries Back's word and its spoken name. iOS's back button and the web's header speak
 * their title as "the title, back" themselves (VoiceOver: "Walk, back button"; react-native-web: `aria-label`), so the
 * title is passed, the word dropped at large text (`roomy` false) as iOS drops a title with no room. native-stack has no
 * option for the back button's spoken name, and Android's draws an arrow named by the system ("Navigate up"), so there
 * the route draws its own Back, named `backSpoken`; the system Back and its gesture are untouched.
 */
export function intoHeader(back: { title: string; spoken: string } | null, roomy: boolean, os: string): IntoHeader {
  if (!back) return {};
  if (os === 'android') return { backSpoken: back.spoken };
  return { headerBackTitle: back.title, headerBackButtonDisplayMode: roomy ? 'default' : 'minimal' };
}

/** What the page draws (WI9, audit 11): nothing while the settings are read, a line in words if the read failed. */
export function intoBody(settings: object | null, failed: boolean): 'wait' | 'failed' | 'page' {
  if (settings) return 'page';
  return failed ? 'failed' : 'wait';
}
/** Audit 11: a failed read leaves no blank page; Back still works. */
export const INTO_UNREAD = 'Your choices couldn’t be read just now. Go back and open this page again.';

/** The page's measures (WI21): a subtype's indent, the gaps beside the icon and switch, the margins, the heading's height. */
export interface IntoMeasures {
  indent: number;
  gap: number;
  pad: number;
  /** The icon's gutter: none at large text. */
  icon: number;
  headingH: number;
  /** How many lines the category's name may take: two at large text, where it would not fit one (WI21). */
  headingLines: number;
}

/**
 * WI21: at large text (the page's width over the text scale under 300 pt, as 200% on a phone, or 200% zoom in a
 * browser) the indent, the gutters and the margins shrink and the rows drop their icons (`icon` 0), so a label gets the
 * width ("Archaeological" whole at 195 px), and the category's name may wrap to two lines. WI17: the heading holds its lines and the kind's at any scale, so the kind's line coming and going never
 * changes its height.
 */
export function intoMeasures(width: number, fontScale: number): IntoMeasures {
  const scale = fontScale > 0 ? fontScale : 1;
  // The category (22 a line) and the kind (20), at the scale; at large text the category may take two lines.
  if (width / scale < 300) return { indent: 12, gap: 6, pad: 12, icon: 0, headingH: Math.ceil(64 * scale) + 10, headingLines: 2 };
  return { indent: 28, gap: 10, pad: 16, icon: 20, headingH: Math.ceil(42 * scale) + 10, headingLines: 1 };
}

/**
 * A heading's own height (audit 12): its category's lines and the kind's line under it (WI17), at the scale. At large
 * text a category that would not fit one line takes two; one that fits ("Art") reserves one, so no blank band stands
 * above it at rest. The fit is judged generously (10.5 px a character of the 17 px bold heading), so a category is
 * never cut: at worst one keeps a second line it did not need.
 */
export function intoHeadingH(label: string, width: number, fontScale: number): number {
  const scale = fontScale > 0 ? fontScale : 1;
  const m = intoMeasures(width, scale);
  const lines = m.headingLines > 1 && label.length * 10.5 * scale > width - 2 * m.pad ? 2 : 1;
  return Math.ceil((22 * lines + 20) * scale) + 10;
}

/** WI23: Complexes' rows wear an icon each (`complexes/kinds`, where a complex's kinds are named). */
export { COMPLEX_ICON } from '../complexes/kinds';

/** HK6 (specs/poi-hide-from-card): `?at=` read as a kind of the page's rows, else none. */
export function intoAt(raw: string | string[] | undefined): Kind | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && KINDS.some((k) => k.id === v) ? (v as Kind) : null;
}

/**
 * HK6: where the page scrolls so `at`'s row stands just under its pinned heading: the row's top less its heading's
 * height. Null until every child above the row has its height, or when the row is not drawn (its kind under one off).
 */
export function intoScrollY(children: readonly IntoChild[], heights: readonly (number | undefined)[], at: Kind, headH: (label: string) => number): number | null {
  const i = children.findIndex((c) => c.type === 'row' && c.row.id === at);
  if (i < 0) return null;
  let top = 0;
  let heading: string | null = null;
  let headingTop = 0;
  let rowsBefore = 0;
  for (let j = 0; j < i; j++) {
    const h = heights[j];
    if (h == null) return null;
    const c = children[j];
    if (c.type === 'heading') {
      heading = c.label;
      headingTop = top;
      rowsBefore = 0;
    } else if (c.type === 'row') rowsBefore++;
    top += h;
  }
  // poi-hide-from-card audit 14 (the ux-reviewer's U30): the first row of its section opens at the section's top, its
  // heading and muted line whole above it, never a fragment of the line under the pinned heading.
  if (heading && rowsBefore === 0) return headingTop;
  return Math.max(0, top - (heading ? headH(heading) : 0));
}
