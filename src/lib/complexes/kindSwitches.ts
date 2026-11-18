// @layer core
import type { ComplexKind } from './types';

/**
 * Complexes' five switches on What I'm into's page (CX10, WI15; what-im-into-page audit 2), pure: the save is given.
 * Nothing is known until the setting is read (`get()` null: no switch is drawn, and a tap saves nothing over it), and
 * each tap builds on the latest list, its own last tap included, never on the one the view last drew: two quick taps
 * once kept only the second. A change heard from elsewhere, or the read landing late, is merged the same way.
 */
export function createKindSwitches(save: (hidden: ComplexKind[]) => void) {
  let hidden: ComplexKind[] | null = null;
  return {
    /** The setting as read: the first answer, unless something was heard or tapped first. */
    loaded(h: ComplexKind[]): void {
      if (hidden == null) hidden = [...h];
    },
    /** A change saved elsewhere. */
    heard(h: ComplexKind[]): void {
      hidden = [...h];
    },
    /** A switch flipped: the new list, saved; null before the setting is known. */
    toggle(kind: ComplexKind, on: boolean): ComplexKind[] | null {
      if (hidden == null) return null;
      const rest = hidden.filter((k) => k !== kind);
      hidden = on ? rest : [...rest, kind];
      save(hidden);
      return hidden;
    },
    get: (): ComplexKind[] | null => hidden,
  };
}
