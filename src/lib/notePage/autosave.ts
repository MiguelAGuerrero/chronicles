// @layer core
/**
 * Saving a page as it is written (NP9, decision 0149): a reducer, because pauses, leaving, the background, a save
 * in flight and a failed one tangle (functional-core rule). The view runs its effects through the screen's own
 * create, save and delete. Time is an argument.
 */
export type SaveState = {
  /** Kept as a moment yet: a new page is not until it has words. */
  kept: boolean;
  /** The text on the page now. */
  text: string;
  /** The text last stored. */
  stored: string;
  editedAt: number;
  inFlight: boolean;
  failed: boolean;
  leaving: boolean;
};

export type SaveEvent =
  | { type: 'edit'; text: string; now: number }
  | { type: 'tick'; now: number }
  | { type: 'leave' }
  | { type: 'background' }
  | { type: 'saved'; text: string }
  | { type: 'failed' };

export type SaveEffect = { type: 'create'; body: string } | { type: 'save'; body: string } | { type: 'delete' };

export function startSave(_o: { kept: boolean; body: string; now: number }): SaveState {
  throw new Error('note pages: not built');
}

export function stepSave(_s: SaveState, _e: SaveEvent): { state: SaveState; effects: SaveEffect[] } {
  throw new Error('note pages: not built');
}
