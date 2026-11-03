import { db } from './db';
import { deviceLocale, isUnits, setUnits, unitsForLocale, type Units } from './units';

/** Meta: the units setting, 'km' or 'mi' (QL13). Unset, the locale's default shows. */
export const UNITS_KEY = 'units';

/** At launch: the saved setting, else the device region's default (QL13). The store starts at km. */
export async function loadUnits(): Promise<void> {
  const v = await db.getMeta(UNITS_KEY).catch(() => null);
  setUnits(isUnits(v) ? v : unitsForLocale(deviceLocale()));
}

/** Sets the store first, so every screen redraws at once, then keeps it (QL16). */
export async function saveUnits(u: Units): Promise<void> {
  setUnits(u);
  await db.setMeta(UNITS_KEY, u);
}
