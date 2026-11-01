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
  flip: { fromDeg: 90, ms: 220 },
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
  if (next.revealed && !prev.revealed && !next.found) return 'flip';
  return null;
}

/** A star settles only when it becomes selected (M9), not when the map opens with it selected. */
export const starEnter = (wasSelected: boolean | undefined, selected: boolean): 'bounce' | null =>
  wasSelected === false && selected ? 'bounce' : null;

/** A pin drops in when it holds a capture not shown before and taken since the screen opened (M10). */
export const pinDrops = (captures: { id: string; t: number }[], seen: ReadonlySet<string>, openedAt: number): boolean =>
  captures.some((c) => !seen.has(c.id) && c.t >= openedAt);
