// @layer core

/*
 * Everything the outing says (QC17, QC20, QC25, QC28): in words, never a digit count, a time, a rank or an ordinal.
 */
export const ENTRY_LABEL = 'Plan an outing';
export const SWAP_LABEL = 'Swap this stop';
export const HOURS_LINE = "Opening hours aren't known here.";
export const FEW_LINE = 'Few of those close by.';
export const NO_POSITION_LINE = 'Needs your location to propose an outing.';
export const NO_PICK_LINE = "Pick what you'd like to see.";
export const SWAPPED_LINE = 'Swapped for another one.';
export const SLOT_HINT = 'Shows which place it is';
export const NO_SWAP_LINE = 'No other one within reach.';
export const TITLE = 'Plan an outing';
export const SEARCH_LABEL = 'What would you like to see?';
export const MODE_LABEL: Record<'loop' | 'oneway', string> = { loop: 'Loop, back where you start', oneway: 'One way' };
export const CHAINS_LABEL = 'Include chains';
export const START_LABEL = 'Start';
export const CLOSE_LABEL = 'Close';
export const READING_LINE = 'Reading the streets…';
export const NO_ROUTE_LINE = 'No way found between them.';
export const NO_LOOP_LINE = 'No loop from here without going back the way you came: try One way.';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** QC17: how far the next stop is from the last point, in words. */
export function nextWord(m: number): string {
  return m < 250 ? 'a short walk on' : m < 700 ? 'a little way on' : 'some way on';
}

/** QC17: "An antiques shop, a short walk on": the entry's word and the distance in words; no name, number, rank or time. */
export function slotLine(slotWord: string, m: number): string {
  return `${cap(slotWord)}, ${nextWord(m)}`;
}

/** QC18: a card's second line: the kind and how far, in words (the name is its heading). */
export function cardLine(slotWord: string, m: number): string {
  return `${cap(slotWord)}, ${m < 250 ? 'close by' : m < 700 ? 'a little way off' : 'some way off'}`;
}

/** The line for a reason the planner gave (QC4, QC8, QC20). */
export function reasonLine(r: 'noPosition' | 'few' | 'noRoute' | 'noLoop'): string {
  return r === 'noPosition' ? NO_POSITION_LINE : r === 'few' ? FEW_LINE : r === 'noLoop' ? NO_LOOP_LINE : NO_ROUTE_LINE;
}
