// @layer core
import { isKindHidden } from '../discovery/refinements';
import { distanceM } from '../geo';
import type { CaptureKind, LngLat } from '../types';
import type { ChecklistItem, Kind } from './explore';

/**
 * A place offered after the moment (specs/moment-assignment-fallback, PO1-PO12): a moment kept on the walk screen within
 * `nearM` of unfound places shown on the map, with Places on and nothing armed, is asked about once: "Was this photo about
 * Old Bridge?". The walker ties it (the same find Capture here makes) or leaves it independent. Nothing is tied unasked.
 */
export const OFFER_RULES = {
  /** "Next to" a place: the moment's fix within this of it (the owner, Nov 20). */
  nearM: 30,
  /** The walker this far from where the moment was taken has moved on: the line goes (PO6). */
  awayM: 60,
  /** Places named in the line; past them, "or another place nearby" (PO8). */
  named: 3,
} as const;

export interface Offer {
  captureId: string;
  walkId: string;
  /** The moment's fix. */
  at: LngLat;
  kind: CaptureKind;
  /** The places offered, nearest first. */
  items: ChecklistItem[];
}

/** The meta key of the places left with Leave it on a walk (PO4). */
export const offerLeftKey = (walkId: string) => `offer_left:${walkId}`;

/** What a moment is called in the line (PO1, PO10). */
const NOUN: Record<CaptureKind, string> = { photo: 'photo', video: 'video', voice: 'voice memo', text: 'note' };

/**
 * The offer for a moment just kept, or null (PO1, PO3, PO4, PO5): the unfound places within 30 m of its fix whose kind is
 * shown, never one left on this walk, nearest first; nothing with Places off, a place armed, no fix or no walk.
 */
export function offerFor(
  m: { id: string; walkId: string | null; at: LngLat | null; kind: CaptureKind },
  o: { items: ChecklistItem[]; found: ReadonlySet<string>; hidden: ReadonlySet<Kind>; left: ReadonlySet<string>; places: boolean; armed: boolean },
): Offer | null {
  if (!o.places || o.armed || !m.walkId || !m.at) return null;
  const at = m.at;
  const near: { item: ChecklistItem; d: number }[] = [];
  const seen = new Set<string>();
  for (const item of o.items) {
    if (seen.has(item.key) || o.found.has(item.key) || o.left.has(item.key) || isKindHidden(o.hidden, item.kind)) continue;
    const d = distanceM(at, item.at);
    if (d > OFFER_RULES.nearM) continue;
    seen.add(item.key);
    near.push({ item, d });
  }
  if (!near.length) return null;
  near.sort((a, b) => a.d - b.d);
  return { captureId: m.id, walkId: m.walkId, at, kind: m.kind, items: near.map((n) => n.item) };
}

/**
 * The offer while it still holds (PO6): on its walk, Places on, not paused, nothing armed, its moment still there, within
 * 60 m of where the moment was taken (no fix holds), and with a place left unfound; a place found another way leaves the line.
 */
export function offerStill(
  offer: Offer | null,
  o: { here: LngLat | null; walkId: string | null; places: boolean; paused: boolean; armed: boolean; found: ReadonlySet<string>; momentIds: ReadonlySet<string> },
): Offer | null {
  if (!offer || offer.walkId !== o.walkId || !o.places || o.paused || o.armed || !o.momentIds.has(offer.captureId)) return null;
  if (o.here && distanceM(o.here, offer.at) > OFFER_RULES.awayM) return null;
  const items = offer.items.filter((i) => !o.found.has(i.key));
  if (!items.length) return null;
  return items.length === offer.items.length ? offer : { ...offer, items };
}

/** "A, B or C"; past three, "A, B, C or another place nearby": never a number (PO8). */
function namesOf(items: ChecklistItem[]): string {
  const names = items.slice(0, OFFER_RULES.named).map((i) => i.name);
  if (items.length > OFFER_RULES.named) return `${names.join(', ')} or another place nearby`;
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/** The line's words (PO1, PO3, PO8, PO10, PO11): plain, neutral, naming the moment's kind and the places. */
export function offerLine(offer: Offer): string {
  const q = `Was this ${NOUN[offer.kind]} about ${namesOf(offer.items)}?`;
  return offer.items.length === 1 ? q : `${q} Tap it on the map.`;
}

/** The buttons' spoken names (PO2): Yes only for one place; with several the map is the choice. */
export function offerLabels(offer: Offer): { yes: string | null; leave: string } {
  const noun = NOUN[offer.kind];
  return {
    yes: offer.items.length === 1 ? `Yes, this ${noun} is about ${offer.items[0].name}` : null,
    leave: `Leave it, keep this ${noun} on its own`,
  };
}

/** The place a Yes or a tap on a choice ties the moment to, or null for a key not offered (PO9). */
export function offerTake(offer: Offer | null, key: string): ChecklistItem | null {
  return offer?.items.find((i) => i.key === key) ?? null;
}

/** A choice's spoken name on the map (PO3). */
export const choiceLabel = (name: string, category: string, kind: CaptureKind) => `${name}, ${category}. Tie this ${NOUN[kind]} to it`;
