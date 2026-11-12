// @layer core
/**
 * The head of a note's page (NP2, decision 0149), as Apple Journal heads an entry: the day in large type, then one
 * line of when, where and which walk; and a short form for the top bar once the head has scrolled away.
 */
export type NoteHeadInput = {
  /** The moment's time (for a page being written, the pencil's tap). */
  t: number;
  now: number;
  /** The time of day as the screens write it ("4:12 pm"), from the view: the clock's locale is the view's. */
  time: string;
  /** The moment's context line as Lately or the viewer says it (place, walk, how far in, just after), when known. */
  context: string | null;
  /** The moment's one fix is still on the way. */
  placing: boolean;
  /** A page still being written, before anything is kept; `onWalk` says whether it goes to a walk. */
  draft: { onWalk: boolean } | null;
};

export type NoteHead = { day: string; line: string; short: string };

export function noteHead(_i: NoteHeadInput): NoteHead {
  throw new Error('note pages: not built');
}
