// @layer shell
import { metaStore } from '../meta';
import type { Ports } from '../ports/types';
import { createStore } from '../store';

/**
 * Whether a reference's value shows in parentheses beside its word (RK19): on by default, so a recalled moment says what
 * "here" meant. Kept with the other settings; it changes no stored token.
 */
export function createRefValues(p: Pick<Ports, 'db'>) {
  const meta = metaStore(p.db);
  const store = createStore<boolean>(true);
  return {
    store,
    /** At launch: the saved choice, else on; an unreadable value is on too. */
    async load(): Promise<void> {
      const v = await meta.get('ref_values').catch(() => null);
      store.set(v !== 'off');
    },
    /** Sets it first, so every screen redraws at once, then keeps it; a failed write leaves it changed on screen. */
    async save(show: boolean): Promise<void> {
      store.set(show);
      await meta.set('ref_values', show ? 'on' : 'off');
    },
  };
}
