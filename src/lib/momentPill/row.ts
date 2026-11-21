// @layer core

/** The pill's buttons (thread at capture CT1): camera, mic, note, Thread and ×, each 44 pt, 4 pt apart, in 4 pt of padding a side. */
const BUTTON = 44;
const GAP = 4;
const PAD = 8;
const ALL = 5;

/**
 * How many of the Add to this moment pill's buttons sit in its first row (CT1): all five where they fit in the room
 * left of the capture stack, else three (camera, mic, note), Thread and × wrapping below, as the approved drawing at
 * 320 px shows.
 */
export function pillPerRow(room: number): number {
  return room >= ALL * BUTTON + (ALL - 1) * GAP + PAD ? ALL : 3;
}

/** The width a row of `n` buttons takes, so the pill wraps after them. */
export function pillRowWidth(n: number): number {
  return n * BUTTON + (n - 1) * GAP;
}

/**
 * Whether the pill offers Thread for the open moment (thread-at-capture audit 1): never for one waiting in the Undo
 * window, whose delete any thread write would store for good.
 */
export function offersThread(open: string | null, hidden: ReadonlySet<string>): boolean {
  return !!open && !hidden.has(open);
}
