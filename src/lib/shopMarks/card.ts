// @layer core
import type { Shop } from './read';
import { typeWords } from './types';

/*
 * The tap card's words and place (SM15, SM16): a name, a kind in words and, only for a shop the pack flags, a line saying what
 * the map data records. Nothing is said of a shop that is not flagged: no brand tag does not make it independent.
 */

/** The chain line, worded as what the map data records and not as a fact about the shop (steward S2). */
export const CHAIN_LINE = 'Marked as a chain on OpenStreetMap';

export interface CardLines {
  name: string;
  kind: string;
  chain: string | null;
}

export const cardLines = (p: Pick<Shop, 'name' | 'type' | 'chain'>): CardLines => ({ name: p.name, kind: typeWords(p.type), chain: p.chain ? CHAIN_LINE : null });

/** SM16: the close control is at least this many pixels each way. */
export const CLOSE_MIN_PX = 44;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const GUTTER = 16;
const CARD_H = 88;
const GAP = 12;

/**
 * SM16: where the card sits: a fixed region of the map's top, under the status bar and clear of the capture stack, which
 * lives in the bottom half of the screen. Never at the mark, so it cannot reach the stack. `topInset` is where the screen's free
 * top begins: the status bar, and on the walk screens the navigation card above the map.
 */
export const cardBox = (v: { width: number; height: number; topInset: number }): Box => ({ x: GUTTER, y: v.topInset + GAP, w: v.width - 2 * GUTTER, h: CARD_H });
