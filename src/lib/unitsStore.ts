import { db } from './db';
import { isUnits, setUnits, type Units } from './units';

/** Meta: the units setting, 'km' or 'mi' (QL13). Unset, the locale's default shows. */
export const UNITS_KEY = 'units';

/** Reads the saved setting into the store at launch; nothing saved leaves the locale's default. */
export async function loadUnits(): Promise<void> {
  const v = await db.getMeta(UNITS_KEY);
  if (isUnits(v)) setUnits(v);
}

/** Sets the store first, so every screen redraws at once, then keeps it (QL16). */
export async function saveUnits(u: Units): Promise<void> {
  setUnits(u);
  await db.setMeta(UNITS_KEY, u);
}
