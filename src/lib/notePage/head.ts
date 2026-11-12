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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "Thursday, November 12", with the year when it is not this one. */
function dayOf(t: number, now: number): string {
  const d = new Date(t);
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : `, ${d.getFullYear()}`;
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}${year}`;
}

/** "Nov 12", with the year when it is not this one. */
function shortDayOf(t: number, now: number): string {
  const d = new Date(t);
  const year = d.getFullYear() === new Date(now).getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}${year}`;
}

export const PLACE_PENDING = 'Place not kept yet';
export const NO_PLACE_KEPT = 'No place kept';

export function noteHead(i: NoteHeadInput): NoteHead {
  const day = dayOf(i.t, i.now);
  const shortDay = shortDayOf(i.t, i.now);
  if (i.draft) return { day, line: `${i.time} · ${i.draft.onWalk ? 'On your walk' : 'Not on a walk'}`, short: shortDay };
  const context = i.context?.trim() || null;
  if (!context) return { day, line: `${i.time} · ${i.placing ? PLACE_PENDING : NO_PLACE_KEPT}`, short: shortDay };
  const place = context.split(' · ')[0];
  return { day, line: `${i.time} · ${context}`, short: `${shortDay} · ${place}` };
}
