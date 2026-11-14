// @layer core

/** Location permission as the platform reads it now; `unknown` where nothing can say (no permissions API). */
export type LocatePermission = 'granted' | 'denied' | 'prompt' | 'unknown';

/** The permission now, and how many times it was seen to change since the screen began watching. */
export interface PermissionSeen {
  state: LocatePermission;
  changes: number;
}

/**
 * One way to find you (decision 0172, O6 and O20; tend explore 8). With no fix, Explore's empty card offers Find me and the
 * map's edge Locate steps aside, so the same crosshair is never offered twice. After a Locate refusal (its notice says
 * where to turn location on) Find me waits until the permission changes from how it was refused: `refused` is the
 * count of changes seen when the refusal came, and a later change that still reads "denied" (the refusal's own) does not
 * count. While the card does not offer Find me, the edge Locate is the way to you, unless location is `blocked` (tend
 * explore audit 8): refused, and the permission reads "denied", so a tap could only be refused again. Then neither shows
 * and the card says where to turn location on (audit 9). Where a tap may still ask ("prompt", "unknown") the edge stays.
 */
export function findYou(p: { cardEmpty: boolean; refused: number | null; permission: PermissionSeen }): { findMe: boolean; edgeLocate: boolean; blocked: boolean } {
  const waiting = p.refused != null && (p.permission.changes === p.refused || p.permission.state === 'denied');
  const findMe = p.cardEmpty && !waiting;
  const blocked = p.cardEmpty && p.refused != null && p.permission.state === 'denied';
  return { findMe, edgeLocate: !findMe && !blocked, blocked };
}

/**
 * The empty card's line while location is blocked (tend explore audit 9; the owner, in person, Nov 14, during the review:
 * "Say where to turn it on"), muted, with no crosshair. The web's is the owner's sentence; a phone has no browser, so its
 * line names Settings, as the phone's own refusal notice does (`LOCATION_OFF.native`, `locate/notice.ts`).
 */
export const BLOCKED_LINE = {
  web: 'Location is off. Turn it on in your browser’s or your phone’s settings to see the areas around you.',
  native: 'Location is turned off for Chronicles. Turn it on in Settings to see the areas around you.',
} as const;
