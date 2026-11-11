// @layer shell
import type { Ports } from '../ports/types';
import { createStore } from '../store';

/**
 * Whether a reference's value shows in parentheses beside its word (RK19): on by default, so a recalled moment says what
 * "here" meant. Kept with the other settings; it changes no stored token.
 */
/** Meta: 'on' or 'off' (RK19). Unset, or anything else, is on. */
export const REF_VALUES_KEY = 'ref_values';

export function createRefValues(p: Pick<Ports, 'db'>) {
  const store = createStore<boolean>(true);
  // A save made while the launch's read is out wins over it (audit 9).
  let saved = false;
  return {
    store,
    /** At launch: the saved choice, else on; an unreadable value is on too. */
    async load(): Promise<void> {
      const v = await p.db.getMeta(REF_VALUES_KEY).catch(() => null);
      if (!saved) store.set(v !== 'off');
    },
    /** Sets it first, so every screen redraws at once, then keeps it; a failed write leaves it changed on screen. */
    async save(show: boolean): Promise<void> {
      saved = true;
      store.set(show);
      await p.db.setMeta(REF_VALUES_KEY, show ? 'on' : 'off');
    },
  };
}
