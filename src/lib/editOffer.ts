// @layer core
/**
 * The editor after a capture (ME23 as decision 0240 amends it, fix edit-after-capture): once the camera's photo or
 * video is accepted and kept as a new moment, the place that took it opens its editor by itself, so it is edited
 * before it is seen on the map. It was a few seconds' Edit offer, a second tap away (0149's pill on the bar).
 */

/** The capture whose editor opens once it is kept: a new moment's; a piece added to an open moment opens none. */
export const editAfter = (kept: { kind: 'photo' | 'video'; id: string; momentId: string }): string | null =>
  kept.id === kept.momentId ? kept.id : null;

/** The capture the editor is drawn for: the kept one once the screen holds it; none before, or once it is gone. */
export const editingOf = <T extends { id: string }>(id: string | null, captures: readonly T[]): T | null =>
  id == null ? null : (captures.find((c) => c.id === id) ?? null);

/**
 * What the editor opened after a capture says (fix edit-after-capture audit 1): that the shot is already kept, where the
 * disabled Revert sits until the first edit, and its ✕'s spoken name, so ✕ never reads as "throw it away".
 */
export const keptWords = (kind: 'photo' | 'video'): { line: string; close: string } =>
  kind === 'photo'
    ? { line: 'Photo kept', close: 'Close, the photo stays as it is' }
    : { line: 'Video kept', close: 'Close, the video stays as it is' };
