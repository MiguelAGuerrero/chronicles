// @layer core

/**
 * The quick-action row under an entry on Chronicle's page (decision 0196, SW1, SW4, SW5): five fixed slots, always in
 * this order, so an action that does not apply leaves its slot empty and moves no other. Pure: the page asks what
 * applies; the row draws it.
 */
export type SlotId = 'react' | 'respond' | 'thread' | 'edit' | 'stack';

export interface Slot {
  id: SlotId;
  available: boolean;
  /** The icon's spoken name; a label never carries a number. */
  label: string;
  /** The one word under the icon (decision 0196, the owner's call after the cold find). */
  caption: string;
}

export function quickActions(entry: { pieces: number }, ctx: { joinable: boolean }): Slot[] {
  return [
    { id: 'react', available: true, label: 'Reaction', caption: 'Reaction' },
    { id: 'respond', available: true, label: 'Respond', caption: 'Respond' },
    { id: 'thread', available: true, label: 'Add to a thread', caption: 'Thread' },
    // A stack's Edit would have to say which piece: a tile opens the viewer, which edits the piece shown (SW4).
    { id: 'edit', available: entry.pieces <= 1, label: 'Edit', caption: 'Edit' },
    { id: 'stack', available: ctx.joinable, label: 'Stack with previous', caption: 'Stack' },
  ];
}
