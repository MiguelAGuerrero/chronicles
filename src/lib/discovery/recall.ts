// @layer core
import type { Faced } from '../moment';
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { Recall, RecallFrequency } from './types';
import { plainNote } from '../refs';
import { KIND_NAME, pinKindsWords } from '../pins';
import { numberWord } from '../resurface/lines';

/** Remind me here's numbers (R2, R4, R5). */
export const RECALL_RULES = {
  /** A flagged capture comes back within this of an accepted fix. */
  reachM: 75,
  weekMs: 7 * 86_400_000,
  monthMs: 30 * 86_400_000,
  /** A note's reminder shows this much of its text. */
  noteChars: 120,
  /** A moment made outside a walk rests this long before it can come back, as a walk's own captures never do in it (audit). */
  looseRestMs: 2 * 3_600_000,
  /** A reminder on the recording bar counts as seen only after this long in sight (tend explore audit 23). */
  glanceMs: 2_000,
} as const;

/** Past its until-date the flag ends silently; the capture stays an ordinary memory (R6). */
export const isExpired = (r: Recall, now: number) => r.until != null && r.until < now;

/** The reminders still live: one past its end never fires again, so neither the pin nor the viewer shows it (RB3, audit 1). */
export const liveRecalls = (recalls: Recall[], now: number) => recalls.filter((r) => !isExpired(r, now));
/** The captures whose reminder is still live, for the bell on their pins (RB1, RB3). */
export function remindedIds(recalls: Recall[], now: number): Set<string> {
  return new Set(liveRecalls(recalls, now).map((r) => r.capture_id));
}
/** When the next live reminder ends, so an open map drops its bell then (audit 2); null when none ends. */
export function nextExpiry(recalls: Recall[], now: number): number | null {
  let next: number | null = null;
  for (const r of liveRecalls(recalls, now)) if (r.until != null && (next == null || r.until < next)) next = r.until;
  return next;
}

/** Whether the frequency lets it fire again yet (R5); "once" is cleared on its first fire. */
function rested(r: Recall, now: number): boolean {
  if (r.last_fired_at == null) return true;
  if (r.frequency === 'weekly') return now - r.last_fired_at >= RECALL_RULES.weekMs;
  if (r.frequency === 'monthly') return now - r.last_fired_at >= RECALL_RULES.monthMs;
  return true;
}

/**
 * The flagged captures due at `here` (R2, R5, R6, R8): within 75 m, not in
 * the walk that recorded them, not yet in this walk, rested, and before their
 * until-date. A quiet walk has none.
 */
export function dueRecalls(o: {
  /** The accepted fix, or every accepted fix of a batch. */
  here: LngLat | LngLat[];
  walkId: string;
  now: number;
  quiet: boolean;
  recalls: Recall[];
  captures: Faced[];
  /** Moments waiting in Undo, or gone: never brought back by a reminder (ui-conformance audit 7). */
  hidden?: ReadonlySet<string>;
}): { recall: Recall; capture: Faced }[] {
  if (o.quiet) return [];
  const byId = new Map(o.captures.filter((c) => !o.hidden?.has(c.id)).map((c) => [c.id, c]));
  const path: LngLat[] = typeof o.here[0] === 'number' ? [o.here as LngLat] : (o.here as LngLat[]);
  const out: { recall: Recall; capture: Faced }[] = [];
  for (const r of o.recalls) {
    const c = byId.get(r.capture_id);
    if (!c || c.lat == null || c.lon == null || c.walk_id === o.walkId || r.last_walk_id === o.walkId) continue;
    if (isExpired(r, o.now) || !rested(r, o.now)) continue;
    if (c.walk_id == null && o.now - c.t < RECALL_RULES.looseRestMs) continue;
    const at: LngLat = [c.lon, c.lat];
    if (path.some((p) => distanceM(p, at) <= RECALL_RULES.reachM)) out.push({ recall: r, capture: c });
  }
  return out;
}

/** What a fire writes (R6, R9): "once" clears the flag; the rest count and remember this walk. */
export function afterFire(r: Recall, walkId: string, now: number):
  | { kind: 'clear' }
  | { kind: 'update'; patch: Pick<Recall, 'last_fired_at' | 'fired_count' | 'last_walk_id'> } {
  if (r.frequency === 'once') return { kind: 'clear' };
  return { kind: 'update', patch: { last_fired_at: now, fired_count: r.fired_count + 1, last_walk_id: walkId } };
}

/**
 * A new flag. Set during a walk, it counts as fired in that walk, so the
 * capture being looked at doesn't come back two seconds later (audit).
 */
export function newRecall(captureId: string, frequency: RecallFrequency, until: number | null, openWalkId: string | null): Recall {
  return { capture_id: captureId, frequency, until, last_fired_at: null, fired_count: 0, last_walk_id: openWalkId };
}

/** An edit changes how often and until when, never what firing wrote (R9). */
export const editedRecall = (fresh: Recall, frequency: RecallFrequency, until: number | null): Recall => ({ ...fresh, frequency, until });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** One choice of the reminder editor's menus; `days` is an Until span from now (null: no end). */
export interface RemindChoice { id: string; label: string; days?: number | null }

const OFTEN: { id: RecallFrequency; label: string }[] = [
  { id: 'once', label: 'Once' },
  { id: 'visit', label: 'Every visit' },
  { id: 'weekly', label: 'Weekly at most' },
  { id: 'monthly', label: 'Monthly at most' },
];
/** The until-date, as a few spans from now: no date picker to fight on three platforms. */
const UNTIL: RemindChoice[] = [
  { id: 'none', label: 'No end', days: null },
  { id: 'month', label: '1 month', days: 30 },
  { id: 'season', label: '3 months', days: 91 },
  { id: 'year', label: '1 year', days: 365 },
];
const REMIND_MENUS = { often: 'How often', until: 'Until' } as const;

/**
 * The choices of the reminder editor's two menus, How often and Until, in the order its chips had them (R1, R8;
 * tend explore 18, decision 0172 O9). An end already set leads Until as its own choice, "Ends Nov 2", kept to the
 * day unless another is picked; its local month and date are the caller's to read.
 */
export function remindChoices(kept: { month: number; date: number } | null): { often: RemindChoice[]; until: RemindChoice[] } {
  return { often: OFTEN, until: kept ? [{ id: 'kept', label: `Ends ${MONTHS[kept.month]} ${kept.date}` }, ...UNTIL] : UNTIL };
}

/** What a menu's button says: its name and its choice, "How often: Once", "Until: No end" (tend explore 18). */
export function remindMenuLabel(menu: keyof typeof REMIND_MENUS, items: readonly RemindChoice[], id: string): string {
  return `${REMIND_MENUS[menu]}: ${(items.find((x) => x.id === id) ?? items[0]).label}`;
}

/**
 * "Two memories here", a count in words (VISION.md, "Counts are words"; tend explore T29), up to twelve; "Many memories
 * here" from thirteen, so the card's one line holds at 320 px (tend explore 16, decision 0172, the owner's "Many sooner").
 */
function severalHere(n: number): string {
  // The reminder's title alone: a memory preview keeps its number words (tend explore audit 18).
  const w = n >= 13 ? 'many' : numberWord(n);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)} memories here`;
}

/**
 * The reminder's words, carrying the content (R4); two or more in reach are one (R7): "Two memories here", its body
 * the pins' words for its kinds, in the order taken ("A voice memo and two photos", tend explore T29).
 */
export function reminderText(captures: Faced[]): { title: string; body: string } {
  if (captures.length > 1) {
    const taken = [...captures].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
    return { title: severalHere(captures.length), body: pinKindsWords({ captures: taken }) };
  }
  const c = captures[0];
  if (c.kind === 'text' && c.body) {
    const text = (plainNote(c.body, c.body_format) ?? '').trim();
    return { title: 'A note from here', body: text.length > RECALL_RULES.noteChars ? `${text.slice(0, RECALL_RULES.noteChars)}…` : text };
  }
  if (c.caption) return { title: 'A memory from here', body: c.caption };
  const d = new Date(c.t);
  return { title: 'A memory from here', body: `${KIND_NAME[c.kind]}, ${MONTHS[d.getMonth()]} ${d.getDate()}` };
}

/**
 * What a reminder card holds once more come due (tend explore audit 6): what it held, then each newly due one it
 * did not hold. The walk screen and the recording bar announce this list's own title (`reminderText`), so the words
 * heard are the card's: "A note from here", "Three memories here".
 */
export function reminderHeld(held: readonly Faced[] | null, due: readonly Faced[]): Faced[] {
  const have = held ?? [];
  return [...have, ...due.filter((c) => !have.some((x) => x.id === c.id))];
}

/**
 * Where a fired reminder goes (tend explore 21), decided when it is shown: with the app in front, the newest place
 * listening that is in front (the walk screen's card, the recording bar); a place mounted out of sight (the walk
 * screen kept behind the tabs after a reload) never takes it, as a tapped one's openers pass it on (`lib/openers`).
 * With none in front, or the app behind, a notification: `null`. Else the index of the place, oldest first.
 */
export function firePlace(active: boolean, inFront: readonly boolean[]): number | null {
  if (!active) return null;
  for (let i = inFront.length - 1; i >= 0; i--) if (inFront[i]) return i;
  return null;
}

/** How long a reminder the recording bar holds has been in sight: the time before, and since when it is in sight now. */
export type ReminderSight = { shownMs: number; since: number | null };
export const UNSEEN: ReminderSight = { shownMs: 0, since: null };
const inSightFor = (s: ReminderSight, now: number) => s.shownMs + (s.since != null ? now - s.since : 0);

/**
 * When a reminder the recording bar holds counts as shown (tend explore 22, audit 27): only while the bar is in sight
 * (`barInSight`). Its half-minute is time in sight: out of sight (folded, covered, the app behind) it waits, however
 * long, and what was left of it comes back on return. A fire already marked (a "once" flag cleared) is never dropped
 * unseen. `goesInMs` is null while it waits.
 */
export function reminderSight(o: { sight: ReminderSight; inSight: boolean; now: number; showMs: number }): { sight: ReminderSight; goesInMs: number | null } {
  const shown = inSightFor(o.sight, o.now);
  if (!o.inSight) return { sight: { shownMs: shown, since: null }, goesInMs: null };
  return { sight: { shownMs: o.sight.shownMs, since: o.sight.since ?? o.now }, goesInMs: Math.max(0, o.showMs - shown) };
}

/**
 * Whether the bar's reminder has been seen (tend explore audit 23): in sight for a glance's length at least. A bar that
 * goes before (Walk here from the area card unfolds it for the moment the walk screen takes to come up) hands it on.
 */
export const reminderSeen = (sight: ReminderSight, now: number): boolean => inSightFor(sight, now) >= RECALL_RULES.glanceMs;

/**
 * Whether a person can see the recording bar (tend explore 22, audits 24, 27): the tabs not folded under a full-screen
 * card, no Modal over it, no keyboard over the foot of the screen, and the app in front.
 */
export const barInSight = (o: { folded: boolean; covered: boolean; keyboard: boolean; active: boolean }): boolean =>
  !o.folded && !o.covered && !o.keyboard && o.active;

/**
 * A reminder card's spoken name (tend explore 23): its title and its words, then Open, with one full stop before Open:
 * a body that ends its own sentence ("…of cardamom.", "?", a cut note's "…") takes none more.
 */
export function reminderName(captures: Faced[]): string {
  const { title, body } = reminderText(captures);
  const said = body ? `${title}: ${body}` : title;
  return `${said}${/[.!?…]["'”’)\]]*$/.test(said) ? '' : '.'} Open`;
}

/**
 * The places a fired reminder can be shown (tend explore 21, audit 23): each listens with whether it is in front now.
 * A fire goes to the newest in front (`firePlace`); with none, `fire` says so and the caller notifies. A place that goes
 * with a reminder nobody has seen (the recording bar, folded under the area card, when Walk here leaves the tabs)
 * hands it on: it waits, merged with any handed on after it, for the next place in front of the same walk, offered as a
 * place listens or comes to the front. The walk it came on over, it is dropped. Pure: it calls what it is given.
 */
export function createRecallPlaces() {
  const places: { show: (captures: Faced[]) => void; inFront: () => boolean }[] = [];
  let unseen: { walkId: string; captures: Faced[] } | null = null;
  const newest = (active: boolean) => firePlace(active, places.map((p) => p.inFront()));
  const offer = (active: boolean, openWalkId: string | null): boolean => {
    if (!unseen) return false;
    if (unseen.walkId !== openWalkId) {
      unseen = null;
      return false;
    }
    const i = newest(active);
    if (i == null) return false;
    const { captures } = unseen;
    unseen = null;
    places[i].show(captures);
    return true;
  };
  return {
    /** Listens while `inFront` says this place can be seen; returns the unsubscribe. */
    listen(show: (captures: Faced[]) => void, inFront: () => boolean): () => void {
      const place = { show, inFront };
      places.push(place);
      return () => {
        const i = places.indexOf(place);
        if (i >= 0) places.splice(i, 1);
      };
    },
    /** A fire: shown by the newest place in front; false when none took it. */
    fire(captures: Faced[], active: boolean): boolean {
      const i = newest(active);
      if (i == null) return false;
      places[i].show(captures);
      return true;
    },
    /** A place goes with a reminder nobody has seen: the next place in front of its walk takes it. */
    handOn(walkId: string, captures: Faced[], active: boolean, openWalkId: string | null): void {
      unseen = { walkId, captures: reminderHeld(unseen?.walkId === walkId ? unseen.captures : null, captures) };
      offer(active, openWalkId);
    },
    /** A place listens or came to the front: it takes what waits, if the walk is still open. True when one did. */
    offer,
  };
}
