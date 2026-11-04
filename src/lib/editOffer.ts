// @layer core
/**
 * The Edit offer after a capture (ME23): right after a photo or video is
 * kept, the place that took it offers Edit for a few seconds, as the caption
 * pill did. A new capture replaces the offer. The timer stays in the view.
 */
export const EDIT_OFFER_MS = 6000;

export interface EditOffer {
  id: string;
  kind: 'photo' | 'video';
  until: number;
}

export const offerEdit = (kept: { id: string; kind: 'photo' | 'video' }, now: number): EditOffer => ({ id: kept.id, kind: kept.kind, until: now + EDIT_OFFER_MS });

/** Milliseconds the offer has left; 0 once it is over. */
export const offerLeft = (o: EditOffer | null, now: number): number => (o ? Math.max(0, o.until - now) : 0);

export const offerLive = (o: EditOffer | null, now: number): boolean => offerLeft(o, now) > 0;

/** What the offer's pill says before its Edit button. */
export const offerText = (kind: 'photo' | 'video', where: 'here' | 'walk' | 'moment'): string => {
  const what = kind === 'photo' ? 'Photo' : 'Video';
  return where === 'here' ? `${what} saved here` : where === 'walk' ? `${what} saved to your walk` : `${what} saved`;
};
