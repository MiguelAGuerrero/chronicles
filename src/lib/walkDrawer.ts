// @layer core
/**
 * The walk's drawer (specs/walk-drawer-sections): pulled up it is "This walk", the walk's details in words; the strip's
 * … raises it on "Walk settings", four sections, each shown alone inside the drawer with "‹ Walk settings". Its view is
 * a small reducer, its words are plain functions. Pure.
 */
import { formatCaptures, formatDistance, formatDuration, formatElapsed, formatRange } from './format';
import { clockTime } from './journal/lines';
import { LEANING_WORDS, type Leaning } from './nav/scenic';
import { NOTICE_KINDS, type NoticePrefs, type Permission } from './notify/core';
import { numberWord } from './resurface/lines';
import type { Units } from './units';
import type { MotionAccess } from './walkMotion';

export type SectionId = 'explore' | 'map' | 'reminders' | 'motion';

/** The menu's rows, in order (WD1; the owner, Nov 19). */
export const SECTIONS: readonly { id: SectionId; name: string }[] = [
  { id: 'explore', name: 'Explore' },
  { id: 'map', name: 'Map & routes' },
  { id: 'reminders', name: 'Reminders' },
  { id: 'motion', name: 'Location & motion' },
];

/** Lowered, or raised on This walk, the menu or one section. */
export type DrawerState = 'down' | 'details' | 'menu' | SectionId;

export type DrawerEvent =
  /** A drag up or a tap on the numbers raising it (a tap that lowers it is `lower`). */
  | { type: 'pull' }
  /** The strip's …. */
  | { type: 'more' }
  /** This walk's "Walk settings" row (WD9). */
  | { type: 'settings' }
  /** The menu's "This walk" row (walk-drawer-sections ui 1: the cold find, the owner's call). */
  | { type: 'details' }
  | { type: 'pick'; id: SectionId }
  /** The section's back control, Android's Back, Escape. */
  | { type: 'back' }
  /** A drag down, a tap on the numbers while up, or anything that closes the drawer. */
  | { type: 'lower' };

const isSection = (s: DrawerState): s is SectionId => s !== 'down' && s !== 'details' && s !== 'menu';

/** WD1, WD4, WD9, WD10: where the drawer goes. Lowered, it forgets the view, so a raise starts fresh. */
export function stepDrawer(s: DrawerState, e: DrawerEvent): DrawerState {
  switch (e.type) {
    case 'pull':
      return s === 'down' ? 'details' : s;
    case 'more':
      return s === 'down' || s === 'details' ? 'menu' : 'down';
    case 'settings':
      return s === 'details' ? 'menu' : s;
    case 'details':
      return s === 'menu' ? 'details' : s;
    case 'pick':
      return s === 'menu' ? e.id : s;
    case 'back':
      return isSection(s) ? 'menu' : 'down';
    case 'lower':
      return 'down';
  }
}

/** WD12: the … is expanded while it has the settings up. */
export const moreExpanded = (s: DrawerState): boolean => s === 'menu' || isSection(s);

/** WD12: the tail of the numbers' spoken name: they raise This walk. */
export const numbersTail = (s: DrawerState): string => (s === 'down' ? 'Walk details' : 'Lower the walk details');

/** WD11: the range ring is drawn while Explore's own section is open on an exploring walk. */
export const ringShown = (s: DrawerState, exploring: boolean): boolean => s === 'explore' && exploring;

export type SectionInput = {
  exploring: boolean;
  rangeM: number;
  leanings: readonly Leaning[];
  /** Null until read. */
  notices: NoticePrefs | null;
  /** Whether notifications may show at all; null or absent until read. */
  permission?: Permission | null;
  motion: MotionAccess;
  units: Units;
};

const listed = (words: string[]) => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

/** WD1: a menu row's muted line, how its section is set now, in words (the owner, Nov 19). */
export function sectionLine(id: SectionId, i: SectionInput): string {
  switch (id) {
    case 'explore':
      return i.exploring ? `On, “?” within ${formatRange(i.rangeM, i.units)}` : 'Off';
    case 'map': {
      const on = (Object.keys(LEANING_WORDS) as Leaning[]).filter((l) => i.leanings.includes(l));
      return on.length ? `Leaning to ${listed(on.map((l) => LEANING_WORDS[l].label.toLowerCase()))}` : 'The direct way';
    }
    case 'reminders': {
      if (!i.notices) return '';
      const on = NOTICE_KINDS.filter((k) => i.notices![k.id]);
      if (!on.length) return 'Off';
      // Switched on but unable to arrive: never "On" (ui 3), as Location & motion says "Motion blocked".
      if (i.permission === 'denied') return 'Blocked';
      if (i.permission === 'unsupported') return 'Not available here';
      if (on.length === NOTICE_KINDS.length) return 'On';
      return `${listed(on.map((k) => k.label))} on`;
    }
    case 'motion':
      return { on: 'Motion on', off: 'Motion off', denied: 'Motion blocked', unavailable: 'No motion here' }[i.motion];
  }
}

/** The menu's This walk row's line (ui 1): when it started and how far, as This walk itself says them. */
export function thisWalkLine(o: { startedAt: number; distanceM: number; units: Units }): string {
  return `Started at ${clockTime(o.startedAt)}, ${formatDistance(o.distanceM, o.units)} walked`;
}

export type DetailsInput = {
  startedAt: number;
  /** The walk's time with its pauses left out, as the strip counts it. */
  elapsedMs: number;
  distanceM: number;
  rideM: number;
  pausedMs: number;
  /** The street you are on, when one is known within reach. */
  street: string | null;
  /** Where the shown way leads, and how far. */
  heading: { label: string; distanceM: number } | null;
  kept: { photos: number; videos: number; voices: number; notes: number };
  /** The walk's breaks in the signal (WD18). */
  gaps: readonly { ms: number; at: number }[];
  notRecording: boolean;
  units: Units;
};

export type DetailKey = 'started' | 'walked' | 'ride' | 'paused' | 'street' | 'heading' | 'kept' | 'gaps' | 'recording';

/**
 * WD5, WD7, WD18: This walk in words, each line only when it has something to say. Distances and times are figures, as
 * the strip's are; a count is a word; never a pace, a share or a countdown.
 */
export function walkDetailLines(i: DetailsInput): { key: DetailKey; text: string }[] {
  const out: { key: DetailKey; text: string }[] = [];
  const add = (key: DetailKey, text: string | null | false) => text && out.push({ key, text });
  add('started', `Started at ${clockTime(i.startedAt)}`);
  // The strip's own figures, word for word (WD8).
  add('walked', `${formatDistance(i.distanceM, i.units)} walked in ${formatElapsed(i.elapsedMs)}`);
  add('ride', i.rideM >= 1 && `${formatDistance(i.rideM, i.units)} by ride`);
  add('paused', i.pausedMs >= 1000 && `Paused for ${formatDuration(i.pausedMs)}`);
  add('street', i.street && `On ${i.street}`);
  add('heading', i.heading && `Heading for ${i.heading.label}, ${formatDistance(i.heading.distanceM, i.units)} away`);
  add('kept', formatCaptures(i.kept) || null);
  if (i.gaps.length === 1) add('gaps', `No signal for ${formatDuration(i.gaps[0].ms)}, at ${clockTime(i.gaps[0].at)}`);
  else if (i.gaps.length > 1) {
    const total = i.gaps.reduce((a, g) => a + g.ms, 0);
    add('gaps', `No signal ${i.gaps.length === 2 ? 'twice' : `${numberWord(i.gaps.length)} times`}, ${formatDuration(total)} in all`);
  }
  add('recording', i.notRecording && 'Not recording now');
  return out;
}

/**
 * WD17: the walk's raised height, 60% of the screen as the ready bar's (`raisedHeight`), lowered only as far as keeps the
 * capture stack riding on its edge (`stack` tall) clear of the top row (`top`, from the screen's top); never below the
 * strip at rest.
 */
export function liftedHeight(o: { areaH: number; rest: number; top: number; stack: number }): number {
  const sixty = Math.max(o.rest, Math.round(o.areaH * 0.6));
  return Math.max(o.rest, Math.min(sixty, o.areaH - o.top - o.stack));
}
