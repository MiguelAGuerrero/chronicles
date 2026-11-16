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
export const NO_SWAP_LINE = 'No other one within reach.';
export const NO_LOOP_LINE = 'No loop from here without going back the way you came: try One way.';

/** QC17: how far the next stop is from the last point, in words. */
export function nextWord(_m: number): string {
  throw new Error('not built: quick-circuit QC17');
}

/** QC17: "An antiques shop, a short walk on": the entry's word and the distance in words; no name, number, rank or time. */
export function slotLine(_slotWord: string, _m: number): string {
  throw new Error('not built: quick-circuit QC17');
}

/** QC18: a card's second line: the kind and how far, in words (the name is its heading). */
export function cardLine(_slotWord: string, _m: number): string {
  throw new Error('not built: quick-circuit QC18');
}
