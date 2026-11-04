// @layer shell
import type { Ports } from '../ports/types';
import { deviceLocale, isUnits, setUnits, unitsForLocale, type Units } from '../units';

/** Meta: the units setting, 'km' or 'mi' (QL13). Unset, the locale's default shows. */
export const UNITS_KEY = 'units';

/**
 * The units setting, kept in meta (QL13, QL16). `locale` is the device region's,
 * passed in so a test needs no machine locale.
 */
export function createUnitsStore(p: Pick<Ports, 'db'>, locale: () => string | undefined = deviceLocale) {
  return {
    /** At launch: the saved setting, else the device region's default (QL13). The store starts at km. */
    async loadUnits(): Promise<void> {
      const v = await p.db.getMeta(UNITS_KEY).catch(() => null);
      setUnits(isUnits(v) ? v : unitsForLocale(locale()));
    },
    /** Sets the store first, so every screen redraws at once, then keeps it (QL16). */
    async saveUnits(u: Units): Promise<void> {
      setUnits(u);
      await p.db.setMeta(UNITS_KEY, u);
    },
  };
}
