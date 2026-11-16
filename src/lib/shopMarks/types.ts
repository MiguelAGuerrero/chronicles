// @layer core
import { SHOP_MARK_TYPES } from '../presence/presence';

/*
 * Shop marks (specs/shop-marks, SM9): which shop values the layer draws, said once. The pack carries every named shop with its
 * OpenStreetMap value; the layer draws only the list presence keeps (`SHOP_MARK_TYPES`: presence is the only file that spells a
 * source's tags, PR2), a stated rule and not a verdict: no copy calls a drawn type worth going to or another an errand. A value
 * not listed never draws and is never guessed. Kept apart from presence otherwise (SM17): presence says what a place is to density
 * and marks; this says what a layer draws.
 */

/** The shop values the layer draws. */
export const DRAWN_TYPES: readonly string[] = SHOP_MARK_TYPES;

const DRAWN: ReadonlySet<string> = new Set(DRAWN_TYPES);

/** A Set holds only what was put in it: `constructor` and `__proto__` are not drawn. */
export const isDrawn = (type: string): boolean => DRAWN.has(type);

/**
 * What a shop is, in words: the value read plainly (an underscore as a space), never a table of verdicts. A value that is
 * not a plain word of letters and underscores is said as "Shop".
 */
export function typeWords(type: string): string {
  if (!/^[a-z]+(_[a-z]+)*$/.test(type)) return 'Shop';
  const words = type.replace(/_/g, ' ');
  return words[0].toUpperCase() + words.slice(1);
}

/** SM10: below this zoom nothing is drawn (the tiles' own places are complete at z14), and the panel says to zoom in. */
export const NEAR_ZOOM = 14;

/** SM12: on the two walk maps the marks draw only within this of you, a hard cut from you and not from a pan. */
export const WALK_NEAR_M = 800;
