// @layer core
/**
 * The ceremonies a replay can be told with (RR21, decision 0086). A new one
 * is an entry here, plus a view for any overlay kind it adds
 * (`components/ceremony/overlays.tsx`); nothing else changes.
 */
import { rhythm } from './rhythm';
import type { Ceremony } from './types';

export const CEREMONIES: Readonly<Record<string, Ceremony>> = { rhythm };

export const DEFAULT_CEREMONY = 'rhythm';

/** The ceremony with this id, or the default for none or an unknown one. */
/** Only the registry's own entries: `constructor` or `__proto__` from a hand-typed link is no ceremony (audit 35). */
export const ceremonyFor = (id?: string | null): Ceremony => (id && Object.prototype.hasOwnProperty.call(CEREMONIES, id) ? CEREMONIES[id] : CEREMONIES[DEFAULT_CEREMONY]);
