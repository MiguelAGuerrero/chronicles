import { db } from '../db';
import { clampRange, EXPLORE_RULES, parseHidden, type Kind } from './explore';

/** Settings, kept in meta: the kinds switched off (E16), the "?" range (E20), the pocket alert (E19). */
export const HIDDEN_KEY = 'explore_hidden';
export const RANGE_KEY = 'explore_range';
export const HAPTIC_KEY = 'explore_haptic';

export interface ExploreSettings {
  hidden: Set<Kind>;
  rangeM: number;
  haptic: boolean;
}

export const DEFAULT_SETTINGS: ExploreSettings = { hidden: new Set(), rangeM: EXPLORE_RULES.rangeDefault, haptic: false };

export async function loadSettings(): Promise<ExploreSettings> {
  const [hidden, range, haptic] = await Promise.all([db.getMeta(HIDDEN_KEY), db.getMeta(RANGE_KEY), db.getMeta(HAPTIC_KEY)]);
  return { hidden: parseHidden(hidden), rangeM: range ? clampRange(Number(range)) : EXPLORE_RULES.rangeDefault, haptic: haptic === '1' };
}

const listeners = new Set<(s: ExploreSettings) => void>();

/** Saves the settings; an open walk screen hears of it at once (E17: a kind switched back on shows at once). */
export async function saveSettings(s: ExploreSettings): Promise<void> {
  await Promise.all([
    db.setMeta(HIDDEN_KEY, JSON.stringify([...s.hidden])),
    db.setMeta(RANGE_KEY, String(clampRange(s.rangeM))),
    db.setMeta(HAPTIC_KEY, s.haptic ? '1' : '0'),
  ]);
  for (const fn of listeners) fn(s);
}

export function onSettings(fn: (s: ExploreSettings) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
