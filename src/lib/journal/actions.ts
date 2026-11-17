// @layer core

/**
 * The quick-action row under an entry on Chronicle's page (decision 0196, SW1, SW4, SW5): four fixed slots, always in
 * this order, so an action that does not apply leaves its slot empty and moves no other. Pure: the page asks what
 * applies; the row draws it.
 */
export type SlotId = 'respond' | 'thread' | 'edit' | 'stack';

export interface Slot {
  id: SlotId;
  available: boolean;
  /** The icon's spoken name; the row has no captions, and a label never carries a number. */
  label: string;
}

export function quickActions(entry: { pieces: number }, ctx: { joinable: boolean }): Slot[] {
  return [
    { id: 'respond', available: true, label: 'Respond' },
    { id: 'thread', available: true, label: 'Add to a thread' },
    // A stack's Edit would have to say which piece: a tile opens the viewer, which edits the piece shown (SW4).
    { id: 'edit', available: entry.pieces <= 1, label: 'Edit' },
    { id: 'stack', available: ctx.joinable, label: 'Stack with previous' },
  ];
}
