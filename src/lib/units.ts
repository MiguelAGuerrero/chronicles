/**
 * Distances in km or miles (QL13): one setting, read synchronously by every
 * formatter. Pure: no React, no React Native, no db. `unitsStore.ts` loads
 * and saves it through meta; `useUnits.ts` subscribes a component to it.
 */

export type Units = 'km' | 'mi';

/** The regions that still measure roads in miles. */
const MILE_REGIONS = new Set(['US', 'GB', 'LR', 'MM']);

/** The default for a locale: miles in the US, the UK, Liberia and Myanmar; km everywhere else and without one. */
export function unitsForLocale(locale: string | undefined): Units {
  if (!locale) return 'km';
  // The region is the part in capitals: en-US, en_GB, zh-Hant-TW, my-MM.
  const region = locale.split(/[-_]/).find((p) => /^[A-Za-z]{2}$/.test(p) && p === p.toUpperCase());
  return region && MILE_REGIONS.has(region) ? 'mi' : 'km';
}

/** The device's locale, or undefined where Intl is missing or refuses. */
export function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

let units: Units = unitsForLocale(deviceLocale());
const listeners = new Set<() => void>();

export function getUnits(): Units {
  return units;
}

/** Sets the units in memory and tells every listener; saving is `unitsStore.saveUnits`. */
export function setUnits(u: Units): void {
  if (u === units) return;
  units = u;
  for (const fn of [...listeners]) fn();
}

/** Hears every change; returns the unsubscribe. */
export function onUnits(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Whether a stored value is a units setting. */
export function isUnits(v: unknown): v is Units {
  return v === 'km' || v === 'mi';
}
