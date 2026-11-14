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
 * count. While the card does not offer Find me, the edge Locate is the way to you.
 */
export function findYou(p: { cardEmpty: boolean; refused: number | null; permission: PermissionSeen }): { findMe: boolean; edgeLocate: boolean } {
  const waiting = p.refused != null && (p.permission.changes === p.refused || p.permission.state === 'denied');
  const findMe = p.cardEmpty && !waiting;
  return { findMe, edgeLocate: !findMe };
}
