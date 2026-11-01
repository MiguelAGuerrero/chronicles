/**
 * The deferred four (motion M9-M12): which change gets which effect. Each
 * plays once, when its change happens in front of you; nothing animates when
 * a screen first opens or reloads. Pure; the views animate (`components/Enter`).
 */
export type EnterKind = 'drop' | 'flip' | 'pulse' | 'bounce';

export const ENTER = {
  /** A new capture's pin falls into place (M10). */
  drop: { fromY: -12, ms: 180 },
  /** A revealed "?" turns in about the vertical (M11). */
  /** From 60°, not edge-on, so the "?" itself is seen turning (audit, UX). */
  flip: { fromDeg: 60, ms: 220 },
  /** A find's ring grows out of its pin and fades (M12). */
  pulse: { toScale: 1.8, fromOpacity: 0.5, ms: 600 },
  /** A selected star's ring settles from smaller (M9). */
  bounce: { fromScale: 0.85 },
} as const;

type MarkState = { revealed: boolean; found?: boolean; faint?: boolean };

/** A mark's change: found pulses (M12), revealed turns in (M11); first sight does nothing. */
export function markEnter(prev: MarkState | undefined, next: MarkState): 'flip' | 'pulse' | null {
  if (!prev) return null;
  if (next.found && !prev.found) return 'pulse';
  // A place back from a faint route pin was revealed before: it doesn't turn again (audit 6).
  if (next.revealed && !prev.revealed && !next.found && !prev.faint) return 'flip';
  return null;
}

/** A star settles only when it becomes selected (M9), not when the map opens with it selected. */
export const starEnter = (wasSelected: boolean | undefined, selected: boolean): 'bounce' | null =>
  wasSelected === false && selected ? 'bounce' : null;

/** A pin drops in when it holds a capture not shown before and taken since the screen opened (M10). */
export const pinDrops = (captures: { id: string; t: number }[], seen: ReadonlySet<string>, openedAt: number): boolean =>
  captures.some((c) => !seen.has(c.id) && c.t >= openedAt);

/** Whether a map's record of what it showed still matches (audit 2): set new state only on a real change. */
export function sameSeen(seen: ReadonlyMap<string, string>, now: readonly (readonly [string, string])[]): boolean {
  if (seen.size !== now.length) return false;
  for (const [id, v] of now) if (seen.get(id) !== v) return false;
  return true;
}
