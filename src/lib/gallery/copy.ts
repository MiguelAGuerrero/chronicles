// @layer core
import { numberWord } from '../resurface/lines';
import type { PartOfDay } from '../resurface/context';
import type { Order, Shape, Show, Zoom } from './types';

/**
 * Every sentence the gallery writes (MG6, MG7, MG9, MG10, MG19). Nothing counts: a number reaches the screen
 * from here only as a word.
 */

export const EMPTY_ALL = 'Photos, videos and voice memos you keep show here.';
const EMPTY_KIND: Record<Exclude<Show, 'all'>, string> = {
  photo: 'No photos kept yet.',
  video: 'No videos kept yet.',
  voice: 'No voice memos kept yet.',
};
/** With nothing to show (MG10): one line, for everything or for the kind chosen. */
export const emptyLine = (show: Show): string => (show === 'all' ? EMPTY_ALL : EMPTY_KIND[show]);

/** The bar's words with a kind chosen (MG9), and the way back to all. */
export const ONLY: Record<Exclude<Show, 'all'>, string> = { photo: 'Photos only', video: 'Videos only', voice: 'Memos only' };
export const SHOW_ALL = 'Show All';

/** The View menu (MG9, MG18, MG20, MG21) and the bar's zoom (MG19), in iOS Photos' words. */
export const SHOW_LABEL: Record<Show, string> = { all: 'All Items', photo: 'Photos', video: 'Videos', voice: 'Memos' };
export const ORDER_LABEL: Record<Order, string> = { newest: 'Newest First', oldest: 'Oldest First' };
export const ZOOM_LABEL: Record<Zoom, string> = { years: 'Years', months: 'Months', days: 'Days' };
export const SHAPE_LABEL: Record<Shape, string> = { square: 'Square Photo Grid', aspect: 'Aspect Ratio Grid' };
export const ZOOM_IN = 'Zoom In';
export const ZOOM_OUT = 'Zoom Out';
export const VIEW_MENU = 'View options';
export const MENU_SORT = 'Sort';
export const MENU_SHOW = 'Show';
export const MENU_SIZE = 'Size';
export const MENU_GRID = 'Grid';

/** A tile's kind, spoken (MG15). */
export const KIND_WORD: Record<'photo' | 'video' | 'voice', string> = { photo: 'Photo', video: 'Video', voice: 'Voice memo' };

export const NOT_ON_A_WALK = 'Not on a walk';
export const OUTSIDE_A_WALK = 'and outside a walk';

const PART: Record<PartOfDay, string> = { morning: 'a morning walk', afternoon: 'an afternoon walk', evening: 'an evening walk', night: 'a night walk' };

/** An untitled walk (MG6): "a morning walk in Alfama"; with no area known, "a morning walk", never a guessed place. */
export const untitledWalk = (part: PartOfDay, area: string | null): string => `${PART[part]}${area ? ` in ${area}` : ''}`;

/** The walks past the two named (MG6), in words: "another walk", "two other walks". */
export const moreWalks = (n: number): string => (n === 1 ? 'another walk' : `${numberWord(n)} other walks`);
export const OTHER_STREETS = 'other streets';
/** The places past the three named on a month or a year (MG19). */
export const morePlaces = (n: number): string => (n === 1 ? 'another place' : 'other places');

/** "a", "a and b", "a, b and c". */
export function listed(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** The first letter up, for a line that starts with the app's own words; never a walk's own title. */
export const capFirst = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
