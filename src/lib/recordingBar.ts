// @layer core
import { formatDistance, formatDuration, formatElapsed } from './format';
import { pausedMs, type PauseSpan } from './geo';
import { offerText } from './editOffer';

/**
 * The recording bar's line (NV9): the time walked, paused time left out, and
 * the distance, with Paused first while paused. Pure.
 */
export function recordingLine(o: { startedAt: number | null; pauses: PauseSpan[]; now: number; distanceM: number }): {
  text: string;
  label: string;
  paused: boolean;
} {
  const paused = o.pauses.some((p) => p.ended_at == null);
  const ms = o.startedAt == null ? 0 : Math.max(0, o.now - o.startedAt - pausedMs(o.pauses, o.startedAt, o.now));
  const line = `${formatElapsed(ms)} · ${formatDistance(o.distanceM)}`;
  return {
    text: paused ? `Paused · ${line}` : line,
    label: `${paused ? 'Walk paused' : 'Walk recording'}, ${formatDistance(o.distanceM)} walked in ${formatDuration(ms)}. Return to the walk`,
    paused,
  };
}

/**
 * The bar's Edit offer after its photo (T12, decision 0149; amends ME23 on the bar alone): a pill above the bar that
 * waits, as Undo does (decision 0113). It has no end of its own: Edit, its Close or the next capture ends it, and the
 * line keeps its time and distance throughout. ME23's other places keep their six seconds (`lib/editOffer`).
 */
export interface BarOffer {
  id: string;
  kind: 'photo' | 'video';
}

export const barOffer = (kept: { id: string; kind: 'photo' | 'video' }): BarOffer => ({ id: kept.id, kind: kept.kind });

/** A capture reached the walk: its own leaves the offer standing; any other (Memories' band, the same walk) ends it. */
export const barOfferAfter = (o: BarOffer | null, keptId: string): BarOffer | null => (o && o.id !== keptId ? null : o);

/** Shown while its capture is still the walk's (one deleted elsewhere has nothing to edit). */
export const barOfferShown = (o: BarOffer | null, captureIds: readonly string[]): boolean => !!o && captureIds.includes(o.id);

/** The pill's words, its announcement (as Undo's names its Undo) and its Close's spoken name. */
export const barOfferWords = (kind: 'photo' | 'video'): { text: string; spoken: string; close: string } => {
  const text = offerText(kind, 'walk');
  return { text, spoken: `${text}. Edit is available.`, close: `Close, the ${kind} stays as it is` };
};
