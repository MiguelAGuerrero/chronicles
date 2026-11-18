// @layer core
import type { Kind } from '../discovery/types';
import type { ExploreSettings } from './settings';

/**
 * A kind switched on or off on What I'm into's page (WI9): the next settings, the range and the pocket alert as they were;
 * `null` while the settings are not yet read, so a switch never saves defaults over them (walk-drawer-settings audit 2).
 */
export function withKind(settings: ExploreSettings | null, kind: Kind, on: boolean): ExploreSettings | null {
  if (!settings) return null;
  const hidden = new Set(settings.hidden);
  if (on) hidden.delete(kind);
  else hidden.add(kind);
  return { ...settings, hidden };
}
